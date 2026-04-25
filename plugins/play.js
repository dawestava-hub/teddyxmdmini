const { cmd } = require("../inconnuboy");
const yts = require("yt-search");
const axios = require("axios");

// --- Helper Functions ---

function normalizeYouTubeUrl(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/.*[?&]v=)([a-zA-Z0-9_-]{11})/);
  return match ? `https://youtube.com/watch?v=${match[1]}` : null;
}

/**
 * Fetch Video Link (Jawad-Tech API)
 */
async function fetchVideoData(url) {
  try {
    const apiUrl = `https://jawad-tech.vercel.app/download/ytdl?url=${encodeURIComponent(url)}`;
    const { data } = await axios.get(apiUrl);
    return data.status && data.result ? data.result.mp4 : null;
  } catch (e) { return null; }
}

/**
 * Fetch Audio Link (Koyeb API)
 */
async function fetchAudioData(url) {
  try {
    const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/song?search=${encodeURIComponent(url)}`;
    const { data } = await axios.get(apiUrl);
    return data.status && data.data ? data.data.url : null;
  } catch (e) { return null; }
}

// --- MAIN DOWNLOAD COMMAND ---

cmd(
  {
    pattern: "dl",
    alias: ["download", "play"],
    react: "📥",
    desc: "Download YouTube Video or Audio with selection.",
    category: "download",
    filename: __filename,
  },
  async (conn, mek, m, { from, q, reply, prefix }) => {
    try {
      if (!q) return reply(`❓ Usage: \`${prefix}dl <name/link>\``);

      await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });

      // Step 1: Search Video
      let ytdata;
      const url = normalizeYouTubeUrl(q);
      if (url) {
        const results = await yts({ videoId: url.split('v=')[1] });
        ytdata = results;
      } else {
        const search = await yts(q);
        if (!search.videos.length) return reply("❌ No results found!");
        ytdata = search.videos[0];
      }

      const caption = `
🎥 *YT DOWNLOADER* 🎥

📌 *Title:* ${ytdata.title}
⏱️ *Duration:* ${ytdata.timestamp}
👁️ *Views:* ${ytdata.views.toLocaleString()}
🔗 *Link:* ${ytdata.url}

*Inmein se koi ek select karen:*
1️⃣ *Video (MP4)*
2️⃣ *Audio (MP3)*

> © Powered by Teddy Tech`;

      const sentMsg = await conn.sendMessage(from, { image: { url: ytdata.thumbnail || ytdata.image }, caption }, { quoted: mek });
      const messageID = sentMsg.key.id;

      // Step 2: Handle Selection via Reply
      conn.ev.on("messages.upsert", async (msgData) => {
        const receivedMsg = msgData.messages[0];
        if (!receivedMsg?.message) return;

        const text = receivedMsg.message.conversation || receivedMsg.message.extendedTextMessage?.text;
        const isReply = receivedMsg.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

        if (isReply) {
          await conn.sendMessage(from, { react: { text: "⏳", key: receivedMsg.key } });

          if (text === "1") {
            // Video Download
            const videoUrl = await fetchVideoData(ytdata.url);
            if (!videoUrl) return reply("❌ Video download failed!");
            
            await conn.sendMessage(from, { 
              video: { url: videoUrl }, 
              caption: `✅ *${ytdata.title}*\n\n> © KAMRAN-MD` 
            }, { quoted: receivedMsg });

          } else if (text === "2") {
            // Audio Download
            const audioUrl = await fetchAudioData(ytdata.url);
            if (!audioUrl) return reply("❌ Audio download failed!");

            await conn.sendMessage(from, { 
              audio: { url: audioUrl }, 
              mimetype: "audio/mpeg" 
            }, { quoted: receivedMsg });

          } else {
            reply("❌ Invalid choice! Please reply with 1 or 2.");
          }
          
          await conn.sendMessage(from, { react: { text: "✅", key: receivedMsg.key } });
        }
      });

    } catch (e) {
      console.error(e);
      reply("⚠️ Error occurred!");
    }
  }
);
  
