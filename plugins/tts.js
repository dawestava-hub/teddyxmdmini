const { cmd } = require('../inconnuboy')
const googleTTS = require('google-tts-api')
const axios = require('axios')

cmd({
    pattern: "tts",
    alias: ["speak", "say"],
    react: "🔊",
    desc: "Convert text to voice",
    category: "fun",
    filename: __filename
},
async (conn, mek, m, { from, q, args, reply }) => {
    try {
        await conn.sendMessage(from, {
            react: { text: "🔊", key: mek.key }
        })

        if (!q) {
            return reply(
                "*🗣️ Text to Speech*\n\n" +
                "*Usage:*\n.tts Hello how are you\n\n" +
                "*For Urdu:*\n.tts ur السلام علیکم\n\n" +
                "*Supported:* en, ur, hi, ar, fr, es, etc"
            )
        }

        // Language select
        let lang = "en"
        let text = q

        if (args[0] && args[0].length === 2) {
            lang = args[0].toLowerCase()
            text = args.slice(1).join(" ")
        }

        if (!text) {
            return reply("*❌ Please provide text to convert*")
        }

        if (text.length > 200) {
            return reply("*❌ Text too long. Max 200 characters allowed*")
        }

        // Generate TTS URL
        const audioUrl = googleTTS.getAudioUrl(text, {
            lang: lang,
            slow: false,
            host: "https://translate.google.com"
        })

        // Download audio
        const res = await axios.get(audioUrl, {
            responseType: "arraybuffer"
        })

        const audioBuffer = Buffer.from(res.data)

        // Send audio
        await conn.sendMessage(
            from,
            {
                audio: audioBuffer,
                mimetype: "audio/mp4",
                ptt: true
            },
            { quoted: mek }
        )

        await conn.sendMessage(from, {
            react: { text: "✅", key: mek.key }
        })

    } catch (e) {
        console.log("TTS ERROR:", e)

        await conn.sendMessage(from, {
            react: { text: "❌", key: mek.key }
        })

        reply("*❌ Failed to generate voice. Check language code or try shorter text*")
    }
})