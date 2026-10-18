import { Vector2 } from "./utils/vec";

type ContextType =
  | CanvasRenderingContext2D
  | WebGLRenderingContext
  | WebGL2RenderingContext
  | GPUCanvasContext;

interface ContextById {
  "2d": CanvasRenderingContext2D;
  webgl: WebGLRenderingContext;
  webgl2: WebGL2RenderingContext;
  webgpu: GPUCanvasContext;
}

export interface DrawContext<C extends ContextType> {
  ctx: C;
  /** Time since the previous rendered frame, in seconds. */
  deltaTime: number;
  /** Time since this effect was attached, in seconds. */
  elapsedTime: number;
  /** Active pointers, with positions in canvas pixels (origin at the top-left). */
  pointers: PointerInfo[];
  /** Scrollable mode: how far the canvas has moved down its container; zero otherwise. */
  scroll: Vector2;
  /** Scrollable mode: movement since the previous frame; zero otherwise. */
  scrollDelta: Vector2;
}

/** Configuration for creating an effect with a canvas rendering context. */
export interface CanvasEffectConfig<K extends keyof ContextById> {
  /** Canvas context to request. */
  contextId: K;
  /**
   * Keeps the canvas pinned to the viewport while scrolling, clamped to its container.
   * Requires the canvas to be `position: absolute` inside a positioned container.
   */
  scrollable?: boolean;
}

/** Pointer state reported to input callbacks and included in each draw context. */
export interface PointerInfo {
  /** Browser pointer identifier. */
  id: number;
  /** Position in canvas pixels, with the origin at the top-left. */
  position: Vector2;
  /** Pointer device type, typically `mouse`, `pen`, or `touch`. */
  type: string;
  /** Button that changed, as defined by the Pointer Events API. */
  button: number;
  /** Bitmask of currently pressed buttons. */
  buttons: number;
}

/** Draw context for a specific canvas rendering context. */
export type DrawContext2D = DrawContext<CanvasRenderingContext2D>;
/** Draw context for a WebGL canvas. */
export type DrawContextWebGL = DrawContext<WebGLRenderingContext>;
/** Draw context for a WebGL 2 canvas. */
export type DrawContextWebGL2 = DrawContext<WebGL2RenderingContext>;
/** Draw context for a WebGPU canvas. */
export type DrawContextWebGPU = DrawContext<GPUCanvasContext>;

/** An effect that can be attached to a canvas and later detached. */
export type CanvasEffect<TOptions> = {
  /**
   * Initialize the effect on `canvas` using `options`.
   * Returns a function that stops rendering, removes listeners, and runs effect cleanup.
   */
  attachTo(canvas: HTMLCanvasElement, options: TOptions): () => void;
};

type GraphicsHandler<K extends keyof ContextById> = {
  /** Draw one frame. Called while the canvas is visible. */
  draw: (context: DrawContext<ContextById[K]>) => void;
  /** Called when a pointer press begins on the canvas. */
  onPointerDown?: (pointer: PointerInfo) => void;
  /** Called when a pointer press that began on the canvas is released. */
  onPointerUp?: (pointer: PointerInfo) => void;
  /** Called when a pointer moves, including when it moves outside the canvas. */
  onPointerMove?: (pointer: PointerInfo) => void;
  /** Scrollable mode: called before draw when the canvas moves within its container. */
  onScroll?: (scroll: Vector2, delta: Vector2) => void;
  /** Called once when the effect is detached. */
  cleanup?: () => void;
};

/**
 * Create a reusable canvas effect.
 *
 * The setup callback runs once per attachment and returns drawing and optional input
 * handlers. The canvas is resized for device pixel ratio, and its draw loop pauses
 * while it is outside the viewport.
 *
 * @param config Canvas context ID, or context ID plus optional scroll behavior.
 * @param setup Creates the handlers for an attachment from its options.
 */
export function createCanvasEffect<K extends keyof ContextById, TOptions>(
  config: K | CanvasEffectConfig<K>,
  setup: (options: TOptions) => GraphicsHandler<K>,
): CanvasEffect<TOptions> {
  const { contextId, scrollable = false } =
    typeof config === "string" ? { contextId: config } : config;
  return {
    attachTo(canvas: HTMLCanvasElement, options: TOptions) {
      canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
      canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);
      const ctx = canvas.getContext(contextId) as ContextById[K];
      const effect = setup(options);

      let animationFrameId: number | undefined;
      let startTime = performance.now();
      let lastTime = startTime;

      const observer = new ResizeObserver((entries) => {
        const { width, height } = entries[entries.length - 1]!.contentRect;
        const dpr = window.devicePixelRatio || 1;
        const w = Math.round(width * dpr);
        const h = Math.round(height * dpr);
        if (canvas.width === w && canvas.height === h) return;
        // Deferred so the layout change from resizing doesn't re-trigger this callback in the same frame
        requestAnimationFrame(() => {
          canvas.width = w;
          canvas.height = h;
        });
      });
      observer.observe(canvas);

      const pointers = new Map<number, PointerInfo>();

      const toInfo = (e: PointerEvent): PointerInfo => {
        const rect = canvas.getBoundingClientRect();
        const position = new Vector2(
          (e.clientX - rect.left) * (canvas.width / rect.width),
          (e.clientY - rect.top) * (canvas.height / rect.height),
        );
        return {
          id: e.pointerId,
          position,
          type: e.pointerType,
          button: e.button,
          buttons: e.buttons,
        };
      };

      const handleDown = (e: PointerEvent) => {
        const info = toInfo(e);
        pointers.set(e.pointerId, info);
        effect.onPointerDown?.(info);
      };
      const handleMove = (e: PointerEvent) => {
        const info = toInfo(e);
        pointers.set(e.pointerId, info);
        effect.onPointerMove?.(info);
      };
      const handleUp = (e: PointerEvent) => {
        // Only report releases for presses that started on this canvas
        if (!pointers.has(e.pointerId)) return;
        const info = toInfo(e);
        if (e.pointerType !== "mouse") pointers.delete(e.pointerId);
        else pointers.set(e.pointerId, info);
        effect.onPointerUp?.(info);
      };
      const handleLeave = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") pointers.delete(e.pointerId);
      };

      // Down is scoped to the canvas so overlaid UI doesn't trigger it;
      // move/up are on window so drags continue outside the canvas.
      const prevTouchAction = canvas.style.touchAction;
      canvas.style.touchAction = "none";
      canvas.addEventListener("pointerdown", handleDown);
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleLeave);

      const prevWillChange = canvas.style.willChange;
      const prevTransform = canvas.style.transform;
      if (scrollable) canvas.style.willChange = "transform";
      let scrollY = 0;

      const updateScroll = (): number => {
        const container = (canvas.offsetParent ??
          document.documentElement) as HTMLElement;
        const containerRect = container.getBoundingClientRect();
        // offsetTop/offsetHeight ignore transforms, giving the canvas's rest position
        const restTop = canvas.offsetTop;
        const maxY = Math.max(
          0,
          container.clientHeight - (restTop + canvas.offsetHeight),
        );
        const next = Math.min(Math.max(-containerRect.top, 0), maxY);
        canvas.style.transform = `translateY(${next}px)`;
        const delta = next - scrollY;
        scrollY = next;
        return delta;
      };

      const render = (now: number) => {
        const elapsedTime = (now - startTime) / 1000;
        const deltaTime = (now - lastTime) / 1000;
        lastTime = now;

        const scrollDeltaY = scrollable ? updateScroll() : 0;
        const scroll = new Vector2(0, scrollY);
        const scrollDelta = new Vector2(0, scrollDeltaY);
        if (scrollDeltaY !== 0) effect.onScroll?.(scroll, scrollDelta);

        effect.draw({
          ctx,
          deltaTime,
          elapsedTime,
          pointers: [...pointers.values()],
          scroll,
          scrollDelta,
        });

        animationFrameId = requestAnimationFrame(render);
      };

      const visibilityObserver = new IntersectionObserver((entries) => {
        const visible = entries[entries.length - 1]!.isIntersecting;
        if (visible && animationFrameId === undefined) {
          // Skip the time spent hidden so deltaTime doesn't spike
          lastTime = performance.now();
          animationFrameId = requestAnimationFrame(render);
        } else if (!visible && animationFrameId !== undefined) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = undefined;
        }
      });
      visibilityObserver.observe(canvas);

      // Return a cleanup/detach method
      return () => {
        if (animationFrameId !== undefined)
          cancelAnimationFrame(animationFrameId);
        visibilityObserver.disconnect();
        observer.disconnect();
        canvas.removeEventListener("pointerdown", handleDown);
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleLeave);
        canvas.style.touchAction = prevTouchAction;
        canvas.style.willChange = prevWillChange;
        canvas.style.transform = prevTransform;
        effect.cleanup?.();
      };
    },
  };
}
