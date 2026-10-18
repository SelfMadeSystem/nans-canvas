import { createCanvasEffect } from "nans-canvas";
import { mod } from "nans-canvas/utils/mathUtils";

type Particle = { x: number; y: number; r: number };

export const scrollEffect = createCanvasEffect(
  { contextId: "2d", scrollable: true, touchAction: "pan-x pan-y" },
  ({ color }: { color: string }) => {
    const particles: Particle[] = [];
    let seeded = false;
    let scrollEvents = 0;
    let lastDelta = 0;

    return {
      draw({ ctx, scroll, scrollDelta, pointersDown, elapsedTime }) {
        const dpr = window.devicePixelRatio || 1;
        scroll = scroll.mult(dpr);
        const { width, height } = ctx.canvas;
        ctx.clearRect(0, 0, width, height);

        if (!seeded) {
          seeded = true;
          for (let i = 0; i < 80; i++)
            particles.push({
              x: Math.random() * width,
              y: Math.random() * height,
              r: 2 + Math.random() * 6,
            });
        }

        // Stateless world-anchored grid: derived directly from scroll
        const spacing = 200 * dpr;
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.fillStyle = "white";
        ctx.font = `${12 * dpr}px sans-serif`;
        ctx.lineWidth = 1;
        const firstColumn = Math.floor(scroll.x / spacing);
        for (
          let column = firstColumn;
          column * spacing - scroll.x < width;
          column++
        ) {
          const x = column * spacing - scroll.x;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
          ctx.fillText(`${column * 200}px`, x + 4, 16 * dpr);
        }
        const first = Math.floor(scroll.y / spacing);
        for (let k = first; k * spacing - scroll.y < height; k++) {
          const y = k * spacing - scroll.y;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
          ctx.fillText(`${k * 200}px`, 8, y - 4);
        }

        // Stateful particles: shifted in onScroll so they ride with the page
        ctx.fillStyle = color;
        for (const p of particles) {
          ctx.beginPath();
          ctx.arc(
            mod(p.x - scroll.x, width),
            mod(p.y - scroll.y, height),
            p.r * dpr,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }

        // Fixed-to-viewport marker that should not appear to move while scrolling
        ctx.fillStyle = "orange";
        ctx.beginPath();
        ctx.arc(
          width / 2,
          height / 2 + Math.sin(elapsedTime) * 40 * dpr,
          14 * dpr,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        ctx.fillStyle = "white";
        for (const { position: p } of pointersDown) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 14 * dpr, 0, Math.PI * 2);
          ctx.fill();
        }

        // Mark the visible viewport in canvas coordinates.
        const rect = ctx.canvas.getBoundingClientRect();
        const viewLeft = Math.max(0, -rect.left * dpr);
        const viewRight = Math.min(
          width,
          (window.innerWidth - rect.left) * dpr,
        );
        const viewTop = Math.max(0, -rect.top * dpr);
        const viewBottom = Math.min(
          height,
          (window.innerHeight - rect.top) * dpr,
        );
        ctx.strokeStyle = "red";
        ctx.fillStyle = "red";
        ctx.lineWidth = 2 * dpr;
        ctx.strokeRect(
          viewLeft + ctx.lineWidth,
          viewTop + ctx.lineWidth,
          viewRight - viewLeft - 2 * ctx.lineWidth,
          viewBottom - viewTop - 2 * ctx.lineWidth,
        );
        ctx.font = `${14 * dpr}px sans-serif`;
        ctx.fillText(
          `viewport (${(-rect.left).toFixed(0)}px left, ${(-rect.top).toFixed(0)}px up from canvas origin)`,
          viewLeft + 16 * dpr,
          viewTop + 24 * dpr,
        );

        ctx.fillStyle = "white";
        ctx.font = `${16 * dpr}px sans-serif`;
        ctx.fillText(
          `scroll: ${scroll.x.toFixed(0)}, ${scroll.y.toFixed(0)}  delta: ${scrollDelta.x.toFixed(1)}, ${scrollDelta.y.toFixed(1)}  last: ${lastDelta.toFixed(1)}  calls: ${scrollEvents}`,
          viewLeft + 16 * dpr,
          viewTop + 48 * dpr,
        );
      },
      onScroll(_scroll, delta) {
        scrollEvents++;
        lastDelta = Math.hypot(delta.x, delta.y);
        // for (const p of particles)
        //   p.y -= delta.y * (window.devicePixelRatio || 1);
      },
      cleanup() {
        particles.length = 0;
        seeded = false;
      },
    };
  },
);
