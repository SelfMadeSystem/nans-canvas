import { build } from "esbuild";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";

const projectRoot = process.cwd();
const distDirectory = resolve(projectRoot, "dist");
const cjsDirectory = resolve(distDirectory, "cjs");

await build({
  entryPoints: [
    "index.ts",
    "react.tsx",
    "createCanvasEffect.ts",
    "utils/mathUtils.ts",
    "utils/vec.ts",
  ],
  absWorkingDir: projectRoot,
  bundle: true,
  external: ["react", "react/*"],
  format: "cjs",
  outdir: cjsDirectory,
  outExtension: { ".js": ".cjs" },
  platform: "neutral",
  target: "es2020",
});

async function findDeclarations(directory) {
  const declarations = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory() && path !== cjsDirectory) {
      declarations.push(...(await findDeclarations(path)));
    } else if (entry.isFile() && entry.name.endsWith(".d.ts")) {
      declarations.push(path);
    }
  }
  return declarations;
}

for (const declaration of await findDeclarations(distDirectory)) {
  const relativePath = relative(distDirectory, declaration);
  const cjsPath = resolve(
    cjsDirectory,
    relativePath.replace(/\.d\.ts$/, ".d.cts"),
  );
  const contents = (await readFile(declaration, "utf8")).replace(
    /(["'])(\.\.?\/[^"']+)\.js\1/g,
    "$1$2.cjs$1",
  );
  await mkdir(dirname(cjsPath), { recursive: true });
  await writeFile(cjsPath, contents);
}
