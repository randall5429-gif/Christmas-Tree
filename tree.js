/* ---------- Setup ---------- */
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const audio = document.getElementById("music");
const musicBtn = document.getElementById("musicBtn");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

/* ---------- Constants ---------- */
const centerX = () => canvas.width / 2;
const topY = () => canvas.height * 0.2;
const STAR_COUNT = 350;
const TREE_HEIGHT = 280;
const TREE_RADIUS = 140;
const GARLAND_TURNS = 4;
const PERSPECTIVE = 600;
const GARLAND_ANIMATION = { speed: 0.02, waveSpeed: 0.04, amplitude: 6 };

/* ---------- State ---------- */
const stars = [];
let rotation = 0;
let musicLevel = 0;

/* ---------- Create Lights ---------- */
for (let i = 0; i < STAR_COUNT; i++) {
  const h = Math.random();
  const radius = h * TREE_RADIUS;
  const angle = Math.random() * Math.PI * 2;
  stars.push({
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
    y: h * TREE_HEIGHT,
    size: Math.random() * 2 + 1,
    alpha: Math.random() * 0.7 + 0.3,
    speed: Math.random() * 0.02 + 0.01
  });
}

/* ---------- Audio Setup ---------- */
let audioCtx, analyser, dataArray, bufferLength;
function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaElementSource(audio);
  analyser = audioCtx.createAnalyser();
  source.connect(analyser);
  analyser.connect(audioCtx.destination);
  analyser.fftSize = 256;
  bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);
}

/* ---------- 3D Projection ---------- */
function project3D(x, y, z) {
  const scale = PERSPECTIVE / (PERSPECTIVE + z);
  return { x: centerX() + x * scale, y: topY() + y * scale, scale };
}

/* ---------- Star Topper ---------- */
function drawTopStar(x, y, r, glow) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.shadowColor = "gold";
  ctx.shadowBlur = glow;
  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    ctx.lineTo(Math.cos((i * 2 * Math.PI) / 5) * r,
               Math.sin((i * 2 * Math.PI) / 5) * r);
    ctx.lineTo(Math.cos(((i * 2 + 1) * Math.PI) / 5) * (r / 2),
               Math.sin(((i * 2 + 1) * Math.PI) / 5) * (r / 2));
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* ---------- Lights ---------- */
function drawLight(x, y, size, alpha, scale) {
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.shadowColor = "white";
  ctx.shadowBlur = 6 * scale;
  ctx.beginPath();
  ctx.arc(x, y, size * scale, 0, Math.PI * 2);
  ctx.fill();
}

/* ---------- Garland ---------- */
function drawGarland() {
  const time = Date.now();
  if (analyser) {
    analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
    musicLevel = sum / bufferLength;
  }

  for (let j = 0; j < 3; j++) {
    const hue = (time * 0.05 + j * 120) % 360;
    const brightness = 40 + musicLevel * 0.8;
    ctx.strokeStyle = `hsl(${hue}, 100%, ${brightness}%)`;
    ctx.lineWidth = 2;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    let first = true;
    for (let i = 0; i <= 500; i++) {
      const t = i / 500;
      const angle = t * GARLAND_TURNS * Math.PI * 2 - rotation - time * GARLAND_ANIMATION.speed * 0.001;
      const wave = Math.sin(time * GARLAND_ANIMATION.waveSpeed * 0.001 + t * 12) *
                   (GARLAND_ANIMATION.amplitude + musicLevel * 0.2);
      const radius = t * TREE_RADIUS + wave + j * 4;
      const x3 = Math.cos(angle) * radius;
      const z3 = Math.sin(angle) * radius;
      const y3 = t * TREE_HEIGHT;
      const p = project3D(x3, y3, z3);
      if (first) { ctx.moveTo(p.x, p.y); first = false; } else { ctx.lineTo(p.x, p.y); }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

/* ---------- Animation Loop ---------- */
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  rotation -= 0.003;
  drawGarland();
  stars.sort((a, b) => b.z - a.z);
  stars.forEach(star => {
    star.alpha += star.speed;
    if (star.alpha > 1 || star.alpha < 0.3) star.speed *= -1;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const xRot = star.x * cos - star.z * sin;
    const zRot = star.x * sin + star.z * cos;
    const p = project3D(xRot, star.y, zRot);
    drawLight(p.x, p.y, star.size, star.alpha * (0.5 + musicLevel / 512), p.scale);
  });
  const pulse = 12 + Math.sin(Date.now() * 0.004) * 6 + musicLevel / 10;
  drawTopStar(centerX(), topY() - 12, 16, pulse);
  requestAnimationFrame(animate);
}

animate();

/* ---------- Button Play ---------- */
musicBtn.addEventListener("click", () => {
  if (!audioCtx) initAudio();
  audio.play().then(() => {
    if (audioCtx.state === "suspended") audioCtx.resume();
    musicBtn.style.display = "none";
  }).catch(err => console.error("Music play error:", err));
});
