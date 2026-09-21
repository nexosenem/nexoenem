/* NEXO V13 · mastery map, weekly report, repertoire and admin quality */
async function v13LoadWeekly(){
  if(!state.user?.id)return;
  const from=new Date();from.setDate(from.getDate()-7);
  const {data,error}=await client.from('question_attempts')
    .select('is_correct,duration_seconds,created_at,question:questions(area,subject,topic)')
    .gte('created_at',from.toISOString()).order('created_at',{ascending:false}).limit(500);
  if(error)return;
  const rows=data||[],correct=rows.filter(x=>x.is_correct).length,seconds=rows.reduce((a,x)=>a+Number(x.duration_seconds||0),0);
  const topics={};
  rows.forEach(x=>{const k=x.question?.topic||x.question?.subject||'Geral';const t=topics[k]||(topics[k]={total:0,correct:0});t.total++;if(x.is_correct)t.correct++});
  const weak=Object.entries(topics).map(([name,x])=>({name,...x,acc:x.total?Math.round(x.correct/x.total*100):0})).sort((a,b)=>a.acc-b.acc||b.total-a.total).slice(0,3);
  v13State().weekly={total:rows.length,correct,accuracy:rows.length?Math.round(correct/rows.length*100):0,seconds,weak};
  v13RenderWeekly();
}

function v13RenderMastery(){
  const root=document.querySelector('#v13Mastery');if(!root)return;
  const rows=(v13State().mastery||[]).slice(0,12);
  if(!rows.length){root.innerHTML='<div class="v13-empty">Resolva algumas questões para formar seu mapa de domínio.</div>';return}
  root.innerHTML='<div class="v13-section-head"><div><span>MAPA DE DOMÍNIO</span><h3>O que você domina — e o que precisa voltar</h3></div><small>atualizado pelo histórico real</small></div><div class="v13-mastery-grid">'+rows.map(x=>{
    const m=Math.round(Number(x.mastery_score||0)),p=Math.round(Number(x.priority_score||0));
    const status=m>=75?'Domínio forte':m>=50?'Em construção':'Prioridade';
    return '<article><div><span>'+v13E(x.subject||x.area)+'</span><b>'+v13E(x.topic||'Geral')+'</b></div><strong>'+m+'%</strong><div class="v13-track"><i style="width:'+m+'%"></i></div><footer><small>'+status+'</small><em>prioridade '+p+'%</em></footer></article>';
  }).join('')+'</div>';
}

function v13RenderWeekly(){
  const root=document.querySelector('#v13Weekly');if(!root)return;
  const w=v13State().weekly||{total:0,correct:0,accuracy:0,seconds:0,weak:[]};
  root.innerHTML='<div class="v13-section-head"><div><span>RELATÓRIO DE 7 DIAS</span><h3>Aprendizado, não só sequência</h3></div><small>últimos 7 dias</small></div><div class="v13-stats"><article><span>Questões</span><b>'+w.total+'</b><small>respondidas</small></article><article><span>Acertos</span><b>'+w.accuracy+'%</b><small>'+w.correct+' corretas</small></article><article><span>Tempo</span><b>'+Math.round(w.seconds/60)+'</b><small>minutos em questões</small></article><article><span>Próximo foco</span><b>'+(w.weak[0]?v13E(w.weak[0].acc)+'%':'—')+'</b><small>'+(w.weak[0]?v13E(w.weak[0].name):'calibrando')+'</small></article></div>'+(w.weak.length?'<div class="v13-week-weak">'+w.weak.map(x=>'<span><b>'+v13E(x.name)+'</b>'+x.acc+'% · '+x.total+' questão(ões)</span>').join('')+'</div>':'');
}

async function v13LoadQuality(){
  const box=document.querySelector('#v13Quality');if(!box)return;
  const {data,error}=await client.from('nexo_question_quality').select('status,quality_score,issues');
  if(error){box.closest('.v13-admin-quality')?.remove();return}
  const rows=data||[],counts={verified:0,review:0,blocked:0},issues={};
  rows.forEach(r=>{counts[r.status]=(counts[r.status]||0)+1;(r.issues||[]).forEach(i=>issues[i]=(issues[i]||0)+1)});
  const top=Object.entries(issues).sort((a,b)=>b[1]-a[1]).slice(0,6);
  box.innerHTML='<div class="v13-stats"><article><span>Verificadas</span><b>'+counts.verified+'</b><small>sem alerta automático</small></article><article><span>Revisar</span><b>'+counts.review+'</b><small>fila editorial</small></article><article><span>Bloqueadas</span><b>'+counts.blocked+'</b><small>fora das sessões</small></article><article><span>Total auditado</span><b>'+rows.length+'</b><small>questões</small></article></div><div class="v13-issues">'+top.map(([k,n])=>'<span><b>'+n+'</b>'+v13E(k.replaceAll('_',' '))+'</span>').join('')+'</div>';
}

function v13MountRepertoire(){
  const page=document.querySelector('#redacao');if(!page||page.querySelector('#v13Repertoire'))return;
  const el=document.createElement('section');el.id='v13Repertoire';el.className='v13-panel v13-repertoire';
  const reps=[
    ['Constituição Federal','Direitos, deveres, cidadania e políticas públicas — use apenas quando o princípio tiver relação direta com seu argumento.'],
    ['Declaração Universal dos Direitos Humanos','Dignidade, igualdade, liberdade, educação e proteção social. Explique a ligação com o tema.'],
    ['Paulo Freire','Educação, autonomia, participação e formação crítica. Evite citação decorativa.'],
    ['Milton Santos','Território, desigualdade, cidadania e globalização, quando o conceito realmente explicar o problema.'],
    ['Determinantes sociais da saúde','Renda, moradia, educação, saneamento e acesso a serviços podem explicar diferenças em saúde pública.']
  ];
  el.innerHTML='<div class="v13-section-head"><div><span>BANCO DE REPERTÓRIO</span><h3>Repertório para argumentar — não para decorar</h3></div><small>use com pertinência</small></div><div class="v13-rep-grid">'+reps.map(x=>'<article><b>'+v13E(x[0])+'</b><p>'+v13E(x[1])+'</p></article>').join('')+'</div>';
  page.appendChild(el);
}

function v13MountPanels(){
  const home=document.querySelector('#inicio');
  if(home&&!home.querySelector('#v13Brief')){const e=document.createElement('section');e.id='v13Brief';e.className='v13-panel v13-brief';home.prepend(e)}
  const perf=document.querySelector('#desempenho');
  if(perf&&!perf.querySelector('#v13Mastery')){const m=document.createElement('section');m.id='v13Mastery';m.className='v13-panel';perf.appendChild(m);const w=document.createElement('section');w.id='v13Weekly';w.className='v13-panel';perf.appendChild(w)}
  const admin=document.querySelector('#admin');
  if(admin&&!admin.querySelector('#v13Quality')){const a=document.createElement('section');a.className='v13-panel v13-admin-quality';a.innerHTML='<div class="v13-section-head"><div><span>SAÚDE DO BANCO</span><h3>Auditoria automática das questões</h3></div><small>V13</small></div><div id="v13Quality"></div>';admin.appendChild(a)}
  v13MountRepertoire();
}

async function v13BootForUser(){
  v13MountPanels();
  await v13LoadPrefs();
  await Promise.allSettled([v13LoadBrief(),v13LoadWeekly(),v13LoadQuality()]);
}

(function(){
  let user='';
  setInterval(()=>{
    const id=state?.user?.id||'';
    if(id&&id!==user){user=id;v13BootForUser().catch(console.warn)}
    if(!id)user='';
  },900);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state?.user?.id){v13LoadBrief();v13LoadWeekly()}});
})();