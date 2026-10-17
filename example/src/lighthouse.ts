import { createCanvasEffect } from "nans-framework";
import { Vector2 } from "nans-framework/utils/vec";

const characters = " .-:=+*#%@".split("");

const GRID_SIZE = 15;
const FROM_BOTTOM = 5;
const TEXT_SIZE = 1.2;
const DRAW_TEXT = true;
const FIRE_COLOR = false;

/** Half-angle of the beam in radians; intensity reaches 0 here. */
const BEAM_ANGLE = 0.9;
const BEAM_GAIN = 1.05;
const FALLOFF_POWER = 1.5;
/** Higher = beam follows the pointer faster. */
const AIM_RESPONSE = 20;

function calculateIntensity(
  x: number,
  y: number,
  targetAngle: number,
  maxRadius: number,
) {
  const distance = Math.hypot(x, y);
  if (distance > maxRadius) return 0;

  let angleDifference = Math.abs(Math.atan2(y, x) - targetAngle);
  if (angleDifference > Math.PI)
    angleDifference = 2 * Math.PI - angleDifference;
  if (angleDifference >= BEAM_ANGLE) return 0;

  const angleIntensity = 1 - angleDifference / BEAM_ANGLE;
  const distanceIntensity = 1 - distance / maxRadius;
  return (angleIntensity * distanceIntensity * BEAM_GAIN) ** FALLOFF_POWER;
}

/** Deterministic pseudo-random value in [-1, 1] for an integer lattice point. */
function hash3(x: number, y: number, z: number) {
  let h =
    Math.imul(x, 374761393) ^
    Math.imul(y, 668265263) ^
    Math.imul(z, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 2147483648 - 1;
}

const fade = (a: number) => a * a * (3 - 2 * a);
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

function valueNoise(x: number, y: number, z: number) {
  const xi = Math.floor(x),
    yi = Math.floor(y),
    zi = Math.floor(z);
  const u = fade(x - xi),
    v = fade(y - yi),
    w = fade(z - zi);
  return mix(
    mix(
      mix(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), u),
      mix(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), u),
      v,
    ),
    mix(
      mix(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), u),
      mix(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), u),
      v,
    ),
    w,
  );
}

/** Fractal value noise in roughly [-1, 1]; smooth in time but not wave-like. */
function noiseFunction(x: number, y: number, t: number) {
  return (
    (valueNoise(x * 4, y * 4, t * 0.6) +
      0.5 * valueNoise(x * 8 + 31, y * 8 + 17, t * 1.3)) /
    1.5
  );
}

export const lighthouse = createCanvasEffect("2d", () => {
  // Last known pointer position; kept after touch pointers lift
  let pointer: Vector2 | null = null;
  // Eased position the beam actually points at
  let aim: Vector2 | null = null;

  return {
    draw({ ctx, elapsedTime, deltaTime }) {
      const { width: cw, height: ch } = ctx.canvas;
      const gridSize = GRID_SIZE * (window.devicePixelRatio || 1);
      const fromBottomPixels = FROM_BOTTOM * gridSize;
      const center = new Vector2(cw / 2, ch - fromBottomPixels);

      ctx.clearRect(0, 0, cw, ch);

      // Sweep slowly until the user moves a pointer
      const target =
        pointer ??
        new Vector2(cw / 2 + Math.sin(elapsedTime * 0.5) * cw * 0.3, ch * 0.3);
      aim = aim
        ? aim.lerp(target, 1 - Math.exp(-AIM_RESPONSE * deltaTime))
        : target;

      const mouse = new Vector2(aim.x - center.x, center.y - aim.y).div(
        gridSize,
      );
      const mouseAngle = mouse.angle();

      const width = Math.floor(cw / gridSize);
      const height = Math.floor(ch / gridSize);
      // Original clock was in ms
      const t = elapsedTime * 1000 * 0.005;

      if (DRAW_TEXT) {
        ctx.font = `${gridSize * TEXT_SIZE}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
      }

      const effectRadius =
        height *
        (0.5 +
          0.5 * Math.min(mouse.length() / (0.9 * Math.max(width, height)), 1));

      for (let x = -Math.floor(width / 2); x <= Math.ceil(width / 2); x++) {
        for (let y = -FROM_BOTTOM; y <= height - FROM_BOTTOM; y++) {
          const base = calculateIntensity(x, y, mouseAngle, effectRadius);
          if (base === 0) continue;
          const intensity =
            base * (0.1 * noiseFunction(0.2 * x, 0.2 * y, t) + 0.95);

          if (FIRE_COLOR) {
            const i = Math.min(1, Math.max(0, intensity));
            const g = Math.floor(255 * Math.min(1, i * 1.25));
            const b = Math.floor(255 * Math.max(0, (i - 0.6) * 2.5));
            ctx.fillStyle = `rgba(255, ${g}, ${b}, ${Math.min(1, i * 1.2)})`;
          } else {
            ctx.fillStyle = `rgba(255, 255, 255, ${intensity})`;
          }

          const px = cw / 2 + x * gridSize;
          const py = ch - (y + FROM_BOTTOM) * gridSize;

          if (!DRAW_TEXT) {
            ctx.fillRect(
              px - gridSize / 2,
              py - gridSize / 2,
              gridSize,
              gridSize,
            );
            continue;
          }

          const charIndex = Math.min(
            characters.length - 1,
            Math.floor(intensity * characters.length),
          );
          ctx.fillText(characters[charIndex]!, px, py);
        }
      }
    },
    onPointerMove({ position }) {
      pointer = position;
    },
    onPointerDown({ position }) {
      pointer = position;
    },
    cleanup() {
      pointer = null;
      aim = null;
    },
  };
});
