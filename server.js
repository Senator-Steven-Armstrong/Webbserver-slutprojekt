const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

var playersConnected = 0;

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("a user connected");
  playersConnected++;

  socket.on("disconnect", () => {
    console.log("a user disconnected");
    playersConnected--;
  });
});

server.listen(3000, () => {
  console.log("listening on *:3000");
});
