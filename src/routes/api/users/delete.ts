import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const Route = createFileRoute("/api/users/delete")({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, { headers: corsHeaders });
      },
      POST: async ({ request }: { request: Request }) => {
        try {
          const authHeader = request.headers.get("Authorization");
          if (!authHeader) {
            return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
              status: 401,
              headers: corsHeaders,
            });
          }

          const token = authHeader.replace("Bearer ", "");

          const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
          const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
          const userClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
              headers: { Authorization: `Bearer ${token}` },
            },
          });

          const { data: { user }, error: userError } = await userClient.auth.getUser();
          if (userError || !user) {
            return new Response(JSON.stringify({ error: "Invalid token" }), {
              status: 401,
              headers: corsHeaders,
            });
          }

          const { data: isSuper } = await userClient.rpc("has_role", {
            _user_id: user.id,
            _role: "super_admin",
          });

          if (!isSuper) {
            return new Response(JSON.stringify({ error: "Forbidden: Super Admin only" }), {
              status: 403,
              headers: corsHeaders,
            });
          }

          const body = await request.json();
          if (!body.user_id) {
            return new Response(JSON.stringify({ error: "Missing user_id" }), {
              status: 400,
              headers: corsHeaders,
            });
          }

          if (body.user_id === user.id) {
            return new Response(JSON.stringify({ error: "Cannot delete yourself" }), {
              status: 400,
              headers: corsHeaders,
            });
          }

          const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(body.user_id);
          if (delError) {
            return new Response(JSON.stringify({ error: delError.message }), {
              status: 500,
              headers: corsHeaders,
            });
          }

          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: corsHeaders,
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: corsHeaders,
          });
        }
      },
    },
  },
});
