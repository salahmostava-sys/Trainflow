const path = require("node:path");
module.exports = {
  "react-runtime.js": path.join(
    path.dirname(require.resolve("react/package.json")),
    "umd/react.production.min.js",
  ),
  "react-dom-runtime.js": path.join(
    path.dirname(require.resolve("react-dom/package.json")),
    "umd/react-dom.production.min.js",
  ),
  "workspace-views.js": path.join(__dirname, "../generated/workspace-views.js"),
};
