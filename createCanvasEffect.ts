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
  deltaTime: number;
  elapsedTime: number;
  /** Active pointers, in canvas pixel coordinates (0,0 = top-left) */
  pointers: Vector2[];
}

export interface PointerInfo {
  id: number;
  position: Vector2;
  type: string;
  button: number;
}

export type DrawContext2D = DrawContext<CanvasRenderingContext2D>;
export type DrawContextWebGL = DrawContext<WebGLRenderingContext>;
export type DrawContextWebGL2 = DrawContext<WebGL2RenderingContext>;
export type DrawContextWebGPU = DrawContext<GPUCanvasContext>;

export type CanvasEffect<TOptions> = {
  attachTo(canvas: HTMLCanvasElement, options: TOptions): () => void;
};

type GraphicsHandler<K extends keyof ContextById> = {
  draw: (context: DrawContext<ContextById[K]>) => void;
  onPointerDown?: (pointer: PointerInfo) => void;
  onPointerUp?: (pointer: PointerInfo) => void;
  onPointerMove?: (pointer: PointerInfo) => void;
  cleanup?: () => void;
};

export function createCanvasEffect<K extends keyof ContextById, TOptions>(
  contextId: K,
  setup: (options: TOptions) => GraphicsHandler<K>,
): CanvasEffect<TOptions> {
  return {
    attachTo(canvas: HTMLCanvasElement, options: TOptions) {
      canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
      canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);
      const ctx = canvas.getContext(contextId) as ContextById[K];
      const effect = setup(options);

      let animationFrameId: number;
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

      const render = (now: number) => {
        const elapsedTime = (now - startTime) / 1000;
        const deltaTime = (now - lastTime) / 1000;
        lastTime = now;

        effect.draw({
          ctx,
          deltaTime,
          elapsedTime,
          pointers: [...pointers.values()].map((p) => p.position),
        });

        animationFrameId = requestAnimationFrame(render);
      };

      animationFrameId = requestAnimationFrame(render);

      // Return a cleanup/detach method
      return () => {
        cancelAnimationFrame(animationFrameId);
        observer.disconnect();
        canvas.removeEventListener("pointerdown", handleDown);
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleLeave);
        canvas.style.touchAction = prevTouchAction;
        effect.cleanup?.();
      };
    },
  };
}
