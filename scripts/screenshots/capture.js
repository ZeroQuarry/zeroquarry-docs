"use strict";

const path = require("path");
const {
  baseUrl,
  missingRequiredEnv,
  outputDir,
  resolvePathTemplate,
  screenshotTargets,
} = require("./config");
const {
  assertSignedIn,
  maskedScreenshot,
  newBrowser,
  newContext,
} = require("./helpers");

async function captureTarget(page, target, targetPath, filePath) {
  const response = await page.goto(targetPath, { waitUntil: "networkidle" });
  if (new URL(page.url()).pathname === "/login") {
    throw new Error(`Auth expired while capturing ${target.name}.`);
  }
  const requestedUrl = new URL(targetPath, baseUrl());
  const currentUrl = new URL(page.url());
  const sameDocumentNavigation =
    !response &&
    currentUrl.origin === requestedUrl.origin &&
    currentUrl.pathname === requestedUrl.pathname;
  if ((!response && !sameDocumentNavigation) || (response && !response.ok())) {
    const status = response ? response.status() : "no response";
    throw new Error(
      `Could not capture ${target.name}: ${targetPath} returned ${status}. ` +
        "Check that the docs account has access to this feature."
    );
  }
  // A server-side redirect to a different page (e.g. a gated surface
  // bouncing back to the project page) would otherwise be captured as
  // if it were the requested view. Treat that as a failure unless the
  // target opted in (the workspace target follows "/" to the project).
  if (!target.allowRedirect && currentUrl.pathname !== requestedUrl.pathname) {
    throw new Error(
      `Could not capture ${target.name}: ${targetPath} redirected to ${page.url()}. ` +
        "The docs account likely cannot access this surface."
    );
  }
  if (typeof target.prepare === "function") {
    await target.prepare(page);
  }
  await maskedScreenshot(page, filePath);
  console.log(`Captured ${target.name}: ${filePath}`);
}

async function main() {
  const browser = await newBrowser();

  try {
    const context = await newContext(browser);
    const page = await context.newPage();
    const skipped = [];
    const requestedNames = (process.env.ZEROQUARRY_SCREENSHOT_ONLY || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const targets = requestedNames.length
      ? screenshotTargets.filter((target) => requestedNames.includes(target.name))
      : screenshotTargets;

    if (requestedNames.length && targets.length !== new Set(requestedNames).size) {
      const known = new Set(screenshotTargets.map((target) => target.name));
      const unknown = requestedNames.filter((name) => !known.has(name));
      throw new Error(`Unknown screenshot target(s): ${unknown.join(", ")}`);
    }

    await assertSignedIn(page);

    for (const target of targets) {
      const missing = missingRequiredEnv(target);
      if (missing.length) {
        skipped.push({ target, missing });
        console.log(
          `Skipped ${target.name}: missing ${missing.join(", ")}`
        );
        continue;
      }

      const filePath = path.join(outputDir(), `${target.name}.png`);
      const targetPath = resolvePathTemplate(target.path);
      try {
        await captureTarget(page, target, targetPath, filePath);
      } catch (error) {
        // A single broken surface (tier-gated page, changed selector,
        // transient failure) should not abort the remaining captures.
        skipped.push({ target, missing: [String(error.message || error)] });
        console.log(`Failed ${target.name}: ${error.message || error}`);
      }
    }

    if (skipped.length) {
      console.log("");
      console.log("Skipped targets:");
      for (const item of skipped) {
        console.log(
          `- ${item.target.name}: ${item.missing.join(", ")}`
        );
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`Screenshots captured from ${baseUrl()}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
