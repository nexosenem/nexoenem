/* NEXO V13 · universal search and error notebook */
async function v13Search(term){
  const q=String(term||'').trim();
  if(q.length<2)return {actions:[],questions:[],materials:[],videos:[]};
  const clean=q.replace(/[^\p{L}\p{N}\s-]/gu,' ').replace(/\s+/g,' ').trim();
  if(clean.length<2)return {actions:[],questions:[],materials:[],videos:[]};
  const actions=typeof buildSiteSearchActionResults==='function'?buildSiteSearchActionResults(clean).slice(0,8):[];
  const like='%'+clean+'%';
  const [a,b,c]=await Promise.all([
    client.from('questions').select('id,area,subject,topic,prompt,source_year,source_question_number').or('topic.ilike.'+like+',subject.ilike.'+like+',prompt.ilike.'+like).eq('is_active',true).limit(8),
    client.from('materials').select('id,title,area,subject,topic').eq('is_published',true).or('title.ilike.'+like+',topic.ilike.'+like+',subject.ilike.'+like).limit(6),
    client.from('videos').select('id,title,area,subject,topic').eq('is_published',true).or('title.ilike.'+like+',topic.ilike.'+like+',subject.ilike.'+like).limit(6)
  ]);
  return {actions,questions:a.data||[],materials:b.data||[],videos:c.data||[]};
}

function v13OpenSearch(){
  v13Modal('Busca universal','<div class="v13-search"><input id="v13SearchInput" autocomplete="off" placeholder="Busque área, função, assunto, questão ou material..."><div id="v13SearchResults"><div class="v13-empty">Digite pelo menos 2 caracteres.</div></div></div>');
  const input=document.querySelector('#v13SearchInput'),out=document.querySelector('#v13SearchResults');
  let timer;
  input.focus();
  input.oninput=function(){
    clearTimeout(timer);
    timer=setTimeout(async function(){
      const q=input.value.trim();
      if(q.length<2){out.innerHTML='<div class="v13-empty">Digite pelo menos 2 caracteres.</div>';return}
      out.innerHTML='<div class="v13-empty">Buscando…</div>';
      const r=await v13Search(q),sections=[];
      if(r.actions.length)sections.push('<section class="v13-search-actions"><span>ÁREAS E FUNÇÕES DO NEXO</span>'+r.actions.map(function(x){return '<button data-v13-action="'+v13E(x.actionId)+'"><b><i>'+v13E(x.icon||'→')+'</i>'+v13E(x.title)+'</b><small>'+v13E(x.meta||'Abrir função')+'</small></button>'}).join('')+'</section>');
      if(r.questions.length)sections.push('<section><span>QUESTÕES</span>'+r.questions.map(function(x){return '<button data-v13-q="'+x.id+'"><b>'+v13E(x.subject||x.area)+'</b><small>'+v13E(x.topic||'')+' · ENEM '+v13E(x.source_year||'')+'</small><p>'+v13E(String(x.prompt||'').slice(0,180))+'</p></button>'}).join('')+'</section>');
      if(r.materials.length)sections.push('<section><span>MATERIAIS</span>'+r.materials.map(function(x){return '<button data-v13-m="'+x.id+'"><b>'+v13E(x.title)+'</b><small>'+v13E(x.topic||x.subject||x.area||'')+'</small></button>'}).join('')+'</section>');
      if(r.videos.length)sections.push('<section><span>VIDEOAULAS</span>'+r.videos.map(function(x){return '<button data-v13-v="'+x.id+'"><b>'+v13E(x.title)+'</b><small>'+v13E(x.topic||x.subject||x.area||'')+'</small></button>'}).join('')+'</section>');
      out.innerHTML=sections.join('')||'<div class="v13-empty">Nenhum resultado encontrado.</div>';
      out.querySelectorAll('[data-v13-action]').forEach(function(btn){
        btn.onclick=function(){
          const id=btn.dataset.v13Action;
          v13Close();
          if(typeof runSiteSearchAction==='function')runSiteSearchAction(id);
        };
      });
      out.querySelectorAll('[data-v13-q]').forEach(function(btn){
        btn.onclick=async function(){
          const res=await client.from('questions').select('id,area,subject,topic').eq('id',Number(btn.dataset.v13Q)).maybeSingle();
          const item=res.data;if(!item)return;
          v13Close();openPage('questoes');
          await startStudySession({mode:'search',area:item.area||'',subject:item.subject||'',topic:item.topic||'',difficulty:'',visualOnly:false,size:5});
        };
      });
      out.querySelectorAll('[data-v13-m]').forEach(function(btn){btn.onclick=function(){v13Close();openPage('materiais');setTimeout(function(){openContentViewer('material',Number(btn.dataset.v13M))},80)}});
      out.querySelectorAll('[data-v13-v]').forEach(function(btn){btn.onclick=function(){v13Close();openPage('videoaulas');setTimeout(function(){openContentViewer('video',Number(btn.dataset.v13V))},80)}});
    },260);
  };
}

async function v13LoadErrors(){
  const root=document.querySelector('#v13Errors');
  if(!root||!state.user?.id)return;
  const [a,r]=await Promise.all([
    client.from('question_attempts').select('question_id,created_at,question:questions(id,area,subject,topic,prompt)').eq('is_correct',false).order('created_at',{ascending:false}).limit(20),
    client.from('nexo_attempt_reflections').select('question_id,confidence,error_reason,created_at').order('created_at',{ascending:false}).limit(80)
  ]);
  const reflections=r.data||[];
  const rows=(a.data||[]).filter(function(x,i,arr){return arr.findIndex(function(y){return Number(y.question_id)===Number(x.question_id)})===i}).slice(0,8);
  if(!rows.length){root.innerHTML='<div class="v13-empty">Seus erros recentes aparecerão aqui como revisão ativa.</div>';return}
  const labels={concept:'conteúdo',interpretation:'interpretação',calculation:'cálculo',attention:'atenção',time:'tempo',guess:'chute',sure:'certeza',unsure:'dúvida'};
  root.innerHTML='<div class="v13-section-head"><div><span>CADERNO DE ERROS</span><h3>Erros viram próximas ações</h3></div><small>revisão ativa</small></div><div class="v13-error-list">'+rows.map(function(x){
    const ref=reflections.find(function(y){return Number(y.question_id)===Number(x.question_id)});
    return '<article><div><span>'+v13E(x.question?.subject||x.question?.area||'Questão')+'</span><b>'+v13E(x.question?.topic||'Revisão')+'</b><p>'+v13E(String(x.question?.prompt||'').slice(0,160))+'</p><small>'+(ref?(v13E(labels[ref.error_reason]||ref.error_reason||'causa não marcada')+' · '+v13E(labels[ref.confidence]||ref.confidence||'')):'causa ainda não marcada')+'</small></div><button data-v13-retry="'+x.question_id+'">Treinar tema →</button></article>';
  }).join('')+'</div>';
  root.querySelectorAll('[data-v13-retry]').forEach(function(btn){
    btn.onclick=async function(){
      const row=rows.find(function(x){return Number(x.question_id)===Number(btn.dataset.v13Retry)});
      if(!row?.question)return;
      openPage('questoes');
      await startStudySession({mode:'error_review',area:row.question.area||'',subject:row.question.subject||'',topic:row.question.topic||'',difficulty:'',visualOnly:false,size:5});
    };
  });
}

(function(){
  function mount(){
    if(!document.querySelector('#v13SearchButton')){
      const b=document.createElement('button');
      b.id='v13SearchButton';b.className='v13-search-button';b.type='button';
      b.innerHTML='<span>⌕</span><b>Buscar</b><small>Ctrl K</small>';
      b.onclick=v13OpenSearch;document.body.appendChild(b);
    }
    const perf=document.querySelector('#desempenho');
    if(perf&&!perf.querySelector('#v13Errors')){const e=document.createElement('section');e.id='v13Errors';e.className='panel v13-panel';perf.appendChild(e)}
  }
  mount();setTimeout(mount,1000);
  document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();v13OpenSearch()}});
  let user='';
  setInterval(function(){
    const id=state?.user?.id||'';
    if(id&&id!==user){user=id;mount();v13LoadErrors()}
    if(!id)user='';
  },1200);
})();