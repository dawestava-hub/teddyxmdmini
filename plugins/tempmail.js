const { cmd } = require('../inconnuboy')
const axios = require('axios')

// Simple in-memory store - clears on restart
const tempMailStore = {}

cmd({
    pattern: "tempmail",
    alias: ["tmpmail", "mail", "inbox"],
    react: "📧",
    desc: "Create temp email & check inbox",
    category: "tools",
    use: ".tempmail |.tempmail inbox",
    filename: __filename
},
async (conn, mek, m, { from, sender, args, reply }) => {
    try {

        // 📥 INBOX CHECK
        if (args[0] === "inbox") {
            const data = tempMailStore[sender]
            if (!data) {
                return reply("*❌ No temp mail found*\n\n*Create one first:*.tempmail")
            }

            await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } })

            const url = `https://www.movanest.xyz/v2/tempmail/check?token=${data.token}`
            const res = await axios.get(url, { timeout: 10000 })

            if (!res.data.results || res.data.results.length === 0) {
                await conn.sendMessage(from, { react: { text: "📭", key: mek.key } })
                return reply("*📭 Inbox is empty*\n\nNo messages received yet")
            }

            let msg = `*📬 INBOX - ${data.email}*\n*━━━━━━━━━━━━━━━*\n\n`
            res.data.results.slice(0, 5).forEach((m, i) => {
                msg += `*${i + 1}. ${m.subject || "No Subject"}*\n`
                msg += `*From:* ${m.from}\n`
                msg += `*Message:*\n${m.text?.slice(0, 200) || "No content"}...\n`
                msg += `*━━━━━━━━━━━━━━━*\n\n`
            })

            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } })
            return reply(msg)
        }

        // 📧 CREATE TEMP MAIL
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } })

        const domainsRes = await axios.get(
            "https://www.movanest.xyz/v2/tempmail/domains",
            { timeout: 10000 }
        )

        const domains = domainsRes.data.results
        if (!domains || domains.length === 0) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } })
            return reply("*❌ No domains available right now*")
        }

        const domain = domains[Math.floor(Math.random() * domains.length)].name
        const username = "teddy" + Math.floor(Math.random() * 99999)

        const genUrl = `https://www.movanest.xyz/v2/tempmail/generate?username=${username}&domain=${domain}`
        const genRes = await axios.get(genUrl, { timeout: 10000 })

        if (!genRes.data.results?.email) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } })
            return reply("*❌ Failed to generate email*")
        }

        const email = genRes.data.results.email
        const token = genRes.data.results.token

        // Save for inbox
        tempMailStore[sender] = { email, token, created: Date.now() }

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } })

        reply(
`*📧 TEMP MAIL CREATED*

*Email:*
\`${email}\`

*📥 Check inbox:*
.tempmail inbox

*⚠️ Note:* Emails expire after 10 minutes
*⚡ TEDDY-XMD*`
        )

    } catch (e) {
        console.log("TEMPMAIL ERROR:", e)
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } })
        reply("*❌ Temp mail error. API might be down*")
    }
})