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

    if (!record || !record.user_id) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400 });
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

    let title = "";
    let body = "";

    const siteName = record.site_name || "Неизвестный объект";

    // Formatting date to a readable string if possible
    let timeStr = record.started_at;
    try {
      const d = new Date(record.started_at);
      timeStr = d.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {}

    if (type === "INSERT") {
      title = "Новая смена";
      body = `Вас назначили на новую смену: Объект ${siteName}, время: ${timeStr}`;
    } else if (type === "UPDATE") {
      if (old_record && old_record.status !== "finished" && record.status === "finished") {
        title = "Смена завершена";
        body = `Ваша смена на объекте ${siteName} была закрыта.`;
      } else {
        title = "Изменение в смене";
        body = `Внесены изменения в вашу смену на объекте: ${siteName}`;
      }
    } else {
      return new Response(JSON.stringify({ message: "Ignored event type" }), { status: 200 });
    }

    const response = await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: title,
        body: body,
      },
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        type: "shift_update",
        shift_id: record.id,
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
