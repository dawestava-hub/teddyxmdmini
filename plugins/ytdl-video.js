const { cmd } = require('../inconnuboy');
const axios = require('axios');
const yts = require('yt-search');

const AXIOS_DEFAULTS = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
    }
};

// ✅ SAME API AS DRAMA
async function getYupra(url) {
    try {
        const api = `https://api.yupra.my.id/api/downloader/ytmp4?url=${encodeURIComponent(url)}`;
        const res = await axios.get(api, AXIOS_DEFAULTS);
        const d = res?.data?.data || {};
        return d.download_url || null;
    } catch {
        return null;
    }
}

cmd({
    pattern: "video",
    alias: ["mp4"],
    desc: "Download video by name",
    category: "download",
    react: "🎬",
    filename: __filename
}, async (sock, message, m, { q }) => {

    const query = q ? q.trim() : "";
    if (!query)
        return await sock.sendMessage(
            message.chat,
            { text: "Please provide a song name!" },
            { quoted: message }
        );

    try {
        const search = await yts(query);
        const video = search.videos[0];
        if (!video) return;

        const customName = "⚡ᴘᴏᴡᴇʀᴇᴅ ʙʏ BILAL-ᴍᴅ-ᴍɪɴɪ⚡";

        // Thumbnail + info (same style)
        await sock.sendMessage(message.chat, {
            image: { url: video.thumbnail },
            caption:
`*${video.title}*

🎥 *Channel:* ${video.author.name}
👁️ *Views:* ${video.views.toLocaleString()}
⏳ *Duration:* ${video.timestamp}

> *${customName}*`
        }, { quoted: message });

        // Download link from Yupra
        const downUrl = await getYupra(video.url);
        if (!downUrl) return;

        // Send video
        await sock.sendMessage(message.chat, {
            video: { url: downUrl },
            mimetype: "video/mp4",
            caption: `*${video.title}*\n\n> *${customName}*`
        }, { quoted: message });

    } catch {
        // no extra messages
    }
});
