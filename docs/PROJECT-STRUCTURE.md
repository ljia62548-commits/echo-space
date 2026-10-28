# Echo Space 项目结构说明

> 这份文档解释每个文件做什么，以及想改东西时应该去哪里。
> 文件名、目录名、关键类名可以直接在本文件里搜索。
> 行号会随着以后修改而漂移，所以优先用「文件名 + 关键词」定位。

## 首屏文字

首屏文字按中文逗号分成两列竖排，紧贴左侧菜单并上下错开，进入页面时逐字出现：

- 文字内容在 [site.json](../src/data/site.json#L7) 的 `hero.line`；
- 分列逻辑在 [Hero.astro](../src/components/Hero.astro)：按 `，` 拆分；
- 渲染在 `.hero__content` / `.hero__title` / `.hero__column`；
- 打字逻辑在 [app.ts](../src/scripts/app.ts) 的 `initTypewriter()`；
- 光标是当前列底部的竖线，由 `.hero__column.is-typing::after` 控制。

具体调整方法见 [调整首屏文字](#调整首屏文字)。

---

## 一、四层结构

```text
内容层   src/data + src/content      文字、图片、文章
结构层   src/pages + src/components  页面由哪些部分组成
表现层   src/styles                  颜色、字体、间距、动效
交互层   src/scripts + integrations  打字、搜索、本地编辑
```

日常改内容，优先用页面里的编辑模式或 `/studio/`；改布局和视觉，去 `pages` / `components` / `styles`。

---

## 二、完整目录树

```text
plog/
├─ src/
│  ├─ data/
│  │  ├─ site.json                 # 站点总配置：首屏、导航、社交、页脚
│  │  └─ profile.json              # 关于我：头像、简介、技能、时间线、Now
│  │
│  ├─ content/
│  │  ├─ posts/
│  │  │  ├─ thinking/              # Personal Thinking 的文章
│  │  │  ├─ life/                  # Life and Game
│  │  │  ├─ ai-tools/              # AI Tools
│  │  │  └─ ml/                    # Machine Learning
│  │  └─ content.config.ts         # 文章 Frontmatter 的字段规则
│  │
│  ├─ pages/                       # 一个文件对应一个网址
│  ├─ components/                  # 可复用的页面零件
│  ├─ layouts/                     # 全站 HTML 外壳
│  ├─ lib/                         # 读取内容、格式化日期等工具
│  ├─ scripts/                     # 浏览器里的交互逻辑
│  ├─ styles/                      # 全站样式
│  └─ integrations/                # 本地编辑接口
│
├─ public/
│  ├─ favicon.svg
│  └─ uploads/echo-space-hero.jpg  # 首屏图，浏览器地址是 /uploads/...
│
├─ assets/source/                  # 你提供的原图，不参与网站
├─ docs/
│  ├─ preview-home.jpg             # README 顶部预览图
│  └─ PROJECT-STRUCTURE.md         # 本文件
│
├─ astro.config.mjs
├─ package.json
├─ package-lock.json
├─ tsconfig.json
├─ .gitignore
└─ README.md
```

---

## 三、内容与数据

### `src/data/site.json`

全站配置中心。

| 字段 | 作用 |
| --- | --- |
| `name` | 站名。左上角 Logo、侧栏、页脚、SEO 都会读取它 |
| `author` | 作者名 |
| `description` | 站点默认描述，用于 SEO |
| `locale` | 页面语言，默认 `zh-CN` |
| `hero.line` | 首屏文字，按中文逗号分成两列竖排 |
| `hero.image` | 首屏图片地址 |
| `hero.position` | 图片焦点，例如 `50% 45%` |
| `hero.overlay` | 暗色遮罩浓度，0 到 1 |
| `nav` | 左侧菜单：`key`、`label`、`href`、`description` |
| `social` | 左侧栏底部的社交链接数组 |
| `footerNote` | 页脚那句短话 |

### `src/data/profile.json`

关于我页面的所有内容。

| 字段 | 作用 |
| --- | --- |
| `name` / `monogram` | 名字、头像里的缩写 |
| `headline` | 身份标签 |
| `intro` | 开头一句话介绍 |
| `location` / `status` | 所在地、当前状态 |
| `avatar` | 头像地址，留空则显示字母 |
| `bio` | 自我介绍段落数组 |
| `interests` | 兴趣标签 |
| `toolbox` | 工具箱分组，每组有 `group` 和 `items` |
| `timeline` | 时间线，每项有 `date`、`title`、`description` |
| `now` | 最近在 `building` / `learning` / `playing` 的事 |
| `links` | 关于我页面的社交链接 |

### `src/content.config.ts`

定义文章的 Frontmatter 规则。文章字段写错时，构建会报错。

支持字段：

```yaml
title: 标题
description: 摘要
date: 2026-10-28
category: thinking
tags: [思考, 写作]
featured: false
draft: false
cover: /uploads/cover.jpg
```

### `src/content/posts/`

文章源文件，一篇一个 `.md`。

| 文件 | 标题 |
| --- | --- |
| [thinking/why-i-write-again.md](../src/content/posts/thinking/why-i-write-again.md) | 为什么我又开始写博客 |
| [thinking/slow-is-a-strategy.md](../src/content/posts/thinking/slow-is-a-strategy.md) | 慢，是一种策略 |
| [thinking/attention-is-a-budget.md](../src/content/posts/thinking/attention-is-a-budget.md) | 注意力是一种预算 |
| [life/why-i-still-play-games.md](../src/content/posts/life/why-i-still-play-games.md) | 工作之后，我为什么还在打游戏 |
| [life/weekend-unfinished-code.md](../src/content/posts/life/weekend-unfinished-code.md) | 周末、游戏与一块没写完的代码 |
| [ai-tools/model-as-colleague.md](../src/content/posts/ai-tools/model-as-colleague.md) | 把模型当成同事，而不是搜索引擎 |
| [ai-tools/prompt-is-interface.md](../src/content/posts/ai-tools/prompt-is-interface.md) | 提示词不是咒语，是界面设计 |
| [ml/build-a-map-first.md](../src/content/posts/ml/build-a-map-first.md) | 学机器学习，先画地图再钻细节 |
| [ml/reproducible-experiments.md](../src/content/posts/ml/reproducible-experiments.md) | 让实验可复现：一份最小清单 |

`category` 必须和所在文件夹一致：`thinking`、`life`、`ai-tools`、`ml`。

---

## 四、页面路由（`src/pages`）

| 文件 | 对应网址 / 功能 |
| --- | --- |
| [index.astro](../src/pages/index.astro) | `/` 首页 |
| [about.astro](../src/pages/about.astro) | `/about/` 关于我 |
| [栏目页 index.astro](<../src/pages/[category]/index.astro>) | `/thinking/`、`/life/`、`/ai-tools/`、`/ml/` 栏目页 |
| [文章页 slug.astro](<../src/pages/[category]/[slug].astro>) | 单篇文章，例如 `/thinking/why-i-write-again/` |
| [tags/index.astro](../src/pages/tags/index.astro) | `/tags/` 全部标签 |
| [标签页 tag.astro](<../src/pages/tags/[tag].astro>) | 单个标签下的文章 |
| [archive.astro](../src/pages/archive.astro) | `/archive/` 按年份归档 |
| [search.astro](../src/pages/search.astro) | `/search/` 站内搜索 |
| [404.astro](../src/pages/404.astro) | 404 页面 |
| [studio/index.astro](../src/pages/studio/index.astro) | `/studio/` 本地管理后台 |
| [rss.xml.ts](../src/pages/rss.xml.ts) | `/rss.xml` RSS |
| [sitemap.xml.ts](../src/pages/sitemap.xml.ts) | `/sitemap.xml` 站点地图 |
| [robots.txt.ts](../src/pages/robots.txt.ts) | `/robots.txt` 爬虫规则 |

栏目页和文章页通过 `getStaticPaths()` 从 `site.json` 的 `nav` 和文章集合自动生成。新增栏目时，需要在 `nav` 里加一项，并建对应的文章文件夹。

---

## 五、组件、布局与工具

### `src/layouts/BaseLayout.astro`

全站 HTML 外壳：

- `<head>`：标题、描述、canonical、Open Graph、Twitter 卡片、favicon、RSS；
- 引入 `global.css`；
- 左侧栏、页脚、编辑按钮；
- 加载 `src/scripts/app.ts`。

### `src/components/`

| 文件 | 功能 |
| --- | --- |
| [Brand.astro](../src/components/Brand.astro) | 左上角站名，从 `site.json` 的 `name` 读取 |
| [Sidebar.astro](../src/components/Sidebar.astro) | 左侧固定竖向菜单、当前项高亮、文章数、社交/RSS/Edit、移动端顶栏和抽屉菜单。桌面端是透明的，只保留文字覆盖在背景图上，没有底板和右边框 |
| [Hero.astro](../src/components/Hero.astro) | 首屏：全屏图片、明暗渐变、两列竖排文字、打字容器 |
| [EditDock.astro](../src/components/EditDock.astro) | 仅本地开发：编辑页面、保存/取消、更换图片、遮罩和焦点调整 |
| [PostFeature.astro](../src/components/PostFeature.astro) | 首页精选文章卡片，第一张为大卡片 |
| [PostRow.astro](../src/components/PostRow.astro) | 栏目页/标签页的横向文章条目 |
| [Footer.astro](../src/components/Footer.astro) | 页脚：版权、RSS、归档、搜索、Studio、页脚短句 |

### `src/lib/`

| 文件 | 功能 |
| --- | --- |
| [content.ts](../src/lib/content.ts) | 读取文章、分类、标签、精选、阅读时长、文章 URL |
| [format.ts](../src/lib/format.ts) | 日期格式化、ISO 日期、XML 转义 |

---

## 六、交互与本地编辑

### `src/scripts/app.ts`

浏览器端交互总入口：

- 移动端菜单；
- 滚动状态、入场动画；
- **逐字打字**：`initTypewriter()`；
- 代码复制、目录高亮、复制链接；
- 站内搜索；
- 编辑模式与图片弹窗。

打字相关位置：

- 每字间隔：搜索 `68 + Math.random() * 34`；
- 开始前等待：搜索 `520`；
- 光标样式：`global.css` 里的 `.hero__column.is-typing::after`。

### `src/scripts/studio.ts`

`/studio/` 的后台逻辑：

- 文章列表、新建、保存、删除；
- 站点设置；
- 关于我表单；
- 工具箱、时间线、链接的逐行增删；
- 图片上传；
- 调用本地编辑接口。

### `src/integrations/studio-api.mjs`

本地编辑接口，只在 `npm run dev` 时运行，构建后不存在。

主要接口：

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `GET` | `/__studio/api/state` | 一次读取 site、profile、posts |
| `GET` | `/__studio/api/posts` | 文章列表 |
| `POST` | `/__studio/api/site` | 合并写入站点设置 |
| `POST` | `/__studio/api/profile` | 合并写入关于我 |
| `POST` | `/__studio/api/posts` | 新建或保存文章 |
| `DELETE` | `/__studio/api/posts` | 删除文章 |
| `POST` | `/__studio/api/upload` | 上传图片到 `public/uploads/` |

顶部的 `SITE_KEYS` / `PROFILE_KEYS` 是允许修改的顶层字段白名单。如果往 JSON 里加新的顶层字段，也要同步加进这里。

### `src/styles/`

| 文件 | 功能 |
| --- | --- |
| [global.css](../src/styles/global.css) | 全站样式。顶部是颜色变量；下面按 `/* sidebar */`、`/* hero */`、`/* selected writing */`、`/* article */`、`/* about */` 等注释分块 |
| [studio.css](../src/styles/studio.css) | 只作用于 `/studio/` 的后台样式 |

---

## 七、配置与静态资源

| 文件 | 功能 |
| --- | --- |
| [astro.config.mjs](../astro.config.mjs) | Astro 配置：站点地址、端口、关闭开发工具条、挂载本地编辑接口、代码高亮 |
| [package.json](../package.json) | 脚本和依赖 |
| [package-lock.json](../package-lock.json) | 依赖锁定，不要手改 |
| [tsconfig.json](../tsconfig.json) | TypeScript 配置 |
| [.gitignore](../.gitignore) | 排除自动生成目录 |
| [README.md](../README.md) | 使用说明 |
| [public/favicon.svg](../public/favicon.svg) | 浏览器标签页图标 |
| [public/uploads/echo-space-hero.jpg](../public/uploads/echo-space-hero.jpg) | 首屏实际图片 |
| [assets/source/echo-space-hero-original.jpg](../assets/source/echo-space-hero-original.jpg) | 原图备份，不参与网站 |
| [docs/preview-home.jpg](./preview-home.jpg) | README 预览图，不影响网站 |

`dist/`、`.astro/`、`node_modules/`、`.git/` 都是自动生成或工具目录，不要手改。

---

## 八、改东西速查

| 想改什么 | 去哪里 |
| --- | --- |
| 首屏文字（逗号分列） | `src/data/site.json` → `hero.line`，或页面 `Ctrl + E`/Studio |
| 打字速度 | `src/scripts/app.ts` → `68 + Math.random() * 34` |
| 开始前停顿 | `src/scripts/app.ts` → `520` |
| 打字光标 | `src/styles/global.css` → `.hero__column.is-typing::after` |
| 文字上下位置 | `src/styles/global.css` → `.hero--full .hero__content` 的 `padding-bottom` |
| 首屏图片 | 替换 `public/uploads/echo-space-hero.jpg`，或编辑模式上传 |
| 首屏亮度 | `src/styles/global.css` → `.hero--full .hero__bg` 的 `brightness()` |
| 首屏遮罩 | `src/data/site.json` → `hero.overlay` |
| 整体蓝色调 | `src/styles/global.css` 顶部 `:root` 的 `--bg`、`--bg-raised` 等 |
| 左侧菜单文字/顺序 | `src/data/site.json` → `nav` |
| 左侧菜单样式 | `src/styles/global.css` → `/* sidebar */`，结构在 `Sidebar.astro` |
| 站名/作者/描述/页脚 | `src/data/site.json` |
| 关于我内容 | `src/data/profile.json` 或 Studio |
| 新增文章 | `src/content/posts/<分类>/` 新建 `.md` |
| 首页精选 | 文章 Frontmatter 的 `featured: true` 和 `date` |
| 首页区块布局 | `src/pages/index.astro` |
| 文章详情页 | `src/pages/[category]/[slug].astro` |
| SEO / 分享卡片 | `src/layouts/BaseLayout.astro` |
| 端口号 | `astro.config.mjs` → `server.port` |
| 网站图标 | `public/favicon.svg` |
| README 预览图 | `docs/preview-home.jpg` |
| Studio 后台样式 | `src/styles/studio.css` |

---

## 调整首屏文字

### 改文字内容

改 [site.json](../src/data/site.json#L7) 的 `hero.line`，或者进入页面编辑模式 / Studio → 站点。

句子中的中文逗号会被 [Hero.astro](../src/components/Hero.astro) 拆成两列。例如「第一句，第二句」会变成右边「第一句」、左边「第二句」两列。想增加第三列，就再加一个逗号；不想要分列，就去掉逗号。

### 改字体

[global.css](../src/styles/global.css) 顶部：

```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
  "Microsoft YaHei", sans-serif;
--font-serif: Georgia, "Songti SC", "STSong", "Noto Serif SC", "Times New Roman",
  serif;
```

- 界面文字、正文、导航、About：`--font-sans`；
- 文章标题：`--font-serif`，英文用 Georgia，中文回退到宋体；
- 编号、日期、小标签：`--font-mono`。

文章标题的统一规则在 `.article-title, .post-feature__title, .post-row__title, ...` 这一组选择器里。

### 改字号

[global.css](../src/styles/global.css) 的 `.hero__title`：

```css
font-size: clamp(1.1rem, 2.2vw, 2rem);
```

- 第一个值是最小字号；
- 中间是随屏幕宽度变化的字号；
- 最后是桌面最大字号；
- 手机上还有一条单独的字号覆盖：`clamp(1rem, 4.6vw, 1.45rem)`。

### 改颜色 / 和背景融合

[global.css](../src/styles/global.css) 的 `.hero__title`：

```css
color: rgba(220, 226, 230, 0.72);
```

现在用的是一种带蓝灰倾向的半透明暗白，会透出一点背景图。想要更明显就提高最后一位透明度，想更淡就降低。

### 改位置

[global.css](../src/styles/global.css) 的 `.hero--full .hero__content`：

```css
padding: 0 0 0 calc(var(--sidebar-w) + 14px);
```

`14px` 决定文字离菜单栏有多近。改大就更远，改小就贴得更紧。

两列之间的间距在 `.hero__title` 的 `gap`。

### 让两列错开

[global.css](../src/styles/global.css)：

```css
.hero__column:first-child {
  margin-top: clamp(32px, 6vh, 64px);
}
```

`first-child` 是右边那句；调大这个值，右列会向下错得更多。想让左列下移，就改成 `:last-child`。

### 改竖排 / 横排

[global.css](../src/styles/global.css) 的 `.hero__column`：

```css
writing-mode: vertical-rl;
```

把 `vertical-rl` 改成 `horizontal-tb`，文字就会恢复横向排列。

`row-reverse` 控制两列的阅读顺序：第一句在右边、第二句在左边。改成 `row` 就会反过来。

### 改打字速度

[app.ts](../src/scripts/app.ts)：

```js
timer = window.setTimeout(step, 68 + Math.random() * 34);
```

每字约 68–102ms。开始前的停顿：

```js
timer = window.setTimeout(step, 520);
```

### 改光标

[global.css](../src/styles/global.css) 的 `.hero__column.is-typing::after`：

```css
content: "";
width: 1px;
height: 0.7em;
background: currentColor;
```

这是当前列底部的一条竖直光标。

### 不要逐字、直接显示整句

保留文字块，去掉每列 `<span>` 上的 `data-typewriter` 属性，或者把 `app.ts` 里 `initTypewriter()` 的调用注释掉。

### 暂时隐藏文字

如果又要露出整张图：

1. 注释 [Hero.astro](../src/components/Hero.astro) 里的 `.hero__content`；
2. 在同样位置加一个 `<h1 class="sr-only" id="hero-title">{hero.line}</h1>`，保留 SEO；
3. 在 `<section>` 上加 `hero--clean`，减少为文字准备的底部压暗。

---

## 九、常见坑

1. **不要改 `dist/`**。它是构建产物，下次构建会被覆盖。
2. **JSON 不能写注释**，最后一项不能多逗号。
3. **图片路径**：文件放 `public/uploads/`，网页里写 `/uploads/xxx.jpg`，不要带 `public/`。
4. **文章分类**：`category` 必须和文件夹名、`nav.key` 一致。
5. **改站名只改 `site.json`**：`Brand.astro` 已经改为读取 `site.name`。
6. **改文章文件名等于改 URL**，旧链接会失效。
7. **本地编辑接口只在 `npm run dev` 存在**，构建后的静态站点不能编辑。
8. 改完内容建议跑一次 `npm run build`，检查 Frontmatter 和 Markdown 是否合法。

---

## 十、常用命令

```bash
npm run dev       # 本地开发，http://127.0.0.1:4321
npm run build     # 构建到 dist/
npm run preview   # 预览构建结果
```

页面编辑：`Ctrl + E`。

Studio：<http://127.0.0.1:4321/studio/>。
