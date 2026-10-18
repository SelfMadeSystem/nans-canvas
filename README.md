# nans-framework

A minimal framework for building distributable fancy canvas-based effects in a framework-agnostic way, colloquially known as "nans" (shenanigans, from [Shoghi Simon's Silly Shenanigans](https://shenanigans.shoghisimon.ca)).

## Objectives

- Framework-agnostic: Works with any front-end framework or vanilla JavaScript.
- Canvas-based effects: Easily create and distribute fancy visual effects.
- Minimal and lightweight: Focuses on providing the core functionality without unnecessary bloat.

## Features

- Simple canvas setup:
  - Automatically handles canvas resizing with `ResizeObserver`
  - Supports high-DPI displays via `window.devicePixelRatio`
  - Rendering loop for continuous updates
- Interactive capabilities:
  - Handle mouse, pen, and touch input through the Pointer Events API.
- Scroll-based effects:
  - Easily create effects that span the entire scrollable area of the page without making the canvas itself as tall as the content.

## Getting Started

To get started with the nans framework, follow these steps:

1. Install the framework via your package manager of choice:

```bash
bun i nans-framework
```

2. Import and use the framework in your project:

```typescript
import { createCanvasEffect } from 'nans-framework';

const effect = createCanvasEffect("2d", ({ optionA, optionB }) => ({
  draw: ({ ctx, deltaTime, elapsedTime }) => {
    // Your drawing logic here
  },
}));

export default effect;
```

3. Use the exported effect in your application:

Vanilla JavaScript example:

```typescript
import effect from './path/to/your/effect';

const canvas = document.getElementById('myCanvas') as HTMLCanvasElement;
effect.attachTo(canvas, {
  optionA: true,
  optionB: false,
});
```

React example:

```typescript
import effect from './path/to/your/effect';
import ReactNan from 'nans-framework/react';

const MyCanvasEffect: React.FC = () => {
  return <ReactNan effect={effect} optionA={true} optionB={false} />;
};

export default MyCanvasEffect;
```

Svelte example:

```html
<script lang="ts">
  import effect from './path/to/your/effect';
  import { onMount } from 'svelte';

  let canvas: HTMLCanvasElement;

  onMount(() => {
    effect.attachTo(canvas, {
      optionA: true,
      optionB: false,
    });
  });
</script>

<canvas bind:this={canvas}></canvas>
```

## Canvas Effect API

`createCanvasEffect` takes a rendering context ID (or a configuration object) and a setup callback. The setup callback receives the options passed to `attachTo` and returns a `draw` function plus any optional event handlers:

```typescript
type Options = { color: string };

const effect = createCanvasEffect("2d", ({ color }: Options) => ({
  draw({ ctx, deltaTime, elapsedTime, allPointers, pointersDown }) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 40, 40);
    // Use deltaTime and elapsedTime for time-based animation.
    // allPointers includes hover positions; pointersDown tracks active presses.
  },
  onPointerDown(pointer) {
    console.log(pointer.position.x, pointer.position.y);
  },
  cleanup() {
    // Release resources created by setup, if needed.
  },
}));
```

Supported context IDs are `"2d"`, `"webgl"`, `"webgl2"`, and `"webgpu"`. The context type in `draw` follows the selected ID. The canvas is sized for the device pixel ratio and resized with `ResizeObserver`. Its animation loop runs while the canvas intersects the viewport and pauses while it is not visible.

Pass `contextAttributes` in the configuration object to customize 2D or WebGL context creation:

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

The attributes are forwarded to `HTMLCanvasElement.getContext` and only apply when the context is first created on that canvas. WebGPU does not accept `getContext` attributes; configure its `GPUCanvasContext` using the WebGPU API instead.

The draw context provides `deltaTime` (seconds since the previous frame), `elapsedTime` (seconds since attachment), `allPointers`, and `pointersDown`. `allPointers` contains pointers currently over the canvas, including mouse or pen hover; it does not track pointers elsewhere on the page. `pointersDown` contains presses that began on the canvas and have not ended or been cancelled, including while dragged outside it. Pointer positions use canvas backing pixels with `(0, 0)` at the top-left. `onPointerMove` fires for pointers over the canvas and for active canvas-originated drags; `onPointerUp` and `onPointerCancel` only fire for presses that began on the canvas.

To enable scroll tracking, pass a configuration object. The canvas must be absolutely positioned inside a positioned container:

```typescript
const effect = createCanvasEffect(
  { contextId: "2d", scrollable: true, touchAction: "pan-y" },
  (options: Options) => ({
    draw({ ctx, scroll, scrollDelta }) {
      // scroll and scrollDelta are Vector2 values in layout pixels.
    },
    onScroll(scroll, delta) {
      // Called before draw when the canvas moves within its container.
    },
  }),
);
```

`attachTo(canvas, options)` returns a detach function. Call it when the effect is no longer needed; it stops rendering, removes listeners and observers, restores the canvas styles, and invokes `cleanup` if provided.

`touchAction` controls the CSS `touch-action` value while attached. It defaults to `"none"`; set it to a value such as `"pan-y"` or `"auto"` to allow browser touch gestures. The previous inline value is restored when detached.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
