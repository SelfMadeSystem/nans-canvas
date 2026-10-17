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
  - Easily handle user input and interactions with the canvas.
  - Supports mouse, touch, pointer, and keyboard interactions.
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

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
