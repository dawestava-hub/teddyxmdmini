const { cmd, commands } = require('../inconnuboy');
const config = require('../config');

// --- HELPER FUNCTIONS ---

// Function to check if user is admin (with LID support)
async function isUserAdmin(conn, chatId, userId) {
    try {
        const metadata = await conn.groupMetadata(chatId);
        const participants = metadata.participants || [];
        const normalizeId = (id) => {
            if (!id) return '';
            return id.replace(/:[0-9]+/g, '').replace(/@(lid|s\.whatsapp\.net|c\.us|g\.us)/g, '').replace(/[^\d]/g, '');
        };
        const normalizedUserId = normalizeId(userId);
        for (let p of participants) {
            const participantIds = [p.id, p.lid, p.phoneNumber, p.jid].filter(Boolean);
            for (let pid of participantIds) {
                if (normalizeId(pid) === normalizedUserId) {
                    return p.admin === "admin" || p.admin === "superadmin";
                }
            }
        }
        return false;
    } catch (err) {
        return false;
    }
}

// Function to check if bot is admin (with LID support)
async function isBotAdmin(conn, chatId) {
    try {
        const metadata = await conn.groupMetadata(chatId);
        const participants = metadata.participants || [];
        const botId = conn.user?.id || '';
        const botLid = conn.user?.lid || '';
        const normalizeId = (id) => {
            if (!id) return '';
            return id.replace(/:[0-9]+/g, '').replace(/@(lid|s\.whatsapp\.net|c\.us|g\.us)/g, '').replace(/[^\d]/g, '');
        };
        const normalizedBotId = normalizeId(botId);
        const normalizedBotLid = normalizeId(botLid);
        for (let p of participants) {
            if (p.admin === "admin" || p.admin === "superadmin") {
                const participantIds = [p.id, p.lid, p.phoneNumber].filter(Boolean);
                for (let pid of participantIds) {
                    const normalizedPid = normalizeId(pid);
                    if (normalizedPid === normalizedBotId || normalizedPid === normalizedBotLid) {
                        return true;
                    }
                }
            }
        }
        return false;
    } catch (err) {
        return false;
    }
}

// --- COMMAND: ANTI-LINK ON/OFF ---

cmd({
    pattern: "antilink",
    alias: ["linkprotect", "nolinks"],
    desc: "Turn anti-link system on or off",
    category: "admin",
    use: ".antilink on/off",
    filename: __filename
}, async (conn, m, store, { from, args, reply, isGroup, sender }) => {
    try {
        if (!isGroup) return reply("*❌ This command only works in groups*");

        const senderIsAdmin = await isUserAdmin(conn, from, sender);
        if (!senderIsAdmin) return reply("*❌ Only group admins can use this command*");

        if (!args[0]) return reply(
            `*🔗 ANTI-LINK*\n\n` +
            `*Usage:*\n.antilink on\n.antilink off\n\n` +
            `*Current Status:* ${config.ANTI_LINK === 'true' || config.ANTI_LINK === true? "ON ✅" : "OFF ❌"}\n\n` +
            `*⚡ TEDDY-XMD*`
        );

        if (args[0].toLowerCase() === 'on') {
            config.ANTI_LINK = 'true';
            return reply("*✅ Anti-link protection enabled*\n_Links will be auto-deleted and sender removed_");
        } else if (args[0].toLowerCase() === 'off') {
            config.ANTI_LINK = 'false';
            return reply("*❌ Anti-link protection disabled*");
        } else {
            return reply("*❌ Invalid option*\nUse:.antilink on or.antilink off");
        }
    } catch (e) {
        console.error("ANTILINK CMD ERROR:", e);
        reply("*❌ Error occurred*");
    }
});

// --- DETECTION LOGIC: ANTI-LINK ---

cmd({
    'on': "body"
}, async (conn, m, store, {
    from,
    body,
    sender,
    isGroup,
    reply
}) => {
    try {
        // Check if anti-link is enabled
        if (config.ANTI_LINK === 'false' ||!config.ANTI_LINK || config.ANTI_LINK === false) {
            return;
        }

        if (!isGroup) return;

        // Clean body to catch sneaky links
        let cleanBody = body.replace(/[\s\u200b-\u200d\uFEFF]/g, '').toLowerCase();
        const urlRegex = /(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.(?:com|org|net|co|pk|biz|id|info|xyz|online|site|website|tech|shop|store|blog|app|dev|io|ai|gov|edu|mil|me)(?:\/[^\s]*)?|whatsapp\.com\/channel\/|wa\.me\//gi;

        if (urlRegex.test(cleanBody)) {
            // Admins are exempt
            const senderIsAdmin = await isUserAdmin(conn, from, sender);
            if (senderIsAdmin) return;

            // Bot must be admin to act
            const botIsAdmin = await isBotAdmin(conn, from);
            if (!botIsAdmin) return;

            console.log(`⚠️ Link detected from ${sender} in ${from}`);

            const userNumber = sender.split('@')[0] || 'User';

            if (config.ANTI_LINK === 'true' || config.ANTI_LINK === true) {
                // 1. Delete message
                try {
                    await conn.sendMessage(from, { 'delete': m.key });
                } catch (e) { console.error("Delete failed", e); }

                // 2. Notification
                await conn.sendMessage(from, {
                    'text': `*🚫 ANTI-LINK PROTECTION*\n\n@${userNumber} was removed for sending links.\n\n*⚡ TEDDY-XMD*`,
                    'mentions': [sender]
                });

                // 3. Kick user
                await conn.groupParticipantsUpdate(from, [sender], "remove");
            }
        }
    } catch (error) {
        console.error("Anti-link system error:", error);
    }
});