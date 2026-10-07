const fs = require("node:fs"),
  path = require("node:path"),
  ts = require("typescript");
const root = path.resolve(__dirname, "..");
function browserSource(filename) {
  return ts.transpileModule(
    fs.readFileSync(path.join(root, filename), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.None,
        target: ts.ScriptTarget.ES2020,
      },
    },
  ).outputText;
}
for (const [source, target] of [
  ["client/cloud.ts", "cloud.js"],
  ["client/navigation.ts", "navigation.js"],
])
  fs.writeFileSync(path.join(root, target), browserSource(source));
fs.mkdirSync(path.join(root, "generated"), { recursive: true });
require('./compile-preview-views.cjs');
fs.writeFileSync(
  path.join(root, "generated/api.mjs"),
  ts.transpileModule(
    fs.readFileSync(path.join(root, "server/api.ts"), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2020,
      },
    },
  ).outputText,
);
