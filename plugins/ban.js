const { cmd } = require('../inconnuboy');
const { banUser, unbanUser, getBanList, isBanned } = require('../lib/database');

// ================================================================
// 🔨 BAN — Ban a user from using the bot on your session
// ================================================================
cmd({
    pattern: 'ban',
    desc: 'Ban a user from using the bot on your session',
    category: 'owner',
    react: '🔨'
},
async (conn, mek, m, { from, reply, isOwner, isSudo, botNumber, args }) => {
    try {
        if (!isOwner && !isSudo) return reply('*❌ This command is for the owner and sudo users only.*');

        let target;
        let reason = 'No reason provided';

        if (m.quoted) {
            target = m.quoted.sender.replace(/[^0-9]/g, '');
            reason = args.join(' ') || reason;
        } else if (args[0]) {
            target = args[0].replace(/[^0-9]/g, '');
            reason = args.slice(1).join(' ') || reason;
        } else {
            return reply(
                '*📖 Usage:*\n' +
                '• Reply to a message: *.ban [reason]*\n' +
                '• By number: *.ban 1234567890 [reason]*\n\n' +
                '_Banned users cannot use the bot on your session,_\n' +
                '_even if the bot is set to public._'
            );
        }

        if (!target || target.length < 7) return reply('*❌ Invalid number.*');

        const cleanBot = botNumber.replace(/[^0-9]/g, '');
        if (target === cleanBot) return reply('*❌ You cannot ban the bot itself.*');

        const ownerNum = (require('../config').OWNER_NUMBER || '').replace(/[^0-9]/g, '');
        if (target === ownerNum) return reply('*❌ You cannot ban the session owner.*');

        const alreadyBanned = await isBanned(botNumber, target);
        if (alreadyBanned) return reply(`*⚠️ +${target} is already banned on your session.*`);

        const success = await banUser(botNumber, target, reason);
        if (!success) return reply('*❌ Failed to ban user. Please try again.*');

        // Send warning message to the banned user
        try {
            await conn.sendMessage(`${target}@s.whatsapp.net`, {
                text:
                    `*⚠️ YOU HAVE BEEN BANNED*\n\n` +
                    `You have been banned from using this bot on session *+${cleanBot}*.\n\n` +
                    `*Reason:* ${reason}\n\n` +
                    `_You will no longer be able to use any bot commands._\n` +
                    `_Contact the bot owner to appeal your ban._`
            });
        } catch (_) {
            // If message fails (e.g. blocked), ignore silently
        }

        await conn.sendMessage(from, {
            text:
                `*🔨 USER BANNED*\n\n` +
                `• *User:* +${target}\n` +
                `• *Reason:* ${reason}\n` +
                `• *Session:* +${cleanBot}\n\n` +
                `_This user can no longer use the bot on your session._\n` +
                `_Use .unban to lift the ban._`
        }, { quoted: mek });

    } catch (e) {
        console.error('BAN ERROR:', e);
        reply('*❌ Error: ' + e.message + '*');
    }
});

// ================================================================
// ✅ UNBAN — Lift a ban from a user
// ================================================================
cmd({
    pattern: 'unban',
    desc: 'Lift a ban from a user on your session',
    category: 'owner',
    react: '✅'
},
async (conn, mek, m, { from, reply, isOwner, isSudo, botNumber, args }) => {
    try {
        if (!isOwner && !isSudo) return reply('*❌ This command is for the owner and sudo users only.*');

        let target;

        if (m.quoted) {
            target = m.quoted.sender.replace(/[^0-9]/g, '');
        } else if (args[0]) {
            target = args[0].replace(/[^0-9]/g, '');
        } else {
            return reply(
                '*📖 Usage:*\n' +
                '• Reply to a message: *.unban*\n' +
                '• By number: *.unban 1234567890*'
            );
        }

        if (!target || target.length < 7) return reply('*❌ Invalid number.*');

        const isBannedUser = await isBanned(botNumber, target);
        if (!isBannedUser) return reply(`*⚠️ +${target} is not banned on your session.*`);

        const success = await unbanUser(botNumber, target);
        if (!success) return reply('*❌ Failed to unban user. Please try again.*');

        const cleanBot = botNumber.replace(/[^0-9]/g, '');

        // Notify the unbanned user
        try {
            await conn.sendMessage(`${target}@s.whatsapp.net`, {
                text:
                    `*✅ YOUR BAN HAS BEEN LIFTED*\n\n` +
                    `You have been unbanned from bot session *+${cleanBot}*.\n\n` +
                    `_You can now use the bot again. Welcome back!_`
            });
        } catch (_) {}

        await conn.sendMessage(from, {
            text:
                `*✅ USER UNBANNED*\n\n` +
                `• *User:* +${target}\n` +
                `• *Session:* +${cleanBot}\n\n` +
                `_This user can now use the bot again on your session._`
        }, { quoted: mek });

    } catch (e) {
        console.error('UNBAN ERROR:', e);
        reply('*❌ Error: ' + e.message + '*');
    }
});

// ================================================================
// 📋 BANLIST — List all banned users on your session
// ================================================================
cmd({
    pattern: 'banlist',
    alias: ['bans', 'listban'],
    desc: 'List all banned users on your session',
    category: 'owner',
    react: '📋'
},
async (conn, mek, m, { from, reply, isOwner, isSudo, botNumber }) => {
    try {
        if (!isOwner && !isSudo) return reply('*❌ This command is for the owner and sudo users only.*');

        const list = await getBanList(botNumber);
        const cleanBot = botNumber.replace(/[^0-9]/g, '');

        if (!list || list.length === 0) {
            return reply(
                `*📋 BAN LIST — Session +${cleanBot}*\n\n` +
                `_No banned users on this session._\n\n` +
                `_Use .ban to ban a user._`
            );
        }

        const formatted = list.map((entry, i) => {
            const date = new Date(entry.bannedAt).toLocaleDateString('en-US');
            return `  ${i + 1}. +${entry.number}\n     📌 Reason: ${entry.reason}\n     📅 Banned: ${date}`;
        }).join('\n\n');

        await conn.sendMessage(from, {
            text:
                `*🔨 BAN LIST — Session +${cleanBot}*\n\n` +
                `*Total: ${list.length} banned user(s)*\n\n` +
                `${formatted}\n\n` +
                `_Banned users cannot use the bot even if it is public._`
        }, { quoted: mek });

    } catch (e) {
        console.error('BANLIST ERROR:', e);
        reply('*❌ Error: ' + e.message + '*');
    }
});
