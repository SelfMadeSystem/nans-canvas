import "./index.css";

import { CanvasEffect } from "./react";
import { myEffect } from "./my-effect";
import { lighthouse } from "./lighthouse";
import { scrollEffect } from "./scroll-effect";
import { webglEffect } from "./webgl-effect";

export function App() {
  return (
    <div className="max-w-7xl mx-auto p-8 text-center relative z-10">
      {/* <CanvasEffect
        effect={lighthouse}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: -1,
        }}
      /> */}
      <CanvasEffect
        effect={myEffect}
        color="deepskyblue"
        style={{ width: "100%", height: 400, display: "block" }}
      />
      <CanvasEffect
        effect={webglEffect}
        style={{ width: "100%", height: 320, display: "block" }}
      />
      <div
        className="mt-8"
        style={{
          position: "relative",
          overflow: "hidden",
          width: "240vw",
          height: "120vh",
          background: "#111",
        }}
      >
        <CanvasEffect
          effect={scrollEffect}
          color="deepskyblue"
          style={{
            position: "absolute",
            width: "120vw",
            height: "120vh",
            top: "-10vh",
            left: "-10vw",
            display: "block",
          }}
        />
      </div>
      <div
        className="mt-8"
        style={{
          position: "relative",
          overflow: "hidden",
          height: "450vh",
          background: "#111",
        }}
      >
        <CanvasEffect
          effect={scrollEffect}
          color="deepskyblue"
          style={{
            position: "absolute",
            width: "100%",
            height: "120vh",
            top: "-10vh",
            display: "block",
          }}
        />
      </div>
      <div className="mt-8">
        Dolor sint cupidatat ut labore laboris. Exercitation incididunt ea ipsum
        cillum. Sit do duis aliquip elit consectetur laboris irure.
      </div>
      <div className="mt-8">
        Dolor sint cupidatat ut labore laboris. Exercitation incididunt ea ipsum
        cillum. Sit do duis aliquip elit consectetur laboris irure.
      </div>
      <div className="mt-8">
        Dolor sint cupidatat ut labore laboris. Exercitation incididunt ea ipsum
        cillum. Sit do duis aliquip elit consectetur laboris irure.
      </div>
      <div className="mt-8">
        Dolor sint cupidatat ut labore laboris. Exercitation incididunt ea ipsum
        cillum. Sit do duis aliquip elit consectetur laboris irure.
      </div>
      <div className="mt-8">
        Dolor sint cupidatat ut labore laboris. Exercitation incididunt ea ipsum
        cillum. Sit do duis aliquip elit consectetur laboris irure.
      </div>
      <div className="mt-8">
        Dolor sint cupidatat ut labore laboris. Exercitation incididunt ea ipsum
        cillum. Sit do duis aliquip elit consectetur laboris irure.
      </div>
      <div className="mt-8">
        Dolor sint cupidatat ut labore laboris. Exercitation incididunt ea ipsum
        cillum. Sit do duis aliquip elit consectetur laboris irure.
      </div>
      <div className="mt-8">
        Dolor sint cupidatat ut labore laboris. Exercitation incididunt ea ipsum
        cillum. Sit do duis aliquip elit consectetur laboris irure.
      </div>
      <div className="mt-8">
        Dolor sint cupidatat ut labore laboris. Exercitation incididunt ea ipsum
        cillum. Sit do duis aliquip elit consectetur laboris irure.
      </div>
      <div className="mt-8">
        Dolor sint cupidatat ut labore laboris. Exercitation incididunt ea ipsum
        cillum. Sit do duis aliquip elit consectetur laboris irure.
      </div>
      <div className="mt-8">
        Dolor sint cupidatat ut labore laboris. Exercitation incididunt ea ipsum
        cillum. Sit do duis aliquip elit consectetur laboris irure.
      </div>
      <div className="mt-8">
        Dolor sint cupidatat ut labore laboris. Exercitation incididunt ea ipsum
        cillum. Sit do duis aliquip elit consectetur laboris irure.
      </div>
      <div className="mt-8">
        Dolor sint cupidatat ut labore laboris. Exercitation incididunt ea ipsum
        cillum. Sit do duis aliquip elit consectetur laboris irure.
      </div>
      <div className="mt-8">
        Dolor sint cupidatat ut labore laboris. Exercitation incididunt ea ipsum
        cillum. Sit do duis aliquip elit consectetur laboris irure.
      </div>
      <div className="mt-8">
        Dolor sint cupidatat ut labore laboris. Exercitation incididunt ea ipsum
        cillum. Sit do duis aliquip elit consectetur laboris irure.
      </div>
      <div className="mt-8">
        Dolor sint cupidatat ut labore laboris. Exercitation incididunt ea ipsum
        cillum. Sit do duis aliquip elit consectetur laboris irure.
      </div>
      <div className="mt-8">
        Dolor sint cupidatat ut labore laboris. Exercitation incididunt ea ipsum
        cillum. Sit do duis aliquip elit consectetur laboris irure.
      </div>
      <div className="mt-8">
        Dolor sint cupidatat ut labore laboris. Exercitation incididunt ea ipsum
        cillum. Sit do duis aliquip elit consectetur laboris irure.
      </div>
      <div className="mt-8">
        Dolor sint cupidatat ut labore laboris. Exercitation incididunt ea ipsum
        cillum. Sit do duis aliquip elit consectetur laboris irure.
      </div>
      <div className="mt-8">
        Dolor sint cupidatat ut labore laboris. Exercitation incididunt ea ipsum
        cillum. Sit do duis aliquip elit consectetur laboris irure.
      </div>
      <div className="mt-8">
        Dolor sint cupidatat ut labore laboris. Exercitation incididunt ea ipsum
        cillum. Sit do duis aliquip elit consectetur laboris irure.
      </div>
      <div className="mt-8">
        Dolor sint cupidatat ut labore laboris. Exercitation incididunt ea ipsum
        cillum. Sit do duis aliquip elit consectetur laboris irure.
      </div>
      <div className="mt-8">
        Dolor sint cupidatat ut labore laboris. Exercitation incididunt ea ipsum
        cillum. Sit do duis aliquip elit consectetur laboris irure.
      </div>
      <div className="mt-8">
        Dolor sint cupidatat ut labore laboris. Exercitation incididunt ea ipsum
        cillum. Sit do duis aliquip elit consectetur laboris irure.
      </div>
    </div>
  );
}

export default App;
