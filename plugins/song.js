const { cmd } = require('../inconnuboy');
const axios = require('axios');

cmd({
  pattern: "song3",
  react: "🎵",
  category: "download",
  desc: "Search legal music",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply(
      "*🎵 Music Search*\n\n" +
      "*Usage:*\n.song3 <song name>\n\n" +
      "*Example:*\n.song3 lofi chill\n\n" +
      "*⚡ TEDDY-XMD*"
    );

    await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

    // Example: Use Jamendo API for royalty-free music
    const apiUrl = `https://api.jamendo.com/v3.0/tracks/?client_id=YOUR_ID&format=json&limit=1&namesearch=${encodeURIComponent(q)}`;
    const { data } = await axios.get(apiUrl, { timeout: 10000 });

    if (!data.results || data.results.length === 0) {
      await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
      return reply("*❌ No results found*");
    }

    const track = data.results[0];

    await reply(
      `*🎵 TRACK INFO*\n\n` +
      `*📝 Title:* ${track.name}\n` +
      `*👤 Artist:* ${track.artist_name}\n` +
      `*⏱️ Duration:* ${track.duration}s\n` +
      `*🔗 Listen:* ${track.shareurl}\n\n` +
      `*⚡ TEDDY-XMD*`
    );

    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

  } catch (err) {
    console.log("SONG CMD ERROR:", err);
    await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    reply("*❌ Error occurred*");
  }
});