const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static("public"));

var playersConnected = 0;

app.get("/", (req, res) => {
  console.log(playersConnected);
  if (playersConnected <= 1) {
    res.sendFile(__dirname + "/index.html");
  } else {
    res.sendFile(__dirname + "/abyss.html");
  }
});

io.on("connection", (socket) => {
  console.log("user " + socket.id + " connected");
  playersConnected++;

  socket.on("disconnect", () => {
    console.log("user " + socket.id + " disconnected");
    playersConnected--;
  });

  socket.on("getReady", () => {});
});

server.listen(3000, () => {
  console.log("listening on *:3000");
});
