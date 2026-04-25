const config = require('../config');
const { cmd } = require('../inconnuboy');
const axios = require('axios');
const converter = require('../data/converter');

// --- SHARED VOICE CLIPS LIST ---
const voiceClips = [
  "https://files.catbox.moe/6g7o83.mp4",
  "https://files.catbox.moe/d9tsx9.mp4",
  "https://files.catbox.moe/v0pq14.mp4",
  "https://files.catbox.moe/57uelj.mp4",
  "https://files.catbox.moe/1l9v06.mp4",
  "https://files.catbox.moe/goo2ub.mp4",
  "https://files.catbox.moe/cpc3pb.mp4",
  "https://files.catbox.moe/k9lqmh.mp4",
  "https://files.catbox.moe/ydfatb.mp4",
  "https://files.catbox.moe/n4b2ix.mp4",
  "https://files.catbox.moe/0zjqy2.mp4",
  "https://files.catbox.moe/vjrubz.mp4",
  "https://files.catbox.moe/ngfnj7.mp4",
  "https://files.catbox.moe/986yyf.mp4"
];

cmd({
  on: "body"
}, async (conn, m, { isGroup }) => {
  try {
    if (config.MENTION_REPLY !== 'true' || !isGroup) return;

    const botId = conn.user?.id || '';
    const botLid = conn.user?.lid || '';
    const botNumber = botId.split(":")[0].split("@")[0];

    const mentioned = m.mentionedJid || [];
    const isBotMentioned = mentioned.some(jid => jid.includes(botNumber) || jid === botId || jid === botLid);

    if (!isBotMentioned) return;

    const randomClip = voiceClips[Math.floor(Math.random() * voiceClips.length)];

    const response = await axios.get(randomClip, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    const ptt = await converter.toPTT(buffer, 'mp4');

    // Sirf audio message bhej rahe hain, bina kisi extra info ke
    await conn.sendMessage(m.chat, {
      audio: ptt,
      mimetype: 'audio/ogg; codecs=opus',
      ptt: true
    }, { quoted: m });

  } catch (e) {
    console.error("Mention Reply Error:", e);
  }
});

cmd({
    pattern: "me",
    alias: ["mention", "broken", "x", "xd"],
    desc: "Send a random voice clip without ad or channel info",
    category: "fun",
    react: "⚡",
    filename: __filename
}, async (conn, m) => {
    try {
        const randomClip = voiceClips[Math.floor(Math.random() * voiceClips.length)];

        const response = await axios.get(randomClip, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        const ptt = await converter.toPTT(buffer, 'mp4');

        // Clean PTT Reply
        await conn.sendMessage(m.chat, {
            audio: ptt,
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true
        }, { quoted: m });

    } catch (e) {
        console.error("Voice command error:", e);
        const fallback = voiceClips[0];
        await conn.sendMessage(m.chat, { 
            audio: { url: fallback }, 
            mimetype: 'audio/mp4', 
            ptt: true 
        }, { quoted: m });
    }
});

  
