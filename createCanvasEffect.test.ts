import { afterEach, beforeEach, expect, test } from "bun:test";
import {
  createCanvasEffect,
  type CanvasCoordinates,
  type CanvasSize,
  type PointerInfo,
} from "./createCanvasEffect.js";

type ScrollSnapshot = {
  scroll: ReturnType<typeof snapshotCoordinates>;
  delta: ReturnType<typeof snapshotCoordinates>;
};

const originalGlobals = new Map<string, PropertyDescriptor | undefined>();
const windowListeners = new Map<string, EventListenerOrEventListenerObject>();
const canvasListeners = new Map<string, EventListenerOrEventListenerObject>();
const pendingFrames = new Map<number, FrameRequestCallback>();
const containerRect = { left: -80, top: -120 };
const style = {
  touchAction: "pan-x",
  willChange: "auto",
  transform: "scale(1)",
};

let canvas: HTMLCanvasElement;
let rectWidth = 100;
let rectHeight = 50;
let resizeCallback: ResizeObserverCallback;
let intersectionCallback: IntersectionObserverCallback;
let frameId = 0;
let resizeObserverDisconnected = false;
let intersectionObserverDisconnected = false;

function snapshotCoordinates(coordinates: CanvasCoordinates) {
  return {
    pixels: { x: coordinates.pixels.x, y: coordinates.pixels.y },
    cssPixels: {
      x: coordinates.cssPixels.x,
      y: coordinates.cssPixels.y,
    },
  };
}

beforeEach(() => {
  for (const key of [
    "window",
    "ResizeObserver",
    "IntersectionObserver",
    "requestAnimationFrame",
    "cancelAnimationFrame",
  ]) {
    originalGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  }

  windowListeners.clear();
  canvasListeners.clear();
  pendingFrames.clear();
  containerRect.left = -80;
  containerRect.top = -120;
  rectWidth = 100;
  rectHeight = 50;
  style.touchAction = "pan-x";
  style.willChange = "auto";
  style.transform = "scale(1)";
  frameId = 0;
  resizeObserverDisconnected = false;
  intersectionObserverDisconnected = false;

  const fakeWindow = {
    devicePixelRatio: 2,
    addEventListener: (
      type: string,
      listener: EventListenerOrEventListenerObject,
    ) => windowListeners.set(type, listener),
    removeEventListener: (type: string) => windowListeners.delete(type),
  };

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
      const nextId = ++frameId;
      pendingFrames.set(nextId, callback);
      return nextId;
    },
  });
  Object.defineProperty(globalThis, "cancelAnimationFrame", {
    configurable: true,
    value: (id: number) => pendingFrames.delete(id),
  });

  const container = {
    clientWidth: 300,
    clientHeight: 200,
    getBoundingClientRect: () => containerRect,
  };
  const context = {} as CanvasRenderingContext2D;
  canvas = {
    get clientWidth() {
      return rectWidth;
    },
    get clientHeight() {
      return rectHeight;
    },
    get offsetWidth() {
      return rectWidth;
    },
    get offsetHeight() {
      return rectHeight;
    },
    offsetLeft: 20,
    offsetTop: 10,
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
});

afterEach(() => {
  for (const [key, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
  originalGlobals.clear();
});

function dispatchWindowEvent(type: string) {
  const listener = windowListeners.get(type);
  const event = new Event(type);
  if (typeof listener === "function") listener(event);
  else listener?.handleEvent(event);
}

function dispatchCanvasEvent(type: string, event: Event) {
  const listener = canvasListeners.get(type);
  if (typeof listener === "function") listener(event);
  else listener?.handleEvent(event);
}

function triggerResize(width: number, height: number) {
  rectWidth = width;
  rectHeight = height;
  resizeCallback(
    [{ contentRect: { width, height } } as ResizeObserverEntry],
    {} as ResizeObserver,
  );
}

function triggerIntersection(isIntersecting: boolean) {
  intersectionCallback(
    [{ isIntersecting } as IntersectionObserverEntry],
    {} as IntersectionObserver,
  );
}

function runFrame(now: number) {
  const frame = pendingFrames.entries().next().value;
  if (!frame) throw new Error("No animation frame is pending");
  pendingFrames.delete(frame[0]);
  frame[1](now);
}

function recordScrollFrames(
  onScroll?: (scroll: CanvasCoordinates, delta: CanvasCoordinates) => void,
) {
  const frames: ScrollSnapshot[] = [];
  const effect = createCanvasEffect(
    { contextId: "2d", scrollable: true },
    () => ({
      draw({ scroll, scrollDelta }) {
        frames.push({
          scroll: snapshotCoordinates(scroll),
          delta: snapshotCoordinates(scrollDelta),
        });
      },
      onScroll,
    }),
  );
  return { frames, effect };
}

test("sizes the backing store for device pixel ratio and reports resizes", () => {
  const sizes: CanvasSize[] = [];
  const effect = createCanvasEffect("2d", (_options: undefined) => ({
    draw() {},
    onResize(size) {
      sizes.push(size);
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

  triggerResize(120, 60);
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
});

test("reports pointer positions in backing-store and CSS pixels", () => {
  let receivedPointer: PointerInfo | undefined;
  const effect = createCanvasEffect("2d", (_options: undefined) => ({
    draw() {},
    onPointerDown(pointer) {
      receivedPointer = pointer;
    },
  }));
  const detach = effect.attachTo(canvas, undefined);

  dispatchCanvasEvent("pointerdown", {
    pointerId: 1,
    clientX: 25,
    clientY: 10,
    pointerType: "mouse",
    button: 0,
    buttons: 1,
  } as PointerEvent);

  expect(snapshotCoordinates(receivedPointer!.position)).toEqual({
    pixels: { x: 50, y: 20 },
    cssPixels: { x: 25, y: 10 },
  });
  detach();
});

test("reports two-axis scroll positions and deltas", () => {
  const events: ScrollSnapshot[] = [];
  const { frames, effect } = recordScrollFrames((scroll, delta) => {
    events.push({
      scroll: snapshotCoordinates(scroll),
      delta: snapshotCoordinates(delta),
    });
  });
  const detach = effect.attachTo(canvas, undefined);

  triggerIntersection(true);
  runFrame(1000);
  expect(frames[0]).toEqual({
    scroll: {
      pixels: { x: 160, y: 240 },
      cssPixels: { x: 80, y: 120 },
    },
    delta: {
      pixels: { x: 160, y: 240 },
      cssPixels: { x: 80, y: 120 },
    },
  });
  expect(events[0]).toEqual(frames[0]);
  expect(style.transform).toBe("translate(80px, 120px)");

  containerRect.left = -500;
  containerRect.top = -500;
  runFrame(1016);
  expect(frames[1]).toEqual({
    scroll: {
      pixels: { x: 360, y: 280 },
      cssPixels: { x: 180, y: 140 },
    },
    delta: {
      pixels: { x: 200, y: 40 },
      cssPixels: { x: 100, y: 20 },
    },
  });
  expect(events[1]).toEqual(frames[1]);

  runFrame(1032);
  expect(events).toHaveLength(2);
  detach();
});

test("updates the pinned position while offscreen and keeps deltas for re-entry", () => {
  const { frames, effect } = recordScrollFrames();
  const detach = effect.attachTo(canvas, undefined);

  triggerIntersection(true);
  runFrame(1000);
  triggerIntersection(false);

  containerRect.left = -120;
  containerRect.top = 1000;
  dispatchWindowEvent("scroll");
  expect(style.transform).toBe("translate(120px, 0px)");

  containerRect.top = -120;
  dispatchWindowEvent("scroll");
  expect(style.transform).toBe("translate(120px, 120px)");
  expect(frames).toHaveLength(1);

  triggerIntersection(true);
  runFrame(1016);
  expect(frames[1]).toEqual({
    scroll: {
      pixels: { x: 240, y: 240 },
      cssPixels: { x: 120, y: 120 },
    },
    delta: {
      pixels: { x: 80, y: 0 },
      cssPixels: { x: 40, y: 0 },
    },
  });
  detach();
});

test("detaches observers, listeners, styles, and effect resources", () => {
  let cleanupCalls = 0;
  const effect = createCanvasEffect(
    { contextId: "2d", scrollable: true },
    (_options: undefined) => ({
      draw() {},
      cleanup() {
        cleanupCalls++;
      },
    }),
  );
  const detach = effect.attachTo(canvas, undefined);

  detach();

  expect(resizeObserverDisconnected).toBe(true);
  expect(intersectionObserverDisconnected).toBe(true);
  expect(windowListeners.size).toBe(0);
  expect(canvasListeners.size).toBe(0);
  expect(style.touchAction).toBe("pan-x");
  expect(style.willChange).toBe("auto");
  expect(style.transform).toBe("scale(1)");
  expect(cleanupCalls).toBe(1);
});
