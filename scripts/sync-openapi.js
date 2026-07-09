const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const siblingProductDirs = ["ZeroQuarry", "zeroquarry", "security-bug-finder"];
const discoveredSpecPath = siblingProductDirs
  .map((dir) => path.resolve(repoRoot, "..", dir, "static", "ZeroQuarry.spec.yml"))
  .find((candidate) => fs.existsSync(candidate));
const defaultSpecPath = discoveredSpecPath || path.resolve(
  repoRoot,
  "..",
  "ZeroQuarry",
  "static",
  "ZeroQuarry.spec.yml",
);
const sourceSpec = path.resolve(
  process.env.ZEROQUARRY_OPENAPI_SPEC ||
    (process.env.ZEROQUARRY_APP_DIR
      ? path.join(process.env.ZEROQUARRY_APP_DIR, "static", "ZeroQuarry.spec.yml")
      : defaultSpecPath),
);
const destSpec = path.join(repoRoot, "static", "openapi", "zeroquarry.yaml");

fs.mkdirSync(path.dirname(destSpec), {recursive: true});

if (!fs.existsSync(sourceSpec)) {
  if (fs.existsSync(destSpec)) {
    console.warn(
      `[sync-openapi] Source spec not found at ${sourceSpec}. Using existing ${destSpec}.`,
    );
    process.exit(0);
  }
  console.error(`[sync-openapi] Source spec not found: ${sourceSpec}`);
  console.error(
    "[sync-openapi] Set ZEROQUARRY_OPENAPI_SPEC or ZEROQUARRY_APP_DIR when building outside the sibling repo layout.",
  );
  process.exit(1);
}

fs.copyFileSync(sourceSpec, destSpec);
console.log(`[sync-openapi] Copied ${sourceSpec} -> ${destSpec}`);
