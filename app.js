(() => {
'use strict';

const SUPABASE_URL = 'https://xeesttjsvscuqkeytmdz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Y0hp9KlIhb_asEnVNUoTAw_XR22Cw2F';
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const $ = (q, root=document) => root.querySelector(q);
const $$ = (q, root=document) => [...root.querySelectorAll(q)];
const esc = (value='') => String(value).replace(/[&<>"']/g, c => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
}[c]));
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const shuffle = arr => arr.map(v=>[Math.random(),v]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
const sleep = ms => new Promise(r=>setTimeout(r,ms));

const THEMES = [
  {id:1,axis:'Meio ambiente',title:'Transição energética no Brasil: desafios para um futuro sustentável',prompt:'Discuta caminhos para ampliar a transição energética brasileira de forma socialmente justa e ambientalmente responsável.'},
  {id:2,axis:'Tecnologia e sociedade',title:'Os impactos da inteligência artificial na formação dos jovens brasileiros',prompt:'Analise benefícios e riscos da inteligência artificial na educação e proponha medidas para seu uso responsável.'},
  {id:3,axis:'Cidadania',title:'Desafios para combater a desinformação na sociedade brasileira',prompt:'Discuta estratégias de educação midiática e responsabilidade social para reduzir a desinformação.'},
  {id:4,axis:'Saúde pública',title:'Caminhos para ampliar o cuidado com a saúde mental entre adolescentes',prompt:'Analise os obstáculos ao cuidado em saúde mental e proponha ações de prevenção e acolhimento.'},
  {id:5,axis:'Urbanização',title:'Mobilidade urbana e direito à cidade no Brasil contemporâneo',prompt:'Discuta os impactos da mobilidade desigual e proponha políticas para cidades mais acessíveis.'},
  {id:6,axis:'Cultura',title:'A preservação do patrimônio cultural diante das transformações digitais',prompt:'Analise como preservar memória e patrimônio cultural em uma sociedade cada vez mais digital.'}
];

const state = {
  user:null,
  profile:null,
  dashboard:null,
  questionMeta:[],
  subjects:{},
  selectedArea:'',
  session:null,
  current:null,
  answered:false,
  questionStartedAt:0,
  pdfCache:new Map(),
  brokenVisual:new Set(),
  videos:[]
};

function toast(message, type='info') {
  const el = $('#toast');
  el.textContent = message;
  el.dataset.type = type;
  el.classList.remove('hidden');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(()=>el.classList.add('hidden'), 2900);
}

function showAuthMessage(message, error=false, canResend=false) {
  const el = $('#authMessage');
  el.textContent = message;
  el.classList.remove('hidden','error');
  if (error) el.classList.add('error');
  $('#resendConfirm').classList.toggle('hidden', !canResend);
}

function clearAuthMessage(){
  $('#authMessage').classList.add('hidden');
  $('#resendConfirm').classList.add('hidden');
}

function initials(name='NEXO') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0,2).map(x=>x[0]).join('') || 'NE').toUpperCase();
}

function setTheme(mode) {
  document.body.classList.toggle('light', mode === 'light');
  localStorage.setItem('nexo-theme', mode);
  $('#themeToggle').textContent = mode === 'light' ? '☀' : '☾';
}
setTheme(localStorage.getItem('nexo-theme') || 'dark');

function setAuthTab(tab) {
  clearAuthMessage();
  const login = tab === 'login';
  $('#loginTab').classList.toggle('active',login);
  $('#registerTab').classList.toggle('active',!login);
  $('#loginForm').classList.toggle('hidden',!login);
  $('#registerForm').classList.toggle('hidden',login);
}
$('#loginTab').onclick=()=>setAuthTab('login');
$('#registerTab').onclick=()=>setAuthTab('register');

$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  clearAuthMessage();
  const email = $('#loginEmail').value.trim();
  const password = $('#loginPassword').value;
  const btn = e.submitter;
  btn.disabled = true; btn.textContent = 'Entrando...';
  const { error } = await client.auth.signInWithPassword({ email, password });
  btn.disabled = false; btn.innerHTML = 'Entrar <span>→</span>';
  if (error) {
    const unconfirmed = /not confirmed/i.test(error.message || '');
    showAuthMessage(
      unconfirmed ? 'Seu e-mail ainda não foi confirmado. Abra a mensagem enviada pelo NEXO ENEM ou use o botão abaixo para reenviar.' : error.message,
      true,
      unconfirmed
    );
  }
});

$('#registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  clearAuthMessage();
  const full_name = $('#registerName').value.trim();
  const email = $('#registerEmail').value.trim();
  const password = $('#registerPassword').value;
  const btn = e.submitter;
  btn.disabled = true; btn.textContent = 'Criando conta...';
  const { data, error } = await client.auth.signUp({
    email, password, options:{ data:{ full_name } }
  });
  btn.disabled = false; btn.innerHTML = 'Criar conta <span>→</span>';
  if (error) return showAuthMessage(error.message, true);
  if (!data.session) {
    setAuthTab('login');
    $('#loginEmail').value = email;
    showAuthMessage('Conta criada. Falta apenas confirmar seu e-mail. Verifique a caixa de entrada e o spam.', false, true);
  }
});

$('#resendConfirm').onclick = async () => {
  const email = ($('#loginEmail').value || $('#registerEmail').value || '').trim();
  if (!email) return showAuthMessage('Digite seu e-mail para reenviar a confirmação.', true);
  const btn = $('#resendConfirm');
  btn.disabled = true;
  btn.textContent = 'Reenviando...';
  const { error } = await client.auth.resend({ type:'signup', email });
  btn.disabled = false;
  btn.textContent = 'Reenviar e-mail de confirmação';
  if (error) return showAuthMessage(error.message, true, true);
  showAuthMessage('Novo e-mail de confirmação enviado. Confira também a pasta de spam.', false, false);
};

$('#logoutBtn').onclick = async () => {
  await client.auth.signOut();
  $('#profileMenu').classList.add('hidden');
};

$('#themeToggle').onclick=()=>setTheme(document.body.classList.contains('light')?'dark':'light');
$('#profileButton').onclick=()=>$('#profileMenu').classList.toggle('hidden');
document.addEventListener('click',e=>{
  if(!e.target.closest('#profileButton')&&!e.target.closest('#profileMenu')) $('#profileMenu').classList.add('hidden');
});

function toggleMenu(open) {
  $('#sidebar').classList.toggle('open', open);
  $('#scrim').classList.toggle('hidden', !open);
}
$('#mobileMenu').onclick=()=>toggleMenu(true);
$('#closeMenu').onclick=()=>toggleMenu(false);
$('#scrim').onclick=()=>toggleMenu(false);
$('#moreMobile').onclick=()=>toggleMenu(true);

function openPage(id) {
  if (id === 'admin' && state.profile?.role !== 'admin') {
    toast('Essa área é restrita ao administrador.','error'); return;
  }
  $$('.page').forEach(p=>p.classList.toggle('active',p.id===id));
  $$('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===id));
  toggleMenu(false);
  window.scrollTo({top:0,behavior:'smooth'});
  if (id==='desempenho') renderPerformance();
  if (id==='focos') renderFocus();
  if (id==='videoaulas') loadVideos();
  if (id==='banco') renderBank();
  if (id==='feedback') loadMyFeedback();
  if (id==='ranking') loadRanking();
  if (id==='admin') loadAdmin();
}
$$('[data-page]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();openPage(b.dataset.page)}));

async function initApp(session) {
  state.user = session.user;
  const { data:profile, error } = await client.from('profiles').select('id,full_name,avatar_url,role').eq('id',state.user.id).single();
  if (error) {
    console.error(error);
    toast('Não foi possível carregar seu perfil.','error');
    return;
  }
  state.profile = profile;
  const name = profile.full_name || state.user.email?.split('@')[0] || 'Aluno';
  $('#profileName').textContent = name.split(' ')[0];
  $('#menuName').textContent = name;
  $('#menuEmail').textContent = state.user.email || '';
  $('#profileRole').textContent = profile.role === 'admin' ? 'Administrador' : 'Estudante';
  $('#avatar').textContent = initials(name);
  $$('.admin-only').forEach(el=>el.classList.toggle('hidden',profile.role!=='admin'));

  $('#authScreen').classList.add('hidden');
  $('#app').classList.remove('hidden');

  await Promise.all([loadQuestionMeta(), loadDashboard()]);
  fillThemes();
  await loadRecentAttempts();
  renderBank();
}

async function handleSession(session) {
  if (session) await initApp(session);
  else {
    state.user=null; state.profile=null;
    $('#app').classList.add('hidden');
    $('#authScreen').classList.remove('hidden');
  }
  $('#boot').classList.add('fade');
  setTimeout(()=>$('#boot').classList.add('hidden'),450);
}

client.auth.onAuthStateChange((_event,session)=>handleSession(session));
client.auth.getSession().then(({data})=>handleSession(data.session));

async function loadQuestionMeta() {
  const { data, error } = await client.from('questions')
    .select('id,area,subject,topic,difficulty,source_year,source_question_number,media_type')
    .order('id',{ascending:true}).limit(1000);
  if (error) throw error;
  state.questionMeta = data || [];
  state.subjects = {};
  for (const q of state.questionMeta) {
    state.subjects[q.area] ??= new Set();
    state.subjects[q.area].add(q.subject);
  }
}

async function loadDashboard() {
  const { data, error } = await client.rpc('get_my_dashboard');
  if (error) { console.error(error); return; }
  state.dashboard = data || {attempts:0,correct:0,accuracy:0,by_area:[],weak_topics:[]};
  const attempts = Number(state.dashboard.attempts||0);
  const correct = Number(state.dashboard.correct||0);
  const wrong = Math.max(0,attempts-correct);
  const pct = Number(state.dashboard.accuracy||0);
  $('#progressPct').textContent=pct+'%';
  $('#correctCount').textContent=correct;
  $('#wrongCount').textContent=wrong;
  $('#answeredCount').textContent=attempts;
  $('#progressDonut').style.background=`conic-gradient(var(--cyan) 0 ${pct}%,#1c2b40 ${pct}% 100%)`;

  const weak = state.dashboard.weak_topics || [];
  $('#weaknessBars').innerHTML = weak.length ? weak.slice(0,5).map(x=>{
    const acc = clamp(100-Number(x.error_rate||0),0,100);
    return `<div class="weak-row"><label>${esc(x.topic)}</label><div class="weak-track"><i style="width:${acc}%"></i></div><b>${acc}%</b></div>`;
  }).join('') : '<p style="color:var(--muted);font-size:12px">Resolva algumas questões para o sistema identificar seus pontos de atenção.</p>';
}

async function loadRecentAttempts() {
  const { data, error } = await client.from('question_attempts')
    .select('id,is_correct,created_at,question:questions(area,subject,topic)')
    .order('created_at',{ascending:false}).limit(5);
  if (error) return console.error(error);
  $('#recentAttempts').innerHTML = data?.length ? data.map(a=>`
    <div class="recent-item">
      <span class="recent-status ${a.is_correct?'ok':'bad'}">${a.is_correct?'✓':'×'}</span>
      <div><b>${esc(a.question?.subject||'Questão')}</b><small>${esc(a.question?.topic||a.question?.area||'')}</small></div>
      <time>${new Date(a.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</time>
    </div>`).join('') : '<p style="color:var(--muted);font-size:12px">Seu histórico aparecerá aqui quando você começar a resolver.</p>';
}

function setSelectedArea(area) {
  state.selectedArea = area;
  $$('[data-study-area]').forEach(b=>b.classList.toggle('active',b.dataset.studyArea===area));
  const subjects=[...(state.subjects[area]||[])].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  $('#sessionSubject').innerHTML='<option value="">Todas da área</option>'+subjects.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
}

$$('[data-study-area]').forEach(b=>b.onclick=()=>setSelectedArea(b.dataset.studyArea));
$$('.subject-card').forEach(b=>b.onclick=()=>{
  openPage('questoes');
  $('#sessionSetup').classList.remove('hidden');
  $('#studyWorkspace').classList.add('hidden');
  setSelectedArea(b.dataset.area);
  $('#sessionSubtitle').textContent='Escolha a matéria e a quantidade. A sessão permanecerá dentro de '+b.dataset.area+'.';
});
$('#continueStudy').onclick=()=>openPage('questoes');
$('#changeSession').onclick=()=>resetSessionUI();
$('#endSession').onclick=()=>resetSessionUI();
$('#quickVisual').onclick=()=>{
  openPage('questoes'); resetSessionUI(); $('#visualOnly').checked=true;
  toast('Modo visual ativado. Escolha uma área para manter a sessão organizada.');
};
$('#quickTen').onclick=()=>{
  openPage('questoes'); resetSessionUI(); $('#sessionSize').value='10';
};
$('#adaptiveButton').onclick=()=>startAdaptive();
$('#startAdaptiveFocus').onclick=()=>startAdaptive();

function resetSessionUI() {
  state.session=null; state.current=null; state.answered=false;
  $('#sessionSetup').classList.remove('hidden');
  $('#studyWorkspace').classList.add('hidden');
  $('#sessionSubtitle').textContent='Escolha uma área e comece uma sessão organizada.';
}

async function getSeenIds() {
  const { data } = await client.from('question_attempts').select('question_id').order('created_at',{ascending:false}).limit(3000);
  return new Set((data||[]).map(x=>Number(x.question_id)));
}

async function fetchQuestions(filters={}) {
  let q = client.from('questions').select(
    'id,area,subject,topic,difficulty,source_year,source_exam,source_question_number,source_reference,base_text,prompt,options,media_type,source_pdf_url,source_page,media_crop'
  ).eq('is_active',true).limit(500);
  if (filters.area) q=q.eq('area',filters.area);
  if (filters.subject) q=q.eq('subject',filters.subject);
  if (filters.difficulty) q=q.eq('difficulty',Number(filters.difficulty));
  if (filters.topic) q=q.eq('topic',filters.topic);
  if (filters.visualOnly) q=q.not('media_type','is',null);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

$('#startSession').onclick=async()=>{
  if(!state.selectedArea) return toast('Escolha uma área antes de começar.','error');
  await startStudySession({
    area:state.selectedArea,
    subject:$('#sessionSubject').value,
    difficulty:$('#sessionDifficulty').value,
    visualOnly:$('#visualOnly').checked,
    size:Number($('#sessionSize').value||10)
  });
};

async function startStudySession(config) {
  const btn=$('#startSession'); if(btn){btn.disabled=true;btn.textContent='Montando sessão...';}
  try{
    const all = await fetchQuestions(config);
    const seen = await getSeenIds();
    let fresh = shuffle(all.filter(x=>!seen.has(Number(x.id))&&!state.brokenVisual.has(Number(x.id))));
    let reviewMode=false;
    if(!fresh.length){
      fresh=shuffle(all.filter(x=>!state.brokenVisual.has(Number(x.id))));
      reviewMode=true;
    }
    if(!fresh.length) throw new Error('Nenhuma questão encontrada com esses filtros.');
    const size=Math.min(config.size||10,fresh.length);
    const queue=fresh.slice(0,size);
    state.session={...config,queue,index:0,size:queue.length,reviewMode};
    $('#sessionSetup').classList.add('hidden');
    $('#studyWorkspace').classList.remove('hidden');
    $('#sessionAreaBadge').textContent=config.area||'Treino';
    $('#sessionTitle').textContent=config.topic ? config.topic : (config.subject||config.area||'Sessão');
    $('#sessionSubtitle').textContent=reviewMode?'Modo revisão: você já respondeu todas as questões novas deste filtro.':'Sua sessão está fixa neste conteúdo até você decidir trocar.';
    await showCurrentQuestion();
  }catch(err){
    console.error(err);toast(err.message||'Não foi possível montar a sessão.','error');
  }finally{
    if(btn){btn.disabled=false;btn.innerHTML='Começar sessão <span>→</span>';}
  }
}

async function startAdaptive() {
  if(!state.dashboard) await loadDashboard();
  const weak=state.dashboard?.weak_topics||[];
  if(!weak.length){openPage('questoes');toast('Resolva algumas questões antes para liberar o treino adaptativo.');return;}
  const target=weak[0];
  openPage('questoes');
  $('#sessionSetup').classList.add('hidden');$('#studyWorkspace').classList.remove('hidden');
  await startStudySession({topic:target.topic,size:10,area:'',subject:'',difficulty:'',visualOnly:false});
  if(state.session){
    $('#sessionAreaBadge').textContent='Adaptativo';
    $('#sessionTitle').textContent=target.topic;
    $('#sessionSubtitle').textContent='Foco automático no tema com maior taxa de erro.';
  }
}

async function showCurrentQuestion() {
  if(!state.session) return;
  if(state.session.index>=state.session.queue.length){
    finishSession(); return;
  }
  state.current=state.session.queue[state.session.index];
  state.answered=false;state.questionStartedAt=Date.now();
  $('#nextQuestionBottom').classList.add('hidden');
  $('#sessionMeta').textContent=`Questão ${state.session.index+1} de ${state.session.size}`;
  $('#sessionProgress').style.width=`${Math.round((state.session.index/state.session.size)*100)}%`;
  $('#questionCard').innerHTML='<div class="question-loading"><div class="pulse-block"></div><div class="pulse-line"></div><div class="pulse-line short"></div></div>';
  renderQuestion(state.current);
}

async function renderQuestion(q) {
  const card=$('#questionCard');
  const visual = q.media_type && q.source_pdf_url && q.source_page && q.media_crop;
  card.innerHTML=`
    <div class="q-top">
      <div class="q-tags">
        <span class="tag accent">${esc(q.area)}</span>
        <span class="tag">${esc(q.subject)}</span>
        <span class="tag">${esc(q.topic)}</span>
        <span class="tag">Nível ${q.difficulty}</span>
        ${visual?'<span class="tag">◉ visual</span>':''}
      </div>
      <div class="q-source">ENEM ${esc(q.source_year||'')} · questão ${esc(q.source_question_number||'')}</div>
    </div>
    ${q.base_text ? `<div class="q-section-title">TEXTO-BASE</div><div class="q-context"><p>${esc(q.base_text)}</p>${q.source_reference?`<span class="q-reference">${esc(q.source_reference)}</span>`:''}</div>` : ''}
    ${visual ? `<div id="visualWrap" class="visual-wrap"><div class="visual-head"><span>RECURSO VISUAL ORIGINAL</span><span>carregando…</span></div><div id="visualStage" class="visual-stage"><div class="visual-loading"></div></div></div>` : ''}
    <div class="q-section-title">COMANDO</div>
    <div class="q-prompt">${esc(q.prompt)}</div>
    <div class="q-options">${(q.options||[]).map((opt,i)=>`<button class="q-option" data-option="${i}"><span>${'ABCDE'[i]}</span><b>${esc(opt)}</b></button>`).join('')}</div>
    <div class="question-footer"><small>${esc(q.source_exam||'Exame Nacional do Ensino Médio')}</small><button id="nextInline" class="primary-btn hidden">Próxima →</button></div>`;

  $$('.q-option',card).forEach(b=>b.onclick=()=>submitAnswer(Number(b.dataset.option)));

  if(visual){
    const ok=await renderVisual(q);
    if(!ok && state.current?.id===q.id){
      state.brokenVisual.add(Number(q.id));
      toast('O recurso visual desta questão não carregou. Vou pular para evitar uma questão quebrada.','error');
      await nextQuestion();
    }
  }
}

async function getPdf(url) {
  if(state.pdfCache.has(url)) return state.pdfCache.get(url);
  const { data:{session} } = await client.auth.getSession();
  if(!session) throw new Error('Sessão expirada');
  const res = await fetch(`${SUPABASE_URL}/functions/v1/pdf-proxy`,{
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'apikey':SUPABASE_KEY,
      'Authorization':`Bearer ${session.access_token}`
    },
    body:JSON.stringify({url})
  });
  if(!res.ok) throw new Error('Falha ao carregar PDF');
  const bytes=new Uint8Array(await res.arrayBuffer());
  const pdf=await window.pdfjsLib.getDocument({data:bytes}).promise;
  state.pdfCache.set(url,pdf);
  return pdf;
}

async function renderVisual(q) {
  try{
    const pdf=await getPdf(q.source_pdf_url);
    const page=await pdf.getPage(Number(q.source_page));
    const scale=1.8;
    const viewport=page.getViewport({scale});
    const off=document.createElement('canvas');
    off.width=Math.ceil(viewport.width);off.height=Math.ceil(viewport.height);
    await page.render({canvasContext:off.getContext('2d'),viewport}).promise;

    const c=q.media_crop;
    const pageW=(page.view[2]-page.view[0]),pageH=(page.view[3]-page.view[1]);
    const rx=off.width/pageW, ry=off.height/pageH;
    const sx=clamp(Number(c.x0)*rx,0,off.width-1);
    const sy=clamp(Number(c.y0)*ry,0,off.height-1);
    const sw=clamp((Number(c.x1)-Number(c.x0))*rx,10,off.width-sx);
    const sh=clamp((Number(c.y1)-Number(c.y0))*ry,10,off.height-sy);

    const canvas=document.createElement('canvas');
    canvas.width=Math.round(sw);canvas.height=Math.round(sh);
    canvas.getContext('2d').drawImage(off,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
    const stage=$('#visualStage');
    if(!stage) return false;
    stage.innerHTML='';stage.appendChild(canvas);
    const head=$('#visualWrap .visual-head span:last-child');if(head)head.textContent='INEP · prova original';
    return true;
  }catch(err){
    console.error('visual',err);
    return false;
  }
}

async function submitAnswer(option) {
  if(state.answered||!state.current)return;
  state.answered=true;
  $$('.q-option',$('#questionCard')).forEach(b=>b.disabled=true);
  const duration=Math.max(1,Math.round((Date.now()-state.questionStartedAt)/1000));
  const { data, error } = await client.rpc('submit_answer',{
    p_question_id:Number(state.current.id),
    p_selected_option:Number(option),
    p_duration_seconds:duration
  });
  if(error){
    state.answered=false; $$('.q-option',$('#questionCard')).forEach(b=>b.disabled=false);
    toast('Não foi possível registrar a resposta.','error');console.error(error);return;
  }
  const correct=Number(data.correct_option);
  $$('.q-option',$('#questionCard')).forEach((b,i)=>{
    if(i===correct)b.classList.add('correct');
    else if(i===option)b.classList.add('wrong');
  });
  const box=document.createElement('div');
  box.className='answer-panel '+(data.correct?'':'wrong');
  box.innerHTML=`<h4>${data.correct?'✓ Resposta correta':'✕ Resposta incorreta'}</h4><p>${esc(data.explanation||'Confira a alternativa correta e revise o conteúdo relacionado.')}</p>`;
  $('#questionCard').appendChild(box);
  $('#nextInline').classList.remove('hidden');
  $('#nextInline').onclick=()=>nextQuestion();
  $('#nextQuestionBottom').classList.remove('hidden');
  $('#nextQuestionBottom').onclick=()=>nextQuestion();
  await Promise.all([loadDashboard(),loadRecentAttempts()]);
}

async function nextQuestion() {
  if(!state.session)return;
  state.session.index++;
  await showCurrentQuestion();
  window.scrollTo({top:Math.max(0,$('#studyWorkspace').offsetTop-75),behavior:'smooth'});
}
$('#skipQuestion').onclick=()=>nextQuestion();

function finishSession() {
  $('#sessionProgress').style.width='100%';
  $('#questionCard').innerHTML=`<div class="empty-state"><span>✓</span><h3>Sessão concluída</h3><p>Você terminou ${state.session?.size||0} questões sem sair do conteúdo escolhido.</p><div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:14px"><button id="newSameSession" class="primary-btn">Nova sessão igual</button><button id="backSetup" class="outline-btn">Trocar conteúdo</button></div></div>`;
  $('#nextQuestionBottom').classList.add('hidden');
  $('#newSameSession').onclick=()=>startStudySession({...state.session,index:0,queue:undefined});
  $('#backSetup').onclick=()=>resetSessionUI();
}

$$('[data-sim-area]').forEach(b=>b.onclick=()=>{
  openPage('questoes');setSelectedArea(b.dataset.simArea);
  startStudySession({area:b.dataset.simArea,subject:'',difficulty:'',visualOnly:false,size:20});
});

async function renderPerformance() {
  await loadDashboard();
  const d=state.dashboard||{attempts:0,correct:0,accuracy:0,by_area:[]};
  const essaysCount=await client.from('essays').select('*',{count:'exact',head:true});
  $('#statsGrid').innerHTML=[
    ['Questões respondidas',d.attempts||0],
    ['Aproveitamento',(d.accuracy||0)+'%'],
    ['Acertos',d.correct||0],
    ['Redações salvas',essaysCount.count||0]
  ].map(x=>`<article class="stat-card"><small>${x[0]}</small><b>${x[1]}</b></article>`).join('');

  const map=new Map((d.by_area||[]).map(x=>[x.area,x]));
  const areas=['Linguagens','Ciências Humanas','Ciências da Natureza','Matemática'];
  $('#areaPerformance').innerHTML=areas.map(area=>{
    const x=map.get(area)||{accuracy:0,attempts:0};
    return `<div class="perf-row"><span>${area}</span><div class="perf-track"><i style="width:${Number(x.accuracy||0)}%"></i></div><b>${Number(x.accuracy||0)}%</b></div>`;
  }).join('');

  const { data }=await client.from('question_attempts')
    .select('is_correct,created_at,question:questions(subject,topic)')
    .order('created_at',{ascending:false}).limit(12);
  $('#performanceTimeline').innerHTML=(data||[]).map(a=>`<div class="timeline-row"><span class="${a.is_correct?'ok':'bad'}">${a.is_correct?'✓':'×'}</span><div><b>${esc(a.question?.subject||'Questão')}</b><small>${esc(a.question?.topic||'')}</small></div><small>${new Date(a.created_at).toLocaleDateString('pt-BR')}</small></div>`).join('')||'<p style="color:var(--muted)">Ainda não há respostas registradas.</p>';
}

async function renderFocus() {
  await loadDashboard();
  const weak=state.dashboard?.weak_topics||[];
  $('#focusGrid').innerHTML=weak.length?weak.map(x=>{
    const error=Number(x.error_rate||0);
    return `<article class="focus-card"><header><b>${esc(x.topic)}</b><span class="risk">${error}% de erro</span></header><p>${esc(x.subject)} · ${x.attempts} resposta(s)</p><div class="focus-score">${100-error}%</div><button class="outline-btn small" data-focus="${esc(x.topic)}">Treinar este tema →</button></article>`;
  }).join(''):'<article class="focus-card"><h3>Ainda não há dados suficientes</h3><p>Resolva algumas questões para gerar seu plano personalizado.</p></article>';
  $$('[data-focus]').forEach(b=>b.onclick=()=>{openPage('questoes');startStudySession({topic:b.dataset.focus,size:10,area:'',subject:'',difficulty:'',visualOnly:false})});
}

function fillThemes() {
  $('#essayTheme').innerHTML=THEMES.map(t=>`<option value="${t.id}">${esc(t.title)}</option>`).join('');
  $('#themesGrid').innerHTML=THEMES.map(t=>`<article class="theme-card"><span class="axis">${esc(t.axis.toUpperCase())}</span><h3>${esc(t.title)}</h3><p>${esc(t.prompt)}</p><button class="outline-btn small" data-theme="${t.id}">Praticar tema →</button></article>`).join('');
  updateEssayPrompt();
  $$('[data-theme]').forEach(b=>b.onclick=()=>{$('#essayTheme').value=b.dataset.theme;updateEssayPrompt();openPage('redacao');$('#essayText').focus()});
}
function updateEssayPrompt(){
  const t=THEMES.find(x=>x.id===Number($('#essayTheme').value))||THEMES[0];
  $('#essayPrompt').innerHTML=`<b>Proposta:</b> ${esc(t.prompt)}`;
}
$('#essayTheme').addEventListener('change',updateEssayPrompt);
$('#essayText').addEventListener('input',()=>$('#wordCount').textContent=(($('#essayText').value.match(/\S+/g)||[]).length)+' palavras');

function essayScores(text){
  const words=text.match(/\S+/g)||[],count=words.length,paras=text.split(/\n\s*\n/).filter(x=>x.trim()).length;
  const connectors=(text.match(/\b(portanto|além disso|contudo|assim|desse modo|nesse sentido|porém|todavia|consequentemente|logo|dessa forma)\b/gi)||[]).length;
  const proposal=/\b(estado|governo|escola|sociedade|mídia|empresas|família|ministério|prefeitura)\b/i.test(text)&&/\b(deve|devem|promover|criar|ampliar|garantir|implementar|investir)\b/i.test(text);
  const punctuation=(text.match(/[.;:!?]/g)||[]).length;
  const scores=[
    clamp(80+Math.min(100,count*.42)+Math.min(20,punctuation),40,200),
    clamp(70+Math.min(110,count*.43)+(paras>=3?20:0),40,200),
    clamp(70+Math.min(80,count*.28)+Math.min(50,connectors*8),40,200),
    clamp(70+Math.min(90,connectors*11)+(paras>=4?30:0),40,200),
    clamp(60+(proposal?110:20)+Math.min(30,count*.08),40,200)
  ];
  return scores.map(x=>Math.round(x/20)*20);
}
$('#analyzeEssay').onclick=async()=>{
  const text=$('#essayText').value.trim();
  if(text.length<250)return toast('Escreva pelo menos 250 caracteres para receber uma análise.','error');
  const loader=$('#essayLoader');loader.classList.remove('hidden');
  const msgs=['Avaliando estrutura e repertório.','Analisando coesão e progressão textual.','Verificando argumentação.','Estimando as cinco competências.','Salvando seu histórico.'];let i=0;
  const timer=setInterval(()=>{$('#loaderText').textContent=msgs[++i%msgs.length]},520);
  await sleep(2300);
  const scores=essayScores(text),total=scores.reduce((a,b)=>a+b,0);
  const t=THEMES.find(x=>x.id===Number($('#essayTheme').value))||THEMES[0];
  const feedback={
    strength:scores[3]>=160?'Boa presença de mecanismos de coesão e encadeamento.':'A estrutura está identificável; vale tornar a progressão entre parágrafos ainda mais explícita.',
    priority:scores.indexOf(Math.min(...scores))+1
  };
  const { error }=await client.from('essays').insert({
    user_id:state.user.id,theme_title:t.title,essay_text:text,status:'reviewed',
    estimated_score:total,
    competencies:{c1:scores[0],c2:scores[1],c3:scores[2],c4:scores[3],c5:scores[4]},
    feedback
  });
  clearInterval(timer);loader.classList.add('hidden');
  if(error){console.error(error);toast('A análise foi feita, mas não consegui salvar o histórico.','error');}
  showEssayResult(text,scores,total);
};

function showEssayResult(text,scores,total){
  const comps=['Norma-padrão','Compreensão da proposta','Argumentação','Coesão','Intervenção'];
  const weak=scores.map((s,i)=>({s,i})).sort((a,b)=>a.s-b.s)[0].i;
  const tips=[
    'Revise concordância, pontuação e escolha vocabular. Frases mais controladas reduzem desvios.',
    'Garanta que todos os parágrafos respondam diretamente ao recorte do tema.',
    'Aprofunde a relação entre repertório, causa, consequência e tese.',
    'Use conectivos variados e retome ideias de forma clara entre frases e parágrafos.',
    'Apresente agente, ação, meio, finalidade e detalhamento na proposta de intervenção.'
  ];
  $('#essayResult').innerHTML=`<div class="score-card"><span class="eyebrow">NOTA ESTIMADA</span><div class="score-circle" style="background:conic-gradient(#5f7cff 0 ${total/10}%,#1e2b42 ${total/10}% 100%)"><b>${total}</b></div><p>${(text.match(/\S+/g)||[]).length} palavras analisadas</p></div>
    <div class="competencies">${scores.map((s,i)=>`<div class="comp-row"><span>C${i+1}</span><div><i style="width:${s/2}%"></i></div><b>${s}</b></div>`).join('')}</div>
    <div class="essay-notes"><article><h4>Ponto forte</h4><p>${scores[3]>=160?'Boa presença de mecanismos de coesão e encadeamento.':'A redação apresenta estrutura reconhecível e pode ganhar mais fluidez.'}</p></article><article><h4>Prioridade — C${weak+1}: ${comps[weak]}</h4><p>${tips[weak]}</p></article><article><h4>Importante</h4><p>Esta é uma estimativa automática de estudo e não substitui a correção oficial do ENEM.</p></article></div>`;
}

async function loadVideos() {
  const { data,error }=await client.from('videos').select('*').eq('is_published',true).order('created_at',{ascending:false});
  if(error){console.error(error);return}
  state.videos=data||[];renderVideos();
}
function renderVideos(){
  const s=$('#videoSearch').value.toLowerCase().trim();
  const list=state.videos.filter(v=>!s||[v.title,v.area,v.subject,v.topic].join(' ').toLowerCase().includes(s));
  $('#videoGrid').innerHTML=list.length?list.map(v=>`<article class="panel video-card"><div class="video-thumb">▶</div><div class="video-body"><b>${esc(v.title)}</b><small>${esc([v.area,v.subject,v.topic].filter(Boolean).join(' · '))}</small><a href="${esc(v.video_url||'')}" target="_blank" rel="noopener">Assistir videoaula →</a></div></article>`).join(''):'<article class="panel"><p style="color:var(--muted)">Nenhuma videoaula encontrada.</p></article>';
}
$('#videoSearch').addEventListener('input',renderVideos);

function renderBank(){
  const search=$('#bankSearch').value.toLowerCase().trim(),area=$('#bankArea').value;
  const list=state.questionMeta.filter(q=>(!area||q.area===area)&&(!search||[q.subject,q.topic,q.source_year,q.source_question_number].join(' ').toLowerCase().includes(search))).slice(0,150);
  $('#bankList').innerHTML=list.map(q=>`<button class="bank-row" data-bank="${q.id}"><b>#${q.source_question_number||q.id}</b><span><b>${esc(q.subject)}</b><small>${esc(q.topic)}${q.media_type?' · ◉ visual':''}</small></span><small>${esc(q.area)}</small><small>ENEM ${esc(q.source_year||'')}</small></button>`).join('');
  $$('[data-bank]').forEach(b=>b.onclick=()=>openSingleQuestion(Number(b.dataset.bank)));
}
$('#bankSearch').addEventListener('input',renderBank);
$('#bankArea').addEventListener('change',renderBank);
$('#globalSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){openPage('banco');$('#bankSearch').value=e.target.value;renderBank()}});
async function openSingleQuestion(id){
  const {data,error}=await client.from('questions').select('id,area,subject,topic,difficulty,source_year,source_exam,source_question_number,source_reference,base_text,prompt,options,media_type,source_pdf_url,source_page,media_crop').eq('id',id).single();
  if(error)return toast('Não foi possível abrir a questão.','error');
  openPage('questoes');state.session={queue:[data],index:0,size:1,area:data.area,subject:data.subject};
  $('#sessionSetup').classList.add('hidden');$('#studyWorkspace').classList.remove('hidden');
  $('#sessionAreaBadge').textContent=data.area;$('#sessionTitle').textContent=data.subject;
  await showCurrentQuestion();
}

async function loadMyFeedback(){
  const {data,error}=await client.from('feedback').select('rating,message,status,created_at').order('created_at',{ascending:false}).limit(30);
  if(error)return console.error(error);
  $('#feedbackList').innerHTML=data?.length?data.map(x=>`<div class="feedback-entry"><span class="mini-avatar">${initials(state.profile?.full_name||'A').slice(0,1)}</span><div><b>Você <span class="stars">${'★'.repeat(x.rating)}${'☆'.repeat(5-x.rating)}</span></b><p>${esc(x.message)}</p><small>${new Date(x.created_at).toLocaleDateString('pt-BR')} · ${esc(x.status)}</small></div></div>`).join(''):'<p style="color:var(--muted)">Você ainda não enviou feedback.</p>';
}
$('#sendFeedback').onclick=async()=>{
  const message=$('#feedbackText').value.trim(),rating=Number($('#feedbackRating').value);
  if(message.length<3)return toast('Escreva uma mensagem um pouco maior.','error');
  const {error}=await client.from('feedback').insert({user_id:state.user.id,rating,message});
  if(error)return toast('Não foi possível enviar.','error');
  $('#feedbackText').value='';toast('Feedback enviado. Obrigado!');loadMyFeedback();
};

async function loadRanking(){
  const {data,error}=await client.rpc('get_ranking');
  if(error){console.error(error);return}
  $('#rankingList').innerHTML=(data||[]).map(x=>`<div class="rank-row"><span class="rank-pos">#${x.rank_position}</span><b>${esc(x.full_name)}</b><span>${x.correct_answers} acertos</span></div>`).join('')||'<p style="color:var(--muted)">O ranking aparecerá quando houver respostas.</p>';
}

async function loadAdmin(){
  if(state.profile?.role!=='admin')return;
  const [profiles,attempts,feedbacks,videos]=await Promise.all([
    client.from('profiles').select('*',{count:'exact',head:true}),
    client.from('question_attempts').select('*',{count:'exact',head:true}),
    client.from('feedback').select('*',{count:'exact',head:true}),
    client.from('videos').select('*',{count:'exact',head:true})
  ]);
  $('#adminStats').innerHTML=[
    ['Usuários',profiles.count||0],['Respostas',attempts.count||0],['Feedbacks',feedbacks.count||0],['Videoaulas',videos.count||0]
  ].map(x=>`<article class="admin-stat"><small>${x[0]}</small><b>${x[1]}</b></article>`).join('');

  const {data}=await client.from('feedback').select('id,rating,message,status,created_at,user_id').order('created_at',{ascending:false}).limit(60);
  $('#adminFeedbacks').innerHTML=data?.length?data.map(x=>`<div class="feedback-entry"><span class="mini-avatar">N</span><div><b><span class="stars">${'★'.repeat(x.rating)}${'☆'.repeat(5-x.rating)}</span></b><p>${esc(x.message)}</p><small>${new Date(x.created_at).toLocaleString('pt-BR')} · ${esc(x.status)}</small></div></div>`).join(''):'<p style="color:var(--muted)">Nenhum feedback recebido.</p>';
}

$('#addVideo').onclick=async()=>{
  if(state.profile?.role!=='admin')return toast('Acesso restrito.','error');
  const title=$('#videoTitle').value.trim(),area=$('#videoArea').value,subject=$('#videoSubject').value.trim(),topic=$('#videoTopic').value.trim();
  const external=$('#videoUrl').value.trim(),file=$('#videoFile').files[0];
  if(!title||!subject||(!file&&!/^https?:\/\//i.test(external)))return toast('Preencha título, matéria e um arquivo ou URL válida.','error');
  const status=$('#uploadStatus');status.classList.remove('hidden');status.textContent='Enviando videoaula...';
  let video_url=external,storage_path=null;
  try{
    if(file){
      const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'-');
      storage_path=`${Date.now()}-${safe}`;
      const {error:upErr}=await client.storage.from('lesson-media').upload(storage_path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
      if(upErr)throw upErr;
      video_url=client.storage.from('lesson-media').getPublicUrl(storage_path).data.publicUrl;
    }
    const {error}=await client.from('videos').insert({title,area,subject,topic,video_url,storage_path,created_by:state.user.id,is_published:true});
    if(error)throw error;
    status.textContent='Videoaula publicada com sucesso.';
    $('#videoTitle').value=$('#videoSubject').value=$('#videoTopic').value=$('#videoUrl').value='';$('#videoFile').value='';
    toast('Videoaula publicada.');loadAdmin();
  }catch(err){console.error(err);status.textContent='Falha no upload/publicação.';toast('Não foi possível publicar a videoaula.','error')}
};

window.addEventListener('resize',()=>{if(innerWidth>760)toggleMenu(false)});
})();