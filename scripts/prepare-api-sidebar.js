const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const source = path.join(repoRoot, "api", "sidebar.ts");
const dest = path.join(repoRoot, "api", "sidebar.js");

if (!fs.existsSync(source)) {
  console.warn("[prepare-api-sidebar] No generated API sidebar found.");
  process.exit(0);
}

let content = fs.readFileSync(source, "utf8");
content = content
  .replace(/^import type .*?\r?\n\r?\n/, "")
  .replace("const sidebar: SidebarsConfig =", "const sidebar =")
  .replace(/export default sidebar;\s*$/, "module.exports = sidebar.apisidebar;\n");

fs.writeFileSync(dest, content);
console.log(`[prepare-api-sidebar] Wrote ${dest}`);
