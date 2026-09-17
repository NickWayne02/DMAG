import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://mqhdajaefuyifuqeudyh.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xaGRhamFlZnV5aWZ1cWV1ZHloIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDgwMjA2MiwiZXhwIjoyMTAwMzc4MDYyfQ.ryLwAGZre8XXSfRs4PCjj5TnP4--54An6Of_K3gPJeY";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndInsert() {
  const { data, error } = await supabase.from("app_branding_presets").select("*");
  if (error) {
    console.error(error);
    return;
  }

  console.log("Current presets:", data);

  const existingNames = data.map((p) => p.app_name);
  const toInsert = [];

  if (!existingNames.includes("DMAG")) {
    toInsert.push({ app_name: "DMAG", app_logo_url: null });
  }
  if (!existingNames.includes("E&R")) {
    toInsert.push({ app_name: "E&R", app_logo_url: null });
  }
  if (!existingNames.includes("O&D")) {
    toInsert.push({ app_name: "O&D", app_logo_url: null });
  }

  if (toInsert.length > 0) {
    console.log("Inserting:", toInsert);
    const { error: insertError } = await supabase.from("app_branding_presets").insert(toInsert);
    if (insertError) {
      console.error(insertError);
    } else {
      console.log("Inserted successfully");
    }
  } else {
    console.log("All 3 firms already exist");
  }
}

checkAndInsert();
