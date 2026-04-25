const { cmd, commands } = require('../inconnuboy');
const config = require('../config');
const os = require('os');

// =================================================================
// 🏓 COMMANDE PING (Style Speedtest)
// =================================================================
cmd({
    pattern: "Uptime",
    alias: ["speed"],
    desc: "Vérifier la latence et les ressources",
    category: "general",
    react: "👑"
},
async(conn, mek, m, { from, reply, myquoted }) => {
    try {
        const start = Date.now();
        
        // 1. Message d'attente
        const msg = await conn.sendMessage(from, { text: '*T E S T I N G....*' }, { quoted: myquoted });
        
        const end = Date.now();
        const latency = end - start;
        
        // 2. Calcul Mémoire (RAM)
        const totalMem = (os.totalmem() / 1024 / 1024).toFixed(0);
        const freeMem = (os.freemem() / 1024 / 1024).toFixed(0);
        const usedMem = (totalMem - freeMem).toFixed(0);

        // 3. Message Final Stylé
        const pingMsg = `
*👑 BILAL-MD UPTIME 👑* ⚡

* UPTIME :❯  ${latency}*

*👑 RAM :❯ ${usedMem}MB / ${totalMem}MB

`;

        // 4. Édition du message (Effet visuel)
        await conn.sendMessage(from, { text: pingMsg, edit: msg.key });

    } catch (e) {
        reply("Error: " + e.message);
    }
});


// =================================================================
// 👑 COMMANDE OWNER (Carte de visite)
// =================================================================
cmd({
    pattern: "owner",
    desc: "Contacter le créateur",
    category: "general",
    react: "👑"
},
async(conn, mek, m, { from, myquoted }) => {
    const ownerNumber = config.OWNER_NUMBER;
    
    // Création d'une vCard (Fiche contact)
    const vcard = 'BEGIN:VCARD\n' +
                  'VERSION:3.0\n' +
                  'FN:bilal (Owner)\n' +
                  'ORG:dr Corp;\n' +
                  `TEL;type=CELL;type=VOICE;waid=${ownerNumber}:${ownerNumber}\n` +
                  'END:VCARD';

    await conn.sendMessage(from, {
        contacts: {
            displayName: 'bilal king',
            contacts: [{ vcard }]
        }
    }, { quoted: myquoted });
});
