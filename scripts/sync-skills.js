// Sync the skills pack into the public docs repo, and generate the
// per-skill pages from it.
//
// Two artifacts, one source:
//
//   skills/<name>/...            the public copy of the pack — the thing a
//                                user copies into their agent's skills folder
//   docs/skills/<name>.mdx       the per-skill page
//
// The pack itself lives in the product repo. This script reads it from a
// sibling checkout and writes the public copy, so the public copy is
// generated rather than forked by hand and cannot drift from the source.
//
// Usage:
//   node scripts/sync-skills.js           write the copy and the pages
//   node scripts/sync-skills.js --check   fail if the committed copy is
//                                         stale (the CI drift check)
//
// The output is committed. Netlify builds the docs repo on its own and has
// no access to the product checkout, so the generated copy has to be in
// the tree rather than produced during the build.

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const checkOnly = process.argv.includes("--check");

const siblingPackDirs = ["ZeroQuarry", "zeroquarry", "security-bug-finder"];
const packRoot =
  siblingPackDirs
    .map((dir) => path.resolve(repoRoot, "..", dir, "skills"))
    .find((candidate) => fs.existsSync(candidate)) ||
  path.resolve(repoRoot, "..", "ZeroQuarry", "skills");

if (!fs.existsSync(packRoot)) {
  console.error(`[sync-skills] Skills pack not found at ${packRoot}`);
  console.error(
    "[sync-skills] Check out the product repo next to zeroquarry-docs, or set ZEROQUARRY_PACK_DIR.",
  );
  process.exit(1);
}

const packDir = process.env.ZEROQUARRY_PACK_DIR
  ? path.resolve(process.env.ZEROQUARRY_PACK_DIR)
  : packRoot;

const skillsOutDir = path.join(repoRoot, "skills");
const docsSkillsDir = path.join(repoRoot, "docs", "skills");

// --- frontmatter ------------------------------------------------------------

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return {fields: {}, body: text};
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    let value = kv[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    }
    fields[kv[1]] = value;
  }
  return {fields, body: text.slice(match[0].length)};
}

function yamlString(value) {
  const escaped = String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

// --- collect ----------------------------------------------------------------

function collectFiles(dir, base) {
  const out = [];
  const root = base || dir;
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      out.push(...collectFiles(full, root));
    } else {
      out.push({
        relpath: path.relative(root, full).split(path.sep).join("/"),
        full,
      });
    }
  }
  return out;
}

const skills = fs
  .readdirSync(packDir)
  .filter((name) => fs.statSync(path.join(packDir, name)).isDirectory())
  .sort()
  .map((name) => {
    const dir = path.join(packDir, name);
    const skillFile = path.join(dir, "SKILL.md");
    if (!fs.existsSync(skillFile)) return null;
    const text = fs.readFileSync(skillFile, "utf8");
    const {fields, body} = parseFrontmatter(text);
    const supporting = collectFiles(dir).filter((f) => f.relpath !== "SKILL.md");
    return {
      name,
      description: fields.description || "",
      body: body.trim(),
      files: [
        {relpath: "SKILL.md", content: text},
        ...supporting.map((f) => ({
          relpath: f.relpath,
          content: fs.readFileSync(f.full, "utf8"),
        })),
      ],
    };
  })
  .filter(Boolean);

if (!skills.length) {
  console.error(`[sync-skills] No skills found in ${packDir}`);
  process.exit(1);
}

// --- generate ---------------------------------------------------------------

const written = new Map();

function emit(relPath, content) {
  written.set(relPath, content);
}

for (const skill of skills) {
  for (const file of skill.files) {
    emit(path.join("skills", skill.name, file.relpath), file.content);
  }

  const page = [
    "---",
    `title: ${skill.name}`,
    `sidebar_label: ${skill.name}`,
    `description: ${yamlString(skill.description.slice(0, 180))}`,
    "---",
    "",
    `# The \`${skill.name}\` skill`,
    "",
    skill.description,
    "",
    "## How to get it",
    "",
    `This is one of the skills in the [ZeroQuarry skills pack](/workflows/mcp-skills).`,
    "It reaches your agent three ways:",
    "",
    "- **The native skills surface.** A client that declares the",
    "  `io.modelcontextprotocol/skills` extension finds it under",
    `  \`skill://zeroquarry/${skill.name}/SKILL.md\`.`,
    "- **The fallback tools.** Any client can call `list_skills` and then",
    `  \`load_skill\` with \`"${skill.name}\`.`,
    "- **A local copy.** The whole pack is published at",
    "  [skills](https://github.com/ZeroQuarry/zeroquarry-docs/tree/main/skills)",
    "  — save the directories into your agent's skills folder.",
    "",
    "## The skill",
    "",
    "This is the skill's own text, as the server serves it.",
    "",
    skill.body,
    "",
  ].join("\n");
  emit(path.join("docs", "skills", `${skill.name}.mdx`), page);
}

const indexRows = skills
  .map(
    (skill) =>
      `| [\`${skill.name}\`](/skills/${skill.name}) | ${skill.description.replace(/\n/g, " ")} |`,
  )
  .join("\n");

const index = [
  "---",
  "id: skills",
  "title: The skills pack",
  "sidebar_label: The skills pack",
  "description: The Agent Skills documents that teach an agent to drive ZeroQuarry.",
  "---",
  "",
  "# The skills pack",
  "",
  "A skill is an Agent Skills document — a markdown file with YAML frontmatter —",
  "that teaches an agent how to drive ZeroQuarry. The server serves the pack over",
  "MCP; you can also copy the files into your own agent.",
  "",
  "The pack is not fixed. It grows as the product gains the capability to",
  "describe, so treat the listing below as the pack's current shape rather than",
  "a guarantee.",
  "",
  "| Skill | What it is for |",
  "| --- | --- |",
  indexRows,
  "",
  "The [skills pack reference](/workflows/mcp-skills) covers how a client reaches",
  "the pack, the entrypoint, and the rules the skills follow.",
  "",
].join("\n");
emit(path.join("docs", "skills.mdx"), index);

// --- write or check ---------------------------------------------------------

const stale = [];

for (const [relPath, content] of written) {
  const full = path.join(repoRoot, relPath);
  const existing = fs.existsSync(full) ? fs.readFileSync(full, "utf8") : null;
  if (existing === content) continue;
  if (checkOnly) {
    stale.push(relPath);
    continue;
  }
  fs.mkdirSync(path.dirname(full), {recursive: true});
  fs.writeFileSync(full, content, "utf8");
}

if (checkOnly) {
  // A skill page that no sidebar entry reaches is invisible in the docs
  // even though it exists and is linked — the build would still pass.
  const sidebars = fs.readFileSync(path.join(repoRoot, "sidebars.js"), "utf8");
  for (const skill of skills) {
    if (!sidebars.includes(`"skills/${skill.name}"`)) {
      stale.push(`sidebars.js (no entry for skills/${skill.name})`);
    }
  }
  if (stale.length) {
    console.error(`[sync-skills] Stale generated files (${stale.length}):`);
    for (const rel of stale) console.error(`  ${rel}`);
    console.error("[sync-skills] Run 'node scripts/sync-skills.js' and commit the result.");
    process.exit(1);
  }
  console.log(`[sync-skills] Up to date: ${written.size} generated files`);
} else {
  console.log(`[sync-skills] Wrote ${written.size} generated files from ${skills.length} skills`);
}
