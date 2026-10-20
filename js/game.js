// Pixel Studio — interactive portfolio engine (vanilla canvas, no dependencies).
(() => {
  'use strict';
  const S = window.SPRITES, WD = window.WORLD, CONTENT = window.CONTENT;
  const W = WD.W, H = WD.H;
  const cvs = document.getElementById('game');
  const ctx = cvs.getContext('2d');
  const sheet = new Image();
  sheet.src = 'assets/sprites.png';

  const PIXEL_FONT = '"Pixelify Sans", "Silkscreen", monospace';
  const HERO_SCALE = 0.68;
  const WALK_SPEED = 150, RUN_SPEED = 270;
  const FEET = { w: 32, h: 14 };   // player collision box at the feet
  const PANEL_KEYS = WD.hotspots.filter(h => h.panel && h.id !== 'exit').map(h => h.panel);

  // ── state ────────────────────────────────────────────────────────────────
  const state = {
    t: 0, night: false, nightAmt: 0, muted: false, music: false, spotify: null, spotifyStatus: 'loading',
    discovered: new Set(), panelOpen: false, started: false,
    hover: null, near: null, catPets: 0, celebrated: false,
  };
  const player = {
    x: 480, y: 500, dir: 'right', mode: 'idle', animT: 0, path: [], pending: null,
    bubble: null, bubbleT: 0,
  };
  const particles = [];
  const keys = new Set();

  // ── helpers ──────────────────────────────────────────────────────────────
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const byId = {};

  function drawSprite(c, name, x, y, sc = 1, flip = false) {
    const s = S[name];
    if (!s) return;
    if (flip) {
      c.save();
      c.translate(x + s.w * sc, y);
      c.scale(-1, 1);
      c.drawImage(sheet, s.x, s.y, s.w, s.h, 0, 0, s.w * sc, s.h * sc);
      c.restore();
    } else {
      c.drawImage(sheet, s.x, s.y, s.w, s.h, x, y, s.w * sc, s.h * sc);
    }
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  // ── objects: sizes, sort bases, colliders ───────────────────────────────
  // Every object is shrunk by WORLD.objectScale around an anchor (bottom-centre for
  // furniture, centre for rugs & wall art), so things stay where they stand but the
  // room gets roomier. Items resting on something scale around their parent's anchor.
  const K = WD.objectScale || 1;
  const makeXf = (ax, ay, k) => Object.assign((x, y) => [ax + (x - ax) * k, ay + (y - ay) * k], { k });
  const xf = { np: makeXf(1122, 152, 1) }; // id -> point transform (np = now-playing screen)
  const objects = WD.objects.map(o => {
    const s = S[o.s];
    const sc0 = o.sc || 1, w0 = s.w * sc0, h0 = s.h * sc0;
    const layer = o.layer || 'obj';
    let tf;
    if (o.on && xf[o.on]) tf = xf[o.on];
    else {
      const k = o.fixed ? 1 : K;
      const flat = layer !== 'obj';
      tf = makeXf(o.x + w0 / 2, flat ? o.y + h0 / 2 : o.y + h0, k);
    }
    const k = tf.k, [x, y] = tf(o.x, o.y);
    const obj = { ...o, x, y, sc: sc0 * k, w: w0 * k, h: h0 * k, layer, tf };
    obj.base = o.base != null ? (o.base > H ? o.base : tf(0, o.base)[1]) : y + obj.h;
    if (o.solid && Array.isArray(o.solid)) obj.solid = o.solid.map(v => v * k);
    if (o.id) { byId[o.id] = obj; xf[o.id] = tf; }
    return obj;
  });
  // objects resting on another sort just after it
  objects.forEach(o => { if (o.on && byId[o.on]) o.base = byId[o.on].base + 0.5; });

  // move hotspots and lights along with the objects they belong to
  const ident = Object.assign((x, y) => [x, y], { k: 1 });
  const xfRect = (r, tf) => r && [...tf(r[0], r[1]), r[2] * tf.k, r[3] * tf.k];
  for (const h of WD.hotspots) {
    const tf = xf[h.obj] || ident, tf2 = xf[h.obj2] || tf;
    h.rect = xfRect(h.rect, tf);
    h.rect2 = xfRect(h.rect2, tf2);
    h.at = tf(...h.at);
  }
  for (const L of WD.lights) {
    const tf = xf[L.obj] || ident;
    [L.x, L.y] = tf(L.x, L.y);
    L.r *= tf.k;
  }
  // the sleeping cat is part of the sofa image; WORLD.cat is its spot within the sofa sprite
  const CAT = (() => { const o = byId.sofa, c = WD.cat; return { x: o.x + c[0] * o.sc, y: o.y + c[1] * o.sc }; })();
  const NP = { x: 1040, y: 100, k: 1 };
  function runFx(c, o) {
    // hooks are written in unscaled sprite coordinates
    c.save(); c.translate(o.x, o.y); c.scale(o.sc, o.sc);
    FX[o.fx](c, { ...o, x: 0, y: 0, sc: 1, w: o.w / o.sc, h: o.h / o.sc });
    c.restore();
  }

  const solids = [];
  objects.forEach(o => {
    if (!o.solid) return;
    if (Array.isArray(o.solid)) {
      const [dx, dy, w, h] = o.solid;
      solids.push({ x: o.x + dx, y: o.y + dy, w, h });
    } else {
      const f = o.foot || 0.3;
      solids.push({ x: o.x + 6, y: o.y + o.h * (1 - f), w: o.w - 12, h: o.h * f });
    }
  });

  // after shrinking, a hotspot's standing point may land inside furniture or the wall:
  // move it to the nearest free spot (preferring straight below)
  function freeSpot([x, y]) {
    if (!blocked(x, y)) return [x, y];
    for (let r = 4; r <= 80; r += 4) {
      for (const [dx, dy] of [[0, r], [-r, 0], [r, 0], [-r, r], [r, r], [0, -r], [-r, -r], [r, -r]]) {
        if (!blocked(x + dx, y + dy)) return [x + dx, y + dy];
      }
    }
    return [x, y];
  }
  for (const h of WD.hotspots) h.at = freeSpot(h.at);

  function blocked(x, y) {
    const b = { x: x - FEET.w / 2, y: y - FEET.h, w: FEET.w, h: FEET.h };
    const wk = WD.walk;
    if (b.x < wk.x0 - FEET.w / 2 || b.x + b.w > wk.x1 + FEET.w / 2) return true;
    if (y < wk.y0 || y > wk.y1) return true;
    for (const s of solids) {
      if (b.x < s.x + s.w && b.x + b.w > s.x && b.y < s.y + s.h && b.y + b.h > s.y) return true;
    }
    return false;
  }

  // ── pathfinding (A* on a coarse grid) ────────────────────────────────────
  const CELL = 10, GW = Math.ceil(W / CELL), GH = Math.ceil(H / CELL);
  const grid = new Uint8Array(GW * GH);
  for (let gy = 0; gy < GH; gy++) {
    for (let gx = 0; gx < GW; gx++) grid[gy * GW + gx] = blocked(gx * CELL + CELL / 2, gy * CELL + CELL / 2) ? 1 : 0;
  }
  function nearestFree(gx, gy) {
    for (let r = 0; r < 12; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const x = gx + dx, y = gy + dy;
        if (x >= 0 && y >= 0 && x < GW && y < GH && !grid[y * GW + x]) return [x, y];
      }
    }
    return null;
  }
  function lineFree(x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 5);
    for (let i = 1; i <= n; i++) if (blocked(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n)) return false;
    return true;
  }
  function findPath(sx, sy, tx, ty) {
    const s = nearestFree(Math.floor(sx / CELL), Math.floor(sy / CELL));
    const t = nearestFree(Math.floor(tx / CELL), Math.floor(ty / CELL));
    if (!s || !t) return [];
    const N = GW * GH, g = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const si = s[1] * GW + s[0], ti = t[1] * GW + t[0];
    const heap = [];
    const push = (i, f) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break;[heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (; ;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break;[heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    const hfn = i => Math.hypot(i % GW - t[0], Math.floor(i / GW) - t[1]);
    g[si] = 0; push(si, hfn(si));
    while (heap.length) {
      const [, i] = pop();
      if (i === ti) break;
      if (closed[i]) continue;
      closed[i] = 1;
      const x = i % GW, y = Math.floor(i / GW);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
        const ni = ny * GW + nx;
        if (grid[ni] || closed[ni]) continue;
        if (dx && dy && (grid[y * GW + nx] || grid[ny * GW + x])) continue; // no corner cutting
        const ng = g[i] + (dx && dy ? 1.414 : 1);
        if (ng < g[ni]) { g[ni] = ng; from[ni] = i; push(ni, ng + hfn(ni)); }
      }
    }
    if (from[ti] === -1 && ti !== si) return [];
    const pts = [];
    for (let i = ti; i !== -1 && i !== si; i = from[i]) pts.push([(i % GW) * CELL + CELL / 2, Math.floor(i / GW) * CELL + CELL / 2]);
    pts.reverse();
    if (!blocked(tx, ty)) pts.push([tx, ty]);
    // string-pull: skip waypoints we can see past
    const out = [];
    let cx = sx, cy = sy, k = 0;
    while (k < pts.length) {
      let j = pts.length - 1;
      while (j > k && !lineFree(cx, cy, pts[j][0], pts[j][1])) j--;
      out.push(pts[j]);
      [cx, cy] = pts[j];
      k = j + 1;
    }
    return out;
  }

  // ── static background (Modern Japanese interior architecture) ─────────────
  let bg = null;
  function buildBackground() {
    bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    const c = bg.getContext('2d');
    c.imageSmoothingEnabled = false;
    const R = WD.room;

    // 1. Base floor: Warm cedar Engawa (wood plank corridor & perimeter)
    c.save();
    c.beginPath(); c.rect(R.x0, R.wallBase, R.x1 - R.x0, R.bottom - R.wallBase + 10); c.clip();
    const plankH = 24;
    for (let y = R.wallBase - 10; y < R.bottom + 20; y += plankH) {
      const pIdx = Math.floor(y / plankH);
      c.fillStyle = pIdx % 2 === 0 ? '#5a2e14' : '#6c3818';
      c.fillRect(R.x0, y, R.x1 - R.x0, plankH);
      // plank groove & highlights
      c.fillStyle = 'rgba(25, 10, 4, 0.65)';
      c.fillRect(R.x0, y + plankH - 2, R.x1 - R.x0, 2);
      c.fillStyle = 'rgba(255, 210, 150, 0.08)';
      c.fillRect(R.x0, y, R.x1 - R.x0, 1);
      // subtle vertical wood grain & peg nails
      for (let x = R.x0 + ((pIdx * 71) % 90); x < R.x1; x += 150) {
        c.fillStyle = 'rgba(25, 10, 4, 0.4)';
        c.fillRect(x, y + 1, 2, plankH - 3);
        c.fillStyle = '#261006';
        c.fillRect(x - 5, y + 4, 2, 2);
        c.fillRect(x - 5, y + plankH - 6, 2, 2);
      }
    }
    c.restore();

    // 2. Tatami Mat Sanctuary (Warm Orange-Amber Shade)
    // Preserves the interlocking 2:1 modular layout, dark heri cloth borders, and woven ribs
    const tx0 = R.x0 + 44, tx1 = R.x1 - 44; // 88 to 1192 -> 1104px wide
    const ty0 = R.wallBase + 18, ty1 = R.bottom - 18; // 226 to 774 -> 548px high
    const tw = tx1 - tx0, th = ty1 - ty0;

    // Raised Hinoki curb (Kamachi wooden frame enclosing the tatami)
    c.fillStyle = '#261107';
    c.fillRect(tx0 - 5, ty0 - 5, tw + 10, th + 10);
    c.fillStyle = '#7a3c18';
    c.fillRect(tx0 - 4, ty0 - 4, tw + 8, th + 8);
    c.fillStyle = '#bd7944';
    c.fillRect(tx0 - 4, ty0 - 4, tw + 8, 2);
    c.fillRect(tx0 - 4, ty0 - 4, 2, th + 8);
    c.fillStyle = '#421f0b';
    c.fillRect(tx0 - 4, ty1 + 2, tw + 8, 2);
    c.fillRect(tx1 + 2, ty0 - 4, 2, th + 8);

    // Tatami mats layout: modular interlocking mats
    const matCols = 5, matRows = 4;
    const mw = Math.floor(tw / matCols), mh = Math.floor(th / matRows);

    // Auspicious interlocking Japanese Tatami mat layout (non-intersecting T-junctions)
    const tatamiMats = [
      // Row 0
      { x: tx0, y: ty0, w: mw * 2, h: mh, dir: 'h' },
      { x: tx0 + mw * 2, y: ty0, w: mw, h: mh * 2, dir: 'v' },
      { x: tx0 + mw * 3, y: ty0, w: mw * 2, h: mh, dir: 'h' },
      // Row 1
      { x: tx0, y: ty0 + mh, w: mw, h: mh * 2, dir: 'v' },
      { x: tx0 + mw, y: ty0 + mh, w: mw, h: mh * 2, dir: 'v' },
      { x: tx0 + mw * 3, y: ty0 + mh, w: mw * 2, h: mh, dir: 'h' },
      // Row 2
      { x: tx0 + mw * 2, y: ty0 + mh * 2, w: mw * 2, h: mh, dir: 'h' },
      { x: tx0 + mw * 4, y: ty0 + mh * 2, w: mw, h: mh * 2, dir: 'v' },
      // Row 3
      { x: tx0, y: ty0 + mh * 3, w: mw * 2, h: mh, dir: 'h' },
      { x: tx0 + mw * 2, y: ty0 + mh * 3, w: mw * 2, h: mh, dir: 'h' }
    ];

    // Draw each Tatami mat with warm orange wood tone & dark cloth heri
    for (const m of tatamiMats) {
      c.save();
      c.beginPath(); c.rect(m.x, m.y, m.w, m.h); c.clip();

      const isH = m.dir === 'h';
      const strawBase = isH ? '#e29a4c' : '#d88f40';
      const strawLight = isH ? '#f0aa5d' : '#e69f4f';
      const strawDark = isH ? '#d28938' : '#c87d2c';
      const strawLine = isH ? '#bf7424' : '#b36a1c';

      c.fillStyle = strawBase;
      c.fillRect(m.x, m.y, m.w, m.h);

      // Fine woven rush straw texture lines (spaced every 2-3px)
      if (isH) {
        for (let py = m.y; py < m.y + m.h; py += 3) {
          c.fillStyle = py % 6 === 0 ? strawLight : strawDark;
          c.fillRect(m.x, py, m.w, 2);
          c.fillStyle = strawLine;
          c.fillRect(m.x, py + 2, m.w, 1);
        }
      } else {
        for (let px = m.x; px < m.x + m.w; px += 3) {
          c.fillStyle = px % 6 === 0 ? strawLight : strawDark;
          c.fillRect(px, m.y, 2, m.h);
          c.fillStyle = strawLine;
          c.fillRect(px + 2, m.y, 1, m.h);
        }
      }

      // Warm amber-orange ambient shading towards the edges
      const edgeGrad = c.createLinearGradient(m.x, m.y, m.x, m.y + m.h);
      edgeGrad.addColorStop(0, 'rgba(110, 50, 10, 0.12)');
      edgeGrad.addColorStop(0.5, 'rgba(255, 225, 160, 0.07)');
      edgeGrad.addColorStop(1, 'rgba(95, 42, 8, 0.16)');
      c.fillStyle = edgeGrad;
      c.fillRect(m.x, m.y, m.w, m.h);

      // Cloth border ribbons (Heri - 縁)
      // Traditional tatami mats have cloth borders on the two LONG edges only!
      const heriW = 5;
      const heriColor = '#241b17';
      const heriStitch = '#5a3824';
      const heriLight = '#3a271c';

      if (isH) {
        // Top heri ribbon
        c.fillStyle = heriColor;
        c.fillRect(m.x, m.y, m.w, heriW);
        c.fillStyle = heriLight;
        c.fillRect(m.x, m.y + 1, m.w, 1);
        c.fillStyle = heriStitch;
        c.fillRect(m.x, m.y + 2, m.w, 1);
        // Bottom heri ribbon
        c.fillStyle = heriColor;
        c.fillRect(m.x, m.y + m.h - heriW, m.w, heriW);
        c.fillStyle = heriStitch;
        c.fillRect(m.x, m.y + m.h - heriW + 2, m.w, 1);
        c.fillStyle = '#140e0b';
        c.fillRect(m.x, m.y + m.h - 1, m.w, 1);
      } else {
        // Left heri ribbon
        c.fillStyle = heriColor;
        c.fillRect(m.x, m.y, heriW, m.h);
        c.fillStyle = heriLight;
        c.fillRect(m.x + 1, m.y, 1, m.h);
        c.fillStyle = heriStitch;
        c.fillRect(m.x + 2, m.y, 1, m.h);
        // Right heri ribbon
        c.fillStyle = heriColor;
        c.fillRect(m.x + m.w - heriW, m.y, heriW, m.h);
        c.fillStyle = heriStitch;
        c.fillRect(m.x + m.w - heriW + 2, m.y, 1, m.h);
        c.fillStyle = '#140e0b';
        c.fillRect(m.x + m.w - 1, m.y, 1, m.h);
      }

      // Outer seam border
      c.strokeStyle = '#18110d';
      c.lineWidth = 1;
      c.strokeRect(m.x + 0.5, m.y + 0.5, m.w - 1, m.h - 1);

      c.restore();
    }

    // 3. Back Wall - Authentic Japanese Post-and-Beam & Shoji Architecture
    // Dividing the wall into two levels (matching the reference image):
    // Level 1: Upper loft mezzanine balustrade (y: R.top to R.top + 72 = y: 30 to 102)
    // Level 2: Shoji sliding screens & panels (y: 102 to R.wallBase = y: 102 to 208)

    const loftTop = R.top;
    const loftBottom = R.top + 74;
    const loftGrad = c.createLinearGradient(0, loftTop, 0, loftBottom);
    loftGrad.addColorStop(0, '#100e16');
    loftGrad.addColorStop(0.7, '#181520');
    loftGrad.addColorStop(1, '#241e2a');
    c.fillStyle = loftGrad;
    c.fillRect(R.x0, loftTop, R.x1 - R.x0, loftBottom - loftTop);

    // Upper loft ceiling beam
    c.fillStyle = '#342114';
    c.fillRect(R.x0, loftTop, R.x1 - R.x0, 8);
    c.fillStyle = '#583923';
    c.fillRect(R.x0, loftTop + 1, R.x1 - R.x0, 2);

    // Upper Loft Balustrade: Horizontal beams & vertical wooden baluster slats (Koshi)
    // Top handrail beam
    c.fillStyle = '#2a1a0f';
    c.fillRect(R.x0, loftTop + 8, R.x1 - R.x0, 10);
    c.fillStyle = '#d49b62';
    c.fillRect(R.x0, loftTop + 9, R.x1 - R.x0, 6);
    c.fillStyle = '#f3ce97';
    c.fillRect(R.x0, loftTop + 9, R.x1 - R.x0, 2);

    // Bottom baseboard beam of the upper balustrade
    c.fillStyle = '#2a1a0f';
    c.fillRect(R.x0, loftBottom - 10, R.x1 - R.x0, 10);
    c.fillStyle = '#c78f56';
    c.fillRect(R.x0, loftBottom - 9, R.x1 - R.x0, 6);
    c.fillStyle = '#e8bb81';
    c.fillRect(R.x0, loftBottom - 9, R.x1 - R.x0, 2);

    // Vertical wooden baluster slats (spaced every 8px across the balustrade)
    const slatW = 3, slatGap = 5;
    for (let x = R.x0 + 6; x < R.x1 - 6; x += slatW + slatGap) {
      c.fillStyle = '#1e1108';
      c.fillRect(x - 1, loftTop + 18, slatW + 2, loftBottom - loftTop - 28);
      c.fillStyle = '#dca368';
      c.fillRect(x, loftTop + 18, slatW, loftBottom - loftTop - 28);
      c.fillStyle = '#f5d5a2';
      c.fillRect(x, loftTop + 18, 1, loftBottom - loftTop - 28);
      c.fillStyle = '#9e6734';
      c.fillRect(x + slatW - 1, loftTop + 18, 1, loftBottom - loftTop - 28);
    }

    // Level 2: Shoji Screen Lower Wall (y: loftBottom to R.wallBase)
    const shojiTop = loftBottom;
    const shojiBottom = R.wallBase;
    const shojiH = shojiBottom - shojiTop;

    // Lintel track beam (Kamoi) separating loft from Shoji screens
    c.fillStyle = '#221309';
    c.fillRect(R.x0, shojiTop, R.x1 - R.x0, 8);
    c.fillStyle = '#8f5d34';
    c.fillRect(R.x0, shojiTop + 1, R.x1 - R.x0, 5);
    c.fillStyle = '#c8925c';
    c.fillRect(R.x0, shojiTop + 1, R.x1 - R.x0, 1);

    // Sliding Shoji Paper Screens: Soft translucent washi paper background
    const washiGrad = c.createLinearGradient(0, shojiTop + 8, 0, shojiBottom);
    washiGrad.addColorStop(0, '#fefdfa');
    washiGrad.addColorStop(0.5, '#f7f2e4');
    washiGrad.addColorStop(1, '#ece3ce');
    c.fillStyle = washiGrad;
    c.fillRect(R.x0, shojiTop + 8, R.x1 - R.x0, shojiH - 8);

    // Delicate Japanese Kumiko wooden lattice grid on the Shoji screens
    // Horizontal wood muntins
    c.fillStyle = '#3a2517';
    for (let y = shojiTop + 24; y < shojiBottom - 10; y += 18) {
      c.fillRect(R.x0, y, R.x1 - R.x0, 2);
      c.fillStyle = 'rgba(255, 235, 200, 0.25)';
      c.fillRect(R.x0, y, R.x1 - R.x0, 1);
      c.fillStyle = '#3a2517';
    }
    // Vertical wood muntins
    for (let x = R.x0 + 18; x < R.x1; x += 18) {
      c.fillStyle = '#3a2517';
      c.fillRect(x, shojiTop + 8, 2, shojiH - 8);
      c.fillStyle = 'rgba(255, 235, 200, 0.2)';
      c.fillRect(x, shojiTop + 8, 1, shojiH - 8);
    }


    // Structural Timber Posts (Hashira) running from floor to ceiling
    const pillars = [R.x0, 276, 622, 746, 1020, R.x1 - 14];
    for (const px of pillars) {
      c.fillStyle = '#1e1108';
      c.fillRect(px - 1, loftTop, 16, R.wallBase - loftTop);
      c.fillStyle = '#b07844';
      c.fillRect(px, loftTop, 14, R.wallBase - loftTop);
      c.fillStyle = '#dfa569';
      c.fillRect(px, loftTop, 2, R.wallBase - loftTop);
      c.fillStyle = '#7a4e28';
      c.fillRect(px + 12, loftTop, 2, R.wallBase - loftTop);
      // Carved beam caps / brackets
      c.fillStyle = '#1e1108';
      c.fillRect(px - 3, loftTop + 7, 20, 4);
      c.fillRect(px - 3, shojiTop - 1, 20, 4);
      c.fillRect(px - 3, R.wallBase - 12, 20, 5);
      c.fillStyle = '#c58e55';
      c.fillRect(px - 2, loftTop + 8, 18, 2);
      c.fillRect(px - 2, shojiTop, 18, 2);
    }

    // Shikii / Baseboard wooden threshold
    c.fillStyle = '#1e1108';
    c.fillRect(R.x0, R.wallBase - 12, R.x1 - R.x0, 16);
    c.fillStyle = '#5c381f';
    c.fillRect(R.x0, R.wallBase - 11, R.x1 - R.x0, 10);
    c.fillStyle = '#8f5c34';
    c.fillRect(R.x0, R.wallBase - 11, R.x1 - R.x0, 2);

    // Deep ambient cast shadow from the Shoji wall onto the floor
    const wallShadow = c.createLinearGradient(0, R.wallBase + 4, 0, R.wallBase + 36);
    wallShadow.addColorStop(0, 'rgba(30, 15, 6, 0.42)');
    wallShadow.addColorStop(1, 'rgba(30, 15, 6, 0)');
    c.fillStyle = wallShadow;
    c.fillRect(R.x0, R.wallBase + 4, R.x1 - R.x0, 32);

    // Side walls: Japanese Hinoki timber frame
    const sideFrame = '#d8a268', sideDark = '#5c391f', sideOutline = '#241409';
    c.fillStyle = sideOutline;
    c.fillRect(R.x0 - 18, R.top - 14, 20, R.bottom - R.top + 34); // left
    c.fillRect(R.x1 - 2, R.top - 14, 20, R.bottom - R.top + 34);  // right
    c.fillRect(R.x0 - 18, R.top - 14, R.x1 - R.x0 + 36, 16);      // top
    c.fillStyle = sideFrame;
    c.fillRect(R.x0 - 15, R.top - 11, 14, R.bottom - R.top + 28);
    c.fillRect(R.x1 + 1, R.top - 11, 14, R.bottom - R.top + 28);
    c.fillRect(R.x0 - 15, R.top - 11, R.x1 - R.x0 + 30, 10);
    c.fillStyle = sideDark;
    c.fillRect(R.x0 - 2, R.top + 2, 3, R.bottom - R.top);
    c.fillRect(R.x1 - 1, R.top + 2, 3, R.bottom - R.top);
    c.fillRect(R.x0 - 15, R.top + 1, R.x1 - R.x0 + 30, 2);

    // Soft lateral wall shading onto the floor
    for (const [x, dir] of [[R.x0 + 4, 1], [R.x1 - 4, -1]]) {
      const g = c.createLinearGradient(x, 0, x + dir * 32, 0);
      g.addColorStop(0, 'rgba(30, 15, 6, 0.35)');
      g.addColorStop(1, 'rgba(30, 15, 6, 0)');
      c.fillStyle = g;
      c.fillRect(dir > 0 ? x : x - 32, R.wallBase, 32, R.bottom - R.wallBase);
    }
    c.strokeStyle = sideOutline; c.lineWidth = 3;
    c.strokeRect(R.x0 - 18, R.top - 14, R.x1 - R.x0 + 36, R.bottom - R.top + 34);

    // rugs & wall art
    objects.filter(o => o.layer === 'floor' && o.s !== 'entrance_mat').forEach(o => drawSprite(c, o.s, o.x, o.y, o.sc));
    objects.filter(o => o.layer === 'wall').forEach(o => {
      if (!o.customOnly) drawSprite(c, o.s, o.x, o.y, o.sc);
      if (o.fx && FX[o.fx]) runFx(c, o);
    });

    // bottom wall rail with a gap for the entrance
    const rail = S.bottom_rail;
    c.save();
    c.beginPath();
    c.rect(R.x0 - 16, 0, R.doorGap[0] - R.x0 + 16, H);
    c.rect(R.doorGap[1], 0, R.x1 - R.doorGap[1] + 16, H);
    c.clip();
    for (let x = R.x0 - 16; x < R.x1 + 16; x += rail.w) drawSprite(c, 'bottom_rail', x, R.bottom - 4);
    c.restore();
    drawSprite(c, 'entrance_mat', byIdS('entrance_mat').x, byIdS('entrance_mat').y);
  }
  const byIdS = s => objects.find(o => o.s === s);

  // ── custom draw hooks ────────────────────────────────────────────────────
  function boardText(c, o, rect, text, size) {
    const [x, y, w, h] = rect;
    c.fillStyle = '#152033';
    c.fillRect(o.x + x, o.y + y, w, h);
    c.fillStyle = '#efe6d2';
    c.font = `${size}px ${PIXEL_FONT}`;
    c.textBaseline = 'middle';
    return [o.x + x, o.y + y + h / 2 + 1];
  }
  function screen(c, o, inset, draw) {
    const [x, y, w, h] = inset;
    c.save();
    c.beginPath(); c.rect(o.x + x, o.y + y, w, h); c.clip();
    const g = c.createLinearGradient(0, o.y + y, 0, o.y + y + h);
    g.addColorStop(0, '#141c33'); g.addColorStop(1, '#0b1122');
    c.fillStyle = g; c.fillRect(o.x + x, o.y + y, w, h);
    draw(o.x + x, o.y + y, w, h);
    // scanlines + glare
    c.fillStyle = 'rgba(255,255,255,0.03)';
    for (let yy = o.y + y; yy < o.y + y + h; yy += 3) c.fillRect(o.x + x, yy, w, 1);
    c.fillStyle = 'rgba(255,255,255,0.05)';
    c.beginPath(); c.moveTo(o.x + x, o.y + y); c.lineTo(o.x + x + w * 0.35, o.y + y); c.lineTo(o.x + x + w * 0.15, o.y + y + h); c.lineTo(o.x + x, o.y + y + h); c.fill();
    c.restore();
  }
  const FX = {
    // Authentic Japanese Sliding Lattice Door (Koshi-do / Shoji-do)
    japaneseDoor(c, o) {
      const w = 104, h = 104;
      // 1. Heavy Cedar / Hinoki Outer Casing & Jambs
      c.fillStyle = '#1c1008';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#5c381f';
      c.fillRect(2, 2, w - 4, h - 4);
      c.fillStyle = '#8f5c34';
      c.fillRect(3, 3, w - 6, h - 6);
      c.fillStyle = '#b8814d';
      c.fillRect(3, 3, w - 6, 2);

      // Upper Header Lintel (Kamoi track)
      c.fillStyle = '#221308';
      c.fillRect(4, 4, w - 8, 6);
      c.fillStyle = '#100804';
      c.fillRect(8, 6, w - 16, 2); // top sliding groove

      // Lower Threshold (Shikii track)
      c.fillStyle = '#221308';
      c.fillRect(4, h - 8, w - 8, 8);
      c.fillStyle = '#b88942'; // brass runner strip
      c.fillRect(8, h - 5, w - 16, 2);

      // Door leaf dimensions: 2 sliding panels
      const leafH = h - 16;
      const lw = 48;

      // Leaf drawing helper
      const drawLeaf = (lx, ly, isFront) => {
        // Frame
        c.fillStyle = '#1a0f07';
        c.fillRect(lx, ly, lw, leafH);
        c.fillStyle = '#6e4324';
        c.fillRect(lx + 2, ly + 2, lw - 4, leafH - 4);
        c.fillStyle = '#9e673a';
        c.fillRect(lx + 2, ly + 2, lw - 4, 1);
        c.fillStyle = '#3a2111';
        c.fillRect(lx + 2, ly + leafH - 3, lw - 4, 1);

        // Lower solid wood kickplate panel (Koshi-ita - 腰板)
        const kickH = 22;
        c.fillStyle = '#221208';
        c.fillRect(lx + 3, ly + leafH - kickH - 2, lw - 6, kickH);
        c.fillStyle = '#7a4a27';
        c.fillRect(lx + 4, ly + leafH - kickH - 1, lw - 8, kickH - 2);
        c.fillStyle = '#a67243';
        c.fillRect(lx + 5, ly + leafH - kickH, lw - 10, 1);

        // Upper translucent Washi paper section
        const washiX = lx + 3, washiY = ly + 3, washiW = lw - 6, washiH = leafH - kickH - 7;
        const wg = c.createLinearGradient(0, washiY, 0, washiY + washiH);
        wg.addColorStop(0, '#fefefa');
        wg.addColorStop(0.5, '#f5efe0');
        wg.addColorStop(1, '#ece3ce');
        c.fillStyle = wg;
        c.fillRect(washiX, washiY, washiW, washiH);

        // Japanese Kumiko Lattice Grid
        c.fillStyle = '#3a2010';
        for (let py = washiY + 7; py < washiY + washiH - 2; py += 8) {
          c.fillRect(washiX, py, washiW, 1.5);
          c.fillStyle = 'rgba(255,255,255,0.4)';
          c.fillRect(washiX, py + 1, washiW, 0.5);
          c.fillStyle = '#3a2010';
        }
        for (let px = washiX + 6; px < washiX + washiW - 2; px += 6.5) {
          c.fillRect(px, washiY, 1.5, washiH);
          c.fillStyle = 'rgba(255,255,255,0.3)';
          c.fillRect(px + 1, washiY, 0.5, washiH);
          c.fillStyle = '#3a2010';
        }

        // Traditional Recessed Bronze Flush Handle (Hikite - 引手)
        const hx = isFront ? lx + 5 : lx + lw - 9;
        const hy = ly + leafH / 2 - 4;
        c.fillStyle = '#140c06';
        roundRect(c, hx - 2, hy - 5, 8, 12, 3); c.fill();
        c.fillStyle = '#b88942'; // burnished brass/bronze
        roundRect(c, hx - 1, hy - 4, 6, 10, 2); c.fill();
        c.fillStyle = '#120b06';
        roundRect(c, hx, hy - 2, 4, 6, 1); c.fill();
      };

      // Draw back leaf (left)
      drawLeaf(5, 8, false);

      // Overlap drop shadow from front leaf onto back leaf
      c.fillStyle = 'rgba(15, 8, 4, 0.5)';
      c.fillRect(50, 8, 4, leafH);

      // Draw front leaf (right, overlapping)
      drawLeaf(51, 8, true);

      // Small elegant wooden transom tablet above door: 「入口」
      c.fillStyle = '#1c1008';
      c.fillRect(w / 2 - 14, 2, 28, 5);
      c.fillStyle = '#8f5c34';
      c.fillRect(w / 2 - 13, 2.5, 26, 4);
      c.fillStyle = '#ffdca8';
      c.font = `6px ${PIXEL_FONT}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('入口', w / 2, 4.5);
      c.textAlign = 'left';
    },

    // Traditional Japanese Hanging Wooden Plaque (Gaku - 額): BUILD / LEARN / RUN / REPEAT
    japanesePlaqueBuild(c, o) {
      const w = 88, h = 92;
      // Dark lacquered timber frame
      c.fillStyle = '#160e08';
      roundRect(c, 0, 0, w, h, 3); c.fill();
      c.fillStyle = '#3a2213';
      roundRect(c, 2, 2, w - 4, h - 4, 2); c.fill();

      // Gold Brass Corner Brackets (Kanakumono - 金具)
      const drawBracket = (bx, by, flipX, flipY) => {
        c.fillStyle = '#d4af37';
        c.fillRect(bx, by, flipX * 7, flipY * 2);
        c.fillRect(bx, by, flipX * 2, flipY * 7);
        c.fillStyle = '#fff0a0';
        c.fillRect(bx + flipX, by + flipY, flipX, flipY);
      };
      drawBracket(2, 2, 1, 1);
      drawBracket(w - 2, 2, -1, 1);
      drawBracket(2, h - 2, 1, -1);
      drawBracket(w - 2, h - 2, -1, -1);

      // Slate indigo washi paper surface
      const bg = c.createLinearGradient(0, 5, 0, h - 5);
      bg.addColorStop(0, '#1c2438');
      bg.addColorStop(1, '#0e1526');
      c.fillStyle = bg;
      c.fillRect(5, 5, w - 10, h - 10);
      c.strokeStyle = '#2d3b55'; c.lineWidth = 1;
      c.strokeRect(6.5, 6.5, w - 13, h - 13);

      // Four Core Pillars
      const items = [
        { icon: '⚒', label: 'BUILD', color: '#f59e0b' },
        { icon: '📖', label: 'LEARN', color: '#38bdf8' },
        { icon: '👟', label: 'RUN', color: '#a3e635' },
        { icon: '◈', label: 'REPEAT', color: '#c084fc' },
      ];
      const startY = 16, stepY = 18;
      items.forEach((it, i) => {
        const y = startY + i * stepY;
        c.fillStyle = it.color;
        c.font = `11px ${PIXEL_FONT}`;
        c.textBaseline = 'middle';
        c.fillText(it.icon, 10, y + 2);
        c.fillStyle = '#f1f5f9';
        c.font = `bold 11px ${PIXEL_FONT}`;
        c.fillText(it.label, 26, y + 2);
      });
    },

    // Matching Traditional Japanese Hanging Plaque: GOOD IDEAS BETTER SOFTWARE
    japanesePlaqueIdeas(c, o) {
      const w = 85, h = 92;
      c.fillStyle = '#160e08';
      roundRect(c, 0, 0, w, h, 3); c.fill();
      c.fillStyle = '#3a2213';
      roundRect(c, 2, 2, w - 4, h - 4, 2); c.fill();

      // Gold Corner Brackets
      const drawBracket = (bx, by, flipX, flipY) => {
        c.fillStyle = '#d4af37';
        c.fillRect(bx, by, flipX * 6, flipY * 2);
        c.fillRect(bx, by, flipX * 2, flipY * 6);
      };
      drawBracket(2, 2, 1, 1);
      drawBracket(w - 2, 2, -1, 1);
      drawBracket(2, h - 2, 1, -1);
      drawBracket(w - 2, h - 2, -1, -1);

      // Slate indigo washi background
      c.fillStyle = '#101726';
      c.fillRect(5, 5, w - 10, h - 10);
      c.strokeStyle = '#2d3b55'; c.lineWidth = 1;
      c.strokeRect(6.5, 6.5, w - 13, h - 13);

      // Lightbulb emblem
      const cx = w / 2, cy = 22;
      c.fillStyle = '#fbbf24';
      c.beginPath(); c.arc(cx, cy, 6, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ffd875';
      c.beginPath(); c.arc(cx - 2, cy - 2, 2.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#94a3b8';
      c.fillRect(cx - 2.5, cy + 6, 5, 2.5);
      c.fillRect(cx - 1.5, cy + 8.5, 3, 1.5);

      // Text
      c.textAlign = 'center';
      c.fillStyle = '#cbd5e1';
      c.font = `10px ${PIXEL_FONT}`;
      c.fillText('BOLD', cx, 44);
      c.fillStyle = '#f8fafc';
      c.font = `bold 11px ${PIXEL_FONT}`;
      c.fillText('ART', cx, 56);
      c.fillStyle = '#94a3b8';
      c.font = `9px ${PIXEL_FONT}`;
      c.fillText('BETTER', cx, 68);
      c.fillStyle = '#38bdf8';
      c.font = `bold 9px ${PIXEL_FONT}`;
      c.fillText('CODE', cx, 79);
      c.textAlign = 'left';
    },

    // Large Authentic Japanese Sliding Screen Window (Yukimi Shoji-mado - 雪見障子窓)
    // Radiant, sunny Japanese morning with glowing sun, Mount Fuji, and blooming Sakura!
    japaneseWindowWide(c, o) {
      const w = o.w, h = o.h;
      // 1. Outer Japanese Hinoki Wood Casing
      c.fillStyle = '#1e1107';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#5c381f';
      c.fillRect(2, 2, w - 4, h - 4);
      c.fillStyle = '#8f5c34';
      c.fillRect(3, 3, w - 6, h - 6);
      c.fillStyle = '#c58e55';
      c.fillRect(3, 3, w - 6, 2);

      // Inner garden view aperture
      const vx = 6, vy = 6, vw = w - 12, vh = h - 12;
      c.save();
      c.beginPath(); c.rect(vx, vy, vw, vh); c.clip();

      // Radiant Sunny Morning Sky: Deep vibrant blue -> bright azure -> warm golden sunrise horizon
      const sky = c.createLinearGradient(0, vy, 0, vy + vh);
      sky.addColorStop(0, '#1684e2');    // rich brilliant morning cyan-blue
      sky.addColorStop(0.3, '#38afff');  // bright vibrant azure sky
      sky.addColorStop(0.6, '#72c8fc');  // clear sky blue
      sky.addColorStop(0.82, '#fde047'); // golden morning sunlight warmth
      sky.addColorStop(0.95, '#fed7aa'); // peach morning dawn
      sky.addColorStop(1, '#fffbeb');    // luminous morning horizon
      c.fillStyle = sky;
      c.fillRect(vx, vy, vw, vh);

      // ── Radiant Morning Sun ──
      const sunX = vx + 68, sunY = vy + 18;
      // Soft golden sun aura / corona
      const sunGlow = c.createRadialGradient(sunX, sunY, 3, sunX, sunY, 32);
      sunGlow.addColorStop(0, 'rgba(255, 255, 245, 0.95)');
      sunGlow.addColorStop(0.35, 'rgba(254, 240, 138, 0.55)');
      sunGlow.addColorStop(0.7, 'rgba(253, 224, 71, 0.22)');
      sunGlow.addColorStop(1, 'rgba(253, 224, 71, 0)');
      c.fillStyle = sunGlow;
      c.beginPath(); c.arc(sunX, sunY, 32, 0, Math.PI * 2); c.fill();
      // Bright gleaming sun core
      c.fillStyle = '#ffffff';
      c.beginPath(); c.arc(sunX, sunY, 7, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fef08a';
      c.beginPath(); c.arc(sunX, sunY, 9, 0, Math.PI * 2); c.stroke();

      // ── Fluffy White Morning Clouds Catching Golden Sunbeams ──
      const drawCloud = (cx, cy, cw, ch) => {
        // Soft cloud shadow underside
        c.fillStyle = '#a8d8f8';
        c.beginPath();
        c.ellipse(cx, cy + 3, cw, ch, 0, 0, Math.PI * 2);
        c.ellipse(cx - cw * 0.4, cy + 4, cw * 0.6, ch * 0.8, 0, 0, Math.PI * 2);
        c.ellipse(cx + cw * 0.4, cy + 4, cw * 0.65, ch * 0.85, 0, 0, Math.PI * 2);
        c.fill();
        // Brilliant white sunlit cloud body
        c.fillStyle = '#ffffff';
        c.beginPath();
        c.ellipse(cx, cy, cw, ch, 0, 0, Math.PI * 2);
        c.ellipse(cx - cw * 0.35, cy - 2, cw * 0.6, ch * 0.9, 0, 0, Math.PI * 2);
        c.ellipse(cx + cw * 0.35, cy - 1, cw * 0.65, ch * 0.95, 0, 0, Math.PI * 2);
        c.ellipse(cx, cy - 4, cw * 0.5, ch * 0.8, 0, 0, Math.PI * 2);
        c.fill();
        // Golden sunlit rim highlight
        c.fillStyle = '#fffde7';
        c.beginPath();
        c.ellipse(cx - cw * 0.2, cy - 5, cw * 0.4, ch * 0.5, 0, 0, Math.PI * 2);
        c.fill();
      };
      drawCloud(vx + 144, vy + 14, 24, 7);
      drawCloud(vx + 236, vy + 22, 18, 6);

      // ── Majestic Mount Fuji in Morning Light ──
      const fujiX = vx + vw * 0.5, fujiY = vy + vh - 26;
      // Mountain body: deep morning royal sapphire (not grey!)
      c.fillStyle = '#32578c';
      c.beginPath();
      c.moveTo(fujiX - 48, fujiY + 26);
      c.lineTo(fujiX - 11, fujiY);
      c.lineTo(fujiX + 11, fujiY);
      c.lineTo(fujiX + 48, fujiY + 26);
      c.fill();
      // Mountain morning sunlight slope (subtle bright blue on sunlit side)
      c.fillStyle = '#426fa8';
      c.beginPath();
      c.moveTo(fujiX - 48, fujiY + 26);
      c.lineTo(fujiX - 11, fujiY);
      c.lineTo(fujiX, fujiY);
      c.lineTo(fujiX - 10, fujiY + 26);
      c.fill();
      // Sparkling snow-capped summit with morning blush
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.moveTo(fujiX - 18, fujiY + 9);
      c.lineTo(fujiX - 11, fujiY);
      c.lineTo(fujiX + 11, fujiY);
      c.lineTo(fujiX + 18, fujiY + 9);
      c.lineTo(fujiX + 10, fujiY + 7);
      c.lineTo(fujiX + 2, fujiY + 11);
      c.lineTo(fujiX - 8, fujiY + 7);
      c.fill();
      // Sunlit snow highlight
      c.fillStyle = '#fff5f5';
      c.beginPath();
      c.moveTo(fujiX - 11, fujiY);
      c.lineTo(fujiX + 3, fujiY);
      c.lineTo(fujiX - 2, fujiY + 6);
      c.lineTo(fujiX - 11, fujiY + 5);
      c.fill();
      // Mountain base morning mist
      c.fillStyle = 'rgba(255, 255, 255, 0.45)';
      c.beginPath();
      c.ellipse(fujiX, fujiY + 22, 54, 7, 0, 0, Math.PI * 2);
      c.fill();

      // ── Sunlit Rolling Green Hills ──
      // Distant hill (sage green)
      c.fillStyle = '#15803d';
      c.beginPath();
      c.ellipse(fujiX - 64, vy + vh - 10, 72, 16, 0, 0, Math.PI * 2);
      c.ellipse(fujiX + 64, vy + vh - 9, 82, 18, 0, 0, Math.PI * 2);
      c.fill();
      // Hill morning sun rim highlight
      c.fillStyle = '#4ade80';
      c.beginPath();
      c.ellipse(fujiX - 64, vy + vh - 13, 68, 6, -0.05, 0, Math.PI * 2);
      c.ellipse(fujiX + 64, vy + vh - 12, 78, 6, 0.05, 0, Math.PI * 2);
      c.fill();

      // ── Lush Emerald Bamboo Grove (Take-bayashi - 竹林) ──
      const drawBambooStalk = (bx, by, bh, bw = 3) => {
        // Stalk shadow side
        c.fillStyle = '#15803d';
        c.fillRect(bx, by, bw, bh);
        // Sunlit green core
        c.fillStyle = '#22c55e';
        c.fillRect(bx + 1, by, bw - 1, bh);
        // Morning sun edge highlight
        c.fillStyle = '#86efac';
        c.fillRect(bx + 1, by, 1, bh);
        // Bamboo nodes (rings)
        c.fillStyle = '#14532d';
        for (let ny = by + 8; ny < by + bh; ny += 14) {
          c.fillRect(bx - 1, ny, bw + 2, 2);
          c.fillStyle = '#bbf7d0';
          c.fillRect(bx, ny, bw, 1);
          c.fillStyle = '#14532d';
        }
      };
      const bambooX = [vx + 34, vx + 42, vx + 52, vx + vw - 48, vx + vw - 38, vx + vw - 28];
      bambooX.forEach((bx, idx) => {
        drawBambooStalk(bx, vy + 12 + (idx % 3) * 4, vh - 16, 3);
      });
      // Bamboo leaf sprays with translucent morning light
      const drawLeaves = (lx, ly, flip = 1) => {
        c.fillStyle = '#16a34a';
        c.beginPath();
        c.ellipse(lx, ly, 7, 2.5, flip * 0.4, 0, Math.PI * 2);
        c.ellipse(lx + flip * 5, ly + 3, 6, 2, flip * 0.7, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#4ade80';
        c.beginPath();
        c.ellipse(lx - flip * 4, ly - 2, 6, 2, flip * 0.2, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#86efac';
        c.beginPath();
        c.ellipse(lx - flip * 2, ly - 3, 4, 1.5, flip * 0.2, 0, Math.PI * 2);
        c.fill();
      };
      drawLeaves(vx + 40, vy + 22, 1);
      drawLeaves(vx + 48, vy + 34, -1);
      drawLeaves(vx + vw - 42, vy + 24, -1);
      drawLeaves(vx + vw - 32, vy + 38, 1);

      // ── Traditional Granite Japanese Stone Lantern (Yukimi-dōrō - 雪見灯籠) ──
      const lx = vx + 72, ly = vy + vh - 26;
      c.fillStyle = 'rgba(20, 30, 25, 0.35)';
      c.beginPath(); c.ellipse(lx + 5, ly + 25, 12, 3, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#475569';
      c.fillRect(lx + 1, ly + 20, 3, 4);
      c.fillRect(lx + 7, ly + 20, 3, 4);
      c.fillStyle = '#64748b';
      c.fillRect(lx - 2, ly + 16, 15, 4);
      c.fillStyle = '#94a3b8';
      c.fillRect(lx - 1, ly + 16, 13, 1);
      c.fillStyle = '#334155';
      c.fillRect(lx + 1, ly + 9, 9, 7);
      c.fillStyle = '#fef08a'; // morning sunlight reflecting on washi window
      c.fillRect(lx + 3, ly + 10, 5, 5);
      c.fillStyle = '#64748b';
      c.beginPath();
      c.moveTo(lx - 6, ly + 9);
      c.lineTo(lx + 17, ly + 9);
      c.lineTo(lx + 10, ly + 4);
      c.lineTo(lx + 1, ly + 4);
      c.fill();
      // Morning sunlit roof highlight
      c.fillStyle = '#cbd5e1';
      c.fillRect(lx - 4, ly + 8, 19, 1);
      c.fillStyle = '#ffffff';
      c.fillRect(lx - 1, ly + 4, 8, 1);
      c.fillStyle = '#94a3b8';
      c.fillRect(lx + 4, ly + 2, 3, 2);

      // ── Blooming Cherry Blossom Branch (Sakura - 桜) ──
      const sx = vx + vw - 14, sy = vy + 6;
      c.fillStyle = '#3a2012';
      c.beginPath();
      c.moveTo(sx + 10, sy);
      c.quadraticCurveTo(sx - 30, sy + 14, sx - 60, sy + 18);
      c.lineTo(sx - 58, sy + 20);
      c.quadraticCurveTo(sx - 28, sy + 16, sx + 10, sy + 3);
      c.fill();
      const blossoms = [
        [sx - 18, sy + 10], [sx - 34, sy + 16], [sx - 48, sy + 20], [sx - 26, sy + 8], [sx - 40, sy + 24]
      ];
      for (const [px, py] of blossoms) {
        c.fillStyle = '#ff6088';
        c.beginPath(); c.ellipse(px, py, 3.5, 3.5, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#ffa3ba';
        c.beginPath(); c.ellipse(px, py - 0.5, 2.5, 2.5, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#ffffff';
        c.beginPath(); c.ellipse(px - 0.5, py - 1, 1.2, 1.2, 0, 0, Math.PI * 2); c.fill();
      }
      // Floating petals in the morning breeze
      const petals = [[vx + 110, vy + 36], [vx + 180, vy + 48], [vx + 215, vy + 32]];
      for (const [ptx, pty] of petals) {
        c.fillStyle = '#ff8fa9';
        c.beginPath(); c.ellipse(ptx, pty, 2, 1.2, 0.4, 0, Math.PI * 2); c.fill();
      }

      // ── Sunlit Courtyard: Moss & Zen Gravel ──
      c.fillStyle = '#22c55e';
      c.fillRect(vx, vy + vh - 6, vw, 6);
      c.fillStyle = '#86efac'; // sun-drenched moss rim
      c.fillRect(vx, vy + vh - 6, vw, 1.5);
      for (let rx = vx + 10; rx < vx + vw; rx += 22) {
        c.fillStyle = '#64748b';
        c.beginPath(); c.ellipse(rx, vy + vh - 3, 6, 3, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#94a3b8';
        c.beginPath(); c.ellipse(rx - 1, vy + vh - 4, 4, 2, 0, 0, Math.PI * 2); c.fill();
      }

      // ── Warm Diagonal Morning Sunbeam Streaks ──
      const beamGrad = c.createLinearGradient(sunX, sunY, sunX + 160, vy + vh);
      beamGrad.addColorStop(0, 'rgba(255, 248, 200, 0.22)');
      beamGrad.addColorStop(0.5, 'rgba(255, 248, 200, 0.1)');
      beamGrad.addColorStop(1, 'rgba(255, 248, 200, 0)');
      c.fillStyle = beamGrad;
      c.beginPath();
      c.moveTo(sunX - 10, vy);
      c.lineTo(sunX + 40, vy);
      c.lineTo(sunX + 180, vy + vh);
      c.lineTo(sunX + 110, vy + vh);
      c.fill();

      // ── Sliding Shoji Screen Panels (framing on left and right) ──
      const drawSlidingShoji = (px, pw) => {
        c.fillStyle = '#1c1008';
        c.fillRect(px, vy, pw, vh);
        c.fillStyle = '#6e4324';
        c.fillRect(px + 2, vy + 2, pw - 4, vh - 4);
        const wg = c.createLinearGradient(0, vy, 0, vy + vh);
        wg.addColorStop(0, 'rgba(254, 252, 245, 0.94)');
        wg.addColorStop(1, 'rgba(240, 230, 210, 0.94)');
        c.fillStyle = wg;
        c.fillRect(px + 4, vy + 4, pw - 8, vh - 8);
        c.fillStyle = '#3a2010';
        for (let gy = vy + 10; gy < vy + vh - 6; gy += 12) c.fillRect(px + 4, gy, pw - 8, 1);
        for (let gx = px + 8; gx < px + pw - 6; gx += 8) c.fillRect(gx, vy + 4, 1, vh - 8);
        c.fillStyle = 'rgba(20, 10, 5, 0.4)';
        c.fillRect(px === vx ? px + pw - 3 : px, vy, 3, vh);
      };
      drawSlidingShoji(vx, 38);
      drawSlidingShoji(vx + vw - 38, 38);

      // Fine Kumiko cross-muntin frame over the center viewing opening
      const cx0 = vx + 38, cx1 = vx + vw - 38, cw = cx1 - cx0;
      c.fillStyle = '#2a170c';
      c.fillRect(cx0, vy + vh * 0.45, cw, 2);
      c.fillRect(cx0 + cw * 0.33, vy, 2, vh);
      c.fillRect(cx0 + cw * 0.67, vy, 2, vh);
      c.fillStyle = '#8f5c34';
      c.fillRect(cx0, vy + vh * 0.45, cw, 1);

      // Subtle Morning Window Glare Sheen
      c.fillStyle = 'rgba(255, 255, 255, 0.14)';
      c.beginPath();
      c.moveTo(cx0, vy);
      c.lineTo(cx0 + 55, vy);
      c.lineTo(cx0 + 25, vy + vh);
      c.lineTo(cx0, vy + vh);
      c.fill();

      c.restore();
    },

    // Matching Authentic Japanese Sliding Screen Window (Bay 4)
    // Sunny morning view with radiant azure sky, sunlit hills, and cherry blossoms!
    japaneseWindowA(c, o) {
      const w = o.w, h = o.h;
      c.fillStyle = '#1e1107';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#5c381f';
      c.fillRect(2, 2, w - 4, h - 4);
      c.fillStyle = '#8f5c34';
      c.fillRect(3, 3, w - 6, h - 6);
      c.fillStyle = '#c58e55';
      c.fillRect(3, 3, w - 6, 2);

      const vx = 6, vy = 6, vw = w - 12, vh = h - 12;
      c.save();
      c.beginPath(); c.rect(vx, vy, vw, vh); c.clip();

      // Radiant Sunny Morning Sky
      const sky = c.createLinearGradient(0, vy, 0, vy + vh);
      sky.addColorStop(0, '#1684e2');
      sky.addColorStop(0.35, '#38afff');
      sky.addColorStop(0.65, '#72c8fc');
      sky.addColorStop(0.85, '#fde047');
      sky.addColorStop(1, '#fffbeb');
      c.fillStyle = sky;
      c.fillRect(vx, vy, vw, vh);

      // Morning Sun Glow from top edge
      const sunGlow = c.createRadialGradient(vx + 40, vy + 10, 2, vx + 40, vy + 10, 24);
      sunGlow.addColorStop(0, 'rgba(255, 255, 245, 0.9)');
      sunGlow.addColorStop(0.5, 'rgba(254, 240, 138, 0.4)');
      sunGlow.addColorStop(1, 'rgba(254, 240, 138, 0)');
      c.fillStyle = sunGlow;
      c.beginPath(); c.arc(vx + 40, vy + 10, 24, 0, Math.PI * 2); c.fill();

      // Fluffy morning cloud
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.ellipse(vx + vw * 0.65, vy + 16, 16, 5, 0, 0, Math.PI * 2);
      c.ellipse(vx + vw * 0.65 - 5, vy + 14, 9, 5, 0, 0, Math.PI * 2);
      c.fill();

      // Sunlit rolling green hills
      c.fillStyle = '#16a34a';
      c.beginPath();
      c.ellipse(vx + vw * 0.5, vy + vh - 10, vw * 0.7, 20, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#4ade80'; // sunlit ridge
      c.beginPath();
      c.ellipse(vx + vw * 0.5, vy + vh - 13, vw * 0.65, 6, 0, 0, Math.PI * 2);
      c.fill();

      // Bamboo stalks
      const drawBamboo = (bx, by, bh) => {
        c.fillStyle = '#15803d';
        c.fillRect(bx, by, 3, bh);
        c.fillStyle = '#22c55e';
        c.fillRect(bx + 1, by, 2, bh);
        c.fillStyle = '#86efac';
        c.fillRect(bx + 1, by, 1, bh);
        c.fillStyle = '#14532d';
        for (let ny = by + 8; ny < by + bh; ny += 14) c.fillRect(bx - 1, ny, 5, 2);
      };
      drawBamboo(vx + 28, vy + 14, vh - 18);
      drawBamboo(vx + 36, vy + 10, vh - 14);
      drawBamboo(vx + vw - 28, vy + 12, vh - 16);

      // Cherry blossoms
      c.fillStyle = '#ff6088';
      c.beginPath();
      c.ellipse(vx + vw - 22, vy + 18, 4, 4, 0, 0, Math.PI * 2);
      c.ellipse(vx + vw - 32, vy + 24, 3, 3, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#ffa3ba';
      c.beginPath();
      c.ellipse(vx + vw - 22, vy + 17, 2.5, 2.5, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.ellipse(vx + vw - 22, vy + 16.5, 1, 1, 0, 0, Math.PI * 2);
      c.fill();

      // Ground moss & sunlit stones
      c.fillStyle = '#22c55e';
      c.fillRect(vx, vy + vh - 6, vw, 6);
      c.fillStyle = '#86efac';
      c.fillRect(vx, vy + vh - 6, vw, 1.5);
      c.fillStyle = '#64748b';
      c.beginPath(); c.ellipse(vx + 24, vy + vh - 3, 7, 3, 0, 0, Math.PI * 2); c.fill();

      // Sliding Shoji Panels on sides
      const drawSlidingShoji = (px, pw) => {
        c.fillStyle = '#1c1008';
        c.fillRect(px, vy, pw, vh);
        c.fillStyle = '#6e4324';
        c.fillRect(px + 2, vy + 2, pw - 4, vh - 4);
        c.fillStyle = 'rgba(254, 252, 245, 0.94)';
        c.fillRect(px + 4, vy + 4, pw - 8, vh - 8);
        c.fillStyle = '#3a2010';
        for (let gy = vy + 10; gy < vy + vh - 6; gy += 12) c.fillRect(px + 4, gy, pw - 8, 1);
        for (let gx = px + 8; gx < px + pw - 6; gx += 8) c.fillRect(gx, vy + 4, 1, vh - 8);
      };
      drawSlidingShoji(vx, 26);
      drawSlidingShoji(vx + vw - 26, 26);

      // Center Kumiko cross muntins
      const cx0 = vx + 26, cx1 = vx + vw - 26, cw = cx1 - cx0;
      c.fillStyle = '#2a170c';
      c.fillRect(cx0, vy + vh * 0.45, cw, 2);
      c.fillRect(cx0 + cw / 2, vy, 2, vh);

      // Morning Glass Sun Glare
      c.fillStyle = 'rgba(255, 255, 255, 0.14)';
      c.beginPath();
      c.moveTo(cx0, vy);
      c.lineTo(cx0 + 40, vy);
      c.lineTo(cx0 + 15, vy + vh);
      c.lineTo(cx0, vy + vh);
      c.fill();

      c.restore();
    },

    fixBuild(c, o) {
      const [x, y] = boardText(c, o, [36, 83, 56, 16], '', 14);
      c.fillText('REPEAT', x + 2, y);
    },
    fixIdeas(c, o) {
      const [x, y] = boardText(c, o, [12, 60, 62, 15], '', 13);
      c.textAlign = 'center'; c.fillText('ART', x + 31, y); c.textAlign = 'left';
    },
    screenCode(c, o) {
      screen(c, o, [7, 7, 98, 55], (x, y, w, h) => {
        const cols = ['#7dd3fc', '#f9a8d4', '#fde68a', '#86efac', '#c4b5fd', '#94a3b8'];
        const scroll = Math.floor(state.t * 2.2);
        for (let i = 0; i < 9; i++) {
          const n = i + scroll, ind = (n * 7) % 4, len = 14 + ((n * 37) % 50);
          c.fillStyle = cols[(n * 3) % cols.length];
          c.fillRect(x + 6 + ind * 6, y + 5 + i * 6, Math.min(len, w - 14 - ind * 6), 3);
        }
        if (Math.floor(state.t * 2) % 2) { c.fillStyle = '#e2e8f0'; c.fillRect(x + 6, y + 5 + 9 * 6 - 2, 4, 5); }
      });
    },
    githubBoard(c, o) {
      // paint live data over the board's placeholder grid and stats (sprite coordinates)
      if (GITHUB.status === 'loading') return;
      c.fillStyle = '#0d182a'; // board background colour
      c.fillRect(14, 49, 130, 52);          // grid area
      c.fillRect(40, 110, 108, 64);         // stat lines
      if (GITHUB.status === 'ok') {
        const weeks = 18, cell = 6, gap = 1.2;
        const lastDow = new Date(GITHUB.days[GITHUB.days.length - 1].date).getUTCDay();
        const days = GITHUB.days.slice(-((weeks - 1) * 7 + lastDow + 1));
        const first = new Date(days[0].date).getUTCDay();
        days.forEach((d, i) => {
          const col = Math.floor((i + first) / 7), row = (i + first) % 7;
          c.fillStyle = GH_COLORS[d.level] || GH_COLORS[0];
          c.fillRect(16 + col * (cell + gap), 50 + row * (cell + gap), cell, cell);
        });
      } else {
        c.fillStyle = '#7c869c'; c.font = `10px ${PIXEL_FONT}`; c.textBaseline = 'middle';
        c.fillText('could not load', 44, 75);
      }
      c.fillStyle = '#e8edf7'; c.font = `12px ${PIXEL_FONT}`; c.textBaseline = 'middle';
      const n = v => (v == null ? '—' : v);
      const ok = GITHUB.status === 'ok';
      c.fillText(`${n(GITHUB.repos)} repos`, 43, 118);
      c.fillText(`${ok ? GITHUB.total : '—'} this year`, 43, 139);
      c.fillText(GITHUB.streak ? `${GITHUB.streak}-day streak` : `${ok ? GITHUB.activeDays : '—'} active days`, 43, 161);
    },
    spinRecord(c, o) {
      if (!state.music) return;
      const cx = o.x + 57 * o.sc, cy = o.y + 33 * o.sc, a = state.t * 5;
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2;
      for (const off of [0, Math.PI]) {
        c.beginPath(); c.arc(cx, cy, 20, a + off, a + off + 0.7); c.stroke();
      }
    },
    // Modern Japanese Kotatsu Lounge Centerpiece
    kotatsu(c, o) {
      // o is the coffee_table object in local coordinates (o.w ~ 149, o.h ~ 97)
      const w = o.w, h = o.h;

      // 4 Traditional Japanese Zaisu Floor Chairs (Curved Hinoki Wood Backrests + Silk Cushions)
      const drawZaisu = (zx, zy, dir) => {
        c.save();
        // Chair base cushion
        c.fillStyle = '#1a2e16';
        roundRect(c, zx - 14, zy - 6, 28, 12, 3); c.fill();
        c.fillStyle = '#507c47';
        roundRect(c, zx - 13, zy - 5, 26, 10, 2); c.fill();
        // Curved wooden backrest
        c.fillStyle = '#22140a';
        if (dir === 'top') {
          roundRect(c, zx - 16, zy - 15, 32, 10, 4); c.fill();
          c.fillStyle = '#af7943';
          roundRect(c, zx - 15, zy - 14, 30, 8, 3); c.fill();
          c.fillStyle = '#dca768';
          c.fillRect(zx - 13, zy - 13, 26, 2);
        } else if (dir === 'bottom') {
          roundRect(c, zx - 16, zy + 6, 32, 10, 4); c.fill();
          c.fillStyle = '#af7943';
          roundRect(c, zx - 15, zy + 7, 30, 8, 3); c.fill();
          c.fillStyle = '#dca768';
          c.fillRect(zx - 13, zy + 8, 26, 2);
        } else if (dir === 'left') {
          roundRect(c, zx - 8, zy - 14, 8, 28, 3); c.fill();
          c.fillStyle = '#af7943';
          roundRect(c, zx - 7, zy - 13, 6, 26, 2); c.fill();
        } else if (dir === 'right') {
          roundRect(c, zx, zy - 14, 8, 28, 3); c.fill();
          c.fillStyle = '#af7943';
          roundRect(c, zx + 1, zy - 13, 6, 26, 2); c.fill();
        }
        c.restore();
      };

      // Draw top Zaisu chair (behind table)
      drawZaisu(w / 2, 8, 'top');
      // Draw left & right Zaisu chairs
      drawZaisu(-10, 44, 'left');
      drawZaisu(w + 10, 44, 'right');

      // 1. Moss Green Futon Blanket draped over the table
      const bx = -14, by = 18, bw = w + 28, bh = h - 14;
      c.fillStyle = 'rgba(20, 35, 15, 0.45)';
      c.beginPath();
      c.ellipse(w / 2, by + bh + 4, bw * 0.48, 12, 0, 0, Math.PI * 2);
      c.fill();

      // Futon quilt base & cloth folds
      const futonGrad = c.createLinearGradient(0, by, 0, by + bh);
      futonGrad.addColorStop(0, '#4e7545');
      futonGrad.addColorStop(0.5, '#3e6236');
      futonGrad.addColorStop(1, '#2c4726');
      c.fillStyle = futonGrad;
      c.beginPath();
      c.moveTo(bx + 12, by);
      c.lineTo(bx + bw - 12, by);
      c.quadraticCurveTo(bx + bw + 4, by + bh * 0.5, bx + bw - 4, by + bh);
      c.lineTo(bx + 4, by + bh);
      c.quadraticCurveTo(bx - 4, by + bh * 0.5, bx + 12, by);
      c.fill();
      c.strokeStyle = '#1d3219'; c.lineWidth = 2; c.stroke();

      // Blanket drape folds
      c.fillStyle = '#65915a';
      c.fillRect(bx + 16, by + 4, bw - 32, 2);
      c.fillStyle = '#263d20';
      c.fillRect(bx + 20, by + bh - 8, bw - 40, 3);
      c.fillRect(bx + 8, by + 12, 4, bh - 16);
      c.fillRect(bx + bw - 12, by + 12, 4, bh - 16);

      // 2. Square Hinoki Wood Tabletop Slab
      const tx = 6, ty = 12, tw = w - 12, th = 38;
      c.fillStyle = '#23140a';
      c.fillRect(tx - 2, ty - 2, tw + 4, th + 4);
      const topGrad = c.createLinearGradient(0, ty, 0, ty + th);
      topGrad.addColorStop(0, '#f2ca91');
      topGrad.addColorStop(0.3, '#dfab68');
      topGrad.addColorStop(1, '#b78044');
      c.fillStyle = topGrad;
      c.fillRect(tx, ty, tw, th);
      // Top slab highlight
      c.fillStyle = '#ffdfa8';
      c.fillRect(tx, ty, tw, 2);
      // Slab bevel shadow
      c.fillStyle = '#543319';
      c.fillRect(tx, ty + th - 3, tw, 3);

      // 3. Traditional Cast Iron Teapot (Tetsubin - 鉄瓶)
      const kx = tx + 32, ky = ty + 12;
      // Kettle shadow
      c.fillStyle = 'rgba(20, 15, 10, 0.4)';
      c.beginPath(); c.ellipse(kx + 10, ky + 14, 12, 4, 0, 0, Math.PI * 2); c.fill();
      // Body
      c.fillStyle = '#1c1d22';
      c.beginPath(); c.ellipse(kx + 10, ky + 10, 10, 7, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#3a3c44';
      c.beginPath(); c.ellipse(kx + 8, ky + 8, 7, 4, 0, 0, Math.PI * 2); c.fill();
      // Spout
      c.fillStyle = '#1c1d22';
      c.beginPath(); c.moveTo(kx + 2, ky + 10); c.lineTo(kx - 4, ky + 6); c.lineTo(kx - 3, ky + 4); c.lineTo(kx + 4, ky + 8); c.fill();
      // Lid gold knob
      c.fillStyle = '#d4af37';
      c.fillRect(kx + 9, ky + 3, 2, 2);
      // Arched overhead handle
      c.strokeStyle = '#1c1d22'; c.lineWidth = 2;
      c.beginPath(); c.arc(kx + 10, ky + 7, 8, Math.PI, 0); c.stroke();
      // Steam wisp
      const steamY = ky - 4 - ((state.t * 12) % 10);
      c.fillStyle = 'rgba(255, 255, 255, 0.25)';
      c.fillRect(kx - 4, steamY, 2, 2);
      c.fillRect(kx - 2, steamY - 3, 2, 2);

      // 4. Ceramic Matcha Teacup (Chawan)
      const cx = tx + 62, cy = ty + 14;
      c.fillStyle = 'rgba(20, 15, 10, 0.35)';
      c.beginPath(); c.ellipse(cx + 6, cy + 8, 7, 3, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#eae5d8';
      c.beginPath(); c.ellipse(cx + 6, cy + 6, 6, 5, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#588b48'; // matcha green tea
      c.beginPath(); c.ellipse(cx + 6, cy + 5, 4, 3, 0, 0, Math.PI * 2); c.fill();

      // 5. Open Book with Ribbon
      const bx2 = tx + 84, by2 = ty + 10;
      c.fillStyle = '#22140c';
      c.fillRect(bx2 - 1, by2 - 1, 26, 16);
      c.fillStyle = '#f8f4e6';
      c.fillRect(bx2, by2, 12, 14); // left page
      c.fillRect(bx2 + 13, by2, 12, 14); // right page
      c.fillStyle = '#3a2818';
      c.fillRect(bx2 + 12, by2, 1, 14); // spine
      c.fillStyle = '#b03030'; // red bookmark ribbon
      c.fillRect(bx2 + 12, by2 + 10, 4, 8);

      // Draw bottom Zaisu chair (in front of table)
      drawZaisu(w / 2, by + bh + 4, 'bottom');
    },
    // Japanese Zabuton Cushion with sleeping studio cat
    catCushion(c, o) {
      const cw = 72, ch = 52, cx = -cw / 2 + 36, cy = -ch / 2 + 22;
      // Drop shadow
      c.fillStyle = 'rgba(20, 15, 10, 0.4)';
      c.beginPath(); c.ellipse(cx + cw / 2, cy + ch - 2, cw * 0.46, 7, 0, 0, Math.PI * 2); c.fill();

      // Puffy green silk Zabuton cushion
      c.fillStyle = '#172e14';
      roundRect(c, cx, cy + 8, cw, 22, 6); c.fill();
      const cg = c.createLinearGradient(0, cy + 8, 0, cy + 30);
      cg.addColorStop(0, '#679c5b');
      cg.addColorStop(0.5, '#44703a');
      cg.addColorStop(1, '#2c4e24');
      c.fillStyle = cg;
      roundRect(c, cx + 1, cy + 9, cw - 2, 20, 5); c.fill();

      // Corner gold tassels
      c.fillStyle = '#ffd36a';
      c.fillRect(cx - 2, cy + 24, 3, 3);
      c.fillRect(cx + cw - 1, cy + 24, 3, 3);
      c.fillRect(cx - 2, cy + 10, 3, 3);
      c.fillRect(cx + cw - 1, cy + 10, 3, 3);

      // Sleeping Cat "Bug" curled up on the cushion
      const kx = cx + cw / 2 - 2, ky = cy + 16;
      const breath = Math.sin(state.t * 2.2) * 0.7;

      // Cat body (ginger and cream tabby)
      c.fillStyle = '#d97d38'; // ginger fur
      c.beginPath(); c.ellipse(kx, ky, 15, 11 + breath, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#f6edd9'; // white belly / chest patch
      c.beginPath(); c.ellipse(kx + 2, ky + 2, 9, 6 + breath * 0.6, 0.2, 0, Math.PI * 2); c.fill();

      // Cat head
      c.fillStyle = '#d97d38';
      c.beginPath(); c.arc(kx - 9, ky - 2, 7, 0, Math.PI * 2); c.fill();
      // Ears
      c.fillStyle = '#b85e22';
      c.beginPath(); c.moveTo(kx - 14, ky - 5); c.lineTo(kx - 10, ky - 11); c.lineTo(kx - 8, ky - 6); c.fill();
      c.beginPath(); c.moveTo(kx - 8, ky - 6); c.lineTo(kx - 5, ky - 11); c.lineTo(kx - 3, ky - 5); c.fill();
      // Sleeping closed eyes
      c.strokeStyle = '#5a2e10'; c.lineWidth = 1;
      c.beginPath(); c.arc(kx - 11, ky - 1, 2, 0.2, Math.PI - 0.2); c.stroke();
      // Nose
      c.fillStyle = '#f8a5a5';
      c.fillRect(kx - 13, ky + 1, 2, 1);
      // Tail curled around body
      c.strokeStyle = '#d97d38'; c.lineWidth = 3;
      c.beginPath(); c.arc(kx + 7, ky + 2, 9, -0.4, 2.2); c.stroke();
      c.strokeStyle = '#f6edd9'; c.lineWidth = 2; // white tail tip
      c.beginPath(); c.arc(kx + 7, ky + 2, 9, 1.6, 2.2); c.stroke();
    },
    // Stack of 3 Green Silk Zabuton Floor Cushions with Gold Tassels (Matching reference image)
    zabutonStack(c, o) {
      const sw = 64, sh = 52;
      const x = -sw / 2 + 32, y = -sh / 2 + 20;

      // Drop shadow
      c.fillStyle = 'rgba(20, 15, 10, 0.45)';
      c.beginPath(); c.ellipse(x + sw / 2, y + sh - 2, sw * 0.46, 8, 0, 0, Math.PI * 2); c.fill();

      // 3 Layers of puffy silk cushions
      for (let layer = 0; layer < 3; layer++) {
        const ly = y + 16 - layer * 8;
        const lh = 14;
        // Cushion shadow outline
        c.fillStyle = '#172e14';
        roundRect(c, x, ly, sw, lh, 5); c.fill();

        // Cushion body gradient
        const cg = c.createLinearGradient(0, ly, 0, ly + lh);
        cg.addColorStop(0, layer === 2 ? '#679c5b' : '#57884d');
        cg.addColorStop(0.5, '#44703a');
        cg.addColorStop(1, '#2c4e24');
        c.fillStyle = cg;
        roundRect(c, x + 1, ly + 1, sw - 2, lh - 2, 4); c.fill();

        // Center tufting button
        c.fillStyle = '#1b3318';
        c.fillRect(x + sw / 2 - 2, ly + lh / 2 - 1, 4, 2);
        c.fillStyle = '#ffd36a';
        c.fillRect(x + sw / 2 - 1, ly + lh / 2 - 1, 2, 1);

        // Gold Corner Tassels (Fusa - 房)
        c.fillStyle = '#d4af37';
        c.fillRect(x - 3, ly + lh - 4, 4, 3);
        c.fillRect(x + sw - 1, ly + lh - 4, 4, 3);
        c.fillStyle = '#fce182';
        c.fillRect(x - 2, ly + lh - 3, 2, 2);
        c.fillRect(x + sw, ly + lh - 3, 2, 2);
      }
    },
    // Traditional Japanese Andon Paper Lantern
    andonLantern(c, o) {
      const lx = 4, ly = 4, lw = 34, lh = 58;
      // Outer shadow
      c.fillStyle = 'rgba(25, 15, 8, 0.4)';
      c.beginPath(); c.ellipse(lx + lw / 2, ly + lh + 2, lw * 0.45, 5, 0, 0, Math.PI * 2); c.fill();

      // Wooden Four-Legged Base
      c.fillStyle = '#221308';
      c.fillRect(lx + 2, ly + lh - 8, 4, 8);
      c.fillRect(lx + lw - 6, ly + lh - 8, 4, 8);
      c.fillRect(lx, ly + lh - 8, lw, 3);

      // Paper Lantern Box (Washi panels)
      c.fillStyle = '#221308';
      c.fillRect(lx, ly + 8, lw, lh - 16);

      // Glowing paper
      const glow = c.createLinearGradient(0, ly + 10, 0, ly + lh - 18);
      glow.addColorStop(0, '#fff3d1');
      glow.addColorStop(0.5, '#ffe596');
      glow.addColorStop(1, '#fdbb42');
      c.fillStyle = glow;
      c.fillRect(lx + 2, ly + 10, lw - 4, lh - 20);

      // Wooden Kumiko grid on the lantern
      c.fillStyle = '#3a200e';
      c.fillRect(lx + 2, ly + 22, lw - 4, 2);
      c.fillRect(lx + 2, ly + 34, lw - 4, 2);
      c.fillRect(lx + lw / 2 - 1, ly + 10, 2, lh - 20);

      // Wooden Roof Cap
      c.fillStyle = '#221308';
      c.fillRect(lx - 2, ly + 4, lw + 4, 4);
      c.fillStyle = '#5c371d';
      c.fillRect(lx - 2, ly + 5, lw + 4, 2);
      // Top ring handle
      c.strokeStyle = '#221308'; c.lineWidth = 2;
      c.beginPath(); c.arc(lx + lw / 2, ly + 3, 4, Math.PI, 0); c.stroke();
    },
    // Gnarled Japanese Bonsai Tree on Tokonoma Stand
    bonsai(c, o) {
      const bx = 8, by = 10, bw = 64, bh = 56;
      // Oval Ceramic Planter Pot (Ubachi)
      c.fillStyle = 'rgba(20, 15, 10, 0.4)';
      c.beginPath(); c.ellipse(bx + bw / 2, by + bh, bw * 0.42, 6, 0, 0, Math.PI * 2); c.fill();

      c.fillStyle = '#1e242a';
      c.beginPath(); c.ellipse(bx + bw / 2, by + bh - 6, 22, 7, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#343c46';
      c.beginPath(); c.ellipse(bx + bw / 2, by + bh - 7, 20, 5, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#4a3b2c'; // soil
      c.beginPath(); c.ellipse(bx + bw / 2, by + bh - 8, 18, 4, 0, 0, Math.PI * 2); c.fill();

      // Gnarled Trunk & Branches
      c.fillStyle = '#3e2716';
      c.beginPath();
      c.moveTo(bx + bw / 2 - 4, by + bh - 8);
      c.quadraticCurveTo(bx + bw / 2 - 12, by + bh - 24, bx + bw / 2 - 2, by + bh - 32);
      c.quadraticCurveTo(bx + bw / 2 + 8, by + bh - 38, bx + bw / 2 + 14, by + bh - 44);
      c.lineTo(bx + bw / 2 + 10, by + bh - 44);
      c.quadraticCurveTo(bx + bw / 2 + 4, by + bh - 36, bx + bw / 2 + 2, by + bh - 30);
      c.quadraticCurveTo(bx + bw / 2 - 6, by + bh - 22, bx + bw / 2 + 2, by + bh - 8);
      c.fill();

      // Left branch
      c.beginPath();
      c.moveTo(bx + bw / 2 - 3, by + bh - 26);
      c.lineTo(bx + bw / 2 - 16, by + bh - 34);
      c.lineTo(bx + bw / 2 - 14, by + bh - 36);
      c.lineTo(bx + bw / 2 - 1, by + bh - 28);
      c.fill();

      // Pine Foliage Needle Clouds (Layered Matsu greens)
      const pineClusters = [
        [bx + bw / 2 - 18, by + bh - 38, 14, 8],
        [bx + bw / 2 + 12, by + bh - 48, 16, 9],
        [bx + bw / 2 - 2, by + bh - 44, 18, 10],
      ];
      for (const [cx, cy, cw, ch] of pineClusters) {
        c.fillStyle = '#1c4524';
        c.beginPath(); c.ellipse(cx, cy + 2, cw, ch, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#2f6d3c';
        c.beginPath(); c.ellipse(cx, cy, cw - 1, ch - 1, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#529e62';
        c.beginPath(); c.ellipse(cx - 2, cy - 2, cw * 0.65, ch * 0.6, 0, 0, Math.PI * 2); c.fill();
      }
    },
    // Traditional Japanese Standing Room Divider / Folding Screen (Tsuitate)
    tsuitate(c, o) {
      const sw = 58, sh = 66, sx = 4, sy = 2;
      // Wooden feet
      c.fillStyle = '#22140a';
      c.fillRect(sx, sy + sh - 6, 8, 6);
      c.fillRect(sx + sw - 8, sy + sh - 6, 8, 6);
      c.fillRect(sx - 2, sy + sh - 8, sw + 4, 3);

      // Outer Hinoki wood frame
      c.fillStyle = '#22140a';
      c.fillRect(sx, sy, sw, sh - 8);
      c.fillStyle = '#b6834b';
      c.fillRect(sx + 3, sy + 3, sw - 6, sh - 14);

      // Silk / washi screen panel
      c.fillStyle = '#f8f4ec';
      c.fillRect(sx + 5, sy + 5, sw - 10, sh - 18);

      // Delicate Sakura / cherry blossom artwork on the screen
      c.fillStyle = '#4a3320';
      c.beginPath();
      c.moveTo(sx + 8, sy + sh - 18);
      c.quadraticCurveTo(sx + 24, sy + 28, sx + 38, sy + 16);
      c.lineTo(sx + 36, sy + 15);
      c.quadraticCurveTo(sx + 22, sy + 26, sx + 6, sy + sh - 16);
      c.fill();

      // Pink Sakura blossom petals
      const blossoms = [
        [sx + 26, sy + 28], [sx + 38, sy + 16], [sx + 32, sy + 22], [sx + 44, sy + 18], [sx + 20, sy + 34]
      ];
      for (const [px, py] of blossoms) {
        c.fillStyle = '#ff7597';
        c.beginPath(); c.ellipse(px, py, 3, 3, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#ffb3c6';
        c.beginPath(); c.ellipse(px, py - 1, 2, 2, 0, 0, Math.PI * 2); c.fill();
      }
    },

    // Desk 1: DataDukan (Next-Gen Data Marketplace & Analytics Suite)
    deskDataDukan(c, o) {
      const sx = 58, sy = 11, sw = 150, sh = 44;

      // 1. Monitor Screen Glass Gradient
      const g = c.createLinearGradient(0, sy, 0, sy + sh);
      g.addColorStop(0, '#060d18');
      g.addColorStop(0.45, '#0b1c34');
      g.addColorStop(1, '#050a14');
      c.fillStyle = g;
      c.fillRect(sx, sy, sw, sh);

      // Subtle cyan screen inner border
      c.strokeStyle = '#0284c7'; c.lineWidth = 1;
      c.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1);

      // 2. High-Tech Isometric Database Stack Icon
      const ix = sx + 20, iy = sy + 17;
      // Cylinder layers
      const drawLayer = (ly, colTop, colSide) => {
        c.fillStyle = colSide;
        c.beginPath();
        c.ellipse(ix, ly + 3, 8, 3, 0, 0, Math.PI * 2);
        c.fill();
        c.fillRect(ix - 8, ly, 16, 3);
        c.fillStyle = colTop;
        c.beginPath();
        c.ellipse(ix, ly, 8, 3, 0, 0, Math.PI * 2);
        c.fill();
      };
      drawLayer(iy + 10, '#0284c7', '#0369a1');
      drawLayer(iy + 5, '#0ea5e9', '#0284c7');
      drawLayer(iy, '#38bdf8', '#0284c7');
      // Highlight dot
      c.fillStyle = '#ffffff';
      c.fillRect(ix - 3, iy - 1, 2, 1);

      // 3. Two-Tone Pixel Typography: "DATA DUKAN"
      const tx = sx + 36;
      c.font = `bold 13px ${PIXEL_FONT}`;
      c.textBaseline = 'alphabetic';

      // Drop shadow
      c.fillStyle = '#02182b';
      c.fillText('DATA', tx + 1, sy + 25);
      c.fillText('DUKAN', tx + 37, sy + 25);

      // Main vibrant colors
      c.fillStyle = '#38bdf8'; // Glowing cyan
      c.fillText('DATA', tx, sy + 24);
      c.fillStyle = '#f8fafc'; // Crisp bright white
      c.fillText('DUKAN', tx + 36, sy + 24);

      // 4. Subtitle & Live Status Pip
      c.fillStyle = '#22c55e';
      c.beginPath(); c.arc(tx + 2, sy + 32, 2, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#94a3b8';
      c.font = `8px ${PIXEL_FONT}`;
      c.fillText('MARKETPLACE', tx + 8, sy + 35);

      // 5. Version / Data Tag
      c.fillStyle = '#0ea5e9';
      c.font = `7px ${PIXEL_FONT}`;
      c.fillText('LIVE', sx + sw - 20, sy + 9);

      // 6. Scanlines
      c.fillStyle = 'rgba(255, 255, 255, 0.035)';
      for (let yy = sy; yy < sy + sh; yy += 3) c.fillRect(sx, yy, sw, 1);

      // 7. Glass Glare Sheen
      c.fillStyle = 'rgba(255, 255, 255, 0.06)';
      c.beginPath();
      c.moveTo(sx, sy);
      c.lineTo(sx + 36, sy);
      c.lineTo(sx + 16, sy + sh);
      c.lineTo(sx, sy + sh);
      c.fill();
    },

    // Desk 2: VaultDoc (Zero-Knowledge Encrypted Document Vault)
    deskVaultDoc(c, o) {
      const sx = 58, sy = 11, sw = 146, sh = 44;

      // 1. Monitor Screen Glass Gradient
      const g = c.createLinearGradient(0, sy, 0, sy + sh);
      g.addColorStop(0, '#0a0d16');
      g.addColorStop(0.45, '#121626');
      g.addColorStop(1, '#07090f');
      c.fillStyle = g;
      c.fillRect(sx, sy, sw, sh);

      // Subtle indigo screen inner border
      c.strokeStyle = '#6366f1'; c.lineWidth = 1;
      c.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1);

      // 2. High-Tech Vault Shield & Document Lock Icon
      const ix = sx + 19, iy = sy + 15;
      // Shield backing
      c.fillStyle = '#312e81';
      c.beginPath();
      c.moveTo(ix, iy - 4);
      c.lineTo(ix + 9, iy);
      c.lineTo(ix + 9, iy + 9);
      c.quadraticCurveTo(ix, iy + 16, ix, iy + 17);
      c.quadraticCurveTo(ix, iy + 16, ix - 9, iy + 9);
      c.lineTo(ix - 9, iy);
      c.closePath();
      c.fill();

      // Shield rim
      c.strokeStyle = '#6366f1'; c.lineWidth = 1;
      c.stroke();

      // Padlock in center
      c.strokeStyle = '#fbbf24'; c.lineWidth = 1.5;
      c.beginPath();
      c.arc(ix, iy + 5, 3, Math.PI, 0);
      c.stroke();
      c.fillStyle = '#f59e0b';
      c.fillRect(ix - 4, iy + 5, 8, 6);
      c.fillStyle = '#1e1b4b';
      c.fillRect(ix - 1, iy + 7, 2, 2);

      // 3. Two-Tone Pixel Typography: "VAULT DOC"
      const tx = sx + 36;
      c.font = `bold 13px ${PIXEL_FONT}`;
      c.textBaseline = 'alphabetic';

      // Drop shadow
      c.fillStyle = '#0a0b16';
      c.fillText('VAULT', tx + 1, sy + 25);
      c.fillText('DOC', tx + 47, sy + 25);

      // Main colors
      c.fillStyle = '#818cf8'; // Glowing indigo
      c.fillText('VAULT', tx, sy + 24);
      c.fillStyle = '#f8fafc'; // Crisp bright white
      c.fillText('DOC', tx + 46, sy + 24);

      // 4. Subtitle & Security Pip
      c.fillStyle = '#f59e0b';
      c.beginPath(); c.arc(tx + 2, sy + 32, 2, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#94a3b8';
      c.font = `8px ${PIXEL_FONT}`;
      c.fillText('ZERO-KNOWLEDGE', tx + 8, sy + 35);

      // 5. Encrypted status tag
      c.fillStyle = '#10b981';
      c.font = `7px ${PIXEL_FONT}`;
      c.fillText('SECURE', sx + sw - 32, sy + 9);

      // 6. Scanlines
      c.fillStyle = 'rgba(255, 255, 255, 0.035)';
      for (let yy = sy; yy < sy + sh; yy += 3) c.fillRect(sx, yy, sw, 1);

      // 7. Glass Glare Sheen
      c.fillStyle = 'rgba(255, 255, 255, 0.06)';
      c.beginPath();
      c.moveTo(sx, sy);
      c.lineTo(sx + 36, sy);
      c.lineTo(sx + 16, sy + sh);
      c.lineTo(sx, sy + sh);
      c.fill();
    },
  };

  // ── live GitHub data ─────────────────────────────────────────────────────
  const GITHUB = { user: CONTENT.github.username, status: 'loading', days: [], total: 0, streak: 0, activeDays: 0, best: null, repos: null, followers: null };
  const GH_COLORS = ['#18243a', '#0e4429', '#006d32', '#26a641', '#39d353'];
  async function loadGitHub() {
    if (!GITHUB.user) { GITHUB.status = 'error'; return; }
    try {
      const r = await fetch(`https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(GITHUB.user)}?y=last`);
      if (!r.ok) throw new Error(r.status);
      const d = await r.json();
      const today = new Date().toISOString().slice(0, 10);
      GITHUB.days = (d.contributions || []).filter(c => c.date <= today);
      GITHUB.total = d.total?.lastYear ?? GITHUB.days.reduce((a, c) => a + c.count, 0);
      GITHUB.activeDays = GITHUB.days.filter(c => c.count > 0).length;
      GITHUB.best = GITHUB.days.reduce((b, c) => (!b || c.count > b.count ? c : b), null);
      // current streak: consecutive active days ending today (or yesterday, if today is still empty)
      let i = GITHUB.days.length - 1, streak = 0;
      if (i >= 0 && GITHUB.days[i].count === 0) i--;
      while (i >= 0 && GITHUB.days[i].count > 0) { streak++; i--; }
      GITHUB.streak = streak;
      GITHUB.status = GITHUB.days.length ? 'ok' : 'error';
    } catch (e) {
      GITHUB.status = 'error';
    }
    try {
      const r = await fetch(`https://api.github.com/users/${encodeURIComponent(GITHUB.user)}`);
      if (r.ok) { const u = await r.json(); GITHUB.repos = u.public_repos; GITHUB.followers = u.followers; }
    } catch (e) { /* repo count is optional */ }
    if (state.panelOpen && state.panelKey === 'github') openPanel('github'); // refresh if open
  }

  // Now-playing wall screen (dynamic)
  function drawNowPlaying() {
    ctx.save(); ctx.translate(NP.x, NP.y); ctx.scale(NP.k, NP.k);
    drawNowPlayingScreen();
    ctx.restore();
  }
  function drawNowPlayingScreen() {
    const x = 0, y = 0, w = 164, h = 92;
    // Outer Japanese Hinoki wood casing with gold corner brackets
    ctx.fillStyle = '#160e08'; roundRect(ctx, x - 3, y - 3, w + 6, h + 6, 3); ctx.fill();
    ctx.fillStyle = '#3a2213'; roundRect(ctx, x - 1, y - 1, w + 2, h + 2, 2); ctx.fill();

    // Gold Corner Brackets (Kanakumono)
    const drawBracket = (bx, by, flipX, flipY) => {
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(bx, by, flipX * 6, flipY * 2);
      ctx.fillRect(bx, by, flipX * 2, flipY * 6);
    };
    drawBracket(x - 1, y - 1, 1, 1);
    drawBracket(x + w + 1, y - 1, -1, 1);
    drawBracket(x - 1, y + h + 1, 1, -1);
    drawBracket(x + w + 1, y + h + 1, -1, -1);

    // Deep slate indigo screen body
    ctx.fillStyle = '#0d1322'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#e8edf7'; ctx.font = `11px ${PIXEL_FONT}`; ctx.textBaseline = 'top'; ctx.textAlign = 'center';

    // Header title
    const sp = !state.music && state.spotify;
    ctx.fillText(sp ? (sp.playing ? 'DEV IS LISTENING' : 'LAST PLAYED') : 'NOW PLAYING', x + w / 2, y + 8);

    // Track title / status
    ctx.save(); ctx.beginPath(); ctx.rect(x + 8, y + 23, w - 16, 14); ctx.clip();
    if (!state.music && !sp?.playing) {
      // Centered, clean status when paused — NO cutoff!
      ctx.fillStyle = '#7c869c'; ctx.font = `11px ${PIXEL_FONT}`; ctx.textAlign = 'center';
      ctx.fillText('♫ record player · paused', x + w / 2, y + 24);
    } else {
      const title = state.music ? '♪ lofi.studio — build mode ♪   ' : `♫ ${sp.title} — ${sp.artist}   `;
      ctx.fillStyle = state.music ? '#8ef0a7' : '#1ed760'; ctx.textAlign = 'left'; ctx.font = `11px ${PIXEL_FONT}`;
      const tw = ctx.measureText(title).width, off = (state.t * 30) % tw;
      ctx.fillText(title + title, x + 8 - off, y + 24);
    }
    ctx.restore();

    // Equalizer bars (centered)
    const bars = 20, bw = 5, gap = 2, totalBarsW = bars * (bw + gap) - gap;
    const bx = x + Math.round((w - totalBarsW) / 2), by = y + 62;
    for (let i = 0; i < bars; i++) {
      const v = (state.music || (sp && sp.playing)) ? 0.25 + 0.75 * Math.abs(Math.sin(state.t * (3 + (i % 5)) + i * 1.7)) * (0.6 + 0.4 * Math.sin(state.t * 1.3 + i)) : 0.12;
      const bh = Math.max(2, Math.round(v * 24));
      for (let k = 0; k < bh; k += 3) {
        ctx.fillStyle = k > 18 ? '#fbbf24' : k > 10 ? '#a3e635' : '#22c55e';
        ctx.fillRect(bx + i * (bw + gap), by - k, bw, 2);
      }
    }

    // Controls
    ctx.fillStyle = '#e8edf7';
    const cy = y + 76, cx = x + w / 2;
    tri(cx - 36, cy, -1); tri(cx - 30, cy, -1);
    if (state.music) { ctx.fillRect(cx - 5, cy - 5, 3, 10); ctx.fillRect(cx + 2, cy - 5, 3, 10); } else tri(cx - 3, cy, 1, 6);
    tri(cx + 26, cy, 1); tri(cx + 32, cy, 1);
    ctx.textAlign = 'left';
  }
  function tri(x, y, dir, s = 5) {
    ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + dir * s * 1.2, y); ctx.lineTo(x, y + s); ctx.fill();
  }

  // Japanese Windows: night garden overlay
  function drawWindowsNight() {
    if (state.nightAmt <= 0.01) return;
    for (const id of ['win1', 'win2']) {
      const o = byId[id];
      if (!o) continue;
      const ix = o.x + 6, iy = o.y + 6, iw = o.w - 12, ih = o.h - 12;
      ctx.save();
      ctx.beginPath(); ctx.rect(ix, iy, iw, ih); ctx.clip();

      // Deep nocturnal indigo sky gradient
      const ng = ctx.createLinearGradient(0, iy, 0, iy + ih);
      ng.addColorStop(0, `rgba(8, 12, 32, ${0.88 * state.nightAmt})`);
      ng.addColorStop(0.6, `rgba(14, 22, 50, ${0.82 * state.nightAmt})`);
      ng.addColorStop(1, `rgba(18, 30, 64, ${0.75 * state.nightAmt})`);
      ctx.fillStyle = ng;
      ctx.fillRect(ix, iy, iw, ih);

      // Twinkling celestial stars
      ctx.fillStyle = `rgba(255, 255, 230, ${0.9 * state.nightAmt})`;
      for (let i = 0; i < 16; i++) {
        const sx = ix + ((i * 79 + o.x) % (iw - 8)) + 4;
        const sy = iy + ((i * 47) % Math.floor(ih * 0.55)) + 4;
        if (Math.sin(state.t * 2.5 + i) > -0.5) ctx.fillRect(sx, sy, 2, 2);
      }

      // Moon in win1
      if (id === 'win1') {
        const mx = ix + iw - 68, my = iy + 22;
        // Moon glow aura
        const mg = ctx.createRadialGradient(mx, my, 4, mx, my, 22);
        mg.addColorStop(0, `rgba(255, 245, 200, ${0.35 * state.nightAmt})`);
        mg.addColorStop(1, 'rgba(255, 245, 200, 0)');
        ctx.fillStyle = mg;
        ctx.beginPath(); ctx.arc(mx, my, 22, 0, Math.PI * 2); ctx.fill();
        // Golden crescent moon
        ctx.fillStyle = `rgba(255, 248, 220, ${state.nightAmt})`;
        ctx.beginPath(); ctx.arc(mx, my, 11, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(10, 16, 42, ${0.92 * state.nightAmt})`;
        ctx.beginPath(); ctx.arc(mx + 4, my - 2, 9, 0, Math.PI * 2); ctx.fill();
      }

      // Japanese Stone Lantern (Tōrō) glowing warmly inside
      const tlx = id === 'win1' ? ix + 72 : ix + 24;
      const tly = iy + ih - 26;
      const lg = ctx.createRadialGradient(tlx + 5, tly + 10, 2, tlx + 5, tly + 10, 18);
      lg.addColorStop(0, `rgba(255, 190, 80, ${0.85 * state.nightAmt})`);
      lg.addColorStop(0.5, `rgba(255, 150, 40, ${0.35 * state.nightAmt})`);
      lg.addColorStop(1, 'rgba(255, 150, 40, 0)');
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.arc(tlx + 5, tly + 10, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(255, 220, 130, ${0.95 * state.nightAmt})`;
      ctx.fillRect(tlx + 3, tly + 8, 5, 5);

      // Drifting golden fireflies (Hotaru - 蛍) in the bamboo
      for (let i = 0; i < 5; i++) {
        const fx = ix + ((i * 57 + state.t * 8) % (iw - 20)) + 10;
        const fy = iy + ih - 22 + Math.sin(state.t * 3 + i * 2) * 8;
        const fa = (0.5 + 0.5 * Math.sin(state.t * 4 + i)) * state.nightAmt;
        ctx.fillStyle = `rgba(215, 255, 110, ${fa})`;
        ctx.fillRect(fx, fy, 2, 2);
      }

      ctx.restore();
    }
  }

  // ── night lighting ───────────────────────────────────────────────────────
  const nightC = document.createElement('canvas');
  nightC.width = W; nightC.height = H;
  const nctx = nightC.getContext('2d');
  function drawNight() {
    const a = state.nightAmt;
    if (a <= 0.01) return;
    nctx.globalCompositeOperation = 'source-over';
    nctx.clearRect(0, 0, W, H);
    nctx.fillStyle = `rgba(12,16,46,${0.66 * a})`;
    nctx.fillRect(0, 0, W, H);
    nctx.globalCompositeOperation = 'destination-out';
    const flick = 1 + Math.sin(state.t * 9) * 0.015;
    for (const L of WD.lights) {
      const g = nctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r * flick);
      g.addColorStop(0, 'rgba(0,0,0,0.9)'); g.addColorStop(0.5, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      nctx.fillStyle = g; nctx.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
    }
    ctx.drawImage(nightC, 0, 0);
    // warm additive glow
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const L of WD.lights) {
      const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r * 0.6);
      g.addColorStop(0, `rgba(${L.c},${0.22 * a})`); g.addColorStop(1, `rgba(${L.c},0)`);
      ctx.fillStyle = g; ctx.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
    }
    ctx.restore();
  }

  // ── player animation ─────────────────────────────────────────────────────
  function heroFrame() {
    // the hero only stands or walks; running just plays the walk cycle faster
    const d = player.dir;
    if (player.mode === 'idle') return `hero_idle_${d}`;
    const fps = player.mode === 'run' ? 12 : 8;
    return `hero_walk_${d}_${1 + Math.floor(player.animT * fps) % 4}`;
  }
  function drawPlayer() {
    const name = heroFrame(), s = S[name];
    const sc = HERO_SCALE;
    // shadow
    ctx.fillStyle = 'rgba(30,15,5,0.28)';
    ctx.beginPath(); ctx.ellipse(player.x, player.y - 2, 22, 7, 0, 0, 7); ctx.fill();
    const bob = player.mode === 'idle' && Math.sin(state.t * 2.4) > 0.6 ? 1 : 0;
    drawSprite(ctx, name, Math.round(player.x - s.ax * sc), Math.round(player.y - s.ay * sc + bob), sc);
  }
  function say(text, dur = 3.5) { player.bubble = text; player.bubbleT = dur; }

  // ── interactions ─────────────────────────────────────────────────────────
  function nearestHotspot() {
    let best = null, bd = 78;
    for (const h of WD.hotspots) {
      const d = Math.hypot(player.x - h.at[0], player.y - h.at[1]);
      if (d < bd) { bd = d; best = h; }
    }
    return best;
  }
  function inRect(r, x, y) { return r && x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3]; }
  function hotspotAt(x, y) {
    const hits = WD.hotspots.filter(h => inRect(h.rect, x, y) || inRect(h.rect2, x, y));
    hits.sort((a, b) => a.rect[2] * a.rect[3] - b.rect[2] * b.rect[3]);
    return hits[0] || null;
  }
  function goTo(h) {
    player.path = findPath(player.x, player.y, h.at[0], h.at[1]);
    player.pending = h;
    if (!player.path.length) arrive();
  }
  function arrive() {
    const h = player.pending;
    player.pending = null;
    if (!h) return;
    if (Math.hypot(player.x - h.at[0], player.y - h.at[1]) > 90) return;
    player.dir = h.face || player.dir;
    interact(h);
  }
  function interact(h) {
    sfx.blip();
    switch (h.action) {
      case 'music': toggleMusic(); break;
      case 'guitar':
        sfx.strum();
        for (let i = 0; i < 6; i++) spawn('note', h.rect[0] + 20, h.rect[1] + 20, { delay: i * 0.12 });
        say(['♪ Wonderwall, anyone?', '♪ *strums a G chord*', '♪ Only 3 chords, but they slap'][Math.floor(Math.random() * 3)], 2.5);
        return;
      case 'pet':
        state.catPets++;
        sfx.meow();
        for (let i = 0; i < 5; i++) spawn('heart', CAT.x, CAT.y, { delay: i * 0.1 });
        say(state.catPets === 1 ? 'Meet Bug, the studio cat 🐱' : state.catPets < 5 ? 'Bug purrs happily.' : 'Bug: "ok that\'s enough"', 2.5);
        return;
      case 'night': toggleNight(); return;
    }
    if (h.panel) openPanel(h.panel);
  }

  // ── particles ────────────────────────────────────────────────────────────
  function spawn(type, x, y, o = {}) {
    particles.push({ type, x: x + rnd(-14, 14), y: y + rnd(-6, 6), vx: rnd(-18, 18), vy: rnd(-55, -35), life: o.life || 1.6, age: -(o.delay || 0), col: o.col, rot: rnd(0, 6) });
  }
  const HEART = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
  function drawParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      if (p.age < 0) continue;
      if (p.age > p.life) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.type === 'confetti') { p.vy += 140 * dt; p.rot += dt * 6; }
      const a = 1 - p.age / p.life;
      ctx.globalAlpha = Math.min(1, a * 1.5);
      if (p.type === 'heart') {
        ctx.fillStyle = '#ff5d7a';
        HEART.forEach((row, ry) => [...row].forEach((ch, rx) => { if (ch === '#') ctx.fillRect(Math.round(p.x) + rx * 2, Math.round(p.y) + ry * 2, 2, 2); }));
      } else if (p.type === 'note' || p.type === 'z') {
        ctx.fillStyle = p.type === 'z' ? '#7aa7ff' : '#fff2b3';
        ctx.strokeStyle = '#2a1b10'; ctx.lineWidth = 3;
        ctx.font = `${p.type === 'z' ? 18 : 22}px ${PIXEL_FONT}`;
        const ch = p.type === 'z' ? 'z' : '♪';
        ctx.strokeText(ch, p.x, p.y); ctx.fillText(ch, p.x, p.y);
      } else if (p.type === 'confetti') {
        ctx.fillStyle = p.col;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-3, -2, 6, 4); ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
  }

  // ── speech bubble & prompts ──────────────────────────────────────────────
  function drawBubble() {
    if (!player.bubble || player.bubbleT <= 0) return;
    ctx.font = `15px ${PIXEL_FONT}`;
    const text = player.bubble, tw = ctx.measureText(text).width;
    const w = tw + 20, h = 28;
    const head = 126 * HERO_SCALE / 0.9;
    let x = clamp(player.x - w / 2, 8, W - w - 8), y = player.y - head - h - 6;
    ctx.globalAlpha = Math.min(1, player.bubbleT * 3);
    ctx.fillStyle = '#2a1b10'; roundRect(ctx, x - 2, y - 2, w + 4, h + 4, 6); ctx.fill();
    ctx.fillStyle = '#fff8e8'; roundRect(ctx, x, y, w, h, 5); ctx.fill();
    ctx.beginPath(); ctx.moveTo(player.x - 6, y + h); ctx.lineTo(player.x + 6, y + h); ctx.lineTo(player.x, y + h + 8); ctx.fillStyle = '#fff8e8'; ctx.fill();
    ctx.fillStyle = '#2a1b10'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x + 10, y + h / 2 + 1);
    ctx.globalAlpha = 1;
  }
  function drawHighlight(h, strong) {
    const pulse = 0.55 + 0.45 * Math.sin(state.t * 5);
    for (const r of [h.rect, h.rect2]) {
      if (!r) continue;
      const [x, y, w, hh] = r, L = 12;
      ctx.strokeStyle = `rgba(255,236,150,${strong ? 0.9 : 0.5 * pulse + 0.3})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + hh, 1, -1], [x + w, y + hh, -1, -1]].forEach(([cx, cy, sx, sy]) => {
        ctx.moveTo(cx, cy + sy * L); ctx.lineTo(cx, cy); ctx.lineTo(cx + sx * L, cy);
      });
      ctx.stroke();
    }
  }
  function drawPrompt(h) {
    const label = h.label;
    ctx.font = `14px ${PIXEL_FONT}`;
    const key = isTouch ? 'TAP' : 'E';
    const kw = ctx.measureText(key).width + 12, tw = ctx.measureText(label).width;
    const w = kw + tw + 18, bh = 26;
    const r = h.rect;
    const x = clamp(r[0] + r[2] / 2 - w / 2, 6, W - w - 6);
    const y = Math.max(4, r[1] - bh - 10 + Math.sin(state.t * 4) * 2);
    ctx.fillStyle = 'rgba(16,20,36,0.92)'; roundRect(ctx, x, y, w, bh, 6); ctx.fill();
    ctx.strokeStyle = '#ffd36a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#ffd36a'; roundRect(ctx, x + 5, y + 4, kw, bh - 8, 4); ctx.fill();
    ctx.fillStyle = '#1a1424'; ctx.textBaseline = 'middle';
    ctx.fillText(key, x + 11, y + bh / 2 + 1);
    ctx.fillStyle = '#fff6dc';
    ctx.fillText(label, x + kw + 12, y + bh / 2 + 1);
  }

  // ── camera / resize ──────────────────────────────────────────────────────
  // outer edges of the room's wall frame — the view is fitted to these, edge to edge
  const FRAME_X0 = WD.room.x0 - 17, FRAME_X1 = WD.room.x1 + 17;
  let vw = 0, vh = 0, scale = 1, camX = 0, camY = 0, dpr = 1, padTop = 0;
  const isTouch = matchMedia('(pointer: coarse)').matches;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    vw = window.innerWidth; vh = window.innerHeight;
    cvs.width = Math.round(vw * dpr); cvs.height = Math.round(vh * dpr);
    cvs.style.width = vw + 'px'; cvs.style.height = vh + 'px';
    padTop = vw > 640 ? 78 : 0; // keep the HUD from covering the back wall on desktop
    // fill the full screen width; if the room is then taller than the screen,
    // the camera scrolls vertically with the player (phones keep a readable zoom)
    scale = Math.max(vw / (FRAME_X1 - FRAME_X0), Math.min(0.8, vh / H));
    updateCamera(0);
  }
  function updateCamera(dt) {
    const viewW = vw / scale, viewH = vh / scale;
    const fw = FRAME_X1 - FRAME_X0;
    const tx = viewW >= fw + 1 ? FRAME_X0 - (viewW - fw) / 2 : clamp(player.x - viewW / 2, FRAME_X0, FRAME_X1 - viewW);
    const ty = viewH - padTop / scale >= H ? -(padTop + (vh - padTop - H * scale) / 2) / scale : clamp(player.y - 60 - viewH / 2, -padTop / scale, H - viewH);
    const k = dt ? Math.min(1, dt * 6) : 1;
    camX += (tx - camX) * k; camY += (ty - camY) * k;
  }
  function screenToWorld(sx, sy) { return [sx / scale + camX, sy / scale + camY]; }

  // ── update ───────────────────────────────────────────────────────────────
  function update(dt) {
    state.t += dt;
    state.nightAmt = clamp(state.nightAmt + (state.night ? dt : -dt) * 1.5, 0, 1);
    if (player.bubbleT > 0) player.bubbleT -= dt;
    player.animT += dt;
    updateCamera(dt);

    let ix = 0, iy = 0;
    if (!state.panelOpen) {
      if (keys.has('arrowleft') || keys.has('a')) ix -= 1;
      if (keys.has('arrowright') || keys.has('d')) ix += 1;
      if (keys.has('arrowup') || keys.has('w')) iy -= 1;
      if (keys.has('arrowdown') || keys.has('s')) iy += 1;
    }
    const running = keys.has('shift');

    if (ix || iy) { player.path = []; player.pending = null; }

    let mx = ix, my = iy, speed = running ? RUN_SPEED : WALK_SPEED;
    if (!ix && !iy && player.path.length) {
      const [tx, ty] = player.path[0];
      const dx = tx - player.x, dy = ty - player.y, d = Math.hypot(dx, dy);
      speed = player.path.length > 1 || d > 260 ? RUN_SPEED * 0.85 : WALK_SPEED;
      if (d < 4) { player.path.shift(); if (!player.path.length) { player.mode = 'idle'; arrive(); } }
      else { mx = dx / d; my = dy / d; }
    }

    if (mx || my) {
      const len = Math.hypot(mx, my);
      mx /= len; my /= len;
      const step = speed * dt;
      const nx = player.x + mx * step, ny = player.y + my * step;
      if (!ix && !iy && player.path.length) {
        // following a path: segments were checked by findPath, so just move
        player.x = nx; player.y = ny;
      } else {
        // keyboard: slide along obstacles one axis at a time (free movement if somehow stuck)
        const stuck = blocked(player.x, player.y);
        if (stuck || !blocked(nx, player.y)) player.x = nx;
        if (stuck || !blocked(player.x, ny)) player.y = ny;
      }
      player.dir = Math.abs(mx) > Math.abs(my) ? (mx < 0 ? 'left' : 'right') : (my < 0 ? 'up' : 'down');
      player.mode = speed > WALK_SPEED ? 'run' : 'walk';
    } else {
      player.mode = 'idle';
    }


    // cat dreams
    if (Math.random() < dt * 0.35) spawn('z', CAT.x + 20, CAT.y - 4, { life: 1.8 });
    // music notes from the record player
    if (state.music && Math.random() < dt * 1.4) spawn('note', byId.turntable.x + byId.turntable.w / 2, byId.turntable.y - 6, { life: 1.8 });

    state.near = state.panelOpen ? null : nearestHotspot();
  }

  // ── render ───────────────────────────────────────────────────────────────
  function render(dt) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const n = state.nightAmt; // outside the room darkens along with the night overlay
    ctx.fillStyle = `rgb(${22 - 7 * n},${27 - 8 * n},${46 - 2 * n})`;
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, -camX * dpr * scale, -camY * dpr * scale);
    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(bg, 0, 0);
    drawWindowsNight();
    drawNowPlaying();

    // depth-sorted objects + player
    const list = objects.filter(o => o.layer === 'obj');
    const pBase = player.y;
    const drawables = list.map(o => ({ base: o.base, o }));
    drawables.push({ base: pBase, player: true });
    drawables.sort((a, b) => a.base - b.base);
    for (const d of drawables) {
      if (d.player) { drawPlayer(); continue; }
      const o = d.o;
      if (!o.customOnly) drawSprite(ctx, o.s, o.x, o.y, o.sc, o.flip);
      if (o.fx && FX[o.fx]) runFx(ctx, o);
    }

    drawNight();
    drawParticles(dt);

    // hover / proximity hints
    if (!state.panelOpen && state.started) {
      if (state.hover) drawHighlight(state.hover, true);
      if (state.near) { if (state.near !== state.hover) drawHighlight(state.near, false); drawPrompt(state.near); }
    }
    drawBubble();
    if (DEBUG) drawDebug();
  }
  const DEBUG = new URLSearchParams(location.search).has('debug');
  function drawDebug() {
    ctx.fillStyle = 'rgba(255,0,0,0.3)';
    solids.forEach(r => ctx.fillRect(r.x, r.y, r.w, r.h));
    ctx.strokeStyle = 'rgba(0,255,255,0.6)'; ctx.lineWidth = 1;
    const wk = WD.walk; ctx.strokeRect(wk.x0, wk.y0, wk.x1 - wk.x0, wk.y1 - wk.y0);
    for (const h of WD.hotspots) {
      const p = findPath(645, 752, h.at[0], h.at[1]);
      const end = p.length ? p[p.length - 1] : [645, 752];
      const ok = !blocked(h.at[0], h.at[1]) && Math.hypot(end[0] - h.at[0], end[1] - h.at[1]) < 20;
      ctx.fillStyle = ok ? '#0f0' : '#f00';
      ctx.fillRect(h.at[0] - 5, h.at[1] - 5, 10, 10);
      ctx.font = '12px monospace'; ctx.fillText(h.id, h.at[0] + 7, h.at[1]);
    }
  }

  // ── panels (HTML) ────────────────────────────────────────────────────────
  const panel = document.getElementById('panel');
  const panelBody = document.getElementById('panel-body');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let clockTimer = null;

  function renderSection(sec) {
    const title = sec.title ? `<h3>${esc(sec.title)}</h3>` : '';
    switch (sec.type) {
      case 'text': return `${title}<p>${esc(sec.body)}</p>`;
      case 'list': return `${title}<ul class="list">${sec.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
      case 'tags': return `${title}<div class="tags">${sec.items.map(i => `<span>${esc(i)}</span>`).join('')}</div>`;
      case 'links': return `${title}<div class="links">${sec.items.map(l => `<a href="${esc(l.href)}" target="_blank" rel="noopener"${l.highlight ? ' class="highlight"' : ''}><b>${esc(l.label)}</b><small>${esc(l.note || '')}</small><i>→</i></a>`).join('')}</div>`;
      case 'stats': return `${title}<div class="stats">${sec.items.map(s => `<div><b>${esc(s.value)}</b><small>${esc(s.label)}</small></div>`).join('')}</div>`;
      case 'timeline': return `${title}<ol class="timeline">${sec.items.map(t => `<li><small>${esc(t.when)}</small><b>${esc(t.what)}</b><p>${esc(t.note || '')}</p></li>`).join('')}</ol>`;
      case 'contrib': {
        if (GITHUB.status === 'loading') return `${title}<p class="note">Loading contributions…</p>`;
        if (GITHUB.status === 'error') return `${title}<p class="note">Could not reach GitHub right now. Try the link below.</p>`;
        const first = new Date(GITHUB.days[0].date).getUTCDay();
        let cells = '<i class="pad"></i>'.repeat(first);
        for (const d of GITHUB.days) {
          const day = new Date(d.date + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
          cells += `<i class="l${d.level}" data-count="${d.count}" data-day="${esc(day)}" aria-label="${esc(`${d.count} contribution${d.count === 1 ? '' : 's'} on ${day}`)}"></i>`;
        }
        return `${title}<p class="contrib-total"><b>${GITHUB.total}</b> contributions in the last year</p>
          <div class="contrib-scroll"><div class="contrib year">${cells}</div></div>
          <div class="contrib-legend">Less <i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i> More</div>`;
      }
      case 'github-stats': {
        const ok = GITHUB.status === 'ok';
        const items = [
          [GITHUB.repos == null ? '—' : GITHUB.repos, 'public repos'],
          [ok ? GITHUB.total : '—', 'contributions (1y)'],
          [ok ? GITHUB.streak : '—', 'day streak'],
          [ok && GITHUB.best ? GITHUB.best.count : '—', 'best day'],
        ];
        return `${title}<div class="stats four">${items.map(([v, l]) => `<div><b>${esc(v)}</b><small>${l}</small></div>`).join('')}</div>`;
      }
      case 'clock': return `${title}<div class="clock"><small>${esc(sec.label)}</small><b data-tz="${esc(sec.tz)}">--:--</b></div>`;
      case 'spotify': return `${title}${renderSpotifyCard()}`;
      case 'music': return `<button class="pixel-btn music-toggle">${state.music ? '❚❚ Pause music' : '▶ Play studio music'}</button>`;
      case 'image': {
        const imgStyles = [];
        const figStyles = [];
        if (sec.position) imgStyles.push(`object-position: ${esc(sec.position)}`);
        if (sec.fit) imgStyles.push(`object-fit: ${esc(sec.fit)}`);
        if (sec.aspect) {
          imgStyles.push(`aspect-ratio: ${esc(sec.aspect)}`);
          figStyles.push(`aspect-ratio: ${esc(sec.aspect)}`);
        }
        if (sec.maxHeight) {
          imgStyles.push(`max-height: ${esc(sec.maxHeight)}`);
          figStyles.push(`max-height: ${esc(sec.maxHeight)}`);
        }
        if (sec.width) {
          imgStyles.push(`width: ${esc(sec.width)}`);
          figStyles.push(`width: ${esc(sec.width)}`);
        }
        const imgStyleAttr = imgStyles.length ? ` style="${imgStyles.join('; ')}"` : '';
        const figStyleAttr = figStyles.length ? ` style="${figStyles.join('; ')}"` : '';
        const figClass = `media${sec.class ? ` ${esc(sec.class)}` : ''}`;
        return `${title}<figure class="${figClass}"${figStyleAttr}><img src="${esc(sec.src)}" alt="${esc(sec.alt || '')}" loading="lazy"${imgStyleAttr}>${sec.caption ? `<figcaption>${esc(sec.caption)}</figcaption>` : ''}</figure>`;
      }
      case 'video': return `${title}<figure class="media"><video src="${esc(sec.src)}"${sec.poster ? ` poster="${esc(sec.poster)}"` : ''} autoplay muted loop playsinline preload="metadata"></video>${sec.caption ? `<figcaption>${esc(sec.caption)}</figcaption>` : ''}</figure>`;
      case 'gallery': return `${title}<div class="gallery${sec.tall ? ' tall' : ''}">${sec.items.map(it => {
        const m = /\.(mp4|webm)$/i.test(it.src)
          ? `<video src="${esc(it.src)}" autoplay muted loop playsinline preload="metadata"></video>`
          : `<img src="${esc(it.src)}" alt="${esc(it.alt || '')}" loading="lazy">`;
        return `<figure>${m}${it.caption ? `<figcaption>${esc(it.caption)}</figcaption>` : ''}</figure>`;
      }).join('')}</div>`;
      case 'quotes': return `${title}<div class="quotes">${sec.items.map(q => {
        // blank lines in a quote become separate paragraphs; curly quotes wrap the whole thing
        const paras = q.text.split(/\n\s*\n/);
        const body = paras.map((t, i) => `<p>${i === 0 ? '“' : ''}${esc(t)}${i === paras.length - 1 ? '”' : ''}</p>`).join('');
        return `<blockquote>${body}<footer><b>${esc(q.name)}</b>${q.org ? ` · ${esc(q.org)}` : ''}</footer></blockquote>`;
      }).join('')}</div>`;
    }
    return '';
  }
  function openPanel(key) {
    const c = CONTENT[key];
    if (!c) return;
    state.panelKey = key;
    let extra = '';
    panelBody.innerHTML = `
      <header><span class="icon">${esc(c.icon || '◆')}</span><div><h2>${esc(c.title)}</h2>${c.subtitle ? `<small>${esc(c.subtitle)}</small>` : ''}</div></header>
      <div class="content">${c.sections.map(renderSection).join('')}${extra}</div>`;
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('open'));
    state.panelOpen = true;
    panelBody.querySelector('.music-toggle')?.addEventListener('click', e => { toggleMusic(); e.target.textContent = state.music ? '❚❚ Pause music' : '▶ Play studio music'; });
    const tick = () => panelBody.querySelectorAll('[data-tz]').forEach(el => {
      el.textContent = new Date().toLocaleTimeString([], { timeZone: el.dataset.tz, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    });
    tick(); clearInterval(clockTimer); clockTimer = setInterval(tick, 1000);
    panel.querySelector('.close').focus({ preventScroll: true });
    if (PANEL_KEYS.includes(key)) discover(key);
    if (key === 'music') loadSpotify();
  }
  function closePanel() {
    if (!state.panelOpen) return;
    panelBody.querySelectorAll('video').forEach(v => v.pause()); // stop showcase/motion videos with the panel
    hideContribTip();
    panel.classList.remove('open');
    state.panelOpen = false;
    clearInterval(clockTimer);
    setTimeout(() => { if (!state.panelOpen) panel.hidden = true; }, 180);
    cvs.focus();
  }
  panel.addEventListener('click', e => { if (e.target === panel || e.target.closest('.close')) closePanel(); });

  // GitHub panel: instant pixel tooltip with the day's contribution count (hover, or tap on touch)
  const contribTip = document.createElement('div');
  contribTip.className = 'contrib-tip';
  contribTip.hidden = true;
  document.body.appendChild(contribTip);
  let tipCell = null;
  function showContribTip(cell) {
    if (tipCell === cell) return;
    tipCell?.classList.remove('active');
    tipCell = cell;
    cell.classList.add('active');
    const n = Number(cell.dataset.count);
    contribTip.innerHTML = `<b>${n === 0 ? 'No' : n} contribution${n === 1 ? '' : 's'}</b><small>${esc(cell.dataset.day)}</small>`;
    contribTip.hidden = false;
    const r = cell.getBoundingClientRect(), t = contribTip.getBoundingClientRect();
    const x = Math.min(Math.max(8, r.left + r.width / 2 - t.width / 2), innerWidth - t.width - 8);
    const above = r.top - t.height - 8;
    contribTip.style.left = `${x}px`;
    contribTip.style.top = `${above > 8 ? above : r.bottom + 8}px`;
  }
  function hideContribTip() {
    tipCell?.classList.remove('active');
    tipCell = null;
    contribTip.hidden = true;
  }
  panelBody.addEventListener('pointerover', e => {
    const cell = e.target.closest('.contrib i[data-count]');
    if (cell) showContribTip(cell);
  });
  panelBody.addEventListener('pointerdown', e => {
    const cell = e.target.closest('.contrib i[data-count]');
    if (cell) showContribTip(cell);
  });
  panelBody.addEventListener('pointerout', e => {
    if (e.pointerType === 'mouse' && e.target.closest('.contrib i[data-count]') && !e.relatedTarget?.closest?.('.contrib i[data-count]')) hideContribTip();
  });
  panelBody.closest('.sheet').addEventListener('scroll', hideContribTip, { passive: true });
  panelBody.addEventListener('scroll', hideContribTip, { capture: true, passive: true }); // the grid's own sideways scroll

  // ── discovery progress ───────────────────────────────────────────────────
  const total = new Set(PANEL_KEYS).size;
  function discover(key) {
    if (state.discovered.has(key)) return;
    state.discovered.add(key);
    updateProgress();
    if (state.discovered.size === total && !state.celebrated) {
      state.celebrated = true;
      setTimeout(() => {
        closePanel();
        say("You've seen everything! Let's build something together.", 5);
        sfx.fanfare();
        const cols = ['#ffd36a', '#ff5d7a', '#7aa7ff', '#5ee08a', '#c08bff'];
        for (let i = 0; i < 80; i++) particles.push({ type: 'confetti', x: player.x + rnd(-200, 200), y: player.y - 260 + rnd(-40, 20), vx: rnd(-60, 60), vy: rnd(-120, 10), life: 2.6, age: -rnd(0, 0.5), col: cols[i % 5], rot: rnd(0, 6) });
      }, 900);
    }
  }
  function updateProgress() {
    document.getElementById('progress-text').textContent = `${state.discovered.size}/${total} explored`;
    document.getElementById('progress-bar').style.width = `${(state.discovered.size / total) * 100}%`;
    document.querySelectorAll('#menu [data-spot]').forEach(b => {
      const h = WD.hotspots.find(x => x.id === b.dataset.spot);
      b.classList.toggle('done', !!h && state.discovered.has(h.panel));
    });
  }

  // ── toasts ───────────────────────────────────────────────────────────────
  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast'; el.textContent = msg;
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3000);
  }

  // ── Spotify (via Last.fm scrobbles): what Dev is playing now, or played last — /api/now-playing ──
  async function loadSpotify() {
    try {
      const res = await fetch('/api/now-playing', { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      state.spotify = data.title ? data : null;
      state.spotifyStatus = data.title ? 'ok' : 'empty';
    } catch {
      state.spotify = null;
      state.spotifyStatus = 'error';
    }
    // refresh an open record-player panel so its card shows the latest song
    if (state.panelOpen && state.panelKey === 'music') {
      const card = panelBody.querySelector('.spotify-card');
      if (card) card.outerHTML = renderSpotifyCard();
    }
  }
  function timeAgo(iso) {
    const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const h = Math.round(mins / 60);
    if (h < 24) return `${h} hr${h === 1 ? '' : 's'} ago`;
    const d = Math.round(h / 24);
    return `${d} day${d === 1 ? '' : 's'} ago`;
  }
  function renderSpotifyCard() {
    const sp = state.spotify;
    if (!sp) {
      const msg = state.spotifyStatus === 'loading' ? 'Checking what Dev is listening to…' : "Couldn't reach Spotify right now.";
      return `<div class="spotify-card empty"><p class="note">${msg}</p></div>`;
    }
    const when = sp.playing ? '<span class="live">● Listening now</span>' : `Last played · ${esc(timeAgo(sp.playedAt))}`;
    return `<div class="spotify-card">
      ${sp.art ? `<img src="${esc(sp.art)}" alt="" width="72" height="72">` : ''}
      <div><small>${when}</small><b>${esc(sp.title)}</b><span>${esc(sp.artist)}</span>
      ${sp.url ? `<a href="${esc(sp.url)}" target="_blank" rel="noopener">Open in Spotify →</a>` : ''}</div>
    </div>`;
  }

  // ── night & music toggles ────────────────────────────────────────────────
  function setNight(on, message) {
    state.night = on;
    document.getElementById('btn-night').classList.toggle('on', on);
    if (message) toast(message);
  }
  function toggleNight() {
    setNight(!state.night, !state.night ? 'Night mode — lamps on 🌙' : 'Good morning ☀️');
  }

  // Day/night follows the visitor's local clock: night 6:30 PM – 5:30 AM, day 5:31 AM – 6:29 PM.
  // The lamp / N key still switch it by hand; that holds until the next scheduled change.
  const DAY_START = 5 * 60 + 31, NIGHT_START = 18 * 60 + 30; // minutes after midnight
  function isNightNow(d = new Date()) {
    const m = d.getHours() * 60 + d.getMinutes();
    return m < DAY_START || m >= NIGHT_START;
  }
  let scheduledNight = isNightNow();
  function followClock() {
    const now = isNightNow();
    if (now === scheduledNight) return;
    scheduledNight = now;
    setNight(now, now ? 'Evening — lamps on 🌙' : 'The sun is up — good morning ☀️');
  }
  function toggleMusic() {
    state.music = !state.music;
    document.getElementById('btn-music').classList.toggle('on', state.music);
    if (state.music) { audio.start(); toast('♪ Now playing: lofi.studio — build mode'); }
    else { audio.stop(); toast('Music paused'); }
  }

  // ── audio (all synthesized, no files) ────────────────────────────────────
  let AC = null, master = null;
  function ac() {
    if (!AC) {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain(); master.gain.value = state.muted ? 0 : 0.5; master.connect(AC.destination);
    }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }
  function tone(freq, t, dur, type = 'square', vol = 0.1, dest) {
    const a = ac(), o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const sfx = {
    blip() { const t = ac().currentTime; tone(880, t, 0.06, 'square', 0.05); tone(1320, t + 0.05, 0.08, 'square', 0.04); },
    meow() {
      const a = ac(), t = a.currentTime, o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter();
      o.type = 'sawtooth'; f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 2;
      o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(820, t + 0.15); o.frequency.linearRampToValueAtTime(480, t + 0.45);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.25, t + 0.05); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + 0.55);
    },
    strum() { // Karplus–Strong plucked G major chord
      const a = ac(), t = a.currentTime;
      [43, 47, 50, 55, 59, 67].forEach((m, i) => pluck(mtof(m), t + i * 0.035, 0.18));
    },
    fanfare() { const t = ac().currentTime;[72, 76, 79, 84].forEach((m, i) => tone(mtof(m), t + i * 0.12, 0.3, 'square', 0.06)); },
  };
  function pluck(freq, t, vol) {
    const a = ac(), sr = a.sampleRate, len = Math.floor(sr * 2.2), buf = a.createBuffer(1, len, sr), d = buf.getChannelData(0);
    const N = Math.round(sr / freq), ring = new Float32Array(N).map(() => Math.random() * 2 - 1);
    for (let i = 0; i < len; i++) { const k = i % N, nx = (k + 1) % N; d[i] = ring[k]; ring[k] = 0.996 * 0.5 * (ring[k] + ring[nx]); }
    const s = a.createBufferSource(), g = a.createGain(); g.gain.value = vol;
    s.buffer = buf; s.connect(g); g.connect(master); s.start(t);
  }
  // lo-fi loop: Am7 – Fmaj7 – Cmaj7 – G6, 84 bpm
  const audio = (() => {
    let timer = null, step = 0, next = 0, bus = null;
    const chords = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 64]];
    const lead = [76, null, 72, 74, null, 76, 79, null, 77, null, 76, 72, null, 74, 72, null];
    const spb = 60 / 84 / 2; // eighth notes
    function schedule() {
      const a = ac();
      while (next < a.currentTime + 0.25) {
        const bar = Math.floor(step / 8) % 4, ch = chords[bar], s8 = step % 8;
        if (s8 === 0) { ch.forEach(m => tone(mtof(m), next, spb * 7.5, 'triangle', 0.035, bus)); tone(mtof(ch[0] - 24), next, spb * 3.5, 'sine', 0.16, bus); }
        if (s8 === 4) tone(mtof(ch[0] - 24), next, spb * 3, 'sine', 0.12, bus);
        const ln = lead[(step + bar * 3) % lead.length];
        if (ln && step % 2 === 0) tone(mtof(ln - (bar === 1 ? 2 : 0)), next, spb * 1.6, 'square', 0.022, bus);
        // hats
        const nb = a.createBuffer(1, 2205, a.sampleRate), nd = nb.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * (1 - i / nd.length) ** 4;
        const ns = a.createBufferSource(), ng = a.createGain(); ns.buffer = nb; ng.gain.value = s8 % 2 ? 0.025 : 0.05;
        ns.connect(ng); ng.connect(bus); ns.start(next);
        if (s8 === 0 || s8 === 5) tone(60, next, 0.18, 'sine', 0.22, bus); // kick
        next += spb; step++;
      }
    }
    return {
      start() {
        const a = ac();
        bus = a.createGain(); bus.gain.value = 0.9;
        const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
        bus.connect(lp); lp.connect(master);
        next = a.currentTime + 0.05; step = 0;
        clearInterval(timer); timer = setInterval(schedule, 60);
      },
      stop() { clearInterval(timer); timer = null; if (bus) { bus.gain.setTargetAtTime(0, ac().currentTime, 0.1); } },
    };
  })();

  // ── input ────────────────────────────────────────────────────────────────
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (k === 'escape') { if (state.panelOpen) closePanel(); else toggleMenu(false); return; }
    if (state.panelOpen || !menu.hidden) return;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    keys.add(k);
    if (k === 'e' || k === ' ' || k === 'enter') useNearby();
    padLight(k, true);
    if (k === 'n') toggleNight();
    if (k === 'm') toggleMusic();
  });
  window.addEventListener('keyup', e => { const k = e.key.toLowerCase(); keys.delete(k); padLight(k, false); });
  function useNearby() {
    if (!state.near) return;
    player.path = []; player.dir = state.near.face || player.dir;
    interact(state.near);
  }

  // ── on-screen control pad ────────────────────────────────────────────────
  const PAD_ALIAS = { arrowup: 'w', arrowleft: 'a', arrowdown: 's', arrowright: 'd', ' ': 'e', enter: 'e' };
  function padLight(k, on) {
    document.querySelector(`#pad [data-key="${PAD_ALIAS[k] || k}"]`)?.classList.toggle('pressed', on);
  }
  document.querySelectorAll('#pad [data-key]').forEach(btn => {
    const key = btn.dataset.key;
    const press = e => {
      e.preventDefault();
      if (state.panelOpen) return;
      btn.setPointerCapture?.(e.pointerId);
      btn.classList.add('pressed');
      if (key === 'e') { useNearby(); return; }
      keys.add(key);
    };
    const release = () => { btn.classList.remove('pressed'); if (key !== 'e') keys.delete(key); };
    btn.addEventListener('pointerdown', press);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => btn.addEventListener(ev, release));
    btn.addEventListener('contextmenu', e => e.preventDefault());
  });
  window.addEventListener('blur', () => { keys.clear(); document.querySelectorAll('#pad .pressed').forEach(b => b.classList.remove('pressed')); });

  cvs.addEventListener('pointermove', e => {
    if (!state.started || state.panelOpen) return;
    const [x, y] = screenToWorld(e.clientX, e.clientY);
    state.hover = hotspotAt(x, y);
    cvs.classList.toggle('hovering', !!state.hover); // CSS swaps in the bitten-pizza cursor
  });
  cvs.addEventListener('pointerdown', e => {
    if (state.panelOpen) return;
    const [x, y] = screenToWorld(e.clientX, e.clientY);
    const h = hotspotAt(x, y);
    if (h) {
      if (Math.hypot(player.x - h.at[0], player.y - h.at[1]) < 70) { player.dir = h.face; interact(h); }
      else goTo(h);
      return;
    }
    player.pending = null;
    player.path = findPath(player.x, player.y, x, y);
    marker = { x, y, t: 0.6 };
  });
  let marker = null;

  // ── HUD buttons & menu ───────────────────────────────────────────────────
  const menu = document.getElementById('menu');
  function toggleMenu(show = menu.hidden) {
    menu.hidden = !show;
    if (show) menu.querySelector('button')?.focus();
  }
  function buildMenu() {
    const list = menu.querySelector('.menu-list');
    const spots = WD.hotspots.filter(h => h.panel && h.id !== 'exit');
    list.innerHTML = spots.map(h => `<button data-spot="${h.id}"><span>${esc(CONTENT[h.panel].icon || '◆')}</span>${esc(CONTENT[h.panel].title)}</button>`).join('');
    list.addEventListener('click', e => {
      const b = e.target.closest('[data-spot]');
      if (!b) return;
      toggleMenu(false);
      const h = WD.hotspots.find(x => x.id === b.dataset.spot);
      if (e.shiftKey || e.altKey) openPanel(h.panel); else goTo(h);
    });
  }
  document.getElementById('btn-menu').addEventListener('click', () => toggleMenu());
  menu.addEventListener('click', e => { if (e.target === menu || e.target.closest('.close')) toggleMenu(false); });
  document.getElementById('btn-night').addEventListener('click', toggleNight);
  document.getElementById('btn-music').addEventListener('click', toggleMusic);
  document.getElementById('btn-sound').addEventListener('click', e => {
    state.muted = !state.muted;
    e.currentTarget.classList.toggle('on', !state.muted);
    e.currentTarget.textContent = state.muted ? '🔇' : '🔊';
    if (master) master.gain.value = state.muted ? 0 : 0.5;
  });

  // ── boot ─────────────────────────────────────────────────────────────────
  // no intro: drop straight into the room
  function start() {
    state.started = true;
    document.getElementById('hud').classList.add('show');
    const hint = document.getElementById('hint');
    if (hint) setTimeout(() => hint.classList.add('fade'), 12000);
  }
  // browsers only allow audio after a user gesture
  window.addEventListener('pointerdown', () => { try { ac(); } catch (_) { /* no audio */ } }, { once: true });
  window.addEventListener('keydown', () => { try { ac(); } catch (_) { /* no audio */ } }, { once: true });

  let last = performance.now();
  const SIM_STEPS = +new URLSearchParams(location.search).get('sim') || 1;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    for (let i = 1; i < SIM_STEPS; i++) update(0.05); // test flag ?sim=N fast-forwards
    update(dt);
    render(dt);
    if (marker) {
      marker.t -= dt;
      ctx.strokeStyle = `rgba(255,236,150,${marker.t / 0.6})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(marker.x, marker.y, 14 * (1.4 - marker.t), 5 * (1.4 - marker.t), 0, 0, 7); ctx.stroke();
      if (marker.t <= 0) marker = null;
    }
    requestAnimationFrame(frame);
  }

  Promise.all([
    new Promise(r => {
      if (sheet.complete && sheet.naturalWidth > 0) return r();
      sheet.onload = () => r();
      sheet.onerror = () => {
        if (!sheet.src.startsWith('/') && !sheet.src.includes('://')) {
          sheet.src = '/' + sheet.src;
          sheet.onload = () => r();
          sheet.onerror = () => r();
        } else {
          r();
        }
      };
      setTimeout(r, 2500); // safety fallback so canvas never hangs
    }),
    document.fonts ? Promise.race([document.fonts.load(`16px ${PIXEL_FONT}`), new Promise(r => setTimeout(r, 1500))]) : null,
  ]).then(() => {
    resize();
    buildBackground();
    loadGitHub();
    buildMenu();
    updateProgress();
    document.getElementById('profile-name').textContent = CONTENT.profile.name;
    document.getElementById('profile-role').textContent = CONTENT.profile.role;
    const av = document.querySelector('.avatar'), hs = S.hero_idle_down, k = 40 / hs.w;
    av.style.backgroundSize = `${2048 * k}px auto`;
    av.style.backgroundPosition = `${-hs.x * k + 2}px ${-hs.y * k + 4}px`;
    const hint = document.getElementById('hint');
    if (hint && isTouch) hint.textContent = 'Tap the floor to walk · tap objects to interact';
    updateCamera(0);
    requestAnimationFrame(frame);
    start();
    // URL flags (handy for testing / screenshots): ?night ?day ?panel=about ?go=cat ?at=x,y ?debug ?sim=N
    const q = new URLSearchParams(location.search);
    if (q.has('sim')) document.getElementById('hud').style.transition = 'none';
    // start in the mode the clock says (no fade on load); ?night / ?day force it for testing
    const startNight = q.has('night') ? true : q.has('day') ? false : scheduledNight;
    setNight(startNight); state.nightAmt = startNight ? 1 : 0;
    if (!q.has('night') && !q.has('day')) setInterval(followClock, 30 * 1000);
    loadSpotify(); setInterval(loadSpotify, 60 * 1000);
    if (q.get('panel')) openPanel(q.get('panel'));
    if (q.get('go')) setTimeout(() => goTo(WD.hotspots.find(h => h.id === q.get('go'))), 200);
    if (q.get('at')) { const [x, y] = q.get('at').split(',').map(Number); player.x = x; player.y = y; }
  });
  window.addEventListener('resize', resize);
  // expose a tiny API for debugging / screenshots
  window.studio = { state, player, openPanel, toggleNight, start };
})();
