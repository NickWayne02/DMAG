const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://mqhdajaefuyifuqeudyh.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xaGRhamFlZnV5aWZ1cWV1ZHloIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDgwMjA2MiwiZXhwIjoyMTAwMzc4MDYyfQ.ryLwAGZre8XXSfRs4PCjj5TnP4--54An6Of_K3gPJeY",
);

async function run() {
  console.log("Checking profiles...");
  const { data, error } = await supabase.from("profiles").select("avatar_url").limit(1);
  if (error) {
    console.error("Error fetching avatar_url from profiles:", error.message);
  } else {
    console.log("Profiles data:", data);
  }

  console.log("Creating bucket...");
  const { data: bucketData, error: bucketError } = await supabase.storage.createBucket("avatars", {
    public: true,
  });
  if (bucketError) {
    console.error("Error creating bucket:", bucketError.message);
  } else {
    console.log("Bucket created:", bucketData);
  }
}

run();
