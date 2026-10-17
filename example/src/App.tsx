import "./index.css";

import { CanvasEffect } from "./react";
import { myEffect } from "./my-effect";

export function App() {
  return (
    <div className="max-w-7xl mx-auto p-8 text-center relative z-10">
      <div className="flex justify-center items-center gap-8 mb-8">
        <CanvasEffect
          effect={myEffect}
          color="deepskyblue"
          style={{ width: "100%", height: 400, display: "block" }}
        />
      </div>
    </div>
  );
}

export default App;
