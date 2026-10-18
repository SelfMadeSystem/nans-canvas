# Nans Canvas

A minimal, framework-agnostic library for building and sharing canvas effects, colloquially known as "nans" (shenanigans, from [Shoghi Simon's Silly Shenanigans](https://shenanigans.shoghisimon.ca)).

It handles canvas sizing, animation timing, visibility, and pointer input while leaving the effect itself in your hands.

## Features

- 2D, WebGL, and WebGL 2 rendering contexts
- High-DPI sizing and responsive resizing with `ResizeObserver`
- Animation pauses while the canvas is outside the viewport
- Mouse, pen, and touch input through Pointer Events
- Optional horizontal and vertical scroll tracking
- Framework-agnostic core, with an optional React adapter

## Installation

```bash
npm install nans-canvas
# or
bun add nans-canvas
```

## Quick Start

Create an effect by selecting a rendering context and returning a `draw` handler. Pass effect options when attaching it to a canvas:

```typescript
import { createCanvasEffect } from "nans-canvas";

type Options = { color: string };

const effect = createCanvasEffect("2d", ({ color }: Options) => ({
  draw({ ctx, elapsedTime }) {
    const { width, height } = ctx.canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 20 + Math.sin(elapsedTime) * 8, 0, Math.PI * 2);
    ctx.fill();
  },
}));

const canvas = document.querySelector<HTMLCanvasElement>("#canvas");
if (!canvas) throw new Error("Canvas element not found");

const detach = effect.attachTo(canvas, { color: "deepskyblue" });
```

Call `detach()` when the effect is no longer needed. See [Lifecycle](#lifecycle) for cleanup details.

## Core API

`createCanvasEffect` accepts a context ID (or configuration object) and a setup callback. Setup runs once per attachment with the options passed to `attachTo` and the selected rendering context. It returns a `draw` handler and any optional input, resize, scroll, or cleanup handlers.

### Contexts and sizing

Supported context IDs are `"2d"`, `"webgl"`, and `"webgl2"`. The context type in `draw` follows the selected ID. The canvas backing store is sized for `window.devicePixelRatio` and resized with `ResizeObserver`.

Pass `contextAttributes` to customize the initial context creation:

```typescript
const effect = createCanvasEffect(
  { contextId: "2d", contextAttributes: { alpha: false, desynchronized: true } },
  setup,
);

const webglEffect = createCanvasEffect(
  { contextId: "webgl", contextAttributes: { alpha: false, antialias: false } },
  setupWebGL,
);
```

These attributes are forwarded to `HTMLCanvasElement.getContext` and only apply when the context is first created on that canvas.

`onResize` runs after initial sizing and whenever the backing store changes. Its `CanvasSize` value includes backing-store `width` and `height`, CSS `cssWidth` and `cssHeight`, and `pixelRatio`. For WebGL, update the viewport in this callback, for example `gl.viewport(0, 0, width, height)`.

### WebGL context recovery

Browsers can lose a WebGL context temporarily. The library prevents the `webglcontextlost` event's default action so the browser can restore it, and pauses drawing while the context is lost. Provide `onContextLost` for notification and `onContextRestored` to recreate invalid GPU resources. After that callback returns, `onResize` runs again so the viewport can be reset; drawing resumes if the canvas is visible.

```typescript
const effect = createCanvasEffect("webgl2", (_options: undefined, gl) => {
  let program = createProgram(gl);

  return {
    onContextLost() {
      // The library already calls preventDefault() on the event.
    },
    onContextRestored(restoredGl) {
      program = createProgram(restoredGl);
    },
    draw() {
      gl.useProgram(program);
    },
  };
});
```

### Drawing and input

The draw context provides `deltaTime` in seconds since the previous frame and `elapsedTime` in seconds since attachment. Its `allPointers` array contains pointers currently over the canvas, including mouse and pen hover; `pointersDown` contains presses that began on the canvas and have not ended or been cancelled. Both arrays contain `PointerInfo` values whose `position` has `pixels` (canvas backing-store coordinates) and `cssPixels` (CSS coordinates relative to the canvas's top-left).

`onPointerMove` fires for pointers over the canvas and active drags that began on it. `onPointerUp` and `onPointerCancel` only fire for presses that began on the canvas. For example:

```typescript
const effect = createCanvasEffect("2d", (_options: undefined) => ({
  draw({ ctx }) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  },
  onPointerDown(pointer) {
    console.log(pointer.position.pixels, pointer.position.cssPixels);
  },
}));
```

The draw loop runs while the canvas intersects the viewport and pauses while it is not visible.

### Scroll tracking

Set `scrollable: true` to pin the canvas within its positioned container as the page scrolls. The canvas must be absolutely positioned inside that container. `scroll` and `scrollDelta` are `CanvasCoordinates` values: `pixels` are backing-store units for drawing, and `cssPixels` are layout units. Both horizontal and vertical movement are tracked.

```typescript
const effect = createCanvasEffect(
  { contextId: "2d", scrollable: true, touchAction: "pan-y" },
  (_options: undefined) => ({
    draw({ ctx, scroll, scrollDelta }) {
      // Use scroll.pixels for drawing and scroll.cssPixels for layout values.
      // scrollDelta exposes movement in both coordinate spaces.
    },
    onScroll(scroll, delta) {
      // Called before draw when either axis changes.
    },
  }),
);
```

`touchAction` sets the canvas CSS `touch-action` value while attached. It defaults to `"none"`; use a value such as `"pan-y"` or `"auto"` to allow browser touch gestures. The previous inline value is restored on detach.

### Lifecycle

`attachTo(canvas, options)` returns a detach function. Calling it stops rendering, removes event listeners and observers, restores the canvas styles, and invokes `cleanup` if provided. Use `cleanup` to release resources created during setup, such as WebGL programs:

```typescript
const effect = createCanvasEffect("2d", (_options: undefined) => ({
  draw() {},
  cleanup() {
    // Release resources created by setup.
  },
}));
```

## React

Import the optional adapter from `nans-canvas/react`. React is an optional peer dependency, so projects that only import `nans-canvas` do not need React installed.

```tsx
import { useMemo } from "react";
import { CanvasEffect } from "nans-canvas/react";
import { myEffect } from "./my-effect";

function EffectCanvas({ color }: { color: string }) {
  const options = useMemo(() => ({ color }), [color]);

  return (
    <CanvasEffect
      effect={myEffect}
      options={options}
      aria-label="Animated canvas effect"
      style={{ width: "100%", height: 320 }}
    />
  );
}
```

`CanvasEffect` renders a canvas, accepts standard canvas props, and attaches the effect in an effect hook. Its default style is `display: block` with `width` and `height` set to `100%`; supplied styles override those defaults. The `options` prop is passed only to the canvas effect, not to the DOM element. Changing the `effect` or `options` reference detaches and reattaches the effect, so keep `options` stable with `useMemo` when its values have not changed.

For custom canvas markup, `useCanvasEffect(canvasRef, effect, options)` attaches the effect to the canvas referenced by `canvasRef` and cleans it up when the component unmounts or dependencies change.

## License

MIT. See [LICENSE](LICENSE) for details.
