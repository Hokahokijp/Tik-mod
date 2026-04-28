const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/', (req, res) => { res.sendFile(__dirname + '/index.html'); });

let tiktokConn;

io.on('connection', (socket) => {
    socket.on('setTarget', (data) => {
        if (tiktokConn) tiktokConn.disconnect();
        tiktokConn = new WebcastPushConnection(data.user);
        tiktokConn.connect().then(() => socket.emit('status', 'OK'));

        // Bubble Join & Like
        tiktokConn.on('member', (dataLive) => {
            io.emit('event_visual', { type: 'join', img: dataLive.profilePictureUrl });
        });
        tiktokConn.on('like', (dataLive) => {
            io.emit('event_visual', { type: 'like', img: dataLive.profilePictureUrl });
        });
        tiktokConn.on('chat', (dataLive) => {
            io.emit('chat_masuk', { user: dataLive.nickname, text: dataLive.comment });
        });

        // Gift masuk Slider & Kartu
        tiktokConn.on('gift', (dataLive) => {
            const g = dataLive.giftName; const c = dataLive.repeatCount; const d = dataLive.diamondCount;
            let hasil = (g === 'Rose') ? "Jodohmu inisial A" : (g === 'GG') ? "Khodam Macan Putih" : "Terima Kasih!";
            let tipe = (g === 'Rose') ? "CEK JODOH" : (g === 'GG') ? "CEK KHODAM" : "GIFT";

            io.emit('kartu_cek', {
                img: dataLive.profilePictureUrl,
                user: dataLive.nickname,
                tipe: tipe,
                hasil: hasil,
                diamonds: d * c
            });
        });
    });
});

server.listen(8091, () => console.log('Server Ready Port 8091'));