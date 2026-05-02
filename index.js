const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

let tiktokConn;

io.on('connection', (socket) => {
    console.log('User terhubung ke Web Interface');

    socket.on('setTarget', (data) => {
        // Putus koneksi lama agar tidak bentrok (Penyebab Macet)
        if (tiktokConn) {
            tiktokConn.disconnect();
            console.log("Memutuskan koneksi sebelumnya...");
        }

        // Buat koneksi baru dengan settingan real-time
        tiktokConn = new WebcastPushConnection(data.user, {
            processInitialData: false, // Ambil data saat ini saja, bukan yang lalu
            enableExtendedGiftInfo: true,
            enableWebsocketUpgrade: true,
            requestPollingIntervalMs: 2000
        });

        tiktokConn.connect().then(state => {
            console.log(`Berhasil Sinkron dengan Live: ${data.user}`);
            socket.emit('status_konek', { success: true, message: `Tersambung ke ${data.user}` });
        }).catch(err => {
            console.error('Gagal Konek:', err);
            socket.emit('status_konek', { success: false, message: 'Gagal konek, coba lagi.' });
        });

        // --- EVENT REAL-TIME ---

        // Event Join
        tiktokConn.on('member', (dataLive) => {
            io.emit('event_visual', { 
                type: 'join', 
                user: dataLive.nickname, 
                img: dataLive.profilePictureUrl 
            });
        });

        // Event Like
        tiktokConn.on('like', (dataLive) => {
            io.emit('event_visual', { 
                type: 'like', 
                user: dataLive.nickname, 
                img: dataLive.profilePictureUrl 
            });
        });

        // Event Chat
        tiktokConn.on('chat', (dataLive) => {
            io.emit('chat_masuk', { user: dataLive.nickname, text: dataLive.comment });
        });

        // Event Gift & Cek (Khodam/Jodoh)
        tiktokConn.on('gift', (dataLive) => {
            let hasil = ""; 
            let tipe = "";
            const g = dataLive.giftName; 
            const c = dataLive.repeatCount;
            const d = dataLive.diamondCount;

            if (g === 'Rose') {
                tipe = "CEK JODOH";
                hasil = c >= 5 ? "Jodohmu orang dekat!" : "Masih rahasia alam.";
            } else if (g === 'GG' || g === 'Finger Heart') {
                tipe = "CEK KHODAM";
                hasil = "Khodam Macan Putih";
            }

            if (tipe) {
                io.emit('kartu_cek', {
                    img: dataLive.profilePictureUrl,
                    user: dataLive.nickname,
                    tipe: tipe,
                    hasil: hasil,
                    diamonds: d * c
                });
            }
        });

        // Deteksi jika live berakhir
        tiktokConn.on('disconnected', () => {
            console.log('Koneksi TikTok terputus.');
        });
    });
});

// Jalankan di port 8091
server.listen(8091, '0.0.0.0', () => {
    console.log('====================================');
    console.log('SERVER RILTEM READY DI PORT 8091');
    console.log('====================================');
});