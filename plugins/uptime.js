const config = require('../config');
const { cmd } = require('../inconnuboy');
const os = require('os');

cmd({
  pattern: "uptime",
  alias: ["runtime", "status", "host"],
  desc: "Check bot status and hosting platform",
  category: "main",
  react: "⚡",
  filename: __filename
}, 
async (conn, mek, m, { from, reply }) => {

  try {
    // Uptime Calculation
    const getUptime = () => {
      let sec = process.uptime();
      let h = Math.floor(sec / 3600);
      let mn = Math.floor((sec % 3600) / 60);
      let s = Math.floor(sec % 60);
      return `${h}h ${mn}m ${s}s`;
    };

    // Real Host Detection Logic
    let platform = "LINUX VPS / PANEL";
    if (process.env.HEROKU_APP_NAME) platform = "HEROKU CLOUD";
    else if (process.env.KOYEB_PROJECT_ID) platform = "KOYEB PAAS";
    else if (process.env.RENDER_SERVICE_ID) platform = "RENDER CLOUD";
    else if (process.env.REPL_ID) platform = "REPLIT";
    else if (process.env.RAILWAY_PROJECT_ID) platform = "RAILWAY";
    
    const ram = (process.memoryUsage().heapUsed / 1024).toFixed(2);
    const totalRam = (os.totalmem() / 1024).toFixed(2);

    let status = `╭━━━〔 *TEDDY-XMD STATUS* 〕━━━┈⊷
┃
┃ ⚡ *STATUS:* ONLINE
┃ ⏱️ *UPTIME:* ${getUptime()}
┃ 🖥️ *HOST:* ${platform}
┃ 💾 *RAM:* ${ram}MB / ${totalRam}GB
┃ 🔧 *PLATFORM:* ${os.platform().toUpperCase()}
┃ 📦 *NODE:* ${process.version}
┃
╰━━━━━━━━━━━━━━━━━━━━┈⊷

*POWERED BY TEDDY-XMD*`;

    await conn.sendMessage(from, {
      image: { url: config.IMAGE_PATH || 'https://files.catbox.moe/13nyhx.jpg' },
      caption: status,
      contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: '120363421104812135@newsletter',
          newsletterName: 'TEDDY-XMD OFFICIAL',
          serverMessageId: 143
        }
      }
    }, { quoted: m });

  } catch (e) {
    console.log("UPTIME CMD ERROR:", e);
    reply(`❌ Error: ${e.message}`);
  }

});