const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const audio = document.getElementById("music");
const musicBtn = document.getElementById("musicBtn");

const STAR_COUNT = 420;
const NEEDLE_COUNT = 900;
const ORNAMENT_COUNT = 72;
const SNOW_COUNT = 120;
const GARLAND_TURNS = 4.25;
const PERSPECTIVE = 650;

const lights = [];
const needles = [];
const ornaments = [];
const snowflakes = [];
const audioBands = { bass: 0, mid: 0, treble: 0, level: 0 };

let viewportWidth = window.innerWidth;
let viewportHeight = window.innerHeight;
let treeHeight = 300;
let treeRadius = 150;
let rotation = 0;
let audioCtx;
let analyser;
let dataArray;
let audioAnalysisFailed = false;

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function centerX() {
  return viewportWidth / 2;
}

function topY() {
  return viewportHeight * 0.14;
}

function resize() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  viewportWidth = window.innerWidth;
  viewportHeight = window.innerHeight;

  canvas.width = Math.floor(viewportWidth * pixelRatio);
  canvas.height = Math.floor(viewportHeight * pixelRatio);
  canvas.style.width = `${viewportWidth}px`;
  canvas.style.height = `${viewportHeight}px`;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  treeHeight = Math.min(viewportHeight * 0.62, viewportWidth * 0.95, 430);
  treeRadius = Math.max(78, Math.min(viewportWidth * 0.28, treeHeight * 0.46));
}

function project3D(x, y, z) {
  const scale = PERSPECTIVE / (PERSPECTIVE + z);

  return {
    x: centerX() + x * scale,
    y: topY() + y * scale,
    scale
  };
}

function createConicPoint(minSize, maxSize) {
  const h = Math.pow(Math.random(), 0.72);
  const radius = h * treeRadius * rand(0.2, 1);
  const angle = Math.random() * Math.PI * 2;

  return {
    angle,
    h,
    radiusRatio: radius / treeRadius,
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
    y: h * treeHeight,
    size: rand(minSize, maxSize),
    phase: Math.random() * Math.PI * 2,
    speed: rand(0.008, 0.025)
  };
}

function rebuildTree() {
  lights.length = 0;
  needles.length = 0;
  ornaments.length = 0;
  snowflakes.length = 0;

  for (let i = 0; i < NEEDLE_COUNT; i++) {
    const needle = createConicPoint(0.8, 2.5);
    needle.green = rand(58, 112);
    needle.alpha = rand(0.36, 0.88);
    needles.push(needle);
  }

  for (let i = 0; i < STAR_COUNT; i++) {
    const light = createConicPoint(1.2, 3.1);
    light.alpha = rand(0.42, 0.95);
    light.color = Math.random() > 0.18 ? "255,255,246" : "255,210,96";
    lights.push(light);
  }

  const ornamentColors = ["#e84a5f", "#2fc4b2", "#ffcf56", "#ffffff", "#5dade2"];
  for (let i = 0; i < ORNAMENT_COUNT; i++) {
    const ornament = createConicPoint(3.4, 6.4);
    ornament.color = ornamentColors[i % ornamentColors.length];
    ornament.phase = Math.random() * Math.PI * 2;
    ornaments.push(ornament);
  }

  for (let i = 0; i < SNOW_COUNT; i++) {
    snowflakes.push({
      x: rand(0, window.innerWidth),
      y: rand(0, window.innerHeight),
      size: rand(0.7, 2.2),
      speed: rand(0.22, 0.9),
      drift: rand(-0.25, 0.25),
      alpha: rand(0.25, 0.78)
    });
  }
}

function initAudio() {
  if (audioCtx || audioAnalysisFailed) return;

  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaElementSource(audio);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
  } catch (error) {
    audioAnalysisFailed = true;
    audioCtx = null;
    analyser = null;
    dataArray = null;
    console.warn("Music will play without audio-reactive effects:", error);
  }
}

function updateAudioBands() {
  if (!analyser) {
    audioBands.bass *= 0.92;
    audioBands.mid *= 0.92;
    audioBands.treble *= 0.92;
    audioBands.level *= 0.92;
    return;
  }

  analyser.getByteFrequencyData(dataArray);

  const bass = averageBand(0, 12);
  const mid = averageBand(13, 54);
  const treble = averageBand(55, dataArray.length - 1);
  const level = (bass + mid + treble) / 3;

  audioBands.bass += (bass - audioBands.bass) * 0.18;
  audioBands.mid += (mid - audioBands.mid) * 0.16;
  audioBands.treble += (treble - audioBands.treble) * 0.14;
  audioBands.level += (level - audioBands.level) * 0.16;
}

function averageBand(start, end) {
  let sum = 0;
  let count = 0;

  for (let i = start; i <= end && i < dataArray.length; i++) {
    sum += dataArray[i];
    count++;
  }

  return count ? sum / count : 0;
}

function rotatePoint(point, extraRotation = 0) {
  const radius = point.radiusRatio * treeRadius;
  const angle = point.angle + rotation + extraRotation;

  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
    y: point.h * treeHeight
  };
}

function drawBackground(time) {
  const glow = ctx.createRadialGradient(centerX(), topY() + treeHeight * 0.42, 0, centerX(), topY() + treeHeight * 0.42, treeHeight * 0.9);

  glow.addColorStop(0, `rgba(26, 130, 76, ${0.1 + audioBands.mid / 1600})`);
  glow.addColorStop(0.48, "rgba(12, 52, 55, 0.18)");
  glow.addColorStop(1, "rgba(3, 8, 15, 0)");

  ctx.fillStyle = "#07101c";
  ctx.fillRect(0, 0, viewportWidth, viewportHeight);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, viewportWidth, viewportHeight);

  snowflakes.forEach((flake) => {
    flake.y += flake.speed + audioBands.treble / 1000;
    flake.x += flake.drift + Math.sin(time * 0.001 + flake.y * 0.02) * 0.08;

    if (flake.y > viewportHeight + 6) {
      flake.y = -8;
      flake.x = rand(0, viewportWidth);
    }

    ctx.fillStyle = `rgba(255, 255, 255, ${flake.alpha})`;
    ctx.beginPath();
    ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawTreeBody() {
  const sortedNeedles = needles
    .map((needle) => {
      const rotated = rotatePoint(needle);
      return { ...needle, ...rotated };
    })
    .sort((a, b) => b.z - a.z);

  sortedNeedles.forEach((needle) => {
    const point = project3D(needle.x, needle.y, needle.z);
    const edgeGlow = 0.4 + (needle.radiusRatio * 0.45);

    ctx.fillStyle = `rgba(28, ${needle.green}, 48, ${needle.alpha * edgeGlow})`;
    ctx.beginPath();
    ctx.arc(point.x, point.y, needle.size * point.scale, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawGarland(time) {
  for (let strand = 0; strand < 3; strand++) {
    const hue = (time * 0.04 + strand * 118 + audioBands.mid * 0.7) % 360;
    const brightness = 46 + audioBands.level * 0.14;

    ctx.strokeStyle = `hsl(${hue}, 96%, ${brightness}%)`;
    ctx.lineWidth = 1.6 + audioBands.bass / 180;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 7 + audioBands.mid / 26;
    ctx.beginPath();

    for (let i = 0; i <= 560; i++) {
      const t = i / 560;
      const angle = t * GARLAND_TURNS * Math.PI * 2 - rotation * 1.4 - time * 0.00025;
      const wave = Math.sin(time * 0.0012 + t * 14 + strand) * (5 + audioBands.mid / 34);
      const radius = t * treeRadius + wave + strand * 3;
      const x3 = Math.cos(angle) * radius;
      const z3 = Math.sin(angle) * radius;
      const y3 = t * treeHeight;
      const point = project3D(x3, y3, z3);

      if (i === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    }

    ctx.stroke();
  }

  ctx.shadowBlur = 0;
}

function drawLights(time) {
  const sortedLights = lights
    .map((light) => {
      const sparkle = Math.sin(time * light.speed + light.phase);
      const rotated = rotatePoint(light, sparkle * 0.01);
      return { ...light, sparkle, ...rotated };
    })
    .sort((a, b) => b.z - a.z);

  sortedLights.forEach((light) => {
    const point = project3D(light.x, light.y, light.z);
    const pulse = 0.7 + light.sparkle * 0.22 + audioBands.treble / 380;
    const alpha = Math.max(0.18, Math.min(1, light.alpha * pulse));
    const radius = light.size * point.scale * (1 + audioBands.treble / 420);

    ctx.fillStyle = `rgba(${light.color}, ${alpha})`;
    ctx.shadowColor = `rgba(${light.color}, ${alpha})`;
    ctx.shadowBlur = 5 + audioBands.treble / 28;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.shadowBlur = 0;
}

function drawOrnaments(time) {
  const sortedOrnaments = ornaments
    .map((ornament) => {
      const bob = Math.sin(time * 0.002 + ornament.phase) * 1.5;
      const rotated = rotatePoint(ornament);
      return { ...ornament, ...rotated, y: rotated.y + bob };
    })
    .sort((a, b) => b.z - a.z);

  sortedOrnaments.forEach((ornament) => {
    const point = project3D(ornament.x, ornament.y, ornament.z);
    const radius = ornament.size * point.scale * (1 + audioBands.bass / 500);
    const highlight = radius * 0.35;

    ctx.shadowColor = ornament.color;
    ctx.shadowBlur = 5 + audioBands.bass / 46;
    ctx.fillStyle = ornament.color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.66)";
    ctx.beginPath();
    ctx.arc(point.x - highlight, point.y - highlight, Math.max(1, radius * 0.28), 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawTrunkAndSnow() {
  const baseY = topY() + treeHeight + 12;
  const trunkWidth = Math.max(28, treeRadius * 0.18);
  const trunkHeight = Math.max(34, treeHeight * 0.12);
  const x = centerX();

  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = 8;
  ctx.fillStyle = "#6f4324";
  ctx.fillRect(x - trunkWidth / 2, baseY - 8, trunkWidth, trunkHeight);

  const snowGradient = ctx.createRadialGradient(x, baseY + trunkHeight * 0.5, 0, x, baseY + trunkHeight * 0.5, treeRadius * 1.25);
  snowGradient.addColorStop(0, "rgba(255, 255, 255, 0.86)");
  snowGradient.addColorStop(1, "rgba(180, 220, 255, 0)");

  ctx.shadowBlur = 0;
  ctx.fillStyle = snowGradient;
  ctx.beginPath();
  ctx.ellipse(x, baseY + trunkHeight, treeRadius * 1.14, 22, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawTopStar(time) {
  const x = centerX();
  const y = topY() - 14;
  const outerRadius = 16 + audioBands.bass / 28 + Math.sin(time * 0.004) * 1.8;
  const innerRadius = outerRadius * 0.44;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.shadowColor = "#ffd966";
  ctx.shadowBlur = 16 + audioBands.bass / 10;
  ctx.fillStyle = "#ffd966";
  ctx.beginPath();

  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / 5;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;

    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }

  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function animate(time = 0) {
  updateAudioBands();
  rotation -= 0.0032 + audioBands.bass / 90000;

  drawBackground(time);
  drawTrunkAndSnow();
  drawTreeBody();
  drawGarland(time);
  drawOrnaments(time);
  drawLights(time);
  drawTopStar(time);

  requestAnimationFrame(animate);
}

window.addEventListener("resize", () => {
  resize();
  rebuildTree();
});

musicBtn.addEventListener("click", async () => {
  try {
    if (audio.paused) {
      await audio.play();
      initAudio();

      if (audioCtx && audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      musicBtn.textContent = "Pause Music";
    } else {
      audio.pause();
      musicBtn.textContent = "Play Music";
    }
  } catch (error) {
    console.error("Music play error:", error);
    musicBtn.textContent = "Music Blocked";
  }
});

resize();
rebuildTree();
animate();
