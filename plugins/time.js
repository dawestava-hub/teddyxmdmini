const { cmd } = require('../inconnuboy')

cmd({
    pattern: "time",
    alias: ["clock", "worldtime"],
    react: "⏰",
    desc: "Check current time in multiple zones",
    category: "utility",
    filename: __filename
},
async (conn, mek, m, { reply }) => {
    try {
        const now = new Date()
        
        const zones = {
            "🇵🇰 Pakistan": "Asia/Karachi",
            "🇮🇳 India": "Asia/Kolkata", 
            "🇸🇦 Saudi": "Asia/Riyadh",
            "🇬🇧 UK": "Europe/London",
            "🇺🇸 EST": "America/New_York"
        }

        let text = "*🌍 WORLD CLOCK*\n\n"
        
        for (let [name, tz] of Object.entries(zones)) {
            const time = now.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
                timeZone: tz
            })
            text += `${name}: *${time}*\n`
        }

        text += `\n*⚡ TEDDY-XMD*`
        reply(text)

    } catch (e) {
        console.log("TIME ERROR:", e)
        reply("*❌ Failed to get current time*")
    }
})