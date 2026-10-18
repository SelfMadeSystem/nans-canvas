import { expect, test } from "bun:test";
import {
  createCanvasEffect,
  type CanvasSize,
  type PointerInfo,
} from "./createCanvasEffect.js";

test("sizes for device pixel ratio and restores resources on detach", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousResizeObserver = Object.getOwnPropertyDescriptor(
    globalThis,
    "ResizeObserver",
  );
  const previousIntersectionObserver = Object.getOwnPropertyDescriptor(
    globalThis,
    "IntersectionObserver",
  );
  const previousRequestAnimationFrame = Object.getOwnPropertyDescriptor(
    globalThis,
    "requestAnimationFrame",
  );
  const previousCancelAnimationFrame = Object.getOwnPropertyDescriptor(
    globalThis,
    "cancelAnimationFrame",
  );

  const windowListeners = new Map<string, EventListenerOrEventListenerObject>();
  const fakeWindow = {
    devicePixelRatio: 2,
    addEventListener: (
      type: string,
      listener: EventListenerOrEventListenerObject,
    ) => windowListeners.set(type, listener),
    removeEventListener: (type: string) => windowListeners.delete(type),
  };

  let resizeCallback: ResizeObserverCallback | undefined;
  let intersectionCallback: IntersectionObserverCallback | undefined;
  let pendingFrame: FrameRequestCallback | undefined;
  let frameId = 0;
  let resizeObserverDisconnected = false;
  let intersectionObserverDisconnected = false;

  class FakeResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      resizeCallback = callback;
    }
    observe() {}
    disconnect() {
      resizeObserverDisconnected = true;
    }
  }

  class FakeIntersectionObserver {
    constructor(callback: IntersectionObserverCallback) {
      intersectionCallback = callback;
    }
    observe() {}
    disconnect() {
      intersectionObserverDisconnected = true;
    }
  }

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: fakeWindow,
  });
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    value: FakeResizeObserver,
  });
  Object.defineProperty(globalThis, "IntersectionObserver", {
    configurable: true,
    value: FakeIntersectionObserver,
  });
  Object.defineProperty(globalThis, "requestAnimationFrame", {
    configurable: true,
    value: (callback: FrameRequestCallback) => {
      pendingFrame = callback;
      return ++frameId;
    },
  });
  Object.defineProperty(globalThis, "cancelAnimationFrame", {
    configurable: true,
    value: () => {},
  });

  const canvasListeners = new Map<string, EventListenerOrEventListenerObject>();
  const containerRect = { left: -80, top: -120 };
  let rectWidth = 100;
  let rectHeight = 50;
  const container = {
    clientWidth: 300,
    clientHeight: 200,
    getBoundingClientRect: () => containerRect,
  };
  const style = {
    touchAction: "pan-x",
    willChange: "auto",
    transform: "scale(1)",
  };
  const context = {} as CanvasRenderingContext2D;
  const canvas = {
    get clientWidth() {
      return rectWidth;
    },
    get clientHeight() {
      return rectHeight;
    },
    offsetLeft: 20,
    offsetTop: 10,
    offsetWidth: 100,
    offsetHeight: 50,
    offsetParent: container,
    width: 0,
    height: 0,
    style,
    getContext: () => context,
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      right: rectWidth,
      bottom: rectHeight,
      width: rectWidth,
      height: rectHeight,
    }),
    addEventListener: (
      type: string,
      listener: EventListenerOrEventListenerObject,
    ) => canvasListeners.set(type, listener),
    removeEventListener: (type: string) => canvasListeners.delete(type),
  } as unknown as HTMLCanvasElement;

  const sizes: CanvasSize[] = [];
  let cleanupCalls = 0;
  let downPointer: PointerInfo | undefined;

  try {
    const effect = createCanvasEffect("2d", () => ({
      draw() {},
      onPointerDown(pointer) {
        downPointer = pointer;
      },
      onResize(size) {
        sizes.push(size);
      },
      cleanup() {
        cleanupCalls++;
      },
    }));

    const detach = effect.attachTo(canvas, undefined);

    expect(canvas.width).toBe(200);
    expect(canvas.height).toBe(100);
    expect(sizes[0]).toEqual({
      width: 200,
      height: 100,
      cssWidth: 100,
      cssHeight: 50,
      pixelRatio: 2,
    });

    const pointerDown = canvasListeners.get("pointerdown") as (
      event: PointerEvent,
    ) => void;
    pointerDown({
      pointerId: 1,
      clientX: 25,
      clientY: 10,
      pointerType: "mouse",
      button: 0,
      buttons: 1,
    } as PointerEvent);
    expect(downPointer?.position.pixels.x).toBe(50);
    expect(downPointer?.position.pixels.y).toBe(20);
    expect(downPointer?.position.cssPixels.x).toBe(25);
    expect(downPointer?.position.cssPixels.y).toBe(10);

    rectWidth = 120;
    rectHeight = 60;
    resizeCallback?.(
      [
        {
          contentRect: { width: 120, height: 60 },
        } as ResizeObserverEntry,
      ],
      {} as ResizeObserver,
    );
    expect(canvas.width).toBe(240);
    expect(canvas.height).toBe(120);
    expect(sizes[1]).toEqual({
      width: 240,
      height: 120,
      cssWidth: 120,
      cssHeight: 60,
      pixelRatio: 2,
    });

    detach();

    expect(resizeObserverDisconnected).toBe(true);
    expect(intersectionObserverDisconnected).toBe(true);
    expect(windowListeners.size).toBe(0);
    expect(canvasListeners.size).toBe(0);
    expect(style.touchAction).toBe("pan-x");
    expect(style.willChange).toBe("auto");
    expect(style.transform).toBe("scale(1)");
    expect(cleanupCalls).toBe(1);

    const scrollFrames: {
      scroll: {
        pixels: { x: number; y: number };
        cssPixels: { x: number; y: number };
      };
      delta: {
        pixels: { x: number; y: number };
        cssPixels: { x: number; y: number };
      };
    }[] = [];
    const scrollEvents: {
      scroll: {
        pixels: { x: number; y: number };
        cssPixels: { x: number; y: number };
      };
      delta: {
        pixels: { x: number; y: number };
        cssPixels: { x: number; y: number };
      };
    }[] = [];
    const scrollEffect = createCanvasEffect(
      { contextId: "2d", scrollable: true },
      () => ({
        draw({ scroll, scrollDelta }) {
          scrollFrames.push({
            scroll: {
              pixels: { x: scroll.pixels.x, y: scroll.pixels.y },
              cssPixels: {
                x: scroll.cssPixels.x,
                y: scroll.cssPixels.y,
              },
            },
            delta: {
              pixels: { x: scrollDelta.pixels.x, y: scrollDelta.pixels.y },
              cssPixels: {
                x: scrollDelta.cssPixels.x,
                y: scrollDelta.cssPixels.y,
              },
            },
          });
        },
        onScroll(scroll, delta) {
          scrollEvents.push({
            scroll: {
              pixels: { x: scroll.pixels.x, y: scroll.pixels.y },
              cssPixels: { x: scroll.cssPixels.x, y: scroll.cssPixels.y },
            },
            delta: {
              pixels: { x: delta.pixels.x, y: delta.pixels.y },
              cssPixels: { x: delta.cssPixels.x, y: delta.cssPixels.y },
            },
          });
        },
      }),
    );
    const detachScroll = scrollEffect.attachTo(canvas, undefined);

    intersectionCallback?.(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    pendingFrame?.(1000);
    expect(scrollFrames[0]).toEqual({
      scroll: {
        pixels: { x: 160, y: 240 },
        cssPixels: { x: 80, y: 120 },
      },
      delta: {
        pixels: { x: 160, y: 240 },
        cssPixels: { x: 80, y: 120 },
      },
    });
    expect(scrollEvents[0]).toEqual(scrollFrames[0]);
    expect(style.transform).toBe("translate(80px, 120px)");

    containerRect.left = -500;
    containerRect.top = -500;
    pendingFrame?.(1016);
    expect(scrollFrames[1]).toEqual({
      scroll: {
        pixels: { x: 360, y: 280 },
        cssPixels: { x: 180, y: 140 },
      },
      delta: {
        pixels: { x: 200, y: 40 },
        cssPixels: { x: 100, y: 20 },
      },
    });
    expect(scrollEvents[1]).toEqual(scrollFrames[1]);
    expect(style.transform).toBe("translate(180px, 140px)");

    pendingFrame?.(1032);
    expect(scrollEvents).toHaveLength(2);

    detachScroll();
  } finally {
    const restore = (
      key: string,
      descriptor: PropertyDescriptor | undefined,
    ) => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    };
    restore("window", previousWindow);
    restore("ResizeObserver", previousResizeObserver);
    restore("IntersectionObserver", previousIntersectionObserver);
    restore("requestAnimationFrame", previousRequestAnimationFrame);
    restore("cancelAnimationFrame", previousCancelAnimationFrame);
  }
});
