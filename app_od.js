//inisisalisai variable
const {
    Client,
    LocalAuth
} = require('whatsapp-web.js');
const qrcode_terminal = require('qrcode-terminal');
const qrcode = require('qrcode');
const express = require("express");
const socketIO = require("socket.io");
const app = express();
const http = require("http");
const {response} = require('express');
const port = process.env.PORT || 8989;
const server = http.createServer(app);
const io = socketIO(server);
const fs = require('fs');
var favicon = require('serve-favicon');
var path = require('path');

var login = false;


app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));
const myCustomId = 'asedasda'
var authStrategy = new LocalAuth({
    clientId: myCustomId,
})
const client = new Client({
    restartOnAuthFail: true,
    puppeteer: {
         headless: true,
         args: [
             '--no-sandbox',
             '--disable-setuid-sandbox',
             '--disable-dev-shm-usage',
             '--disable-accelerated-2d-canvas',
             '--no-first-run',
             '--no-zygote',
            //  '--single-process', // <- this one doesn't works in Windows
             '--disable-gpu'
         ],
     },
    authStrategy
});

const worker = `${authStrategy.dataPath}/session-${myCustomId}/Default/Service Worker`
if (fs.existsSync(worker)) {
    fs.rmdirSync(worker, {
        recursive: true
    })
}

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    // qrcode_terminal.generate(qr, {
    //     small: true
    // });
});

client.on('ready', () => {
    login = true;
    console.log("Status Auth :  "+login);
    console.log('Client is ready!');


});

client.on('message', message => {
    if (
        message.body === "Assalamu'alaikum" || 
        message.body === "Assalamualaikum" || 
        message.body === "Mas" || 
        message.body === "mas" ||
        message.body === "Den" ||
        message.body === "den"
        ) {
            if (message.body == "Mas" || message.body == "mas" || message.body === "den" || message.body === "Den") {
                message.reply('Iya, mohon ditunggu saya akan segera membalas');
            }else{
                message.reply('*Waalaikumsalam*, mohon ditunggu saya akan segera membalas');
            }
        //client.sendMessage("62895804190103@c.us", "Hallo");
    }
});


var rimraf = require("rimraf");
// rimraf(".wwebjs_auth", function () {
//     console.log("done");
// });

client.on('disconnected', (reason) => {
    // Destroy and reinitialize the client when disconnected
    
    rimraf(".wwebjs_auth", function () {
        console.log("done");
    });
    login = false;
    console.log("Status Auth :  "+login);
    client.destroy();
    client.initialize();
});

//HTML -------------------------------------------------------------------------------------
app.get("/", (req, res) => {
    res.sendFile("index.html", {
        root: __dirname
    });
});
app.use(favicon(path.join(__dirname, '/', 'favicon.ico')))
// -----------------------------------------------------------------------------------------
// API -------------------------------------------------------------------------------------
app.get('/send-message', (req, res) => {
    const checkRegistered = async function (number) {
        const isRegistered = await client.isRegisteredUser(number)
        return isRegistered;
    }


    var number = req.query.number;
    var message = req.query.msg;
    message = message.split('{ENTER}').join('%0a');
    // var number = "62895804190103@c.us";
    // var message = "Tes Api Wa";
    //Tes %0a Api Wa %0a = break
    const isRegisteredNumber = checkRegistered(number)

    if (!isRegisteredNumber) {
        return res.status(422).json({
            status: false,
            message: "Nomor tidak terdaftar"
        })
    }
    client.sendMessage(number, message).then(response => {
        res.status(200).json({
            status: true,
            response: response
        })
    }).catch(err => {
        res.status(500).json({
            status: false,
            response: err
        })
    });
});
app.get('/close', (req, res) => {
    server.close();
});

app.get('/check-auth', (req, res) => {
    var auth = 0;
    fs.readFile('auth.txt', 'utf8', function (err, data) {
        // Display the file content
        if(data == "1"){
            auth = client.info;
        }
        res.status(200).json({
            status: true,
            response: auth
        });
    });

    
});

// -----------------------------------------------------------------------------------------

// IO --------------------------------------------------------------------------------------
io.on('connection', function (socket) {

    socket.emit('message', 'Connecting...');
    if(login){
        socket.emit('message', 'Whatsapp is ready!');
    }else{
        client.on('qr', (qr) => {
            console.log('QR RECEIVED', qr);
            qrcode.toDataURL(qr, (err, url) => {
                socket.emit('qr', url);
                socket.emit('message', 'QR Code received, scan please!');
            });
        });
    }
    

    client.on('ready', () => {
        login = true;
        saveAuth("1");
        console.log("Status Auth :  "+login);
        socket.emit('ready', 'Whatsapp is ready!');
        socket.emit('message', 'Whatsapp is ready!');
        pusher(client.info);

    });

    client.on('authenticated', () => {
        socket.emit('authenticated', 'Whatsapp is authenticated!');
        socket.emit('message', 'Whatsapp is authenticated!');
        console.log('AUTHENTICATED');
    });

    client.on('auth_failure', function (session) {
        socket.emit('message', 'Auth failure, restarting...');
    });

    client.on('disconnected', (reason) => {
        login = false;
        console.log("Status Auth :  " + login);
        socket.emit('message', 'Whatsapp is disconnected!');
        saveAuth("0");
        pusher()
        client.destroy();
        client.on('qr', (qr) => {
            console.log('QR RECEIVED', qr);
            qrcode.toDataURL(qr, (err, url) => {
                socket.emit('qr', url);
                socket.emit('message', 'QR Code received, scan please!');
            });
        });
        client.initialize();
    });
});
// ------------------------------------------------------------------------------------------

process.setMaxListeners(0);
server.listen(port, function () {
    client.initialize();
    console.log("App running ... ");
});



function pusher(info = null){
    console.log(info);
    // Enable pusher logging - don't include this in production
    
    var Pusher = require("pusher");
    
    var pusher = new Pusher({
        appId: "1427451",
        key: "58eafcd4dda22b156f9f",
        secret: "4db0ea9e6d8b330032f0",
        cluster: "ap1",
    });
    
    Pusher.logToConsole = true;

    pusher.trigger("my-channel", "my-event",info);
}
function saveAuth(text){
    const fs = require('fs');

    fs.writeFile("./auth.txt", String(text), function (err) {
        if (err) {
            return console.log(err);
        }
        console.log("The file was saved!");
    });
}