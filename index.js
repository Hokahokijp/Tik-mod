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

        tiktokConn.connect().then(state => {
            socket.emit('status', 'Tersambung ke Live!');
        }).catch(err => {
            socket.emit('status', 'Gagal Konek! Cek Username.');
        });

        // LOGIKA CEK OTOMATIS BERDASARKAN GIFT
        tiktokConn.on('gift', (dataLive) => {
            let responseTTS = "";
            const name = dataLive.nickname;
            const gift = dataLive.giftName;
            const count = dataLive.repeatCount;

            // 1. CEK JODOH (MAWAR / ROSE)
            if (gift === 'Rose') {
                if (count >= 10) {
                    responseTTS = `Cek Jodoh Detail untuk ${name}: Jodohmu inisial A, orangnya setia dan ada di kota sebelah.`;
                } else {
                    responseTTS = `Cek Jodoh singkat untuk ${name}: Jodohmu sudah dekat, sering-seringlah menoleh.`;
                }
            }
            // 2. CEK REZEKI (DONUT)
            else if (gift === 'Donut') {
                if (count >= 5) {
                    responseTTS = `Cek Rezeki Detail untuk ${name}: Saldo melimpah bulan depan, usaha lancar jaya!`;
                } else {
                    responseTTS = `Cek Rezeki untuk ${name}: Rezeki lancar seumpama air mengalir.`;
                }
            }
            // 3. CEK KHODAM (GG)
            else if (gift === 'GG') {
                if (count >= 10) {
                    responseTTS = `Khodam Premium ${name}: Macan putih sakti dari gunung merapi pendamping dirimu.`;
                } else {
                    responseTTS = `Khodam ${name}: Khodam kelinci lincah selalu menjagamu.`;
                }
            }

            if (responseTTS) io.emit('autoTTS', responseTTS);
            io.emit('munculFoto', dataLive);
        });

        tiktokConn.on('chat', (dataLive) => { io.emit('chat', dataLive); });
        tiktokConn.on('member', (dataLive) => { io.emit('memberJoin', dataLive); });
        tiktokConn.on('like', (dataLive) => { io.emit('like', dataLive); });
    });
});

const PORT = 8091;
server.listen(PORT, () => { console.log('Server berjalan di port ' + PORT); });