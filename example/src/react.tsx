import type { CanvasEffect } from "nans-framework";
import React, { useRef, useEffect } from "react";

export function CanvasEffect<TOptions>({
  effect,
  ...options
}: { effect: CanvasEffect<TOptions> } & TOptions &
  React.HTMLAttributes<HTMLCanvasElement>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Attach the vanilla effect using your core engine
    const detach = effect.attachTo(canvas, options as TOptions);

    // Clean up on unmount or when options change
    return detach;
  }, [effect, options]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", display: "block" }}
      {...options}
    />
  );
}
