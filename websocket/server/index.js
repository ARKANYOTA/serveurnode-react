const http = require('http').createServer();
const express = require('express');
const bodyParser = require("body-parser");
const fs = require("fs");
//const router = express.Router();
const app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
const io = require('socket.io')(http, {cors: {origin: "*"}});

////////////////////////////////////////////:
//          COMMENTS INFOS
/*//////////////////////////////////////////:
Express:
-[x] register: post{id, password} -> {status: int, message: string} // Add data[id] = {id, password}
- login: post{sock_id, id, password} -> {status: int, message: string} // Add in_Game_Data[sock_id] = {id, sock_id, ...x, ...y}
- map: post{sock_id, x, y} -> {map:string}
- pos_all_player: post{sock_id} -> [{sock_id, skin: char}, ...]
- inventaire: post{sock_id} -> [{pos_in_inv, item_id, nb_of_item}]



Websocket:
SERVEUR:
-

CLIENT:


JS CLIENT:
- settings: {} -> Si posible avec les cookies

data = {
    id: {
        "id": req.body.id,
        "password": req.body.password,
        "x": null,
        "y": null,
        "z": null,
        "inv": {},
        "health": null,
        "skills": null
    },
    ...
}

inGameData = {
    id:{
        "id": body.id,
        "socket_id": body.socket_id,
        "x": 0,
        "y": 0,
        "z": 0,
        "inv": {},
        "health": 100,
        "skills": {}
    },
    ...
}

*///////////////////////////////////////////:
//          BOTH
////////////////////////////////////////////:
let changement = false  //debug
let data = JSON.parse(fs.readFileSync('data.json', 'utf8'))

let inGameData = []

let inLoginMenu = []

////////////////////////////////////////////:
//          FONCTION
////////////////////////////////////////////:
function writeData() {
    fs.writeFile('data.json', JSON.stringify(data), function (err) {
        if (err) return console.log(err);
        console.log("wrote" + data)
    });
}

////////////////////////////////////////////:
//          EXPRESS
////////////////////////////////////////////:
// respond with "hello world" when a GET request is made to the homepage
app.get('/', function (req, res) {
    res.send('hello world')
})

function AddUserToInGameData(body) {
    if (data[body.id].x === null) {
        //Init variables
        inGameData[body.id] = {
            "socket_id": body.socket_id,
            "id": body.id,
            "x": 0, // METTRE LES DATA SI EXSISTANT sinon les init
            "y": 0,
            "z": 0,
            "inv": {},
            "health": 100,
            "skills": {}
        }
    } else {
        inGameData[body.id] = {
            "socket_id": body.socket_id,
            "id": body.id,
            "x": null, // METTRE LES DATA SI EXSISTANT sinon les init
            "y": null,
            "z": null,
            "inv": {},
            "health": null,
            "skills": null
        }
    }
    changement = true
}

app.post('/login', function (req, res) {
    // VERIFIER SI IL EST PAS DEJA DANS LE INGAMEDATA, SI OUI DIRE QUE IL PEUX SE CONNECTER AVEC UN SEUL COMPTE
    //TOKEN DEJA UTILIS2
    let message
    let status // 0=fine, 1=id_requis, 2=pass_requis, 3=socket_id_requis, 4=id_inexistant, 5=deja_conecté, x=autres
    if (!req.body.id) {
        status = 1
        message = "Il faut l'identifiant"
    } else if (!req.body.password) {
        status = 2
        message = "Il faut le mot de passe"
    } else if (!req.body.socket_id) {
        status = 3
        message = "Il faut le socket id"
    } else if (!data.hasOwnProperty(req.body.id)) {
        status = 4
        message = "Identifiant inexistant"
    } else if (!inGameData.hasOwnProperty(req.body.id)) {
        status = 5
        message = "Le joueur id est deja connecter"
    } else {
        status = 0
        message = "Tout me semble bien"
        AddUserToInGameData(req.body)
    }
    res.send(JSON.stringify({id: req.body.id, status: status, msg: message}))
})

app.post('/register', function (req, res) {
    // TODO: ANTI SPAM THIS COMMAND
    let message
    let status // 0=fine, 1=id_requis, 2=id_utilise, 3=id_invalide, 4=pass_requis, 5=pass_trop_court, 6=autres
    if (!req.body.id) {
        status = 1
        message = "Il faut un identifiant"
    } else if (data.hasOwnProperty(req.body.id)) { //if id existe
        status = 2
        message = "Cette identifiant deja utilisé"
    } else if (!(req.body.id.match("[a-z][.a-z0-9]{3,}")[0] === req.body.id)) {
        status = 3
        message = "L'identifiant n'est pas bon" // longueur de 4 inclus minimum, et un match avec c.match("[a-z][a-z.0-9]{3,}")
    } else if (!req.body.password) {
        status = 4
        message = "Il faut un mot de passe"
    } else if (req.body.password.length <= 8) {
        status = 5
        message = "Mot de passe trop court"
    } else {
        status = 0
        message = "Tout me semble bien"
        data[req.body.id] = {
            "id": req.body.id,
            "password": req.body.password,
            "x": null,
            "y": null,
            "z": null,
            "inv": {},
            "health": null,
            "skills": null
        }
        writeData()
        changement = true
    }
    res.send(JSON.stringify({id: req.body.id, status: status, msg: message}))
})

////////////////////////////////////////////:
//          WEBSOCKET
////////////////////////////////////////////:
io.on('connection', (socket) => {
    iodebug.emit('chat', JSON.stringify({id: socket.id, state: "connect"}));
    socket.on('message', (message) => {
        io.emit('message', `${socket.id} said ${message}`);
        iodebug.emit('chat', JSON.stringify({id: socket.id, state: "said", msg: message}));
    });
});

io.on('disconnected', (socket) => {
    iodebug.emit('chat', JSON.stringify({id: socket.id, state: "disconnect"}));
    socket.on('message', (message) => {
        io.emit('message', `${socket.id} said ${message}`);
    });
});


////////////////////////////////////////////:
//          DEBUGGER
////////////////////////////////////////////:
const httpdebug = require('http').createServer();
const iodebug = require('socket.io')(httpdebug, {cors: {origin: "*"}});

function reload() {
    setTimeout(() => reload(), 1000);
    if (changement) {
        console.log("SEND OK")
        iodebug.emit('data', JSON.stringify(data));
        iodebug.emit('igdata', JSON.stringify(inGameData));
        changement = false
    }
}

reload()

////////////////////////////////////////////:
//          END
////////////////////////////////////////////:
// Express
app.listen(3000, () => console.log(`Express http://localhost:3000`))
// Websocket
http.listen(8080, () => console.log('Websocket on http://localhost:8080'));
// DEBUG
httpdebug.listen(9999, () => console.log('Websocket on http://localhost:9999'));

function AutoSave() {
    console.log("AutoSave")
    setTimeout(() => AutoSave(), 1000 * 60 * 3);
}

setTimeout(() => AutoSave(), 1000 * 60 * 3);
changement = true