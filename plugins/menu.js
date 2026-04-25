const { cmd } = require('../inconnuboy');
const config = require('../config');
const os = require('os');
const process = require('process');

cmd({
  pattern: "menu",
  alias: ["help", "m", "list", "commands"],
  react: "⚡",
  category: "menu",
  desc: "Show full bot command list",
  filename: __filename
}, async (conn, mek, m, { from, reply }) => {
  try {
    const sender = m.sender || 'unknown@s.whatsapp.net';
    const prefix = config.PREFIX || ".";
    const mode = config.WORK_TYPE?.toUpperCase() || "PUBLIC";

    // Uptime
    const uptime = () => {
      let sec = process.uptime();
      let h = Math.floor(sec / 3600);
      let mns = Math.floor((sec % 3600) / 60);
      let s = Math.floor(sec % 60);
      return `${h}h ${mns}m ${s}s`;
    };

    // Ping
    const start = Date.now();
    await conn.sendPresenceUpdate('composing', from);
    const ping = Date.now() - start;

    const customMenu = `
*╭───〘 ⚡ TEDDY-XMD 〙───*
*│*
*│ 👤 User : @${sender.split("@")[0]}*
*│ ⚙️ Prefix : ${prefix}*
*│ 🌐 Mode : ${mode}*
*│ ⏱️ Uptime : ${uptime()}*
*│ 📡 Speed : ${ping}ms*
*│*
*╰────────────────*

*╭─〔 👑 OWNER MENU 〕*
*│ • ${prefix}setprefix*
*│ • ${prefix}mode*
*│ • ${prefix}autorecording*
*│ • ${prefix}autotyping*
*│ • ${prefix}autoread*
*│ • ${prefix}autostatusview*
*│ • ${prefix}autobio*
*│ • ${prefix}anticall*
*│ • ${prefix}block*
*│ • ${prefix}unblock*
*│ • ${prefix}welcome*
*│ • ${prefix}goodbye*
*╰────────────────*

*╭─〔 👥 GROUP MENU 〕*
*│ • ${prefix}tagall*
*│ • ${prefix}online*
*│ • ${prefix}kick*
*│ • ${prefix}add*
*│ • ${prefix}promote*
*│ • ${prefix}demote*
*│ • ${prefix}mute*
*│ • ${prefix}unmute*
*╰────────────────*

*╭─〔 ⬇️ DOWNLOAD MENU 〕*
*│ • ${prefix}video*
*│ • ${prefix}tiktok*
*│ • ${prefix}fb*
*│ • ${prefix}play*
*│ • ${prefix}ig*
*╰────────────────*

*╭─〔 🤖 AI MENU 〕*
*│ • ${prefix}gpt*
*│ • ${prefix}imagine*
*│ • ${prefix}gemini*
*╰────────────────*

*╭─〔 ✨ TOOLS MENU 〕*
*│ • ${prefix}ping*
*│ • ${prefix}tempmail*
*│ • ${prefix}trt*
*│ • ${prefix}attp*
*│ • ${prefix}ss*
*│ • ${prefix}tts*
*│ • ${prefix}img*
*╰────────────────*

*📢 Official Channel*
https://whatsapp.com/channel/0029Vb6NveDBPzjPa4vIRt3n

*💬 Support Group*
https://chat.whatsapp.com/CLClgqJIC59GrcI4sRzLu8

*⚡ TEDDY-XMD BOT*
`;

    await conn.sendMessage(from, {
      image: { url: config.IMAGE_PATH || 'https://files.catbox.moe/13nyhx.jpg' },
      caption: customMenu,
      contextInfo: { mentionedJid: [sender] }
    }, { quoted: m });

  } catch (err) {
    console.log("MENU ERROR:", err);
    reply("*❌ Failed to load menu*");
  }
});