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
  .replace("const sidebar: SidebarsConfig =", "const sidebar =");

// docusaurus-plugin-openapi-docs 5.0 can generate endpoint and tag pages for
// some operations without adding that tag to sidebar.ts. A tag page uses
// useCurrentSidebarCategory(), so leaving it orphaned makes SSG fail with
// "cant find current sidebar in context". Attach the generated pages
// explicitly until the upstream generator includes them in its sidebar output.
//
// Each entry is a tag category whose pages exist on disk but never reach
// sidebar.ts. The "workers" group is the original case; "credentials" and
// "dependency-watch" arrived with the companion-CLI credential ingest and the
// dependency-watch read API.
const orphanedTagCategories = [
  {
    label: "workers",
    pages: [
      ["register-a-data-plane-worker", "Register a data-plane worker.", "post"],
      ["record-worker-liveness", "Record worker liveness.", "post"],
      ["inspect-the-authenticated-worker-identity", "Inspect the authenticated worker identity.", "get"],
      ["claim-the-next-queued-scan-for-this-worker", "Claim the next queued scan for this worker.", "post"],
      ["renew-an-active-worker-attempt-lease", "Renew an active worker-attempt lease.", "post"],
      ["submit-the-fenced-result-of-a-private-execution-attempt", "Submit the fenced result of a private execution attempt.", "post"],
    ],
  },
  {
    label: "credentials",
    pages: [
      [
        "list-saved-git-credentials-metadata-only-never-the-secret",
        "List saved Git credentials — metadata only, never the secret.",
        "get",
      ],
      [
        "upload-a-git-credential-→-receive-the-git-credential-id-reference",
        "Upload a Git credential → receive the `git_credential_id` reference.",
        "post",
      ],
    ],
  },
  {
    label: "dependency-watch",
    pages: [
      [
        "open-dependency-advisories-kev-matches-with-a-sweep-freshness-summary",
        "Open dependency advisories + KEV matches, with a sweep-freshness summary.",
        "get",
      ],
    ],
  },
];

for (const {label, pages} of orphanedTagCategories) {
  const hasPages = pages.every(([id]) =>
    fs.existsSync(path.join(repoRoot, "api", `${id}.api.mdx`)),
  );
  if (!hasPages || content.includes(`label: "${label}"`)) {
    continue;
  }
  const category = `    {
      type: "category",
      label: ${JSON.stringify(label)},
      link: { type: "doc", id: ${JSON.stringify(label)} },
      collapsed: false,
      items: [
${pages.map(([id, pageLabel, method]) => `        {
          type: "doc",
          id: ${JSON.stringify(id)},
          label: ${JSON.stringify(pageLabel)},
          className: "api-method ${method}",
        },`).join("\n")}
      ],
    },
`;
  content = content.replace(/  \],\s*\};\s*export default sidebar\.apisidebar;/, `${category}  ],\n};\n\nexport default sidebar.apisidebar;`);
}

content = content.replace(
  /export default sidebar\.apisidebar;\s*$/,
  "module.exports = sidebar.apisidebar;\n",
);

fs.writeFileSync(dest, content);
console.log(`[prepare-api-sidebar] Wrote ${dest}`);
