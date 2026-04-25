const { cmd } = require('../inconnuboy')
const axios = require('axios')

cmd({
    pattern: "trt",
    alias: ["translate", "tr"],
    react: "🌍",
    desc: "Translate text between languages",
    category: "utility",
    use: ".trt <lang> <text>",
    filename: __filename
},
async (conn, mek, m, { q, reply }) => {
    try {

        // 📘 Guide message
        const guide =
`*🌍 TRANSLATE GUIDE 🌍*

*Usage:*
.trt <language_code> <text>
.trt ur Hello how are you
.trt en السلام علیکم

*Popular Language Codes:*
• en = English
• ur = Urdu
• hi = Hindi
• ar = Arabic
• es = Spanish
• fr = French
• de = German
• ja = Japanese
• zh = Chinese

*⚡ TEDDY-XMD WHATSAPP BOT ⚡*`

        // ❌ No input
        if (!q) {
            return reply(guide)
        }

        const parts = q.trim().split(/\s+/)

        // ❌ Wrong format
        if (parts.length < 2) {
            return reply(
`*❌ Invalid Format*

*Usage:*
.trt <language_code> <text>

*Example:*
.trt ur Hello world
.trt en السلام علیکم`
            )
        }

        const lang = parts[0].toLowerCase()
        const text = parts.slice(1).join(" ")

        if (text.length > 500) {
            return reply("*❌ Text too long. Max 500 characters allowed*")
        }

        await conn.sendMessage(m.chat, { react: { text: "⏳", key: mek.key } })

        // 🌐 Translation API - auto detect source language
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${lang}`
        const res = await axios.get(url, { timeout: 10000 })

        if (!res.data?.responseData?.translatedText) {
            await conn.sendMessage(m.chat, { react: { text: "❌", key: mek.key } })
            return reply("*❌ Translation failed. Check language code or try again*")
        }

        const translated = res.data.responseData.translatedText
        const detectedLang = res.data.responseData.detectedLanguage || "auto"

        await conn.sendMessage(m.chat, { react: { text: "✅", key: mek.key } })

        reply(
`*✅ TRANSLATION COMPLETE*

*From:* ${detectedLang.toUpperCase()} → ${lang.toUpperCase()}
*━━━━━━━━━━━━━━━*
${translated}
*━━━━━━━━━━━━━━━*

*⚡ TEDDY-XMD*`
        )

    } catch (e) {
        console.log("TRT ERROR:", e)
        await conn.sendMessage(m.chat, { react: { text: "❌", key: mek.key } })
        reply("*❌ Error occurred while translating. API may be down*")
    }
})