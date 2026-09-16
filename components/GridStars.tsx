"use client";

import { useEffect, useRef } from "react";

/**
 * Shooting stars on the grid.
 *
 * Each star is locked to a grid line, travels along it, and at every
 * intersection has a small chance of turning ninety degrees. That is what
 * makes the movement read as wandering rather than scripted: nothing is
 * choreographed, but nothing ever leaves the lattice either.
 *
 * Canvas rather than SVG or DOM nodes. A dozen trails each redrawing thirty
 * times a second would thrash the layout engine as elements; on a canvas it is
 * one paint per frame, and it stays smooth on a mid-range phone.
 *
 * The trail is drawn as a fading polyline through the star's recent positions,
 * so a turn bends the tail properly instead of snapping it.
 */

const GRID = 64; // must match the background-size in .djn-hero__grid
const COUNT_DESKTOP = 7;
const COUNT_MOBILE = 4;
const TURN_CHANCE = 0.22;
const TRAIL = 22;

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

    /** Reads the accent straight off the cascade, so the stars change colour
     *  with the theme without this component knowing anything about themes. */
    const accent = () =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--accent-graphic")
        .trim() || "#6f9400";

    /* The glow, paid for once.
       ctx.shadowBlur re-runs a gaussian blur for every star on every frame,
       and it is the single most expensive call in the 2D canvas API. Instead
       the glowing head is rendered ONE time into a small offscreen sprite,
       and each frame just blits that bitmap, which is close to free. The
       sprite is rebuilt only when the theme changes the accent colour. */
    let sprite: HTMLCanvasElement | null = null;
    let spriteColour = "";
    function headSprite(colour: string): HTMLCanvasElement {
      if (sprite && spriteColour === colour) return sprite;
      const s = document.createElement("canvas");
      const R = 12;
      s.width = R * 2;
      s.height = R * 2;
      const sc = s.getContext("2d")!;
      const g = sc.createRadialGradient(R, R, 0, R, R, R);
      g.addColorStop(0, colour);
      g.addColorStop(0.35, colour);
      g.addColorStop(1, "transparent");
      sc.fillStyle = g;
      sc.fillRect(0, 0, R * 2, R * 2);
      sprite = s;
      spriteColour = colour;
      return s;
    }

    function spawn(edge = true): Star {
      const dir = DIRS[Math.floor(Math.random() * DIRS.length)];
      const lines = Math.max(1, Math.floor((dir[0] !== 0 ? h : w) / GRID));
      const line = Math.floor(Math.random() * lines) * GRID + GRID / 2;

      let x: number;
      let y: number;
      if (dir[0] !== 0) {
        // travelling horizontally: enter from the left or right edge
        y = line;
        x = edge ? (dir[0] > 0 ? -GRID : w + GRID) : Math.random() * w;
      } else {
        x = line;
        y = edge ? (dir[1] > 0 ? -GRID : h + GRID) : Math.random() * h;
      }

      const maxLife = 260 + Math.random() * 420;
      return {
        x,
        y,
        dir,
        speed: 1.5 + Math.random() * 2.6,
        trail: [],
        life: 0,
        maxLife,
      };
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      /* Capped at 1.5, not 2. A 3x phone screen at full resolution quadruples
         the pixels every frame pushes, and glowing trails do not need retina
         precision to read as glowing trails. */
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = rect.width;
      h = rect.height;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = w < 720 ? COUNT_MOBILE : COUNT_DESKTOP;
      // seed mid-flight so the hero is already alive on first paint rather
      // than waiting for stars to walk in from off-screen
      stars = Array.from({ length: count }, () => spawn(false));
    }

    /** True when the star is sitting on an intersection, within a step. */
    function atCrossing(s: Star) {
      const along = s.dir[0] !== 0 ? s.x : s.y;
      const offset = ((along - GRID / 2) % GRID + GRID) % GRID;
      return offset < s.speed || offset > GRID - s.speed;
    }

    function step() {
      if (!running) return;
      ctx!.clearRect(0, 0, w, h);

      const colour = accent();

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];

        s.trail.push({ x: s.x, y: s.y });
        if (s.trail.length > TRAIL) s.trail.shift();

        s.x += s.dir[0] * s.speed;
        s.y += s.dir[1] * s.speed;
        s.life += 1;

        // Turning is only allowed at an intersection, which is what keeps
        // every star on the lattice no matter how erratic it looks.
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
          // snap onto the line being joined, so the corner is exact
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

        // fade in at birth and out at the end, so nothing ever pops
        const fade =
          Math.min(1, s.life / 40) * Math.min(1, (s.maxLife - s.life) / 70);

        // tail: each segment dimmer and thinner than the one ahead of it
        for (let t = 1; t < s.trail.length; t++) {
          const a = (t / s.trail.length) * 0.55 * fade;
          ctx!.beginPath();
          ctx!.strokeStyle = colour;
          ctx!.globalAlpha = a;
          ctx!.lineWidth = 0.6 + (t / s.trail.length) * 1.1;
          ctx!.lineCap = "round";
          ctx!.moveTo(s.trail[t - 1].x, s.trail[t - 1].y);
          ctx!.lineTo(s.trail[t].x, s.trail[t].y);
          ctx!.stroke();
        }

        // head: one blit of the pre-rendered glow
        ctx!.globalAlpha = 0.95 * fade;
        ctx!.drawImage(headSprite(colour), s.x - 12, s.y - 12);
      }

      ctx!.globalAlpha = 1;
      raf = requestAnimationFrame(step);
    }

    resize();
    step();

    const onResize = () => resize();
    // Stop entirely when the tab is hidden. A background rAF loop on a phone
    // is a battery cost the reader never agreed to.
    const onVisibility = () => {
      running = !document.hidden;
      if (running) {
        raf = requestAnimationFrame(step);
      } else {
        cancelAnimationFrame(raf);
      }
    };

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    // Pause once the hero has scrolled away; nobody is watching.
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
        // the same mask as the grid beneath it, so the trails dissolve toward
        // the edges instead of stopping at a hard line
        maskImage:
          "radial-gradient(ellipse 80% 60% at 50% 40%, #000 20%, transparent 75%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 80% 60% at 50% 40%, #000 20%, transparent 75%)",
      }}
    />
  );
}