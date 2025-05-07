const { default: makeWASocket, DisconnectReason, makeInMemoryStore, jidDecode, proto, getContentType, useMultiFileAuthState, downloadContentFromMessage } = require("@fizzxydev/baileys-pro")
const pino = require('pino')
const { Boom } = require('@hapi/boom')
const readline = require("readline");
const fs = require('fs')
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const PhoneNumber = require('awesome-phonenumber')
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) })
const question = (text) => { 
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); 
    return new Promise((resolve) => { rl.question(text, (answer) => { rl.close(); resolve(answer); }) }) 
};

async function startBotz() {
    const { state, saveCreds } = await useMultiFileAuthState("session")
    const sock = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: state,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000,
        emitOwnEvents: true,
        fireInitQueries: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: true,
        markOnlineOnConnect: true,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
    });

if (!sock.authState.creds.registered) {
    console.log("\x1b[34mMasukkan Nomor Aktif\x1b[0m");

    rl.question("> ", async (phoneNumber) => {
        if (!phoneNumber.startsWith("62")) {
            console.log("\x1b[34mNomor harus dimulai dengan 62. Silakan coba lagi.\x1b[0m");
            rl.close();
            return;
        }

        try {
            let code = await sock.requestPairingCode(phoneNumber);
            code = code?.match(/.{1,4}/g)?.join("-") || code;

            console.log(`Pairing Code: ${code}`);
        } catch (error) {
            console.error("Gagal mendapatkan pairing code:", error);
        } finally {
            rl.close();
        }
    });
}

    store.bind(sock.ev)

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
            if (reason === DisconnectReason.loggedOut) {
                console.log("Bot Offline");
            } else {
                startBotz();
            }
        } else if (connection === 'open') {
            console.log("Bot Online");
        }
    });

    sock.ev.on('creds.update', saveCreds);

    return sock;
}

module.exports = { startBotz };