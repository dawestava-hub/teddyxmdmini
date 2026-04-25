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

async function getYupra(url) {
    try {
        const api = `https://api.yupra.my.id/api/downloader/ytmp4?url=${encodeURIComponent(url)}`;
        const res = await axios.get(api, AXIOS_DEFAULTS);
        const d = res?.data?.data || {};
        return d.download_url || null;
    } catch (e) {
        console.log("Yupra API Error:", e.message);
        return null;
    }
}

cmd({
    pattern: "video",
    alias: ["mp4", "ytmp4"],
    desc: "Download video from YouTube by name",
    category: "download",
    react: "🎬",
    filename: __filename
}, async (sock, message, m, { from, q, reply }) => {

    const query = q ? q.trim() : "";
    if (!query)
        return reply("*🔍 Please provide a video name*\n\n*Example:*\n.video Tajdar e Haram");

    try {
        const search = await yts(query);
        const video = search.videos[0];
        if (!video) return reply("*❌ No videos found for your search*");

        const brandName = "⚡ POWERED BY TEDDY-XMD ⚡";

        // Send thumbnail + info first
        await sock.sendMessage(from, {
            image: { url: video.thumbnail },
            caption:
`*${video.title}*

🎥 *Channel:* ${video.author.name}
👁️ *Views:* ${video.views.toLocaleString()}
⏳ *Duration:* ${video.timestamp}
🔗 *Link:* ${video.url}

> *${brandName}*`
        }, { quoted: message });

        // Get download link
        const downUrl = await getYupra(video.url);
        if (!downUrl) return reply("*❌ Failed to get download link. Try again later*");

        // Send video
        await sock.sendMessage(from, {
            video: { url: downUrl },
            mimetype: "video/mp4",
            caption: `*${video.title}*\n\n> *${brandName}*`
        }, { quoted: message });

    } catch (e) {
        console.log("VIDEO CMD ERROR:", e);
        reply("*❌ An error occurred while downloading the video*");
    }
});