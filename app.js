//inisisalisai variable
const {
    Client,
    LocalAuth
} = require('whatsapp-web.js');
const qrcode_terminal = require('qrcode-terminal');
const qrcode = require('qrcode');
const express = require("express");
var bodyParser = require('body-parser')
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
var _SESSION_AUTH = [];


// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
    extended: true
}));
// parse application/json
app.use(bodyParser.json());
//-------------------------------------------------------------
// const clientSession = createSession("123")

var clientSession = [] 

var rimraf = require("rimraf");
const { info } = require('console');
// -- CHECK SESSION AUTH ---
// membaca text
fs.readFile('./auth.txt', 'utf8', (err, data) => {
    if (err) {
        console.error(err);
        return;
    }
    _SESSION_AUTH = JSON.parse(data);
    
});
fs.readFile('./auth.txt', 'utf8', (err, data) => {
    if (err) {
        console.error(err);
        return;
    }
    _SESSION_AUTH = JSON.parse(data);
    
});
var keyClient = [];
fs.readFile('./all-secret-key.txt', 'utf8', (err, data) => {
    if (err) {
        console.error(err);
        return;
    }
    keyClient = JSON.parse(data);
    
});

keyClient.forEach(value => {
    var logginStatus = false
    var clientInfo = [];
    var clientAuth = searchInObject(_SESSION_AUTH,"key",value);
    if(clientAuth){
        if(clientAuth.auth == "1"){
            logginStatus = true
            var index = _SESSION_AUTH.findIndex((obj => obj.key == value))
            clientInfo = _SESSION_AUTH[index].data
        }
    }
    clientSession.push(
        {key:value,data:clientInfo,driver:createSession(value,io,"",""),login:logginStatus}
    )
});

function createSession(id,io,label,number){
    var login = false;
    const myCustomId = id
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

    // const worker = `${authStrategy.dataPath}/session-${myCustomId}/Default/Service Worker`
    // if (fs.existsSync(worker)) {
    //     fs.rmdirSync(worker, {
    //         recursive: true
    //     })
    // }
    
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

    client.initialize()
    // IO ---   -----------------------------------------------------------------------------------
    io.emit('message-'+id, 'Connecting...');
        if(searchInObject(clientSession,"login",id)){
            io.emit('message-'+id, {id:id,msg:'Whatsapp is ready!'});
        }else{
            client.on('qr', (qr) => {
                console.log('Client', id);
                qrcode.toDataURL(qr, (err, url) => {
                    io.emit('qr-'+id, {id:id,src:url});
                    io.emit('message-'+id, {id:id,msg:'QR Code received, scan please!'});
                });
            });
        }
        

        client.on('ready', () => {
            var index = clientSession.findIndex((obj => obj.key == id))
            console.log(id);
            console.log(index);
            clientSession[index].data = JSON.stringify(client.info) ;
            clientSession[index].login = true;
            updateAuth(id,"1",JSON.stringify(client.info));
            console.log("Status Auth :  "+clientSession[index].login);
            io.emit('ready-'+id, {id:id});
            io.emit('message-'+id, {id:id,msg:'Whatsapp is ready!'});
            pusher(client.info);
            // console.log(clientSession);
        });

        client.on('authenticated', () => {
            io.emit('authenticated-'+id, {id:id,msg:'Whatsapp is authenticated!'} );
            io.emit('message-'+id, {id:id,msg:'Whatsapp is authenticated!'});
            console.log('AUTHENTICATED');
        });

        client.on('auth_failure', function (session) {
            io.emit('message-'+id,  {id:id,msg:'Auth failure, restarting...'});
        });

        client.on('disconnected', (reason) => {
            var index = clientSession.findIndex((obj => obj.key == id))
            clientSession[index].login = false;
            console.log("Status Auth :  " + clientSession[index].login);
            io.emit('message-'+id, {id:id,msg:'Whatsapp is disconnected!'});
            updateAuth(id,"0");
            pusher()
            client.destroy();
            client.on('qr', (qr) => {
                console.log('QR RECEIVED', qr);
                qrcode.toDataURL(qr, (err, url) => {
                    io.emit('qr-'+id, {id:id,src:url});
                    io.emit('message-'+id, {id:id,msg:'QR Code received, scan please!'});
                });
            });
            client.initialize();
        });
    // ------------------------------------------------------------------------------------------
    if(!inObject(id,_SESSION_AUTH,"key")){
        saveAuth(label,number,id,"0");
    }
    return client;
}




//HTML -------------------------------------------------------------------------------------
app.get("/", (req, res) => {
    var device = null;
    var id = req.query.id;
    fs.readFile('auth.txt', 'utf8', function (err, data) {
        if (err) {
            console.error(err);
            return;
        }
        device = JSON.parse(data);
        console.log(device);
        if(inObject(id,device,"key")){
            res.sendFile("index.html", {
                root: __dirname
            });
        }else{
            res.sendFile("not-found.html", {
                root: __dirname
            });
        }
    });
    
});
app.use(favicon(path.join(__dirname, '/', 'favicon.ico')))
app.use('/images', express.static('images'));
// -----------------------------------------------------------------------------------------
// API -------------------------------------------------------------------------------------
app.get('/send-message', (req, res) => {
    
    var number = req.query.number;
    var message = req.query.msg;
    var key = req.query.key;
    // get driver
    var index = clientSession.findIndex((obj => obj.key == key))
    var driver = clientSession[index].driver

    const checkRegistered = async function (number) {
        const isRegistered = await driver.isRegisteredUser(number)
        return isRegistered;
    }

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
    driver.sendMessage(number, message).then(response => {
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
    var key = req.query.key;

    fs.readFile('auth.txt', 'utf8', function (err, data) {
        // Display the file content
        var sessionAuth = JSON.parse(data);
        var auth = [];
        if(inObject(key,sessionAuth,"key")){
            //cari index
            var index = sessionAuth.findIndex((obj => obj.key == key))
            auth = sessionAuth[index].data;
        }
        
        res.status(200).json({
            status: true,
            response: JSON.parse(auth)
        });
    });
});
app.get('/all-device', (req, res) => {

    fs.readFile('auth.txt', 'utf8', function (err, data) {

        res.status(200).json({
            status: true,
            response: JSON.parse(data)
        });
    });
});
app.post('/add-device', (req, res) => {
    console.log(req.body);
    var clientInfo = [];
    var key = req.body.key;
    var label = req.body.label;
    var number = req.body.number;
    clientSession.push(
        {key:key,data:clientInfo,driver:createSession(key,io,label,number),login:false}
    )
    keyClient.push(key)
    fs.writeFile("./all-secret-key.txt", String(JSON.stringify(keyClient)), function (err) {
        if (err) {
            return console.log(err);
        }
    });
    fs.readFile('auth.txt', 'utf8', function (err, data) {
        
        res.status(200).json({
            status: true,
            response: JSON.parse(data)
        });
    });
});
app.get('/remove-device', (req, res) => {
    console.log(LocalAuth);
    var key = req.query.id;
    if(removeInObject(_SESSION_AUTH,"key",key)){
        removeInObject(clientSession,"key",key)
        removeInObject(_SESSION_AUTH,"key",key)
        // menulis text
        // LocalAuth.
        fs.writeFile("./auth.txt", String(JSON.stringify(_SESSION_AUTH)), function (err) {
            if (err) {
                return console.log(err);
            }
        });
        keyClient = removeInArray(keyClient);
        fs.writeFile("./all-secret-key.txt", String(JSON.stringify(keyClient)), function (err) {
            if (err) {
                return console.log(err);
            }
        });
        res.status(200).json({
            status: true,
            response: _SESSION_AUTH
        });
    }else{
        res.status(200).json({
            status: false,
            response: "Failed Delete",
            data:_SESSION_AUTH
        });
    }
});
// -----------------------------------------------------------------------------------------



process.setMaxListeners(0);
server.listen(port, function () {
    
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
function saveAuth(label = "",number = "",id,auth,info = []){
    var dataAuth = {
        label:label,
        number:number,
        key:id,
        data:info,
        auth:auth
    }
    //cek key in json
    if(!inObject(id,_SESSION_AUTH,"key")){
        _SESSION_AUTH.push(dataAuth)
    }
    // menulis text
    fs.writeFile("./auth.txt", String(JSON.stringify(_SESSION_AUTH)), function (err) {
        if (err) {
            return console.log(err);
        }
    });
    // console.log("save auth : ",_SESSION_AUTH)
    
}
function updateAuth(id,auth,info = []){

    //cek key in json
    if(inObject(id,_SESSION_AUTH,"key")){
        var index = _SESSION_AUTH.findIndex((obj => obj.key == id))
        var user = JSON.parse(info);
        _SESSION_AUTH[index].number = user.me.user;
        _SESSION_AUTH[index].auth = auth;
        _SESSION_AUTH[index].data = info;

    }
    // menulis text
    fs.writeFile("./auth.txt", String(JSON.stringify(_SESSION_AUTH)), function (err) {
        if (err) {
            return console.log(err);
        }
    });
    // console.log("update auth : ",_SESSION_AUTH)
}
function searchInObject(arrayObject,key,key_value){
    //Find index of specific object using findIndex method.    
    
    var objIndex = arrayObject.findIndex((obj => obj[key] == key_value));
    if(objIndex == -1){
        return false;
    }
    return arrayObject[objIndex];
}
function inObject(value, arrayOject, key) {
    for(var i = 0; i < arrayOject.length; i++) {
        if(arrayOject[i][key] == value) return true;
    }
    return false;
}
function removeInObject(arrayObject,key,key_value){
    //Find index of specific object using findIndex method.    
    var objIndex = arrayObject.findIndex((obj => obj[key] == key_value));
    if(objIndex != -1){
        arrayObject.splice(objIndex,1);
        return true;
    }
    return false;
}
function removeInArray(array = [],value){
    var index = array.indexOf(value)
    if(index > -1){
        array.splice(index,1)
    }
    return array;
}