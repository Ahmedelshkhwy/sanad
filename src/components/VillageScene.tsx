"use client";

import { useEffect, useRef } from "react";

/**
 * Hero illustration: village fields, a canal, houses and one health point.
 * Drawn on a canvas with a cached static layer. Falls back to a still frame for
 * reduced motion and low-end devices.
 */
type House = { x: number; y: number; s: number; k: number };
type Plot = { x: number; y: number; w: number; h: number; k: number };
type Pulse = { h: House; t: number; back: boolean };

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

export function VillageScene() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const root = document.documentElement;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    const lowEnd = (navigator.hardwareConcurrency || 4) <= 2 || !!nav.connection?.saveData;

    let W = 0, H = 0, dpr = 1;
    let colors: Record<string, string> = {};
    let houses: House[] = [];
    let plots: Plot[] = [];
    let canal: { x: number; y: number }[] = [];
    let pulses: Pulse[] = [];
    let hub = { x: 0, y: 0 };
    let layer: HTMLCanvasElement | null = null;
    let visible = true;
    let raf = 0;
    let last = 0;
    let px = 0, py = 0, tx = 0, ty = 0;

    const readColors = () => {
      const cs = getComputedStyle(root);
      colors = {};
      ["--green", "--green-2", "--sun", "--mint", "--mint-2", "--surface", "--paper", "--line"].forEach((k) => {
        colors[k] = cs.getPropertyValue(k).trim();
      });
    };

    const buildStatic = () => {
      layer = document.createElement("canvas");
      layer.width = cv.width;
      layer.height = cv.height;
      const c = layer.getContext("2d")!;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.fillStyle = colors["--mint"];
      c.fillRect(0, 0, W, H);
      plots.forEach((p) => {
        c.fillStyle = p.k < 0.5 ? colors["--mint-2"] : colors["--surface"];
        c.globalAlpha = p.k < 0.5 ? 0.75 : 0.35;
        roundRect(c, p.x, p.y, p.w, p.h, 6);
        c.fill();
        if (p.k > 0.72) {
          c.globalAlpha = 0.25;
          c.strokeStyle = colors["--green-2"];
          c.lineWidth = 1;
          for (let l = 1; l < 4; l++) {
            c.beginPath();
            c.moveTo(p.x + 6, p.y + (p.h * l) / 4);
            c.lineTo(p.x + p.w - 6, p.y + (p.h * l) / 4);
            c.stroke();
          }
        }
      });
      c.globalAlpha = 1;
      c.lineCap = "round";
      c.lineJoin = "round";
      c.strokeStyle = colors["--surface"];
      c.lineWidth = Math.max(14, H * 0.05);
      c.beginPath();
      canal.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
      c.stroke();
      c.strokeStyle = colors["--green-2"];
      c.globalAlpha = 0.28;
      c.lineWidth = Math.max(8, H * 0.03);
      c.stroke();
      c.globalAlpha = 1;
      c.strokeStyle = colors["--surface"];
      c.lineWidth = 3;
      c.globalAlpha = 0.9;
      [-0.9, -0.28, 0.34].forEach((k) => {
        const a = Math.PI * k;
        c.beginPath();
        c.moveTo(hub.x, hub.y);
        c.quadraticCurveTo(hub.x + Math.cos(a + 0.3) * W * 0.2, hub.y + Math.sin(a + 0.3) * H * 0.2, hub.x + Math.cos(a) * W * 0.6, hub.y + Math.sin(a) * H * 0.6);
        c.stroke();
      });
      c.globalAlpha = 1;
      const g = c.createRadialGradient(hub.x, hub.y, 0, hub.x, hub.y, Math.min(W, H) * 0.3);
      g.addColorStop(0, colors["--surface"]);
      g.addColorStop(1, colors["--surface"] + "00");
      c.fillStyle = g;
      c.globalAlpha = 0.7;
      c.fillRect(0, 0, W, H);
      c.globalAlpha = 1;
    };

    const layout = () => {
      const r = cv.getBoundingClientRect();
      if (!r.width) return;
      dpr = Math.min(devicePixelRatio || 1, lowEnd ? 1 : 2);
      W = r.width;
      H = r.height;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      const R = rng(11);
      hub = { x: W * 0.5, y: H * 0.5 };
      canal = [];
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        canal.push({ x: -20 + t * (W + 40), y: H * 0.8 - Math.sin(t * Math.PI) * H * 0.16 + Math.sin(t * 9) * 4 });
      }
      plots = [];
      const cols = 7, rows = 7, cw = (W / cols) * 1.25, ch = (H / rows) * 1.25;
      for (let i = -1; i <= cols; i++) {
        for (let j = -1; j <= rows; j++) {
          const x = i * cw * 0.82 + j * cw * 0.18 - cw * 0.3;
          const y = j * ch * 0.8 - i * ch * 0.12;
          if (Math.hypot(x + cw / 2 - hub.x, y + ch / 2 - hub.y) < Math.min(W, H) * 0.26) continue;
          plots.push({ x, y, w: cw * 0.78, h: ch * 0.7, k: R() });
        }
      }
      houses = [];
      const n = lowEnd ? 22 : 36, rad = Math.min(W, H);
      for (let i = 0; i < n; i++) {
        const lane = i % 3;
        const a = -Math.PI * 0.9 + lane * Math.PI * 0.62 + (R() - 0.5) * 0.55;
        const d = rad * (0.12 + R() * 0.2);
        const x = hub.x + Math.cos(a) * d * 1.3;
        const y = hub.y + Math.sin(a) * d * 0.95;
        if (x < 18 || x > W - 18 || y < 18 || y > H - 18) continue;
        houses.push({ x, y, s: 5 + R() * 4, k: R() });
      }
      houses.sort((a, b) => a.y - b.y);
      buildStatic();
    };

    const drawHouse = (h: House, ox: number, oy: number) => {
      const { s } = h, x = h.x + ox, y = h.y + oy;
      ctx.fillStyle = colors["--green"];
      ctx.globalAlpha = 0.1;
      ctx.beginPath();
      ctx.ellipse(x, y + s * 1.05, s * 1.25, s * 0.35, 0, 0, 7);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = h.k < 0.25 ? colors["--green"] : colors["--green-2"];
      roundRect(ctx, x - s, y - s * 0.35, s * 2, s * 1.35, 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - s * 1.15, y - s * 0.25);
      ctx.lineTo(x, y - s * 1.25);
      ctx.lineTo(x + s * 1.15, y - s * 0.25);
      ctx.closePath();
      ctx.fill();
      if (h.k > 0.8) {
        ctx.fillStyle = colors["--sun"];
        roundRect(ctx, x - s * 0.25, y + s * 0.2, s * 0.5, s * 0.6, 1);
        ctx.fill();
      }
    };

    const draw = (time: number) => {
      if (!layer) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.drawImage(layer, px * 0.4 * dpr, py * 0.4 * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!reduce) {
        ctx.strokeStyle = colors["--surface"];
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([10, 26]);
        ctx.lineDashOffset = -time / 60;
        ctx.beginPath();
        canal.forEach((p, i) => (i ? ctx.lineTo(p.x + px * 0.4, p.y + py * 0.4) : ctx.moveTo(p.x + px * 0.4, p.y + py * 0.4)));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
      pulses.forEach((p) => {
        const a = p.h;
        const mx = (a.x + hub.x) / 2 + px, my = (a.y + hub.y) / 2 - 22 + py;
        const e = p.t < 0.5 ? 2 * p.t * p.t : 1 - Math.pow(-2 * p.t + 2, 2) / 2;
        ctx.strokeStyle = p.back ? colors["--green"] : colors["--sun"];
        ctx.lineWidth = 1.6;
        ctx.globalAlpha = 0.45 * (1 - Math.abs(p.t - 0.5));
        ctx.beginPath();
        ctx.moveTo(a.x + px, a.y + py);
        ctx.quadraticCurveTo(mx, my, hub.x + px, hub.y + py);
        ctx.stroke();
        ctx.globalAlpha = 1;
        const f = p.back ? 1 - e : e;
        const x = (1 - f) * (1 - f) * (a.x + px) + 2 * (1 - f) * f * mx + f * f * (hub.x + px);
        const y = (1 - f) * (1 - f) * (a.y + py) + 2 * (1 - f) * f * my + f * f * (hub.y + py);
        ctx.fillStyle = p.back ? colors["--green"] : colors["--sun"];
        ctx.beginPath();
        ctx.arc(x, y, 3.4, 0, 7);
        ctx.fill();
      });
      houses.forEach((h) => drawHouse(h, px, py));
      const hx = hub.x + px * 1.1, hy = hub.y + py * 1.1;
      const r = Math.max(20, Math.min(W, H) * 0.06);
      const br = reduce ? 0 : (Math.sin(time / 1400) + 1) / 2;
      ctx.strokeStyle = colors["--green"];
      ctx.lineWidth = 1.5;
      [1.9, 2.7].forEach((m, i) => {
        ctx.globalAlpha = (0.22 - i * 0.08) * (1 - br * 0.5);
        ctx.beginPath();
        ctx.arc(hx, hy, r * (m + br * 0.15), 0, 7);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      ctx.fillStyle = colors["--surface"];
      roundRect(ctx, hx - r - 4, hy - r - 4, (r + 4) * 2, (r + 4) * 2, r * 0.55);
      ctx.fill();
      ctx.fillStyle = colors["--green"];
      roundRect(ctx, hx - r, hy - r, r * 2, r * 2, r * 0.5);
      ctx.fill();
      ctx.strokeStyle = colors["--surface"];
      ctx.lineWidth = r * 0.26;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(hx - r * 0.42, hy);
      ctx.lineTo(hx + r * 0.42, hy);
      ctx.moveTo(hx, hy - r * 0.42);
      ctx.lineTo(hx, hy + r * 0.42);
      ctx.stroke();
      ctx.fillStyle = colors["--sun"];
      ctx.beginPath();
      ctx.arc(hx + r * 0.78, hy - r * 0.78, r * 0.2, 0, 7);
      ctx.fill();
    };

    const spawn = () => {
      if (houses.length && pulses.length < (lowEnd ? 1 : 3)) {
        pulses.push({ h: houses[(Math.random() * houses.length) | 0], t: 0, back: false });
      }
    };

    const step = (time: number) => {
      if (!visible || document.hidden) {
        last = 0;
        return;
      }
      const dt = last ? Math.min(time - last, 50) : 16;
      last = time;
      if (Math.random() < dt / 1400) spawn();
      pulses.forEach((p) => {
        p.t += dt / 2200;
        if (p.t >= 1 && !p.back) {
          p.back = true;
          p.t = 0;
        }
      });
      pulses = pulses.filter((p) => !(p.back && p.t >= 1));
      px += (tx - px) * 0.06;
      py += (ty - py) * 0.06;
      draw(time);
      raf = requestAnimationFrame(step);
    };

    const start = () => {
      if (reduce || !visible || document.hidden) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(step);
    };

    readColors();
    layout();
    spawn();
    if (pulses[0]) pulses[0].t = 0.45;
    draw(0);

    const ro = new ResizeObserver(() => {
      layout();
      draw(performance.now());
    });
    ro.observe(cv);
    const io = new IntersectionObserver((es) => {
      visible = es[0].isIntersecting;
      start();
    });
    io.observe(cv);
    const onVis = () => start();
    document.addEventListener("visibilitychange", onVis);

    const host = cv.parentElement;
    const onMove = (e: PointerEvent) => {
      const b = host!.getBoundingClientRect();
      tx = ((e.clientX - b.left) / b.width - 0.5) * -10;
      ty = ((e.clientY - b.top) / b.height - 0.5) * -8;
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
    };
    if (host && matchMedia("(pointer:fine)").matches && !reduce) {
      host.addEventListener("pointermove", onMove);
      host.addEventListener("pointerleave", onLeave);
    }

    const recolor = () => {
      readColors();
      buildStatic();
      draw(performance.now());
    };
    const mo = new MutationObserver(recolor);
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", recolor);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      mq.removeEventListener("change", recolor);
      document.removeEventListener("visibilitychange", onVis);
      host?.removeEventListener("pointermove", onMove);
      host?.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="relative aspect-[5/4.6] max-w-full overflow-hidden rounded-[28px] bg-mint shadow-card max-md:aspect-[16/11] max-md:rounded-[22px] max-sm:aspect-[4/3]"
    >
      <canvas ref={ref} className="absolute inset-0 block h-full w-full" />
    </div>
  );
}
