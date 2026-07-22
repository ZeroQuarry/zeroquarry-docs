"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");
const {
  SESSION_COOKIE_NAME,
  authStatePath,
  baseUrl,
  cookieDomain,
  viewport,
} = require("./config");

const SECRET_SELECTORS = [
  "input[type='password']",
  "input[type='email']",
  "input[name*='api' i]",
  "input[name*='key' i]",
  "input[name*='token' i]",
  "input[name*='secret' i]",
  "textarea[name*='key' i]",
  "textarea[name*='token' i]",
  "textarea[name*='secret' i]",
  "#runner-enrollment-command",
  "[data-screenshot-mask]",
];

const DEFAULT_EMAIL_REPLACEMENT = "example@example.com";
const HIDE_SELECTORS = [
  ".sidebar-top .sidebar-meta[title='Your current tier']",
];

async function newBrowser() {
  return chromium.launch({
    headless: process.env.ZEROQUARRY_SCREENSHOT_HEADLESS !== "0",
  });
}

async function newContext(browser) {
  const storageState = authStatePath();
  const options = {
    baseURL: baseUrl(),
    viewport: viewport(),
    deviceScaleFactor: 1,
  };

  if (fs.existsSync(storageState)) {
    options.storageState = storageState;
  }

  const context = await browser.newContext(options);
  const sessionCookie = (process.env.ZEROQUARRY_SESSION_COOKIE || "").trim();
  if (sessionCookie) {
    await context.addCookies([
      {
        name: SESSION_COOKIE_NAME,
        value: sessionCookie,
        domain: cookieDomain(),
        path: "/",
        httpOnly: true,
        secure: baseUrl().startsWith("https://"),
        sameSite: "Lax",
      },
    ]);
  }
  return context;
}

async function assertSignedIn(page) {
  await page.goto("/account", { waitUntil: "networkidle" });
  if (new URL(page.url()).pathname === "/login") {
    throw new Error(
      "ZeroQuarry auth is missing or expired. Run `npm run screenshots:auth`, " +
        "or set ZEROQUARRY_AUTH_STATE / ZEROQUARRY_SESSION_COOKIE."
    );
  }
}

async function preparePage(page) {
  const emailReplacement =
    (process.env.ZEROQUARRY_SCREENSHOT_EMAIL_REPLACEMENT || "").trim() ||
    DEFAULT_EMAIL_REPLACEMENT;
  const redactions = (process.env.ZEROQUARRY_SCREENSHOT_REDACTIONS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  await page.evaluate(
    ({ values, replacement, hideSelectors }) => {
      for (const selector of hideSelectors) {
        document.querySelectorAll(selector).forEach((element) => {
          element.remove();
        });
      }

      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT
      );
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const node of nodes) {
        let text = (node.nodeValue || "").replace(
          /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
          replacement
        );
        for (const value of values) {
          text = text.split(value).join("[redacted]");
        }
        node.nodeValue = text;
      }

      document
        .querySelectorAll("input, textarea")
        .forEach((element) => {
          if (typeof element.value === "string" && element.value) {
            element.value = element.value.replace(
              /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
              replacement
            );
          }
          if (typeof element.placeholder === "string" && element.placeholder) {
            element.placeholder = element.placeholder.replace(
              /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
              replacement
            );
          }
        });
    },
    {
      values: redactions,
      replacement: emailReplacement,
      hideSelectors: HIDE_SELECTORS,
    }
  );

  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        caret-color: transparent !important;
      }

      input[type='password'],
      input[type='email'],
      input[name*='api' i],
      input[name*='key' i],
      input[name*='token' i],
      input[name*='secret' i],
      textarea[name*='key' i],
      textarea[name*='token' i],
      textarea[name*='secret' i],
      #runner-enrollment-command,
      [data-screenshot-mask] {
        color: transparent !important;
        text-shadow: 0 0 10px rgba(0, 0, 0, 0.55) !important;
      }
    `,
  });
}

async function maskedScreenshot(page, filePath) {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await preparePage(page);

  const masks = SECRET_SELECTORS.map((selector) => page.locator(selector));
  await page.screenshot({
    path: filePath,
    fullPage: true,
    animations: "disabled",
    mask: masks,
    maskColor: "#111827",
  });
}

module.exports = {
  assertSignedIn,
  maskedScreenshot,
  newBrowser,
  newContext,
};
