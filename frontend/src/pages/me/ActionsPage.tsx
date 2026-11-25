import StewardPanel from '../../components/StewardPanel';
import ActionPlanCard from '../../components/ActionPlanCard';

/*
 * 建议与行动
 * ==========
 * 宽屏左右分栏：左边「建议与跟进」是主体内容，右边「今日行动计划」常驻。
 * 原来是单列 + max-w-4xl，1320 宽的内容区里只用了 896，两侧各空 200 多像素；
 * 现在铺满内容区，与页面标题落在同一条左边线上。
 * 窄屏（< 1280）仍回到单列，手机/竖屏不会出现被挤扁的窄卡。
 */
export default function ActionsPage() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] xl:items-start">
      <StewardPanel mode="actions" />
      <div className="min-w-0 xl:sticky xl:top-20">
        <ActionPlanCard />
      </div>
    </div>
  );
}
