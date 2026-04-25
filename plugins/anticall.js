const { cmd } = require('../inconnuboy');
const config = require('../config');

cmd({
    pattern: "anticall",
    react: "📵",
    alias: ["anti-call", "rejectcall"],
    desc: "Enable or disable auto call rejection",
    category: "owner",
    use: ".anticall on/off",
    filename: __filename
},
async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("*❌ This command is for owner only*");

    const status = args[0]?.toLowerCase();

    if (!status ||!["on", "off"].includes(status)) {
        return reply(
            `*📵 ANTI-CALL*\n\n` +
            `*Usage:*\n.anticall on\n.anticall off\n\n` +
            `*Current Status:* ${config.ANTI_CALL === 'true' || config.ANTI_CALL === true? "ON ✅" : "OFF ❌"}\n\n` +
            `*⚡ TEDDY-XMD*`
        );
    }

    if (status === "on") {
        config.ANTI_CALL = "true";
        return reply("*✅ Anti-call activated*\n_Incoming calls will be auto-rejected_");
    } else if (status === "off") {
        config.ANTI_CALL = "false";
        return reply("*❌ Anti-call deactivated*");
    }
});