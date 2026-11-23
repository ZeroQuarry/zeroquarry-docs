// Render static/llms.txt from data/connect.json.
//
// The llms.txt convention (https://llmstxt.org) wants a markdown file at the
// site root that tells a model what this site is and which pages to read.
// The /connect page is the same content for a human agent. Two artifacts,
// one source: data/connect.json.
//
// The file is generated, not committed — the same way api/ is. Edit
// data/connect.json and rebuild.

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(repoRoot, "data", "connect.json");
const destPath = path.join(repoRoot, "static", "llms.txt");

if (!fs.existsSync(sourcePath)) {
  console.error(`[generate-llms] Source not found: ${sourcePath}`);
  process.exit(1);
}

const connect = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

const lines = [];
lines.push("# ZeroQuarry");
lines.push("");
lines.push(`> ${connect.summary}`);
lines.push("");
lines.push("## Connect");
lines.push("");
lines.push(
  `ZeroQuarry exposes an MCP server at \`${connect.serverUrl}\`. Add that URL ` +
    "to your coding agent's MCP configuration and sign in with the browser prompt. " +
    `Then: ${connect.nextInstruction}`,
);
lines.push("");
lines.push("## What ZeroQuarry does");
lines.push("");
for (const line of connect.what) {
  lines.push(`- ${line}`);
}
lines.push("");
lines.push("## Per-harness setup");
lines.push("");
for (const harness of connect.harnesses) {
  lines.push(`### ${harness.name}`);
  lines.push("");
  lines.push(harness.prose);
  lines.push("");
  if (harness.config) {
    lines.push("```" + harness.config.language);
    lines.push(harness.config.code.trimEnd());
    lines.push("```");
    lines.push("");
  }
}
lines.push("## What the consent screen asks for");
lines.push("");
for (const line of connect.consent) {
  lines.push(`- ${line}`);
}
lines.push("");
lines.push("## After you connect");
lines.push("");
lines.push(connect.nextInstruction);
lines.push("");
lines.push(connect.nextProse);
lines.push("");
lines.push(connect.firstCheck);
lines.push("");
lines.push("## Skills");
lines.push("");
for (const line of connect.skills) {
  lines.push(`- ${line}`);
}
lines.push("");
lines.push("## Docs");
lines.push("");
for (const link of connect.links) {
  lines.push(`- [${link.title}](${link.url}): ${link.description}`);
}
lines.push("");

fs.mkdirSync(path.dirname(destPath), {recursive: true});
fs.writeFileSync(destPath, lines.join("\n"), "utf8");
console.log(`[generate-llms] Wrote ${destPath}`);
