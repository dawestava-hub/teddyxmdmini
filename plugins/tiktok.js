const { cmd } = require('../inconnuboy');
const axios = require('axios');

cmd({
  pattern: "tiktok",
  react: "☺️",
  alias: ["tiktok", "ttdl", "tt", "tiktokvideo", "ttvideo"],
  category: "download",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply("*AP NE KOI TIKTOK VIDEO DOWNLOAD KARNI HAI 🤔 TO AP US TIKTOK VIDEO KA LINK COPY KAR LO 🤗*\n*PHIR ESE LIKHO ☺️*\n\n*TIKTOK ❮TIKTOK VIDEO LINK❯*\n\n*JAB AP ESE LIKHO GE 😇 TO APKI TIKTOK VIDEO DOWNLOAD KAR KE 😊 YAHA PER BHEJ DE JAYE GE 🥰🌹* ");

    const apiUrl = `https://www.movanest.xyz/v2/tiktok?url=${encodeURIComponent(q)}`;
    const { data } = await axios.get(apiUrl);

    // 🔎 API status check
    if (data.status !== true || !data.results) {
      return reply("API ERROR");
    }

    const res = data.results;

    if (!res.no_watermark) {
      return reply("*TIKTOK VIDEO NAHI MIL RAHI 🥺*");
    }

    // 🔹 Simple info (optional but clean)
    await reply(
      `*👑 TIKTOK VIDEO 👑*\n\n*👑 VIDEO NAME 👑\n` +
      `${res.title || "No title"}\n\n*👑 BY :❯ BILAL-MD 👑*`
    );

    // 🔹 Send no-watermark video
    await conn.sendMessage(
      from,
      {
        video: { url: res.no_watermark },
        mimetype: "video/mp4"
      },
      { quoted: mek }
    );

  } catch (err) {
    console.log("TIKTOK CMD ERROR:", err);
    reply("❌ Error aa gaya");
  }
});
