const express = require('express');
const {
  generateWAMessageFromContent,
  proto
} = require('@fizzxydev/baileys-pro'); // sesuaikan dengan versi baileys yang kamu pakai
const app = express();
const { startBotz } = require('./bot');

let sock;
let isConnected = false;

app.use(express.json());

const sendOtpMessage = async (sock, chatId, otpCode, quoted = null) => {
  const teks = `*${otpCode}* adalah kode verifikasi Anda. Demi keamanan, jangan membagikan kode ini.`;
  const msg = generateWAMessageFromContent(chatId, {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2
        },
        interactiveMessage: proto.Message.InteractiveMessage.create({
          contextInfo: {},
          body: proto.Message.InteractiveMessage.Body.create({ text: teks }),
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
            buttons: [
              {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                  display_text: "Salin Kode",
                  id: "copy_otp",
                  copy_code: otpCode
                })
              }
            ]
          })
        })
      }
    }
  }, { userJid: chatId });

  await sock.relayMessage(chatId, msg.message, { messageId: msg.key.id });
};

startBotz().then(connection => {
    sock = connection;
    isConnected = true;

    app.listen(3000, () => {
        console.log('✅ Express server jalan di http://localhost:3000');
    });
}).catch(err => {
    console.error("❌ Gagal start bot:", err);
});

app.get('/status', (req, res) => {
    res.json({
        connected: isConnected,
        message: isConnected ? 'Bot terhubung ke WhatsApp' : 'Bot belum terhubung',
    });
});

app.post('/send-otp', async (req, res) => {
    if (!isConnected || !sock) return res.status(503).json({ error: 'Bot belum terhubung ke WhatsApp' });

    const { number, otp } = req.body;
    if (!number || !otp) return res.status(400).json({ error: 'number & otp required' });

    const jid = number.replace(/^0/, '62') + '@s.whatsapp.net';
    try {
        await sendOtpMessage(sock, jid, otp);
        res.json({ status: 'OTP berhasil dikirim ke ' + number });
    } catch (err) {
        console.error("Gagal kirim OTP:", err);
        res.status(500).json({ error: 'Gagal kirim OTP', detail: err.toString() });
    }
});