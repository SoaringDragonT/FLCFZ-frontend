import { useEffect, useState } from 'react';
import { getToken, request, USE_MOCK } from '../services/http';
import { usePageActive } from '../services/pageActivity';
import { riskLabels, type RiskLevel } from '../services/riskSummary';

export default function CurrentRiskPopulation(){
  const active=usePageActive(),token=getToken();
  const [value,setValue]=useState<{token:string|null;data?:{people:number;distribution:Record<RiskLevel,number>;safety_pending_people:number};error?:string}>({token:''});
  useEffect(()=>{
    if(!active||USE_MOCK)return;
    let live=true;
    const load=async()=>{try{const data=await request.get<{people:number;distribution:Record<RiskLevel,number>;safety_pending_people:number}>('/api/admin/risk-summary');if(!data.distribution)throw new Error();if(live&&getToken()===token)setValue({token,data});}catch{if(live&&getToken()===token)setValue({token,error:'当前综合状态统计暂不可用'});}};
    void load();const timer=setInterval(()=>void load(),30000);return()=>{live=false;clearInterval(timer);};
  },[active,token]);
  const data=value.token===token?value.data:undefined;
  return (
    <section aria-label="当前综合状态人数" className="ui-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800">当前综合状态 · 按用户统计</h2>
          <p className="mt-1.5 text-xs leading-5 text-slate-500">
            采用统一近 30 天评估；历史预警保留事件发生时的等级与处置记录。
          </p>
        </div>
        {data && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
            共 {data.people} 个账号
          </span>
        )}
      </div>

      {data ? (
        <>
          {/* 五个状态等宽排列，人数用大字号：原来是一串 inline 药丸，
              标签和数字一样大，"需要关注几人"看不出重点。 */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {Object.entries(riskLabels).map(([level, label]) => (
              <div key={level} className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 text-[22px] font-semibold leading-none tabular-nums text-slate-800">
                  {data.distribution[level as RiskLevel] || 0}
                  <span className="ml-1 text-xs font-normal text-slate-400">人</span>
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            共 {data.people} 个有筛查记录的账号
            {data.safety_pending_people > 0 && (
              <>；<span className="font-medium text-warning-700">{data.safety_pending_people} 人</span>另有待复核安全提示</>
            )}
          </p>
        </>
      ) : (
        <p className="mt-3 text-xs text-slate-500">
          {USE_MOCK ? '演示模式不生成真实用户风险。' : value.error || '正在读取当前综合状态…'}
        </p>
      )}
    </section>
  );
}
