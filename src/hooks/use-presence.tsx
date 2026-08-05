import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

interface PresenceContextType {
  onlineUsers: string[];
}

const PresenceContext = createContext<PresenceContextType>({ onlineUsers: [] });

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setOnlineUsers([]);
      return;
    }

    const channel = supabase.channel("global-online-users", {
      config: { presence: { key: user.id } },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      setOnlineUsers(Object.keys(state));
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ online_at: new Date().toISOString() });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <PresenceContext.Provider value={{ onlineUsers }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  return useContext(PresenceContext);
}
