import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const Route = createFileRoute("/api/users/create")({
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

          const body = await request.json();
          const { email, password, full_name, role, label } = body;

          if (!email || !password || !role) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), {
              status: 400,
              headers: corsHeaders,
            });
          }

          const [a, b] = await Promise.all([
            userClient.rpc("has_role", { _user_id: user.id, _role: "admin" }),
            userClient.rpc("has_role", { _user_id: user.id, _role: "super_admin" }),
          ]);

          if (a.error) throw new Error(a.error.message);
          if (b.error) throw new Error(b.error.message);
          if (!a.data && !b.data) {
            return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
              status: 403,
              headers: corsHeaders,
            });
          }

          // Only super_admin may create admin/super_admin accounts
          if (role === "admin" || role === "super_admin") {
            if (!b.data) {
              return new Response(JSON.stringify({ error: "Forbidden: super_admin only" }), {
                status: 403,
                headers: corsHeaders,
              });
            }
          }

          const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: { full_name: full_name ?? "" },
          });

          if (error || !created.user) {
            return new Response(JSON.stringify({ error: error?.message ?? "create failed" }), {
              status: 500,
              headers: corsHeaders,
            });
          }

          // Also update profile label if provided
          if (label !== undefined && label !== null) {
            await supabaseAdmin.from("profiles").update({ label: label }).eq("id", created.user.id);
          }

          // Override default role assigned by trigger
          await supabaseAdmin.from("user_roles").delete().eq("user_id", created.user.id);
          const { error: rErr } = await supabaseAdmin
            .from("user_roles")
            .insert({ user_id: created.user.id, role: role });
            
          if (rErr) throw new Error(rErr.message);

          return new Response(JSON.stringify({ success: true, id: created.user.id }), {
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
