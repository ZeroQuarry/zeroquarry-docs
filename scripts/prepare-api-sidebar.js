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
// worker-authenticated operations without adding that tag to sidebar.ts. A tag
// page uses useCurrentSidebarCategory(), so leaving it orphaned makes SSG fail.
// Attach the generated worker pages explicitly until the upstream generator
// includes non-bearer-auth tags in its sidebar output.
const workerDocs = [
  ["register-a-data-plane-worker", "Register a data-plane worker.", "post"],
  ["record-worker-liveness", "Record worker liveness.", "post"],
  ["inspect-the-authenticated-worker-identity", "Inspect the authenticated worker identity.", "get"],
  ["claim-the-next-queued-scan-for-this-worker", "Claim the next queued scan for this worker.", "post"],
];
const hasWorkerPages = workerDocs.every(([id]) =>
  fs.existsSync(path.join(repoRoot, "api", `${id}.api.mdx`)),
);
if (hasWorkerPages && !content.includes('label: "workers"')) {
  const workerCategory = `    {
      type: "category",
      label: "workers",
      link: { type: "doc", id: "workers" },
      collapsed: false,
      items: [
${workerDocs.map(([id, label, method]) => `        {
          type: "doc",
          id: ${JSON.stringify(id)},
          label: ${JSON.stringify(label)},
          className: "api-method ${method}",
        },`).join("\n")}
      ],
    },
`;
  content = content.replace(/  \],\s*\};\s*export default sidebar\.apisidebar;/, `${workerCategory}  ],\n};\n\nexport default sidebar.apisidebar;`);
}

content = content.replace(
  /export default sidebar\.apisidebar;\s*$/,
  "module.exports = sidebar.apisidebar;\n",
);

fs.writeFileSync(dest, content);
console.log(`[prepare-api-sidebar] Wrote ${dest}`);
