const { cmd } = require('../inconnuboy');
const { setAntideleteStatus, getAntideleteStatus } = require('../data/Antidelete');

cmd({
    pattern: "antidelete",
    alias: ["antidel", "nodelete"],
    desc: "Turn anti-delete on/off for this chat",
    category: "owner",
    react: "🛡️",
    use: ".antidelete on/off",
    filename: __filename
},
async(conn, mek, m, { args, isOwner, reply, from }) => {
    if (!isOwner) return reply("*❌ This command is for owner only*");

    const mode = args[0]?.toLowerCase();

    if (mode === 'on' || mode === 'enable') {
        await setAntideleteStatus(from, true);
        return reply("*✅ Anti-delete activated*\n_Deleted messages will be recovered in this chat_");
    } else if (mode === 'off' || mode === 'disable') {
        await setAntideleteStatus(from, false);
        return reply("*❌ Anti-delete deactivated*");
    } else {
        const current = await getAntideleteStatus(from);
        return reply(
            `*🛡️ ANTI-DELETE*\n\n` +
            `*Usage:*\n.antidelete on\n.antidelete off\n\n` +
            `*Current Status:* ${current? "ON ✅" : "OFF ❌"}\n\n` +
            `*⚡ TEDDY-XMD*`
        );
    }
});