const { reset } = require("nodemon");
const { Socket } = require("socket.io");

const Express = require("express")();
const Http = require("http").Server(Express);
const Socketio = require("socket.io")(Http);

Express.get('/', (req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.sendFile(__dirname + '/index.html');
});
Express.get('/vue.js', (req, res)=> {
    res.setHeader("Content-Type", "text/javascript");
    res.sendFile(__dirname + '/vue.js');
});
Express.get('/b.ico', (req, res)=> {
    res.sendFile(__dirname + '/b.ico');
});
Express.get('/style.css', (req, res)=>{
    res.sendFile(__dirname + '/style.css');
});
Express.get('/jquery-3.5.1.js', (req, res)=> {
    res.setHeader("Content-Type", "text/javascript");
    res.sendFile(__dirname + '/jquery-3.5.1.js');
});

var chatroom = {
    users : [],
    messages : []
}

Http.listen(3000, ()=> {
});

Socketio.on('connection', (socket)=> {

    socket.on('username', (userData)=> {
        console.log(userData);
        if(userData.username === null || userData.username === undefined) {
            userData.username = generateUsername();
        }
        if(userData.usercolor === null || userData.usercolor === undefined) {
            userData.usercolor = '#FFFFFF';
        }
        if(usernameExists(userData.username)) {
            userData.username = generateUsername();
        }

        var newUser = {
            name: userData.username,
            id: socket.id,
            color: userData.usercolor
        };
    
        chatroom.users.push(newUser);
    
        var date = new Date();
        var hours = date.getHours();
        var minutes = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();;
    
        var message = {
            message: newUser.name + " has connected...",
            user: {
                username: 'SLATT server',
                color: '#FFFFFF'
            },
            time: hours + ":" + minutes
        }
        chatroom.messages.unshift(message);
    
        Socketio.emit("messages", message);
        console.log(newUser);
        socket.emit("username", newUser);
    
        socket.emit("chatroom", chatroom);
        
        Socketio.emit("users", chatroom.users);
    });

    socket.on('disconnect', ()=> {
        chatroom.users = chatroom.users.filter(function(user){
            return user.id != socket.id;
        });
        Socketio.emit("users", chatroom.users);
    });

    socket.on("messages", (msg) =>{
        msg.time = generateTimestamp();

        var commandEntered = checkMessageForCommands(msg.message);

        if(commandEntered) {
            handleCommand(msg, socket);
        }
        else {
            var emojimessage = emojifyMessage(msg.message);
            msg.message = emojimessage;
            console.log(msg.message);
            Socketio.emit("messages", msg);
            chatroom.messages.unshift(msg);
        }
    });

});

generateUsername = function(){
    var username = "" + Math.round(Math.random() * 100000000) + "";
    while(usernameExists(username)) {
        username = "" + Math.round(Math.random() * 100000000) + "";
    }
    return username;
}

emojifyMessage = function(message){
    var emojimessage;
    emojimessage = emojiReplace(message, ':)', '😁');
    emojimessage = emojiReplace(emojimessage, ':(', '🙁');
    emojimessage = emojiReplace(emojimessage, ':o', '😲');
    return emojimessage;
}

emojiReplace = function(msg, emoticon, emoji){
    var emojimsg = msg.replace(emoticon, emoji);
    return emojimsg;
}

usernameExists = function(username){
    for(user of chatroom.users){
        if(user.name == username)
        {
            return true;
        }
    }
    return false;
}

generateTimestamp = function() {
    var date = new Date();
    var hours = date.getHours();
    var minutes = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
    return hours + ":" + minutes;
}

checkMessageForCommands = function(message){
    return ( message.startsWith("/"));
}

isValidColor = function(str) {
    return str.match(/^[a-f0-9]{6}$/i) !== null;
}

handleCommand = function(msg, socket){
    var splitMsg = msg.message.split(' ');

    if(splitMsg.length != 2) {
        socket.emit("commandfailed", "command format should be /command value");
        return false;
    }

    var command = splitMsg[0];
    var value = splitMsg[1];

    switch(command){
        case "/name":
            if(value === "") {
                socket.emit("commandfailed", value + " you name cannot be an empty string!");
                return false;
            }
            value = emojifyMessage(value);
            var changeUser;
            for(user of chatroom.users){
                if(user.id == socket.id) {
                    changeUser = user;
                }
                if(user.name == value){
                    socket.emit("commandfailed", value + " is already taken!");
                    return false;
                }
            }
            for(message of chatroom.messages){
                if(message.user.username == changeUser.name){
                    message.user.username = value;
                }
            }

            var date = new Date();
            var hours = date.getHours();
            var minutes = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
        
            var message = {
                message: changeUser.name + " has changed their name to " + value,
                user: {
                    username: 'SLATT server',
                    color: '#FFFFFF'
                },
                time: hours + ":" + minutes
            }
            chatroom.messages.unshift(message);
        
            Socketio.emit("messages", message);

            changeUser.name = value;
            socket.emit("username", changeUser);
            Socketio.emit("chatroom", chatroom);
            break;
        case "/color":
            var changeUser;
            if(!isValidColor(value)){
                socket.emit("commandfailed", value + " is an invalid hexidecimal color value!");
                return false;
            }
            for(user of chatroom.users){
                if(user.id == socket.id) {
                    changeUser = user;
                }
            }
            for(message of chatroom.messages){
                if(message.user.username == changeUser.name){
                    message.user.color = '#' + value;
                }
            }

            changeUser.color = '#' + value;
            console.log(changeUser.color);
            socket.emit("username", changeUser);
            Socketio.emit("chatroom", chatroom);

            break;
        default:
            socket.emit("commandfailed", command + " is an invalid command");
            return false;
    }

    return true;
}
