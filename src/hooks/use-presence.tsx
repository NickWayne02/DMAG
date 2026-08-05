import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

interface PresenceContextType {
  onlineUsers: string[];
  presenceMap: Record<string, any>;
}

const PresenceContext = createContext<PresenceContextType>({
  onlineUsers: [],
  presenceMap: {},
});

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [presenceMap, setPresenceMap] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!user) {
      setOnlineUsers([]);
      setPresenceMap({});
      return;
    }

    const channel = supabase.channel("global-online-users", {
      config: { presence: { key: user.id } },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      setOnlineUsers(Object.keys(state));
      
      const pMap: Record<string, any> = {};
      for (const [key, presences] of Object.entries(state)) {
        if (presences.length > 0) {
          pMap[key] = presences[0];
        }
      }
      setPresenceMap(pMap);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        let locData: any = {};
        try {
          const res = await fetch("https://ipwho.is/");
          if (res.ok) {
            locData = await res.json();
          }
        } catch (err) {
          console.error("Failed to fetch location", err);
        }

        await channel.track({
          online_at: new Date().toISOString(),
          ip: locData.ip || "Unknown IP",
          city: locData.city || "Unknown City",
          country: locData.country_code || "Unknown Country",
        });

        // Trigger updated_at on the user's profile to persist their last login time
        await supabase
          .from("profiles")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", user.id);
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <PresenceContext.Provider value={{ onlineUsers, presenceMap }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  return useContext(PresenceContext);
}
