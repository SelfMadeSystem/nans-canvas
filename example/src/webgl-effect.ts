import { createCanvasEffect } from "nans-canvas";

const vertexSource = /*glsl*/ `#version 300 es
const vec2 positions[3] = vec2[3](
  vec2(-1.0, -1.0),
  vec2(3.0, -1.0),
  vec2(-1.0, 3.0)
);

void main() {
  gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);
}
`;

const fragmentSource = /*glsl*/ `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float wave = 0.5 + 0.5 * sin(uv.x * 8.0 + u_time);
  outColor = vec4(uv.x, uv.y, wave, 1.0);
}
`;

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create WebGL2 shader");

  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Unknown shader error";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

export const webglEffect = createCanvasEffect(
  {
    contextId: "webgl2",
    contextAttributes: { alpha: false, antialias: true },
  },
  (_options, gl) => {
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentSource,
    );
    const program = gl.createProgram();
    if (!program) throw new Error("Unable to create WebGL2 program");

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) ?? "Unknown program error";
      gl.deleteProgram(program);
      throw new Error(message);
    }

    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const timeLocation = gl.getUniformLocation(program, "u_time");

    return {
      onResize({ width, height }) {
        gl.viewport(0, 0, width, height);
        gl.useProgram(program);
        gl.uniform2f(resolutionLocation, width, height);
      },
      draw({ elapsedTime }) {
        gl.useProgram(program);
        gl.uniform1f(timeLocation, elapsedTime);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      cleanup() {
        gl.deleteProgram(program);
      },
    };
  },
);
