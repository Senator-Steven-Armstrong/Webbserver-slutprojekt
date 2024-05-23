// DECLARATION ---------------------------------------------------------------------------

const socket = io();
let roomId = null;
let isHost = false;

const canvas = document.getElementById("game-area");
const c = canvas.getContext("2d");

const UIContainer = document.getElementById("UI-container");
const healthbarPlayer1 = document.getElementById("player1-hp");
const healthbarPlayer2 = document.getElementById("player2-hp");
const gameTimer = document.getElementById("game-timer");
const gameOverScreen = document.getElementById("game-over");

const iconFrame1 = document.getElementById("icon-frame-1");
const iconFrame2 = document.getElementById("icon-frame-2");
const iconPlayer1 = document.getElementById("player-1-icon");
const iconPlayer2 = document.getElementById("player-2-icon");

const player1moeInput = document.getElementById("moe1");
const player1peteInput = document.getElementById("pete1");

const player2moeInput = document.getElementById("moe2");
const player2peteInput = document.getElementById("pete2");

const ground = document.getElementById("ground-img");

const startMenu = document.getElementById("start-menu-container");
const createGameButton = document.getElementById("createButton");
const joinGameButton = document.getElementById("button2");
const joinTextField = document.getElementById("input2");
const waitingDiv = document.getElementById("postCreate");
const codeText = document.getElementById("codeText");

// GAMEPLAY / CANVAS --------------------------------------------------------------------

const floorLevel = 80;
let gameTime;
let gameOver = false;
let gameStart = false;

let player1;
let player2;

let knockbackAmplifier = 1.5;
let movementSpeedAmplifier = 1;
let damageAmplifier = 1;
let invincibility = false;

let canReset = false;

class Audio {
  constructor(src) {
    this.sound = document.createElement("audio");
    this.sound.src = src;
    this.sound.setAttribute("autoplay", "autoplay");
    this.sound.setAttribute("preload", "auto");
    this.sound.setAttribute("controls", "none");
    this.sound.style.display = "none";
    document.body.appendChild(this.sound);
  }

  play() {
    this.sound.play();
  }
  stop() {
    this.sound.pause();
  }
}

const fightMusic = new Audio("sounds/battle.mp3");
const introMusic = new Audio("sounds/parrot raceway.mp3");

class Sprite {
  constructor(
    x,
    y,
    imageSrc,
    framesHold,
    scale = 1,
    frameAmount = 1,
    offset = { x: 0, y: 0 }
  ) {
    this.x = x;
    this.y = y;
    this.image = new Image();
    this.image.src = imageSrc;
    this.scale = scale;
    this.frameAmount = frameAmount;
    this.frameCurrent = 0;
    this.framesPassed = 0;
    this.framesHold = framesHold;
    this.offset = offset;
  }

  animateFrames() {
    this.framesPassed++;
    if (this.framesPassed % this.framesHold == 0) {
      if (this.frameCurrent < this.frameAmount - 1) {
        this.frameCurrent++;
      } else {
        this.frameCurrent = 0;
      }
    }
  }

  draw() {
    c.imageSmoothingEnabled = false;
    c.drawImage(
      this.image,
      this.frameCurrent * (this.image.width / this.frameAmount),
      0,
      this.image.width / this.frameAmount,
      this.image.height,
      this.x - this.offset.x,
      this.y - this.offset.y,
      (this.image.width / this.frameAmount) * this.scale,
      this.image.height * this.scale
    );
  }

  update() {
    this.draw();
    this.animateFrames();
  }
}

class Player extends Sprite {
  constructor(
    width,
    height,
    x,
    y,
    keyRight,
    keyLeft,
    keyJump,
    keyDown,
    keyAttack,
    keyBlock,
    isFlipped,
    imageSrc,
    framesHold,
    scale = 1,
    frameAmount = 1,
    offset,
    sprites
  ) {
    super(x, y, imageSrc, framesHold, scale, frameAmount, offset);

    this.width = width;
    this.height = height;
    this.speedX = 0;
    this.speedY = 0;
    this.gravity = 0.4;
    this.isAttacking = false;
    this.isBlocking = false;
    this.isFlipped = isFlipped;
    this.isHit = false;
    this.canMove = true;
    this.health = 1000;
    this.damage = 0;
    this.attackInputs = [];
    this.knockbackSpeed = 0;
    this.lastKey = "";
    this.attackForceY = 0;
    this.attackForceX = 0;
    this.frameCurrent = 0;
    this.sprites = sprites;
    this.movementSpeed = 6;

    this.keys = {
      right: { key: keyRight, isPressed: false },
      left: { key: keyLeft, isPressed: false },
      up: { key: keyJump, isPressed: false },
      down: { key: keyDown, isPressed: false },
      attack: { key: keyAttack, isPressed: false },
      block: { key: keyBlock, isPressed: false },
    };

    this.attackBox = {
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      xOffset: 0,
      yOffset: 0,
      followPlayer: false,
    };

    for (const sprite in this.sprites) {
      sprites[sprite].image = new Image();
      sprites[sprite].image.src = sprites[sprite].imageSrc;
    }
  }
  drawHitboxes() {
    // Player hitbox
    c.fillStyle = "red";
    c.fillRect(this.x, this.y, this.width, this.height);

    //Attack hitbox
    c.fillStyle = "green";

    if (this.isAttacking == true) {
      c.fillRect(
        this.attackBox.x,
        this.attackBox.y,
        this.attackBox.width,
        this.attackBox.height
      );
    }
  }
  resetAttackBox(player, enemy) {
    player.attackBox.followPlayer = false;
    player.isAttacking = false;
    enemy.isHit = false;
    player.attackBox.x = 0;
    player.attackBox.y = 0;
    player.attackBox.width = 0;
    player.attackBox.height = 0;
    player.damage = 0;
  }
  attack(
    player,
    xOffset,
    yOffset,
    width,
    height,
    delayFrames,
    durationFrames,
    forceY,
    isFollowingPlayer = true
  ) {
    //Checks who is performing attack and who is being attacked
    let enemy = player2;
    if (player == player2) {
      enemy = player1;
    }
    player.isAttacking = true;

    setTimeout(
      function (player) {
        player.attackBox.xOffset = xOffset;
        player.attackBox.yOffset = yOffset;
        player.attackBox.followPlayer = isFollowingPlayer;
        player.attackBox.height = height;
        player.attackBox.width = width;
        player.attackForceY = forceY;
        if (isFollowingPlayer == false) {
          player.attackBox.y = yOffset;
          player.attackBox.x = xOffset;
        }
      },
      (1000 * delayFrames) / 60,
      player
    );
    setTimeout(
      this.resetAttackBox,
      (1000 * (durationFrames + delayFrames)) / 60,
      player,
      enemy
    );
  }
  movement() {
    // Left and right
    if (
      this.keys.left.isPressed == true &&
      this.lastKey == this.keys.left.key &&
      this.x > 0
    ) {
      this.speedX = -this.movementSpeed * movementSpeedAmplifier;
      if (this.speedY == 0) {
        if (this.isFlipped == false)
          this.changeAnimation(this.sprites.runBack, this.sprites.runBackFlip);
        else
          this.changeAnimation(
            this.sprites.runForward,
            this.sprites.runForwardFlip
          );
      }
    } else if (
      this.keys.right.isPressed == true &&
      this.lastKey == this.keys.right.key &&
      this.x + this.width < canvas.width
    ) {
      this.speedX = this.movementSpeed * movementSpeedAmplifier;
      if (this.speedY == 0) {
        if (this.isFlipped == true)
          this.changeAnimation(this.sprites.runBack, this.sprites.runBackFlip);
        else
          this.changeAnimation(
            this.sprites.runForward,
            this.sprites.runForwardFlip
          );
      }
    } else {
      this.speedX = 0;
      this.changeAnimation(this.sprites.idle, this.sprites.idleFlip);
    }

    //Check if jumping to change animation
    if (this.speedY < 0) {
      this.changeAnimation(this.sprites.jump, this.sprites.jumpFlip);
    } else if (this.speedY > 0) {
      this.changeAnimation(this.sprites.fall, this.sprites.fallFlip);
    }

    // Jump
    if (
      this.keys.up.isPressed == true &&
      this.y + this.height >= canvas.height - floorLevel
    ) {
      this.speedY -= 12;
    }
  }
  attacks() {
    // Attacks
    if (this.isAttacking == false) {
      if (
        this.keys.down.isPressed == true &&
        this.keys.attack.isPressed == true &&
        this.y + this.height * 1.5 <= canvas.height - floorLevel
      ) {
        this.attackJumpLow();
      } else if (
        this.keys.down.isPressed == true &&
        this.keys.attack.isPressed
      ) {
        this.attackLow();
      } else if (this.keys.up.isPressed == true && this.keys.attack.isPressed) {
        this.attackJumpUppercut();
      } else if (this.keys.attack.isPressed == true) {
        this.attackMid();
      }
    }

    // Block
    if (this.keys.block.isPressed == true) {
      this.changeAnimation(this.sprites.block, this.sprites.blockFlip);
      this.isBlocking = true;
      this.canMove = false;
      this.speedX = 0;
    }
  }
  applyKnockback(forceX) {
    if (
      forceX * knockbackAmplifier != 0 &&
      this.x > 0 &&
      this.x + this.width < canvas.width
    ) {
      this.speedX += forceX * knockbackAmplifier;
      this.knockbackSpeed = this.speedX;
    }
  }
  changeAnimation(sprite, spriteFlipped = sprite) {
    if (this.isFlipped == false) {
      this.changeSprite(sprite);
    } else {
      this.changeSprite(spriteFlipped);
    }
  }
  changeSprite(sprite) {
    if (
      (this.image.src != sprite.image.src &&
        this.isAttacking == false &&
        this.isBlocking == false &&
        gameOver == false) ||
      (this.image.src != sprite.image.src &&
        (sprite == this.sprites.block || sprite == this.sprites.blockFlip) &&
        gameOver == false)
    ) {
      this.frameCurrent = 0;
      this.frameAmount = sprite.frameAmount;
      this.framesHold = sprite.framesHold;
      this.image = sprite.image;
    }
  }

  update() {
    //Check if attack hitbox should follow player
    if (this.attackBox.followPlayer == true) {
      this.attackBox.x = this.x + this.attackBox.xOffset;
      this.attackBox.y = this.y + this.attackBox.yOffset;
    }

    //this.drawHitboxes();
    this.draw();
    this.animateFrames();

    if (this.isAttacking) {
      this.x += this.speedX * 0.4;
    } else {
      this.x += this.speedX;
    }
    this.y += this.speedY;

    //gravity
    if (this.y + this.height >= canvas.height - floorLevel) {
      this.speedY = 0;
    } else {
      this.speedY += this.gravity;
    }

    //Check contact with wall
    if (this.x <= 0) {
      this.speedX = 0;
    } else if (this.x + this.width >= canvas.width) {
      this.speedX = 0;
    }
  }

  updateKnockback() {
    //Check for knockback
    if (
      (this.knockbackSpeed == this.speedX && this.speedX != 0) ||
      this.knockbackSpeed != 0
    ) {
      if (this.knockbackSpeed > 0) {
        this.knockbackSpeed -= 0.4;
        this.speedX -= 0.4;
      } else if (this.knockbackSpeed < 0) {
        this.speedX += 0.4;
        this.knockbackSpeed += 0.4;
      }
    }
  }
}

class PlayerPete extends Player {
  constructor(
    x,
    y,
    keyRight,
    keyLeft,
    keyJump,
    keyDown,
    keyAttack,
    keyBlock,
    isFlipped
  ) {
    let width = 90;
    let height = 150;
    let framesHold = 20;
    let scale = 5;
    let frameAmount = 3;
    let offset = { x: 115, y: 91 };
    let imageSrc = "images/stabby pete/stabby-pete-idle.png";

    let sprites = {
      idle: {
        imageSrc: "images/stabby pete/stabby-pete-idle.png",
        frameAmount: 3,
        framesHold: 20,
      },
      idleFlip: {
        imageSrc: "images/stabby pete/stabby-pete-idle-flip.png",
        frameAmount: 3,
        framesHold: 20,
      },
      runForward: {
        imageSrc: "images/stabby pete/sp-walk.png",
        frameAmount: 2,
        framesHold: 6,
      },
      runForwardFlip: {
        imageSrc: "images/stabby pete/sp-walk-flip.png",
        frameAmount: 2,
        framesHold: 6,
      },
      runBack: {
        imageSrc: "images/stabby pete/sp-walk.png",
        frameAmount: 2,
        framesHold: 6,
      },
      runBackFlip: {
        imageSrc: "images/stabby pete/sp-walk-flip.png",
        frameAmount: 2,
        framesHold: 6,
      },
      jump: {
        imageSrc: "images/stabby pete/sp-jump.png",
        frameAmount: 3,
        framesHold: 15,
      },
      jumpFlip: {
        imageSrc: "images/stabby pete/sp-jump-flip.png",
        frameAmount: 3,
        framesHold: 15,
      },
      atkMid: {
        imageSrc: "images/stabby pete/sp-stab.png",
        frameAmount: 5,
        framesHold: 6,
      },
      atkMidFlip: {
        imageSrc: "images/stabby pete/sp-stab-flip.png",
        frameAmount: 5,
        framesHold: 6,
      },
      atkLow: {
        imageSrc: "images/stabby pete/sp-low-slice.png",
        frameAmount: 7,
        framesHold: 6,
      },
      atkLowFlip: {
        imageSrc: "images/stabby pete/sp-low-slice-flip.png",
        frameAmount: 7,
        framesHold: 6,
      },
      atkJLow: {
        imageSrc: "images/stabby pete/sp-j-low.png",
        frameAmount: 5,
        framesHold: 6,
      },
      atkJLowFlip: {
        imageSrc: "images/stabby pete/sp-j-low-flip.png",
        frameAmount: 5,
        framesHold: 6,
      },
      atkUp: {
        imageSrc: "images/stabby pete/sp-upcut.png",
        frameAmount: 8,
        framesHold: 6,
      },
      atkUpFlip: {
        imageSrc: "images/stabby pete/sp-upcut-flip.png",
        frameAmount: 8,
        framesHold: 6,
      },
      block: {
        imageSrc: "images/stabby pete/sp-block.png",
        frameAmount: 1,
        framesHold: 60,
      },
      blockFlip: {
        imageSrc: "images/stabby pete/sp-block-flip.png",
        frameAmount: 1,
        framesHold: 60,
      },
      fall: {
        imageSrc: "images/stabby pete/sp-fall.png",
        frameAmount: 2,
        framesHold: 5,
      },
      fallFlip: {
        imageSrc: "images/stabby pete/sp-fall-flip.png",
        frameAmount: 2,
        framesHold: 5,
      },
      hit: {
        imageSrc: "images/stabby pete/sp-hit.png",
        frameAmount: 1,
        framesHold: 60,
      },
      hitFlip: {
        imageSrc: "images/stabby pete/sp-hit-flip.png",
        frameAmount: 1,
        framesHold: 60,
      },
      win: {
        imageSrc: "images/stabby pete/sp-buss-it.png",
        frameAmount: 10,
        framesHold: 2,
      },
      lose: {
        imageSrc: "images/Stabby Pete/lose.png",
        frameAmount: 23,
        framesHold: 9,
      },
    };

    super(
      width,
      height,
      x,
      y,
      keyRight,
      keyLeft,
      keyJump,
      keyDown,
      keyAttack,
      keyBlock,
      isFlipped,
      imageSrc,
      framesHold,
      scale,
      frameAmount,
      offset,
      sprites
    );

    this.iconSrc = "images/stabby pete/icon.png";
  }

  attackMid() {
    this.damage = 27;
    this.attackForceX = 8;
    this.changeAnimation(this.sprites.atkMid, this.sprites.atkMidFlip);
    if (this.isFlipped == false) {
      this.attack(this, 20, 0, 120, this.height, 10, 15, 0);
    } else {
      this.attack(this, this.width - 120 - 20, 0, 120, this.height, 10, 15, 0);
    }
  }
  attackJumpUppercut() {
    this.damage = 34;
    this.attackForceX = 7;
    this.changeAnimation(this.sprites.atkUp, this.sprites.atkUpFlip);
    if (this.isFlipped == false) {
      this.attack(this, 15, -20, 150, this.height + 90, 25, 25, -10);
    } else {
      this.attack(
        this,
        this.width - 120 - 15,
        -20,
        150,
        this.height + 90,
        25,
        25,
        -10
      );
    }
  }
  attackJumpLow() {
    this.damage = 22;
    this.attackForceX = 5;
    this.changeAnimation(this.sprites.atkJLow, this.sprites.atkJLowFlip);
    if (this.isFlipped == false) {
      this.attack(this, -40, this.height / 2, 200, 80, 10, 10, 0);
    } else {
      this.attack(
        this,
        this.width - 200 + 40,
        this.height / 2,
        200,
        80,
        10,
        10,
        0
      );
    }
  }
  attackLow() {
    this.damage = 27;
    this.attackForceX = 10;
    this.changeAnimation(this.sprites.atkLow, this.sprites.atkLowFlip);
    if (this.isFlipped == false) {
      this.attack(this, -30, this.height - 70, 250, 60, 10, 15, -6);
    } else {
      this.attack(
        this,
        this.width + 50 - 250,
        this.height - 70,
        250,
        60,
        10,
        15,
        -6
      );
    }
  }
  individualUpdate() {}
}

class PlayerMage extends Player {
  constructor(
    x,
    y,
    keyRight,
    keyLeft,
    keyJump,
    keyDown,
    keyAttack,
    keyBlock,
    isFlipped
  ) {
    let width = 90;
    let height = 150;
    let framesHold = 10;
    let scale = 5;
    let frameAmount = 4;
    let offset = { x: 115, y: 91 };
    let imageSrc = "images/Magical moe/idle.png";

    let sprites = {
      idle: {
        imageSrc: "images/Magical moe/idle.png",
        frameAmount: 4,
        framesHold: 10,
      },
      idleFlip: {
        imageSrc: "images/Magical moe/idleFlip.png",
        frameAmount: 4,
        framesHold: 10,
      },
      runForward: {
        imageSrc: "images/Magical moe/forward.png",
        frameAmount: 4,
        framesHold: 12,
      },
      runForwardFlip: {
        imageSrc: "images/Magical moe/forwardFlip.png",
        frameAmount: 4,
        framesHold: 12,
      },
      runBack: {
        imageSrc: "images/Magical moe/back.png",
        frameAmount: 4,
        framesHold: 12,
      },
      runBackFlip: {
        imageSrc: "images/Magical moe/backFlip.png",
        frameAmount: 4,
        framesHold: 12,
      },
      jump: {
        imageSrc: "images/Magical moe/jump.png",
        frameAmount: 3,
        framesHold: 8,
      },
      jumpFlip: {
        imageSrc: "images/Magical moe/jumpFlip.png",
        frameAmount: 3,
        framesHold: 8,
      },
      atkMid: {
        imageSrc: "images/magical moe/mid.png",
        frameAmount: 6,
        framesHold: 5,
      },
      atkMidFlip: {
        imageSrc: "images/magical moe/midFlip.png",
        frameAmount: 6,
        framesHold: 5,
      },
      atkLow: {
        imageSrc: "images/Magical moe/uppercut.png",
        frameAmount: 9,
        framesHold: 5,
      },
      atkLowFlip: {
        imageSrc: "images/Magical moe/uppercutFlip.png",
        frameAmount: 9,
        framesHold: 5,
      },
      atkJLow: {
        imageSrc: "images/Magical moe/jumpLow.png",
        frameAmount: 7,
        framesHold: 6,
      },
      atkJLowFlip: {
        imageSrc: "images/Magical moe/jumpLowFlip.png",
        frameAmount: 7,
        framesHold: 6,
      },
      atkUp: {
        imageSrc: "images/magical moe/rockCall.png",
        frameAmount: 17,
        framesHold: 5,
      },
      atkUpFlip: {
        imageSrc: "images/magical moe/rockCallFlip.png",
        frameAmount: 17,
        framesHold: 5,
      },
      block: {
        imageSrc: "images/Magical moe/block.png",
        frameAmount: 3,
        framesHold: 4,
      },
      blockFlip: {
        imageSrc: "images/Magical moe/blockFlip.png",
        frameAmount: 3,
        framesHold: 4,
      },
      fall: {
        imageSrc: "images/Magical moe/fall.png",
        frameAmount: 3,
        framesHold: 8,
      },
      fallFlip: {
        imageSrc: "images/Magical moe/fallFlip.png",
        frameAmount: 3,
        framesHold: 8,
      },
      hit: {
        imageSrc: "images/Magical moe/hit.png",
        frameAmount: 1,
        framesHold: 60,
      },
      hitFlip: {
        imageSrc: "images/Magical moe/hitFlip.png",
        frameAmount: 1,
        framesHold: 60,
      },
      win: {
        imageSrc: "images/Magical Moe/win.png",
        frameAmount: 27,
        framesHold: 4,
      },
      lose: {
        imageSrc: "images/Magical Moe/lose.png",
        frameAmount: 6,
        framesHold: 8,
      },
    };

    super(
      width,
      height,
      x,
      y,
      keyRight,
      keyLeft,
      keyJump,
      keyDown,
      keyAttack,
      keyBlock,
      isFlipped,
      imageSrc,
      framesHold,
      scale,
      frameAmount,
      offset,
      sprites
    );

    this.iconSrc = "images/Magical Moe/icon.png";
    this.projectile = new Sprite(
      -1000,
      -1000,
      "images/magical moe/rockAttack.png",
      5,
      4,
      17,
      { x: 0, y: 0 }
    );
  }
  resetProjectile(player) {
    player.projectile.x = -1000;
    player.projectile.y = -1000;
  }
  attackMid() {
    this.damage = 18;
    this.attackForceX = 7;
    this.changeAnimation(this.sprites.atkMid, this.sprites.atkMidFlip);
    if (this.isFlipped == false) {
      this.attack(this, 20, -10, 180, 80, 20, 10, 0);
    } else {
      this.attack(this, -120 + 20, -10, 180, 80, 20, 10, 0);
    }
  }
  attackJumpUppercut() {
    this.damage = 22;
    this.attackForceX = 6;
    this.changeAnimation(this.sprites.atkJLow, this.sprites.atkJLowFlip);
    if (this.isFlipped == false) {
      this.attack(this, 0, this.height / 2 - 20, 200, 90, 24, 18, 0);
    } else {
      this.attack(
        this,
        this.width - 200,
        this.height / 2 - 20,
        200,
        90,
        24,
        18,
        0
      );
    }
  }
  attackJumpLow() {
    this.damage = 50;
    this.attackForceX = 0;
    this.changeAnimation(this.sprites.atkUp, this.sprites.atkUpFlip);
    this.projectile.frameCurrent = 0;
    this.projectile.y = canvas.height - floorLevel - this.height - 102;
    if (this.isFlipped == false) {
      this.attack(
        this,
        this.x + this.width + 100,
        canvas.height - floorLevel - this.height - 90,
        150,
        this.height + 90,
        56,
        25,
        -12,
        false
      );
      this.projectile.x = this.x + this.width + 50;
    } else {
      this.attack(
        this,
        this.x - 100,
        canvas.height - floorLevel - this.height - 90,
        150,
        this.height + 90,
        56,
        25,
        -12,
        false
      );
      this.projectile.x = this.x - 50 - this.width;
    }
    setTimeout(this.resetProjectile, (1000 * 81) / 60, this);
  }
  attackLow() {
    this.damage = 22;
    this.attackForceX = 7;
    this.changeAnimation(this.sprites.atkLow, this.sprites.atkLowFlip);
    if (this.isFlipped == false) {
      this.attack(this, 0, -20, 160, 160, 25, 30, -10);
    } else {
      this.attack(this, this.width - 160, -20, 160, 160, 25, 30, -10);
    }
  }
  float() {
    if (this.speedY > 0 && this.keys.up.isPressed) {
      this.speedY = 0.8;
    }
  }
  individualUpdate() {
    this.float();
  }
}

// ----------------------------------SOCKET STUFFS----------------------------------

function createGame() {
  isHost = true;
  socket.emit("createGame");
}

function joinGame() {
  roomId = document.getElementById("input2").value;
  console.log(roomId);
  socket.emit("joinGame", { roomId: roomId });
}

socket.on("newGame", (data) => {
  console.log("itsa me a-newGame: " + data.roomId);
  roomId = data.roomId;
  createGameButton.style.display = "none";
  joinGameButton.style.display = "none";
  joinTextField.style.display = "none";
  waitingDiv.style.display = "block";
  codeText.innerText = "Room Code: " + roomId;
});

socket.on("playersConnected", () => {
  console.log("trying to assign players");
  assignPlayers();
});

function startGame() {
  startMenu.style.display = "none";

  gameTime = 90;
  gameStart = true;

  if (isHost) {
    iconPlayer1.src = player1.iconSrc;
    iconPlayer2.src = player2.iconSrc;
  } else {
    iconPlayer2.src = player1.iconSrc;
    iconPlayer1.src = player2.iconSrc;
  }

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  IDgameTimer = setInterval(function () {
    gameTime--;
  }, 1000);

  UIContainer.classList.add("showFromTop");
  iconFrame1.classList.add("showFromLeft");
  iconFrame2.classList.add("showFromRight");
  startMenu.classList.add("moveUnderScreen");
  ground.classList.add("showFromBottom");

  introMusic.stop();
  fightMusic.play();

  setInterval(gameLoop, 1000 / 60);
}

function gameLoop() {
  c.clearRect(0, 0, canvas.width, canvas.height);

  updateUI();

  //UPPDATERAR POSITIONEN AV SPELARNA FÖR SOCKET.IO
  socket.volatile.emit("updateMovement", {
    x: player1.x,
    y: player1.y,
    roomId: roomId,
  });

  // borde vara lungt- lägger till gravitation, knockback, ritar/animerar
  player1.update();
  player2.update();

  player2.updateKnockback();

  // borde vara lugnt- uppdaterar bara animering
  try {
    player1.projectile.update();
  } catch (error) {}
  try {
    player2.projectile.update();
  } catch (error) {}

  // borde vara lungt- kollar bara float för moe
  player1.individualUpdate();
  player2.individualUpdate();

  if (gameOver == false) {
    //borde vara lungt ser inte varför detta borde vara problem
    checkPlayerCrossed();

    //eh idk borde vara lungt
    checkCollisionIfAttacking();

    // det här är det som behöver uppdateras med sockets, nvm behöver bara skicka över position så borde det funka
    if (player1.canMove == true) {
      player1.movement();
      player1.attacks();
    }
    if (player2.canMove == true) {
      player2.movement();
      player2.attacks();
    }
  }

  // och det här + timern
  checkGameOver();
}

socket.on("updateMovement", (data) => {
  player2.x = data.x;
  player2.y = data.y;
});

function assignPlayers() {
  if (player1moeInput.checked == true) {
    if (isHost) {
      player1 = new PlayerMage(
        200,
        100,
        "d",
        "a",
        "w",
        "s",
        " ",
        "e",
        false,
        "images/stabby pete/stabby-pete-idle.png"
      );
    } else {
      player1 = new PlayerMage(
        window.innerWidth - 290,
        100,
        "d",
        "a",
        "w",
        "s",
        " ",
        "e",
        true,
        "images/stabby pete/stabby-pete-idle-flip.png"
      );
    }

    socket.emit("assignCharacters", {
      character: "moe",
      roomId: roomId,
    });
  } else if (player1peteInput.checked == true) {
    if (isHost) {
      player1 = new PlayerPete(
        200,
        100,
        "d",
        "a",
        "w",
        "s",
        " ",
        "e",
        false,
        "images/stabby pete/stabby-pete-idle.png"
      );
    } else {
      player1 = new PlayerPete(
        window.innerWidth - 290,
        100,
        "d",
        "a",
        "w",
        "s",
        " ",
        "e",
        true,
        "images/stabby pete/stabby-pete-idle-flip.png"
      );
    }

    socket.emit("assignCharacters", {
      character: "pete",
      roomId: roomId,
    });
  }
}

socket.on("assignCharacters", (data) => {
  if (data.character == "moe") {
    console.log("opponent picked moe");
    if (isHost) {
      player2 = new PlayerMage(
        window.innerWidth - 290,
        100,
        "",
        "",
        "",
        "",
        "",
        "",
        true,
        "images/stabby pete/stabby-pete-idle-flip.png"
      );
    } else {
      player2 = new PlayerMage(
        200,
        100,
        "",
        "",
        "",
        "",
        "",
        "",
        false,
        "images/stabby pete/stabby-pete-idle.png"
      );
    }
  } else if (data.character == "pete") {
    console.log("opponent picked pete");
    if (isHost) {
      player2 = new PlayerPete(
        window.innerWidth - 290,
        100,
        "",
        "",
        "",
        "",
        "",
        "",
        true,
        "images/stabby pete/stabby-pete-idle-flip.png"
      );
    } else {
      player2 = new PlayerPete(
        200,
        100,
        "",
        "",
        "",
        "",
        "",
        "",
        false,
        "images/stabby pete/stabby-pete-idle.png"
      );
    }
  }

  startGame();
});

function checkCollisionIfAttacking() {
  if (player1.isAttacking == true) {
    detectAttackCollision(player1, player2);
  }
  if (player2.isAttacking == true) {
    detectAttackCollision(player2, player1);
  }
}

function detectAttackCollision(playerAttacking, enemyHit) {
  if (
    playerAttacking.attackBox.x + playerAttacking.attackBox.width >=
      enemyHit.x &&
    playerAttacking.attackBox.x <= enemyHit.x + enemyHit.width &&
    playerAttacking.attackBox.y + playerAttacking.attackBox.height >=
      enemyHit.y &&
    playerAttacking.attackBox.y <= enemyHit.y + enemyHit.height &&
    enemyHit.isHit == false
  ) {
    hitEnemy(playerAttacking, enemyHit);
    setTimeout(() => {
      if (enemyHit.isHit == false) enemyHit.canMove = true;
    }, (1000 * 30) / 60);
  }
}

function hitEnemy(playerAttacking, enemyHit) {
  if (!invincibility) {
    enemyHit.isHit = true;
    enemyHit.canMove = false;
    if (enemyHit.isBlocking == true) {
      //Checks if Tranquility mode so as not to overheal opponent
      if (
        damageAmplifier < 0 &&
        enemyHit.health - playerAttacking.damage * damageAmplifier * 0.2 >= 1000
      ) {
        enemyHit.health = 1000;
      } else {
        enemyHit.health -= playerAttacking.damage * 0.2 * damageAmplifier;
      }
    } else {
      //Checks if Tranquility mode so as not to overheal opponent
      if (
        damageAmplifier < 0 &&
        enemyHit.health - playerAttacking.damage * damageAmplifier >= 1000
      ) {
        enemyHit.health = 1000;
      } else {
        enemyHit.health -= playerAttacking.damage * damageAmplifier;
      }
    }
    if (playerAttacking.isFlipped == false) {
      //Apply stronger knockback to counteract the enemy's current speedX
      if (enemyHit.speedX == 0) {
        enemyHit.applyKnockback(playerAttacking.attackForceX);
      } else {
        enemyHit.applyKnockback(playerAttacking.attackForceX - enemyHit.speedX);
      }
    } else {
      if (enemyHit.speedX == 0) {
        enemyHit.applyKnockback(-playerAttacking.attackForceX);
      } else {
        enemyHit.applyKnockback(
          -playerAttacking.attackForceX - enemyHit.speedX
        );
      }
    }
    enemyHit.speedY += playerAttacking.attackForceY;

    moveHealthBar(enemyHit);
    enemyHit.changeAnimation(enemyHit.sprites.hit, enemyHit.sprites.hitFlip);
  }
}

function checkPlayerCrossed() {
  if (
    player1.x + player1.width / 2 > player2.x + player2.width / 2 &&
    player1.isFlipped == false &&
    player2.isFlipped == true
  ) {
    player1.isFlipped = true;
    player2.isFlipped = false;
  } else if (
    player1.x + player1.width / 2 < player2.x + player2.width / 2 &&
    player1.isFlipped == true &&
    player2.isFlipped == false
  ) {
    player1.isFlipped = false;
    player2.isFlipped = true;
  }
}

function checkGameOver() {
  if (gameOver == false)
    if (gameTime <= 0 || player1.health <= 0 || player2.health <= 0) {
      player1.isAttacking = false;
      player2.isAttacking = false;

      player1.canMove = false;
      player2.canMove = false;

      if (gameTime <= 0) {
        player1.changeAnimation(player1.sprites.win);
        player2.changeAnimation(player2.sprites.win);
        gameOverText("Draw");
      } else if (player1.health <= 0) {
        player1.changeAnimation(player1.sprites.lose);
        player2.changeAnimation(player2.sprites.win);
        player1.health = 0;
        gameOverText("Player 2 wins!");
      } else if (player2.health <= 0) {
        player1.changeAnimation(player1.sprites.win);
        player2.changeAnimation(player2.sprites.lose);
        player2.health = 0;
        gameOverText("Player 1 wins!");
      }
      player1.speedX = 0;
      player2.speedX = 0;
      player1.knockbackSpeed = 0;
      player2.knockbackSpeed = 0;

      setTimeout(function () {
        gameOverText("Press space to Reset");
        canReset = true;
      }, 2500);

      gameOver = true;
    }
}

document.addEventListener("keydown", function (event) {
  checkKeyDown(event, player1);

  // FIXAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAa så det händer online
  if (canReset == true) {
    switch (event.key) {
      case " ":
        location.reload();
        break;
    }
  }
});

function checkKeyDown(event, player) {
  if (gameOver == false && startMenu.style.display == "none") {
    switch (event.key) {
      case player.keys.right.key:
        player.keys.right.isPressed = true;
        player.lastKey = player.keys.right.key;
        break;
      case player.keys.left.key:
        player.keys.left.isPressed = true;
        player.lastKey = player.keys.left.key;
        break;
      case player.keys.up.key:
        player.keys.up.isPressed = true;
        break;
      case player.keys.attack.key:
        player.keys.attack.isPressed = true;
        break;
      case player.keys.down.key:
        player.keys.down.isPressed = true;
        break;
      case player.keys.block.key:
        player.keys.block.isPressed = true;
        break;
    }
  }
}

document.addEventListener("keyup", function (event) {
  checkKeyUp(event, player1);
});

function checkKeyUp(event, player) {
  if (gameOver == false && startMenu.style.display == "none") {
    switch (event.key) {
      case player.keys.right.key:
        player.keys.right.isPressed = false;
        break;
      case player.keys.left.key:
        player.keys.left.isPressed = false;
        break;
      case player.keys.up.key:
        player.keys.up.isPressed = false;
        break;
      case player.keys.attack.key:
        player.keys.attack.isPressed = false;
        break;
      case player.keys.down.key:
        player.keys.down.isPressed = false;
        break;
      case player.keys.block.key:
        player.keys.block.isPressed = false;
        player.isBlocking = false;
        player.canMove = true;
        break;
    }
  }
}

// UI / HTML ----------------------------------------------------------------------------

function updateUI() {
  gameTimer.innerHTML = gameTime;
}

function gameOverText(text) {
  gameOverScreen.innerHTML = text;
}

function moveHealthBar(enemyHit) {
  //Player max hp will by default be 1000
  procent = (1000 - enemyHit.health) / 1000;
  moveAmountPlayer1 = returnProcentage(procent);
  moveAmountPlayer2 = returnProcentage(-procent);
  if (enemyHit == player1) {
    healthbarPlayer1.style.marginLeft = moveAmountPlayer1;
  } else if (enemyHit == player2) {
    healthbarPlayer2.style.marginLeft = moveAmountPlayer2;
  }
}

function returnProcentage(num) {
  procentage = num * 100;
  string = procentage.toString() + "%";
  return string;
}
