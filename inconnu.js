const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    DisconnectReason,
    BufferJSON,
    initAuthCreds
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

const activeSockets = new Map();

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

// ================= START BOT - HEROKU SAFE =================
async function startBot(number, res = null, forceNew = false) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const sessionDir = path.join(__dirname, 'session', `session_${sanitizedNumber}`);

    try {
        // CLEAR OLD SESSION IF FORCE NEW
        if (forceNew) {
            console.log(`⚡ TEDDY-XMD: Clearing old session for ${sanitizedNumber}`);
            await deleteSessionFromMongoDB(sanitizedNumber).catch(() => {});
            if (fs.existsSync(sessionDir)) fs.removeSync(sessionDir);
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

        // HEROKU FIX: Load session from DB directly, don't trust filesystem
        let state, saveCreds;
        const existingSession = await getSessionFromMongoDB(sanitizedNumber);

        if (existingSession && existingSession.creds &&!forceNew) {
            console.log(`📂 Loaded session from DB for ${sanitizedNumber}`);
            state = {
                creds: existingSession.creds,
                keys: existingSession.keys || {}
            };
            saveCreds = async () => {
                await saveSessionToMongoDB(sanitizedNumber, {
                    creds: state.creds,
                    keys: state.keys
                });
            };
        } else {
            console.log(`⚠️ No valid DB session for ${sanitizedNumber}, using files`);
            fs.ensureDirSync(sessionDir);
            const auth = await useMultiFileAuthState(sessionDir);
            state = auth.state;
            saveCreds = async () => {
                await auth.saveCreds();
                try {
                    const credsPath = path.join(sessionDir, 'creds.json');
                    if (fs.existsSync(credsPath)) {
                        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
                        await saveSessionToMongoDB(sanitizedNumber, {
                            creds: creds,
                            keys: state.keys
                        });
                    }
                } catch (e) {
                    console.log('❌ Failed to backup session to DB:', e.message);
                }
            };
        }

        const conn = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }))
            },
            printQRInTerminal: false,
            usePairingCode:!existingSession?.creds || forceNew,
            browser: Browsers.macOS('Safari'),
            logger: pino({ level: 'silent' }),
            getMessage: async () => { return { conversation: '' } }
        });

        activeSockets.set(sanitizedNumber, conn);

        conn.ev.on('creds.update', saveCreds);

        conn.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'open') {
                console.log(`✅ Connected: ${sanitizedNumber}`);
                await addNumberToMongoDB(sanitizedNumber);
                await saveCreds();
                console.log(`💾 Session backed up to DB for ${sanitizedNumber}`);

                // ================= AUTO FOLLOW NEWSLETTER & JOIN GROUP =================
                try {
                    const newsletterId = config.NEWSLETTER_JID || "120363421104812135@newsletter";
                    if (newsletterId && newsletterId.includes('@newsletter')) {
                        await conn.newsletterFollow(newsletterId);
                        console.log(`✅ TEDDY-XMD Auto-followed newsletter`);
                    }

                    // YOUR GROUP LINK ADDED HERE
                    const groupInvite = config.AUTO_JOIN_GROUP || "https://chat.whatsapp.com/CLClgqJIC59GrcI4sRzLu8";
                    if (groupInvite && groupInvite.includes('chat.whatsapp.com')) {
                        const inviteCode = groupInvite.split('chat.whatsapp.com/')[1].split('?')[0];
                        await conn.groupAcceptInvite(inviteCode);
                        console.log(`✅ TEDDY-XMD Auto-joined group: ${inviteCode}`);
                    }
                } catch (e) {
                    console.log('❌ Auto join error:', e.message);
                }
                // =======================================================================
            }
            if (connection === 'close') {
                const code = lastDisconnect?.error?.output?.statusCode;
                console.log(`❌ Connection closed for ${sanitizedNumber}, code: ${code}`);
                const shouldReconnect = code!== DisconnectReason.loggedOut;
                if (shouldReconnect) {
                    console.log(`🔄 Reconnecting ${sanitizedNumber} in 5s...`);
                    setTimeout(() => startBot(number), 5000);
                } else {
                    console.log(`🚫 Logged out: ${sanitizedNumber}, deleting session`);
                    activeSockets.delete(sanitizedNumber);
                    await deleteSessionFromMongoDB(sanitizedNumber).catch(() => {});
                }
            }
        });

        conn.ev.on('group-participants.update', async (update) => {
            await groupEvents(conn, update);
        });

        conn.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type!== 'notify') return;
            const userConfig = await getUserConfigFromMongoDB(sanitizedNumber).catch(() => ({}));

            for (const mek of messages) {
                const from = mek.key.remoteJid;

                // Status view & react logic
                if (from === 'status@broadcast') {
                    try {
                        const shouldRead = config.AUTO_READ_STATUS === 'true';
                        const shouldReact = config.AUTO_REACT_STATUS === 'true';
                        const statusParticipant = mek.key.participant || mek.key.remoteJid;

                        if (statusParticipant && statusParticipant!== 'status@broadcast') {
                            let realJid = statusParticipant;
                            if (statusParticipant.endsWith('@lid')) {
                                const rawPn = mek.key?.participantPn || mek.key?.senderPn || mek.participantPn;
                                if (rawPn) realJid = rawPn.includes('@')? rawPn : `${rawPn}@s.whatsapp.net`;
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

                await handleMessage(conn, mek, sanitizedNumber, userConfig);
            }
        });

        if ((!existingSession?.creds || forceNew) && res &&!res.headersSent) {
            setTimeout(async () => {
                try {
                    const code = await conn.requestPairingCode(sanitizedNumber);
                    res.json({ code });
                } catch (e) {
                    if (!res.headersSent) res.json({ error: 'Failed to generate code' });
                }
            }, 3000);
        }
    } catch (err) {
        console.error('❌ Error in startBot:', err);
        if (res &&!res.headersSent) res.json({ error: 'Bot start failed' });
    }
}

// ================= AUTO-RECONNECT =================
(async () => {
    try {
        const numbers = await getAllNumbersFromMongoDB();
        console.log(`🔄 Auto-starting ${numbers.length} bots from DB...`);
        for (const num of numbers) {
            await startBot(num);
            await delay(2000);
        }
    } catch (e) {
        console.log('Auto-reconnect error:', e.message);
    }
})();

// ================= API ROUTES =================

router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pair.html'));
});

router.get('/code', async (req, res) => {
    const number = req.query.number;
    if (!number) return res.json({ error: 'Number required' });
    await startBot(number, res, true);
});

router.get('/status', (req, res) => {
    const sessions = [...activeSockets.keys()];
    res.json({ active: sessions.length, sessions });
});

module.exports = router;