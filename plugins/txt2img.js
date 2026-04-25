//---------------------------------------------------------------------------
//           KAMRAN-MD - AI TEXT TO MEDIA (TXT2IMG / TXT2VID)
//---------------------------------------------------------------------------

const { cmd } = require('../inconnuboy');
const axios = require('axios');
const FormData = require('form-data');
const config = require('../config');

// Newsletter Context for professional branding
const newsletterContext = {
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '120363418144382782@newsletter',
        newsletterName: 'ᴅʀ-ᴍᴅ-ᴍɪɴɪ',
        serverMessageId: 143
    }
};

const AgungDevX = {
  config: {
    base: 'https://text2video.aritek.app',
    cipher: 'hbMcgZLlzvghRlLbPcTbCpfcQKM0PcU0zhPcTlOFMxBZ1oLmruzlVp9remPgi0QWP0QW',
    shift: 3,
    ua: 'AgungDevX Coder/1.0.0'
  },

  _decryptToken() {
    const { cipher, shift } = this.config;
    return [...cipher].map(c =>
      /[a-z]/.test(c)
        ? String.fromCharCode((c.charCodeAt(0) - 97 - shift + 26) % 26 + 97)
        : /[A-Z]/.test(c)
        ? String.fromCharCode((c.charCodeAt(0) - 65 - shift + 26) % 26 + 65)
        : c
    ).join('');
  },

  async text2img(prompt) {
    if (!prompt) throw 'Prompt is empty';
    const token = this._decryptToken();
    const form = new FormData();
    form.append('prompt', prompt);
    form.append('token', token);

    const { data } = await axios.post(
      `${this.config.base}/text2img`,
      form,
      {
        headers: {
          'user-agent': this.config.ua,
          authorization: token,
          ...form.getHeaders()
        }
      }
    );

    if (data.code !== 0 || !data.url) throw 'Failed to generate image';
    return data.url.trim();
  },

  async text2video(prompt) {
    if (!prompt) throw 'Prompt is empty';
    const token = this._decryptToken();
    const payload = {
      deviceID: Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2),
      isPremium: 1,
      prompt,
      used: [],
      versionCode: 59
    };

    const resKey = await axios.post(
      `${this.config.base}/txt2videov3`,
      payload,
      {
        headers: {
          'user-agent': this.config.ua,
          authorization: token,
          'content-type': 'application/json'
        }
      }
    );

    if (resKey.data.code !== 0 || !resKey.data.key) throw 'Failed to get video task';
    const key = resKey.data.key;

    for (let i = 0; i < 30; i++) {
      const res = await axios.post(
        `${this.config.base}/video`,
        { keys: [key] },
        { headers: { 'user-agent': this.config.ua, authorization: token } }
      );

      const v = res.data.datas?.[0];
      if (v?.url) return v.url.trim();
      await new Promise(r => setTimeout(r, 3000));
    }
    throw 'Video generation timeout';
  }
};

cmd({
    pattern: "img",
    alias: ["t2img", "aiimg"],
    desc: "Generate AI Image from text",
    category: "ai",
    react: "🎨",
    filename: __filename,
}, async (conn, mek, m, { from, text, reply }) => {
    if (!text) return reply("🧠 *Txt Ai Image*\n\nExample: `.txt2img anime girl in forest` ");
    
    try {
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
        const img = await AgungDevX.text2img(text);
        
        await conn.sendMessage(from, { 
            image: { url: img }, 
            caption: `*🎨 AI Image Generated*\n\n*Prompt:* ${text}\n\n*🚀 Powered by ᴅʀ-ᴍᴅ-ᴍɪɴɪ*`,
            contextInfo: newsletterContext
        }, { quoted: mek });
        
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
    } catch (e) {
        reply(`❌ Error: ${e}`);
    }
});

cmd({
    pattern: "aivid",
    alias: ["t2vid", "aivideo"],
    desc: "Generate AI Video from text",
    category: "ai",
    react: "🎬",
    filename: __filename,
}, async (conn, mek, m, { from, text, reply }) => {
    if (!text) return reply("🧠 *Txt Ai Video*\n\nExample: `.txt2vid cinematic sunset` ");
    
    try {
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
        const vid = await AgungDevX.text2video(text);
        
        await conn.sendMessage(from, { 
            video: { url: vid }, 
            caption: `*🎬 AI Video Generated*\n\n*Prompt:* ${text}\n\n*🚀 Powered by ᴅʀ-ᴍᴅ-ᴍɪɴɪ*`,
            contextInfo: newsletterContext
        }, { quoted: mek });
        
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
    } catch (e) {
        reply(`❌ Error: ${e}`);
    }
});
                               
