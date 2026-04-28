const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.get('/', (req, res) => { res.sendFile(__dirname + '/index.html'); });

let tiktokConn;

io.on('connection', (socket) => {
    socket.on('setTarget', (data) => {
        if (tiktokConn) tiktokConn.disconnect();
        tiktokConn = new WebcastPushConnection(data.user);
        
        tiktokConn.connect().then(() => {
            socket.emit('status', 'CONNECTED');
        }).catch(() => {
            socket.emit('status', 'ERROR');
        });

        // TANGKAP KOMENTAR - LANGSUNG LEMPAR KE FRONTEND
        tiktokConn.on('chat', (dataLive) => {
            io.emit('chat_masuk', {
                user: dataLive.nickname,
                text: dataLive.comment
            });
        });

        // TANGKAP GIFT - CEK KHODAM
        tiktokConn.on('gift', (dataLive) => {
            let hasil = "";
            let tipe = "";
            const g = dataLive.giftName;
            const c = dataLive.repeatCount;

            if (g === 'Rose') {
                tipe = "CEK JODOH";
                hasil = c >= 10 ? "Jodohmu inisial A, orangnya setia banget!" : "Jodohmu sudah sangat dekat.";
            } else if (g === 'GG') {
                tipe = "CEK KHODAM";
                hasil = c >= 10 ? "Khodam Macan Sakti Prabu Siliwangi!" : "Khodam Kucing Putih Lucu.";
            } else if (g === 'Donut') {
                tipe = "CEK REZEKI";
                hasil = c >= 5 ? "Rezeki nomplok bakal datang besok pagi!" : "Rezeki lancar kayak air.";
            }

            if (tipe) {
                io.emit('kartu_cek', {
                    img: dataLive.profilePictureUrl,
                    user: dataLive.nickname,
                    tipe: tipe,
                    hasil: hasil
                });
            }
        });
    });
});

server.listen(8091, () => { console.log('Server Tikfinity-Style 8091'); });