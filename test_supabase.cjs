const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://mqhdajaefuyifuqeudyh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xaGRhamFlZnV5aWZ1cWV1ZHloIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDgwMjA2MiwiZXhwIjoyMTAwMzc4MDYyfQ.ryLwAGZre8XXSfRs4PCjj5TnP4--54An6Of_K3gPJeY";
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
  console.log(await res.json());
}
main();
