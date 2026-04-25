const { cmd } = require('../inconnuboy');

cmd({
    pattern: "online",
    alias: ["whosonline", "onlinemembers", "active"],
    desc: "Check who's currently online in the group",
    category: "group",
    react: "🟢",
    filename: __filename
},
async (conn, mek, m, { from, quoted, isGroup, isAdmins, isCreator, fromMe, reply }) => {
    try {
        // Check if the command is used in a group
        if (!isGroup) return reply("*❌ This command only works in groups*");

        // Check if user is owner or admin
        if (!isCreator &&!isAdmins &&!fromMe) {
            return reply("*❌ This command is only for admins and bot owner*");
        }

        // Send initial message
        await reply("*🔍 Scanning for online members...*\n*Please wait 15 seconds*");
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        const onlineMembers = new Set();
        const groupData = await conn.groupMetadata(from);
        const presencePromises = [];

        // Request presence updates for all participants
        for (const participant of groupData.participants) {
            presencePromises.push(
                conn.presenceSubscribe(participant.id).catch(() => {})
            );
        }

        await Promise.all(presencePromises);

        // Presence update handler
        const presenceHandler = (json) => {
            for (const id in json.presences) {
                const presence = json.presences[id]?.lastKnownPresence;
                if (['available', 'composing', 'recording', 'online'].includes(presence)) {
                    onlineMembers.add(id);
                }
            }
        };

        conn.ev.on('presence.update', presenceHandler);

        // Multiple checks with 5s intervals
        const checks = 3;
        const checkInterval = 5000;
        let checksDone = 0;

        const checkOnline = async () => {
            checksDone++;

            if (checksDone >= checks) {
                clearInterval(interval);
                conn.ev.off('presence.update', presenceHandler);

                if (onlineMembers.size === 0) {
                    await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
                    return reply("*⚠️ No online members detected*\n_Members may have hidden their presence_");
                }

                const onlineArray = Array.from(onlineMembers);
                const onlineList = onlineArray.map((member, index) =>
                    `${index + 1}. @${member.split('@')[0]}`
                ).join('\n');

                const message = `*🟢 ONLINE MEMBERS* *(${onlineArray.length}/${groupData.participants.length})*\n` +
                `*━━━━━━━━━━━━━━━*\n\n${onlineList}\n\n` +
                `*━━━━━━━━━━━━━━━*\n` +
                `*⚡ TEDDY-XMD*`;

                await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
                await conn.sendMessage(from, {
                    text: message,
                    mentions: onlineArray
                }, { quoted: mek });
            }
        };

        const interval = setInterval(checkOnline, checkInterval);

    } catch (e) {
        console.error("ONLINE CMD ERROR:", e);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        reply(`*❌ Error occurred:* ${e.message}`);
    }
});