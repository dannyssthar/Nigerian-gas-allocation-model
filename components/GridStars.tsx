"use client";

import { useEffect, useRef } from "react";

/**
 * Grid comets.
 *
 * One visual idea, executed once: a thin line that fades from nothing to the
 * accent colour, travelling along the gridlines. No head dot, no glow, no
 * white core \u2014 the gradient IS the star. It uses exactly one colour, read
 * live from the design system, so it is lime in dark mode, deep green in
 * light, and can never drift from the palette.
 *
 * The gradient is not a single straight createLinearGradient: a star that
 * turns a corner would smear a straight gradient across the bend. Instead the
 * line is drawn as short segments whose opacity ramps with distance from the
 * head \u2014 the same dissolve, but it follows the path faithfully through
 * ninety-degree turns.
 *
 * Everything else is discipline: locked to the 64px lattice, turning only at
 * intersections, paused when the hero is off-screen or the tab is hidden,
 * skipped entirely under reduced motion.
 */

const GRID = 64; // must match the background-size in .djn-hero__grid
const COUNT_DESKTOP = 6;
const COUNT_MOBILE = 3;
const TURN_CHANCE = 0.16;
const TRAIL = 30; // points kept; at these speeds a tail of ~70\u2013130px

type Dir = [number, number];
const DIRS: Dir[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

interface Star {
  x: number;
  y: number;
  dir: Dir;
  speed: number;
  trail: { x: number; y: number }[];
  life: number;
  maxLife: number;
}

export default function GridStars() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion:reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let stars: Star[] = [];
    let raf = 0;
    let running = true;

    /** The accent, read off the cascade so the comets follow the theme. */
    const accent = () =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--accent-graphic")
        .trim() || "#6f9400";

    function spawn(edge = true): Star {
      const dir = DIRS[Math.floor(Math.random() * DIRS.length)];
      const lines = Math.max(1, Math.floor((dir[0] !== 0 ? h : w) / GRID));
      const line = Math.floor(Math.random() * lines) * GRID + GRID / 2;

      let x: number;
      let y: number;
      if (dir[0] !== 0) {
        y = line;
        x = edge ? (dir[0] > 0 ? -GRID : w + GRID) : Math.random() * w;
      } else {
        x = line;
        y = edge ? (dir[1] > 0 ? -GRID : h + GRID) : Math.random() * h;
      }

      return {
        x,
        y,
        dir,
        speed: 2.2 + Math.random() * 2.4,
        trail: [],
        life: 0,
        maxLife: 220 + Math.random() * 360,
      };
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = rect.width;
      h = rect.height;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = w < 720 ? COUNT_MOBILE : COUNT_DESKTOP;
      // seeded mid-flight so the hero is alive on first paint
      stars = Array.from({ length: count }, () => spawn(false));
    }

    function atCrossing(s: Star) {
      const along = s.dir[0] !== 0 ? s.x : s.y;
      const offset = ((along - GRID / 2) % GRID + GRID) % GRID;
      return offset < s.speed || offset > GRID - s.speed;
    }

    function step() {
      if (!running) return;
      ctx!.clearRect(0, 0, w, h);

      const colour = accent();
      ctx!.strokeStyle = colour;
      ctx!.lineCap = "round";

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];

        s.trail.push({ x: s.x, y: s.y });
        if (s.trail.length > TRAIL) s.trail.shift();

        s.x += s.dir[0] * s.speed;
        s.y += s.dir[1] * s.speed;
        s.life += 1;

        // turning only at an intersection keeps every star on the lattice
        if (atCrossing(s) && Math.random() < TURN_CHANCE) {
          const turns: Dir[] =
            s.dir[0] !== 0
              ? [
                  [0, 1],
                  [0, -1],
                ]
              : [
                  [1, 0],
                  [-1, 0],
                ];
          s.dir = turns[Math.floor(Math.random() * turns.length)];
          if (s.dir[0] !== 0) {
            s.y = Math.round((s.y - GRID / 2) / GRID) * GRID + GRID / 2;
          } else {
            s.x = Math.round((s.x - GRID / 2) / GRID) * GRID + GRID / 2;
          }
        }

        const out = s.x < -GRID * 2 || s.x > w + GRID * 2 || s.y < -GRID * 2 || s.y > h + GRID * 2;
        if (out || s.life > s.maxLife) {
          stars[i] = spawn(true);
          continue;
        }

        // fade in at birth, out at the end of life; nothing pops
        const fade = Math.min(1, s.life / 40) * Math.min(1, (s.maxLife - s.life) / 60);

        // the gradient: opacity ramps from 0 at the tail tip to full at the
        // head, eased so the tail stays long and quiet
        const n = s.trail.length;
        for (let t = 1; t < n; t++) {
          const k = t / n;
          ctx!.globalAlpha = k * k * 0.8 * fade;
          ctx!.lineWidth = 1.6;
          ctx!.beginPath();
          ctx!.moveTo(s.trail[t - 1].x, s.trail[t - 1].y);
          ctx!.lineTo(s.trail[t].x, s.trail[t].y);
          ctx!.stroke();
        }
      }

      ctx!.globalAlpha = 1;
      raf = requestAnimationFrame(step);
    }

    resize();
    step();

    const onResize = () => resize();
    const onVisibility = () => {
      running = !document.hidden;
      if (running) raf = requestAnimationFrame(step);
      else cancelAnimationFrame(raf);
    };

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    const io = new IntersectionObserver(
      ([entry]) => {
        running = entry.isIntersecting && !document.hidden;
        if (running) raf = requestAnimationFrame(step);
        else cancelAnimationFrame(raf);
      },
      { threshold: 0 }
    );
    io.observe(canvas);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        maskImage:
          "radial-gradient(ellipse 80% 60% at 50% 40%, #000 20%, transparent 75%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 80% 60% at 50% 40%, #000 20%, transparent 75%)",
      }}
    />
  );
}