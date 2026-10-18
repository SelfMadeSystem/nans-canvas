import { useEffect, useRef } from "react";
import type { ComponentPropsWithoutRef, RefObject } from "react";
import type { CanvasEffect as CanvasEffectInstance } from "./createCanvasEffect.js";

type OptionsProp<TOptions> = undefined extends TOptions
  ? { options?: TOptions }
  : { options: TOptions };

export type CanvasEffectProps<TOptions> = {
  effect: CanvasEffectInstance<TOptions>;
} & OptionsProp<TOptions> &
  ComponentPropsWithoutRef<"canvas">;

/**
 * Attach a canvas effect to a canvas ref. A changed effect or options identity
 * detaches the previous instance and attaches a new one.
 */
export function useCanvasEffect<TOptions>(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  effect: CanvasEffectInstance<TOptions>,
  options: TOptions,
): void {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return effect.attachTo(canvas, options);
  }, [canvasRef, effect, options]);
}

/** Render a canvas and attach an effect to it. */
export function CanvasEffect<TOptions>(props: CanvasEffectProps<TOptions>) {
  const { effect, options, style, ...canvasProps } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useCanvasEffect(canvasRef, effect, options as TOptions);

  return (
    <canvas
      {...canvasProps}
      ref={canvasRef}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        ...style,
      }}
    />
  );
}