const {themes} = require("prism-react-renderer");

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "ZeroQuarry Docs",
  tagline: "Technical documentation for the ZeroQuarry cloud platform",
  favicon: "img/favicon.png",

  url: "https://docs.zeroquarry.com",
  baseUrl: "/",
  organizationName: "eskibars",
  projectName: "zeroquarry-docs",
  trailingSlash: false,

  onBrokenLinks: "throw",
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          routeBasePath: "/",
          sidebarPath: require.resolve("./sidebars.js"),
          docItemComponent: "@theme/ApiItem",
          editUrl: "https://github.com/eskibars/zeroquarry-docs/edit/main/",
        },
        blog: false,
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      },
    ],
  ],

  plugins: [
    [
      "docusaurus-plugin-openapi-docs",
      {
        id: "api",
        docsPluginId: "classic",
        config: {
          zeroquarry: {
            specPath: "static/openapi/zeroquarry.yaml",
            outputDir: "docs/api",
            downloadUrl: "/openapi/zeroquarry.yaml",
            showInfoPage: false,
            showSchemas: false,
            sidebarOptions: {
              groupPathsBy: "tag",
              categoryLinkSource: "tag",
              sidebarCollapsed: false,
            },
          },
        },
      },
    ],
  ],

  themes: ["docusaurus-theme-openapi-docs"],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: "img/wordmark.png",
      colorMode: {
        defaultMode: "dark",
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: "",
        logo: {
          alt: "ZeroQuarry",
          src: "img/wordmark.png",
        },
        items: [
          {
            type: "docSidebar",
            sidebarId: "userSidebar",
            position: "left",
            label: "Docs",
          },
          {
            type: "docSidebar",
            sidebarId: "apiSidebar",
            position: "left",
            label: "API Reference",
          },
          {
            href: "https://console.zeroquarry.com",
            label: "Console",
            position: "right",
          },
          {
            href: "https://zeroquarry.com",
            label: "Website",
            position: "right",
          },
        ],
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "Product",
            items: [
              {label: "Console", href: "https://console.zeroquarry.com"},
              {label: "API gateway", href: "https://api.zeroquarry.com"},
            ],
          },
          {
            title: "Reference",
            items: [
              {label: "Remote scan safety", to: "/scans/remote-targets"},
              {label: "Data handling", to: "/security/data-handling"},
            ],
          },
        ],
        copyright: `Copyright ${new Date().getFullYear()} ZeroQuarry.`,
      },
      prism: {
        theme: themes.github,
        darkTheme: themes.dracula,
        additionalLanguages: ["bash", "json", "yaml"],
      },
      api: {
        authPersistance: "localStorage",
        requestCredentials: "omit",
        requestTimeout: 60000,
      },
    }),
};

module.exports = config;
