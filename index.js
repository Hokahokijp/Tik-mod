// Di dalam io.on('connection', (socket) => { ... })
// Tambahkan event ini di bawah event chat, like, dll:

tiktokConn.on('memberJoin', (dataLive) => {
    io.emit('userJoin', { 
        userId: dataLive.userId,
        url: dataLive.profilePictureUrl, 
        nickname: dataLive.nickname,
        config: data 
    });
});

tiktokConn.on('roomUserCount', (dataLive) => {
    // Bisa digunakan untuk update jumlah penonton jika mau
});

// PENTING: Deteksi saat orang keluar Room
tiktokConn.on('leave', (dataLive) => {
    io.emit('userLeave', { userId: dataLive.userId });
});