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

  customFields: {
    googleAnalyticsMeasurementId:
      process.env.GOOGLE_ANALYTICS_MEASUREMENT_ID || "G-ZRT44MWJT1",
    posthogProjectKey: process.env.POSTHOG_PROJECT_API_KEY || "",
    posthogPublicHost:
      process.env.POSTHOG_PUBLIC_HOST || "https://events.zeroquarry.com",
    posthogUiHost:
      process.env.POSTHOG_UI_HOST || "https://us.posthog.com",
  },

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
      "@docusaurus/plugin-content-docs",
      {
        id: "api",
        path: "api",
        routeBasePath: "api",
        sidebarPath: require.resolve("./api-sidebars.js"),
        docItemComponent: "@theme/ApiItem",
        editUrl: "https://github.com/eskibars/zeroquarry-docs/edit/main/",
      },
    ],
    [
      "docusaurus-plugin-openapi-docs",
      {
        id: "openapi",
        docsPluginId: "api",
        config: {
          zeroquarry: {
            specPath: "static/openapi/zeroquarry.yaml",
            outputDir: "api",
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
        respectPrefersColorScheme: false,
      },
      navbar: {
        title: "",
        logo: {
          alt: "ZeroQuarry",
          src: "img/wordmark_light.png",
          srcDark: "img/wordmark_dark.png",
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
            docsPluginId: "api",
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
          {
            title: "Social",
            items: [
              {label: "LinkedIn", href: "https://www.linkedin.com/company/zeroquarry/"},
              {label: "Discord", href: "https://discord.gg/PygTTeuU"},
              {label: "GitHub", href: "https://github.com/ZeroQuarry/"},
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
        authPersistence: "localStorage",
        requestCredentials: "omit",
        requestTimeout: 60000,
      },
    }),
};

module.exports = config;
