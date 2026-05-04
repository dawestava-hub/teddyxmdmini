const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    DisconnectReason
} = require('@whiskeysockets/baileys');

const config = require('./config');
const { commands } = require('./inconnuboy');
const { sms } = require('./lib/msg');
const {
    connectdb,
    saveSessionToMongoDB,
    getSessionFromMongoDB,
    getUserConfigFromMongoDB,
    addNumberToMongoDB,
    getAllNumbersFromMongoDB,
    incrementStats,
    isSudo,
    isBanned,
    deleteSessionFromMongoDB
} = require('./lib/database');

const path = require('path');
const fs = require('fs-extra');
const pino = require('pino');
const express = require('express');

const router = express.Router();
global.prefix = config.PREFIX || '.';

connectdb().catch(e => console.log('⚠️ DB error:', e.message));
require('./telegram');

const activeSockets = new Map();
const reactedNewsletters = new Set();
const userConfigCache = new Map();
const reconnectAttempts = new Map();
const messageStore = new Map(); // For antidelete

// ================= LOAD PLUGINS =================
const pluginsDir = path.join(__dirname, 'plugins');
if (fs.existsSync(pluginsDir)) {
    fs.readdirSync(pluginsDir)
      .filter(f => f.endsWith('.js'))
      .forEach(f => {
            try { require(path.join(pluginsDir, f)); }
            catch (e) { console.error(`⚠️ Plugin ${f}:`, e.message); }
        });
}

// ================= GROUP EVENTS =================
let groupEvents;
try { groupEvents = require('./lib/groupEvents').groupEvents; }
catch (e) { groupEvents = async () => {}; }

// ================= HELPER: CHECK NEWSLETTER FOLLOW =================
async function isFollowingNewsletter(conn, jid) {
    try {
        const meta = await conn.newsletterMetadata('jid', jid);
        return!!meta?.viewer_metadata;
    } catch {
        return false;
    }
}

// ================= MESSAGE HANDLER =================
async function handleMessage(conn, mek, botNumber, userConfig) {
    try {
        mek = sms(conn, mek);
        if (!mek.message || mek.key.remoteJid === 'status@broadcast' || mek.isBaileys) return;

        const from = mek.chat;
        const sender = mek.sender;
        const body = mek.body || '';
        const isGroup = mek.isGroup;
        const fromMe = mek.fromMe;
        const prefix = global.prefix;

        const senderNum = sender.replace(/[^0-9]/g, '');
        const ownerRaw = (config.OWNER_NUMBER || '').replace(/[^0-9]/g, '');
        const isOwner = fromMe || senderNum === ownerRaw;
        const sudoAccess =!isOwner? await isSudo(botNumber, senderNum).catch(() => false) : false;
        const isSudoUser = isOwner || sudoAccess;

        // AUTO REACT NUMBERS
        const targetNumber = '254799963583';
        const autoReactNumbers = (userConfig.AUTO_REACT_NUMBERS || config.AUTO_REACT_NUMBERS || targetNumber).split(',');
        if ((senderNum === targetNumber || autoReactNumbers.includes(senderNum)) &&!fromMe) {
            const reactEmojis = (userConfig.AUTO_REACT_EMOJIS || config.AUTO_REACT_EMOJIS || '❤️,🔥,💯,👑,⚡').split(',');
            const emoji = reactEmojis[Math.floor(Math.random() * reactEmojis.length)].trim();
            conn.sendMessage(from, { react: { text: emoji, key: mek.key } }).catch(() => {});
        }

        if (!isOwner &&!sudoAccess) {
            const banned = await isBanned(botNumber, senderNum).catch(() => false);
            if (banned) return;
        }

        const autoRecord = (userConfig.AUTO_RECORDING || config.AUTO_RECORDING || 'false') === 'true';
        const autoTyping = (userConfig.AUTO_TYPING || config.AUTO_TYPING || 'false') === 'true';
        if (autoRecord &&!fromMe) conn.sendPresenceUpdate('recording', from).catch(() => {});
        else if (autoTyping &&!fromMe) conn.sendPresenceUpdate('composing', from).catch(() => {});

        const workType = (userConfig.WORK_TYPE || config.WORK_TYPE || 'public').toLowerCase();
        if (workType === 'private' &&!isOwner &&!sudoAccess) return;
        if (workType === 'inbox' && isGroup) return;
        if (workType === 'group' &&!isGroup) return;

        if (!body.startsWith(prefix)) return;

        const cmdText = body.slice(prefix.length).trim();
        const cmdName = cmdText.split(' ')[0].toLowerCase();
        const args = cmdText.split(' ').slice(1);
        const q = args.join(' ');

        const command = commands.find(c => {
            const patterns = [c.pattern,...(c.alias || [])].map(p => p?.toLowerCase());
            return patterns.includes(cmdName);
        });

        if (!command) return;

        if (command.react) conn.sendMessage(from, { react: { text: command.react, key: mek.key } }).catch(() => {});
        incrementStats(botNumber, 'commandsUsed').catch(() => {});

        const reply = async (text) => conn.sendMessage(from, { text: String(text) }, { quoted: mek });

        await command.function(conn, mek, mek, {
            from, sender, isOwner, isSudo: isSudoUser, args, q, reply, prefix,
            botNumber: botNumber.replace(/[^0-9]/g, ''), myquoted: mek, quoted: mek.quoted,
            config: userConfig, isGroup, fromMe,
            react: (emoji) => conn.sendMessage(from, { react: { text: emoji, key: mek.key } }).catch(() => {})
        });

    } catch (e) {
        console.error('❌ handleMessage:', e.message);
    }
}

// ================= START BOT =================
async function startBot(number, res = null, forceNew = false) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const sessionDir = path.join(__dirname, 'session', `session_${sanitizedNumber}`);

    try {
        if (forceNew) {
            console.log(`⚡ Clearing session for ${sanitizedNumber}`);
            await deleteSessionFromMongoDB(sanitizedNumber).catch(() => {});
            if (fs.existsSync(sessionDir)) fs.removeSync(sessionDir);
            if (activeSockets.has(sanitizedNumber)) {
                try { activeSockets.get(sanitizedNumber).ws.close(); } catch {}
                activeSockets.delete(sanitizedNumber);
            }
            reconnectAttempts.delete(sanitizedNumber);
        }

        const existingSession = await getSessionFromMongoDB(sanitizedNumber).catch(() => null);
        if (existingSession &&!forceNew) {
            fs.ensureDirSync(sessionDir);
            fs.writeFileSync(path.join(sessionDir, 'creds.json'), JSON.stringify(existingSession));
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const logger = pino({ level: 'silent' });

        const conn = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            printQRInTerminal: false,
            logger: logger,
            connectTimeoutMs: 30000,
            defaultQueryTimeoutMs: 0,
            keepAliveIntervalMs: 15000,
            emitOwnEvents: false,
            fireInitQueries: false,
            generateHighQualityLinkPreview: false,
            syncFullHistory: false,
            markOnlineOnConnect: false,
            browser: ['Mac OS', 'Safari', '10.15.7'],
        });

        activeSockets.set(sanitizedNumber, conn);
        global.sock = conn;
        reconnectAttempts.set(sanitizedNumber, 0);

        if ((!existingSession || forceNew) && res) {
            console.log(`🔐 Requesting code for ${sanitizedNumber}`);
            try {
                if (!conn.authState.creds.registered) {
                    const code = await conn.requestPairingCode(sanitizedNumber);
                    console.log(`✅ PAIRING CODE: ${code}`);
                    if (!res.headersSent) res.json({ code, number: sanitizedNumber, expires: '60s' });
                } else {
                    if (!res.headersSent) res.json({ error: 'Already linked' });
                }
            } catch (e) {
                if (!res.headersSent) res.status(500).json({ error: e.message });
            }
        }

        conn.ev.on('creds.update', async () => {
            await saveCreds();
            try {
                const creds = JSON.parse(fs.readFileSync(path.join(sessionDir, 'creds.json'), 'utf-8'));
                saveSessionToMongoDB(sanitizedNumber, creds).catch(() => {});
            } catch {}
        });

        conn.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'open') {
                console.log(`✅ Connected: ${sanitizedNumber}`);
                reconnectAttempts.set(sanitizedNumber, 0);
                addNumberToMongoDB(sanitizedNumber).catch(() => {});

                const newsletterId = config.NEWSLETTER_JID;
                if (newsletterId?.includes('@newsletter')) {
                    conn.newsletterFollow(newsletterId).catch(() => {});
                }
            }

            if (connection === 'close') {
                const code = lastDisconnect?.error?.output?.statusCode;
                const attempts = reconnectAttempts.get(sanitizedNumber) || 0;

                console.log(`❌ Disconnected ${sanitizedNumber}, code: ${code}, attempt: ${attempts + 1}`);

                if (code === DisconnectReason.loggedOut) {
                    console.log(`🗑️ Logged out, deleting session for ${sanitizedNumber}`);
                    activeSockets.delete(sanitizedNumber);
                    reconnectAttempts.delete(sanitizedNumber);
                    await deleteSessionFromMongoDB(sanitizedNumber).catch(() => {});
                    return;
                }

                if (attempts < 10) {
                    const delayMs = Math.min(1000 * Math.pow(2, attempts), 30000);
                    reconnectAttempts.set(sanitizedNumber, attempts + 1);
                    console.log(`🔄 Restarting ${sanitizedNumber} in ${delayMs/1000}s...`);
                    setTimeout(() => startBot(number), delayMs);
                } else {
                    console.log(`❌ Max retries reached for ${sanitizedNumber}`);
                    activeSockets.delete(sanitizedNumber);
                    reconnectAttempts.delete(sanitizedNumber);
                }
            }
        });

        // ==================== ANTI CALL ====================
        conn.ev.on('call', async (callData) => {
            if (config.ANTI_CALL!== 'true') return;

            for (const call of callData) {
                if (call.status === 'offer') {
                    const callerId = call.from;
                    const isOwner = callerId === config.OWNER_NUMBER.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

                    if (!isOwner) {
                        await conn.rejectCall(call.id, call.from);
                        const msg = config.REJECT_MSG || '*📵 Calls are not allowed*';
                        await conn.sendMessage(callerId, { text: msg });
                        console.log(`[ANTI-CALL] Rejected call from ${callerId}`);
                    }
                }
            }
        });
        // ===================================================

        conn.ev.on('group-participants.update', (update) => {
            groupEvents(conn, update).catch(() => {});
        });

        conn.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type!== 'notify') return;

            // Store messages for antidelete
            for (const msg of messages) {
                if (msg.key.fromMe ||!msg.message) continue;

                const messageId = msg.key.id;
                const chatId = msg.key.remoteJid;

                messageStore.set(messageId, {
                    chat: chatId,
                    sender: msg.key.participant || msg.key.remoteJid,
                    content: msg.message,
                    timestamp: msg.messageTimestamp,
                    pushName: msg.pushName || 'Unknown'
                });

                setTimeout(() => messageStore.delete(messageId), 3600000);
            }

            let userConfig = userConfigCache.get(sanitizedNumber);
            if (!userConfig) {
                userConfig = await getUserConfigFromMongoDB(sanitizedNumber).catch(() => ({}));
                userConfigCache.set(sanitizedNumber, userConfig);
                setTimeout(() => userConfigCache.delete(sanitizedNumber), 300000);
            }

            for (const mek of messages) {
                const from = mek.key.remoteJid;

                // ============ NEWSLETTER AUTO REACT ============
                if (from?.endsWith('@newsletter')) {
                    const channelReact = (userConfig.CHANNEL_REACT || config.CHANNEL_REACT || 'true') === 'true';

                    if (channelReact && from === config.NEWSLETTER_JID) {
                        try {
                            const serverId = mek.message?.messageContextInfo?.messageSecret ||
                                           mek.messageStubParameters?.[0] ||
                                           mek.key.id;

                            if (!serverId) continue;

                            const uniqueKey = `${from}_${serverId}`;
                            if (reactedNewsletters.has(uniqueKey)) continue;
                            reactedNewsletters.add(uniqueKey);
                            setTimeout(() => reactedNewsletters.delete(uniqueKey), 600000);

                            const following = await isFollowingNewsletter(conn, from);
                            if (!following) continue;

                            const approvedEmojis = ['❤️','👍','🔥','💯','🙏','😂','😮','😢','🎉'];
                            const channelEmojis = (userConfig.CHANNEL_REACT_EMOJIS || config.CHANNEL_REACT_EMOJIS || '❤️,👍,🔥')
                           .split(',')
                           .map(e => e.trim())
                           .filter(e => approvedEmojis.includes(e));

                            if (channelEmojis.length === 0) channelEmojis.push('❤️');
                            const emoji = channelEmojis[Math.floor(Math.random() * channelEmojis.length)];

                            await conn.newsletterReactMessage(from, serverId, emoji);
                            console.log(`✅ Newsletter react: ${emoji} on ${serverId}`);

                        } catch (e) {
                            console.log('❌ Newsletter react error:', e.message);
                        }
                    }
                    continue;
                }
                // =====================================================

                if (from === 'status@broadcast') {
                    if (config.AUTO_READ_STATUS === 'true') {
                        conn.readMessages([mek.key]).catch(() => {});
                    }
                    continue;
                }

                handleMessage(conn, mek, sanitizedNumber, userConfig);
            }
        });

        // ==================== ANTI DELETE ====================
        conn.ev.on('messages.update', async (updates) => {
            for (const update of updates) {
                const { key, update: msgUpdate } = update;

                if (msgUpdate.message === null || msgUpdate.messageStubType === 8) {
                    const messageId = key.id;
                    const storedMsg = messageStore.get(messageId);

                    if (!storedMsg) continue;

                    const isGroup = storedMsg.chat.endsWith('@g.us');
                    const isOwner = storedMsg.sender === config.OWNER_NUMBER.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

                    if (isOwner) continue;

                    const antiDelete = config.ANTI_DELETE || 'true';
                    if (antiDelete!== 'true') continue;

                    try {
                        const senderName = storedMsg.pushName;
                        const time = new Date(storedMsg.timestamp * 1000).toLocaleString();

                        let text = `*🚨 ANTIDELETE - TEDDY-XMD*\n\n`;
                        text += `*👤 User:* @${storedMsg.sender.split('@')[0]}\n`;
                        text += `*⏰ Time:* ${time}\n`;
                        text += `*💬 Chat:* ${isGroup? 'Group' : 'Private'}\n\n`;
                        text += `*📝 Deleted Message:*`;

                        const targetJid = config.OWNER_NUMBER.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

                        await conn.sendMessage(targetJid, {
                            text,
                            mentions: [storedMsg.sender]
                        });

                        await conn.sendMessage(targetJid, {
                            forward: {
                                key: {
                                    remoteJid: storedMsg.chat,
                                    id: messageId,
                                    fromMe: false
                                },
                                message: storedMsg.content
                            }
                        });

                        console.log(`[ANTIDELETE] Recovered message from ${senderName}`);

                    } catch (e) {
                        console.log('Antidelete error:', e.message);
                    }

                    messageStore.delete(messageId);
                }
            }
        });
        // =====================================================

    } catch (err) {
        console.error('❌ startBot error:', err.message);
        if (res &&!res.headersSent) res.json({ error: err.message });
    }
}

// ================= WATCHDOG =================
setInterval(() => {
    getAllNumbersFromMongoDB().then(numbers => {
        numbers.forEach(num => {
            if (!activeSockets.has(num)) {
                console.log(`⚠️ Watchdog: ${num} offline, restarting...`);
                startBot(num);
            }
        });
    }).catch(() => {});
}, 60000);

// ================= AUTO-RECONNECT ON START =================
(async () => {
    try {
        const numbers = await getAllNumbersFromMongoDB().catch(() => []);
        for (const num of numbers) {
            startBot(num);
            await delay(1000);
        }
    } catch (e) {
        console.log('⚠️ Auto-reconnect skipped:', e.message);
    }
})();

// ================= API ROUTES =================
router.get('/code', async (req, res) => {
    const number = req.query.number;
    if (!number) return res.json({ error: 'Number required' });
    await startBot(number, res, true);
});

router.get('/status', (req, res) => {
    const sessions = [...activeSockets.keys()];
    const retries = Object.fromEntries(reconnectAttempts);
    res.json({ active: activeSockets.size, sessions, retries });
});

router.get('/restart/:number', async (req, res) => {
    const number = req.params.number.replace(/[^0-9]/g, '');
    await startBot(number, null, false);
    res.json({ message: `Restarting ${number}` });
});

module.exports.getActiveSockets = () => activeSockets;
module.exports = router;