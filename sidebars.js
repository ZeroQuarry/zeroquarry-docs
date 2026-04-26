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
};
