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

async function main() {
  const browser = await newBrowser();

  try {
    const context = await newContext(browser);
    const page = await context.newPage();
    const skipped = [];

    await assertSignedIn(page);

    for (const target of screenshotTargets) {
      const missing = missingRequiredEnv(target);
      if (missing.length) {
        skipped.push({ target, missing });
        console.log(
          `Skipped ${target.name}: missing ${missing.join(", ")}`
        );
        continue;
      }

      const filePath = path.join(outputDir(), `${target.name}.png`);
      await page.goto(resolvePathTemplate(target.path), { waitUntil: "networkidle" });
      if (new URL(page.url()).pathname === "/login") {
        throw new Error(`Auth expired while capturing ${target.name}.`);
      }
      await maskedScreenshot(page, filePath);
      console.log(`Captured ${target.name}: ${filePath}`);
    }

    if (skipped.length) {
      console.log("");
      console.log("Skipped targets:");
      for (const item of skipped) {
        console.log(
          `- ${item.target.name}: set ${item.missing.join(", ")}`
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
