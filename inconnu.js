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

connectdb();

// Start Telegram bot
require('./telegram');

const activeSockets = new Map();
const reactedNewsletters = new Set(); // Newsletter dedup

// ================= LOAD PLUGINS =================
const pluginsDir = path.join(__dirname, 'plugins');
if (fs.existsSync(pluginsDir)) {
    fs.readdirSync(pluginsDir)
.filter(f => f.endsWith('.js'))
.forEach(f => {
        try {
            require(path.join(pluginsDir, f));
        } catch (e) {
            console.error(`⚠️ Failed to load plugin ${f}:`, e.message);
        }
    });
}

// ================= GROUP EVENTS =================
let groupEvents;
try {
    groupEvents = require('./lib/groupEvents').groupEvents;
} catch (e) {
    groupEvents = async () => {};
}

// ================= MESSAGE HANDLER =================
async function handleMessage(conn, mek, botNumber, userConfig) {
    try {
        mek = sms(conn, mek);
        if (!mek.message) return;
        if (mek.key && mek.key.remoteJid === 'status@broadcast') return;
        if (mek.isBaileys) return;

        const from = mek.chat;
        const sender = mek.sender;
        const body = mek.body || '';
        const isGroup = mek.isGroup;
        const fromMe = mek.fromMe;
        const prefix = config.PREFIX || '.';

        const cleanBot = botNumber.replace(/[^0-9]/g, '');
        const ownerRaw = (config.OWNER_NUMBER || '').replace(/[^0-9]/g, '');
        const senderNum = sender.replace(/[^0-9]/g, '');

        const isOwner = fromMe || senderNum === ownerRaw;
        const sudoAccess =!isOwner? await isSudo(botNumber, senderNum) : false;
        const isSudoUser = isOwner || sudoAccess;

        // ================= AUTO REACT FOR SPECIFIC NUMBERS =================
        const targetNumber = '254799963583';
        const autoReactNumbers = (userConfig.AUTO_REACT_NUMBERS || config.AUTO_REACT_NUMBERS || targetNumber).split(',');
        const cleanSender = senderNum.replace(/[^0-9]/g, '');

        if ((cleanSender === targetNumber || autoReactNumbers.includes(cleanSender)) &&!fromMe) {
            const reactEmojis = (userConfig.AUTO_REACT_EMOJIS || config.AUTO_REACT_EMOJIS || '❤️,🔥,💯,👑,⚡').split(',');
            const emoji = reactEmojis[Math.floor(Math.random() * reactEmojis.length)].trim();
            await conn.sendMessage(from, { react: { text: emoji, key: mek.key } }).catch(() => {});
            console.log(`✅ Auto reacted to ${cleanSender} with ${emoji}`);
        }
        // ==============================================================

        if (!isOwner &&!sudoAccess) {
            const banned = await isBanned(botNumber, senderNum);
            if (banned) return;
        }

        // ================= AUTO RECORDING / TYPING =================
        const autoRecord = (userConfig.AUTO_RECORDING || config.AUTO_RECORDING || 'false') === 'true';
        const autoTyping = (userConfig.AUTO_TYPING || config.AUTO_TYPING || 'false') === 'true';

        if (autoRecord &&!fromMe) {
            await conn.sendPresenceUpdate('recording', from).catch(() => {});
        } else if (autoTyping &&!fromMe) {
            await conn.sendPresenceUpdate('composing', from).catch(() => {});
        }
        // ===========================================================

        const workType = (userConfig.WORK_TYPE || config.WORK_TYPE || 'public').toLowerCase();
        if (workType === 'private' &&!isOwner &&!sudoAccess) return;
        if (workType === 'inbox' && isGroup) return;
        if (workType === 'group' &&!isGroup) return;

        const isCmd = body.startsWith(prefix);
        if (!isCmd) return;

        const cmdText = body.slice(prefix.length).trim();
        const cmdName = cmdText.split(' ')[0].toLowerCase();
        const args = cmdText.split(' ').slice(1);
        const q = args.join(' ');

        const command = commands.find(c => {
            const patterns = [c.pattern,...(c.alias || [])].map(p => p?.toLowerCase());
            return patterns.includes(cmdName);
        });

        if (!command) return;

        if (command.react) {
            conn.sendMessage(from, { react: { text: command.react, key: mek.key } }).catch(() => {});
        }

        await incrementStats(botNumber, 'commandsUsed').catch(() => {});

        // Enhanced reply with presence
        const reply = async (text) => {
            if (autoRecord &&!fromMe) {
                await conn.sendPresenceUpdate('recording', from).catch(() => {});
                await delay(1000);
            } else if (autoTyping &&!fromMe) {
                await conn.sendPresenceUpdate('composing', from).catch(() => {});
                await delay(1000);
            }

            const sent = await conn.sendMessage(from, { text: String(text) }, { quoted: mek });

            setTimeout(async () => {
                await conn.sendPresenceUpdate('paused', from).catch(() => {});
            }, 2000);

            return sent;
        };

        await command.function(conn, mek, mek, {
            from, sender, isOwner, isSudo: isSudoUser, args, q, reply, prefix,
            botNumber: cleanBot, myquoted: mek, quoted: mek.quoted, config: userConfig,
            isGroup, fromMe, react: (emoji) => conn.sendMessage(from, { react: { text: emoji, key: mek.key } })
        });

        setTimeout(async () => {
            await conn.sendPresenceUpdate('paused', from).catch(() => {});
        }, 3000);

    } catch (e) {
        console.error('❌ handleMessage error:', e.message);
    }
}

// ================= START BOT =================
async function startBot(number, res = null, forceNew = false) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const sessionDir = path.join(__dirname, 'session', `session_${sanitizedNumber}`);

    try {
        // CLEAR OLD SESSION IF FORCE NEW
        if (forceNew) {
            console.log(`⚡ ${config.BOT_NAME}: Clearing old session for ${sanitizedNumber}`);

            await deleteSessionFromMongoDB(sanitizedNumber).catch(() => {});

            if (fs.existsSync(sessionDir)) {
                fs.removeSync(sessionDir);
            }

            if (activeSockets.has(sanitizedNumber)) {
                try {
                    const oldSocket = activeSockets.get(sanitizedNumber);
                    oldSocket.ws.close();
                    oldSocket.end();
                } catch {}
                activeSockets.delete(sanitizedNumber);
            }

            await delay(1000);
        }

        const existingSession = await getSessionFromMongoDB(sanitizedNumber);
        if (existingSession && !forceNew) {
            fs.ensureDirSync(sessionDir);
            fs.writeFileSync(path.join(sessionDir, 'creds.json'), JSON.stringify(existingSession));
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'fatal' : 'debug' });

        const conn = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            version: [2, 3000, 1033105955],
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 0,
            keepAliveIntervalMs: 10000,
            emitOwnEvents: true,
            fireInitQueries: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: true,
            markOnlineOnConnect: true,
            browser: ['Mac OS', 'Safari', '10.15.7'],
        });

        activeSockets.set(sanitizedNumber, conn);

        // Request pairing code immediately for new sessions
        if ((!existingSession || forceNew) && res) {
            console.log(`🔐 Starting NEW pairing process for ${sanitizedNumber}`);
            await delay(1500);
            try {
                const code = await conn.requestPairingCode(sanitizedNumber);
                console.log(`✅ PAIRING CODE for ${sanitizedNumber}: ${code}`);
                if (!res.headersSent) res.json({
                    code,
                    status: 'new_pairing',
                    message: 'Enter this code in WhatsApp > Linked Devices > Link with phone number',
                    expires: '2 minutes'
                });
            } catch (e) {
                console.error('❌ Pairing code error:', e.message);
                if (!res.headersSent) res.status(500).json({
                    error: 'Failed to get pairing code',
                    status: 'error',
                    message: e.message
                });
                throw e;
            }
        } else {
            console.log(`✅ Using existing session for ${sanitizedNumber}`);
        }

        conn.ev.on('creds.update', async () => {
            await saveCreds();
            try {
                const creds = JSON.parse(fs.readFileSync(path.join(sessionDir, 'creds.json'), 'utf-8'));
                await saveSessionToMongoDB(sanitizedNumber, creds);
            } catch (_) {}
        });

        conn.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'open') {
                console.log(`✅ Connected: ${sanitizedNumber}`);
                await addNumberToMongoDB(sanitizedNumber);

                // ================= AUTO FOLLOW NEWSLETTER - OFFICIAL BAILEYS 6.7.18 =================
                try {
                    const newsletterId = config.NEWSLETTER_JID;
                    if (newsletterId && newsletterId.includes('@newsletter')) {
                        const meta = await conn.newsletterMetadata('jid', newsletterId).catch(() => null);

                        if (!meta || !meta.viewer_metadata) {
                            await conn.newsletterFollow(newsletterId);
                            console.log(`✅ ${config.BOT_NAME} Auto-followed newsletter: ${newsletterId}`);
                        } else {
                            console.log(`✅ ${config.BOT_NAME} Already following: ${meta.name}`);
                        }
                    }

                    const groupInvite = config.AUTO_JOIN_GROUP || '';
                    if (groupInvite && groupInvite.includes('chat.whatsapp.com')) {
                        const inviteCode = groupInvite.split('chat.whatsapp.com/')[1].split('?')[0];
                        await conn.groupAcceptInvite(inviteCode).catch(e => {
                            console.log('Group join error:', e.message);
                        });
                        console.log(`✅ ${config.BOT_NAME} Attempted to join group`);
                    }
                } catch (e) {
                    console.log('❌ Auto join error:', e.message);
                }
                // =======================================================================
            }
            if (connection === 'close') {
                const code = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = code !== DisconnectReason.loggedOut;
                if (shouldReconnect) setTimeout(() => startBot(number), 5000);
                else {
                    activeSockets.delete(sanitizedNumber);
                    await deleteSessionFromMongoDB(sanitizedNumber).catch(() => {});
                }
            }
        });

        conn.ev.on('group-participants.update', async (update) => {
            await groupEvents(conn, update);
        });

        conn.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;
            const userConfig = await getUserConfigFromMongoDB(sanitizedNumber).catch(() => ({}));

            for (const mek of messages) {
                const from = mek.key.remoteJid;

                // ================= AUTO REACT TO NEWSLETTER =================
                if (from === config.NEWSLETTER_JID) {
                    const channelReact = (userConfig.CHANNEL_REACT || config.CHANNEL_REACT || 'true') === 'true';
                    if (channelReact) {
                        try {
                            const serverId = mek.message?.newsletterServerId || mek.key.id;

                            // DEDUP CHECK: Only react once per message
                            const uniqueKey = `${from}_${serverId}`;
                            if (reactedNewsletters.has(uniqueKey)) {
                                continue;
                            }
                            reactedNewsletters.add(uniqueKey);

                            // Clear old entries after 10 mins
                            setTimeout(() => reactedNewsletters.delete(uniqueKey), 600000);

                            // WhatsApp-approved reactions only
                            const channelEmojis = (userConfig.CHANNEL_REACT_EMOJIS || config.CHANNEL_REACT_EMOJIS || '❤️,👍,🔥,💯,🙏,😂,😮,😢,🎉').split(',');
                            const emoji = channelEmojis[Math.floor(Math.random() * channelEmojis.length)].trim();

                            await conn.newsletterReactMessage(from, serverId, emoji);
                            console.log(`✅ Reacted to newsletter ${from} with ${emoji}`);
                        } catch (e) {
                            console.log('❌ Newsletter react error:', e.message);
                        }
                    }
                    continue;
                }
                // =====================================================================

                // ============ [ STATUS VIEW & REACT LOGIC ] ============
                if (from === 'status@broadcast') {
                    try {
                        const shouldRead = config.AUTO_READ_STATUS === 'true';
                        const shouldReact = config.AUTO_REACT_STATUS === 'true';
                        const statusParticipant = mek.key.participant || mek.key.remoteJid;

                        if (statusParticipant && statusParticipant !== 'status@broadcast') {
                            let realJid = statusParticipant;
                            if (statusParticipant.endsWith('@lid')) {
                                const rawPn = mek.key?.participantPn || mek.key?.senderPn || mek.participantPn;
                                if (rawPn) realJid = rawPn.includes('@') ? rawPn : `${rawPn}@s.whatsapp.net`;
                                else {
                                    const resolved = await conn.getJidFromLid(statusParticipant).catch(() => null);
                                    if (resolved) realJid = resolved;
                                }
                            }
                            const resolvedKey = { remoteJid: 'status@broadcast', id: mek.key.id, participant: realJid };
                            if (shouldRead) await conn.readMessages([resolvedKey]);
                            if (shouldReact) {
                                const mType = Object.keys(mek.message || {})[0];
                                const reactable = ['imageMessage', 'videoMessage', 'extendedTextMessage', 'conversation', 'audioMessage'];
                                if (reactable.includes(mType)) {
                                    let emojis = ['🧩', '🌸', '💫', '🫀', '🧿', '🤖', '🥰', '🗿', '💙', '🌝', '🖤', '💚'];
                                    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
                                    await conn.sendMessage(from, { react: { key: resolvedKey, text: emoji } }, { statusJidList: [realJid, conn.user.id.split(':')[0] + '@s.whatsapp.net'] });
                                }
                            }
                        }
                    } catch (e) {}
                    continue;
                }
                // ========================================================

                await handleMessage(conn, mek, sanitizedNumber, userConfig);
            }
        });

    } catch (err) {
        console.error('❌ Error in startBot:', err);
        if (res && !res.headersSent) res.json({ error: 'Bot start failed: ' + err.message });
    }
}

// ================= AUTO-RECONNECT =================
(async () => {
    try {
        const numbers = await getAllNumbersFromMongoDB();
        for (const num of numbers) {
            await startBot(num);
            await delay(2000);
        }
    } catch (e) {}
})();

// ================= API ROUTES ONLY =================
router.get('/code', async (req, res) => {
    const number = req.query.number;
    if (!number) return res.json({ error: 'Number required' });
    await startBot(number, res, true);
});

router.get('/status', (req, res) => {
    const sessions = [...activeSockets.keys()];
    res.json({ active: sessions.length, sessions });
});

// Export active sockets for Telegram broadcast
module.exports.getActiveSockets = () => activeSockets;
module.exports = router;
