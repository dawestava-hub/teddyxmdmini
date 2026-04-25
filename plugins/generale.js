const { cmd, commands } = require('../inconnuboy');
const config = require('../config');
const os = require('os');

// =================================================================
// ⚡ PING / UPTIME COMMAND
// =================================================================
cmd({
    pattern: "uptime",
    alias: ["speed", "ping", "runtime"],
    desc: "Check bot latency and system resources",
    category: "general",
    react: "⚡"
},
async(conn, mek, m, { from, reply, myquoted }) => {
    try {
        const start = Date.now();
        
        // 1. Testing message
        const msg = await conn.sendMessage(from, { text: '*Testing speed...*' }, { quoted: myquoted });
        
        const end = Date.now();
        const latency = end - start;
        
        // 2. RAM calculation
        const totalMem = (os.totalmem() / 1024).toFixed(0);
        const freeMem = (os.freemem() / 1024 / 1024).toFixed(0);
        const usedMem = (totalMem - freeMem).toFixed(0);

        // 3. Bot uptime
        const uptimeSec = process.uptime();
        let h = Math.floor(uptimeSec / 3600);
        let min = Math.floor((uptimeSec % 3600) / 60);
        let s = Math.floor(uptimeSec % 60);
        const uptime = `${h}h ${min}m ${s}s`;

        // 4. Final styled message
        const pingMsg = `
*╭───〘 ⚡ TEDDY-XMD STATUS 〙───*
*│*
*│ 🚀 Speed  : ${latency}ms*
*│ ⏱️ Uptime : ${uptime}*
*│ 💾 RAM    : ${usedMem}MB / ${totalMem}MB*
*│*
*╰────────────────*
`;

        // 5. Edit message for effect
        await conn.sendMessage(from, { text: pingMsg, edit: msg.key });

    } catch (e) {
        reply("*❌ Error:* " + e.message);
    }
});

// =================================================================
// 👑 OWNER COMMAND - Contact Card
// =================================================================
cmd({
    pattern: "owner",
    alias: ["creator", "dev", "developer"],
    desc: "Contact the bot owner",
    category: "general",
    react: "👑"
},
async(conn, mek, m, { from, myquoted }) => {
    const ownerNumber = config.OWNER_NUMBER || "254799963583";
    
    // Create vCard contact
    const vcard = 'BEGIN:VCARD\n' +
                  'VERSION:3.0\n' +
                  'FN:Teddy (Owner)\n' +
                  'ORG:Teddy-XMD;\n' +
                  `TEL;type=CELL;type=VOICE;waid=${ownerNumber}:${ownerNumber}\n` +
                  'END:VCARD';

    await conn.sendMessage(from, {
        contacts: {
            displayName: 'Teddy - TEDDY-XMD Owner',
            contacts: [{ vcard }]
        }
    }, { quoted: myquoted });

    await reply(
        `*👑 TEDDY-XMD OWNER*\n\n` +
        `*📱 Contact:* wa.me/${ownerNumber}\n` +
        `*💬 Message for support, bugs, or features*\n\n` +
        `*⚡ TEDDY-XMD*`
    );
});