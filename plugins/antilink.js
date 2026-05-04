const config = require('../config');

module.exports = {
  name: "antilink",
  alias: ["nolink", "antigrplink"],
  desc: "Auto delete links in group. Admin only toggle.",
  category: "group",
  react: "🚫",
  start: async (conn, mek, m, { isGroup, isAdmin, isBotAdmin, reply, text }) => {

    if (!isGroup) return reply("❌ Group only command");
    if (!isAdmin) return reply("❌ Admin only");

    // Toggle command
    if (text === 'on' || text === 'off') {
      global.antilink = global.antilink || {};
      global.antilink[m.from] = text === 'on';
      return reply(`✅ Antilink ${text === 'on'? 'enabled' : 'disabled'} for this group`);
    }

    return reply(`*Antilink Status:* ${global.antilink?.[m.from]? 'ON' : 'OFF'}\n\n*Usage:*\n.antilink on - Enable\n.antilink off - Disable`);
  },

  // This runs on every message
  all: async (conn, mek, m, { isGroup, isBotAdmin, isAdmin }) => {
    if (!isGroup ||!isBotAdmin) return;

    // Check if enabled for this group
    if (!global.antilink?.[m.from]) return;

    // Skip admins and owner
    if (isAdmin) return;
    if (m.fromMe) return;

    const body = m.body ||
                 m.message?.conversation ||
                 m.message?.extendedTextMessage?.text ||
                 m.message?.imageMessage?.caption ||
                 m.message?.videoMessage?.caption || '';

    // WhatsApp links, Telegram links, URLs
    const linkRegex = /(chat\.whatsapp\.com|t\.me|telegram\.me|wa\.me|https?:\/\/|www\.|bit\.ly|tinyurl|discord\.gg)/i;

    if (linkRegex.test(body)) {
      try {
        // Delete the message
        await conn.sendMessage(m.from, { delete: mek.key });

        // Warn user
        await conn.sendMessage(m.from, {
          text: `⚠️ @${m.sender.split('@')[0]} Links are not allowed here!`,
          mentions: [m.sender]
        }, { quoted: mek });

        // Optional: Kick after 3 warnings - uncomment to enable
        // global.linkWarnings = global.linkWarnings || {};
        // global.linkWarnings[m.sender] = (global.linkWarnings[m.sender] || 0) + 1;
        // if (global.linkWarnings[m.sender] >= 3) {
        // await conn.groupParticipantsUpdate(m.from, [m.sender], 'remove');
        // delete global.linkWarnings[m.sender];
        // }

        console.log(`[ANTILINK] Deleted link from ${m.pushName} in ${m.from}`);

      } catch (e) {
        console.log('Antilink error:', e.message);
      }
    }
  }
}
