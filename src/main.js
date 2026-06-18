const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;
const keys = new Set();
const pressed = new Set();
const arenaImage = new Image();
arenaImage.src = "assets/arena.png";
const startImage = new Image();
startImage.src = "assets/indiemanie-start-screen.png";
const johnnyAtlas = new Image();
johnnyAtlas.src = "assets/johnny-toxic-atlas.png?v=blue-key-3";
const joeyAtlas = new Image();
joeyAtlas.src = "assets/joey-image-atlas.png?v=full-template-1";
const philAtlas = new Image();
philAtlas.src = "assets/phil-stamper-atlas.png?v=phil-1";
const selectPortraits = {
  toxic: loadImage("assets/johnny-toxic-select.png"),
  image: loadImage("assets/joey-image-select.png"),
  phil: loadImage("assets/phil-stamper-select.png")
};

const SPRITE_CELL = { w: 128, h: 150 };
const JOHNNY_ANIMS = {
  idle: { row: 0, frames: 8, fps: 6 },
  walk: { row: 1, frames: 8, fps: 9 },
  run: { row: 1, frames: 8, fps: 13 },
  punch: { row: 2, frames: 4, fps: 10, once: true },
  kick: { row: 3, frames: 4, fps: 8, once: true },
  grapple: { row: 4, frames: 6, fps: 9, once: true },
  slam: { row: 5, frames: 4, fps: 7, once: true },
  finisher: { row: 5, frames: 5, fps: 6, once: true },
  pin: { row: 6, frames: 4, fps: 5, once: true },
  down: { row: 7, frames: 5, fps: 4, once: true },
  pinned: { row: 7, frames: 5, fps: 4, once: true },
  rise: { row: 7, frames: 5, fps: 5, once: true },
  whiff: { row: 2, frames: 2, fps: 9, once: true },
  celebrate: { row: 8, frames: 3, fps: 4 }
};

const state = {
  mode: "start",
  selectedIndex: 0,
  playerChoice: null,
  message: "Hit START to begin",
  shake: 0,
  flash: 0,
  lastTime: performance.now(),
  pin: null,
  cpuThink: 0,
  cpuIntent: "circle",
  result: null
};

const startButton = {
  x: W / 2 - 150,
  y: 506,
  w: 300,
  h: 56
};

const ring = {
  cx: W / 2,
  cy: 428,
  w: 540,
  h: 270,
  skew: 150
};

const roster = [
  {
    id: "toxic",
    name: "Johnny Toxic",
    finisher: "Toxic Spill",
    primary: "#68bf3d",
    secondary: "#1d2820",
    accent: "#f2e85c",
    sprite: "johnny"
  },
  {
    id: "image",
    name: "Joey Image",
    finisher: "Picture Perfect",
    primary: "#e64d9b",
    secondary: "#273c86",
    accent: "#f6f0ef",
    sprite: "joey"
  },
  {
    id: "phil",
    name: "Phil Stamper",
    finisher: "The Brainbuster",
    primary: "#8f3043",
    secondary: "#1a1c22",
    accent: "#d5d8df",
    sprite: "phil"
  }
];

let player;
let cpu;

function loadImage(src) {
  const image = new Image();
  image.src = src;
  return image;
}

window.addEventListener("keydown", (event) => {
  const key = normalizeKey(event);
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Shift"].includes(key)) {
    event.preventDefault();
  }
  if (!keys.has(key)) pressed.add(key);
  keys.add(key);
});

window.addEventListener("keyup", (event) => {
  keys.delete(normalizeKey(event));
});

canvas.addEventListener("click", (event) => {
  if (state.mode !== "start") return;
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * W;
  const y = ((event.clientY - rect.top) / rect.height) * H;
  if (
    x >= startButton.x &&
    x <= startButton.x + startButton.w &&
    y >= startButton.y &&
    y <= startButton.y + startButton.h
  ) {
    state.mode = "select";
    state.message = "Choose your wrestler";
  }
});

function normalizeKey(event) {
  if (event.key === " ") return " ";
  if (event.key === "Shift") return "Shift";
  return event.key.length === 1 ? event.key.toLowerCase() : event.key;
}

function makeWrestler(template, side, isPlayer) {
  return {
    ...template,
    isPlayer,
    side,
    x: side === "left" ? -135 : 135,
    y: side === "left" ? 20 : -20,
    vx: 0,
    vy: 0,
    face: side === "left" ? 1 : -1,
    stamina: 100,
    momentum: 0,
    recovery: 1,
    strength: 1,
    speed: 1,
    state: "idle",
    action: null,
    actionTime: 0,
    actionDuration: 0,
    stun: 0,
    down: 0,
    block: false,
    kickMash: 0,
    pinCooldown: 0,
    aiCooldown: 0,
    celebrate: 0
  };
}

function startMatch(choiceIndex) {
  const playerTemplate = roster[choiceIndex];
  const cpuTemplate = roster[(choiceIndex + 1) % roster.length];
  player = makeWrestler(playerTemplate, "left", true);
  cpu = makeWrestler(cpuTemplate, "right", false);
  state.mode = "fight";
  state.playerChoice = choiceIndex;
  state.message = `${player.name} vs ${cpu.name}`;
  state.pin = null;
  state.result = null;
  state.shake = 0;
  state.flash = 0;
}

function gameLoop(now) {
  const dt = Math.min(0.033, (now - state.lastTime) / 1000);
  state.lastTime = now;
  update(dt);
  draw();
  pressed.clear();
  requestAnimationFrame(gameLoop);
}

function update(dt) {
  state.shake = Math.max(0, state.shake - dt * 18);
  state.flash = Math.max(0, state.flash - dt * 2.5);

  if (state.mode === "start") {
    updateStart();
    return;
  }

  if (state.mode === "select") {
    updateSelect();
    return;
  }

  if (state.mode === "result") {
    player.celebrate += dt;
    cpu.celebrate += dt;
    if (pressed.has("Enter")) startMatch(state.playerChoice ?? 0);
    return;
  }

  if (state.pin) {
    updatePin(dt);
  } else {
    updateFighterTimers(player, dt);
    updateFighterTimers(cpu, dt);
    updatePlayer(dt);
    updateCpu(dt);
    resolveMovement(player, cpu, dt);
    resolveMovement(cpu, player, dt);
    separateFighters();
  }
}

function updateStart() {
  if (pressed.has("Enter")) {
    state.mode = "select";
    state.message = "Choose your wrestler";
  }
}

function updateSelect() {
  if (pressed.has("ArrowLeft")) {
    state.selectedIndex = (state.selectedIndex + roster.length - 1) % roster.length;
  }
  if (pressed.has("ArrowRight")) {
    state.selectedIndex = (state.selectedIndex + 1) % roster.length;
  }
  if (pressed.has("Enter") || pressed.has("z") || pressed.has("x")) {
    startMatch(state.selectedIndex);
  }
}

function updateFighterTimers(f, dt) {
  f.actionTime = Math.max(0, f.actionTime - dt);
  f.stun = Math.max(0, f.stun - dt);
  f.pinCooldown = Math.max(0, f.pinCooldown - dt);
  f.aiCooldown = Math.max(0, f.aiCooldown - dt);
  f.block = false;

  if (f.down > 0) {
    f.down = Math.max(0, f.down - dt * (0.42 + f.stamina / 145));
    f.state = "down";
    f.vx *= 0.9;
    f.vy *= 0.9;
    if (f.down === 0) f.state = "rise";
    return;
  }

  if (f.actionTime === 0 && ["punch", "kick", "grapple", "slam", "finisher", "whiff", "rise"].includes(f.state)) {
    f.state = "idle";
    f.action = null;
    f.actionDuration = 0;
  }
}

function canAct(f) {
  return f.actionTime === 0 && f.down === 0 && f.stun === 0 && !state.pin;
}

function updatePlayer(dt) {
  if (player.down > 0 || player.actionTime > 0 || player.stun > 0) return;
  player.block = keys.has("Shift");

  const input = getMoveInput();
  moveIntent(player, input.x, input.y, keys.has("c"), dt);

  if (pressed.has("z")) tryPunch(player, cpu);
  if (pressed.has("v")) tryKick(player, cpu);
  if (pressed.has("x")) tryGrapple(player, cpu);
  if (pressed.has("s")) tryFinisher(player, cpu);
  if (pressed.has("a")) tryPin(player, cpu);
}

function getMoveInput() {
  let x = 0;
  let y = 0;
  if (keys.has("ArrowLeft")) x -= 1;
  if (keys.has("ArrowRight")) x += 1;
  if (keys.has("ArrowUp")) y -= 1;
  if (keys.has("ArrowDown")) y += 1;
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}

function updateCpu(dt) {
  if (cpu.down > 0 || cpu.actionTime > 0 || cpu.stun > 0) return;

  state.cpuThink -= dt;
  const d = distance(cpu, player);
  if (state.cpuThink <= 0) {
    state.cpuThink = 0.25 + Math.random() * 0.45;
    if (player.down > 0 && d < 85 && cpu.pinCooldown === 0) state.cpuIntent = "pin";
    else if (cpu.momentum >= 100 && d < 70) state.cpuIntent = "finisher";
    else if (d < 55 && Math.random() < 0.38) state.cpuIntent = "grapple";
    else if (d < 82 && Math.random() < 0.22) state.cpuIntent = "kick";
    else if (d < 72 && Math.random() < 0.58) state.cpuIntent = "punch";
    else state.cpuIntent = cpu.stamina < 30 && player.stamina > cpu.stamina ? "retreat" : "approach";
  }

  if (state.cpuIntent === "pin") tryPin(cpu, player);
  if (state.cpuIntent === "finisher") tryFinisher(cpu, player);
  if (state.cpuIntent === "grapple") tryGrapple(cpu, player);
  if (state.cpuIntent === "punch") tryPunch(cpu, player);
  if (state.cpuIntent === "kick") tryKick(cpu, player);

  let tx = player.x - cpu.x;
  let ty = player.y - cpu.y;
  if (state.cpuIntent === "retreat") {
    tx = -tx;
    ty = -ty;
  }
  if (state.cpuIntent === "approach" || state.cpuIntent === "retreat") {
    const len = Math.hypot(tx, ty) || 1;
    moveIntent(cpu, tx / len, ty / len, false, dt);
  } else {
    moveIntent(cpu, 0, 0, false, dt);
  }
}

function moveIntent(f, ix, iy, running, dt) {
  const moving = Math.hypot(ix, iy) > 0;
  const topSpeed = (running ? 176 : 112) * f.speed * (f.block ? 0.52 : 1);
  const accel = running ? 410 : 270;
  const drag = moving ? 0.88 : 0.78;

  f.vx = f.vx * drag + ix * accel * dt;
  f.vy = f.vy * drag + iy * accel * dt;
  const speed = Math.hypot(f.vx, f.vy);
  if (speed > topSpeed) {
    f.vx = (f.vx / speed) * topSpeed;
    f.vy = (f.vy / speed) * topSpeed;
  }

  if (moving) f.face = ix !== 0 ? Math.sign(ix) : f.face;
  if (moving && f.state === "idle") f.state = running ? "run" : "walk";
  if (!moving && ["walk", "run"].includes(f.state)) f.state = "idle";
  if (running && moving) f.stamina = Math.max(0, f.stamina - dt * 2.7);
}

function resolveMovement(f, other, dt) {
  if (f.actionTime > 0 && f.state !== "down") {
    f.vx *= 0.88;
    f.vy *= 0.88;
  }
  f.x += f.vx * dt;
  f.y += f.vy * dt;

  const maxX = ring.w * 0.39 - Math.abs(f.y) * 0.25;
  const maxY = ring.h * 0.31;
  f.x = clamp(f.x, -maxX, maxX);
  f.y = clamp(f.y, -maxY, maxY);
  f.face = other.x >= f.x ? 1 : -1;
}

function separateFighters() {
  const d = distance(player, cpu);
  if (d > 0 && d < 34 && player.down === 0 && cpu.down === 0) {
    const push = (34 - d) / 2;
    const nx = (cpu.x - player.x) / d;
    const ny = (cpu.y - player.y) / d;
    player.x -= nx * push;
    player.y -= ny * push;
    cpu.x += nx * push;
    cpu.y += ny * push;
  }
}

function tryPunch(attacker, defender) {
  if (!canAct(attacker)) return;
  attacker.state = "punch";
  attacker.actionTime = 0.44;
  attacker.actionDuration = attacker.actionTime;
  attacker.action = "punch";
  if (inRange(attacker, defender, 58)) {
    const damage = defender.block ? 3 : 8;
    hit(attacker, defender, damage, 14, 0.28, false);
    state.message = `${attacker.name} lands a punch`;
  } else {
    whiff(attacker, `${attacker.name} misses the punch`);
  }
}

function tryKick(attacker, defender) {
  if (!canAct(attacker)) return;
  attacker.state = "kick";
  attacker.actionTime = 0.46;
  attacker.actionDuration = attacker.actionTime;
  attacker.action = "kick";
  if (inRange(attacker, defender, 76)) {
    const damage = defender.block ? 4 : 12;
    hit(attacker, defender, damage, 18, 0.36, false);
    defender.vx += attacker.face * 55;
    state.message = `${attacker.name} lands a kick`;
  } else {
    whiff(attacker, `${attacker.name} misses the kick`);
  }
}

function tryGrapple(attacker, defender) {
  if (!canAct(attacker)) return;
  attacker.state = "grapple";
  attacker.actionTime = 0.48;
  attacker.actionDuration = attacker.actionTime;
  attacker.action = "grapple";
  if (inRange(attacker, defender, 52)) {
    if (defender.stun > 0 || defender.stamina < 42) {
      attacker.state = "slam";
      attacker.actionTime = 0.72;
      attacker.actionDuration = attacker.actionTime;
      hit(attacker, defender, 18, 24, 0.9, true);
      knockAway(attacker, defender, 150);
      state.message = `${attacker.name} hits a heavy slam`;
    } else {
      hit(attacker, defender, 12, 18, 0.55, false);
      state.message = `${attacker.name} wins the grapple`;
    }
  } else {
    whiff(attacker, `${attacker.name} grabs air`);
  }
}

function tryFinisher(attacker, defender) {
  if (!canAct(attacker) || attacker.momentum < 100) return;
  attacker.state = "finisher";
  attacker.actionTime = 0.95;
  attacker.actionDuration = attacker.actionTime;
  attacker.action = "finisher";
  attacker.momentum = 0;
  if (inRange(attacker, defender, 64)) {
    hit(attacker, defender, 34, 0, 1.35, true);
    defender.down = 4.3;
    knockAway(attacker, defender, 210);
    state.shake = 1;
    state.flash = 1;
    state.message = `${attacker.finisher}!`;
  } else {
    whiff(attacker, `${attacker.name} misses ${attacker.finisher}`);
  }
}

function tryPin(attacker, defender) {
  if (!canAct(attacker) || defender.down <= 0 || !inRange(attacker, defender, 62) || attacker.pinCooldown > 0) return;
  positionPinAttacker(attacker, defender);
  attacker.state = "pin";
  defender.state = "down";
  attacker.vx = 0;
  attacker.vy = 0;
  defender.vx = 0;
  defender.vy = 0;
  state.pin = {
    attacker,
    defender,
    offsetX: attacker.x - defender.x,
    offsetY: attacker.y - defender.y,
    timer: 0,
    count: 0,
    next: 0.92,
    mash: 0
  };
  state.message = `${attacker.name} hooks the leg`;
}

function updatePin(dt) {
  const pin = state.pin;
  pin.timer += dt;
  pin.attacker.x = pin.defender.x + pin.offsetX;
  pin.attacker.y = pin.defender.y + pin.offsetY;
  pin.attacker.vx = 0;
  pin.attacker.vy = 0;
  pin.defender.vx = 0;
  pin.defender.vy = 0;
  pin.attacker.state = "pin";
  pin.defender.state = "down";

  if (pin.defender.isPlayer && pressed.has(" ")) {
    pin.mash = Math.min(28, pin.mash + 3.1);
    pin.defender.kickMash = pin.mash;
  }

  if (pin.timer >= pin.next) {
    if (shouldKickOut(pin.defender, pin.mash, pin.count + 1)) {
      endPin(true);
      return;
    }

    pin.count += 1;
    pin.next += 0.92;
    state.shake = 0.45;
    state.message = pin.count === 1 ? "One!" : pin.count === 2 ? "Two!" : "Three!";

    if (pin.count >= 3) {
      finishMatch(pin.attacker.isPlayer);
    }
  }
}

function positionPinAttacker(attacker, defender) {
  const side = attacker.x <= defender.x ? -1 : 1;
  attacker.x = clamp(defender.x + side * 10, -ring.w * 0.36, ring.w * 0.36);
  attacker.y = clamp(defender.y - 42, -ring.h * 0.28, ring.h * 0.28);
  attacker.face = side * -1;
  defender.face = side;
}

function shouldKickOut(defender, mash, count) {
  const staminaPart = defender.stamina / 100;
  const countPressure = count === 1 ? 0.26 : 0.53;
  const mashPart = defender.isPlayer ? mash / 40 : Math.random() * 0.34;
  const chance = staminaPart * 0.68 + mashPart + defender.recovery * 0.1 - countPressure;
  return Math.random() < clamp(chance, 0.05, 0.88);
}

function endPin(kickedOut) {
  const pin = state.pin;
  pin.attacker.state = "idle";
  pin.defender.state = "down";
  pin.defender.down = Math.max(0.85, pin.defender.down);
  pin.attacker.pinCooldown = 1.5;
  pin.defender.kickMash = 0;
  state.pin = null;
  state.message = kickedOut ? `${pin.defender.name} kicks out` : "";
}

function finishMatch(playerWon) {
  state.result = playerWon ? "win" : "loss";
  state.mode = "result";
  state.pin.attacker.state = "celebrate";
  state.pin.defender.state = "down";
  state.message = playerWon ? `${player.name} wins by pinfall` : `${cpu.name} wins by pinfall`;
}

function hit(attacker, defender, staminaDamage, momentumGain, stunTime, knockdown) {
  const actual = defender.block ? staminaDamage * 0.45 : staminaDamage;
  defender.stamina = clamp(defender.stamina - actual, 0, 100);
  defender.stun = Math.max(defender.stun, stunTime);
  if (knockdown) defender.down = Math.max(defender.down, 2.2 + (100 - defender.stamina) / 42);
  attacker.momentum = clamp(attacker.momentum + momentumGain, 0, 100);
  defender.momentum = clamp(defender.momentum + actual * 0.22, 0, 100);
  state.shake = Math.max(state.shake, 0.25);
}

function whiff(attacker, message) {
  if (!["punch", "kick"].includes(attacker.state)) {
    attacker.state = "whiff";
  }
  attacker.actionTime += 0.24;
  attacker.actionDuration = attacker.actionTime;
  attacker.stamina = Math.max(0, attacker.stamina - 2);
  state.message = message;
}

function knockAway(attacker, defender, force) {
  const dx = defender.x - attacker.x;
  const dy = defender.y - attacker.y;
  const len = Math.hypot(dx, dy) || 1;
  defender.vx += (dx / len) * force;
  defender.vy += (dy / len) * force;
}

function inRange(a, b, range) {
  return distance(a, b) <= range && Math.sign(b.x - a.x || a.face) === a.face;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, (a.y - b.y) * 1.18);
}

function drawOrder(a, b) {
  if (state.pin) {
    if (a === state.pin.attacker && b === state.pin.defender) return 1;
    if (a === state.pin.defender && b === state.pin.attacker) return -1;
  }
  return a.y - b.y;
}

function draw() {
  const ox = (Math.random() - 0.5) * state.shake * 8;
  const oy = (Math.random() - 0.5) * state.shake * 8;
  ctx.save();
  ctx.translate(ox, oy);
  drawBackground();
  drawRingBack();

  if (state.mode === "start") {
    drawStart();
  } else if (state.mode === "select") {
    drawRingFront();
    drawSelect();
  } else {
    const fighters = [player, cpu].sort(drawOrder);
    fighters.forEach(drawWrestler);
    drawRingFront();
    drawHud();
    drawMessage();
    if (state.mode === "result") drawResult();
  }

  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255, 238, 164, ${state.flash * 0.22})`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

function drawBackground() {
  if (arenaImage.complete && arenaImage.naturalWidth > 0) {
    const scale = Math.max(W / arenaImage.naturalWidth, H / arenaImage.naturalHeight);
    const dw = arenaImage.naturalWidth * scale;
    const dh = arenaImage.naturalHeight * scale;
    ctx.drawImage(arenaImage, (W - dw) / 2, (H - dh) / 2, dw, dh);
  } else {
    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, "#28171d");
    grd.addColorStop(0.5, "#141719");
    grd.addColorStop(1, "#060606");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.fillStyle = "rgba(0, 0, 0, 0.26)";
  ctx.fillRect(0, 0, W, H);

  const spotlight = ctx.createRadialGradient(W / 2, 455, 60, W / 2, 455, 390);
  spotlight.addColorStop(0, "rgba(255, 231, 177, 0.34)");
  spotlight.addColorStop(0.5, "rgba(255, 214, 139, 0.12)");
  spotlight.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = spotlight;
  ctx.fillRect(0, 0, W, H);

  const vignette = ctx.createRadialGradient(W / 2, H / 2, 210, W / 2, H / 2, 590);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.58)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
}

function ringPoint(x, y) {
  return {
    x: ring.cx + x + y * 0.46,
    y: ring.cy + y * 0.58
  };
}

function ringCorners() {
  return [
    ringPoint(-ring.w / 2, -ring.h / 2),
    ringPoint(ring.w / 2, -ring.h / 2),
    ringPoint(ring.w / 2, ring.h / 2),
    ringPoint(-ring.w / 2, ring.h / 2)
  ];
}

function ringMat(corners) {
  return corners.map((p) => ({
    x: ring.cx + (p.x - ring.cx) * 0.88,
    y: ring.cy + (p.y - ring.cy) * 0.84
  }));
}

function drawRingBack() {
  const outer = ringCorners();
  const mat = ringMat(outer);

  drawRingShadow(outer);
  drawRingPlatform(outer);
  drawMat(mat);
  drawBackPosts(outer);
  drawBackRopes(outer);
}

function drawRingFront() {
  const outer = ringCorners();
  drawSideRopeCaps(outer);
  drawFrontRopes(outer);
  drawFrontApron(outer);
  drawFrontPosts(outer);
}

function drawRingShadow(outer) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.48)";
  ctx.beginPath();
  outer.map((p) => ({ x: p.x + 12, y: p.y + 28 }))
    .forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
}

function drawRingPlatform(outer) {
  ctx.fillStyle = "#272a2d";
  ctx.beginPath();
  outer.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#3a3331";
  ctx.beginPath();
  [outer[1], outer[2], { x: outer[2].x, y: outer[2].y + 36 }, { x: outer[1].x, y: outer[1].y + 20 }]
    .forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
}

function drawMat(mat) {
  const matGradient = ctx.createLinearGradient(0, mat[0].y, 0, mat[2].y);
  matGradient.addColorStop(0, "#f5f1e4");
  matGradient.addColorStop(0.58, "#d7d0bf");
  matGradient.addColorStop(1, "#aaa08d");
  ctx.fillStyle = matGradient;
  ctx.beginPath();
  mat.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(73, 76, 88, 0.45)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  mat.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.stroke();

  ctx.strokeStyle = "rgba(83, 70, 58, 0.28)";
  ctx.lineWidth = 1;
  for (let i = -5; i <= 5; i += 1) {
    const a = lerpPoint(mat[0], mat[3], (i + 5) / 10);
    const b = lerpPoint(mat[1], mat[2], (i + 5) / 10);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(40, 43, 50, 0.16)";
  for (let i = 0; i < 28; i += 1) {
    const t = (i * 37 % 100) / 100;
    const u = (i * 53 % 100) / 100;
    const left = lerpPoint(mat[0], mat[3], u);
    const right = lerpPoint(mat[1], mat[2], u);
    const p = lerpPoint(left, right, t);
    ctx.fillRect(p.x - 12, p.y - 2, 24 + (i % 3) * 8, 3);
  }
}

function drawFrontApron(outer) {
  const topLeft = outer[3];
  const topRight = outer[2];
  const bottomRight = { x: outer[2].x, y: outer[2].y + 52 };
  const bottomLeft = { x: outer[3].x, y: outer[3].y + 52 };

  const apron = ctx.createLinearGradient(0, topLeft.y, 0, bottomLeft.y);
  apron.addColorStop(0, "#181d24");
  apron.addColorStop(0.5, "#242a37");
  apron.addColorStop(1, "#0d1016");
  ctx.fillStyle = apron;
  ctx.beginPath();
  [topLeft, topRight, bottomRight, bottomLeft]
    .forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#556071";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(topLeft.x + 8, topLeft.y + 10);
  ctx.lineTo(topRight.x - 8, topRight.y + 10);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i += 1) {
    const a = lerpPoint(bottomLeft, bottomRight, i / 8);
    ctx.beginPath();
    ctx.moveTo(a.x + 4, a.y - 6);
    ctx.lineTo(a.x + 34, a.y - 6);
    ctx.stroke();
  }
}

function drawBackPosts(corners) {
  drawPost(corners[0], 0, false);
  drawPost(corners[1], 1, false);
}

function drawFrontPosts(corners) {
  drawPost(corners[3], 3, true);
  drawPost(corners[2], 2, true);
}

function drawPost(p, cornerIndex, front) {
  const postW = front ? 20 : 16;
  const postH = front ? 142 : 124;
  const top = p.y - postH + 12;

  ctx.fillStyle = front ? "#171b24" : "#252932";
  ctx.fillRect(p.x - postW / 2, top, postW, postH);
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.fillRect(p.x - postW / 2 + 4, top + 5, 4, postH - 12);
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(p.x + postW / 2 - 5, top + 6, 4, postH - 12);
  ctx.fillStyle = "#dfe8ef";
  ctx.fillRect(p.x - postW / 2 - 3, top - 5, postW + 6, 8);

  const colors = cornerIndex === 1 || cornerIndex === 3
    ? ["#e51f2f", "#e6edf5", "#1f63d8"]
    : ["#1f63d8", "#e6edf5", "#222936"];
  [94, 66, 38].forEach((lift, i) => drawTurnbuckle(p.x, p.y - lift, colors[i], front));
}

function drawTurnbuckle(x, y, color, front) {
  const w = front ? 42 : 36;
  const h = front ? 22 : 18;
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(x - w / 2 + 4, y - h / 2 + 4, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.fillStyle = "rgba(255, 255, 255, 0.32)";
  ctx.fillRect(x - w / 2 + 4, y - h / 2 + 3, w - 10, 4);
  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.fillRect(x - w / 2, y + h / 2 - 5, w, 5);
}

function drawBackRopes(corners) {
  for (let i = 0; i < 3; i += 1) {
    const lift = 94 - i * 28;
    drawRopeSegment(corners[0], corners[1], lift, ropeColor(i), 4);
    drawRopeSegment(corners[0], corners[3], lift, ropeColor(i), 3);
    drawRopeSegment(corners[1], corners[2], lift, ropeColor(i), 3);
  }
}

function drawFrontRopes(corners) {
  for (let i = 0; i < 3; i += 1) {
    const lift = 94 - i * 28;
    drawRopeSegment(corners[3], corners[2], lift, ropeColor(i), 7);
  }
}

function drawSideRopeCaps(corners) {
  for (let i = 0; i < 3; i += 1) {
    const lift = 94 - i * 28;
    const leftMid = lerpPoint(corners[0], corners[3], 0.62);
    const rightMid = lerpPoint(corners[1], corners[2], 0.62);
    drawRopeSegment(leftMid, corners[3], lift, ropeColor(i), 6);
    drawRopeSegment(rightMid, corners[2], lift, ropeColor(i), 6);
  }
}

function drawRopeSegment(a, b, lift, color, width) {
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
  ctx.lineWidth = width + 4;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y - lift + 4);
  ctx.lineTo(b.x, b.y - lift + 4);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y - lift);
  ctx.lineTo(b.x, b.y - lift);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.lineWidth = Math.max(1, width * 0.22);
  ctx.beginPath();
  ctx.moveTo(a.x + 2, a.y - lift - width * 0.22);
  ctx.lineTo(b.x - 2, b.y - lift - width * 0.22);
  ctx.stroke();
  ctx.lineCap = "butt";
}

function ropeColor(index) {
  return index === 0 ? "#f22a36" : index === 1 ? "#edf2fa" : "#1765e8";
}

function drawRing() {
  drawRingBack();
  drawRingFront();
}

function lerpPoint(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t
  };
}

function drawStart() {
  if (startImage.complete && startImage.naturalWidth > 0) {
    const scale = Math.max(W / startImage.naturalWidth, H / startImage.naturalHeight);
    const dw = startImage.naturalWidth * scale;
    const dh = startImage.naturalHeight * scale;
    ctx.drawImage(startImage, (W - dw) / 2, (H - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = "#080808";
    ctx.fillRect(0, 0, W, H);
  }

  const pulse = 0.68 + Math.sin(performance.now() / 240) * 0.18;
  ctx.fillStyle = `rgba(0, 0, 0, ${pulse})`;
  ctx.fillRect(startButton.x, startButton.y, startButton.w, startButton.h);
  ctx.strokeStyle = "#f4c44f";
  ctx.lineWidth = 4;
  ctx.strokeRect(startButton.x, startButton.y, startButton.w, startButton.h);

  ctx.textAlign = "center";
  ctx.fillStyle = "#0a0a0a";
  ctx.font = "28px Impact";
  ctx.fillText("Hit START to begin", W / 2 + 3, startButton.y + 38);
  ctx.fillStyle = "#f4c44f";
  ctx.fillText("Hit START to begin", W / 2, startButton.y + 35);
}

function drawSelect() {
  ctx.textAlign = "center";
  ctx.fillStyle = "#f5ead8";
  ctx.font = "30px Impact";
  ctx.fillText("Choose Your Wrestler", W / 2, 116);

  roster.forEach((r, i) => {
    const gap = 250;
    const x = W / 2 - ((roster.length - 1) * gap) / 2 + i * gap;
    const y = 352;
    ctx.fillStyle = state.selectedIndex === i ? "#f4c44f" : "#2a2e32";
    ctx.fillRect(x - 130, y - 124, 260, 248);
    ctx.fillStyle = "#111";
    ctx.fillRect(x - 118, y - 112, 236, 224);
    drawPortrait(r, x, y - 6, state.selectedIndex === i);
    ctx.fillStyle = "#f5ead8";
    ctx.font = "25px Impact";
    ctx.fillText(r.name, x, y + 92);
  });

  ctx.fillStyle = "#f4c44f";
  ctx.font = "18px Arial";
  ctx.fillText("Arrow keys choose. Enter starts.", W / 2, 562);
}

function drawPortrait(r, x, y, selected) {
  const portrait = selectPortraits[r.id];
  if (portrait && portrait.complete && portrait.naturalWidth > 0) {
    drawSelectPortraitImage(portrait, r, x, y, selected);
    return;
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(0,0,0,.45)";
  ctx.beginPath();
  ctx.ellipse(0, 58, 70, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = r.secondary;
  ctx.fillRect(-34, -2, 68, 78);
  ctx.fillStyle = r.primary;
  ctx.fillRect(-48, 4, 28, 72);
  ctx.fillRect(20, 4, 28, 72);
  ctx.fillStyle = "#d39a70";
  ctx.fillRect(-24, -58, 48, 46);
  ctx.fillStyle = selected ? r.accent : "#f5ead8";
  ctx.fillRect(-30, -16, 60, 18);
  ctx.restore();
}

function drawSelectPortraitImage(image, r, x, y, selected) {
  const w = 176;
  const h = 176;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = selected ? r.primary : "#28303a";
  ctx.fillRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12);
  ctx.fillStyle = "#101317";
  ctx.fillRect(-w / 2, -h / 2, w, h);

  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (image.naturalWidth - sw) / 2;
  const sy = (image.naturalHeight - sh) / 2;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, sx, sy, sw, sh, -w / 2, -h / 2, w, h);
  ctx.imageSmoothingEnabled = true;

  ctx.strokeStyle = selected ? "#f4c44f" : "#5f6d7c";
  ctx.lineWidth = 4;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawWrestler(f) {
  const p = ringPoint(f.x, f.y);
  const scale = 0.92 + ((f.y + ring.h / 2) / ring.h) * 0.28;
  const atlas = getSpriteAtlas(f);
  if (atlas) {
    drawSpriteWrestler(f, p, scale, atlas);
    return;
  }

  drawBlockWrestler(f, p, scale);
}

function getSpriteAtlas(f) {
  const atlas = f.sprite === "johnny" ? johnnyAtlas : f.sprite === "joey" ? joeyAtlas : f.sprite === "phil" ? philAtlas : null;
  return atlas && atlas.complete && atlas.naturalWidth > 0 ? atlas : null;
}

function drawSpriteWrestler(f, p, scale, atlas) {
  const pose = JOHNNY_ANIMS[f.state] ? f.state : "idle";
  const anim = JOHNNY_ANIMS[pose];
  const holdLastFrame = ["pin", "pinned", "down", "rise"].includes(pose);
  const elapsed = anim.once && f.actionDuration > 0
    ? Math.max(0, f.actionDuration - f.actionTime)
    : performance.now() / 1000;
  const frame = anim.once && f.actionDuration > 0
    ? Math.min(anim.frames - 1, Math.floor((elapsed / f.actionDuration) * anim.frames))
    : holdLastFrame
      ? anim.frames - 1
      : Math.floor(elapsed * anim.fps) % anim.frames;
  const sx = frame * SPRITE_CELL.w;
  const sy = anim.row * SPRITE_CELL.h;
  const spriteScale = scale * 1.16;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(f.face, 1);
  ctx.fillStyle = "rgba(0,0,0,.36)";
  ctx.beginPath();
  ctx.ellipse(0, 24 * scale, 30 * scale, 9 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    atlas,
    sx,
    sy,
    SPRITE_CELL.w,
    SPRITE_CELL.h,
    -SPRITE_CELL.w * spriteScale * 0.5,
    -SPRITE_CELL.h * spriteScale + 40 * scale,
    SPRITE_CELL.w * spriteScale,
    SPRITE_CELL.h * spriteScale
  );
  ctx.imageSmoothingEnabled = true;
  ctx.restore();

  if (f.stun > 0 && f.down === 0) {
    ctx.fillStyle = "#f4c44f";
    ctx.font = "18px Impact";
    ctx.textAlign = "center";
    ctx.fillText("STUN", p.x, p.y - 118 * scale);
  }
}

function drawBlockWrestler(f, p, scale) {
  const pose = f.state;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(scale * f.face, scale);
  ctx.fillStyle = "rgba(0,0,0,.35)";
  ctx.beginPath();
  ctx.ellipse(0, 26, pose === "down" || pose === "pinned" ? 52 : 30, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  if (pose === "down" || pose === "pinned") {
    ctx.rotate(-0.08);
    ctx.fillStyle = f.secondary;
    ctx.fillRect(-48, 0, 92, 26);
    ctx.fillStyle = f.primary;
    ctx.fillRect(-28, -16, 50, 24);
    ctx.fillStyle = "#d39a70";
    ctx.fillRect(28, -12, 24, 20);
  } else {
    const bob = pose === "walk" || pose === "run" ? Math.sin(performance.now() / 90) * 2 : 0;
    const attackReach = pose === "punch" ? 24 : pose === "kick" ? 34 : pose === "grapple" || pose === "finisher" ? 18 : 0;
    ctx.fillStyle = f.primary;
    ctx.fillRect(-25, -54 + bob, 50, 58);
    ctx.fillStyle = f.secondary;
    ctx.fillRect(-27, -3, 22, 52);
    ctx.fillRect(5, -3, 22, 52);
    ctx.fillStyle = "#d39a70";
    ctx.fillRect(-20, -92 + bob, 40, 36);
    ctx.fillStyle = f.accent;
    ctx.fillRect(-26, -56 + bob, 52, 10);
    ctx.fillStyle = "#d39a70";
    ctx.fillRect(18, -48 + bob, 18 + attackReach, 16);
    ctx.fillRect(-38, -47 + bob, 18, 16);
    if (pose === "kick") {
      ctx.fillStyle = f.secondary;
      ctx.fillRect(10, 26 + bob, 52, 16);
      ctx.fillStyle = f.primary;
      ctx.fillRect(56, 24 + bob, 20, 18);
    }
    if (pose === "block") {
      ctx.fillStyle = "rgba(244,196,79,.5)";
      ctx.fillRect(18, -74, 8, 72);
    }
  }
  ctx.restore();

  if (f.stun > 0 && f.down === 0) {
    ctx.fillStyle = "#f4c44f";
    ctx.font = "18px Impact";
    ctx.textAlign = "center";
    ctx.fillText("STUN", p.x, p.y - 92);
  }
}

function drawHud() {
  drawBar(34, 28, 330, 18, player.stamina / 100, player.primary, player.name);
  drawBar(34, 54, 330, 12, player.momentum / 100, "#f4c44f", "");
  drawBar(W - 364, 28, 330, 18, cpu.stamina / 100, cpu.primary, cpu.name);
  drawBar(W - 364, 54, 330, 12, cpu.momentum / 100, "#f4c44f", "");

  if (state.pin) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#f4c44f";
    ctx.font = "64px Impact";
    ctx.fillText(state.pin.count > 0 ? state.pin.count : "PIN", W / 2, 118);
    if (state.pin.defender.isPlayer) {
      ctx.font = "18px Arial";
      ctx.fillStyle = "#f5ead8";
      ctx.fillText("Tap Space to kick out", W / 2, 145);
    }
  }
}

function drawBar(x, y, w, h, pct, fill, label) {
  ctx.fillStyle = "#070707";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 3, y + 3, (w - 6) * clamp(pct, 0, 1), h - 6);
  ctx.strokeStyle = "#f5ead8";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#f5ead8";
  ctx.font = "14px Arial";
  ctx.textAlign = "left";
  ctx.fillText(label, x, y - 5);
}

function drawMessage() {
  ctx.textAlign = "center";
  ctx.fillStyle = "#f5ead8";
  ctx.font = "22px Impact";
  ctx.fillText(state.message, W / 2, H - 32);
}

function drawResult() {
  ctx.fillStyle = "rgba(0,0,0,.7)";
  ctx.fillRect(0, 0, W, H);
  drawTitle(180);
  ctx.textAlign = "center";
  ctx.fillStyle = state.result === "win" ? "#f4c44f" : "#e74846";
  ctx.font = "54px Impact";
  ctx.fillText(state.result === "win" ? "Victory by Pinfall" : "Defeat by Pinfall", W / 2, 300);
  ctx.fillStyle = "#f5ead8";
  ctx.font = "22px Arial";
  ctx.fillText("Press Enter to run it back", W / 2, 350);
}

function drawTitle(y) {
  ctx.textAlign = "center";
  ctx.fillStyle = "#0a0a0a";
  ctx.font = "76px Impact";
  ctx.fillText("RUMBLE64", W / 2 + 5, y + 5);
  ctx.fillStyle = "#f4c44f";
  ctx.fillText("RUMBLE64", W / 2, y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

requestAnimationFrame(gameLoop);
