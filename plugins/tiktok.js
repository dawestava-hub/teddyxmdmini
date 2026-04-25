const { cmd } = require('../inconnuboy');
const axios = require('axios');

cmd({
  pattern: "tiktok",
  react: "🎵",
  alias: ["ttdl", "tt", "tiktokvideo", "ttvideo"],
  desc: "Download TikTok videos without watermark",
  category: "download",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply(
      "*🎵 TikTok Downloader*\n\n" +
      "*Usage:*\n.tiktok <tiktok_video_link>\n\n" +
      "*Example:*\n.tiktok https://vt.tiktok.com/ZSjYx9x8x/\n\n" +
      "*⚡ Powered by TEDDY-XMD*"
    );

    await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

    const apiUrl = `https://www.movanest.xyz/v2/tiktok?url=${encodeURIComponent(q)}`;
    const { data } = await axios.get(apiUrl, { timeout: 15000 });

    // API status check
    if (data.status !== true || !data.results) {
      await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
      return reply("*❌ Failed to fetch video. API error or invalid link*");
    }

    const res = data.results;

    if (!res.no_watermark) {
      await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
      return reply("*❌ TikTok video not found or link is invalid*");
    }

    // Send video info
    await reply(
      `*🎵 TIKTOK VIDEO*\n\n` +
      `*📝 Title:* ${res.title || "No title"}\n` +
      `*👤 Author:* ${res.author?.nickname || "Unknown"}\n` +
      `*❤️ Likes:* ${res.digg_count || "N/A"}\n` +
      `*▶️ Views:* ${res.play_count || "N/A"}\n\n` +
      `*⚡ TEDDY-XMD*`
    );

    // Send no-watermark video
    await conn.sendMessage(
      from,
      {
        video: { url: res.no_watermark },
        mimetype: "video/mp4",
        caption: "*✅ Downloaded without watermark*"
      },
      { quoted: mek }
    );

    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

  } catch (err) {
    console.log("TIKTOK CMD ERROR:", err);
    await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    reply("*❌ Error occurred. API might be down or link is invalid*");
  }
});