// ─────────────────────────────────────────────────────────────────
// generateStarMap.ts
// Зависимости: нет (VirtualSky встроен через dynamic script injection)
// ─────────────────────────────────────────────────────────────────

export type StarMapTheme = "black" | "white" | "blue" | "pink";

export interface StarMapParams {
  // Location
  city: string; // используется только для отображения в тексте
  lat: number; // широта
  lon: number; // долгота

  // Date & time
  day: number;
  month: number; // 1–12
  year: number;
  hour: number; // 0–23
  minute: number;

  // Sky options
  meridians?: boolean;
  constellations?: boolean;
  constNames?: boolean;
  starNames?: boolean;

  // Text
  mainTitle?: string;
  line1?: string;
  line2?: string;
  dontShowTime?: boolean;

  // Visual
  theme?: StarMapTheme;
}

// ─── Themes ───────────────────────────────────────────────────────
interface Theme {
  bg: string;
  bgInner: string;
  ring1: string;
  ring2: string;
  starColor: string;
  constColor: string;
  constLabel: string;
  meridianColor: string;
  eqColor: string;
  textColor: string;
  subtitleColor: string;
  border: string;
  planetColor: string;
}

const THEMES: Record<StarMapTheme, Theme> = {
  black: {
    bg: "#0a0a10",
    bgInner: "#06060c",
    ring1: "rgba(255,255,255,0.75)",
    ring2: "rgba(255,255,255,0.18)",
    starColor: "rgb(255,255,255)",
    constColor: "rgba(180,180,255,0.75)",
    constLabel: "rgba(160,155,220,0.9)",
    meridianColor: "rgba(100,255,100,0.5)",
    eqColor: "rgba(255,100,100,0.35)",
    textColor: "#ffffff",
    subtitleColor: "rgba(255,255,255,0.7)",
    border: "rgba(255,255,255,0.2)",
    planetColor: "rgba(255,220,100,0.9)",
  },
  blue: {
    bg: "#0d1b3e",
    bgInner: "#08102a",
    ring1: "rgba(160,200,255,0.85)",
    ring2: "rgba(100,150,255,0.2)",
    starColor: "rgb(220,235,255)",
    constColor: "rgba(140,180,255,0.8)",
    constLabel: "rgba(160,200,255,0.9)",
    meridianColor: "rgba(100,220,255,0.5)",
    eqColor: "rgba(255,120,100,0.35)",
    textColor: "#c8deff",
    subtitleColor: "rgba(200,222,255,0.65)",
    border: "rgba(100,150,255,0.25)",
    planetColor: "rgba(255,230,120,0.9)",
  },
  white: {
    bg: "#f5f4f0",
    bgInner: "#eeecea",
    ring1: "rgba(30,30,40,0.75)",
    ring2: "rgba(30,30,40,0.15)",
    starColor: "rgb(10,10,20)",
    constColor: "rgba(60,60,120,0.7)",
    constLabel: "rgba(50,50,100,0.85)",
    meridianColor: "rgba(0,150,0,0.45)",
    eqColor: "rgba(180,0,0,0.3)",
    textColor: "#0f0f1a",
    subtitleColor: "rgba(15,15,26,0.6)",
    border: "rgba(20,20,40,0.18)",
    planetColor: "rgba(180,120,0,0.9)",
  },
  pink: {
    bg: "#1e0c18",
    bgInner: "#140810",
    ring1: "rgba(255,180,210,0.8)",
    ring2: "rgba(220,120,170,0.2)",
    starColor: "rgb(255,230,240)",
    constColor: "rgba(255,160,200,0.75)",
    constLabel: "rgba(255,180,215,0.9)",
    meridianColor: "rgba(200,120,180,0.55)",
    eqColor: "rgba(255,100,100,0.35)",
    textColor: "#ffd6e8",
    subtitleColor: "rgba(255,214,232,0.65)",
    border: "rgba(255,130,180,0.22)",
    planetColor: "rgba(255,210,100,0.9)",
  },
};

// ─── Load VirtualSky scripts once ────────────────────────────────
let vsLoaded = false;
let vsLoadPromise: Promise<void> | null = null;

function loadVirtualSky(): Promise<void> {
  if (vsLoaded) return Promise.resolve();
  if (vsLoadPromise) return vsLoadPromise;

  vsLoadPromise = new Promise((resolve, reject) => {
    // stuquery first, then virtualsky
    const s1 = document.createElement("script");
    s1.src =
      "https://raw.githubusercontent.com/slowe/VirtualSky/master/stuquery.min.js";
    s1.onload = () => {
      const s2 = document.createElement("script");
      s2.src =
        "https://raw.githubusercontent.com/slowe/VirtualSky/master/virtualsky.min.js";
      s2.onload = () => {
        vsLoaded = true;
        resolve();
      };
      s2.onerror = reject;
      document.head.appendChild(s2);
    };
    s1.onerror = reject;
    document.head.appendChild(s1);
  });

  return vsLoadPromise;
}

// ─── Main export ─────────────────────────────────────────────────
export async function generateStarMap(params: StarMapParams): Promise<Blob> {
  await loadVirtualSky();

  const t = THEMES[params.theme ?? "black"];

  // Poster dimensions: 1200×1600 (3:4)
  const PW = 1200;
  const PH = 1600;
  const SKY_SIZE = 900;
  const CX = PW / 2;
  const CY = PH * 0.38;
  const R = 510;

  // ── Hidden off-screen container for VirtualSky ──
  const container = document.createElement("div");
  container.id = `vs_tmp_${Date.now()}`;
  container.style.cssText = `
    position:fixed; left:-9999px; top:-9999px;
    width:${SKY_SIZE}px; height:${SKY_SIZE}px;
    opacity:0; pointer-events:none;
  `;
  document.body.appendChild(container);

  // Format clock string
  const mm = String(params.month).padStart(2, "0");
  const dd = String(params.day).padStart(2, "0");
  const hh = String(params.hour).padStart(2, "0");
  const mn = String(params.minute).padStart(2, "0");
  const clockStr = `${params.year}/${mm}/${dd} ${hh}:${mn}:00`;

  // ── Init VirtualSky ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const S = (window as any).S;

  // Patch colours before init
  const VS = (window as any).VirtualSky;
  const origSetColours = VS.prototype.setColours;
  VS.prototype.setColours = function () {
    origSetColours.call(this);
    this.col.stars = t.starColor;
    this.col.constellation = t.constColor;
    this.col.constellationboundary = "rgba(0,0,0,0)";
    this.col.meridian = t.meridianColor;
    this.col.eq = t.eqColor;
    this.col.txt = t.constLabel;
    this.col.sun = t.planetColor;
    this.col.moon =
      params.theme === "white" ? "rgb(80,80,80)" : "rgb(200,200,200)";
    this.col.cardinal = "rgba(0,0,0,0)";
  };

  S.virtualsky({
    id: container.id,
    projection: "stereo",
    longitude: params.lon,
    latitude: params.lat,
    clock: clockStr,
    transparent: true,
    background: "rgba(0,0,0,0)",
    showdate: false,
    showposition: false,
    constellations: params.constellations ?? true,
    constellationlabels: params.constNames ?? true,
    showstarlabels: params.starNames ?? false,
    meridian: params.meridians ?? false,
    gridlines_eq: false,
    gridlines_az: false,
    showplanets: true,
    showplanetlabels: true,
    magnitude: 5.5,
    scalestars: 1.4,
    az: 0,
    wide: SKY_SIZE,
    tall: SKY_SIZE,
    credit: false,
    keyboard: false,
    mouse: false,
    live: false,
    constellationwidth: 1.2,
  });

  VS.prototype.setColours = origSetColours;

  // Wait for VirtualSky to render
  await new Promise(r => setTimeout(r, 800));

  const vsCanvas = container.querySelector(
    "canvas"
  ) as HTMLCanvasElement | null;
  if (!vsCanvas) {
    document.body.removeChild(container);
    throw new Error("VirtualSky failed to render canvas");
  }

  // ── Compose poster ──
  const poster = document.createElement("canvas");
  poster.width = PW;
  poster.height = PH;
  const ctx = poster.getContext("2d")!;

  // Background
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, PW, PH);

  // Vignette
  const grad = ctx.createRadialGradient(
    CX,
    PH * 0.4,
    0,
    CX,
    PH * 0.4,
    PW * 0.75
  );
  if (params.theme === "white") {
    grad.addColorStop(0, "rgba(255,255,255,0.06)");
    grad.addColorStop(1, "rgba(0,0,0,0.04)");
  } else {
    grad.addColorStop(0, "rgba(255,255,255,0.03)");
    grad.addColorStop(1, "rgba(0,0,0,0.25)");
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, PW, PH);

  // Outer poster border
  ctx.strokeStyle = t.ring1;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(32, 32, PW - 64, PH - 64);

  // Circle background
  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, Math.PI * 2);
  ctx.fillStyle = t.bgInner;
  ctx.fill();
  ctx.restore();

  // Star map clipped to circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, Math.PI * 2);
  ctx.clip();
  const src = Math.min(vsCanvas.width, vsCanvas.height);
  ctx.drawImage(vsCanvas, 0, 0, src, src, CX - R, CY - R, R * 2, R * 2);
  ctx.restore();

  // Circle rings
  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, Math.PI * 2);
  ctx.strokeStyle = t.ring1;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(CX, CY, R + 10, 0, Math.PI * 2);
  ctx.strokeStyle = t.ring2;
  ctx.lineWidth = 1;
  ctx.stroke();

  // ── Text ──
  const textY = CY + R + 80;

  // Separator
  ctx.strokeStyle = t.border;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(PW * 0.25, textY - 28);
  ctx.lineTo(PW * 0.75, textY - 28);
  ctx.stroke();

  ctx.textAlign = "center";

  // Main title
  ctx.fillStyle = t.textColor;
  ctx.font = '700 52px "Montserrat", sans-serif';
  ctx.fillText(
    (params.mainTitle ?? "WRITTEN IN THE STARS").toUpperCase(),
    CX,
    textY
  );

  let lineY = textY + 52;

  if (params.line1) {
    ctx.fillStyle = t.subtitleColor;
    ctx.font = '300 26px "Cormorant Garamond", serif';
    ctx.fillText(params.line1, CX, lineY);
    lineY += 38;
  }

  const l2 = params.line2 ?? params.city;
  if (l2) {
    ctx.fillStyle = t.subtitleColor;
    ctx.font = '300 26px "Cormorant Garamond", serif';
    ctx.fillText(l2, CX, lineY);
    lineY += 38;
  }

  if (!params.dontShowTime) {
    const MONTHS = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const dateStr = `${params.day} ${MONTHS[params.month - 1]} ${params.year} ${hh}:${mn}`;
    ctx.fillStyle = t.subtitleColor;
    ctx.font = '300 24px "Cormorant Garamond", serif';
    ctx.fillText(dateStr, CX, lineY);
  }

  // Cleanup
  document.body.removeChild(container);

  // Return as Blob
  return new Promise((resolve, reject) => {
    poster.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png",
      1.0
    );
  });
}
