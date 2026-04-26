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
  const sidebarPath = path.join(__dirname, "api", "sidebar.js");
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
  apiSidebar: generatedApiSidebar(),
};
