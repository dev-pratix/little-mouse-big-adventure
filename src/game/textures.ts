import * as THREE from "three";

function canvasTex(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void, repeat = 1, isColor = true) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d")!, size);
  const t = new THREE.CanvasTexture(c);
  if (isColor) {
    t.colorSpace = THREE.SRGBColorSpace;
  }
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  return t;
}

// Deterministic pseudo-random generator
function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

/**
 * High-fidelity Scandinavian Honey Oak hardwood planks color map.
 * 8 distinct planks per repeat tile with organic wood grain, staggered end joints,
 * and realistic chamfered edge shading.
 */
export function woodFloor() {
  return canvasTex(1024, (g, s) => {
    const r = rng(42);
    const plankCount = 8;
    const plankH = s / plankCount;

    for (let i = 0; i < plankCount; i++) {
      const y0 = i * plankH;
      const hue = 31 + r() * 4;
      const sat = 42 + r() * 6;
      const lum = 49 + r() * 8;

      // Base plank tone
      g.fillStyle = `hsl(${hue}, ${sat}%, ${lum}%)`;
      g.fillRect(0, y0, s, plankH);

      // Fine wood grain striations
      const grainCount = 55;
      for (let k = 0; k < grainCount; k++) {
        const gy = y0 + r() * plankH;
        const wave = 3 + r() * 5;
        g.strokeStyle = `hsla(${hue - 2}, ${sat + 4}%, ${lum - 8 - r() * 8}%, ${0.12 + r() * 0.14})`;
        g.lineWidth = 0.8 + r() * 1.4;
        g.beginPath();
        g.moveTo(0, gy);
        g.bezierCurveTo(
          s * 0.25, gy + (r() - 0.5) * wave,
          s * 0.75, gy + (r() - 0.5) * wave,
          s, gy
        );
        g.stroke();
      }

      // Subtle organic wood knot or grain cluster
      if (r() > 0.4) {
        const kx = (0.2 + r() * 0.6) * s;
        const ky = y0 + (0.3 + r() * 0.4) * plankH;
        g.fillStyle = `hsla(${hue - 4}, ${sat + 10}%, ${lum - 14}%, 0.28)`;
        g.beginPath();
        g.ellipse(kx, ky, 7 + r() * 6, 2.5 + r() * 2, (r() - 0.5) * 0.4, 0, Math.PI * 2);
        g.fill();
      }

      // Staggered butt joint (end of plank)
      const jointX = (((i * 0.382) + 0.15) % 1.0) * s;
      g.fillStyle = "rgba(42, 24, 12, 0.75)";
      g.fillRect(jointX - 1, y0, 2, plankH);
      g.fillStyle = "rgba(255, 235, 205, 0.25)";
      g.fillRect(jointX + 1, y0, 1, plankH);

      // Horizontal bevel seam between planks (deep dark groove + soft top edge highlight)
      g.fillStyle = "rgba(35, 18, 8, 0.85)";
      g.fillRect(0, y0 + plankH - 2, s, 2);
      g.fillStyle = "rgba(255, 240, 215, 0.30)";
      g.fillRect(0, y0, s, 1);
    }
  }, 4);
}

/**
 * Micro-height bump map matching wood floor plank seams and grain ridges.
 */
export function woodFloorBump() {
  return canvasTex(1024, (g, s) => {
    const r = rng(42);
    const plankCount = 8;
    const plankH = s / plankCount;

    // Neutral baseline height (mid-grey)
    g.fillStyle = "#808080";
    g.fillRect(0, 0, s, s);

    for (let i = 0; i < plankCount; i++) {
      const y0 = i * plankH;

      // Fine grain bumps
      for (let k = 0; k < 40; k++) {
        const gy = y0 + r() * plankH;
        const val = Math.floor(118 + r() * 20);
        g.strokeStyle = `rgb(${val}, ${val}, ${val})`;
        g.lineWidth = 1.0 + r() * 1.5;
        g.beginPath();
        g.moveTo(0, gy);
        g.bezierCurveTo(s * 0.3, gy + (r() - 0.5) * 4, s * 0.7, gy + (r() - 0.5) * 4, s, gy);
        g.stroke();
      }

      // Staggered butt joint groove (recessed black)
      const jointX = (((i * 0.382) + 0.15) % 1.0) * s;
      g.fillStyle = "#101010";
      g.fillRect(jointX - 1, y0, 3, plankH);
      g.fillStyle = "#a8a8a8"; // micro bevel highlight
      g.fillRect(jointX + 2, y0, 1, plankH);

      // Horizontal plank groove (deep recess)
      g.fillStyle = "#0a0a0a";
      g.fillRect(0, y0 + plankH - 2, s, 2);
      g.fillStyle = "#b0b0b0";
      g.fillRect(0, y0, s, 1);
    }
  }, 4, false);
}

/**
 * Roughness map: semi-polished satin plank body (darker/smoother) with matte grooves.
 */
export function woodFloorRoughness() {
  return canvasTex(512, (g, s) => {
    const plankCount = 8;
    const plankH = s / plankCount;

    // Base satin wood polish (~45% roughness)
    g.fillStyle = "#727272";
    g.fillRect(0, 0, s, s);

    for (let i = 0; i < plankCount; i++) {
      const y0 = i * plankH;
      // Staggered joint groove is matte
      const jointX = (((i * 0.382) + 0.15) % 1.0) * s;
      g.fillStyle = "#e0e0e0";
      g.fillRect(jointX - 1, y0, 3, plankH);

      // Horizontal bevel seam is matte
      g.fillRect(0, y0 + plankH - 2, s, 2);
    }
  }, 4, false);
}

/**
 * Warm cozy linen textured wallpaper with refined vertical embossed pinstripes.
 */
export function wallpaper() {
  return canvasTex(512, (g, s) => {
    // Warm cream background
    g.fillStyle = "#faf5ec";
    g.fillRect(0, 0, s, s);

    // Subtle vertical woven fabric texture
    g.fillStyle = "#f3ebd9";
    for (let x = 0; x < s; x += 16) {
      g.fillRect(x, 0, 8, s);
    }

    // Refined warm caramel pinstripes
    g.fillStyle = "#e8dcbe";
    for (let x = 8; x < s; x += 32) {
      g.fillRect(x, 0, 1.5, s);
    }

    // Gentle micro-embossed damask dots
    g.fillStyle = "#dfd0b2";
    for (let y = 16; y < s; y += 48) {
      for (let x = 16; x < s; x += 48) {
        g.beginPath();
        g.arc(x, y, 1.8, 0, Math.PI * 2);
        g.fill();
      }
    }
  }, 4);
}

/**
 * Smooth ambient occlusion contact shadow decal for grounding furniture.
 */
export function contactShadowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(128, 128, 20, 128, 128, 120);
  grad.addColorStop(0, "rgba(20, 12, 6, 0.85)");
  grad.addColorStop(0.5, "rgba(20, 12, 6, 0.40)");
  grad.addColorStop(0.85, "rgba(20, 12, 6, 0.10)");
  grad.addColorStop(1, "rgba(20, 12, 6, 0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Framed oil painting canvas for cozy living room wall art.
 */
export function framedArtTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 384;
  const g = c.getContext("2d")!;

  // Golden afternoon sky gradient
  const sky = g.createLinearGradient(0, 0, 0, 260);
  sky.addColorStop(0, "#e8a860");
  sky.addColorStop(0.4, "#f7d28b");
  sky.addColorStop(1, "#ffeed0");
  g.fillStyle = sky;
  g.fillRect(0, 0, 512, 260);

  // Distant warm blue-grey mountains
  g.fillStyle = "#7a8b98";
  g.beginPath();
  g.moveTo(0, 260);
  g.lineTo(80, 180);
  g.lineTo(160, 210);
  g.lineTo(260, 160);
  g.lineTo(360, 220);
  g.lineTo(460, 170);
  g.lineTo(512, 210);
  g.lineTo(512, 260);
  g.closePath();
  g.fill();

  // Rolling green meadows / hills
  const hills = g.createLinearGradient(0, 220, 0, 384);
  hills.addColorStop(0, "#6a8c4c");
  hills.addColorStop(0.6, "#4a6834");
  hills.addColorStop(1, "#364c24");
  g.fillStyle = hills;
  g.beginPath();
  g.moveTo(0, 230);
  g.bezierCurveTo(140, 200, 280, 260, 512, 230);
  g.lineTo(512, 384);
  g.lineTo(0, 384);
  g.closePath();
  g.fill();

  // Cozy countryside cottage silhouette with tiny chimney smoke
  g.fillStyle = "#3d2a1d";
  g.fillRect(320, 210, 42, 26);
  g.fillStyle = "#7c3826"; // roof
  g.beginPath();
  g.moveTo(315, 210);
  g.lineTo(341, 185);
  g.lineTo(367, 210);
  g.closePath();
  g.fill();

  // Fine canvas grain overlay
  g.fillStyle = "rgba(255, 255, 255, 0.04)";
  for (let y = 0; y < 384; y += 4) {
    g.fillRect(0, y, 512, 1.5);
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Rustic aged pine planks for mouse burrow walls and flooring.
 */
export function burrowPlanksTexture(repeat = 2) {
  return canvasTex(512, (g, s) => {
    const r = rng(101);
    const planks = 6;
    const h = s / planks;
    for (let i = 0; i < planks; i++) {
      const y0 = i * h;
      const lum = 38 + r() * 10;
      g.fillStyle = `hsl(28, 45%, ${lum}%)`;
      g.fillRect(0, y0, s, h);

      // Fine wood grain
      for (let k = 0; k < 30; k++) {
        const gy = y0 + r() * h;
        g.strokeStyle = `hsla(26, 40%, ${lum - 8}%, 0.22)`;
        g.lineWidth = 1 + r() * 1.5;
        g.beginPath();
        g.moveTo(0, gy);
        g.bezierCurveTo(s * 0.3, gy + (r() - 0.5) * 5, s * 0.7, gy + (r() - 0.5) * 5, s, gy);
        g.stroke();
      }

      // Plank bevel seam
      g.fillStyle = "rgba(25, 12, 6, 0.85)";
      g.fillRect(0, y0 + h - 2, s, 2);
      g.fillStyle = "rgba(255, 230, 190, 0.15)";
      g.fillRect(0, y0, s, 1);

      // Iron nail heads near edges
      g.fillStyle = "#2b221a";
      g.beginPath();
      g.arc(20 + (i % 2) * 15, y0 + h / 2, 2.5, 0, Math.PI * 2);
      g.arc(s - 20 - ((i + 1) % 2) * 15, y0 + h / 2, 2.5, 0, Math.PI * 2);
      g.fill();
    }
  }, repeat);
}

/**
 * Vintage retro matchbox printed cover graphic with side strike strip.
 */
export function matchboxCoverTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 320;
  const g = c.getContext("2d")!;

  // Aged kraft cardboard paper base
  g.fillStyle = "#d2b48c";
  g.fillRect(0, 0, 512, 320);

  // Subtle paper grain
  g.fillStyle = "rgba(80, 50, 20, 0.05)";
  for (let i = 0; i < 400; i++) {
    g.fillRect(Math.random() * 512, Math.random() * 320, 2, 2);
  }

  // Classic retro red banner
  g.fillStyle = "#c0392b";
  g.fillRect(20, 20, 472, 280);

  // Inner cream label panel
  g.fillStyle = "#faf0db";
  g.fillRect(36, 36, 440, 248);

  // Decorative border
  g.strokeStyle = "#c0392b";
  g.lineWidth = 4;
  g.strokeRect(44, 44, 424, 232);
  g.lineWidth = 1.5;
  g.strokeRect(50, 50, 412, 220);

  // Vintage Swan / Bird matchbox silhouette
  g.fillStyle = "#2c3e50";
  g.beginPath();
  g.arc(256, 120, 36, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#faf0db";
  g.beginPath();
  // Stylized swan wing & neck
  g.moveTo(242, 135);
  g.bezierCurveTo(240, 110, 255, 95, 270, 100);
  g.bezierCurveTo(260, 120, 250, 130, 242, 135);
  g.fill();

  // Retro Typography
  g.fillStyle = "#c0392b";
  g.font = "bold 28px serif";
  g.textAlign = "center";
  g.fillText("SWAN SAFETY MATCHES", 256, 195);

  g.fillStyle = "#2c3e50";
  g.font = "bold 15px sans-serif";
  g.letterSpacing = "2px";
  g.fillText("MADE IN THE BURROW", 256, 225);

  g.font = "11px sans-serif";
  g.fillStyle = "#7f8c8d";
  g.fillText("AVERAGE CONTENTS 50 LIGHTS", 256, 252);

  // Strike strip along bottom
  g.fillStyle = "#4a2c1d";
  g.fillRect(0, 305, 512, 15);
  g.fillStyle = "#331c12";
  for (let x = 0; x < 512; x += 6) {
    g.fillRect(x, 305, 3, 15);
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Cozy patchwork diamond quilt for the matchbox bed blanket.
 */
export function matchboxBlanketTexture() {
  return canvasTex(256, (g, s) => {
    // Rich warm terracotta base
    g.fillStyle = "#b84734";
    g.fillRect(0, 0, s, s);

    // Warm ochre & cream quilt stitching
    g.strokeStyle = "#e8c888";
    g.lineWidth = 2;
    for (let x = -s; x < s * 2; x += 32) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x + s, s);
      g.stroke();

      g.beginPath();
      g.moveTo(x, s);
      g.lineTo(x + s, 0);
      g.stroke();
    }

    // Cozy stitched polka dots at diamond centers
    g.fillStyle = "#f4e0bc";
    for (let y = 16; y < s; y += 32) {
      for (let x = 16; x < s; x += 32) {
        g.beginPath();
        g.arc(x, y, 2.5, 0, Math.PI * 2);
        g.fill();
      }
    }
  }, 2);
}

/**
 * Colorful circular braided patchwork rag rug for the living area floor.
 */
export function patchworkRugTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const g = c.getContext("2d")!;
  const center = 256;

  // Concentric braided braided rings
  const rings = [
    { r: 240, color: "#d97443" }, // outer terracotta
    { r: 210, color: "#f3cc77" }, // warm sunflower
    { r: 180, color: "#4f8a8b" }, // dusty teal
    { r: 150, color: "#b85252" }, // berry red
    { r: 120, color: "#e8dcbe" }, // natural linen
    { r: 90, color: "#5b8266" },  // sage green
    { r: 60, color: "#d97443" },  // inner terracotta
    { r: 30, color: "#f3cc77" },  // gold center
  ];

  rings.forEach(({ r, color }) => {
    g.fillStyle = color;
    g.beginPath();
    g.arc(center, center, r, 0, Math.PI * 2);
    g.fill();

    // Braided stitch dashes
    g.strokeStyle = "rgba(0,0,0,0.22)";
    g.lineWidth = 3;
    g.setLineDash([6, 6]);
    g.beginPath();
    g.arc(center, center, r - 8, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
  });

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Wound sewing thread spool core texture (embroidery floss).
 */
export function threadSpoolTexture() {
  return canvasTex(256, (g, s) => {
    g.fillStyle = "#1e6b7b"; // deep teal embroidery floss
    g.fillRect(0, 0, s, s);

    // Fine horizontal thread lines
    for (let y = 0; y < s; y += 3) {
      g.fillStyle = y % 6 === 0 ? "rgba(255, 255, 255, 0.18)" : "rgba(0, 0, 0, 0.25)";
      g.fillRect(0, y, s, 1.2);
    }
  }, 1);
}

/**
 * Miniature framed portrait: whimsical mouse crayon sketch of cheese with a heart.
 */
export function miniPortraitTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;

  // Aged parchment paper background
  g.fillStyle = "#faf2dc";
  g.fillRect(0, 0, 256, 256);

  // Hand-drawn sketch of golden cheese wedge
  g.fillStyle = "#f5b027";
  g.beginPath();
  g.moveTo(60, 180);
  g.lineTo(196, 180);
  g.lineTo(170, 90);
  g.lineTo(86, 115);
  g.closePath();
  g.fill();

  g.strokeStyle = "#b87314";
  g.lineWidth = 4;
  g.lineJoin = "round";
  g.stroke();

  // Cheese eyes / holes
  g.fillStyle = "#df971a";
  const cheeseHoles: [number, number, number][] = [
    [105, 150, 12],
    [145, 140, 16],
    [120, 125, 8],
    [165, 160, 10],
  ];
  for (const [x, y, r] of cheeseHoles) {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  // Tiny red crayon heart above cheese
  g.fillStyle = "#e74c3c";
  g.beginPath();
  g.moveTo(128, 65);
  g.bezierCurveTo(128, 55, 115, 45, 105, 55);
  g.bezierCurveTo(95, 65, 105, 80, 128, 92);
  g.bezierCurveTo(151, 80, 161, 65, 151, 55);
  g.bezierCurveTo(141, 45, 128, 55, 128, 65);
  g.fill();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Cancelled vintage postage stamp used as a tablecloth / runner on the spool.
 */
export function stampTableclothTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;

  // Perforated stamp edge
  g.fillStyle = "#fbf5e6";
  g.fillRect(10, 10, 236, 236);

  // Green intaglio engraved stamp panel
  g.fillStyle = "#2d6a4f";
  g.fillRect(24, 24, 208, 208);

  // Inner frame
  g.strokeStyle = "#fbf5e6";
  g.lineWidth = 3;
  g.strokeRect(34, 34, 188, 188);

  // Denomination and motif
  g.fillStyle = "#fbf5e6";
  g.font = "bold 42px serif";
  g.textAlign = "center";
  g.fillText("2¢", 128, 125);

  g.font = "bold 16px sans-serif";
  g.fillText("POSTAGE", 128, 165);

  // Wavy black cancellation ink mark
  g.strokeStyle = "rgba(20, 20, 20, 0.45)";
  g.lineWidth = 3;
  g.beginPath();
  g.arc(180, 70, 45, 0, Math.PI * 2);
  g.stroke();
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.moveTo(40, 180 + i * 12);
    g.bezierCurveTo(90, 170 + i * 12, 150, 190 + i * 12, 220, 180 + i * 12);
    g.stroke();
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
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

