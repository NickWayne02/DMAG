import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import admin from "npm:firebase-admin@11.11.0";

const serviceAccountStr = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
if (serviceAccountStr && !admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(serviceAccountStr);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (e) {
    console.error("Firebase init error", e);
  }
}

serve(async (req) => {
  try {
    const payload = await req.json();
    const { type, record, old_record } = payload;

    // Triggers when user_roles changes.
    // We notify the user if their role is updated, e.g., to 'employee' or higher.
    if ((type !== "INSERT" && type !== "UPDATE") || !record || !record.user_id) {
      return new Response(JSON.stringify({ message: "Ignored" }), { status: 200 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: "Supabase config missing" }), { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data } = await supabase
      .from("profiles")
      .select("fcm_token")
      .eq("id", record.user_id)
      .single();

    const fcmToken = data?.fcm_token;

    if (!fcmToken) {
      return new Response(JSON.stringify({ message: "No fcm_token found for user" }), {
        status: 200,
      });
    }

    const title = "Аккаунт активирован";
    const body = "Ваша учетная запись одобрена, и вам назначена роль. Вы можете брать смены!";

    const response = await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: title,
        body: body,
      },
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        type: "account_approval",
        role: record.role,
      },
      android: {
        priority: "high",
      },
    });

    return new Response(JSON.stringify({ success: true, response }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
