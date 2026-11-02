import { serve } from "std/http/server.ts";

// Disabled because photo reports are always uploaded via chat,
// and send-chat-push already sends a push notification for them.
// This prevents duplicate notifications for the same action.
serve(() => {
  return new Response(JSON.stringify({ message: "Disabled" }), { status: 200 });
});
