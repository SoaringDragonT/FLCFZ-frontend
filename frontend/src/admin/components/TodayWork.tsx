import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { getWorkQueue, USE_MOCK, type WorkQueue } from '../../services/adminApi';

const states: Record<string, string> = { proposed: '待审核', confirmed: '已分配', modified: '执行中' };

type Scope = 'all' | 'review' | 'today' | 'overdue';

/*
 * 今日工作
 * ========
 * 这是管理端每天进门第一眼看的地方，所以：
 *   1. 四个指标做成等宽等高的格子、数字放到最大 —— 之前第一格带副标题、
 *      其余三格只有一行，四块高度参差，重点反而看不出来（评审意见第 1 条）；
 *   2. 格子本身既是数字也是筛选器：点"待审核 / 今天到期 / 已逾期"直接过滤下方列表，
 *      生效的那一格高亮，不用再去下拉框里找同一件事；
 *   3. 「待分配预警」另有去向（预警页），本身做成跳转。
 */
export default function TodayWork() {
  const [data, setData] = useState<WorkQueue | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [scope, setScope] = useState<Scope>('all');

  useEffect(() => {
    let active = true;
    getWorkQueue()
      .then((value) => { if (active) { setData(value); setError(''); } })
      .catch((reason: unknown) => {
        if (active) { setData(null); setError(reason instanceof Error ? reason.message : '读取失败'); }
      });
    return () => { active = false; };
  }, [reload]);

  /* 每分钟 + 窗口重新聚焦时各刷新一次，避免停留一小时还看到旧数字 */
  useEffect(() => {
    let last = 0;
    const refresh = () => {
      const now = Date.now();
      if (now - last < 1000) return;
      last = now;
      setReload((n) => n + 1);
    };
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 60000);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const tasks = data?.tasks.filter((task) => scope === 'all' ||
    (scope === 'overdue' ? task.due_at < data.date :
      scope === 'today' ? task.due_at === data.date : task.state === 'proposed')) || [];

  const tiles = data ? [
    { key: 'alerts', label: '待分配预警', value: data.unassignedAlerts, note: `今日新增 ${data.todayUnassignedAlerts}`, to: '/admin/alerts', urgent: true },
    { key: 'review', label: '待审核草案', value: data.pendingReview, note: '等待人工确认' },
    { key: 'today', label: '今天到期', value: data.dueToday, note: '按截止日期统计' },
    { key: 'overdue', label: '已逾期', value: data.overdue, note: '需要优先处理', warn: true },
  ] as const : [];

  return (
    <section className="ui-card p-5 sm:p-6" aria-label="今日工作">
      {/* 头部：标题 + 统计口径 + 刷新 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">今日工作</h2>
          <p className="mt-1 text-xs text-slate-500">
            {USE_MOCK ? '演示模式未读取实际待办' : '业务任务 · 期限按北京时间日期统计'} {data?.date}
          </p>
        </div>
        <button className="ui-button py-2 text-xs" onClick={() => setReload((n) => n + 1)} title="重新读取待办">
          <RefreshCw className="h-3.5 w-3.5" />
          刷新待办
        </button>
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-rose-700">待办加载失败：{error}</p>}
      {!data && !error && <p className="mt-4 text-sm text-slate-500" role="status">正在加载待办…</p>}

      {data && (
        <>
          {/* 四个指标：等宽等高，数字优先 */}
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tiles.map((tile) => {
              const active = tile.key === scope;
              const warn = 'warn' in tile && tile.warn && tile.value > 0;
              const urgent = 'urgent' in tile && tile.urgent && tile.value > 0;
              const tone = warn ? 'text-warning-700' : active ? 'text-primary-700' : urgent ? 'text-primary-700' : 'text-slate-900';
              const skin = active
                ? 'border-primary-300 bg-primary-50/70'
                : warn
                  ? 'border-warning-200 bg-warning-50/60 hover:border-warning-300'
                  : urgent
                    ? 'border-primary-200 bg-primary-50/40 hover:border-primary-300'
                    : 'border-slate-200 bg-white hover:border-primary-200';
              const body = (
                <>
                  <span className="text-xs font-medium text-slate-500">{tile.label}</span>
                  <span className={`mt-2 text-[28px] font-semibold leading-none tabular-nums ${tone}`}>{tile.value}</span>
                  <span className="mt-2 text-[11px] text-slate-400">{tile.note}</span>
                </>
              );
              const shell = `flex flex-col items-start rounded-xl border p-4 text-left transition-colors ${skin}`;
              return 'to' in tile ? (
                <Link key={tile.key} to={tile.to} className={shell} title={`${tile.label}：去预警页处理`}>
                  {body}
                </Link>
              ) : (
                <button
                  key={tile.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setScope(active ? 'all' : tile.key)}
                  className={shell}
                  title={active ? '再点一次取消筛选' : `只看${tile.label}`}
                >
                  {body}
                </button>
              );
            })}
          </div>

          {/* 工具栏：当前范围 + 去处置；有筛选时可一键清除 */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <label className="flex items-center gap-2 text-slate-500">
              任务范围
              <select
                aria-label="任务范围"
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-700"
                value={scope}
                onChange={(event) => setScope(event.target.value as Scope)}
              >
                <option value="all">全部未完成</option>
                <option value="review">待审核</option>
                <option value="today">今天到期</option>
                <option value="overdue">已逾期</option>
              </select>
            </label>
            {scope !== 'all' && (
              <button type="button" className="text-xs text-slate-500 hover:text-primary-600" onClick={() => setScope('all')}>
                清除筛选
              </button>
            )}
            <Link
              className="ml-auto inline-flex items-center gap-1 text-primary-600 hover:underline"
              to="/admin/agent-workbench?scope=live&tab=tasks"
            >
              进入业务随访处置
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* 待办列表 */}
          {tasks.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
              当前范围没有待办任务。
              {data.unassignedAlerts > 0 && (
                <> 另有 <Link className="text-primary-600 hover:underline" to="/admin/alerts">{data.unassignedAlerts} 条未指派预警</Link> 需要在预警页处理。</>
              )}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {tasks.map((task) => (
                <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800">{task.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {states[task.state] || task.state} · {task.assignee || '待分配'} · 计划 {task.due_at}
                    </p>
                  </div>
                  <Link
                    className="shrink-0 text-primary-600 hover:underline"
                    to={task.caseId ? '/admin/cases' : '/admin/agent-workbench?scope=live&tab=tasks'}
                  >
                    查看 →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
