import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const Route = createFileRoute("/api/users/update")({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, { headers: corsHeaders });
      },
      POST: async ({ request }: { request: Request }) => {
        try {
          const authHeader = request.headers.get("Authorization");
          if (!authHeader) {
            return new Response(JSON.stringify({ error: "No authorization header" }), { status: 401, headers: corsHeaders });
          }

          const supabase = createClient(
            process.env.VITE_SUPABASE_URL!,
            process.env.VITE_SUPABASE_ANON_KEY!,
            {
              global: { headers: { Authorization: authHeader } },
            }
          );

          const { data: { user }, error: authError } = await supabase.auth.getUser();
          if (authError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
          }

          const { data: hasRole } = await supabase.rpc('has_role', {
            user_id: user.id,
            role: 'super_admin'
          });

          const { data: hasAdminRole } = await supabase.rpc('has_role', {
            user_id: user.id,
            role: 'admin'
          });

          if (!hasRole && !hasAdminRole) {
            return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
          }

          const body = await request.json();
          const targetUserId = body.user_id;
          const newFirstName = body.first_name;
          const newLastName = body.last_name;

          if (!targetUserId || !newFirstName || !newLastName) {
            return new Response(JSON.stringify({ error: "user_id, first_name, and last_name are required" }), { status: 400, headers: corsHeaders });
          }

          // Target User Check (Cannot modify other Super Admins unless you are one)
          if (!hasRole) {
            const { data: targetHasSuperAdmin } = await supabase.rpc('has_role', {
              user_id: targetUserId,
              role: 'super_admin'
            });
            if (targetHasSuperAdmin) {
               return new Response(JSON.stringify({ error: "Admins cannot modify Super Admins" }), { status: 403, headers: corsHeaders });
            }
          }

          const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
            user_metadata: {
              first_name: newFirstName,
              last_name: newLastName,
            },
          });

          if (updateAuthError) throw updateAuthError;

          const { error: updateProfileError } = await supabaseAdmin
            .from("profiles")
            .update({
              full_name: `${newFirstName} ${newLastName}`.trim(),
            })
            .eq("id", targetUserId);

          if (updateProfileError) throw updateProfileError;

          return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        } catch (error: any) {
          return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
        }
      },
    },
  },
});
