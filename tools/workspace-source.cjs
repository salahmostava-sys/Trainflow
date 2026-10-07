const fs = require("node:fs"),
  path = require("node:path"),
  ts = require("typescript"),
  React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const root = path.resolve(__dirname, "..");
const sources = [
  {
    src: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/dist/umd/supabase.js",
  },
  { src: "session-policy.js" },
  { src: "cloud.js" },
  { src: "voucher-names.js" },
  { src: "voucher-columns.js" },
  { src: "app-dialog.js" },
  { src: "workspace.js" },
  { src: "navigation.js" },
  { src: "ops-ui.js" },
  { src: "trainees-core.js" },
  { src: "trainees-borders.js" },
  { src: "trainees-sheets.js" },
  { src: "prometric-core.js" },
  {
    src: "prometric-registration.js",
    id: "prometric-registration-script",
    "data-extension": "trainflow-prometric.zip",
  },
  { src: "trainees-xlsx.js" },
  {
    src: "trainees-files.js",
    id: "sheet-files-script",
    "data-worker": "trainees-xlsx-worker.js",
  },
  { src: "trainees-excel.js" },
  { src: "certificate-name.js" },
  { src: "trainees.js" },
  {
    src: "trainee-reports.js",
    id: "trainee-reports-script",
    "data-connector": "google-reports.gs",
  },
  { src: "codes-export.js" },
];
const loadTsx = (filename, cache = new Map()) => {
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} };
  cache.set(filename, module);
  const localRequire = (specifier) => {
    if (!specifier.startsWith(".") && !specifier.startsWith("@/"))
      return require(specifier);
    const full = specifier.startsWith("@/")
      ? path.join(root, specifier.slice(2))
      : path.resolve(path.dirname(filename), specifier);
    const resolved = [full, full + ".tsx", full + ".ts", full + ".js"].find(
      (file) => fs.existsSync(file),
    );
    return /\.tsx?$/.test(resolved)
      ? loadTsx(resolved, cache)
      : require(resolved);
  };
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  new Function("require", "module", "exports", code)(
    localRequire,
    module,
    module.exports,
  );
  return module.exports;
};
function renderDocument({
  initialPanel = "trainees",
  inlineRuntime = false,
} = {}) {
  const { WorkspaceShell } = loadTsx(
    path.join(root, "components/workspace/WorkspaceShell.tsx"),
  );
  const markup = renderToStaticMarkup(
    React.createElement(WorkspaceShell, { initialPanel }),
  );
  const bootstrap = fs.readFileSync(
    path.join(root, "client/language-bootstrap.js"),
    "utf8",
  );
  const css = fs.readFileSync(path.join(root, "workspace.css"), "utf8");
  const loadingLanguage =
    "<script>document.getElementById('startup-message').textContent=window.IBTA_START_LANGUAGE==='ar'?'جارٍ تحميل مساحة العمل…':'Loading workspace…';</script>";
  const scripts =
    loadingLanguage +
    sources
      .map((attributes) => {
        if (inlineRuntime && attributes.src === "workspace.js")
          return (
            "<script>" +
            fs
              .readFileSync(path.join(root, "workspace.js"), "utf8")
              .replace(
                "window.TRAINFLOW_BOOT_WORKSPACE=()=>Cloud.boot();",
                "Cloud.boot();",
              ) +
            "</script>"
          );
        return (
          "<script " +
          Object.entries(attributes)
            .map(([name, value]) => name + '="' + value + '"')
            .join(" ") +
          "></script>"
        );
      })
      .join("\n");
  return (
    '<!DOCTYPE html><html lang="ar" dir="rtl" id="html-root"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><script>' +
    bootstrap +
    '</script><link rel="stylesheet" href="trainees.css"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"><title id="doc-title">TrainFlow</title><style>' +
    css +
    "</style></head><body>" +
    markup +
    scripts +
    (inlineRuntime
      ? ""
      : "<script>const navigation=connectWorkspaceNavigation();window.TRAINFLOW_BOOT_WORKSPACE().then(()=>navigation.ready());</script>") +
    "</body></html>"
  );
}
module.exports = { sources, renderDocument };
