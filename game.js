const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function fitCanvas(){
  canvas.width = Math.min(window.innerWidth * 0.9, 900);
  canvas.height = Math.max(300, window.innerHeight * 0.6);
  // keep paddles inside after resize
  left.y = Math.max(0, Math.min(canvas.height - PADDLE_H, left.y));
  right.x = canvas.width - 10 - PADDLE_W;
  right.y = Math.max(0, Math.min(canvas.height - PADDLE_H, right.y));
}

const PADDLE_W = 12;
const PADDLE_H = 90;
const PADDLE_SPEED = 6;

const left = { x: 10, y: 100 };
const right = { x: canvas.width - 10 - PADDLE_W, y: 100 };

// now that paddles/constants exist, size the canvas and handle resize
fitCanvas();
window.addEventListener('resize', fitCanvas);

let ball = { x: canvas.width/2, y: canvas.height/2, r: 8, vx: 5, vy: 3 };
let leftScore = 0, rightScore = 0;
let paused = false;
let serveTimer = 0;
let gameOver = false;
let winner = null;

// audio
let audioCtx = null;
function ensureAudio(){
  if (audioCtx) return;
  try{ audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ audioCtx = null; }
}

function playBeep(freq=440, duration=0.08, type='sine', when=0, vol=0.08){
  if (!audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.value = vol;
  o.connect(g); g.connect(audioCtx.destination);
  const start = audioCtx.currentTime + when;
  o.start(start); o.stop(start + duration);
}

function playHitSound(){ ensureAudio(); playBeep(900, 0.06, 'square', 0, 0.06); }
function playScoreSound(){ ensureAudio(); playBeep(220, 0.18, 'sine', 0, 0.12); }

function playVictoryMusic(cb){
  ensureAudio(); if (!audioCtx) { if (cb) cb(); return; }
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  let t = 0;
  notes.forEach((n,i)=>{ playBeep(n, 0.25, 'sine', t, 0.12); t += 0.3; });
  // short flourish
  setTimeout(()=>{ playBeep(880,0.18,'sawtooth',0,0.14); if (cb) cb(); }, (t+0.05)*1000);
}

const keys = {};
document.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === ' ') {
    // resume audio on first gesture
    ensureAudio(); if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    if (gameOver){
      // restart after game over
      leftScore = 0; rightScore = 0; gameOver = false; winner = null; resetBall(Math.random()<0.5?1:-1); paused = false;
    } else {
      paused = !paused;
    }
  }
});
document.addEventListener('keyup', e => { keys[e.key] = false; });

// AI settings
const aiToggle = document.getElementById('ai-toggle');
const aiDifficulty = document.getElementById('ai-difficulty');
let aiEnabled = localStorage.getItem('pong_ai') === 'true';
let aiLevel = localStorage.getItem('pong_ai_level') || 'medium';
if (aiToggle) aiToggle.checked = aiEnabled;
if (aiDifficulty) aiDifficulty.value = aiLevel;
if (aiToggle) aiToggle.addEventListener('change', e => { aiEnabled = e.target.checked; localStorage.setItem('pong_ai', aiEnabled); });
if (aiDifficulty) aiDifficulty.addEventListener('change', e => { aiLevel = e.target.value; localStorage.setItem('pong_ai_level', aiLevel); });

function resetBall(direction){
  ball.x = canvas.width/2; ball.y = canvas.height/2;
  ball.vx = (direction || (Math.random() < 0.5 ? 1 : -1)) * 5;
  ball.vy = (Math.random() * 4 - 2);
  paused = true; serveTimer = 60; // pause ~1s (60 frames)
}

function aiStep(){
  if (!aiEnabled) return;
  // difficulty tuning
  let maxSpeed = 4; let error = 12;
  if (aiLevel === 'easy'){ maxSpeed = 2.5; error = 30; }
  if (aiLevel === 'medium'){ maxSpeed = 4; error = 14; }
  if (aiLevel === 'hard'){ maxSpeed = 7; error = 6; }

  // predictive target with some error
  const target = ball.y - PADDLE_H/2 + (Math.random() - 0.5) * error;
  const delta = target - right.y;
  const step = Math.max(-maxSpeed, Math.min(maxSpeed, delta));
  right.y += step;
}

function update(){
  if (serveTimer > 0){ serveTimer--; if (serveTimer === 0 && !gameOver) paused = false; }
  if (!paused){
    // paddles (left always human)
    if (keys['w'] || keys['W']) left.y -= PADDLE_SPEED;
    if (keys['s'] || keys['S']) left.y += PADDLE_SPEED;
    if (!aiEnabled){
      if (keys['ArrowUp']) right.y -= PADDLE_SPEED;
      if (keys['ArrowDown']) right.y += PADDLE_SPEED;
    } else {
      aiStep();
    }

    left.y = Math.max(0, Math.min(canvas.height - PADDLE_H, left.y));
    right.y = Math.max(0, Math.min(canvas.height - PADDLE_H, right.y));

    // ball
    ball.x += ball.vx;
    ball.y += ball.vy;

    // top/bottom
    if (ball.y - ball.r < 0){ ball.y = ball.r; ball.vy *= -1; }
    if (ball.y + ball.r > canvas.height){ ball.y = canvas.height - ball.r; ball.vy *= -1; }

    // left paddle collision
    if (ball.x - ball.r < left.x + PADDLE_W && ball.x - ball.r > left.x){
      if (ball.y > left.y && ball.y < left.y + PADDLE_H){
        ball.x = left.x + PADDLE_W + ball.r;
        ball.vx *= -1.05; ball.vy += (ball.y - (left.y + PADDLE_H/2)) * 0.03;
        playHitSound();
      }
    }

    // right paddle collision
    if (ball.x + ball.r > right.x && ball.x + ball.r < right.x + PADDLE_W){
      if (ball.y > right.y && ball.y < right.y + PADDLE_H){
        ball.x = right.x - ball.r;
        ball.vx *= -1.05; ball.vy += (ball.y - (right.y + PADDLE_H/2)) * 0.03;
        playHitSound();
      }
    }

    // score
    if (ball.x < 0){
      rightScore++;
      playScoreSound();
      if (rightScore >= 10){
        winner = 'Right Player';
        gameOver = true;
        paused = true;
        ball.vx = 0; ball.vy = 0;
        playVictoryMusic();
      } else {
        resetBall(1);
      }
    }
    if (ball.x > canvas.width){
      leftScore++;
      playScoreSound();
      if (leftScore >= 10){
        winner = 'Left Player';
        gameOver = true;
        paused = true;
        ball.vx = 0; ball.vy = 0;
        playVictoryMusic();
      } else {
        resetBall(-1);
      }
    }
  }
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // middle line
  ctx.fillStyle = '#222';
  for (let y=0; y<canvas.height; y+=20) ctx.fillRect(canvas.width/2 -1, y, 2, 12);

  // paddles
  ctx.fillStyle = '#fff';
  ctx.fillRect(left.x, left.y, PADDLE_W, PADDLE_H);
  ctx.fillRect(right.x, right.y, PADDLE_W, PADDLE_H);

  // ball
  ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2); ctx.fill();

  // scores
  ctx.font = '36px system-ui,Segoe UI,Roboto,Arial'; ctx.textAlign = 'center';
  ctx.fillText(leftScore, canvas.width*0.25, 50);
  ctx.fillText(rightScore, canvas.width*0.75, 50);

  if (gameOver){
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#fff'; ctx.font = '48px system-ui,Segoe UI,Roboto,Arial'; ctx.textAlign = 'center';
    ctx.fillText((winner || 'Player') + ' Wins!', canvas.width/2, canvas.height/2 - 10);
    ctx.font = '20px system-ui,Segoe UI,Roboto,Arial'; ctx.fillText('Press Space to restart', canvas.width/2, canvas.height/2 + 30);
  } else if (paused && serveTimer === 0){
    ctx.font = '20px system-ui,Segoe UI,Roboto,Arial'; ctx.fillText('Paused — press Space', canvas.width/2, canvas.height - 30);
  }
}

function loop(){ update(); draw(); requestAnimationFrame(loop); }
resetBall(Math.random() < 0.5 ? 1 : -1);
loop();
