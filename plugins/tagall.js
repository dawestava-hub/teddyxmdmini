const config = require('../config')
const { cmd, commands } = require('../inconnuboy')
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson} = require('../lib/functions')

cmd({
    pattern: "tagall",
    react: "📢",
    alias: ["everyone", "mentionall"],
    desc: "Tag all group members",
    category: "group",
    use: '.tagall [message]',
    filename: __filename
},
async (conn, mek, m, { from, participants, reply, isGroup, senderNumber, groupAdmins, prefix, command, args, body }) => {
    try {
        if (!isGroup) return reply("*❌ This command only works in groups*");

        const botOwner = conn.user.id.split(":")[0]
        const senderJid = senderNumber + "@s.whatsapp.net"

        if (!groupAdmins.includes(senderJid) && senderNumber!== botOwner) {
            return reply("*❌ Only group admins can use this command*");
        }

        // Fetch group metadata
        let groupInfo = await conn.groupMetadata(from).catch(() => null)
        if (!groupInfo) return reply("*❌ Failed to fetch group info*");

        let groupName = groupInfo.subject || "Unknown Group"
        let totalMembers = participants? participants.length : 0
        if (totalMembers === 0) return reply("*❌ No members found in this group*");

        await conn.sendMessage(from, { react: { text: "📢", key: mek.key } })

        let emojis = ['🔰', '⚡', '🔹', '👤', '📍']
        let randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]

        // Extract message
        let message = body.slice(body.indexOf(command) + command.length).trim()
        if (!message) message = "Attention Everyone"

        let teks = `*📢 GROUP:* ${groupName}\n`
        teks += `*👥 MEMBERS:* ${totalMembers}\n\n`
        teks += `*💬 MESSAGE:*\n${message}\n\n`
        teks += `*━━━━━━━━━━━━━━━*\n`
        teks += `*MENTION LIST*\n`
        teks += `*━━━━━━━━━━━━━━━*\n`

        for (let mem of participants) {
            if (!mem.id) continue
            teks += `${randomEmoji} @${mem.id.split('@')[0]}\n`
        }

        teks += `*━━━━━━━━━━━━━━━*\n\n`
        teks += `*⚡ TEDDY-XMD*`

        await conn.sendMessage(from, {
            text: teks,
            mentions: participants.map(a => a.id)
        }, { quoted: mek })

    } catch (e) {
        console.error("TagAll Error:", e)
        reply(`*❌ Error occurred*\n\n${e.message || e}`)
    }
})