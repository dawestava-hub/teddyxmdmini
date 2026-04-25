const axios = require("axios");
const { cmd } = require("../inconnuboy");

// =============================================================
// 📌 TIKTOK DOWNLOADER COMMAND
// =============================================================
cmd({
  pattern: "tiktok",
  alias: ["ts", "ttsearch", "tt", "ttdl"],
  desc: "Download TikTok videos via link or search",
  react: "🎵",
  category: "download",
  filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {

  try {
    // 1. Check Input
    if (!q) return reply(`*🎵 TikTok Downloader*\n\n*Usage:*\n.tiktok <link or query>\n\n*Example:*\n.tiktok https://vt.tiktok.com/...\n.tiktok funny cats\n\n*⚡ TEDDY-XMD*`);

    await conn.sendMessage(from, { react: { text: "📥", key: mek.key } });

    let videoData;

    // 2. Try direct link first
    try {
      const apiUrl = `https://tikwm.com/api/`;
      const response = await axios.post(apiUrl, new URLSearchParams({
          url: q,
          count: 1,
          cursor: 0,
          hd: 1
      }), { timeout: 15000 });

      if (response.data?.data) {
        videoData = response.data.data;
      }
    } catch (e) {
      // Ignore, try search next
    }

    // 3. If no direct link, search by keywords
    if (!videoData) {
        const searchRes = await axios.get(`https://tikwm.com/api/feed/search?keywords=${encodeURIComponent(q)}`, { timeout: 15000 });
        if (!searchRes.data?.data?.videos?.length) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply("*❌ No videos found. Try a different link or keyword*");
        }
        videoData = searchRes.data.data.videos[0];
    }

    // 4. Design Caption
    let caption = `╭━━━〔 *TIKTOK DOWNLOADER* 〕━━━┈⊷
┃
┃ 🎵 *TITLE:* ${videoData.title ? videoData.title.slice(0, 60) : "TIKTOK VIDEO"}
┃ 👤 *AUTHOR:* ${videoData.author?.nickname || "Unknown"}
┃ 👁️ *VIEWS:* ${videoData.play_count ? videoData.play_count.toLocaleString() : "N/A"}
┃ ❤️ *LIKES:* ${videoData.digg_count ? videoData.digg_count.toLocaleString() : "N/A"}
┃ ⏱️ *DURATION:* ${videoData.duration || "N/A"}s
┃
╰━━━━━━━━━━━━━━━━━━━━┈⊷

*⚡ POWERED BY TEDDY-XMD*`;

    // 5. Send Video
    await conn.sendMessage(from, { 
      video: { url: videoData.hdplay || videoData.play || videoData.wmplay }, 
      caption: caption,
      fileName: `tiktok-${Date.now()}.mp4` 
    }, { quoted: mek });

    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

  } catch (e) {
    console.error("TikTok Error:", e);
   