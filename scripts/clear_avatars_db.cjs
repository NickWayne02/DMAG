const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const envFile = fs.readFileSync(".env", "utf-8");
let supabaseUrl = "";
let supabaseKey = "";
envFile.split("\n").forEach((line) => {
  if (line.startsWith("VITE_SUPABASE_URL="))
    supabaseUrl = line.split("=")[1].trim().replace(/"/g, "");
  if (line.startsWith("SUPABASE_SERVICE_ROLE_KEY="))
    supabaseKey = line.split("=")[1].trim().replace(/"/g, "");
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearDbAvatars() {
  // We want to clear avatar_url in the personnel table for all users
  const { data, error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .not("avatar_url", "is", null)
    .select();

  if (error) {
    console.error("Error clearing avatars:", error);
  } else {
    console.log(`Cleared avatar_url for ${data.length} users.`);
  }
}

clearDbAvatars();
