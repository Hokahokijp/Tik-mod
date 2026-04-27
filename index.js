const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let tiktokConn;

io.on('connection', (socket) => {
    console.log('Browser Terkoneksi ✅');

    socket.on('setTarget', (data) => {
        if (tiktokConn) tiktokConn.disconnect();
        
        tiktokConn = new WebcastPushConnection(data.user);
        
        tiktokConn.connect().then(state => {
            socket.emit('status', 'Koneksi Sukses!');
            console.log(`Menghubungkan ke TikTok: ${data.user}`);
        }).catch(err => {
            socket.emit('status', 'Gagal Konek! Akun mungkin offline.');
        });

        // 1. DATA KOMENTAR
        tiktokConn.on('chat', (dataLive) => {
            io.emit('tiktokChat', {
                user: dataLive.nickname,
                message: dataLive.comment
            });
        });

        // 2. DATA HADIAH (GIFT)
        tiktokConn.on('gift', (dataLive) => {
            io.emit('tiktokGift', {
                user: dataLive.nickname,
                giftName: dataLive.giftName,
                count: dataLive.repeatCount
            });
        });

        // 3. DATA ORANG MASUK (JOIN)
        tiktokConn.on('member', (dataLive) => {
            io.emit('tiktokJoin', {
                user: dataLive.nickname
            });
        });
    });
});

const PORT = 8091;
server.listen(PORT, () => {
    console.log(`SISTEM AKTIF! Buka http://localhost:${PORT}`);
});