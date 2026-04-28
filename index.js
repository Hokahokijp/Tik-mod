const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/', (req, res) => { res.sendFile(__dirname + '/index.html'); });
app.get('/panel-admin', (req, res) => { res.sendFile(__dirname + '/Panel-1990-aa.html'); });

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

        const sendPhoto = (dataLive) => {
            let hasilCek = "";
            let tipe = "";
            const g = dataLive.giftName;
            const c = dataLive.repeatCount;

            // LOGIKA SESUAI PERINTAH LO
            if (g === 'Rose') {
                tipe = "CEK JODOH";
                hasilCek = c >= 10 ? "Detail: Jodohmu inisial A, orang dekat, setia!" : "Singkat: Jodoh sudah dekat.";
            } else if (g === 'Donut') {
                tipe = "CEK REZEKI";
                hasilCek = c >= 5 ? "Detail: Rezeki besar menanti bulan depan!" : "Singkat: Rezeki lancar.";
            } else if (g === 'GG') {
                tipe = "CEK KHODAM";
                hasilCek = c >= 10 ? "Detail: Khodam Macan Putih Sakti Siliwangi!" : "Singkat: Khodam Kucing Putih.";
            } else if (g === 'Aku Cinta Kamu' || g === 'Cornetto') {
                tipe = "CEK ASMARA";
                hasilCek = c >= 7 ? "Detail: Pasanganmu sangat serius mau menikah!" : "Singkat: Dia rindu kamu.";
            } else if (g === 'Ros') { // Pengecekan Keuangan
                tipe = "CEK KEUANGAN";
                hasilCek = c >= 5 ? "Detail: Tabungan akan naik drastis tahun ini!" : "Singkat: Keuangan aman.";
            }

            io.emit('munculFoto', { 
                url: dataLive.profilePictureUrl, 
                nickname: dataLive.nickname, 
                tipe: tipe,
                hasil: hasilCek,
                isGift: !!hasilCek 
            });
        };

        tiktokConn.on('chat', (dataLive) => { io.emit('chat', dataLive); });
        tiktokConn.on('gift', sendPhoto);
    });
});

server.listen(8091, () => { console.log('Server running on 8091'); });