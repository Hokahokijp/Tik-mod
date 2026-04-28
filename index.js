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
            socket.emit('status', 'Gagal! Akun tidak Live.');
        });

        tiktokConn.on('gift', (dataLive) => {
            // LOGIKA CEK HADIAH
            let hasilCek = "";
            const { giftName, repeatCount, nickname } = dataLive;

            if (giftName === 'Rose') {
                hasilCek = repeatCount >= 10 ? `${nickname}, Jodohmu detail: Inisial A, setia, orang dekat!` : `${nickname}, Jodohmu sudah ada tapi kamu cuek.`;
            } else if (giftName === 'Donut') {
                hasilCek = repeatCount >= 5 ? `${nickname}, Rezeki detail: Bulan depan ada uang kaget melimpah!` : `${nickname}, Rezeki lancar aman terkendali.`;
            } else if (giftName === 'GG') {
                hasilCek = repeatCount >= 10 ? `${nickname}, Khodam detail: Macan Putih Prabu Siliwangi sakti!` : `${nickname}, Khodam kamu: Kelinci Hitam.`;
            } else if (giftName === 'Cornetto') { // Asmara
                hasilCek = repeatCount >= 7 ? `${nickname}, Asmara detail: Dia sangat mencintaimu dan mau serius.` : `${nickname}, Asmara: Dia lagi kangen kamu.`;
            }

            if (hasilCek) io.emit('hasilRamalan', hasilCek);
            io.emit('munculFoto', dataLive);
        });

        tiktokConn.on('chat', (dataLive) => { io.emit('chat', dataLive); });
        tiktokConn.on('member', (dataLive) => { io.emit('memberJoin', dataLive); });
        tiktokConn.on('leave', (dataLive) => { io.emit('memberLeave', dataLive); });
        tiktokConn.on('like', (dataLive) => { io.emit('munculFoto', dataLive); });
    });
});

server.listen(8091, () => { console.log('Server running on 8091'); });