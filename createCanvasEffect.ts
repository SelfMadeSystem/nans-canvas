import { Vector2 } from "./utils/vec.js";

type ContextType =
  | CanvasRenderingContext2D
  | WebGLRenderingContext
  | WebGL2RenderingContext;

interface ContextById {
  "2d": CanvasRenderingContext2D;
  webgl: WebGLRenderingContext;
  webgl2: WebGL2RenderingContext;
}

type ContextAttributesById = {
  "2d": CanvasRenderingContext2DSettings;
  webgl: WebGLContextAttributes;
  webgl2: WebGLContextAttributes;
};

export interface DrawContext<C extends ContextType> {
  ctx: C;
  /** Time since the previous rendered frame, in seconds. */
  deltaTime: number;
  /** Time since this effect was attached, in seconds. */
  elapsedTime: number;
  /** Pointers currently over the canvas, including hover-capable devices. */
  allPointers: PointerInfo[];
  /** Presses that began on this canvas and have not ended; positions may be outside the canvas. */
  pointersDown: PointerInfo[];
  /** Scrollable mode: how far the canvas has moved within its container; zero otherwise. */
  scroll: Vector2;
  /** Scrollable mode: movement since the previous frame on each axis; zero otherwise. */
  scrollDelta: Vector2;
}

/** Canvas CSS and backing-store dimensions after sizing for device pixel ratio. */
export interface CanvasSize {
  /** Backing-store width in pixels. */
  readonly width: number;
  /** Backing-store height in pixels. */
  readonly height: number;
  /** CSS content width in pixels. */
  readonly cssWidth: number;
  /** CSS content height in pixels. */
  readonly cssHeight: number;
  /** Device pixel ratio used to calculate the backing-store dimensions. */
  readonly pixelRatio: number;
}

/** Configuration for creating an effect with a canvas rendering context. */
export interface CanvasEffectConfig<K extends keyof ContextById> {
  /** Canvas context to request. */
  contextId: K;
  /** Options passed to `getContext`. */
  contextAttributes?: ContextAttributesById[K];
  /**
   * Keeps the canvas pinned to the viewport while scrolling, clamped to its container.
   * Requires the canvas to be `position: absolute` inside a positioned container.
   */
  scrollable?: boolean;
  /** CSS touch-action value applied while attached. Defaults to `none`. */
  touchAction?: string;
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

/** An effect that can be attached to a canvas and later detached. */
export type CanvasEffect<TOptions> = {
  /**
   * Initialize the effect on `canvas` using `options`.
   * Returns a function that stops rendering, removes listeners, and runs effect cleanup.
   */
  attachTo(canvas: HTMLCanvasElement, options: TOptions): () => void;
};

export type GraphicsHandler<K extends keyof ContextById> = {
  /** Draw one frame. Called while the canvas is visible. */
  draw: (context: DrawContext<ContextById[K]>) => void;
  /** Called when a pointer press begins on the canvas. */
  onPointerDown?: (pointer: PointerInfo) => void;
  /** Called when a pointer press that began on the canvas is released. */
  onPointerUp?: (pointer: PointerInfo) => void;
  /** Called when a pointer press that began on the canvas is cancelled. */
  onPointerCancel?: (pointer: PointerInfo) => void;
  /** Called for pointers over the canvas and active presses dragged outside it. */
  onPointerMove?: (pointer: PointerInfo) => void;
  /** Called after initial sizing and after the canvas backing store changes. */
  onResize?: (size: CanvasSize) => void;
  /** Scrollable mode: called before draw when the canvas moves within its container. */
  onScroll?: (scroll: Vector2, delta: Vector2) => void;
  /** Called once when the effect is detached. */
  cleanup?: () => void;
};

/**
 * Create a reusable canvas effect.
 *
 * The setup callback runs once per attachment, receives the selected rendering context,
 * and returns drawing and optional input handlers. The canvas is resized for device
 * pixel ratio, and its draw loop pauses while it is outside the viewport.
 *
 * @param config Canvas context ID, or context ID plus optional scroll behavior.
 * @param setup Creates the handlers from the options and rendering context.
 */
export function createCanvasEffect<K extends keyof ContextById, TOptions>(
  config: K | CanvasEffectConfig<K>,
  setup: (options: TOptions, ctx: ContextById[K]) => GraphicsHandler<K>,
): CanvasEffect<TOptions> {
  const {
    contextId,
    contextAttributes,
    scrollable = false,
    touchAction = "none",
  } = typeof config === "string" ? { contextId: config } : config;
  return {
    attachTo(canvas: HTMLCanvasElement, options: TOptions) {
      let cssWidth = canvas.clientWidth;
      let cssHeight = canvas.clientHeight;
      let pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.round(cssWidth * pixelRatio);
      canvas.height = Math.round(cssHeight * pixelRatio);
      const ctx = canvas.getContext(
        contextId,
        contextAttributes as ContextAttributesById[K],
      ) as ContextById[K];
      if (!ctx) throw new Error(`Unable to create ${contextId} canvas context`);
      const effect = setup(options, ctx);
      let canvasSize: CanvasSize = {
        width: canvas.width,
        height: canvas.height,
        cssWidth,
        cssHeight,
        pixelRatio,
      };
      effect.onResize?.(canvasSize);

      const resizeCanvas = (nextCssWidth: number, nextCssHeight: number) => {
        const nextPixelRatio = window.devicePixelRatio || 1;
        const width = Math.round(nextCssWidth * nextPixelRatio);
        const height = Math.round(nextCssHeight * nextPixelRatio);
        if (
          canvasSize.width === width &&
          canvasSize.height === height &&
          canvasSize.cssWidth === nextCssWidth &&
          canvasSize.cssHeight === nextCssHeight &&
          canvasSize.pixelRatio === nextPixelRatio
        )
          return;

        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;
        canvasSize = {
          width,
          height,
          cssWidth: nextCssWidth,
          cssHeight: nextCssHeight,
          pixelRatio: nextPixelRatio,
        };
        effect.onResize?.(canvasSize);
      };

      let animationFrameId: number | undefined;
      let startTime = performance.now();
      let lastTime = startTime;

      const handleResize = (width: number, height: number) => {
        resizeCanvas(width, height);
        if (animationFrameId !== undefined) drawFrame(performance.now());
      };

      const observer = new ResizeObserver((entries) => {
        const { width, height } = entries[entries.length - 1]!.contentRect;
        cssWidth = width;
        cssHeight = height;
        handleResize(width, height);
      });
      observer.observe(canvas);
      const handleWindowResize = () => handleResize(cssWidth, cssHeight);
      window.addEventListener("resize", handleWindowResize);

      const allPointers = new Map<number, PointerInfo>();
      const pointersDown = new Map<number, PointerInfo>();

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

      const isOverCanvas = (e: PointerEvent): boolean => {
        const rect = canvas.getBoundingClientRect();
        return (
          e.composedPath().includes(canvas) &&
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        );
      };

      const handleEnter = (e: PointerEvent) => {
        allPointers.set(e.pointerId, toInfo(e));
      };
      const handleDown = (e: PointerEvent) => {
        const info = toInfo(e);
        allPointers.set(e.pointerId, info);
        pointersDown.set(e.pointerId, info);
        effect.onPointerDown?.(info);
      };
      const handleMove = (e: PointerEvent) => {
        const info = toInfo(e);
        const overCanvas = isOverCanvas(e);
        if (overCanvas) allPointers.set(e.pointerId, info);
        else allPointers.delete(e.pointerId);

        const pressedOnCanvas = pointersDown.has(e.pointerId);
        if (pressedOnCanvas) pointersDown.set(e.pointerId, info);
        if (overCanvas || pressedOnCanvas) effect.onPointerMove?.(info);
      };
      const handleUp = (e: PointerEvent) => {
        if (!pointersDown.has(e.pointerId)) return;
        const info = toInfo(e);
        pointersDown.delete(e.pointerId);
        if (e.pointerType !== "touch" && isOverCanvas(e))
          allPointers.set(e.pointerId, info);
        else allPointers.delete(e.pointerId);
        effect.onPointerUp?.(info);
      };
      const handleCancel = (e: PointerEvent) => {
        if (!pointersDown.has(e.pointerId)) return;
        const info = toInfo(e);
        pointersDown.delete(e.pointerId);
        if (e.pointerType !== "touch" && isOverCanvas(e))
          allPointers.set(e.pointerId, info);
        else allPointers.delete(e.pointerId);
        effect.onPointerCancel?.(info);
      };
      const handleLeave = (e: PointerEvent) => {
        allPointers.delete(e.pointerId);
      };

      // Down is scoped to the canvas so overlaid UI doesn't trigger it;
      // move/up are on window so drags continue outside the canvas.
      const prevTouchAction = canvas.style.touchAction;
      canvas.style.touchAction = touchAction;
      canvas.addEventListener("pointerenter", handleEnter);
      canvas.addEventListener("pointerleave", handleLeave);
      canvas.addEventListener("pointerdown", handleDown);
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleCancel);

      const prevWillChange = canvas.style.willChange;
      const prevTransform = canvas.style.transform;
      if (scrollable) canvas.style.willChange = "transform";
      let scrollX = 0;
      let scrollY = 0;

      const updateScroll = (): Vector2 => {
        const container = (canvas.offsetParent ??
          document.documentElement) as HTMLElement;
        const containerRect = container.getBoundingClientRect();
        // offsetTop/offsetHeight ignore transforms, giving the canvas's rest position
        const restLeft = canvas.offsetLeft;
        const maxX = Math.max(
          0,
          container.clientWidth - (restLeft + canvas.offsetWidth),
        );
        const nextX = Math.min(Math.max(-containerRect.left, 0), maxX);
        const restTop = canvas.offsetTop;
        const maxY = Math.max(
          0,
          container.clientHeight - (restTop + canvas.offsetHeight),
        );
        const nextY = Math.min(Math.max(-containerRect.top, 0), maxY);
        canvas.style.transform = `translate(${nextX}px, ${nextY}px)`;
        const delta = new Vector2(nextX - scrollX, nextY - scrollY);
        scrollX = nextX;
        scrollY = nextY;
        return delta;
      };

      const drawFrame = (now: number) => {
        const elapsedTime = (now - startTime) / 1000;
        const deltaTime = (now - lastTime) / 1000;
        lastTime = now;

        const scrollDelta = scrollable ? updateScroll() : new Vector2(0, 0);
        const scroll = new Vector2(scrollX, scrollY);
        if (scrollDelta.x !== 0 || scrollDelta.y !== 0)
          effect.onScroll?.(scroll, scrollDelta);

        effect.draw({
          ctx,
          deltaTime,
          elapsedTime,
          allPointers: [...allPointers.values()],
          pointersDown: [...pointersDown.values()],
          scroll,
          scrollDelta,
        });
      };

      const render = (now: number) => {
        drawFrame(now);
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
        window.removeEventListener("resize", handleWindowResize);
        canvas.removeEventListener("pointerenter", handleEnter);
        canvas.removeEventListener("pointerleave", handleLeave);
        canvas.removeEventListener("pointerdown", handleDown);
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleCancel);
        canvas.style.touchAction = prevTouchAction;
        canvas.style.willChange = prevWillChange;
        canvas.style.transform = prevTransform;
        effect.cleanup?.();
      };
    },
  };
}
