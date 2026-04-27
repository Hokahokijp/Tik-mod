const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/', (req, res) => { res.sendFile(__dirname + '/index.html'); });

let tiktokConn;
let currentUser = "";

function startTikTok(username) {
    if (tiktokConn) {
        tiktokConn.removeAllListeners();
        tiktokConn.disconnect();
    }

    currentUser = username;
    tiktokConn = new WebcastPushConnection(username);

    tiktokConn.connect().then(state => {
        console.log(`[CONNECTED] -> ${username}`);
        io.emit('status', 'Koneksi Berhasil!');
    }).catch(err => {
        console.log(`[RETRYING] -> ${username}`);
        setTimeout(() => startTikTok(currentUser), 5000); // Auto-reconnect kalau gagal
    });

    // --- EVENT PUSH REAL-TIME ---
    tiktokConn.on('member', (data) => io.emit('memberJoin', data));
    tiktokConn.on('chat', (data) => io.emit('chat', data));
    tiktokConn.on('gift', (data) => {
        io.emit('munculFoto', {
            ...data,
            url: data.profilePictureUrl,
            diamondCount: (data.diamondCount || 0) * (data.repeatCount || 1)
        });
    });
    tiktokConn.on('like', (data) => io.emit('activity', { ...data, type: 'like' }));
    tiktokConn.on('share', (data) => io.emit('activity', { ...data, type: 'share' }));
    tiktokConn.on('follow', (data) => io.emit('activity', { ...data, type: 'follow' }));
    tiktokConn.on('leave', (data) => io.emit('memberLeave', { uniqueId: data.uniqueId }));

    // Jika koneksi putus tiba-tiba
    tiktokConn.on('disconnected', () => {
        setTimeout(() => startTikTok(currentUser), 5000);
    });
}

io.on('connection', (socket) => {
    socket.on('setTarget', (data) => {
        startTikTok(data.user);
    });
});

const PORT = 8091;
server.listen(PORT, () => {
    console.log(`=== SERVER AKTIF DI PORT ${PORT} ===`);
});