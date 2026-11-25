// 同一份内联应用，保留原入口 demo.html，并输出名称明确的电脑、手机包。
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';

const dist = new URL('../dist-single/', import.meta.url);
const source = new URL('index.html', dist);
for (const name of ['demo.html', 'demo-desktop.html']) {
  copyFileSync(source, new URL(name, dist));
}

const html = readFileSync(source, 'utf8');
if (!html.includes('<html lang="zh-CN">')) throw new Error('未找到应用文档根标签');
writeFileSync(new URL('demo-mobile.html', dist), html.replace('<html lang="zh-CN">', '<html lang="zh-CN" data-client="mobile">'));
