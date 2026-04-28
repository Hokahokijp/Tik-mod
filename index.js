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
            socket.emit('status', 'OK');
        }).catch(err => {
            socket.emit('status', 'Gagal!');
        });

        // SETIAP CHAT MASUK KIRIM KE FRONTEND
        tiktokConn.on('chat', (dataLive) => {
            io.emit('chat', {
                nickname: dataLive.nickname,
                comment: dataLive.comment
            });
        });

        // LOGIKA CEK HADIAH (KHODAM, JODOH, DLL)
        tiktokConn.on('gift', (dataLive) => {
            let hasilCek = "";
            let tipe = "";
            const g = dataLive.giftName;
            const c = dataLive.repeatCount;

            if (g === 'Rose') {
                tipe = "CEK JODOH";
                hasilCek = c >= 10 ? "Detail: Jodohmu inisial A, orang dekat, setia!" : "Singkat: Jodoh sudah dekat.";
            } else if (g === 'Donut') {
                tipe = "CEK REZEKI";
                hasilCek = c >= 5 ? "Detail: Rezeki besar menanti bulan depan!" : "Singkat: Rezeki lancar.";
            } else if (g === 'GG') {
                tipe = "CEK KHODAM";
                hasilCek = c >= 10 ? "Detail: Khodam Macan Putih Sakti Siliwangi!" : "Singkat: Khodam Kucing Putih.";
            }

            if (tipe !== "") {
                io.emit('hasilCekKartu', { 
                    url: dataLive.profilePictureUrl, 
                    nickname: dataLive.nickname, 
                    tipe: tipe,
                    hasil: hasilCek
                });
            }
        });
    });
});

server.listen(8091, () => { console.log('Server running on 8091'); });