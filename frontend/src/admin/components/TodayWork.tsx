import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { getWorkQueue, USE_MOCK, type WorkQueue } from '../../services/adminApi';

const states: Record<string, string> = { proposed: '待审核', confirmed: '已分配', modified: '执行中' };

type Scope = 'all' | 'review' | 'today' | 'overdue';

/*
 * 今日工作 =「现在先处理什么」
 * ==========================
 * 评审意见（第 1 条）：四个等宽数字格子只是把统计摆整齐，并没有回答首屏该回答的问题。
 * 所以这里以任务为主体：
 *   · 有待办 → 先列逾期、今天到期的具体任务，每条都带「查看任务」；
 *   · 有未分配预警 → 单独一条「去分配」，这是唯一必须先做动作的事；
 *   · 什么都为 0 → 整块收成一行「今日暂无待处理事项」，不再占首屏；
 *   · 数字统计缩成底部一行小字，刷新与范围筛选降为次要操作。
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

  if (error) {
    return (
      <section className="ui-card p-5" aria-label="今日工作">
        <p role="alert" className="text-sm text-rose-700">待办加载失败：{error}</p>
      </section>
    );
  }
  if (!data) {
    return (
      <section className="ui-card p-5" aria-label="今日工作">
        <p className="text-sm text-slate-500" role="status">正在加载待办…</p>
      </section>
    );
  }

  const date = data.date;
  const pending = data.tasks.filter((task) => scope === 'all' || (scope === 'overdue'
    ? task.due_at < date
    : scope === 'today' ? task.due_at === date : task.state === 'proposed'));
  const overdue = pending.filter((task) => task.due_at < date);
  const dueToday = pending.filter((task) => task.due_at === date);
  const urgent = [...overdue, ...dueToday];

  /* 待办、未分配预警都为 0：整块收成一行，不再占首屏（评审意见第 1 条） */
  const idle = !data.tasks.length && data.unassignedAlerts === 0;
  if (idle) {
    return (
      <section className="ui-card flex flex-wrap items-center justify-between gap-3 px-5 py-4" aria-label="今日工作">
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success-600" />
          今日暂无待处理事项
          <span className="text-xs text-slate-400">{date}</span>
        </p>
        <button
          type="button"
          onClick={() => setReload((n) => n + 1)}
          className="inline-flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-primary-600"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          刷新
        </button>
      </section>
    );
  }

  return (
    <section className="ui-card p-5 sm:p-6" aria-label="今日工作">
      {/* 头部：标题与口径为主；刷新、范围筛选降为右上的次要操作 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-lg font-semibold text-slate-800">今日工作</h2>
          <span className="text-xs text-slate-400">
            {USE_MOCK ? '演示模式' : '北京时间'} {date}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <label className="flex items-center gap-1.5">
            <span className="sr-only">任务范围</span>
            <select
              aria-label="任务范围"
              className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-600"
              value={scope}
              onChange={(event) => setScope(event.target.value as Scope)}
            >
              <option value="all">全部未完成</option>
              <option value="review">待审核</option>
              <option value="today">今天到期</option>
              <option value="overdue">已逾期</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => setReload((n) => n + 1)}
            className="inline-flex items-center gap-1 transition-colors hover:text-primary-600"
            title="刷新待办"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            刷新
          </button>
          <Link className="text-primary-600 hover:underline" to="/admin/agent-workbench?scope=live&tab=tasks">
            进入处置 →
          </Link>
        </div>
      </div>

      {/* 主体：先给到期/逾期的具体任务，每条都能直接点进去 */}
      {urgent.length > 0 ? (
        <ul className="mt-4 divide-y divide-slate-100">
          {urgent.slice(0, 4).map((task) => {
            const late = task.due_at < date;
            return (
              <li key={task.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${late ? 'bg-danger-50 text-danger-600' : 'bg-warning-50 text-warning-700'}`}>
                      {late ? '已逾期' : '今天到期'}
                    </span>
                    <span className="truncate">{task.title}</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {states[task.state] || task.state} · {task.assignee || '待分配'} · 截止 {task.due_at}
                  </p>
                </div>
                <Link
                  className="shrink-0 text-sm text-primary-600 hover:underline"
                  to={task.caseId ? '/admin/cases' : '/admin/agent-workbench?scope=live&tab=tasks'}
                >
                  查看任务 →
                </Link>
              </li>
            );
          })}
        </ul>
      ) : data.tasks.length > 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          今天没有到期的任务；下一项：{pending[0]?.title ?? data.tasks[0].title} · 计划 {pending[0]?.due_at ?? data.tasks[0].due_at}
        </p>
      ) : null}

      {/* 未分配预警：唯一必须先做动作的事，单独一条，不做成数字格子 */}
      {data.unassignedAlerts > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-warning-50 px-4 py-2.5 text-sm">
          <span className="text-warning-700">
            还有 <strong className="font-semibold">{data.unassignedAlerts}</strong> 条未分配预警没有人认领
            {data.todayUnassignedAlerts > 0 && `（今日新增 ${data.todayUnassignedAlerts}）`}
          </span>
          <Link className="inline-flex items-center gap-1 font-medium text-primary-600 hover:underline" to="/admin/alerts">
            去分配
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* 底部：只在确实有待办时给一行统计小字（没有待办时不摆一排 0） */}
      {data.tasks.length > 0 && (
        <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
          共 {data.tasks.length} 项未完成 · 待审核 {data.pendingReview} · 今天到期 {data.dueToday} · 已逾期 {data.overdue}
        </p>
      )}
    </section>
  );
}
