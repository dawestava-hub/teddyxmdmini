const { cmd } = require('../inconnuboy');
const { addSudo, removeSudo, getSudoList, isSudo } = require('../lib/database');

// ================================================================
// 👑 SUDOADD — Grant sudo access to a user on your session
// ================================================================
cmd({
    pattern: 'sudoadd',
    desc: 'Grant sudo (owner-level) access to a user on your session',
    category: 'owner',
    react: '👑'
},
async (conn, mek, m, { from, reply, isOwner, botNumber, quoted, args }) => {
    try {
        if (!isOwner) return reply('*❌ This command is for the owner only.*');

        let target;

        if (m.quoted) {
            target = m.quoted.sender.replace(/[^0-9]/g, '');
        } else if (args[0]) {
            target = args[0].replace(/[^0-9]/g, '');
        } else {
            return reply(
                '*📖 Usage:*\n' +
                '• Reply to a message: *.sudoadd*\n' +
                '• By number: *.sudoadd 1234567890*\n\n' +
                '_Sudo users get owner-level access on your session, even in private mode._'
            );
        }

        if (!target || target.length < 7) return reply('*❌ Invalid number.*');

        const cleanBot = botNumber.replace(/[^0-9]/g, '');
        if (target === cleanBot) return reply('*❌ You cannot add the bot itself as sudo.*');

        const alreadySudo = await isSudo(botNumber, target);
        if (alreadySudo) return reply(`*⚠️ +${target} is already a sudo user on your session.*`);

        const success = await addSudo(botNumber, target);
        if (!success) return reply('*❌ Failed to add sudo user. Please try again.*');

        await conn.sendMessage(from, {
            text:
                `*👑 SUDO ACCESS GRANTED*\n\n` +
                `• *User:* +${target}\n` +
                `• *Session:* +${cleanBot}\n\n` +
                `_This user now has owner-level access on your bot session._\n` +
                `_Use .sudodel to revoke access._`
        }, { quoted: mek });

    } catch (e) {
        console.error('SUDOADD ERROR:', e);
        reply('*❌ Error: ' + e.message + '*');
    }
});

// ================================================================
// 🗑️ SUDODEL — Revoke sudo access from a user
// ================================================================
cmd({
    pattern: 'sudodel',
    alias: ['sudorm', 'sudoremove'],
    desc: 'Revoke sudo access from a user on your session',
    category: 'owner',
    react: '🗑️'
},
async (conn, mek, m, { from, reply, isOwner, botNumber, args }) => {
    try {
        if (!isOwner) return reply('*❌ This command is for the owner only.*');

        let target;

        if (m.quoted) {
            target = m.quoted.sender.replace(/[^0-9]/g, '');
        } else if (args[0]) {
            target = args[0].replace(/[^0-9]/g, '');
        } else {
            return reply(
                '*📖 Usage:*\n' +
                '• Reply to a message: *.sudodel*\n' +
                '• By number: *.sudodel 1234567890*'
            );
        }

        if (!target || target.length < 7) return reply('*❌ Invalid number.*');

        const isSudoUser = await isSudo(botNumber, target);
        if (!isSudoUser) return reply(`*⚠️ +${target} is not a sudo user on your session.*`);

        const success = await removeSudo(botNumber, target);
        if (!success) return reply('*❌ Failed to remove sudo user. Please try again.*');

        await conn.sendMessage(from, {
            text:
                `*🗑️ SUDO ACCESS REVOKED*\n\n` +
                `• *User:* +${target}\n\n` +
                `_This user no longer has sudo access on your session._`
        }, { quoted: mek });

    } catch (e) {
        console.error('SUDODEL ERROR:', e);
        reply('*❌ Error: ' + e.message + '*');
    }
});

// ================================================================
// 📋 SUDOLIST — List all sudo users on your session
// ================================================================
cmd({
    pattern: 'sudolist',
    alias: ['sudos', 'listsudo'],
    desc: 'List all sudo users on your session',
    category: 'owner',
    react: '📋'
},
async (conn, mek, m, { from, reply, isOwner, botNumber }) => {
    try {
        if (!isOwner) return reply('*❌ This command is for the owner only.*');

        const list = await getSudoList(botNumber);
        const cleanBot = botNumber.replace(/[^0-9]/g, '');

        if (!list || list.length === 0) {
            return reply(
                `*📋 SUDO LIST — Session +${cleanBot}*\n\n` +
                `_No sudo users on this session yet._\n\n` +
                `_Use .sudoadd to grant sudo access._`
            );
        }

        const formatted = list.map((num, i) => `  ${i + 1}. +${num}`).join('\n');

        await conn.sendMessage(from, {
            text:
                `*👑 SUDO LIST — Session +${cleanBot}*\n\n` +
                `*Total: ${list.length} sudo user(s)*\n\n` +
                `${formatted}\n\n` +
                `_Sudo users have owner-level access on this session._`
        }, { quoted: mek });

    } catch (e) {
        console.error('SUDOLIST ERROR:', e);
        reply('*❌ Error: ' + e.message + '*');
    }
});
