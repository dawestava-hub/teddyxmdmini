const fs = require('fs');
const path = require('path');

module.exports = {
  name: "setprefix",
  alias: ["prefix", "setpfx"],
  desc: "Change bot command prefix. Owner only.",
  category: "owner",
  react: "⚙️",
  start: async (conn, mek, m, { isOwner, text, reply }) => {

    if (!isOwner) return reply("❌ Owner only command!");

    if (!text) {
      return reply(
        `*Current Prefix:* \`${global.prefix || '.'}\`\n\n` +
        `*Usage:* ${global.prefix || '.'}setprefix <symbol>\n` +
        `*Example:* ${global.prefix || '.'}setprefix!\n\n` +
        `*Note:* Single character only. No letters/numbers.`
      );
    }

    if (text.length!== 1 || /[a-zA-Z0-9]/.test(text)) {
      return reply("❌ Prefix must be 1 special character only.\n*Examples:*.! # $ /");
    }

    const oldPrefix = global.prefix || '.';
    global.prefix = text;

    try {
      const configPath = path.join(__dirname, '../config.js');
      let configFile = fs.readFileSync(configPath, 'utf8');

      configFile = configFile.replace(
        /PREFIX:\s*process\.env\.PREFIX\s*\|\|\s*['"`](.*?)['"`]/,
        `PREFIX: process.env.PREFIX || '${text}'`
      );

      fs.writeFileSync(configPath, configFile);

      await reply(
        `✅ *Prefix Updated*\n\n` +
        `*Old:* \`${oldPrefix}\`\n` +
        `*New:* \`${text}\`\n\n` +
        `All commands now use \`${text}\`\n` +
        `*Example:* ${text}menu\n\n` +
        `⚠️ Restart bot to apply to all plugins`
      );

    } catch (e) {
      await reply(
        `⚠️ *Prefix changed for this session*\n\n` +
        `*New:* \`${text}\`\n\n` +
        `❌ Could not save to config.js: ${e.message}\n` +
        `Prefix will reset on restart.`
      );
    }
  }
}
