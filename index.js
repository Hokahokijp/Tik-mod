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
    
    // --- 1. FUNGSI UNTUK REFRESH VIEWER (PASANG DI SINI) ---
    socket.on('refreshViewerList', async () => {
        try {
            // Pastikan koneksi tiktok sudah ada
            if (tiktokConn && tiktokConn.getState().isConnected) {
                // Ambil daftar penonton aktif
                let viewerList = await tiktokConn.getViewerList(); 
                
                // Kirim balik ke frontend (index.html)
                socket.emit('roomUserList', viewerList);
                console.log("Daftar viewer berhasil dikirim ke frontend");
            }
        } catch (err) {
            console.log("Gagal ambil viewer list (Mungkin fitur ini dibatasi TikTok):", err);
        }
    });

    // --- 2. FUNGSI SET TARGET (KODE LAMA LU) ---
    socket.on('setTarget', (data) => {
        if (tiktokConn) tiktokConn.disconnect();
        
        tiktokConn = new WebcastPushConnection(data.user);
        
        tiktokConn.connect().then(state => {
            socket.emit('status', 'OK');
            
            // Otomatis kirim viewer list pas baru berhasil konek
            tiktokConn.getViewerList().then(list => {
                socket.emit('roomUserList', list);
            }).catch(e => console.log("Gagal ambil list awal"));

        }).catch(err => {
            socket.emit('status', 'Gagal! Akun tidak Live atau salah username.');
        });

        const sendPhoto = (dataLive) => {
            io.emit('munculFoto', { 
                url: dataLive.profilePictureUrl, 
                nickname: dataLive.nickname, 
                uniqueId: dataLive.uniqueId, 
                giftName: dataLive.giftName || null,
                diamondCount: dataLive.diamondCount || 0,
                config: data 
            });
        };

        tiktokConn.on('chat', sendPhoto);
        tiktokConn.on('like', sendPhoto);
        tiktokConn.on('gift', sendPhoto);
        tiktokConn.on('share', sendPhoto);
        tiktokConn.on('follow', sendPhoto);
        
        // Tambahan: Jika ada member join saat live berlangsung
        tiktokConn.on('member', (dataLive) => {
            io.emit('memberJoin', dataLive);
        });
    });
});

const PORT = process.env.PORT || 8091;
server.listen(PORT, () => {
    console.log('Server berjalan di port ' + PORT);
});