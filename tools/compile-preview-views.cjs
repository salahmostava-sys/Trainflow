const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const modules = new Map();
const external = {
  react: "React",
  "react-dom": "ReactDOM",
  "react-dom/client": "ReactDOM",
};
function collect(relative) {
  if (modules.has(relative)) return;
  const filename = path.join(root, relative);
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  modules.set(
    relative,
    compiled.replace(/require\("([^\"]+)"\)/g, (call, specifier) => {
      if (external[specifier]) return "window." + external[specifier];
      const dependency =
        path
          .relative(root, path.resolve(path.dirname(filename), specifier))
          .replaceAll("\\", "/") + ".tsx";
      collect(dependency);
      return "load(" + JSON.stringify(dependency) + ")";
    }),
  );
}
collect("client/workspace-views.tsx");
const definitions = [...modules]
  .map(
    ([name, compiled]) =>
      JSON.stringify(name) + ":function(module,exports){\n" + compiled + "\n}",
  )
  .join(",\n");
fs.writeFileSync(
  path.join(root, "generated/workspace-views.js"),
  "(function(){const modules={" +
    definitions +
    '},cache={};function load(name){if(!cache[name]){const module={exports:{}};cache[name]=module;modules[name](module,module.exports);}return cache[name].exports;}window.WorkspaceViews=load("client/workspace-views.tsx").WorkspaceViews;})();\n',
);
