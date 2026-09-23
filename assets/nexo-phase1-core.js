(function(){
'use strict';
if(window.NEXO_PHASE1?.ready)return;

const BUDGET={tapFeedback:100,pageVisual:150,searchFocus:100,longTask:100};
const state={
  ready:true,
  version:'1.0.0',
  budget:BUDGET,
  pendingNav:null,
  pendingSearch:null,
  navSamples:[],
  searchSamples:[],
  longTasks:[],
  pressureUntil:0
};
window.NEXO_PHASE1=state;

const now=()=>performance.now();
const idle=fn=>{
  if('requestIdleCallback' in window)return requestIdleCallback(fn,{timeout:1200});
  return setTimeout(fn,0);
};
const emitSlow=(kind,value,meta={})=>{
  if(!Number.isFinite(value))return;
  const budget=kind==='navigation'?BUDGET.pageVisual:kind==='search'?BUDGET.searchFocus:BUDGET.longTask;
  if(value<=budget)return;
  idle(()=>{
    try{
      if(typeof window.logProductEvent==='function'){
        window.logProductEvent('performance_slow',{
          kind,
          ms:Math.round(value),
          budget_ms:budget,
          viewport:innerWidth+'x'+innerHeight,
          ...meta
        },document.querySelector('.page.active')?.id||null);
      }
    }catch(_){}
  });
};
const setPressure=duration=>{
  if(duration<120)return;
  const until=Date.now()+2600;
  state.pressureUntil=Math.max(state.pressureUntil,until);
  document.body.classList.add('nexo-perf-pressure');
  setTimeout(()=>{
    if(Date.now()>=state.pressureUntil)document.body.classList.remove('nexo-perf-pressure');
  },2700);
};

document.addEventListener('pointerdown',event=>{
  const nav=event.target.closest?.('.nrx-bottom-nav [data-nrx-bottom]');
  if(nav){
    state.pendingNav={at:now(),key:nav.dataset.nrxBottom||'',page:document.querySelector('.page.active')?.id||''};
  }
  const search=event.target.closest?.('.nrx-mobile-search-slot .search');
  if(search){
    state.pendingSearch={at:now()};
  }
},{capture:true,passive:true});

document.addEventListener('nexo:pagechange',event=>{
  if(!state.pendingNav)return;
  const ms=now()-state.pendingNav.at;
  const sample={ms:Math.round(ms),from:state.pendingNav.page,to:event.detail?.id||'',key:state.pendingNav.key};
  state.navSamples.push(sample);
  if(state.navSamples.length>24)state.navSamples.shift();
  emitSlow('navigation',ms,{from:sample.from,to:sample.to});
  state.pendingNav=null;
});

document.addEventListener('focusin',event=>{
  if(event.target?.id!=='globalSearch'||!state.pendingSearch)return;
  const ms=now()-state.pendingSearch.at;
  state.searchSamples.push(Math.round(ms));
  if(state.searchSamples.length>24)state.searchSamples.shift();
  emitSlow('search',ms);
  state.pendingSearch=null;
});

if('PerformanceObserver' in window){
  try{
    const observer=new PerformanceObserver(list=>{
      for(const entry of list.getEntries()){
        const duration=Number(entry.duration||0);
        if(duration<BUDGET.longTask)return;
        state.longTasks.push({at:Date.now(),ms:Math.round(duration)});
        if(state.longTasks.length>30)state.longTasks.shift();
        setPressure(duration);
        emitSlow('longtask',duration);
      }
    });
    observer.observe({type:'longtask',buffered:true});
    state.longTaskObserver=observer;
  }catch(_){}
}

window.nexoPhase1PerformanceSnapshot=()=>({
  version:state.version,
  budget:{...BUDGET},
  navigation:[...state.navSamples],
  search:[...state.searchSamples],
  longTasks:[...state.longTasks],
  pressure:document.body.classList.contains('nexo-perf-pressure')
});
})();