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

        tiktokConn.on('member', (dataLive) => {
            io.emit('event_visual', { type: 'join', user: dataLive.nickname, img: dataLive.profilePictureUrl });
        });

        tiktokConn.on('like', (dataLive) => {
            io.emit('event_visual', { type: 'like', user: dataLive.nickname, img: dataLive.profilePictureUrl });
        });

        tiktokConn.on('chat', (dataLive) => {
            io.emit('chat_masuk', { user: dataLive.nickname, text: dataLive.comment });
        });

        tiktokConn.on('gift', (dataLive) => {
            let hasil = ""; let tipe = "";
            const g = dataLive.giftName; 
            const c = dataLive.repeatCount;
            const d = dataLive.diamondCount; // Ambil koin kado

            if (g === 'Rose') {
                tipe = "CEK JODOH";
                hasil = c >= 10 ? "Jodohmu inisial A, setia banget!" : "Jodohmu sudah dekat.";
            } else if (g === 'GG') {
                tipe = "CEK KHODAM";
                hasil = c >= 10 ? "Khodam Macan Sakti Prabu Siliwangi!" : "Khodam Kucing Putih.";
            }

            if (tipe) {
                io.emit('kartu_cek', {
                    img: dataLive.profilePictureUrl,
                    user: dataLive.nickname,
                    tipe: tipe,
                    hasil: hasil,
                    diamonds: d * c // Kirim total koin ke slider
                });
            }
        });
    });
});

server.listen(8091, () => console.log('Server Ready Port 8091'));