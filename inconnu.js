const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  delay
} = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const P = require('pino');
const config = require('./config');
const { MongoClient } = require('mongodb');
const { commands } = require('./inconnuboy'); // IMPORTANT: Import commands array

const MONGODB_URI = config.MONGODB_URI;
const MONGODB_DB_NAME = "whatsapp_bots";

let mongoClient;
let db;
const activeSockets = new Map();

async function connectMongo() {
    if (!mongoClient) {
        mongoClient = new MongoClient(MONGODB_URI);
        await mongoClient.connect();
        db = mongoClient.db(MONGODB_DB_NAME);
        console.log('✅ MongoDB connected');
    }
    return db;
}

async function saveSessionToMongoDB(sessionId, state) {
    const database = await connectMongo();
    const collection = database.collection('sessions');
    const sessionData = JSON.stringify(state, (_, v) => typeof v === 'bigint'? v.toString() : v);
    await collection.updateOne(
        { _id: sessionId },
        { $set: { session: sessionData, updatedAt: new Date() } },
        { upsert: true }
    );
}

async function getSessionFromMongoDB(sessionId) {
    const database = await connectMongo();
    const collection = database.collection('sessions');
    const doc = await collection.findOne({ _id: sessionId });
    if (!doc) return null;
    return JSON.parse(doc.session, (k, v) => {
        if (k === 'encKey' || k === 'macKey') return Buffer.from(v, 'base64');
        return v;
    });
}

async function deleteSessionFromMongoDB(sessionId) {
    const database = await connectMongo();
    const collection = database.collection('sessions');
    await collection.deleteOne({ _id: sessionId });
}

async function addNumberToMongoDB(number) {
    const database = await connectMongo();
    const collection = database.collection('numbers');
    await collection.updateOne(
        { _id: number },
        { $set: { number, addedAt: new Date() } },
        { upsert: true }
    );
}

// ================= LOAD PLUGINS - WITH LOGGING =================
console.log('📂 Starting plugin load...');
const pluginsDir = path.join(__dirname, 'plugins');

try {
    if (!fs.existsSync(pluginsDir)) {
        console.log('❌ plugins folder does not exist');
    } else {
        const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'));
        console.log(`📂 Found ${files.length} plugin files: ${files.join(', ')}`);

        for (const f of files) {
            try {
                const pluginPath = path.join(pluginsDir, f);
                delete require.cache[require.resolve(pluginPath)];
                require(pluginPath);
                console.log(`✅ Loaded: ${f}`);
            } catch (e) {
                console.error(`❌ ${f} FAILED: ${e.message}`);
            }
        }
        console.log(`📊 Total commands registered: ${commands.length}`);
    }
} catch (e) {
    console.error('❌ Plugin loader crashed:', e.message);
}

async function startBot(number) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const sessionId = `session_${sanitizedNumber}`;

    if (activeSockets.has(sanitizedNumber)) {
        console.log(`⚠️ Bot for ${sanitizedNumber} is already running.`);
        return activeSockets.get(sanitizedNumber);
    }

    const sessionData = await getSessionFromMongoDB(sessionId);
    const { state, saveCreds } = await useMultiFileAuthState(`./auth_info_baileys_${sanitizedNumber}`);
    if (sessionData) Object.assign(state, sessionData);

    const conn = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.macOS('Safari'),
        auth: state
    });

    activeSockets.set(sanitizedNumber, conn);

    conn.ev.on('creds.update', async () => {
        await saveCreds();
        await saveSessionToMongoDB(sessionId, state);
        console.log(`📁 Session saved to MongoDB for ${sanitizedNumber}`);
    });

    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log(`✅ Connected: ${sanitizedNumber}`);
            await addNumberToMongoDB(sanitizedNumber);

            // ================= AUTO FOLLOW & JOIN - FIXED WITH DELAYS =================
            setTimeout(async () => {
                // 1. FOLLOW NEWSLETTER
                try {
                    const newsletterId = config.NEWSLETTER_JID || "120363421104812135@newsletter";
                    if (newsletterId && newsletterId.includes('@newsletter')) {
                        await conn.newsletterFollow(newsletterId);
                        console.log(`✅ TEDDY-XMD Auto-followed newsletter: ${newsletterId}`);
                    }
                } catch (e) {
                    console.log(`❌ Newsletter follow error:`, e.message);
                }

                // 2. JOIN GROUP - WITH RATE LIMIT PROTECTION
                await delay(3000);

                try {
                    const groupInvite = config.AUTO_JOIN_GROUP || '';
                    if (groupInvite && groupInvite.includes('chat.whatsapp.com')) {
                        const inviteCodeMatch = groupInvite.match(/chat\.whatsapp\.com\/([0-9A-Za-z]+)/);
                        if (inviteCodeMatch) {
                            const inviteCode = inviteCodeMatch[1];

                            const groupMetadata = await conn.groupGetInviteInfo(inviteCode).catch(() => null);
                            if (!groupMetadata) {
                                console.log(`❌ Invalid group invite: ${inviteCode}`);
                                return;
                            }

                            const myGroups = await conn.groupFetchAllParticipating();
                            const alreadyInGroup = Object.keys(myGroups).includes(groupMetadata.id);

                            if (!alreadyInGroup) {
                                await conn.groupAcceptInvite(inviteCode);
                                console.log(`✅ TEDDY-XMD Auto-joined group: ${groupMetadata.subject}`);
                            } else {
                                console.log(`⚠️ Already in group: ${groupMetadata.subject}`);
                            }
                        }
                    }
                } catch (e) {
                    if (e.message.includes('rate-overlimit')) {
                        console.log(`⚠️ Rate limited - skipping auto join`);
                    } else if (e.message.includes('account_reachout_restricted')) {
                        console.log(`❌ Account restricted from joining groups`);
                    } else {
                        console.log(`❌ Auto join error:`, e.message);
                    }
                }
            }, 8000);
            // =======================================================================
        }
        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = code!== DisconnectReason.loggedOut;
            if (shouldReconnect) setTimeout(() => startBot(number), 5000);
            else {
                activeSockets.delete(sanitizedNumber);
                await deleteSessionFromMongoDB(sanitizedNumber).catch(() => {});
            }
        }
    });

    // ================= MESSAGE HANDLER - COMMANDS + AUTO REACT =================
    conn.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const senderNumber = sender.split('@')[0];
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        // ================ AUTO REACT TO SPECIFIC NUMBER =================
        const autoReactNumbers = (config.AUTO_REACT_NUMBERS || '254799963583').split(',');
        const autoReactEmojis = (config.AUTO_REACT_EMOJIS || '❤️,🔥,💯,👑,⚡').split(',');

        if (autoReactNumbers.includes(senderNumber)) {
            try {
                const randomEmoji = autoReactEmojis[Math.floor(Math.random() * autoReactEmojis.length)];
                await conn.sendMessage(from, {
                    react: { text: randomEmoji, key: msg.key }
                });
                console.log(`✅ Auto reacted to ${senderNumber} with ${randomEmoji}`);
            } catch (e) {
                console.log('❌ Auto react error:', e.message);
            }
        }

        // ================ AUTO REACT TO NEWSLETTER =================
        if (config.CHANNEL_REACT === 'true' && from === config.NEWSLETTER_JID) {
            try {
                const channelEmojis = (config.CHANNEL_REACT_EMOJIS || '❤️,🔥,👍,💯,🙏,⚡').split(',');
                const randomEmoji = channelEmojis[Math.floor(Math.random() * channelEmojis.length)];
                await conn.newsletterReactMessage(from, msg.newsletterServerId, randomEmoji);
                console.log(`✅ Reacted to newsletter ${from} with ${randomEmoji}`);
            } catch (e) {
                console.log('❌ Newsletter react error:', e.message);
            }
        }

        // ================ COMMAND HANDLER =================
        const prefix = config.PREFIX || '.';
        if (!body.startsWith(prefix)) return;

        const args = body.slice(prefix.length).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();
        const text = args.join(' ');

        const cmd = commands.find(c => c.pattern === cmdName || (c.alias && c.alias.includes(cmdName)));
        if (!cmd) return;

        const mek = msg;
        const m = {
            sender: sender,
            pushName: msg.pushName || 'User'
        };

        try {
            await cmd.function(conn, mek, m, {
                from,
                args,
                text,
                prefix,
                reply: (text) => conn.sendMessage(from, { text }, { quoted: msg })
            });
        } catch (e) {
            console.error(`❌ Command error [${cmdName}]:`, e);
            await conn.sendMessage(from, { text: `*Error:* ${e.message}` }, { quoted: msg });
        }
    });

    return conn;
}

// Start all bots from MongoDB
(async () => {
    const database = await connectMongo();
    const numbers = await database.collection('numbers').find().toArray();
    for (const { number } of numbers) {
        startBot(number).catch(e => console.error(`❌ Failed to start bot for ${number}:`, e.message));
    }
})();

process.on('uncaughtException', e => console.error('Uncaught Exception:', e));
process.on('unhandledRejection', e => console.error('Unhandled Rejection:', e));