module.exports = {
  name: "mute",
  alias: ["silence"],
  desc: "Mute group - only admins can send",
  category: "group",
  react: "🔇",
  start: async (conn, mek, m, { isGroup, isAdmin, isBotAdmin, reply }) => {
    if (!isGroup) return reply("❌ Group only");
    if (!isAdmin) return reply("❌ Admin only");
    if (!isBotAdmin) return reply("❌ Bot needs admin");
    
    await conn.groupSettingUpdate(m.from, 'announcement');
    return reply("✅ Group muted. Only admins can send messages.");
  }
}