import StewardPanel from '../../components/StewardPanel';
import ActionPlanCard from '../../components/ActionPlanCard';

/*
 * 建议与行动
 * ==========
 * 按正文区域的实际宽度排版（评审意见第 2 条）：
 *   · 宽屏 ≈ 3 : 2 双栏：左边建议、推荐理由与依据，右边当前行动计划与完成操作，
 *     边看建议边决定做什么；
 *   · 窄屏 / 手机竖屏：单栏，并且**行动计划排在前面**（当前该做什么优先），
 *     两侧只保留常规页边距，不再出现居中的窄列。
 */
export default function ActionsPage() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:items-start">
      <div className="order-2 min-w-0 xl:order-1">
        <StewardPanel mode="actions" />
      </div>
      <div className="order-1 min-w-0 xl:order-2 xl:sticky xl:top-20">
        <ActionPlanCard />
      </div>
    </div>
  );
}
