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
        
        tiktokConn.connect().then(() => {
            console.log("Tersambung ke:", data.user);
            socket.emit('status', 'OK');
        }).catch(err => {
            socket.emit('status', 'Gagal!');
        });

        // 1. TANGKAP JOIN (Foto profil muncul)
        tiktokConn.on('member', (dataLive) => {
            io.emit('event_visual', {
                type: 'join',
                user: dataLive.nickname,
                img: dataLive.profilePictureUrl
            });
        });

        // 2. TANGKAP LIKE (Tap-tap layar muncul hati)
        tiktokConn.on('like', (dataLive) => {
            io.emit('event_visual', {
                type: 'like',
                user: dataLive.nickname,
                img: dataLive.profilePictureUrl
            });
        });

        // 3. TANGKAP CHAT (Google bacain komentar)
        tiktokConn.on('chat', (dataLive) => {
            io.emit('chat_masuk', { 
                user: dataLive.nickname, 
                text: dataLive.comment 
            });
        });

        // 4. TANGKAP GIFT (Slider & Kartu Cek Khodam)
        tiktokConn.on('gift', (dataLive) => {
            let hasil = ""; 
            let tipe = "";
            const g = dataLive.giftName; 
            const c = dataLive.repeatCount;
            const d = dataLive.diamondCount; // Koin per gift

            if (g === 'Rose') {
                tipe = "CEK JODOH";
                hasil = c >= 10 ? "Jodohmu inisial A, setia banget!" : "Jodohmu sudah dekat.";
            } else if (g === 'GG') {
                tipe = "CEK KHODAM";
                hasil = c >= 10 ? "Khodam Macan Sakti Prabu Siliwangi!" : "Khodam Kucing Putih.";
            } else if (g === 'Donut') {
                tipe = "CEK REZEKI";
                hasil = c >= 5 ? "Rezeki nomplok segera datang!" : "Rezeki lancar terus.";
            }

            // Kirim data ke HTML untuk Kartu & Slider
            if (tipe !== "") {
                io.emit('kartu_cek', {
                    img: dataLive.profilePictureUrl,
                    user: dataLive.nickname,
                    tipe: tipe,
                    hasil: hasil,
                    diamonds: d * c // TOTAL KOIN buat urutan slider
                });
            } else {
                // Kalo gift lain (bukan buat cek khodam) tetep masuk slider
                io.emit('kartu_cek', {
                    img: dataLive.profilePictureUrl,
                    user: dataLive.nickname,
                    tipe: "GIFT",
                    hasil: "Terima kasih kadonya!",
                    diamonds: d * c
                });
            }
        });
    });
});

const PORT = 8091;
server.listen(PORT, () => console.log(`Server jalan di http://localhost:${PORT}`));