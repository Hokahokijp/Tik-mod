const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

app.get('/', (req, res) => { res.sendFile(__dirname + '/index.html'); });

let tiktokConn;

io.on('connection', (socket) => {
    socket.on('setTarget', (data) => {
        if (tiktokConn) tiktokConn.disconnect();
        
        tiktokConn = new WebcastPushConnection(data.user);
        
        tiktokConn.connect().then(() => {
            socket.emit('statusLive', { konek: true, pesan: "Live Terhubung!" });
        }).catch(err => {
            socket.emit('statusLive', { konek: false, pesan: "Live Sedang OFF atau Salah User" });
        });

        // Deteksi kalau Host mematikan Live
        tiktokConn.on('disconnected', () => {
            io.emit('statusLive', { konek: false, pesan: "Live Berakhir / OFF" });
        });

        tiktokConn.on('chat', (dataLive) => {
            io.emit('tiktokChat', { user: dataLive.nickname, message: dataLive.comment });
        });

        tiktokConn.on('gift', (dataLive) => {
            io.emit('tiktokGift', { user: dataLive.nickname, giftName: dataLive.giftName });
        });

        tiktokConn.on('member', (dataLive) => {
            io.emit('tiktokJoin', { user: dataLive.nickname });
        });
    });
});

server.listen(8091, () => { console.log('Sistem Aktif di Port 8091'); });