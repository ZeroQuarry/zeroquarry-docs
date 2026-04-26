const fs = require("fs");
const path = require("path");

const placeholderApiSidebar = [
  {
    type: "doc",
    id: "api-placeholder",
    label: "Generate the API reference",
  },
];

function generatedApiSidebar() {
  const sidebarPath = path.join(__dirname, "docs", "api", "sidebar.js");
  if (!fs.existsSync(sidebarPath)) {
    return placeholderApiSidebar;
  }

  const generated = require(sidebarPath);
  if (Array.isArray(generated)) {
    return generated;
  }
  if (generated.default && Array.isArray(generated.default)) {
    return generated.default;
  }

  const firstSidebar = Object.values(generated).find(Array.isArray);
  return firstSidebar || placeholderApiSidebar;
}

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
module.exports = {
  userSidebar: [
    "intro",
    {
      type: "category",
      label: "Getting started",
      link: {type: "generated-index", title: "Getting started"},
      items: [
        "getting-started/first-scan",
        "getting-started/projects-and-scans",
      ],
    },
    {
      type: "category",
      label: "Scans",
      link: {type: "generated-index", title: "Scans"},
      items: [
        "scans/source-code",
        "scans/binary-artifacts",
        "scans/remote-targets",
      ],
    },
    {
      type: "category",
      label: "Reports",
      link: {type: "generated-index", title: "Reports"},
      items: [
        "reports/findings",
        "reports/confidence-and-review",
        "reports/exports-and-disclosures",
      ],
    },
    {
      type: "category",
      label: "Workflows",
      link: {type: "generated-index", title: "Workflows"},
      items: [
        "workflows/github-actions",
        "workflows/private-repositories",
      ],
    },
    {
      type: "category",
      label: "Account",
      link: {type: "generated-index", title: "Account"},
      items: [
        "account/llm-providers",
        "account/notifications-and-team",
      ],
    },
    {
      type: "category",
      label: "Security",
      link: {type: "generated-index", title: "Security"},
      items: [
        "security/authorization",
        "security/data-handling",
      ],
    },
  ],
  apiSidebar: generatedApiSidebar(),
};
