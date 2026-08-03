const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';
envFile.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace(/"/g, '');
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim().replace(/"/g, '');
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanAvatars() {
  // List root of avatars
  const { data: rootItems, error: listError } = await supabase.storage.from('avatars').list('');
  if (listError) {
    console.error('Error listing root:', listError);
    return;
  }

  for (const item of rootItems) {
    if (!item.id) {
      console.log(`Found folder: ${item.name}`);
      // List contents of this folder
      const { data: files, error: filesError } = await supabase.storage.from('avatars').list(item.name);
      if (filesError) {
        console.error(`Error listing files in ${item.name}:`, filesError);
        continue;
      }

      if (files && files.length > 0) {
        const filePaths = files.map(f => `${item.name}/${f.name}`);
        console.log(`Deleting files:`, filePaths);
        const { error: delError } = await supabase.storage.from('avatars').remove(filePaths);
        if (delError) {
          console.error(`Error deleting files in ${item.name}:`, delError);
        } else {
          console.log(`Deleted files in ${item.name}`);
        }
      } else {
        console.log(`Folder ${item.name} is empty or only has placeholder`);
        // If it has placeholder, delete it
        await supabase.storage.from('avatars').remove([`${item.name}/.emptyFolderPlaceholder`]);
      }
    }
  }
  console.log('Cleanup finished.');
}

cleanAvatars();
