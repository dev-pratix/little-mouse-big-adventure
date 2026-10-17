import * as THREE from "three";

function canvasTex(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void, repeat = 1) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d")!, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  return t;
}

// Deterministic pseudo-random so the room looks identical each load.
function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

export function woodFloor() {
  return canvasTex(512, (g, s) => {
    const r = rng(7);
    const plank = s / 6;
    for (let i = 0; i < 6; i++) {
      const l = 52 + r() * 10;
      g.fillStyle = `hsl(28, 45%, ${l}%)`;
      g.fillRect(0, i * plank, s, plank);
      for (let k = 0; k < 40; k++) {
        g.strokeStyle = `hsla(25, 40%, ${l - 12}%, 0.25)`;
        g.beginPath();
        const y = i * plank + r() * plank;
        g.moveTo(0, y);
        g.bezierCurveTo(s * 0.3, y + r() * 6 - 3, s * 0.6, y + r() * 6 - 3, s, y);
        g.stroke();
      }
      g.fillStyle = "hsla(25, 40%, 25%, 0.6)";
      g.fillRect(0, i * plank, s, 2);
      g.fillRect(((i * 0.37) % 1) * s, i * plank, 2, plank);
    }
  }, 5);
}

export function wallpaper() {
  return canvasTex(256, (g, s) => {
    g.fillStyle = "#f3e6cf";
    g.fillRect(0, 0, s, s);
    g.fillStyle = "#ead6b4";
    for (let x = 0; x < s; x += 32) g.fillRect(x, 0, 10, s);
    g.fillStyle = "#e0c49a";
    for (let y = 16; y < s; y += 64) for (let x = 21; x < s; x += 64) {
      g.beginPath();
      g.arc(x, y, 3, 0, Math.PI * 2);
      g.fill();
    }
  }, 6);
}

export function rug() {
  return canvasTex(256, (g, s) => {
    g.fillStyle = "#b5523b";
    g.fillRect(0, 0, s, s);
    g.strokeStyle = "#e9c46a";
    g.lineWidth = 10;
    g.strokeRect(18, 18, s - 36, s - 36);
    g.strokeStyle = "#7a2e22";
    g.lineWidth = 4;
    g.strokeRect(40, 40, s - 80, s - 80);
    g.fillStyle = "#e9c46a";
    g.beginPath();
    g.moveTo(s / 2, 70); g.lineTo(s - 70, s / 2); g.lineTo(s / 2, s - 70); g.lineTo(70, s / 2);
    g.fill();
  });
}
