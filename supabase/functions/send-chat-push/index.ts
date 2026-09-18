// @ts-nocheck
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
    const record = payload.record;

    if (!record || !record.channel_id || !record.author_id) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: "Supabase config missing" }), { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const channelId = record.channel_id as string;
    const authorId = record.author_id as string;

    let targetTokens: string[] = [];

    if (record.channel_type === "direct") {
      const parts = channelId.split("_");
      if (parts.length === 3) {
        const otherId = parts[1] === authorId ? parts[2] : parts[1];
        const { data } = await supabase
          .from("profiles")
          .select("fcm_token")
          .eq("id", otherId)
          .single();
        if (data?.fcm_token) targetTokens.push(data.fcm_token);
      }
    } else {
      // general or site
      const { data } = await supabase.from("profiles").select("fcm_token").neq("id", authorId);
      if (data) {
        targetTokens = data.filter((p: any) => p.fcm_token).map((p: any) => p.fcm_token);
      }
    }

    if (targetTokens.length === 0) {
      return new Response(JSON.stringify({ message: "No targets" }), { status: 200 });
    }

    // Fetch author avatar
    const { data: authorData } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", authorId)
      .single();
    
    const avatarUrl = authorData?.avatar_url || "";

    if (!admin.apps.length) {
      return new Response(JSON.stringify({ error: "Firebase not configured" }), { status: 500 });
    }

    let title = record.author_name || "Новое сообщение";

    // For direct messages, the title is usually just the author name.
    // For general/site, we can prefix with the channel type.
    if (record.channel_type === "general") {
      title = `Общий чат: ${title}`;
    } else if (record.channel_type === "site") {
      title = `Чат объекта: ${title}`;
    }

    let body = record.content;
    let photoUrl = "";

    if (body.includes("[ФОТО_ОТЧЕТ]") || body.includes("[PHOTO_REPORT]")) {
      const token = body.includes("[ФОТО_ОТЧЕТ]") ? "[ФОТО_ОТЧЕТ]" : "[PHOTO_REPORT]";
      const splitText = body.substring(body.indexOf(token) + token.length).trim();
      const parts = splitText.split(" | ");
      if (parts.length > 0 && parts[0]) {
        photoUrl = `${supabaseUrl}/storage/v1/object/public/photo-reports/${parts[0]}`;
      }
      // Clean up body for the push notification
      body = "📷 Фотоотчет";
    }

    const response = await admin.messaging().sendEachForMulticast({
      tokens: targetTokens,
      data: {
        channel_id: record.channel_id,
        channel_type: record.channel_type,
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        title: title,
        body: body,
        photo_url: photoUrl,
        sender_name: record.author_name || "Уведомление",
        sender_avatar: avatarUrl,
        sender_id: record.author_id,
      },
      android: {
        priority: "high",
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
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
