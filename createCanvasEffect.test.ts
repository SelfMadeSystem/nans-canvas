import { expect, test } from "bun:test";
import { createCanvasEffect, type CanvasSize } from "./createCanvasEffect.js";

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
    clientWidth: 100,
    clientHeight: 50,
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
      right: 100,
      bottom: 50,
      width: 100,
      height: 50,
    }),
    addEventListener: (
      type: string,
      listener: EventListenerOrEventListenerObject,
    ) => canvasListeners.set(type, listener),
    removeEventListener: (type: string) => canvasListeners.delete(type),
  } as unknown as HTMLCanvasElement;

  const sizes: CanvasSize[] = [];
  let cleanupCalls = 0;

  try {
    const effect = createCanvasEffect("2d", () => ({
      draw() {},
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
      scroll: { x: number; y: number };
      delta: { x: number; y: number };
    }[] = [];
    const scrollEvents: {
      scroll: { x: number; y: number };
      delta: { x: number; y: number };
    }[] = [];
    const scrollEffect = createCanvasEffect(
      { contextId: "2d", scrollable: true },
      () => ({
        draw({ scroll, scrollDelta }) {
          scrollFrames.push({
            scroll: { x: scroll.x, y: scroll.y },
            delta: { x: scrollDelta.x, y: scrollDelta.y },
          });
        },
        onScroll(scroll, delta) {
          scrollEvents.push({
            scroll: { x: scroll.x, y: scroll.y },
            delta: { x: delta.x, y: delta.y },
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
      scroll: { x: 80, y: 120 },
      delta: { x: 80, y: 120 },
    });
    expect(scrollEvents[0]).toEqual(scrollFrames[0]);
    expect(style.transform).toBe("translate(80px, 120px)");

    containerRect.left = -500;
    containerRect.top = -500;
    pendingFrame?.(1016);
    expect(scrollFrames[1]).toEqual({
      scroll: { x: 180, y: 140 },
      delta: { x: 100, y: 20 },
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
