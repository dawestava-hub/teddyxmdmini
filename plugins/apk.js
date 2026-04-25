const { cmd } = require('../inconnuboy');
const axios = require('axios');

cmd({
  pattern: "apk",
  alias: ["app", "playstore", "application"],
  react: "📱",
  desc: "Download APK from Aptoide",
  category: "download",
  use: ".apk <app name>",
  filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
  try {
    if (!q) return reply(
      "*📱 APK DOWNLOADER*\n\n" +
      "*Usage:*\n.apk <app name>\n\n" +
      "*Example:*\n.apk WhatsApp\n.apk Minecraft\n\n" +
      "*⚡ TEDDY-XMD*"
    );

    await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
    reply("*📱 Searching Aptoide...*");

    const apiUrl = `http://ws75.aptoide.com/api/7/apps/search/query=${encodeURIComponent(q)}/limit=1`;
    const { data } = await axios.get(apiUrl, { timeout: 20000 });

    if (!data || !data.datalist || !data.datalist.list.length) {
      await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
      return reply("*❌ APK not found*\nTry a different name or check spelling");
    }

    const app = data.datalist.list[0];
    const appSize = (app.size / 1048576).toFixed(2);

    let caption = `*╭───〘 📱 APK INFO 〙───*\n` +
                  `*│*\n` +
                  `*│ 📦 Name    : ${app.name}*\n` +
                  `*│ 📊 Size    : ${appSize} MB*\n` +
                  `*│ 📌 Package : ${app.package}*\n` +
                  `*│ 🔢 Version : ${app.file.vername}*\n` +
                  `*│*\n` +
                  `*╰────────────────*\n\n` +
                  `*⚡ TEDDY-XMD*`;

    // Send app icon + info
    await conn.sendMessage(from, { 
      image: { url: app.icon }, 
      caption 
    }, { quoted: mek });

    // Send APK file
    await conn.sendMessage(from, {
      document: { url: app.file.path || app.file.path_alt },
      mimetype: "application/vnd.android.package-archive",
      fileName: `${app.name} v${app.file.vername}.apk`
    }, { quoted: mek });

    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

  } catch (err) {
    console.log("APK ERROR:", err);
    await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    reply("*❌ Error downloading APK*\n_Aptoide API might be down_");
  }
});