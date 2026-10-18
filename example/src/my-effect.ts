import { createCanvasEffect } from "nans-framework";

type Ripple = { x: number; y: number; age: number; color: string };

export const myEffect = createCanvasEffect(
  "2d",
  ({ color }: { color: string }) => {
    const ripples: Ripple[] = [];
    const trail: { x: number; y: number; age: number }[] = [];
    let releases = 0;

    return {
      draw({ ctx, deltaTime, elapsedTime, allPointers, pointersDown }) {
        const { width, height } = ctx.canvas;
        ctx.clearRect(0, 0, width, height);

        // Orbiting dot exercises elapsedTime
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(
          width / 2 + Math.cos(elapsedTime) * 80,
          height / 2 + Math.sin(elapsedTime) * 80,
          10,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        // Fading ripples from down/up events
        for (let i = ripples.length - 1; i >= 0; i--) {
          const r = ripples[i]!;
          r.age += deltaTime;
          if (r.age > 1) {
            ripples.splice(i, 1);
            continue;
          }
          ctx.strokeStyle = r.color;
          ctx.globalAlpha = 1 - r.age;
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.age * 120, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Fading trail from move events
        for (let i = trail.length - 1; i >= 0; i--) {
          const t = trail[i]!;
          t.age += deltaTime;
          if (t.age > 0.5) {
            trail.splice(i, 1);
            continue;
          }
          ctx.fillStyle = color;
          ctx.globalAlpha = 1 - t.age * 2;
          ctx.fillRect(t.x - 2, t.y - 2, 4, 4);
        }
        ctx.globalAlpha = 1;

        // Live pointers, joined by a line for multi-touch
        ctx.strokeStyle = "white";
        ctx.fillStyle = "white";
        ctx.lineWidth = 2;
        ctx.beginPath();
        allPointers.forEach(({ position: p }, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        for (const { position: p } of pointersDown) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.font = "16px sans-serif";
        ctx.fillText(
          `pointers: ${allPointers.length}  down: ${pointersDown.length}  releases: ${releases}  t: ${elapsedTime.toFixed(1)}s`,
          10,
          24,
        );
      },
      onPointerDown({ position }) {
        ripples.push({ x: position.x, y: position.y, age: 0, color: "lime" });
      },
      onPointerUp({ position }) {
        releases++;
        ripples.push({ x: position.x, y: position.y, age: 0, color: "red" });
      },
      onPointerMove({ position }) {
        trail.push({ x: position.x, y: position.y, age: 0 });
      },
      cleanup() {
        ripples.length = 0;
        trail.length = 0;
      },
    };
  },
);
