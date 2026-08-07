const fs = require('fs');
const https = require('https');

const url = 'https://raw.githubusercontent.com/google/fonts/main/apache/roboto/Roboto-Regular.ttf';
const dest = 'Roboto-Regular.ttf';

https.get(url, (res) => {
  const chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => {
    const buffer = Buffer.concat(chunks);
    const base64 = buffer.toString('base64');
    const tsContent = `export const ROBOTO_BASE64 = "${base64}";\n`;
    fs.writeFileSync('src/lib/roboto-base64.ts', tsContent);
    console.log('Successfully created roboto-base64.ts');
  });
}).on('error', (err) => {
  console.error('Error fetching font:', err);
});
