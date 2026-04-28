const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public')); // Folder untuk file html

io.on('connection', (socket) => {
    let tiktokConn;

    socket.on('setTarget', (data) => {
        if (tiktokConn) tiktokConn.disconnect();
        tiktokConn = new WebcastPushConnection(data.user);

        tiktokConn.connect().then(state => {
            socket.emit('status', 'Berhasil Konek ke ' + data.user);
        }).catch(err => {
            socket.emit('status', 'Gagal: Akun tidak Live.');
        });

        tiktokConn.on('gift', (dataLive) => {
            const { nickname, giftName, repeatCount, uniqueId } = dataLive;
            let hasil = { user: nickname, tipe: "", pesan: "", detail: false };

            // LOGIKA CEK JODOH (1 MAWAR & 10 MAWAR)
            if (giftName === 'Rose') {
                hasil.tipe = "CEK JODOH";
                if (repeatCount >= 10) {
                    hasil.pesan = "Jodohmu adalah inisial 'S', tinggal di Jawa Barat, sifatnya penyayang dan segera bertemu bulan depan!";
                    hasil.detail = true;
                } else {
                    hasil.pesan = "Jodohmu sudah dekat, tapi kamu masih sering cuek.";
                }
            }
            
            // LOGIKA CEK KHODAM (1 GG & 10 GG)
            else if (giftName === 'GG') {
                hasil.tipe = "CEK KHODAM";
                if (repeatCount >= 10) {
                    hasil.pesan = "Khodam: MACAN PUTIH PRABU SILIWANGI. Power: 100%. Melindungimu dari energi negatif.";
                    hasil.detail = true;
                } else {
                    hasil.pesan = "Khodam: Kucing Oren Sakti. Power: 10%.";
                }
            }

            // LOGIKA CEK REZEKI (1 DONAT & 5 DONAT)
            else if (giftName === 'Donut') {
                hasil.tipe = "CEK REZEKI";
                if (repeatCount >= 5) {
                    hasil.pesan = "Rezeki Gede! Akan ada proyek besar atau hadiah tak terduga dalam 7 hari ke depan.";
                    hasil.detail = true;
                } else {
                    hasil.pesan = "Rezeki lancar, jangan lupa sedekah.";
                }
            }

            if (hasil.tipe !== "") {
                io.emit('showResult', hasil);
            }
        });
    });
});

server.listen(8091, () => console.log('Web Cek Khodam running on port 8091'));