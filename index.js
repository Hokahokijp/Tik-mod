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
    
    // 1. REFRESH VIEWER LIST (Atas permintaan manual frontend)
    socket.on('refreshViewerList', async () => {
        try {
            if (tiktokConn && tiktokConn.getState().isConnected) {
                let viewerList = await tiktokConn.getViewerList(); 
                socket.emit('roomUserList', viewerList);
                console.log("Daftar viewer dikirim ke frontend");
            }
        } catch (err) {
            console.log("Gagal ambil viewer list:", err);
        }
    });

    // 2. SET TARGET & KONEKSI TIKTOK
    socket.on('setTarget', (data) => {
        if (tiktokConn) tiktokConn.disconnect();
        
        tiktokConn = new WebcastPushConnection(data.user);
        
        tiktokConn.connect().then(state => {
            socket.emit('status', 'OK');
            
            // Kirim list viewer awal saat baru konek
            tiktokConn.getViewerList().then(list => {
                socket.emit('roomUserList', list);
            }).catch(e => console.log("Gagal ambil list awal"));

        }).catch(err => {
            socket.emit('status', 'Gagal! Akun tidak Live atau salah username.');
        });

        // FUNGSI KIRIM DATA KE SEMUA CLIENT
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

        // EVENT: MEMBER JOIN (Masuk Room)
        tiktokConn.on('member', (dataLive) => {
            io.emit('memberJoin', dataLive);
        });

        // EVENT: MEMBER LEAVE (Keluar Room) <-- INI YANG LU MINTA
        tiktokConn.on('leave', (dataLive) => {
            io.emit('memberLeave', {
                uniqueId: dataLive.uniqueId,
                nickname: dataLive.nickname
            });
            console.log(`${dataLive.nickname} keluar room`);
        });

        // EVENT: AKTIVITAS LAINNYA
        tiktokConn.on('chat', (dataLive) => {
            io.emit('chat', dataLive); // Kirim data chat lengkap agar google bisa baca chat-nya
        });
        
        tiktokConn.on('like', sendPhoto);
        tiktokConn.on('gift', sendPhoto);
        tiktokConn.on('share', sendPhoto);
        tiktokConn.on('follow', sendPhoto);
    });
});

const PORT = process.env.PORT || 8091;
server.listen(PORT, () => {
    console.log('Server berjalan di port ' + PORT);
});