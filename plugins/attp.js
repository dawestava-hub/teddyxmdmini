const { cmd } = require('../inconnuboy')
const { fetchGif, gifToSticker } = require('../lib/sticker-utils')

cmd({
    pattern: "attp",
    alias: ["attptext", "textsticker", "namesticker", "stickername", "at", "att", "atp"],
    react: "✨",
    desc: "Convert text into animated sticker",
    category: "sticker",
    use: ".attp <text>",
    filename: __filename
},
async (conn, mek, m, { args, reply }) => {
    try {
        if (!args[0]) {
            return reply(
                "*🥺 APKO APKE NAME KA STICKER BANANA HAI*\n\n" +
                "*Use:* `.attp APKA NAME`\n\n" +
                "*Example:*\n.attp Bilal"
            )
        }

        reply("*✨ APKA STICKER BAN RAHA HAI*\n*THORA SA INTAZAR KARE...☺️*")

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

    } catch (e) {
        console.log("ATTP ERROR:", e)
        reply("*❌ STICKER BANANE ME ERROR AYA 🥺*")
    }
})
