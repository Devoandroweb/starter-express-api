const {
    Client, LocalAuth
} = require('whatsapp-web.js');
var favicon = require('serve-favicon');
var path = require('path');
const fs = require('fs');
const qrcode = require('qrcode');
const express = require("express");
const app = express();
const socketIO = require("socket.io");
const http = require("http");
const server = http.createServer(app);
const io = socketIO(server);
const port = process.env.PORT || 8888
app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));

const SESSION_FILE_PATH = './session.json';
let sessionData;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionData = require(SESSION_FILE_PATH);
}

// Use the saved values
const client = new Client({
    authStrategy: new LocalAuth(),
        puppeteer: {
            headless: false,
        }
});

// Save session values to the file upon successful auth
client.on('authenticated', (session) => {
    sessionData = session;
        console.log('Session', sessionData);

    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), (err) => {
        if (err) {
            console.error(err);
        }
    });
});


app.get("/", (req, res) => {
    res.sendFile("index.html", {
        root: __dirname
    });
});
app.use(favicon(path.join(__dirname, '/', 'favicon.ico')))
client.on('message', msg => {
    if (msg.body == 'mas') {
        msg.reply('sedang sibuk mohon tunggu ... *[Bot Whatsapp by Rossi]*');
    }
});

client.initialize();
process.setMaxListeners(0);
io.on('connection', function (socket) {
    socket.emit('message', 'Connecting ... ');

    client.on('ready', () => {
        socket.emit('ready', 'Whatsapp is ready!');
        socket.emit('message', 'Whatsapp is ready!');
    });

    client.on('authenticated', (session) => {
        socket.emit('ready', 'Whatsapp is authenticated!');
        socket.emit('message', 'Whatsapp is authenticated!');
    });
});

//API WA
app.post('/send-message', (req, res) => {
    const number = req.body.number;
    const message = req.body.message;
    for (var i = 0; i < 3; i++) {
        client.sendMessage(number, message).then(response => {
            res.status(200).json({
                status: true,
                response: response
            });
        }).catch(err => {
            res.status(500).json({
                status: false,
                response: err
            });
        });
    };

});

server.listen(port, function () {
    console.log("App running ... ");
});