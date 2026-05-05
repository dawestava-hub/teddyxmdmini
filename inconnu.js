const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    DisconnectReason,
    Browsers
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

const { Session } = require('./lib/database');
const path = require('path');
const fs = require('fs-extra');
const pino = require('pino');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

global.prefix = config.PREFIX || '.';

connectdb().catch(e => console.log('⚠️ DB error:', e.message));

try { require('./telegram'); } catch (e) { console.log('Telegram disabled'); }

const activeSockets = new Map();
const reconnectAttempts = new Map();
const messageStore = new Map();

// ================= LOAD PLUGINS =================
const pluginsDir = path.join(__dirname, 'plugins');
if (fs.existsSync(pluginsDir)) {
    fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js')).forEach(f => {
        try { require(path.join(pluginsDir, f)); }
        catch (e) { console.error(`Plugin ${f}:`, e.message); }
    });
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
        const sudoAccess = !isOwner ? await isSudo(botNumber, senderNum).catch(() => false) : false;

        if (!isOwner && !sudoAccess) {
            const banned = await isBanned(botNumber, senderNum).catch(() => false);
            if (banned) return;
        }

        const workType = (userConfig.WORK_TYPE || config.WORK_TYPE || 'public').toLowerCase();
        if (workType === 'private' && !isOwner && !sudoAccess) return;
        if (workType === 'inbox' && isGroup) return;
        if (workType === 'group' && !isGroup) return;

        if (!body.startsWith(prefix)) return;

        const cmdText = body.slice(prefix.length).trim();
        const cmdName = cmdText.split(' ')[0].toLowerCase();
        const args = cmdText.split(' ').slice(1);
        const q = args.join(' ');

        const command = commands.find(c => {
            const patterns = [c.pattern, ...(c.alias || [])].map(p => p?.toLowerCase());
            return patterns.includes(cmdName);
        });

        if (!command) return;

        if (command.react) conn.sendMessage(from, { react: { text: command.react, key: mek.key } }).catch(() => {});
        incrementStats(botNumber, 'commandsUsed').catch(() => {});

        const reply = async (text) => conn.sendMessage(from, { text: String(text) }, { quoted: mek });

        await command.function(conn, mek, mek, {
            from, sender, isOwner, isSudo: isOwner || sudoAccess, args, q, reply, prefix,
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
            await deleteSessionFromMongoDB(sanitizedNumber).catch(() => {});
            if (fs.existsSync(sessionDir)) fs.removeSync(sessionDir);
            if (activeSockets.has(sanitizedNumber)) {
                try { activeSockets.get(sanitizedNumber).end(); } catch {}
                activeSockets.delete(sanitizedNumber);
            }
            reconnectAttempts.delete(sanitizedNumber);
        }

        if (!forceNew) {
            const existingSession = await Session.findOne({ number: sanitizedNumber });

            if (!existingSession) {
                console.log(`🧹 No MongoDB session found for ${sanitizedNumber} - requiring NEW pairing`);
                if (fs.existsSync(sessionDir)) {
                    await fs.remove(sessionDir);
                    console.log(`🗑️ Cleaned leftover local session for ${sanitizedNumber}`);
                }
            } else {
                const restoredCreds = await getSessionFromMongoDB(sanitizedNumber);
                if (restoredCreds) {
                    fs.ensureDirSync(sessionDir);
                    fs.writeFileSync(path.join(sessionDir, 'creds.json'), JSON.stringify(restoredCreds, null, 2));
                    console.log(`🔄 Restored existing session from MongoDB for ${sanitizedNumber}`);
                }
            }
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
        global.sock = conn;
        reconnectAttempts.set(sanitizedNumber, 0);

        if (res && forceNew) {
            if (!conn.authState.creds.registered) {
                console.log(`🔐 Starting NEW pairing process for ${sanitizedNumber}`);
                try {
                    await delay(1500);
                    const code = await conn.requestPairingCode(sanitizedNumber);
                    if (!res.headersSent) {
                        res.send({ code, status: 'new_pairing' });
                    }
                } catch (e) {
                    console.error(`Failed to request pairing code:`, e.message);
                    if (!res.headersSent) {
                        res.status(500).send({ error: 'Failed to get pairing code', status: 'error', message: e.message });
                    }
                    throw e;
                }
            } else {
                console.log(`✅ Using existing session for ${sanitizedNumber}`);
                if (!res.headersSent) res.json({ status: 'already_linked', number: sanitizedNumber });
            }
        }

        conn.ev.on('creds.update', async () => {
            await saveCreds();
            try {
                const fileContent = await fs.readFile(path.join(sessionDir, 'creds.json'), 'utf8');
                const creds = JSON.parse(fileContent);
                const existingSession = await Session.findOne({ number: sanitizedNumber });
                const isNewSession = !existingSession;
                saveSessionToMongoDB(sanitizedNumber, creds).catch(() => {});
                if (isNewSession) console.log(`💾 New session saved to MongoDB for ${sanitizedNumber}`);
            } catch {}
        });

        conn.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'open') {
                console.log(`✅ Connected: ${sanitizedNumber}`);
                reconnectAttempts.set(sanitizedNumber, 0);
                addNumberToMongoDB(sanitizedNumber).catch(() => {});
            }

            if (connection === 'close') {
                const code = lastDisconnect?.error?.output?.statusCode;
                const attempts = reconnectAttempts.get(sanitizedNumber) || 0;

                if (code === DisconnectReason.loggedOut) {
                    activeSockets.delete(sanitizedNumber);
                    reconnectAttempts.delete(sanitizedNumber);
                    await deleteSessionFromMongoDB(sanitizedNumber).catch(() => {});
                    return;
                }

                if (attempts < 10) {
                    const delayMs = Math.min(1000 * Math.pow(2, attempts), 30000);
                    reconnectAttempts.set(sanitizedNumber, attempts + 1);
                    setTimeout(() => startBot(number), delayMs);
                } else {
                    activeSockets.delete(sanitizedNumber);
                    reconnectAttempts.delete(sanitizedNumber);
                }
            }
        });

        conn.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;
            let userConfig = await getUserConfigFromMongoDB(sanitizedNumber).catch(() => ({}));
            for (const mek of messages) {
                handleMessage(conn, mek, sanitizedNumber, userConfig);
            }
        });

        return conn;

    } catch (err) {
        console.error('❌ startBot error:', err.message);
        if (res && !res.headersSent) res.json({ error: err.message });
        throw err;
    }
}

// ================= WEB ROUTES =================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pair.html'));
});

app.get('/ping', (req, res) => {
    res.json({ status: 'TEDDY-XMD Running', activeBots: activeSockets.size });
});

app.get('/pair', async (req, res) => {
    let number = req.query.number;
    if (!number) return res.status(400).json({ error: 'Number required' });
    number = number.replace(/[^0-9]/g, '');
    if (number.length < 11) return res.status(400).json({ error: 'Use 254712345678 format' });
    try { await startBot(number, res, true); } 
    catch (e) { if (!res.headersSent) res.status(500).json({ error: e.message }); }
});

// CRITICAL: Bind to 0.0.0.0 for Heroku
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 TEDDY-XMD running on ${PORT}`));

module.exports = { startBot, activeSockets };
