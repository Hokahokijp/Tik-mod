const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Agar bisa membaca file HTML
// Agar bisa membaca file utama
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// TAMBAHKAN INI AGAR PANEL ADMIN BISA DIBUKA
app.get('/panel-admin', (req, res) => {
    res.sendFile(__dirname + '/Panel-1990-aa.html');
});

let tiktokConn;

io.on('connection', (socket) => {
    socket.on('setTarget', (data) => {
        if (tiktokConn) tiktokConn.disconnect();
        
        tiktokConn = new WebcastPushConnection(data.user);
        
        tiktokConn.connect().then(state => {
            socket.emit('status', 'OK');
        }).catch(err => {
            socket.emit('status', 'Gagal! Akun tidak Live atau salah username.');
        });

        // Kirim data foto dan NICKNAME ke semua yang buka web
        const sendPhoto = (dataLive) => {
            io.emit('munculFoto', { 
                url: dataLive.profilePictureUrl, 
                nickname: dataLive.nickname, // <-- SEKARANG SUDAH AMBIL NICKNAME
                uniqueId: dataLive.uniqueId, // <-- TAMBAHAN USERNAME @
                giftName: dataLive.giftName || null,
                diamondCount: dataLive.diamondCount || 0,
                config: data 
            });
        };

        tiktokConn.on('chat', sendPhoto);
        tiktokConn.on('like', sendPhoto);
        tiktokConn.on('gift', sendPhoto);
        tiktokConn.on('share', sendPhoto);
        tiktokConn.on('follow', sendPhoto);
    });
});

// Port hosting biasanya dinamis, pakai process.env.PORT
const PORT = process.env.PORT || 8091;
server.listen(PORT, () => {
    console.log('Server berjalan di port ' + PORT);
});