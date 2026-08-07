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

async function checkMessages() {
  const { data, error } = await supabase.from("chat_messages").select("*").limit(1);
  console.log(data, error);
}

checkMessages();
