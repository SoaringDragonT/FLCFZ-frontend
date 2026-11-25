import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { applyDemoRoute } from './demoPreset'

applyDemoRoute()

// 使用 HashRouter：路由在 URL hash 中（/#/auth），GitHub Pages 下刷新/直达
// 深层路由不再返回 404（避免 SPA 路由 404 状态码问题）。
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)

/* 首次加载的进场动画（.page-enter）只在这一次播。
   挂载 400ms 后打上标记，之后客户端路由切换重新挂载的页面就不再命中那条规则
   —— 否则每次切页整页（含顶栏）都会从 opacity:0 再淡入一遍，
   连点按钮时看着像抽搐（详见 index.css 里 .page-enter 那段说明）。 */
window.setTimeout(() => document.documentElement.classList.add('app-booted'), 400)
