const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { cmd } = require("../inconnuboy");

cmd({
  pattern: "tourl",
  alias: ["imgtourl", "imgurl", "url", "geturl", "upload"],
  react: "🖇️",
  desc: "Upload replied media to Catbox and get URL",
  category: "utility",
  use: ".tourl (reply to media)",
  filename: __filename
}, async (client, message, args, { reply }) => {
  try {
    // ✅ Correct quoted for your framework
    const quoted = message.quoted ? message.quoted : message;

    if (!quoted.mimetype) {
      return reply("❌ Reply to an image, video, audio, or document file");
    }

    // ✅ Correct download method for your bot
    const buffer = await quoted.download();

    // Temp file
    const ext = quoted.mimetype.split("/")[1]?.split(";")[0] || "bin";
    const tempPath = path.join(os.tmpdir(), `catbox_${Date.now()}.${ext}`);
    fs.writeFileSync(tempPath, buffer);

    // Catbox upload
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", fs.createReadStream(tempPath));

    const res = await axios.post("https://catbox.moe/user/api.php", form, {
      headers: form.getHeaders()
    });

    fs.unlinkSync(tempPath);

    if (!res.data || !res.data.startsWith("https")) {
      return reply("❌ Upload failed. Try again.");
    }

    await reply(
`*✅ Media Uploaded to Catbox*

*Size:* ${formatBytes(buffer.length)}
*URL:* ${res.data}

> © Uploaded by DR-MD-MINI 💜`
    );

  } catch (err) {
    console.error(err);
    reply(`❌ Error: ${err.message || err}`);
  }
});

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    }
