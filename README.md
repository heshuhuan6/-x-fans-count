# X 粉丝数显示 / X Follower Count

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> 在 X 的信息流和用户列表中，直接显示每个账号的粉丝数。
> Show follower counts directly in the X timeline and user lists.

---

## 中文

### 简介

X 网页版不会在信息流里直接展示用户的粉丝数量，想看只能点进主页。这个 Chrome 插件会在每条推文作者、关注者列表等用户名的下方，加一行蓝色小字「粉丝 X万」。

灵感来自 [@yiren_ai 的这条推文](https://x.com/yiren_ai/status/2108490929787322455)。

### 原理

X 网页自己发出的 GraphQL 请求里，本来就带了每个用户的 `followers_count` 字段——根本不需要申请 API Key：

- `inject.js` 以 MAIN world 在页面最早期注入，劫持 `window.fetch` / `XMLHttpRequest`，从响应里提取 `{screen_name, followers_count}`，经 `postMessage` 传给内容脚本；
- `content.js` 维护「用户名 → 粉丝数」映射，用 `MutationObserver` 监听动态加载的推文和用户卡片，插入徽标；
- 数字格式：≥ 1 万显示 `17.6万`，不足 1 万显示千分位 `1,874`。

全程只读取 X 页面自身的网络响应，不发送任何外部请求，不需要任何敏感权限。

### 使用方式

**安装**

1. 下载本仓库代码（点击 Code → Download ZIP 后解压，或 `git clone https://github.com/heshuhuan6/-x-fans-count.git`）；
2. 打开 `chrome://extensions`，右上角开启「开发者模式」；
3. 点击「加载已解压的扩展程序」，选择解压后的文件夹；
4. 需要 Chrome 111 及以上（用到了 Manifest V3 的 `world: "MAIN"` 注入）。

**使用**

- 打开 [x.com](https://x.com) 刷信息流，每个账号用户名下方会自动出现蓝色「粉丝 X万」；
- 粉丝数随页面请求返回逐步出现，刚加载时可能先显示「粉丝 …」，数据到了会自动刷新；
- 覆盖位置：首页时间线、推文详情页、关注者 / 正在关注列表、Verified Followers 列表、搜索页用户卡片等。

**卸载**

- 在 `chrome://extensions` 里关闭或移除本插件即可。

### 文件结构

| 文件 | 说明 |
|---|---|
| `manifest.json` | 插件清单（Manifest V3，无敏感权限） |
| `inject.js` | 页面上下文脚本：拦截 X 自身 GraphQL 响应、提取粉丝数 |
| `content.js` | 内容脚本：渲染「粉丝 X万」徽标 |
| `LICENSE` | MIT 开源协议 |

### 注意事项

- 粉丝数来自 X 网页自己的接口返回，和点进主页看到的一致；
- X 改版（DOM 结构或接口字段变化）可能导致插件失效，欢迎提 Issue / PR。

### 开源协议

MIT，详见 [LICENSE](LICENSE)。

---

## English

### Introduction

The X web app doesn't show follower counts in the timeline — you have to open each profile to see them. This Chrome extension adds a small blue line like "粉丝 17.6万" (followers: 176K) under every username in tweets and user lists.

Inspired by [this tweet from @yiren_ai](https://x.com/yiren_ai/status/2108490929787322455).

### How it works

X's own GraphQL responses already include a `followers_count` field for every user — no API key needed:

- `inject.js` is injected as early as possible (MAIN world) and patches `window.fetch` / `XMLHttpRequest` to extract `{screen_name, followers_count}` from responses, forwarding them to the content script via `postMessage`;
- `content.js` keeps a screen-name → follower-count map and uses a `MutationObserver` to render the badge under usernames in dynamically loaded tweets and user cards;
- Number formatting: counts ≥ 10,000 render as `17.6万` (176K); smaller counts use thousands separators like `1,874`.

It only reads X's own network responses, sends nothing anywhere else, and requests no sensitive permissions.

### Usage

**Install**

1. Download this repo (Code → Download ZIP and unzip, or `git clone https://github.com/heshuhuan6/-x-fans-count.git`);
2. Open `chrome://extensions` and enable "Developer mode" (top right);
3. Click "Load unpacked" and select the unzipped folder;
4. Requires Chrome 111+ (uses Manifest V3 `world: "MAIN"` injection).

**Use**

- Open [x.com](https://x.com) and scroll — a blue "粉丝 X万" line appears under each username automatically;
- Counts appear progressively as page requests resolve; you may briefly see "粉丝 …" before the data arrives;
- Covered areas: home timeline, tweet detail pages, followers / following lists, Verified Followers lists, search result user cards, etc.

**Uninstall**

- Disable or remove the extension at `chrome://extensions`.

### File structure

| File | Description |
|---|---|
| `manifest.json` | Extension manifest (Manifest V3, no sensitive permissions) |
| `inject.js` | Page-context script: intercepts X's GraphQL responses, extracts follower counts |
| `content.js` | Content script: renders the follower-count badge |
| `LICENSE` | MIT license |

### Notes

- Counts come from X's own API responses, identical to what you'd see on the profile page;
- If X changes its DOM structure or API fields, the extension may break — Issues / PRs are welcome.

### License

MIT — see [LICENSE](LICENSE).
