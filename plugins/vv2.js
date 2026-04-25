const { cmd } = require('../inconnuboy');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

cmd({
    pattern: "vv2",
    alias: ["vo", "viewonce"],
    desc: "Resend view once media to inbox",
    category: "tools",
    react: "👁️",
    filename: __filename
},
async (conn, mek, m, { from, isOwner, reply, sender, quoted }) => {
    try {
        if (!quoted) return reply("*❌ Reply to a view once message with vv2*");
        
        // Check if quoted message is view once
        const isViewOnce = quoted.viewOnce || quoted.msg?.viewOnce || quoted.message?.viewOnceMessage;
        
        if (!isViewOnce) {
            return reply("*❌ That's not a view once message*\n\n*⚡ TEDDY-XMD*");
        }

        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        // Download the view once media
        const buffer = await downloadMediaMessage(quoted, 'buffer', {}, {});
        
        const mime = quoted.mimetype || quoted.msg?.mimetype || '';
        const caption = quoted.caption || quoted.msg?.caption || '';
        
        // Get sender's inbox
        const ownerJid = sender;

        if (/image/.test(mime)) {
            await conn.sendMessage(ownerJid, {
                image: buffer,
                caption: caption? `${caption}\n\n*👁️ View Once Recovered*\n*⚡ TEDDY-XMD*` : `*👁️ View Once Recovered*\n\n*⚡ TEDDY-XMD*`
            });
        } else if (/video/.test(mime)) {
            await conn.sendMessage(ownerJid, {
                video: buffer,
                caption: caption? `${caption}\n\n*👁️ View Once Recovered*\n*⚡ TEDDY-XMD*` : `*👁️ View Once Recovered*\n\n*⚡ TEDDY-XMD*`
            });
        } else if (/audio/.test(mime)) {
            await conn.sendMessage(ownerJid, {
                audio: buffer,
                mimetype: 'audio/mp4',
                ptt: quoted.msg?.ptt || false
            });
        } else {
            return reply("*❌ Unsupported view once type*\n\n*⚡ TEDDY-XMD*");
        }

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
        reply("*✅ View once sent to your inbox*\n\n*⚡ TEDDY-XMD*");

    } catch (e) {
        console.error("[VV2 ERROR]", e);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        reply("*❌ Failed to retrieve view once*\n_Media may be expired_\n\n*⚡ TEDDY-XMD*");
    }
});

// Auto-detect vv2 without prefix
cmd({
    on: "text",
    filename: __filename
}, async (conn, mek, m, { from, body, sender, quoted, reply }) => {
    try {
        if (body?.toLowerCase().trim() !== 'vv2') return;
        if (!quoted) return;

        const isViewOnce = quoted.viewOnce || quoted.msg?.viewOnce || quoted.message?.viewOnceMessage;
        if (!isViewOnce) return;

        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        const buffer = await downloadMediaMessage(quoted, 'buffer', {}, {});
        const mime = quoted.mimetype || quoted.msg?.mimetype || '';
        const caption = quoted.caption || quoted.msg?.caption || '';
        const ownerJid = sender;

        if (/image/.test(mime)) {
            await conn.sendMessage(ownerJid, {
                image: buffer,
                caption: caption? `${caption}\n\n*👁️ View Once Recovered*\n*⚡ TEDDY-XMD*` : `*👁️ View Once Recovered*\n\n*⚡ TEDDY-XMD*`
            });
        } else if (/video/.test(mime)) {
            await conn.sendMessage(ownerJid, {
                video: buffer,
                caption: caption? `${caption}\n\n*👁️ View Once Recovered*\n*⚡ TEDDY-XMD*` : `*👁️ View Once Recovered*\n\n*⚡ TEDDY-XMD*`
            });
        } else if (/audio/.test(mime)) {
            await conn.sendMessage(ownerJid, {
                audio: buffer,
                mimetype: 'audio/mp4',
                ptt: quoted.msg?.ptt || false
            });
        }

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
        reply("*✅ View once sent to your inbox*\n\n*⚡ TEDDY-XMD*");

    } catch (e) {
        console.log("Auto VV2 Error:", e.message);
    }
});
