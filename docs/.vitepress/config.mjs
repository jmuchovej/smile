import { sub } from "@mdit/plugin-sub";
import footnote from "markdown-it-footnote";
import Mark from "markdown-it-mark";
import { defineConfig } from "vitepress";

import { version } from "../../package.json";

export default defineConfig({
  lang: "en-US",
  title: "🫠 Smile.",
  description: "a gureckislab joint.",
  head: [["link", { rel: "icon", href: "/favicon.ico" }]],
  lastUpdated: true,
  markdown: {
    toc: {
      listType: "ol",
    },
    config: (md) => {
      md.use(sub);
      md.use(footnote);
      md.use(Mark);
    },
  },
  themeConfig: {
    outline: {
      level: "deep",
    },
    search: {
      provider: "local",
    },
    editLink: {
      pattern: "https://github.com/nyuccl/smile/edit/main/docs/:path",
      text: "Suggest changes to this page on GitHub",
    },
    nav: [
      { text: "gureckislab.org", link: "https://gureckislab.org" },
      {
        text: `v${version}`,
        items: [{ text: "Release Notes", link: "https://github.com/nyuccl/smile/releases" }],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/NYUCCL/smile" },
      { icon: "twitter", link: "https://twitter.com/todd_gureckis" },
    ],
    sidebar: [
      {
        text: "Overview",
        items: [
          { text: "👋 Introduction", link: "/introduction" },
          { text: "🔑 Key Concepts", link: "/concepts" },
          { text: "👾 Required software", link: "/requirements" },
          { text: "🧪 Setup a new lab", link: "/labconfig" },
          { text: "👫 Adding a new user", link: "/adduser" },
          { text: "✨ Starting a new project", link: "/starting" },
          { text: "🙋‍♀️ Getting help", link: "/help" },
        ],
      },
      {
        text: "Designing and Testing",
        items: [
          { text: "🧑‍🎨 Overview", link: "/experimentdesign" },
          { text: "⚙️ Configuring", link: "/configuration" },
          { text: "👩‍💻 Developing", link: "/developing" },
          { text: "🧩 Components", link: "/components" },
          { text: "🏗️ Views", link: "/views" },
          { text: "🔀 Timeline and Design File", link: "/timeline" },
          { text: "🪜 Stepping Views", link: "/steps" },
          { text: "✍️ Autofill", link: "/autofill" },
          { text: "🎲 Randomization", link: "/randomization" },
          { text: "🖼️ Images and Videos", link: "/imagesvideo.md" },
          { text: "🧑‍🎨 Styling, CSS, and icons", link: "/style" },
          { text: "📦 Data storage", link: "/datastorage" },
          //{ text: '💰 Computing bonuses', link: '/bonuses' },
          //{ text: '🆘 Dealing with Errors', link: '/problems' },
          //{ text: '🐞 Automated Testing', link: '/testing' },
          //{ text: '🔌 Server-side Computations', link: '/server' },
        ],
      },
      {
        text: "Recruiting participants",
        items: [
          { text: "☁️ Deploying", link: "/deploying" },
          { text: "🙋 Recruitment Services", link: "/recruitment" },
          //{ text: '📈 Dashboard', link: '/dashboard' },
          //{ text: '😇 Ethical considerations', link: '/ethics' },
        ],
      },
      {
        text: "Analyzing data",
        items: [
          { text: "🧐 Analyzing data", link: "/analysis" },
          //{ text: '🤖 Quality control', link: '/qualitycontrol' },
          { text: "👩‍🏫 Presentation mode", link: "/presentation" },
        ],
      },
      {
        text: "APIs and Advanced Documentation",
        items: [
          { text: "📚 API", link: "/api" },
          { text: "🔠 Example patterns", link: "/examplepatterns" },
        ],
      },

      {
        text: "Contributing",
        items: [
          { text: "🙋Getting started contributing", link: "/gettingstarted" },
          { text: "✍️ Contributing to the docs", link: "/contributing" },
        ],
      },
      {
        text: "Misc",
        items: [{ text: "📄 Cheat sheet", link: "/cheatsheet" }],
      },
    ],
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2022-present Todd Gureckis",
    },
  },
});
