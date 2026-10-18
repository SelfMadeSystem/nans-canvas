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
        const scrollPixels = scroll.pixels;
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
        const spacing = 200;
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.fillStyle = "white";
        ctx.font = `${12}px sans-serif`;
        ctx.lineWidth = 1;
        const firstColumn = Math.floor(scrollPixels.x / spacing);
        for (
          let column = firstColumn;
          column * spacing - scrollPixels.x < width;
          column++
        ) {
          const x = column * spacing - scrollPixels.x;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
          ctx.fillText(`${column * 200}px`, x + 4, 16);
        }
        const first = Math.floor(scrollPixels.y / spacing);
        for (let k = first; k * spacing - scrollPixels.y < height; k++) {
          const y = k * spacing - scrollPixels.y;
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
            mod(p.x - scrollPixels.x, width),
            mod(p.y - scrollPixels.y, height),
            p.r,
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
          height / 2 + Math.sin(elapsedTime) * 40,
          14,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        ctx.fillStyle = "white";
        for (const {
          position: { pixels: p },
        } of pointersDown) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
          ctx.fill();
        }

        // Mark the visible viewport in canvas coordinates.
        const rect = ctx.canvas.getBoundingClientRect();
        const scaleX = width / rect.width;
        const scaleY = height / rect.height;
        const viewLeft = Math.max(0, -rect.left * scaleX);
        const viewRight = Math.min(
          width,
          (window.innerWidth - rect.left) * scaleX,
        );
        const viewTop = Math.max(0, -rect.top * scaleY);
        const viewBottom = Math.min(
          height,
          (window.innerHeight - rect.top) * scaleY,
        );
        ctx.strokeStyle = "red";
        ctx.fillStyle = "red";
        ctx.lineWidth = 2;
        ctx.strokeRect(
          viewLeft + ctx.lineWidth,
          viewTop + ctx.lineWidth,
          viewRight - viewLeft - 2 * ctx.lineWidth,
          viewBottom - viewTop - 2 * ctx.lineWidth,
        );
        ctx.font = `${14}px sans-serif`;
        ctx.fillText(
          `viewport (${(-rect.left).toFixed(0)}px left, ${(-rect.top).toFixed(0)}px up from canvas origin)`,
          viewLeft + 16,
          viewTop + 24,
        );

        ctx.fillStyle = "white";
        ctx.font = `${16}px sans-serif`;
        ctx.fillText(
          `scroll CSS: ${scroll.cssPixels.x.toFixed(0)}, ${scroll.cssPixels.y.toFixed(0)}  delta CSS: ${scrollDelta.cssPixels.x.toFixed(1)}, ${scrollDelta.cssPixels.y.toFixed(1)}  last: ${lastDelta.toFixed(1)}  calls: ${scrollEvents}`,
          viewLeft + 16,
          viewTop + 48,
        );
      },
      onScroll(_scroll, delta) {
        scrollEvents++;
        lastDelta = Math.hypot(delta.cssPixels.x, delta.cssPixels.y);
      },
      cleanup() {
        particles.length = 0;
        seeded = false;
      },
    };
  },
);
