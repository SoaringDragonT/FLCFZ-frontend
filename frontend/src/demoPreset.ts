interface DemoPreset {
  route?: string;
  prefill?: { username?: string; password?: string };
}

function clientEntry(): 'desktop' | 'mobile' {
  const selected = new URLSearchParams(window.location.search).get('client');
  if (selected === 'desktop' || selected === 'mobile') return selected;
  return document.documentElement.dataset.client === 'mobile' ? 'mobile' : 'desktop';
}

export function readDemoPreset(): DemoPreset {
  if (typeof window === 'undefined') return {};
  const legacy = (window as Window & { __DEMO_PRESET__?: DemoPreset }).__DEMO_PRESET__;
  if (legacy && typeof legacy === 'object') return legacy;
  if (clientEntry() === 'desktop') return {};
  return {
    route: '#/login',
    prefill: import.meta.env.MODE === 'demo' ? { username: 'xiaoyu', password: '123456' } : undefined,
  };
}

export function applyDemoRoute(): void {
  const client = clientEntry();
  document.title += client === 'mobile' ? ' · 手机端' : ' · 电脑端';
  const { route } = readDemoPreset();
  if (route && ['', '#', '#/'].includes(window.location.hash)) {
    window.history.replaceState(window.history.state, '', route);
  }
}
