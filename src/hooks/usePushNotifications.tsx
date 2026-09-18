import React, { useEffect, useState, useRef } from "react";
import { requestFirebaseToken, onMessageListener } from "../lib/firebase";
import { supabase } from '../integrations/supabase/client';
import { toast } from "sonner";
import { PushToast } from "../components/push-toast";

export const usePushNotifications = () => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // We request the token
    const fetchToken = async () => {
      const token = await requestFirebaseToken();
      if (token) {
        setFcmToken(token);
        console.log("FCM Token:", token);
        
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user?.id) {
          currentUserIdRef.current = session.user.id;
          await supabase
            .from("profiles")
            .update({ fcm_token: token } as any)
            .eq("id", session.user.id);
        }
      }
    };

    fetchToken();

    const showCustomToast = (msg: any) => {
      let title = msg.notification?.title;
      let body = msg.notification?.body;
      const data = msg.data;

      let avatarUrl = msg.notification?.image || data?.sender_avatar;

      // If data-only message (like our chat push)
      if (!title && data) {
        title = data.title || data.sender_name || 'Новое сообщение';
        body = data.body || '';
      }

      // Ignore messages sent by the current user
      const currentUserId = currentUserIdRef.current;
      if (data?.sender_id && currentUserId && data.sender_id === currentUserId) {
        return;
      }

      if (title) {
        toast.custom((t) => (
          <PushToast
            title={title}
            body={body}
            avatarUrl={avatarUrl}
            onClick={() => {
              toast.dismiss(t as string | number);
              
              if (data?.channel_type && data?.channel_id) {
                window.sessionStorage.setItem("dmag_jump_to_chat", JSON.stringify({
                  type: data.channel_type,
                  id: data.channel_id
                }));
              }

              if (window.location.pathname.includes('/admin')) {
                window.sessionStorage.setItem("dmag_admin_activeTab", '"chat"');
                window.dispatchEvent(new Event("storage"));
              } else {
                window.sessionStorage.setItem("dmag_chat_open", "true");
                window.dispatchEvent(new Event("dmag_open_chat"));
              }
            }}
            onReply={async (text) => {
              if (data?.channel_id && data?.channel_type) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                  await supabase.from('chat_messages').insert({
                    channel_id: data.channel_id,
                    channel_type: data.channel_type,
                    content: text,
                    author_id: session.user.id,
                    author_name: session.user.user_metadata?.full_name || 'Сотрудник'
                  });
                }
              }
              toast.dismiss(t as string | number);
            }}
            onClose={() => toast.dismiss(t as string | number)}
          />
        ), {
          duration: 5000,
        });
      }
    };

    // Listen to foreground messages from Firebase SDK
    const listenToMessages = async () => {
      try {
        const msg: any = await onMessageListener();
        if (msg) {
          showCustomToast(msg);
        }
        listenToMessages();
      } catch (e) {
        console.error("Error listening to foreground messages", e);
      }
    };
    listenToMessages();

    // Listen to messages delegated from Service Worker (when window is visible but unfocused)
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'foreground_push') {
        console.log("Received push from service worker postMessage:", event.data.payload);
        showCustomToast(event.data.payload);
      }
    };
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    return () => {
      if (navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, []);

  return { fcmToken };
};
