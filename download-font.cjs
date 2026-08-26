const fs = require("fs");
const https = require("https");

const url =
  "https://raw.githubusercontent.com/googlefonts/roboto/main/src/hinted/Roboto-Regular.ttf";

function download(url) {
  https
    .get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location);
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const buffer = Buffer.concat(chunks);
        if (buffer.length < 1000) {
          console.error("Failed to download, buffer too small:", buffer.toString());
          return;
        }
        const base64 = buffer.toString("base64");
        const tsContent = `export const ROBOTO_BASE64 = "${base64}";\n`;
        fs.writeFileSync("src/lib/roboto-base64.ts", tsContent);
        console.log("Successfully created roboto-base64.ts, size:", base64.length);
      });
    })
    .on("error", (err) => {
      console.error("Error fetching font:", err);
    });
}

download(url);
