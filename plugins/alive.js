const { cmd, commands } = require('../inconnuboy');
const config = require('../config');

// Commande Ping
cmd({
    pattern: "ping",
    desc: "Check bot latency",
    category: "general",
    react: "👑"
},
async(conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        const startTime = Date.now();
        const message = await conn.sendMessage(from, { text: '*TESTING...*' }, { quoted: mek });
        const endTime = Date.now();
        const ping = endTime - startTime;
        await conn.sendMessage(from, { text: `*👑 SPEED :❯ ${ping} MS 👑*` }, { quoted: message });
    } catch (e) {
        console.log(e);
        reply(`Error: ${e.message}`);
    }
});

// Commande Alive
cmd({
    pattern: "alive",
    desc: "Check if bot is alive",
    category: "general",
    react: "👑"
},
async(conn, mek, m, { from, reply }) => {
    try {
        await conn.sendMessage(from, { 
            image: { url: config.IMAGE_PATH },
            caption: `*Hello  🤗❣️* \n *I AM ACTIVE NOW 🥰* \n*Created by Teddy Tech 😊💞*`
        }, { quoted: mek });
    } catch (e) {
        reply("Error: " + e.message);
    }
});
