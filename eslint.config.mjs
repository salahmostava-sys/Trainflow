// ESLint flat config for TrainFlow.
// The root browser scripts (and the generated cloud.js / navigation.js) share one
// global scope in the page, so each file's top-level declarations are globals for
// the others. They are collected from the source at lint time, so `no-undef`
// still catches real typos without a hand-maintained list going stale.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

const root = path.dirname(fileURLToPath(import.meta.url));
const configFiles = new Set(["next.config.js", "postcss.config.js", "tailwind.config.js", "eslint.config.mjs"]);
const legacyScripts = fs
  .readdirSync(root)
  .filter((file) => file.endsWith(".js") && !configFiles.has(file));

function topLevelNames(files) {
  const names = new Set();
  for (const file of files) {
    const source = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    for (const statement of source.statements) {
      if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name) names.add(statement.name.text);
      else if (ts.isVariableStatement(statement))
        for (const declaration of statement.declarationList.declarations)
          if (ts.isIdentifier(declaration.name)) names.add(declaration.name.text);
    }
  }
  return names;
}
const asGlobals = (names, access = "writable") => Object.fromEntries([...names].map((name) => [name, access]));

// Modules that attach themselves to window/globalThis instead of declaring a top-level name.
const attachedGlobals = ["TrainflowDates", "AppDialog", "PrometricExamData", "PrometricData", "PrometricScores", "TraineeData"];
const workspaceGlobals = asGlobals(new Set([...topLevelNames(legacyScripts), ...attachedGlobals]));
// Fixtures the browser tests install in the page before calling page.evaluate.
const browserTestGlobals = asGlobals(["previewSheets", "previewCodes", "uiTestDatabase", "uiTestCopies", "uiReleaseNameSave", "savedVouchers", "completeRemoval", "chrome"]);
const extensionDir = path.join(root, "extension/prometric");
const extensionGlobals = asGlobals(
  topLevelNames(fs.readdirSync(extensionDir).filter((file) => file.endsWith(".js")).map((file) => path.join("extension/prometric", file))),
);

const sharedRules = {
  // Intentional empty catches must say why with a comment.
  "no-empty": ["error", { allowEmptyCatch: false }],
  "no-unused-vars": ["warn", { args: "none", caughtErrors: "none", varsIgnorePattern: "^_" }],
  "no-useless-escape": "warn",
  "no-unused-expressions": "off",
};

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "dist/**",
      "dist-vercel/**",
      "public/**",
      "generated/**",
      "artifacts/**",
      "cloud.js",
      "navigation.js",
      "next-env.d.ts",
      "tests/.tmp-*",
    ],
  },
  js.configs.recommended,
  {
    files: ["*.js"],
    ignores: [...configFiles],
    languageOptions: {
      sourceType: "script",
      ecmaVersion: 2022,
      // module/require: the core files are also loaded by Node tests (UMD pattern).
      globals: { ...globals.browser, ...workspaceGlobals, ExcelJS: "readonly", supabase: "readonly", module: "readonly", require: "readonly", importScripts: "readonly" },
    },
    rules: { ...sharedRules, "no-constant-condition": ["error", { checkLoops: "none" }], "no-redeclare": "off", "no-func-assign": "off", "no-global-assign": "off" },
  },
  {
    files: ["extension/prometric/*.js"],
    languageOptions: {
      sourceType: "script",
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.serviceworker, ...extensionGlobals, PrometricScores: "readonly", chrome: "readonly", module: "readonly", require: "readonly", global: "readonly" },
    },
    rules: { ...sharedRules, "no-redeclare": "off" },
  },
  {
    files: ["tools/**/*.{cjs,js}", "tests/**/*.{cjs,js}", "*.config.js", "**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      ecmaVersion: 2022,
      // Browser tests pass functions into page.evaluate, which run in the page.
      globals: { ...globals.node, ...globals.browser, ...workspaceGlobals, ...browserTestGlobals },
    },
    rules: { ...sharedRules, "no-empty": ["warn", { allowEmptyCatch: false }] },
  },
  {
    files: ["client/**/*.js"],
    languageOptions: { sourceType: "script", ecmaVersion: 2022, globals: { ...globals.browser } },
    rules: sharedRules,
  },
  {
    files: ["tests/**/*.mjs", "*.mjs"],
    languageOptions: { sourceType: "module", ecmaVersion: 2022, globals: { ...globals.node } },
    rules: sharedRules,
  },
  ...tseslint.configs.recommended.map((config) => ({ ...config, files: ["**/*.{ts,tsx}"] })),
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // TypeScript checks undefined names itself (tsc runs in CI).
      "no-undef": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { args: "none", caughtErrors: "none", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-require-imports": "off",
      "no-empty": ["error", { allowEmptyCatch: false }],
    },
  },
);
