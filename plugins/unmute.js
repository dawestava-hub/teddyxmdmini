const config = require('../config')
const { cmd } = require('../inconnuboy')

cmd({
pattern: "unmute",
alias: ["groupunmute"],
react: "🔊",
desc: "Unmute the group (All members can send messages).",
category: "isBotAdmins",
filename: __filename
},
async (conn, mek, m, { from, isGroup, isBotAdmins, reply }) => {
try {
if (!isGroup) return reply("❌ This command can only be used in groups.");

// Get sender ID with LID support
const senderId = mek.key.participant || mek.key.remoteJid || mek.key.fromMe ? conn.user?.id : null;
if (!senderId) return reply("❌ Could not identify sender.");

// Check admin status using the integrated function
const { isBotAdmin, isSenderAdmin } = await checkAdminStatus(conn, from, senderId);

if (!isSenderAdmin) return reply("❌ Only group admins can use this command.");
if (!isBotAdmin) return reply("❌ I need to be an admin to unmute the group.");

await conn.groupSettingUpdate(from, "not_announcement");
reply("✅ Group has been unmuted. All members can send messages.");

} catch (e) {
console.error("Error unmuting group:", e);
reply("❌ Failed to unmute the group. Please try again.");
}
});
