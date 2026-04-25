const fs = require('fs');
const path = require('path');
const { cmd } = require('../inconnuboy');
const converter = require('../data/converter');
const config = require('../config');

cmd({
    on: "body"
},
async (conn, mek, m, { from, body }) => {
    try {
        const isEnabled = config.AUTO_VOICE === "true" || config.AUTO_VOICE === true;
        if (!isEnabled) return;

        if (m.fromMe || !body) return;

        const filePath = path.join(__dirname, '../assets/autovoice.json');
        if (!fs.existsSync(filePath)) return;

        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        const matchText = Object.keys(data).find(trigger => trigger.toLowerCase() === body.toLowerCase());
        if (!matchText) return;

        const audioPath = path.join(__dirname, '../assets', data[matchText]);
        if (!fs.existsSync(audioPath)) return;

        const buffer = fs.readFileSync(audioPath);
        const fileExtension = data[matchText].split('.').pop();
        const pttAudio = await converter.toPTT(buffer, fileExtension);

        await conn.sendMessage(from, {
            audio: pttAudio,
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true
        }, { quoted: mek });

    } catch (error) {
        console.error("AutoVoice Listener Error:", error);
    }
});
