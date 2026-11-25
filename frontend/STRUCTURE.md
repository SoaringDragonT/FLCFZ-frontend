# 前端结构说明

> 目标：**一个功能的所有代码放在一处，改动时知道该动哪一层、不该动哪一层。**
> 本文只描述当前代码的划分与约定；接口字段见 [API.md](./API.md)，启动方式见 [README.md](./README.md)。

## 1. 目录职责

| 目录 | 放什么 | 不该放什么 |
| --- | --- | --- |
| `src/pages/` | 个人端路由页面（一个路由一个文件） | 管理端页面、可复用的通用组件 |
| `src/pages/first/` | 首次登录三步向导（问卷 → 补充 → 结果）与欢迎页外壳 | 其他页面 |
| `src/pages/me/` | 个人端「智能心理助手」三页：对话 / 心理档案 / 建议与行动 | 通用组件 |
| `src/admin/pages/` | 管理端路由页面 | 个人端页面 |
| `src/admin/components/` | 只在管理端复用的块（今日工作、预警徽标、离线提示等） | 个人端也会用到的东西 |
| `src/components/` | 跨页面复用的块：应用外壳 `AppShell`、卡片、图表外框、登录/主页插图组件等 | 只给某一个页面用的局部代码 |
| `src/services/` | 所有数据出入口：HTTP 封装、领域接口、本地存储、模拟数据接口 | JSX |
| `src/data/` | 静态内容与演示数据（量表题库、语料、示例记录） | 网络请求 |
| `src/hooks/` | 通用 Hook（主题、录音） | 业务页面逻辑 |
| `src/auth/` | 登录态、角色、入口路径判定 | 页面 UI |
| `src/utils/` | 纯函数工具（转场、音频编码） | 依赖 React 的代码 |
| `src/assets/` | 图片、字体等静态资源 | 代码 |

## 2. 路由与页面（两端对照）

| 功能 | 个人端 | 管理端 |
| --- | --- | --- |
| 首页 | `/personal/dashboard`（`pages/Dashboard.tsx`） | `/admin/dashboard`（`admin/pages/AdminDashboard.tsx`） |
| 筛查 | `/personal/screening`（`pages/DataCollection.tsx`，五个标签页） | `/admin/screening`、`/admin/data-collection`、`/admin/retrieval` |
| 记录 | `/personal/records`（`pages/ScreeningRecords.tsx`） | 合并在筛查管理里 |
| 预警 / 处置 | `/personal/alerts` | `/admin/agent-workbench`（预警队列 + 个案研判 + 随访） |
| 案例 | `/personal/cases`（我的档案） | `/admin/cases` |
| 复核任务 | `/personal/reviews` | `/admin/review`（数据审核） |
| 智能助手 | `/personal/me/chat`、`me/kg`、`me/feed` | `/admin/me/*`（对话 / 图谱 / 推送） |
| 账号 | `/personal/settings` | `/admin/settings` |

**历史兼容重定向**（不要当成新页面加功能，只保留跳转）：
`/auth → /login`、`/personal/diary → /personal/records`、`/personal/data-collection → /personal/screening`、
`/personal/retrieval → /personal/screening?tab=retrieval`、`/admin/alerts` 与 `/admin/judgement → /admin/agent-workbench`。

## 3. 数据分层

- 页面只调用 `services/*`，不直接写 `fetch`/`axios`。
- `services/http.ts`：请求封装、自动解包、401 处理。
- `services/api.ts`（个人端 `personalRequest`）与 `services/adminApi.ts`（管理端）是两套领域接口。
- `services/mockApi.ts` 是早期单体：**同时**放了演示数据与真实接口调用，新增功能请放进对应领域文件，不要再往里加。
- `services/steward.ts` / `kgProfile.ts` / `screeningAssessment.ts` 等按领域拆分，一个领域一个文件。

## 4. 样式约定

- 卡片统一 `ui-card`，按钮统一 `ui-button`，图标按钮 `ui-icon-button`；不要另写一套阴影/圆角。
- 主题只走 `hooks/useTheme.ts`（文档类名、meta 主题色、localStorage 都在里面），**不要在页面里再写一遍**。
- 页面标题/说明由 `AppShell` 统一渲染；页面内不要再重复写 `<h1>`。
- 桌面端「一屏」版面用 `.app-content:has(...)` 的填充规则（对话页、图谱页、建议与行动页），不要用写死的 `calc(100vh - 某一个魔法数)`。

## 5. 已知历史包袱（改动前先看一眼）

| 位置 | 情况 | 建议 |
| --- | --- | --- |
| `pages/DashboardV2.tsx` | 早期个人首页备选版，路由 `/personal/dashboard-v2` 存在但**菜单里没有入口** | 确认是否需要；不需要就删路由与文件 |
| `admin/pages/AgentWorkspaceV2.tsx` | 名字带 V2，但它是**唯一**在用的研判工作台 | 改名需同步 `App.tsx`，属低风险重构 |
| `services/mockApi.ts` | 演示数据 + 真实接口混在一起（1100+ 行） | 逐步拆到领域文件，不要再扩大 |
| `pages/Dashboard.tsx`、`pages/DataCollection.tsx`、`pages/Retrieval.tsx` | 单文件 800–1500 行，页面内混有较多局部组件 | 拆分时按「区块」拆到 `pages/<feature>/`，先删后改 |
| `components/ScrollToTop.tsx` 与 `components/BackToTop.tsx` | 名字相近、职责不同：前者路由切换复位滚动，后者是「回到顶部」按钮 | 不要合并 |
| `admin/pages/AdminScreening.tsx` / `AdminDataCollection.tsx` / `AdminRetrieval.tsx` | 管理端三个入口都在筛「记录/证据」，语义不同但容易混淆 | 改前先确认页面标题与面包屑 |

## 6. 新增代码放哪（三个问题）

1. **是一个路由页面吗？** → 个人端放 `pages/`（助手相关放 `pages/me/`），管理端放 `admin/pages/`。
2. **只有这一个页面用吗？** → 是：放在页面文件内部或同目录的子组件；否：个人端放 `components/`，管理端放 `admin/components/`。
3. **要发请求 / 读写本地存储吗？** → 一律进 `services/`，页面只拿结果。
