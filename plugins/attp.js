const { cmd } = require('../inconnuboy')
const { fetchGif, gifToSticker } = require('../lib/sticker-utils')

cmd({
    pattern: "attp",
    alias: ["textsticker", "animtext", "atp"],
    react: "✨",
    desc: "Convert text to animated sticker",
    category: "sticker",
    use: ".attp <text>",
    filename: __filename
},
async (conn, mek, m, { args, reply }) => {
    try {
        if (!args[0]) {
            return reply(
                "*✨ TEXT TO STICKER*\n\n" +
                "*Usage:*\n.attp <your text>\n\n" +
                "*Example:*\n.attp TEDDY-XMD\n\n" +
                "*⚡ TEDDY-XMD*"
            )
        }

        await conn.sendMessage(m.chat, { react: { text: "⏳", key: mek.key } })
        reply("*✨ Creating your sticker...*\n_Please wait a few seconds_")

        const text = encodeURIComponent(args.join(" "))
        const gifBuffer = await fetchGif(
            `https://api-fix.onrender.com/api/maker/attp?text=${text}`
        )

        const sticker = await gifToSticker(gifBuffer)

        await conn.sendMessage(
            m.chat,
            { sticker },
            { quoted: mek }
        )

        await conn.sendMessage(m.chat, { react: { text: "✅", key: mek.key } })

    } catch (e) {
        console.log("ATTP ERROR:", e)
        await conn.sendMessage(m.chat, { react: { text: "❌", key: mek.key } })
        reply("*❌ Failed to create sticker*\n_API might be down_")
    }
})