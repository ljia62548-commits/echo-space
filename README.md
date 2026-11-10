# Echo Space

一个本地优先的个人博客。石墨灰、黄铜金，以及一张固定在背景里的主图；界面像摆在背景板上的仪表与纸片。

- 纯静态输出，没有数据库，没有外部服务。
- 壁纸固定在整个视口，内容区是摆在壁纸上的石墨灰数据面板，向下滚动时背景不会跟着移动。
- 首页不再铺文章列表，只保留首屏和一块下滑出现的待办便签板；文章从左侧目录进入。
- 便签支持勾选划掉，已完成的事项会在每天午夜自动清除，未完成的留到第二天。
- 便签数据保存在当前浏览器的 `localStorage`，不需要数据库。
- 内容保存在普通的 Markdown / JSON 文件里，随时可以用 VS Code 直接改。
- 本地自带 Studio，改文字、换图、管理目录、写文章都不用碰代码。
- 暂不部署，只在电脑本地运行。

> 每个文件做什么、想改东西去哪里，见 [docs/PROJECT-STRUCTURE.md](docs/PROJECT-STRUCTURE.md)。

## 快速开始

需要 Node.js 20 或更高版本。

```bash
npm install
npm run dev
```

打开：<http://127.0.0.1:4321>

停止服务：在终端按 `Ctrl + C`。

## 平板 / 手机访问

平板和电脑连同一个 Wi-Fi，然后在电脑上运行：

```bash
npm run dev:lan
```

终端会打印一个 Network 地址，例如：

```text
http://10.181.224.231:4322/
```

在平板浏览器里打开这个地址即可。

如果地址打不开：

1. 用 `ipconfig` 查看电脑当前 WLAN 的 IPv4 地址；
2. 确认平板没有连访客网络或蜂窝网络；
3. Windows 防火墙弹窗时允许 Node.js 访问「专用网络」；
4. 确认路由器没有开启 AP 隔离。

这个地址只适合在家庭局域网内临时阅读。不要把它映射到公网。平板可以阅读网站，但 Studio 的写入接口默认只信任 `localhost`，编辑仍然建议在电脑上进行。

## 发布到 GitHub Pages

这个项目现在使用 **项目站点**：

```text
仓库：https://github.com/ljia62548-commits/echo-space
地址：https://ljia62548-commits.github.io/echo-space/
```

站内链接和图片都通过 `src/lib/url.ts` 的 `withBase()` 加上 `/echo-space/` 前缀，因此项目子路径也能正常工作。

1. 在 GitHub 仓库 **Settings → Pages**，把 **Build and deployment → Source** 设为 **GitHub Actions**；
2. 添加远程仓库并推送：

```bash
git remote add origin https://github.com/ljia62548-commits/echo-space.git
git branch -M main
git push -u origin main
```

3. 之后每次 push 到 `main`，`.github/workflows/deploy.yml` 会自动构建并发布。

首次发布完成后，地址是：

```text
https://ljia62548-commits.github.io/echo-space/
```

构建时会自动排除 `/studio/`。线上只能阅读，写文章仍然在本地进行，改完重新 push 即可。

如果以后换仓库名，工作流会自动把仓库名作为 `BASE_PATH`。如果配置自定义域名，在仓库 **Settings → Secrets and variables → Actions → Variables** 里设置 `SITE_URL`（例如 `https://example.com`）和 `BASE_PATH`（`/`）即可。

## 内容编辑

打开 <http://127.0.0.1:4321/studio/>：

- **文章**：新建、编辑、删除、草稿、分类、标签、封面、Markdown 正文；
- **站点**：站名、作者、描述、首屏主图与文案、目录管理（新增/改名/删除）、社交链接；
- **关于我**：头像、简介、Now、工具箱、时间线、兴趣、社交链接。

Studio 里的修改同样直接写入项目文件。文章保存后可以在新标签页预览。

## 内容放在哪

```text
src/
  data/
    site.json         站点名称、首屏、导航、社交链接
    profile.json      关于我页面的全部资料
  content/posts/
    thinking/         Personal Thinking
    life/             Life and Game
    ai-tools/         AI Tools
    ml/               Machine Learning
  pages/              页面路由
  components/         页面组件
  styles/global.css   设计变量与全站样式
  styles/studio.css   Studio 样式
  integrations/
    studio-api.mjs    本地编辑接口（只在 npm run dev 时存在）
public/
  uploads/            首屏主图、封面、头像
assets/source/        你提供的原始图片（2560×1600）
docs/                 README 预览图
```

### 手写一篇新文章

在对应分类文件夹里新建一个 `.md` 文件，例如 `src/content/posts/thinking/my-note.md`：

```yaml
---
title: 标题
description: 一两句摘要
date: 2026-10-28
category: thinking
tags: [思考, 写作]
featured: false
draft: false
---

正文从这里开始。
```

`category` 必须是 `thinking`、`life`、`ai-tools`、`ml` 之一，并且与所在文件夹一致。

### 草稿

在 Frontmatter 里写 `draft: true`，或在 Studio 勾选「草稿」，文章不会出现在页面、RSS 和搜索里。

## 换首屏图片

当前主图：`public/uploads/echo-space-hero.jpg`（来自 `assets/source/echo-space-hero-original.jpg`，2560×1600）。

推荐直接：

1. `npm run dev`；
2. 打开 Studio → 站点；
3. 在「首屏主图」里更换图片；
4. 调整遮罩和焦点，保存。

也可以用同名文件覆盖 `public/uploads/echo-space-hero.jpg`。建议使用**横图（16:10）、至少 1920px 宽**；图片会固定在视口里，以 `cover` 铺满整个背景，其他比例也能用，但 16:10 的构图最完整。

背景是固定的：图片停在视口里，文章、栏目、归档等是摆在背景上的实心石墨灰面板，四周留出壁纸，滚动时从背景上滑过。`Echo Space` 下方是两行小标注「这世间噪声太大 / 在此留一方天地聆听自己」；首屏本身不再叠加大段文字。

## 改颜色

全站颜色集中在 `src/styles/global.css` 顶部的 `:root`：

```css
--bg: #0c0e0f;
--ink: #e4dfd5;           /* 暖白正文 */
--ink-strong: #f4efe5;    /* 暖白标题 */
--accent: #c49a55;        /* 黄铜金，主强调 */
--cyan: #7fd4e6;          /* 冷青，只用于焦点和状态 */
--accent-deep: #3a2f20;
```

文字统一使用 `--ink` / `--ink-strong`。大面板使用 `--panel` 实心石墨灰，不再使用毛玻璃。

## 构建与预览

```bash
npm run build
npm run preview
```

构建产物在 `dist/`。`/studio` 页面会一起构建，但本地编辑接口不会——部署到静态空间后，文章编辑功能不可用。这是有意的设计。

## 本地编辑接口的安全边界

- 只在 `astro dev` 中注册，构建后不存在；
- 服务绑定 `127.0.0.1`，并校验请求来源必须是 localhost；
- 图片类型、大小、文件路径都有校验；
- 不包含任何账号系统。

不要把这个开发服务器暴露到公网。

## 之后要推到 GitHub

目前没有远程仓库，也没有做部署。需要时：

```bash
git remote add origin <你的仓库地址>
git push -u origin main
```

如果要部署到 GitHub Pages，还需要另外配置静态托管的 base path，并把 `astro.config.mjs` 里的 `site` 改成线上地址。

## 技术栈

- [Astro 5](https://astro.build/) — 静态站点、内容集合、Markdown
- 原生 CSS + 少量原生 TypeScript，没有前端框架
- 本地编辑接口基于 Vite 中间件与 Node.js 文件系统

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 本地开发，<http://127.0.0.1:4321> |
| `npm run dev:lan` | 局域网访问，端口 `4322` |
| `npm run build` | 生成静态站点到 `dist/` |
| `npm run preview` | 预览构建结果 |
| `/studio/` | 本地内容管理 |
