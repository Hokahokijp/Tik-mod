const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/', (req, res) => { res.sendFile(__dirname + '/index.html'); });

// DATABASE KONEKSI AKTIF (Biar gak mampet & gak tabrakan)
const userPipes = new Map();

io.on('connection', (socket) => {
    console.log('User Terhubung:', socket.id);

    socket.on('setTarget', (data) => {
        // Bersihkan koneksi lama KHUSUS ID socket ini (biar gak numpuk)
        if (userPipes.has(socket.id)) {
            userPipes.get(socket.id).removeAllListeners();
            userPipes.get(socket.id).disconnect();
        }

        // Buka Pipa Baru (Loss tanpa delay)
        const tiktok = new WebcastPushConnection(data.user, {
            processDelay: 0,
            enableExtendedGiftInfo: true
        });

        tiktok.connect().then(() => {
            socket.emit('status', 'OK');
            userPipes.set(socket.id, tiktok);
        }).catch(() => socket.emit('status', 'Error!'));

        // Kirim data HANYA ke socket yang meminta (socket.emit, bukan io.emit)
        const kirimData = (event, payload) => {
            if (socket.connected) {
                socket.emit(event, payload);
            }
        };

        tiktok.on('chat', (d) => kirimData('chat', d));
        tiktok.on('member', (d) => kirimData('memberJoin', d));
        tiktokConn.on('leave', (d) => kirimData('memberLeave', d));
        tiktok.on('gift', (d) => kirimData('munculFoto', {
            url: d.profilePictureUrl,
            nickname: d.nickname,
            uniqueId: d.uniqueId,
            giftName: d.giftName,
            diamondCount: d.diamondCount || 0
        }));
        tiktok.on('like', (d) => kirimData('like', d));
        tiktok.on('share', (d) => kirimData('share', d));
    });

    // Otomatis tutup pipa kalau tab browser ditutup
    socket.on('disconnect', () => {
        if (userPipes.has(socket.id)) {
            userPipes.get(socket.id).disconnect();
            userPipes.delete(socket.id);
            console.log('User pergi, pipa ditutup otomatis.');
        }
    });
});

server.listen(process.env.PORT || 8091, () => console.log('Server Plong Jalan!'));