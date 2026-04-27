const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/panel-admin', (req, res) => {
    res.sendFile(__dirname + '/Panel-1990-aa.html');
});

let tiktokConn;

io.on('connection', (socket) => {
    console.log('User Konek ke Server');

    socket.on('setTarget', (data) => {
        if (tiktokConn) tiktokConn.disconnect();
        
        tiktokConn = new WebcastPushConnection(data.user);
        
        tiktokConn.connect().then(state => {
            socket.emit('status', 'OK');
            
            // Ambil viewer yang udah ada di room saat konek
            tiktokConn.getViewerList().then(list => {
                socket.emit('roomUserList', list);
            }).catch(e => console.log("Gagal ambil list awal"));

        }).catch(err => {
            socket.emit('status', 'Gagal! Akun tidak Live atau salah username.');
        });

        // --- EVENT TIKTOK KE FRONTEND ---

        // Member Masuk
        tiktokConn.on('member', (dataLive) => {
            io.emit('memberJoin', dataLive);
        });

        // Member Keluar (Hapus Foto)
        tiktokConn.on('leave', (dataLive) => {
            io.emit('memberLeave', {
                uniqueId: dataLive.uniqueId
            });
        });

        // Chat Google Baca
        tiktokConn.on('chat', (dataLive) => {
            io.emit('chat', dataLive);
        });

        // Gift / Saweran
        tiktokConn.on('gift', (dataLive) => {
            io.emit('munculFoto', {
                ...dataLive,
                url: dataLive.profilePictureUrl,
                // Hitung total diamond kalau multi-gift
                diamondCount: (dataLive.diamondCount || 0) * (dataLive.repeatCount || 1)
            });
        });

        // Like, Share, Follow
        tiktokConn.on('like', (dataLive) => io.emit('activity', { ...dataLive, type: 'like' }));
        tiktokConn.on('share', (dataLive) => io.emit('activity', { ...dataLive, type: 'share' }));
        tiktokConn.on('follow', (dataLive) => io.emit('activity', { ...dataLive, type: 'follow' }));

        tiktokConn.on('error', (err) => console.log('Tiktok Error:', err));
    });
});

const PORT = process.env.PORT || 8091;
server.listen(PORT, () => {
    console.log('Server Full Speed di Port ' + PORT);
});