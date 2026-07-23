# 小车有解官网

面向女性用户、手机端优先的小车生活设计品牌网站。

当前为**本地原型阶段**：未推送 GitHub、未创建 Cloudflare 项目、未绑定正式域名。

## 技术栈

- Astro 7
- TypeScript
- Astro Content Collections
- 原生 CSS（品牌 token、响应式布局与无障碍状态）
- 目标部署：Cloudflare Pages 静态站点

## 产品原则

- 女性用户优先，但不做刻板粉色化或少女化模板。
- 先让人喜欢和理解生活场景，再进入参数与验证。
- 手机端先完成，再向桌面端扩展。
- A10 是当前内容切口，不是全站永久视觉母题。
- 概念、资料研究、实车测量、已安装和长期验证必须明确标注。

## 本地运行

```bash
npm install
npm run dev
```

开发服务器遵循仓库 `AGENTS.md`：

```bash
./node_modules/.bin/astro dev --background
./node_modules/.bin/astro dev status
./node_modules/.bin/astro dev stop
```

## 验证

```bash
npm run validate   # Astro 类型检查 + 生产构建
npm run smoke      # 真实 Chrome 手机视口、导航、图片、样例页、溢出与 axe 无障碍检查
npm run capture    # 生成手机端与桌面端验收截图
```

验收截图保存在本地 `artifacts/`，不应作为正式站点资源发布。

## 内容目录

```text
src/content/solutions/   生活方案与现实审查内容
src/pages/               页面与动态路由
src/components/          导航、页脚、状态组件
src/styles/global.css    全站设计 token 和响应式规则
public/brand/            正式品牌资产的网页副本
public/images/           经批准用于原型的内容图片副本
```

## 发布边界

以下动作必须经过用户单独确认：

1. 推送到公开 GitHub 仓库；
2. 创建或连接 Cloudflare Pages；
3. 绑定 `xiaocheyoujie.com`；
4. 公开任何新文章或对外文案。
