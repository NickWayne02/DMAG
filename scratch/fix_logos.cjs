const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    env[key.trim()] = values.join('=').trim().replace(/^"|"$/g, '');
  }
});

const supabase = createClient(
  env['SUPABASE_URL'],
  env['SUPABASE_SERVICE_ROLE_KEY']
);

async function fixLogos() {
  try {
    const brands = [
      { name: 'O&D', file: 'mobile_app_flutter/android/app/src/main/res/mipmap-xxhdpi/brand2_fg.jpg' },
      { name: 'DMAG', file: 'mobile_app_flutter/android/app/src/main/res/mipmap-xxhdpi/brand3_fg.jpg' }
    ];

    for (const brand of brands) {
      console.log(`Fixing logo for ${brand.name}...`);
      const fileBuffer = fs.readFileSync(brand.file);
      const filePath = `brand/logo_${brand.name.replace('&', 'and').toLowerCase()}_fixed.jpg`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, fileBuffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        console.error(`Failed to upload ${brand.name}:`, uploadError);
        continue;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;
      console.log(`Uploaded to: ${publicUrl}`);

      // Update database
      const { error: dbError } = await supabase
        .from('app_branding_presets')
        .update({ app_logo_url: publicUrl })
        .eq('app_name', brand.name);

      if (dbError) {
        console.error(`Failed to update DB for ${brand.name}:`, dbError);
      } else {
        console.log(`Successfully updated DB for ${brand.name}!`);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

fixLogos();
