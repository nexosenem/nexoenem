/* NEXO V13 · mastery, weekly report, admin quality and focus controls */
async function v13LoadWeekly(){
  if(!state.user?.id)return;
  const now=new Date(),start=new Date(now);start.setDate(now.getDate()-13);start.setHours(0,0,0,0);
  const {data,error}=await client.from('question_attempts').select('is_correct,duration_seconds,created_at,question:questions(area,subject,topic)').gte('created_at',start.toISOString()).order('created_at',{ascending:false});
  if(error)return console.warn('v13 weekly',error);
  const cut=new Date();cut.setDate(cut.getDate()-6);cut.setHours(0,0,0,0);
  const split=rows=>({n:rows.length,ok:rows.filter(x=>x.is_correct).length,sec:rows.reduce((s,x)=>s+Number(x.duration_seconds||0),0)});
  const current=(data||[]).filter(x=>new Date(x.created_at)>=cut),previous=(data||[]).filter(x=>new Date(x.created_at)<cut);
  const c=split(current),p=split(previous);v13State().weekly={current:c,previous:p};v13RenderWeekly();
}
function v13RenderMastery(){
  const root=document.querySelector('#v13Mastery');if(!root)return;
  const rows=(v13State().mastery||[]).slice(0,12);
  root.innerHTML='<div class="v13-head"><div><span>MAPA DE DOMÍNIO</span><h3>O que está consolidado e o que precisa voltar</h3><p>Domínio combina acerto, volume, recência e comportamento de resposta.</p></div></div><div class="v13-mastery-grid">'+(rows.length?rows.map(x=>{const m=Math.round(Number(x.mastery_score||0)),status=m>=75?'Dominado':m>=55?'Consolidando':m>=35?'Aprendendo':'Prioridade';return '<article><div><span>'+v13E(x.subject||x.area)+'</span><b>'+v13E(x.topic||'Geral')+'</b></div><strong>'+m+'%</strong><div class="v13-track"><i style="width:'+m+'%"></i></div><small>'+status+' · '+Number(x.attempts||0)+' respostas</small><div class="v13-mastery-actions"><button data-v13-topic="'+v13E(x.topic||'')+'" data-v13-subject="'+v13E(x.subject||'')+'" data-v13-area="'+v13E(x.area||'')+'">Treinar →</button><button data-v13-recall="'+v13E(x.topic||'')+'" data-v13-subject="'+v13E(x.subject||'')+'" data-v13-area="'+v13E(x.area||'')+'">Explicar em 60s</button></div></article>'}).join(''):'<p>Resolva mais questões para construir seu mapa de domínio.</p>')+'</div>';
  root.querySelectorAll('[data-v13-topic]').forEach(btn=>btn.onclick=()=>{openPage('questoes');startStudySession({mode:'mastery',area:btn.dataset.v13Area||'',subject:btn.dataset.v13Subject||'',topic:btn.dataset.v13Topic||'',difficulty:'',visualOnly:false,size:10})});
}
function v13RenderWeekly(){
  const root=document.querySelector('#v13Weekly');if(!root)return;const w=v13State().weekly;if(!w)return;
  const acc=x=>x.n?Math.round(x.ok/x.n*100):0,delta=acc(w.current)-acc(w.previous);
  root.innerHTML='<div class="v13-head"><div><span>RELATÓRIO DOS ÚLTIMOS 7 DIAS</span><h3>'+w.current.n+' questões · '+acc(w.current)+'% de acerto</h3><p>'+(delta===0?'Precisão estável':delta>0?'Precisão subiu '+delta+' p.p.':'Precisão caiu '+Math.abs(delta)+' p.p.')+' em relação aos 7 dias anteriores.</p></div></div><div class="v13-stats"><article><span>Questões</span><b>'+w.current.n+'</b><small>últimos 7 dias</small></article><article><span>Acertos</span><b>'+w.current.ok+'</b><small>'+acc(w.current)+'% de precisão</small></article><article><span>Tempo em questões</span><b>'+Math.round(w.current.sec/60)+'</b><small>minutos registrados</small></article><article><span>Tendência</span><b>'+(delta>0?'+':'')+delta+' p.p.</b><small>vs. semana anterior</small></article></div>';
}
async function v13LoadAdminQuality(){
  if(state.profile?.role!=='admin')return;
  const root=document.querySelector('#v13AdminQuality');if(!root)return;
  const {data,error}=await client.from('nexo_question_quality').select('status,quality_score,issues');
  if(error){root.innerHTML='<p>Auditoria indisponível.</p>';return}
  const count=s=>(data||[]).filter(x=>x.status===s).length,issues={};(data||[]).forEach(x=>(x.issues||[]).forEach(i=>issues[i]=(issues[i]||0)+1));
  root.innerHTML='<div class="v13-head"><div><span>SAÚDE DO BANCO</span><h3>Auditoria automática das questões</h3><p>Questões bloqueadas permanecem fora das sessões. Revisão editorial prioriza explicações e inconsistências.</p></div><button id="v13Reaudit" class="outline-btn">Reauditar banco</button></div><div class="v13-stats"><article><span>Verificadas</span><b>'+count('verified')+'</b><small>sem alerta automático</small></article><article><span>Revisar</span><b>'+count('review')+'</b><small>fila editorial</small></article><article><span>Bloqueadas</span><b>'+count('blocked')+'</b><small>não devem aparecer</small></article><article><span>Sem explicação</span><b>'+(issues.missing_explanation||0)+'</b><small>prioridade editorial</small></article></div>';const rb=root.querySelector('#v13Reaudit');if(rb)rb.onclick=async()=>{rb.disabled=true;rb.textContent='Auditando...';const {error}=await client.rpc('admin_refresh_question_quality');rb.disabled=false;rb.textContent='Reauditar banco';if(error)return toast('Não consegui reauditar o banco.','error');toast('Auditoria atualizada.');v13LoadAdminQuality()};
}
function v13ToggleFocus(){
  const on=!document.body.classList.contains('nexo-focus-v13');document.body.classList.toggle('nexo-focus-v13',on);
  const b=document.querySelector('#v13FocusToggle');if(b)b.textContent=on?'Sair do foco':'◷ Modo foco';
  toast(on?'Modo foco ativado. Distrações foram reduzidas.':'Modo foco encerrado.');
}
function v13Inject(){
  const home=document.querySelector('#inicio');if(home&&!document.querySelector('#v13Brief')){const x=document.createElement('section');x.id='v13Brief';x.className='panel v13-panel';home.insertBefore(x,home.children[1]||null)}
  const perf=document.querySelector('#desempenho');if(perf&&!document.querySelector('#v13Mastery')){const a=document.createElement('section');a.id='v13Mastery';a.className='panel v13-panel';const b=document.createElement('section');b.id='v13Weekly';b.className='panel v13-panel';perf.append(a,b)}
  const admin=document.querySelector('#admin');if(admin&&!document.querySelector('#v13AdminQuality')){const a=document.createElement('section');a.id='v13AdminQuality';a.className='panel v13-panel';admin.append(a)}
  const q=document.querySelector('#questoes .page-head');if(q&&!document.querySelector('#v13FocusToggle')){const b=document.createElement('button');b.id='v13FocusToggle';b.className='outline-btn';b.textContent='◷ Modo foco';b.onclick=v13ToggleFocus;q.appendChild(b)}
}
async function v13Boot(){
  if(!state?.user?.id)return false;v13Inject();await v13LoadPrefs();await Promise.all([v13LoadBrief(),v13LoadWeekly()]);await v13LoadAdminQuality();return true;
}
document.addEventListener('DOMContentLoaded',()=>{let n=0;const t=setInterval(async()=>{n++;try{if(await v13Boot())clearInterval(t)}catch(e){console.warn('v13 boot',e)}if(n>30)clearInterval(t)},700)});
