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
    const { type, record } = payload;

    if (type !== "INSERT" || !record) {
      return new Response(JSON.stringify({ message: "Ignored" }), { status: 200 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: "Supabase config missing" }), { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get author name
    let authorName = "Сотрудник";
    if (record.author_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", record.author_id)
        .single();
      if (profile && profile.full_name) authorName = profile.full_name;
    }

    // Get site name
    let siteName = "Неизвестный объект";
    if (record.site_id) {
      const { data: site } = await supabase
        .from("sites")
        .select("name")
        .eq("id", record.site_id)
        .single();
      if (site && site.name) siteName = site.name;
    }

    // Find admins to notify
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "super_admin"]);

    if (!adminRoles || adminRoles.length === 0) {
      return new Response(JSON.stringify({ message: "No admins to notify" }), { status: 200 });
    }

    const adminUserIds = adminRoles
      .map((r: any) => r.user_id)
      .filter((id: string) => id !== record.author_id);

    if (adminUserIds.length === 0) {
      return new Response(JSON.stringify({ message: "No other admins to notify" }), { status: 200 });
    }

    // Get fcm tokens for admins
    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("fcm_token")
      .in("id", adminUserIds)
      .neq("fcm_token", null);

    if (!adminProfiles || adminProfiles.length === 0) {
      return new Response(JSON.stringify({ message: "No fcm tokens for admins" }), { status: 200 });
    }

    const tokens = adminProfiles.map((p: any) => p.fcm_token);

    const title = "Новый фотоотчет";
    const body = `${authorName} загрузил фотоотчет по объекту: ${siteName}`;

    const response = await admin.messaging().sendEachForMulticast({
      tokens: tokens,
      notification: {
        title: title,
        body: body,
      },
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        type: "photo_report",
        report_id: record.id,
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
