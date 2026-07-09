/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
module.exports = {
  userSidebar: [
    "intro",
    {
      type: "category",
      label: "Start here",
      link: {type: "generated-index", title: "Start with ZeroQuarry"},
      items: [
        "getting-started/first-scan",
        "getting-started/projects-and-scans",
      ],
    },
    {
      type: "category",
      label: "Security operating playbooks",
      link: {type: "generated-index", title: "Security operating playbooks"},
      items: [
        "use-cases/security-program",
        "use-cases/choose-an-assessment",
        "use-cases/release-security-review",
        "use-cases/continuous-ci-scanning",
        "use-cases/inbound-report-triage",
        "use-cases/triage-to-remediation",
        "use-cases/customer-assurance",
        "use-cases/external-disclosure",
      ],
    },
    {
      type: "category",
      label: "Run assessments",
      link: {type: "generated-index", title: "Run assessments"},
      items: [
        "scans/source-code",
        "scans/binary-artifacts",
        "scans/remote-targets",
      ],
    },
    {
      type: "category",
      label: "Automate and receive work",
      link: {type: "generated-index", title: "Automate and receive security work"},
      items: [
        "workflows/github-actions",
        "workflows/scheduled-rescans",
        "workflows/email-triage",
        "workflows/private-repositories",
      ],
    },
    {
      type: "category",
      label: "Decide and remediate",
      link: {type: "generated-index", title: "Decide and remediate"},
      items: [
        "reports/findings",
        "reports/finding-lifecycle",
        "reports/confidence-and-review",
        "workflows/autofix",
        "workflows/issue-trackers",
      ],
    },
    {
      type: "category",
      label: "Share and prove",
      link: {type: "generated-index", title: "Share and prove security work"},
      items: [
        "reports/evidence-room",
        "reports/secure-sharing",
        "reports/exports-and-disclosures",
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
