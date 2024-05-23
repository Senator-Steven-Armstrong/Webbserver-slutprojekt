const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static("public"));

var playersConnected = 0;
var rooms = {};

app.get("/", (req, res) => {
  console.log(playersConnected);
  res.sendFile(__dirname + "/index.html");
});

io.on("connection", (socket) => {
  console.log("user " + socket.id + " connected");
  playersConnected++;

  socket.on("disconnect", () => {
    console.log("user " + socket.id + " disconnected");
    playersConnected--;
  });

  socket.on("createGame", () => {
    console.log("Creating new game");
    const roomId = makeId(2);
    rooms[roomId] = {};
    socket.join(roomId);
    socket.emit("newGame", { roomId: roomId });
  });

  socket.on("joinGame", (data) => {
    if (rooms[data.roomId] != null) {
      socket.join(data.roomId);
      socket.to(data.roomId).emit("playersConnected", {});
      socket.emit("playersConnected");
    }
  });

  socket.on("assignCharacters", (data) => {
    console.log("Emitting to other player: " + data.socket);
    socket
      .to(data.roomId)
      .emit("assignCharacters", { character: data.character });
  });

  socket.on("updateMovement", (data) => {
    socket.to(data.roomId).emit("updateMovement", { x: data.x, y: data.y });
  });
});

function makeId(length) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

server.listen(3000, () => {
  console.log("listening on *:3000");
});
