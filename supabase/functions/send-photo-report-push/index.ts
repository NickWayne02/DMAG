import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Disabled because photo reports are always uploaded via chat,
// and send-chat-push already sends a push notification for them.
// This prevents duplicate notifications for the same action.
serve(async () => {
  return new Response(JSON.stringify({ message: "Disabled" }), { status: 200 });
});
