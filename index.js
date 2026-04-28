const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/', (req, res) => { res.sendFile(__dirname + '/index.html'); });

let tiktokConn;
let targetUser = "";

function connectTikTok(username) {
    if (tiktokConn) {
        tiktokConn.removeAllListeners();
        tiktokConn.disconnect();
    }
    targetUser = username;
    tiktokConn = new WebcastPushConnection(username);

    tiktokConn.connect().then(state => {
        console.log(`BISMILLAH GACOR: ${username}`);
    }).catch(err => {
        setTimeout(() => connectTikTok(targetUser), 3000);
    });

    tiktokConn.on('member', (data) => io.emit('memberJoin', data));
    tiktokConn.on('chat', (data) => io.emit('chat', data));
    tiktokConn.on('gift', (data) => {
        io.emit('munculFoto', { ...data, url: data.profilePictureUrl });
    });
    tiktokConn.on('leave', (data) => io.emit('memberLeave', { uniqueId: data.uniqueId }));
    tiktokConn.on('disconnected', () => setTimeout(() => connectTikTok(targetUser), 2000));
}

io.on('connection', (socket) => {
    socket.on('setTarget', (data) => connectTikTok(data.user));
});

server.listen(8091, () => { console.log('SERVER BUBBLE CHAT READY DI 8091'); });