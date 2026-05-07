"use strict";

const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const DEFAULT_AUTH_STATE = path.join(ROOT_DIR, ".auth", "zeroquarry-prod.json");
const DEFAULT_OUTPUT_DIR = path.join(ROOT_DIR, "static", "img", "screenshots");
const DEFAULT_BASE_URL = "https://console.zeroquarry.com";
const SESSION_COOKIE_NAME = "vb_session";

const screenshotTargets = [
  {
    name: "workspace",
    path: "/",
    description: "Default project workspace after sign-in",
  },
  {
    name: "account-overview",
    path: "/account",
    description: "Account overview, usage, integrations, and team settings",
  },
  {
    name: "projects-manage",
    path: "/projects",
    description: "Projects index with account-wide project management",
  },
  {
    name: "project-detail",
    path: "/projects/{ZEROQUARRY_DOCS_PROJECT_ID}",
    description: "Project detail with scan history, tags, and stats",
    requiredEnv: ["ZEROQUARRY_DOCS_PROJECT_ID"],
  },
  {
    name: "scan-new-picker",
    path: "/scans/new",
    description: "Scan mode picker for choosing source, binary, or remote assessments",
  },
  {
    name: "source-scan-form",
    path: "/scans/new/source?project_id={ZEROQUARRY_DOCS_PROJECT_ID}",
    description: "Source scan creation form",
    requiredEnv: ["ZEROQUARRY_DOCS_PROJECT_ID"],
  },
  {
    name: "binary-scan-form",
    path: "/scans/new/binary?project_id={ZEROQUARRY_DOCS_PROJECT_ID}",
    description: "Binary scan creation form",
    requiredEnv: ["ZEROQUARRY_DOCS_PROJECT_ID"],
  },
  {
    name: "remote-scan-form",
    path: "/scans/new/remote?project_id={ZEROQUARRY_DOCS_PROJECT_ID}",
    description: "Remote scan creation form with scoping and auth controls",
    requiredEnv: ["ZEROQUARRY_DOCS_PROJECT_ID"],
  },
  {
    name: "account-git-access",
    path: "/account/git-credentials",
    description: "Account-level Git credential management for private repositories",
  },
  {
    name: "account-api-keys",
    path: "/account/api-keys",
    description: "Account API key management for CI and automation",
  },
  {
    name: "report-overview",
    path: "/reports/{ZEROQUARRY_DOCS_SCAN_ID}/",
    description: "Report overview with findings, lineage, and review controls",
    requiredEnv: ["ZEROQUARRY_DOCS_SCAN_ID"],
  },
  {
    name: "finding-detail",
    path: "/reports/{ZEROQUARRY_DOCS_SCAN_ID}/findings/{ZEROQUARRY_DOCS_FINDING_ID}",
    description: "Finding detail with evidence, PoC, review state, and follow-up actions",
    requiredEnv: ["ZEROQUARRY_DOCS_SCAN_ID", "ZEROQUARRY_DOCS_FINDING_ID"],
  },
  {
    name: "report-export",
    path: "/reports/{ZEROQUARRY_DOCS_SCAN_ID}/export",
    description: "Report export options and filters",
    requiredEnv: ["ZEROQUARRY_DOCS_SCAN_ID"],
  },
  {
    name: "disclosures-list",
    path: "/disclosures",
    description: "Disclosure tracker list view",
  },
  {
    name: "disclosure-detail",
    path: "/disclosures/{ZEROQUARRY_DOCS_DISCLOSURE_ID}",
    description: "Disclosure detail with timeline and reporting metadata",
    requiredEnv: ["ZEROQUARRY_DOCS_DISCLOSURE_ID"],
  },
];

function env(name, fallback = "") {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : fallback;
}

function baseUrl() {
  return env("ZEROQUARRY_BASE_URL", DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function authStatePath() {
  return path.resolve(env("ZEROQUARRY_AUTH_STATE", DEFAULT_AUTH_STATE));
}

function outputDir() {
  return path.resolve(env("ZEROQUARRY_SCREENSHOT_DIR", DEFAULT_OUTPUT_DIR));
}

function viewport() {
  return {
    width: Number(env("ZEROQUARRY_SCREENSHOT_WIDTH", "1440")),
    height: Number(env("ZEROQUARRY_SCREENSHOT_HEIGHT", "1000")),
  };
}

function cookieDomain() {
  try {
    return new URL(baseUrl()).hostname;
  } catch {
    return "console.zeroquarry.com";
  }
}

function missingRequiredEnv(target) {
  const names = target.requiredEnv || [];
  return names.filter((name) => !env(name));
}

function resolvePathTemplate(pathTemplate) {
  return pathTemplate.replace(/\{([A-Z0-9_]+)\}/g, (_match, name) => env(name));
}

module.exports = {
  ROOT_DIR,
  SESSION_COOKIE_NAME,
  authStatePath,
  baseUrl,
  cookieDomain,
  missingRequiredEnv,
  outputDir,
  resolvePathTemplate,
  screenshotTargets,
  viewport,
};
