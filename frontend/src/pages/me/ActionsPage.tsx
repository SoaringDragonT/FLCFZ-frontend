import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import StewardPanel from '../../components/StewardPanel';
import ActionPlanCard from '../../components/ActionPlanCard';
import { stewardApi } from '../../services/steward';

/*
 * 建议与行动
 * ==========
 * 版面（评审意见：方框对齐、填满版面、不随内容变高）：
 *   · 桌面端左右两栏等高，并撑满「视口 − 顶栏 − 页面标题」的剩余高度（见 index.css .feed-split）；
 *   · 卡片面积固定，内容多少都在卡片内部滚动，不会因为内容变少而缩水、变多而撑高；
 *   · 宽屏 3 : 2：左边建议与跟进，右边当前行动计划；窄屏单栏，行动计划排在前面。
 *
 * 四个入口（心理档案 / 建议与行动 / 记忆设置 / 记录依据）：
 *   · 做成与「更新分析」同样的描边按钮；
 *   · 点击后左侧内容保持不变，把对应内容放到右边、覆盖原来的行动计划；
 *   · 右侧面板右上角有叉键，点一下退回行动计划。
 */
type Detail = 'profile' | 'summary' | 'settings' | 'records';

const ENTRIES: { key: Detail; label: string }[] = [
  { key: 'profile', label: '查看心理档案' },
  { key: 'summary', label: '建议与行动' },
  { key: 'settings', label: '记忆设置' },
  { key: 'records', label: '查看记录依据' },
];

/* 与 StewardPanel 里的「更新分析」按钮同一套样式 */
const BTN = 'inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-primary-50 hover:text-primary-700 disabled:opacity-50';

export default function ActionsPage() {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const asideRef = useRef<HTMLDivElement>(null);

  /* 窄屏上详情出现在下方，点完滚过去，避免"点了没反应" */
  useEffect(() => {
    if (detail && window.matchMedia('(max-width: 1279px)').matches) {
      asideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [detail]);

  const refresh = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setNotice('');
    try {
      await stewardApi.refresh();
      setNotice('已加入后台更新队列');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '更新失败，请稍后重试');
    } finally {
      setBusy(false);
    }
  }, [busy]);

  return (
    <div className="feed-split grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">

      {/* ---------- 左：为您准备的建议与跟进（内容滚动，入口按钮固定） ---------- */}
      <section className="order-2 ui-card flex min-h-0 flex-col xl:order-1">
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 pb-1 pt-5">
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-900">为您准备的建议与跟进</h2>
            <p className="mt-1 text-xs text-slate-500">近期状态看近 30 天；长期特点由您确认。所有理解都可以纠正。</p>
          </div>
          <button type="button" className={BTN} onClick={() => void refresh()} disabled={busy}>
            {busy ? '更新中…' : '更新分析'}
          </button>
        </header>
        {notice && <p className="px-5 pt-2 text-xs text-primary-700">{notice}</p>}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <StewardPanel mode="actions" bare />
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3">
          {ENTRIES.map((entry) => (
            <button
              key={entry.key}
              type="button"
              aria-pressed={detail === entry.key}
              onClick={() => setDetail(detail === entry.key ? null : entry.key)}
              className={`${BTN} ${detail === entry.key ? 'border-primary-300 bg-primary-50 text-primary-700' : ''}`}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </section>

      {/* ---------- 右：今日行动计划；打开入口时被详情面板覆盖 ---------- */}
      <div ref={asideRef} className="order-1 min-h-0 xl:order-2">
        {detail ? (
          <section className="ui-card flex h-full min-h-0 flex-col" aria-label="详情面板">
            <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-slate-800">
                {ENTRIES.find((entry) => entry.key === detail)?.label}
              </h2>
              <button
                type="button"
                onClick={() => setDetail(null)}
                aria-label="关闭并返回今日行动计划"
                title="关闭"
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <StewardPanel key={detail} mode={detail} bare openAll />
            </div>
          </section>
        ) : (
          <div className="h-full min-h-0 [&>section]:h-full [&>section]:overflow-y-auto">
            <ActionPlanCard />
          </div>
        )}
      </div>
    </div>
  );
}
