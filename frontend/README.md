# React 前端入口

日常联调优先打开电脑端。macOS 双击项目根目录的 `启动本地环境-连后端.command`，会从电脑端产品首页进入；启动器也会列出供同一 Wi-Fi 下的手机使用的地址。

| 入口 | 启动位置 | 单文件演示 |
| --- | --- | --- |
| 电脑（默认） | 根地址或 `/?client=desktop`，从产品首页进入 | `dist-single/demo-desktop.html` 或兼容入口 `demo.html` |
| 手机 | `/?client=mobile`，直接进登录页 | `dist-single/demo-mobile.html`，预填演示账号 |

两个入口复用 React 路由和业务组件，布局随浏览器可用宽度适配。电脑上验收手机版时使用浏览器的手机视口。指定了工作台等页面的 hash 深链接时，刷新会保留当前位置。

两个后端就绪后，可在本目录运行 `npm run dev:desktop` 或 `npm run dev:mobile` 打开对应入口。运行 `npm run build:single` 生成离线演示包。

目录划分、路由与页面对照、数据分层与「新增代码放哪」见 [STRUCTURE.md](./STRUCTURE.md)。

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
