const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const { WebcastPushConnection } = require('tiktok-live-connector');

app.use(express.static('public'));

io.on('connection', (socket) => {
    let tiktokConn;

    socket.on('setTarget', (config) => {
        if (tiktokConn) tiktokConn.disconnect();

        tiktokConn = new WebcastPushConnection(config.user);

        tiktokConn.connect().then(state => {
            console.log(`Connected to ${state.roomId}`);
        }).catch(err => {
            console.error('Failed to connect', err);
        });

        tiktokConn.on('gift', (data) => {
            io.emit('munculFoto', {
                url: data.profilePictureUrl,
                nickname: data.nickname,
                giftName: data.giftName,
                diamondCount: data.diamondCount,
                config: config
            });
        });

        tiktokConn.on('chat', (data) => {
            io.emit('chat', {
                nickname: data.nickname,
                comment: data.comment
            });
        });
    });

    socket.on('disconnect', () => {
        if (tiktokConn) tiktokConn.disconnect();
    });
});

http.listen(3000, () => {
    console.log('Server running on port 3000');
});