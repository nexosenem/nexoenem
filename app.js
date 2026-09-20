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
  selectedOption:null,
  lastAnswer:null,
  questionStartedAt:0,
  pdfCache:new Map(),
  visualCache:new Map(),
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

function showAuthMessage(message, error=false) {
  const el = $('#authMessage');
  el.textContent = message;
  el.classList.remove('hidden','error');
  if (error) el.classList.add('error');
}

function clearAuthMessage(){
  $('#authMessage').classList.add('hidden');
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
  btn.disabled = true;
  btn.textContent = 'Entrando...';

  try {
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      showAuthMessage(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message, true);
    }
  } catch (err) {
    console.error('Falha no login:', err);
    showAuthMessage('Não foi possível entrar agora. Verifique sua conexão e tente novamente.', true);
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Entrar <span>→</span>';
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

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/register-user`, {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'apikey':SUPABASE_KEY,
        'Authorization':`Bearer ${SUPABASE_KEY}`
      },
      body:JSON.stringify({ email, password, full_name })
    });
    const payload = await res.json().catch(()=>({}));
    if (!res.ok) throw new Error(payload.error || 'Não foi possível criar a conta.');

    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  } catch (err) {
    showAuthMessage(err.message || 'Não foi possível criar a conta.', true);
  } finally {
    btn.disabled = false; btn.innerHTML = 'Criar conta <span>→</span>';
  }
});

$('#logoutBtn').onclick = async () => {
  await client.auth.signOut();
  $('#profileMenu').classList.add('hidden');
};

$('#themeToggle').onclick=()=>setTheme(document.body.classList.contains('light')?'dark':'light');
$('#profileButton').onclick=()=>$('#profileMenu').classList.toggle('hidden');
const searchBox=$('.search');
$('#globalSearch').addEventListener('focus',()=>searchBox.classList.add('search-open'));
searchBox.addEventListener('click',()=>{searchBox.classList.add('search-open');$('#globalSearch').focus()});
$('#globalSearch').addEventListener('blur',()=>{if(innerWidth<=760&&!$('#globalSearch').value.trim())setTimeout(()=>searchBox.classList.remove('search-open'),120)});
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
  $$('.nav-item[data-page], .mobile-bottom [data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===id));
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
  const { data:profile, error } = await client.from('profiles').select('id,full_name,avatar_url,role,assistant_outfit').eq('id',state.user.id).single();
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
  applyNexoStyle(profile.assistant_outfit || localStorage.getItem('nexo-style') || localStorage.getItem('nia-outfit') || 'classic', false);

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

function reportSessionError(err) {
  console.error('Falha ao carregar a sessão:', err);
  $('#app').classList.add('hidden');
  $('#authScreen').classList.remove('hidden');
  showAuthMessage('Sua sessão não pôde ser carregada. Tente entrar novamente.', true);
  $('#boot').classList.add('fade');
  setTimeout(()=>$('#boot').classList.add('hidden'),450);
}

client.auth.onAuthStateChange((_event, session) => {
  // O callback precisa retornar imediatamente. Fazer chamadas assíncronas do
  // Supabase aqui pode bloquear o auth client e deixar o login preso em “Entrando...”.
  setTimeout(() => {
    handleSession(session).catch(reportSessionError);
  }, 0);
});

client.auth.getSession()
  .then(({data}) => handleSession(data.session))
  .catch(reportSessionError);

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

  $('#mobileProgressPct').textContent=pct+'%';
  $('#mobileCorrectCount').textContent=correct;
  $('#mobileWrongCount').textContent=wrong;
  $('#mobileAnsweredCount').textContent=attempts;
  $('#mobileProgressDonut').style.background=`conic-gradient(var(--cyan) 0 ${pct}%,#1c2b40 ${pct}% 100%)`;

  const weak = state.dashboard.weak_topics || [];
  $('#weaknessBars').innerHTML = weak.length ? weak.slice(0,5).map(x=>{
    const acc = clamp(100-Number(x.error_rate||0),0,100);
    return `<div class="weak-row"><label>${esc(x.topic)}</label><div class="weak-track"><i style="width:${acc}%"></i></div><b>${acc}%</b></div>`;
  }).join('') : '<p style="color:var(--muted);font-size:12px">Resolva algumas questões para o sistema identificar seus pontos de atenção.</p>';

  $('#mobileWeaknessBars').innerHTML = weak.length ? weak.slice(0,3).map(x=>{
    const acc = clamp(100-Number(x.error_rate||0),0,100);
    return `<div class="mobile-weak-item"><span>${esc(x.topic)}</span><div class="bar"><i style="width:${acc}%"></i></div><b>${acc}%</b></div>`;
  }).join('') : '<p>Resolva algumas questões para descobrir seus pontos de atenção.</p>';
}

async function loadRecentAttempts() {
  const { data, error } = await client.from('question_attempts')
    .select('id,is_correct,created_at,question:questions(area,subject,topic)')
    .order('created_at',{ascending:false}).limit(5);
  if (error) return console.error(error);
  const recentHtml = data?.length ? data.map(a=>`
    <div class="recent-item">
      <span class="recent-status ${a.is_correct?'ok':'bad'}">${a.is_correct?'✓':'×'}</span>
      <div><b>${esc(a.question?.subject||'Questão')}</b><small>${esc(a.question?.topic||a.question?.area||'')}</small></div>
      <time>${new Date(a.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</time>
    </div>`).join('') : '<p style="color:var(--muted);font-size:12px">Seu histórico aparecerá aqui quando você começar a resolver.</p>';
  $('#recentAttempts').innerHTML = recentHtml;
  $('#mobileRecent').innerHTML = recentHtml;
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
$('#mobileAdaptive').onclick=()=>startAdaptive();
$('#startAdaptiveFocus').onclick=()=>startAdaptive();

$('#mobileQuickVisual').onclick=()=>{
  openPage('questoes'); resetSessionUI(); $('#visualOnly').checked=true;
  toast('Modo visual ativado. Agora escolha uma área.');
};
$('#mobileQuickTen').onclick=()=>{
  openPage('questoes'); resetSessionUI(); $('#sessionSize').value='10';
  toast('Sessão rápida preparada. Escolha uma área.');
};

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
    let fresh = shuffle(all.filter(x=>!seen.has(Number(x.id))));
    let reviewMode=false;
    if(!fresh.length){
      fresh=shuffle(all);
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
  state.answered=false;state.selectedOption=null;state.lastAnswer=null;state.questionStartedAt=Date.now();
  $('.question-mobile-actions')?.classList.remove('answered');
  $('#nextQuestionBottom').classList.add('hidden');
  $('#sessionMeta').textContent=`Questão ${state.session.index+1} de ${state.session.size}`;
  $('#sessionProgress').style.width=`${Math.round((state.session.index/state.session.size)*100)}%`;
  $('#questionCard').innerHTML='<div class="question-loading"><div class="pulse-block"></div><div class="pulse-line"></div><div class="pulse-line short"></div></div>';
  renderQuestion(state.current);
}

function localMediaPath(q){
  if(q.media_path) return q.media_path;
  const day=/1º dia/i.test(q.source_exam||'')?1:(/2º dia/i.test(q.source_exam||'')?2:null);
  return day ? `./media/questions/${q.source_year}-d${day}-q${q.source_question_number}.webp` : null;
}

async function ensureMediaPath(q){
  if(!q?.media_type || q.media_path) return q;
  const id=Number(q.id);
  if(state.visualCache.has('path:'+id)){
    q.media_path=state.visualCache.get('path:'+id);
    return q;
  }
  const {data,error}=await client.from('questions').select('media_path').eq('id',id).single();
  if(!error && data?.media_path){
    q.media_path=data.media_path;
    state.visualCache.set('path:'+id,data.media_path);
  }
  return q;
}

async function renderQuestion(q) {
  const card=$('#questionCard');
  if(q.media_type) await ensureMediaPath(q);
  const visual = Boolean(q.media_type && q.media_path);
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
    ${q.base_text ? (innerWidth<=760 && q.base_text.length>850
      ? `<div class="q-section-title">TEXTO-BASE</div><details class="q-context-details"><summary>Ler texto-base <small>${q.base_text.length>1500?'texto longo':'toque para abrir'}</small></summary><div class="q-context"><p>${esc(q.base_text)}</p>${q.source_reference?`<span class="q-reference">${esc(q.source_reference)}</span>`:''}</div></details>`
      : `<div class="q-section-title">TEXTO-BASE</div><div class="q-context"><p>${esc(q.base_text)}</p>${q.source_reference?`<span class="q-reference">${esc(q.source_reference)}</span>`:''}</div>`) : ''}
    ${visual ? `<div id="visualWrap" class="visual-wrap"><div class="visual-head"><span>RECURSO VISUAL ORIGINAL</span><span>carregando…</span></div><div id="visualStage" class="visual-stage"><div class="visual-loading"></div></div></div>` : ''}
    <div class="q-section-title">COMANDO</div>
    <div class="q-prompt">${esc(q.prompt)}</div>
    <div class="q-options">${(q.options||[]).map((opt,i)=>`<button class="q-option" data-option="${i}"><span>${'ABCDE'[i]}</span><b>${esc(opt)}</b></button>`).join('')}</div>
    <div class="confirm-answer-wrap"><small>Selecione uma alternativa. Você poderá conferir antes de enviar.</small><button id="confirmAnswer" class="primary-btn" disabled>Confirmar resposta</button></div>
    <div class="question-footer"><small>${esc(q.source_exam||'Exame Nacional do Ensino Médio')}</small></div>`;

  $$('.q-option',card).forEach(b=>b.onclick=()=>selectAnswerOption(Number(b.dataset.option)));

  if(visual){
    const ok=await renderVisual(q);
    if(!ok && state.current?.id===q.id){
      $('#visualWrap')?.remove();
    }
  }
}

function selectAnswerOption(option){
  if(state.answered)return;
  state.selectedOption=option;
  $$('.q-option',$('#questionCard')).forEach((b,i)=>b.classList.toggle('selected',i===option));
  const confirm=$('#confirmAnswer');
  if(confirm){
    confirm.disabled=false;
    confirm.textContent=`Confirmar ${'ABCDE'[option]}`;
    confirm.onclick=()=>submitAnswer(option);
  }
}

function bindVisualZoom(stage){
  if(innerWidth>760 || !stage) return;
  stage.onclick=()=>{
    const wrap=$('#visualWrap');
    if(!wrap)return;
    const zoom=wrap.classList.toggle('visual-zoom');
    document.body.style.overflow=zoom?'hidden':'';
  };
}

function mountVisualImage(q, src){
  return new Promise(resolve=>{
    const img=new Image();
    img.decoding='async';
    img.onload=()=>{
      const stage=$('#visualStage');
      if(!stage || state.current?.id!==q.id) return resolve(false);
      img.className='q-media-image';
      img.alt='Recurso visual original da questão';
      stage.innerHTML='';
      stage.appendChild(img);
      const head=$('#visualWrap .visual-head span:last-child');
      if(head) head.textContent=innerWidth<=760?'Toque para ampliar':'Imagem da prova';
      bindVisualZoom(stage);
      resolve(true);
    };
    img.onerror=()=>resolve(false);
    img.src=src;
  });
}

async function loadStoredVisual(q){
  try{
    const id=Number(q.id);
    if(state.visualCache.has(id)){
      return mountVisualImage(q,state.visualCache.get(id));
    }
    const {data,error}=await client.from('question_media')
      .select('data_uri')
      .eq('question_id',id)
      .maybeSingle();
    if(error || !data?.data_uri) return false;
    state.visualCache.set(id,data.data_uri);
    return mountVisualImage(q,data.data_uri);
  }catch(err){
    console.error('stored visual',err);
    return false;
  }
}

function loadLocalVisual(q){
  return q?.media_path ? mountVisualImage(q,q.media_path) : Promise.resolve(false);
}

function showVisualFallback(q){
  const stage=$('#visualStage');
  const head=$('#visualWrap .visual-head span:last-child');
  if(head) head.textContent='falha ao carregar';
  if(stage){
    stage.innerHTML=`<div class="visual-fallback">
      <span>◌</span>
      <b>O recurso visual não carregou.</b>
      <p>A questão não será pulada automaticamente. Você pode tentar de novo ou pular manualmente.</p>
      <div><button id="retryVisual" class="outline-btn small">Tentar novamente</button><button id="skipBrokenVisual" class="ghost-btn">Pular questão</button></div>
    </div>`;
    $('#retryVisual').onclick=async()=>{
      stage.innerHTML='<div class="visual-loading"></div>';
      const ok=await renderVisual(q);
      if(!ok) showVisualFallback(q);
    };
    $('#skipBrokenVisual').onclick=()=>nextQuestion();
  }
  toast('O visual falhou, mas a sessão não vai mais avançar sozinha.','error');
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
    if(await loadLocalVisual(q)) return true;
    if(await loadStoredVisual(q)) return true;
    if(!q.source_pdf_url || !q.source_page || !q.media_crop) return false;
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
    const head=$('#visualWrap .visual-head span:last-child');if(head)head.textContent=innerWidth<=760?'Toque para ampliar':'INEP · prova original';
    bindVisualZoom(stage);
    return true;
  }catch(err){
    console.error('visual',err);
    return false;
  }
}

function getQuestionHint(q){
  const topic=(q.topic||'').toLowerCase(), subject=(q.subject||'').toLowerCase();
  if(q.area==='Matemática'){
    if(/estat|média|mediana|moda/.test(topic)) return 'Macete de prova: antes de fazer contas, organize os valores em ordem. Média = soma ÷ quantidade; mediana = valor central; moda = valor que mais aparece. Muitas alternativas erradas trocam esses três conceitos.';
    if(/geometr|área|volume|polígono/.test(topic)) return 'Macete de prova: marque no desenho apenas as medidas que realmente entram na fórmula. Faça uma estimativa do tamanho da resposta antes da conta para eliminar alternativas absurdas.';
    if(/porcent|finance|razão|propor/.test(topic)) return 'Macete de prova: transforme porcentagens comuns em frações mentais: 50%=1/2, 25%=1/4, 20%=1/5, 10%=1/10. Isso costuma cortar bastante tempo de cálculo.';
    return 'Macete de prova: traduza o enunciado para uma relação matemática antes de calcular. Depois use as alternativas como ferramenta: estime a ordem de grandeza e elimine valores incompatíveis.';
  }
  if(q.area==='Ciências da Natureza'){
    if(/físic|energia|fenômenos/.test((subject+' '+topic))) return 'Macete de prova: identifique primeiro as grandezas, unidades e o que varia. Se houver gráfico, observe eixos, inclinação e tendência antes de escolher qualquer fórmula.';
    if(/quím|transform/.test((subject+' '+topic))) return 'Macete de prova: procure palavras que indiquem transformação, proporção, concentração, pH ou oxirredução. Antes de calcular, confira unidade e conservação de matéria/carga.';
    if(/biolog|vida|ecolog|saúde/.test((subject+' '+topic))) return 'Macete de prova: em Biologia, tente localizar a relação de causa e efeito. O ENEM costuma cobrar consequência de um processo, não só a definição isolada.';
  }
  if(q.area==='Linguagens') return 'Macete de prova: leia primeiro o comando e descubra exatamente o que ele quer. Depois volte ao texto procurando marcas que sustentem a alternativa — evite escolher só porque a frase “parece bonita”.';
  if(q.area==='Ciências Humanas') return 'Macete de prova: identifique tempo, espaço, agente social e conceito central. Elimine alternativas anacrônicas ou que generalizam além do que o texto permite.';
  return null;
}

function buildAnswerExplanation(q,data,selected){
  const correct=Number(data.correct_option);
  const selectedText=q.options?.[selected]||'';
  const correctText=q.options?.[correct]||'';
  const topic=q.topic||q.subject||'conteúdo';
  let method='';
  if(q.area==='Matemática') method='Releia os dados, transforme o enunciado em relações matemáticas e verifique qual alternativa satisfaz todas as condições.';
  else if(q.area==='Ciências da Natureza') method='Relacione o fenômeno descrito ao princípio científico central e elimine alternativas que contradizem causa, unidade ou mecanismo.';
  else if(q.area==='Linguagens') method='Volte ao trecho que responde ao comando e confira qual alternativa é sustentada pelo texto, pelo gênero ou pelo efeito de linguagem.';
  else method='Localize no texto o conceito histórico, geográfico, filosófico ou sociológico que o comando exige e descarte extrapolações.';
  const whyWrong=data.correct ? 'Sua escolha coincide com o gabarito oficial.' : `Você marcou ${'ABCDE'[selected]} (“${selectedText}”). Essa opção não atende completamente ao que o comando pede; compare-a com ${'ABCDE'[correct]} (“${correctText}”), que é a alternativa compatível com o gabarito oficial.`;
  return {
    summary:data.explanation||`Gabarito oficial: alternativa ${'ABCDE'[correct]}.`,
    whyWrong,
    method:`${method} O ponto de revisão desta questão é “${topic}”.`
  };
}

async function submitAnswer(option) {
  if(state.answered||!state.current||state.selectedOption===null)return;
  const confirm=$('#confirmAnswer');
  if(confirm){confirm.disabled=true;confirm.textContent='Corrigindo...';}
  state.answered=true;
  $$('.q-option',$('#questionCard')).forEach(b=>b.disabled=true);
  const duration=Math.max(1,Math.round((Date.now()-state.questionStartedAt)/1000));

  let data;
  try{
    const rpcPromise=client.rpc('submit_answer',{
      p_question_id:Number(state.current.id),
      p_selected_option:Number(option),
      p_duration_seconds:duration
    });
    const timeoutPromise=new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout_submit_answer')),15000));
    const result=await Promise.race([rpcPromise,timeoutPromise]);

    if(result?.error) throw result.error;
    data=result?.data;
    if(!data || data.correct_option===undefined || data.correct_option===null){
      throw new Error('Resposta de correção inválida.');
    }
  }catch(error){
    console.error('submit_answer',error);
    state.answered=false;
    $$('.q-option',$('#questionCard')).forEach(b=>b.disabled=false);
    if(confirm){confirm.disabled=false;confirm.textContent=`Confirmar ${'ABCDE'[option]}`;}
    const msg=error?.message==='timeout_submit_answer'
      ? 'A correção demorou demais. Tente confirmar novamente.'
      : 'Não foi possível corrigir a resposta. Tente novamente.';
    toast(msg,'error');
    return;
  }

  state.lastAnswer=data;
  const correct=Number(data.correct_option);
  $$('.q-option',$('#questionCard')).forEach((b,i)=>{
    b.classList.remove('selected');
    if(i===correct)b.classList.add('correct');
    else if(i===option)b.classList.add('wrong');
  });
  $('.confirm-answer-wrap')?.remove();
  const detail=buildAnswerExplanation(state.current,data,option);
  const hint=getQuestionHint(state.current);
  const box=document.createElement('div');
  box.className='answer-panel '+(data.correct?'':'wrong');
  box.innerHTML=`
    <div class="answer-title"><span class="answer-letter">${data.correct?'✓':'×'}</span><div><h4>${data.correct?'Resposta correta':'Resposta incorreta'}</h4><small>Gabarito: ${'ABCDE'[correct]}</small></div></div>
    <div class="answer-reason"><h5>Por que?</h5><p>${esc(detail.summary)}</p></div>
    <div class="answer-reason"><h5>${data.correct?'O que você acertou':'Onde sua alternativa falha'}</h5><p>${esc(detail.whyWrong)}</p></div>
    <div class="answer-reason"><h5>Como pensar nesta questão</h5><p>${esc(detail.method)}</p></div>
    <div id="hintBox" class="hint-box hidden"></div>
    <div class="post-answer-actions">
      ${hint?'<button id="showHint">⚡ Macete</button>':''}
      <button id="openComments">💬 Comentários</button>
      <button id="nextAfterAnswer" class="next-action">Próxima questão →</button>
    </div>`;
  $('#questionCard').appendChild(box);
  if(hint){
    $('#showHint').onclick=()=>{
      const h=$('#hintBox');
      h.classList.toggle('hidden');
      h.innerHTML=`<h4>⚡ Macete para ganhar tempo</h4><p>${esc(hint)}</p>`;
    };
  }
  $('#openComments').onclick=()=>openQuestionComments(state.current.id);
  $('#nextAfterAnswer').onclick=()=>nextQuestion();
  $('.question-mobile-actions')?.classList.add('answered');
  Promise.all([loadDashboard(),loadRecentAttempts()]).catch(err=>console.error('refresh after answer',err));
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
  $('#essayTheme').innerHTML=THEMES.map(t=>`<option value="${t.id}">${esc(t.title)}</option>`).join('')+'<option value="custom">✦ Tema personalizado</option>';
  $('#themesGrid').innerHTML=THEMES.map(t=>`<article class="theme-card"><span class="axis">${esc(t.axis.toUpperCase())}</span><h3>${esc(t.title)}</h3><p>${esc(t.prompt)}</p><button class="outline-btn small" data-theme="${t.id}">Praticar tema →</button></article>`).join('');
  updateEssayPrompt();
  $$('[data-theme]').forEach(b=>b.onclick=()=>{$('#essayTheme').value=b.dataset.theme;updateEssayPrompt();openPage('redacao');$('#essayText').focus()});
}
function getEssayThemeData(){
  if($('#essayTheme').value==='custom'){
    const title=$('#customEssayTheme').value.trim();
    const prompt=$('#customEssayPrompt').value.trim();
    return {title:title||'Tema personalizado',prompt:prompt||('Produza um texto dissertativo-argumentativo sobre: '+(title||'o tema escolhido'))};
  }
  return THEMES.find(x=>x.id===Number($('#essayTheme').value))||THEMES[0];
}
function updateEssayPrompt(){
  const custom=$('#essayTheme').value==='custom';
  $('#customThemeFields').classList.toggle('hidden',!custom);
  const t=getEssayThemeData();
  $('#essayPrompt').innerHTML=`<b>Proposta:</b> ${esc(t.prompt)}`;
}
$('#essayTheme').addEventListener('change',updateEssayPrompt);
$('#customEssayTheme').addEventListener('input',updateEssayPrompt);
$('#customEssayPrompt').addEventListener('input',updateEssayPrompt);
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
  const t=getEssayThemeData();
  if($('#essayTheme').value==='custom' && !$('#customEssayTheme').value.trim()){
    clearInterval(timer);loader.classList.add('hidden');
    return toast('Escreva o tema personalizado antes de analisar.','error');
  }
  const feedback={
    strength:scores[3]>=160?'Boa presença de mecanismos de coesão e encadeamento.':'A estrutura está identificável; vale tornar a progressão entre parágrafos ainda mais explícita.',
    priority:scores.indexOf(Math.min(...scores))+1,
    detailed_review:buildDetailedEssayReview(text,scores)
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

function buildDetailedEssayReview(text,scores){
  const words=text.match(/\S+/g)||[];
  const paras=text.split(/\n\s*\n/).filter(x=>x.trim());
  const sentences=text.split(/[.!?]+/).map(x=>x.trim()).filter(Boolean);
  const connectors=(text.match(/\b(portanto|além disso|contudo|assim|desse modo|nesse sentido|porém|todavia|consequentemente|logo|dessa forma|ademais)\b/gi)||[]).length;
  const intervention=/\b(estado|governo|escola|sociedade|mídia|empresas|família|ministério|prefeitura)\b/i.test(text)&&/\b(deve|devem|promover|criar|ampliar|garantir|implementar|investir)\b/i.test(text);
  const avg=sentences.length?Math.round(words.length/sentences.length):words.length;
  const thesis=/\b(portanto|assim|desse modo|diante disso|é necessário|é preciso|torna-se)\b/i.test(text);
  const notes=[];
  notes.push(paras.length>=4?'A estrutura em parágrafos está próxima do formato esperado para uma dissertação-argumentativa.':'Organize melhor a arquitetura do texto: introdução, dois desenvolvimentos e conclusão costuma ser uma base segura.');
  notes.push(connectors>=5?'Você usa conectivos com boa frequência; agora vale variar e conferir se cada um expressa a relação lógica correta.':'A ligação entre as ideias pode ficar mais explícita. Use conectivos de causa, contraste, consequência e conclusão sem repeti-los demais.');
  notes.push(avg>28?'Algumas frases estão longas. Quebre períodos muito extensos para reduzir ambiguidade e erros de pontuação.':'O tamanho médio dos períodos está controlado, o que favorece clareza.');
  notes.push(intervention?'Há sinais de proposta de intervenção com agente e ação. Complete com meio, finalidade e detalhamento sempre que faltar.':'A conclusão precisa deixar mais claro quem fará o quê, por qual meio e com qual finalidade.');
  return {paras:paras.length,words:words.length,connectors,intervention,thesis,notes};
}

function showEssayResult(text,scores,total){
  const comps=['Norma-padrão','Compreensão da proposta','Argumentação','Coesão','Intervenção'];
  const weak=scores.map((s,i)=>({s,i})).sort((a,b)=>a.s-b.s)[0].i;
  const review=buildDetailedEssayReview(text,scores);
  const tips=[
    'Revise concordância, regência, pontuação e escolha vocabular. Procure períodos longos e veja se podem ser divididos.',
    'Faça cada parágrafo conversar diretamente com o tema. Evite repertórios que aparecem só como citação e não ajudam a defender a tese.',
    'Transforme afirmações em raciocínio: apresente a ideia, explique a causa, mostre uma consequência e conecte isso à tese.',
    'Use conectivos variados e faça retomadas claras. Coesão não é encher o texto de “portanto”; é deixar visível a relação entre as ideias.',
    'Na intervenção, procure cinco peças: agente, ação, meio/modo, finalidade e detalhamento — sempre respeitando os direitos humanos.'
  ];
  const t=getEssayThemeData();
  $('#essayResult').innerHTML=`<div class="score-card"><span class="eyebrow">NOTA ESTIMADA</span><div class="score-circle" style="background:conic-gradient(#5f7cff 0 ${total/10}%,#1e2b42 ${total/10}% 100%)"><b>${total}</b></div><p>${review.words} palavras · ${review.paras} parágrafo(s)</p></div>
    <div class="competencies">${scores.map((s,i)=>`<div class="comp-row"><span>C${i+1}</span><div><i style="width:${s/2}%"></i></div><b>${s}</b></div>`).join('')}</div>
    <div class="detailed-review">
      <article><h4>Resenha da NIA</h4><p>Seu texto sobre “${esc(t.title)}” tem uma base reconhecível de dissertação. O principal ponto de evolução agora está na competência C${weak+1} (${comps[weak]}). Em vez de mexer em tudo de uma vez, priorize esse aspecto na próxima versão e depois faça uma segunda revisão focada em clareza e correção gramatical.</p><div class="nia-review-signature">NIA · análise orientativa do NEXO</div></article>
      <article><h4>O que está funcionando</h4><p>${scores[3]>=160?'A progressão entre as partes está relativamente bem marcada e há mecanismos de ligação entre ideias.':'Já existe uma linha de raciocínio identificável; com conectivos mais precisos e retomadas melhores, ela ficará mais fácil de acompanhar.'}</p></article>
      <article><h4>O que eu melhoraria primeiro</h4><p>${tips[weak]}</p></article>
      <article><h4>Leitura de estrutura</h4><div class="review-checklist">${review.notes.map(n=>`<span><i>✓</i>${esc(n)}</span>`).join('')}</div></article>
      <article><h4>Plano para reescrever</h4><p>1) releia o tema e escreva sua tese em uma frase; 2) dê uma função para cada parágrafo; 3) em cada argumento, ligue causa e consequência; 4) revise conectivos; 5) finalize conferindo a proposta de intervenção e a norma-padrão.</p></article>
      <article><h4>Importante</h4><p>Esta análise é uma ferramenta automática de estudo, baseada em regras linguísticas e estruturais. Ela não substitui a correção humana nem a avaliação oficial do ENEM.</p></article>
    </div>`;
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
  const {data,error}=await client.from('questions').select('id,area,subject,topic,difficulty,source_year,source_exam,source_question_number,source_reference,base_text,prompt,options,media_type,media_path,source_pdf_url,source_page,media_crop').eq('id',id).single();
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

async function openQuestionComments(questionId){
  if(!questionId)return;
  $('#commentModal').dataset.questionId=String(questionId);
  $('#commentModal').classList.remove('hidden');
  document.body.style.overflow='hidden';
  await loadQuestionComments(questionId);
}
$('#closeComments').onclick=()=>{ $('#commentModal').classList.add('hidden'); document.body.style.overflow=''; };
$('#commentModal').addEventListener('click',e=>{if(e.target===$('#commentModal'))$('#closeComments').click()});

async function loadQuestionComments(questionId){
  $('#questionComments').innerHTML='<div class="comment-empty">Carregando comentários...</div>';
  const {data,error}=await client.rpc('get_question_comments',{p_question_id:Number(questionId)});
  if(error){console.error(error);$('#questionComments').innerHTML='<div class="comment-empty">Não foi possível carregar os comentários.</div>';return}
  $('#questionComments').innerHTML=data?.length?data.map(c=>`<article class="comment-item">
    <div class="comment-top"><div class="comment-author"><span class="mini-avatar">${esc((c.author_name||'A')[0])}</span><div class="comment-meta"><b>${esc(c.author_name)}</b><small>${new Date(c.created_at).toLocaleString('pt-BR')}</small></div></div>
    <div class="comment-actions">${c.is_mine?'<button data-delete-comment="'+c.id+'" class="danger">Excluir</button>':'<button data-report-comment="'+c.id+'">Denunciar</button>'}</div></div>
    <p>${esc(c.body)}</p>
  </article>`).join(''):'<div class="comment-empty">Ainda não há comentários. Seja o primeiro a compartilhar uma dúvida ou um jeito de resolver.</div>';
  $$('[data-report-comment]').forEach(b=>b.onclick=()=>reportComment(Number(b.dataset.reportComment)));
  $$('[data-delete-comment]').forEach(b=>b.onclick=()=>deleteComment(Number(b.dataset.deleteComment)));
}
$('#sendComment').onclick=async()=>{
  const qid=Number($('#commentModal').dataset.questionId),body=$('#commentText').value.trim();
  if(!qid||body.length<2)return toast('Escreva um comentário antes de enviar.','error');
  const {error}=await client.from('question_comments').insert({question_id:qid,user_id:state.user.id,body});
  if(error)return toast('Não foi possível comentar.','error');
  $('#commentText').value='';toast('Comentário publicado.');loadQuestionComments(qid);
};
async function reportComment(id){
  const reason=window.prompt('Por que você está denunciando este comentário?\nEx.: ofensa, spam, conteúdo impróprio');
  if(!reason?.trim())return;
  const {data,error}=await client.rpc('report_comment',{p_comment_id:id,p_reason:reason.trim()});
  if(error)return toast('Não foi possível enviar a denúncia.','error');
  toast(data?.auto_hidden?'Comentário ocultado após múltiplas denúncias.':'Denúncia enviada para moderação.');
  loadQuestionComments(Number($('#commentModal').dataset.questionId));
}
async function deleteComment(id){
  if(!confirm('Excluir este comentário?'))return;
  const {error}=await client.from('question_comments').delete().eq('id',id);
  if(error)return toast('Não foi possível excluir o comentário.','error');
  loadQuestionComments(Number($('#commentModal').dataset.questionId));
}

const ENEM_2026 = {
  firstDate:'2026-11-08',
  secondDate:'2026-11-15',
  gatesOpen:'12h',
  gatesClose:'13h',
  starts:'13h30',
  firstEnds:'19h',
  secondEnds:'18h30'
};

function daysUntil(dateString){
  const today=new Date();
  const target=new Date(dateString+'T00:00:00-03:00');
  const start=new Date(today.getFullYear(),today.getMonth(),today.getDate());
  return Math.ceil((target-start)/86400000);
}

function enemDatesText(){
  const d1=daysUntil(ENEM_2026.firstDate);
  let countdown='';
  if(d1>1) countdown=' Faltam cerca de '+d1+' dias para o primeiro domingo.';
  else if(d1===1) countdown=' É amanhã: hoje é dia de descansar, separar o material e evitar maratona de conteúdo.';
  else if(d1===0) countdown=' O primeiro dia é hoje.';
  else {
    const d2=daysUntil(ENEM_2026.secondDate);
    if(d2>0) countdown=' O primeiro domingo já passou; faltam cerca de '+d2+' dias para o segundo.';
    else if(d2===0) countdown=' O segundo dia é hoje.';
    else countdown=' As duas aplicações regulares de 2026 já passaram. Para a próxima edição, confirme o novo cronograma no INEP.';
  }
  return '📅 ENEM 2026: as provas regulares serão em 8 e 15 de novembro.'+countdown+
    '\n\nNo 1º dia: Linguagens, Ciências Humanas e Redação. No 2º: Ciências da Natureza e Matemática.'+
    '\n\nOs portões abrem às 12h, fecham às 13h e a prova começa às 13h30, sempre no horário de Brasília. Dados do cronograma oficial do INEP.';
}

const NEXO_ANSWERS=[
  {k:/quando.*enem|que dia.*enem|data.*prova|datas.*enem|faltam quantos|quanto falta/i,mood:'confiante',a:()=>enemDatesText()},
  {k:/primeiro dia|1[ºo] dia|dia 1|o que cai.*primeiro/i,mood:'serio',a:'No primeiro domingo do ENEM você faz Linguagens, Ciências Humanas e a Redação. A duração regular é de 5h30.\n\nMinha sugestão: não deixe a redação para os minutos finais. Defina um ponto da prova para iniciar o texto mesmo que ainda existam questões objetivas pendentes.'},
  {k:/segundo dia|2[ºo] dia|dia 2|o que cai.*segundo/i,mood:'confiante',a:'No segundo domingo você faz Ciências da Natureza e Matemática. A duração regular é de 5 horas.\n\nComo costuma haver mais cálculo, proteja seu tempo: se uma questão não avançar depois de uma tentativa objetiva, marque e siga. Voltar depois é estratégia, não desistência.'},
  {k:/hor[aá]rio|port[aã]o|fecha.*port|abre.*port|come[cç]a.*prova/i,mood:'serio',a:'⏰ Horário oficial: portões abrem às 12h, fecham às 13h e a aplicação começa às 13h30, pelo horário de Brasília. No 1º dia o término regular é às 19h; no 2º, às 18h30.\n\nPlaneje chegar com bastante antecedência. O pior uso da energia no dia é gastá-la correndo contra o relógio antes mesmo da prova começar.'},
  {k:/o que levar|levar.*prova|caneta|documento|identifica[cç][aã]o/i,mood:'confiante',a:'🎒 Obrigatório: caneta esferográfica de tinta preta e corpo transparente + documento de identificação válido, físico ou digital aceito pelo edital.\n\nÉ aconselhável levar o Cartão de Confirmação. Separe também água e um lanche simples. Faça essa mochila na véspera para não depender da memória quando estiver ansioso.'},
  {k:/celular|rel[oó]gio|proibid|pode levar.*l[aá]pis|calculadora|fone/i,mood:'serio',a:'Celular, relógio de qualquer tipo, fones, calculadora, lápis, borracha, régua e vários outros itens não podem ficar com você durante a prova. Os eletrônicos devem ficar desligados no envelope porta-objetos fornecido pela organização.\n\nUse somente caneta preta de material transparente para responder. No dia, siga as instruções dos fiscais mesmo que você já conheça as regras.'},
  {k:/local.*prova|onde.*prova|endere[cç]o.*prova/i,mood:'confiante',a:'O local de prova deve ser conferido na Página do Participante do ENEM, no cartão de confirmação. Quando estiver disponível, confira endereço, bloco/sala e planeje o trajeto antes.\n\nUma boa regra é simular a ida alguns dias antes ou, no mínimo, verificar transporte e tempo de deslocamento com margem.'},
  {k:/quantas quest|n[uú]mero.*quest|estrutura.*enem/i,mood:'confiante',a:'O ENEM regular tem 180 questões objetivas, 45 por área, distribuídas em dois domingos, além da redação.\n\nNão trate as 90 questões de cada dia como 90 decisões gigantes. Pense em blocos menores: uma página, uma questão, uma decisão por vez.'},
  {k:/tri|teoria de resposta|nota.*quest|quest[aã]o f[aá]cil/i,mood:'serio',a:'A TRI não olha apenas quantas você acertou; ela considera o padrão de respostas e a coerência entre itens de diferentes dificuldades. Por isso, uma questão simples que você sabe fazer merece muito cuidado.\n\nNa prática: não desperdice fáceis por pressa, não tente adivinhar “peso” de questão e priorize consistência.'},
  {k:/tempo|2 min|3 min|rel[oó]gio|administrar.*prova/i,mood:'confiante',a:'⏱ Não precisa cronometrar cada item obsessivamente. Trabalhe por blocos. Se uma questão passou de uns 3 minutos sem progresso real, marque e siga.\n\nFaça uma primeira passada nas que você entende rápido, uma segunda nas intermediárias e guarde um bloco final para difíceis + cartão-resposta. No 1º dia, reserve tempo real para planejar, escrever e revisar a redação.'},
  {k:/por onde come[cç]ar|ordem.*prova|come[cç]ar.*quest/i,mood:'confiante',a:'Comece pelo que te coloca em ritmo. Se Linguagens te aquece, vá nela; se a redação te preocupa muito, faça ao menos o projeto do texto cedo.\n\nA melhor ordem não é a mais “inteligente” no papel — é a que reduz travamentos e mantém sua tomada de decisão estável.'},
  {k:/cart[aã]o.?resposta|gabarito.*cart[aã]o|marcar.*cart/i,mood:'serio',a:'Não deixe todo o cartão-resposta para o último minuto. Transfira em blocos e confira número da questão + alternativa antes de marcar.\n\nUm erro de deslocamento no cartão pode contaminar várias respostas, então desacelere alguns segundos nessa etapa.'},
  {k:/chut|n[aã]o sei|eliminar alternativa/i,mood:'confiante',a:'Se precisar chutar, primeiro tente eliminar. Procure alternativa incompatível com unidade, escala, período histórico, ideia central do texto ou dado do enunciado.\n\nDepois escolha entre as restantes sem gastar energia infinita. Chute consciente é melhor do que deixar em branco por perfeccionismo.'},
  {k:/redação|reda[cç][aã]o.*enem|melhorar.*texto/i,mood:'confiante',a:'Na redação, pense em quatro tarefas: compreender exatamente o recorte do tema, formular uma tese clara, desenvolver dois argumentos e fechar com intervenção completa.\n\nAntes de escrever, gaste alguns minutos no esqueleto: tese → argumento 1 → argumento 2 → agente/ação/meio/finalidade. Isso diminui repetição e ajuda a manter o texto no tema.'},
  {k:/introdu[cç][aã]o|como come[cç]ar.*reda/i,mood:'serio',a:'Uma introdução segura tem 3 movimentos: contextualização curta, apresentação do problema e tese.\n\nVocê não precisa começar com uma frase “genial”. Precisa deixar claro qual problema vai discutir e quais caminhos argumentativos o texto seguirá.'},
  {k:/desenvolvimento|argumento.*reda|par[aá]grafo.*argument/i,mood:'serio',a:'No desenvolvimento, cada parágrafo precisa defender uma ideia — não apenas acumular repertório. Uma estrutura eficiente é: tópico frasal → explicação da causa ou consequência → repertório conectado → fechamento que volta à tese.\n\nSe o repertório não ajuda a provar o argumento, ele está decorando o texto, não trabalhando por você.'},
  {k:/conclus[aã]o|interven[cç][aã]o/i,mood:'confiante',a:'Na conclusão do ENEM, confira cinco peças: agente + ação + meio/modo + finalidade + detalhamento.\n\nPergunte: quem fará? O quê? Como? Para quê? Algum elemento foi detalhado? E a proposta respeita os direitos humanos? Se sim, sua intervenção tende a ficar muito mais completa.'},
  {k:/compet[eê]ncia|c1|c2|c3|c4|c5/i,mood:'serio',a:'As cinco competências avaliam, em resumo: C1 domínio da escrita formal; C2 compreensão do tema e repertório; C3 seleção/organização dos argumentos; C4 coesão; C5 proposta de intervenção.\n\nQuando revisar, não tente “sentir” se a redação está boa. Faça uma checagem por competência — fica muito mais objetivo.'},
  {k:/zero.*reda|reda.*zer|motivo.*zero/i,mood:'serio',a:'Algumas situações podem zerar a redação, como fuga total ao tema, texto insuficiente, desrespeito à estrutura dissertativo-argumentativa exigida ou identificação indevida, conforme as regras do exame.\n\nNa prática, sua maior proteção é simples: responda exatamente ao recorte proposto, escreva um texto completo e siga as instruções do caderno.'},
  {k:/matem[aá]tica|conta|c[aá]lculo/i,mood:'confiante',a:'Em Matemática, não comece calculando por impulso. Primeiro descubra: o que foi dado? o que pedem? qual unidade? qual ordem de grandeza faria sentido?\n\nDepois use as alternativas como ferramenta. Estimar antes da conta costuma eliminar respostas impossíveis e economiza tempo.'},
  {k:/linguagens|portugu[eê]s|interpreta[cç][aã]o/i,mood:'serio',a:'Em Linguagens, leia o comando antes de mergulhar no texto. Descubra se a questão pede efeito de sentido, finalidade, estratégia argumentativa, relação entre textos ou informação explícita.\n\nA alternativa correta precisa responder ao comando e ser sustentada pelo texto — não basta parecer verdadeira em geral.'},
  {k:/humanas|hist[oó]ria|geografia|filosofia|sociologia/i,mood:'serio',a:'Em Humanas, marque mentalmente quatro coisas: tempo, espaço, agente social e conceito central. Depois elimine alternativas anacrônicas, absolutas demais ou que extrapolam o documento.\n\nQuando houver texto-base, trate-o como evidência — não como decoração.'},
  {k:/natureza|biologia|qu[ií]mica|f[ií]sica/i,mood:'serio',a:'Em Natureza, identifique primeiro o fenômeno e as grandezas envolvidas. Em gráfico: eixos, unidade e tendência. Em experimento: variável manipulada, medida e controle. Em cálculo: unidade antes da fórmula.\n\nIsso reduz a chance de escolher uma fórmula conhecida que não responde ao problema.'},
  {k:/plano.*estud|organiza.*estud|rotina|cronograma/i,mood:'confiante',a:'📚 Monte um ciclo simples: teoria essencial → questões → correção ativa → revisão dos erros. Seus erros devem decidir boa parte do próximo bloco de estudo.\n\nUma sessão de 60–90 minutos pode ter: 15–20 min de revisão, 35–50 min de questões e 15–20 min analisando por que você errou. Melhor constância real do que um cronograma perfeito que você não consegue cumprir.'},
  {k:/revis[aã]o|revisar|caderno de erros/i,mood:'confiante',a:'Revisão eficiente não é reler tudo. Volte principalmente ao que você quase esqueceu e ao que errou.\n\nFaça um caderno de erros curto: questão/tema → por que errei → qual pista eu deveria ter percebido → regra ou ideia que resolve. Depois refaça sem olhar.'},
  {k:/simulado|simula[cç][aã]o/i,mood:'confiante',a:'Use simulados para treinar decisão e resistência, não só nota. Reproduza tempo, pausas e estratégia de marcação.\n\nDepois, classifique os erros: conteúdo, interpretação, cálculo, pressa ou gestão de tempo. Essa classificação vale mais do que apenas olhar o percentual final.'},
  {k:/procrast|enrol|n[aã]o consigo come[cç]ar/i,mood:'acolhedor',a:'Se começar está difícil, reduza a tarefa até ela ficar pequena demais para assustar: abra a matéria, escolha 5 questões e faça só a primeira.\n\nNão negocie com a ideia de “estudar muito”; negocie com a próxima ação de 10 minutos. Depois que o movimento começa, você decide se continua.'},
  {k:/foco|concentr|distra/i,mood:'serio',a:'Para recuperar foco, diminua atrito: celular longe, uma única tarefa aberta e um bloco curto com objetivo específico — por exemplo, “resolver 12 questões de porcentagem e corrigir os erros”.\n\nSe a mente fugir, não transforme isso em bronca. Perceba, volte e continue. Foco é retorno repetido, não concentração perfeita.'},
  {k:/motiva|desanim|pregui[cç]/i,mood:'animado',a:'Você não precisa sentir motivação para começar. Em semanas difíceis, a meta pode ser manter o vínculo com o estudo: 20 minutos bem feitos ainda contam.\n\nEscolha uma vitória pequena agora — 5 questões, uma revisão ou um parágrafo de redação. Resultado grande costuma ser soma de dias comuns.'},
  {k:/ansied|nervos|press[aã]o.*prova|cora[cç][aã]o.*aceler/i,mood:'acolhedor',a:'Se a ansiedade estiver alta, não tente “proibir” a sensação. Ajude o corpo a desacelerar: apoie os pés no chão, solte o ar um pouco mais devagar do que puxa por 1–2 minutos e escolha uma ação pequena e concreta.\n\nNa prova: leia o comando, faça uma tentativa objetiva e, se travar, marque para voltar. Isso tira da sua cabeça a obrigação de resolver tudo agora.\n\nSe essa ansiedade estiver muito intensa, frequente ou atrapalhando sono e rotina, vale conversar com um psicólogo ou outro profissional de saúde.'},
  {k:/p[aâ]nico|crise.*ansiedade|n[aã]o consigo respirar|tremendo/i,mood:'acolhedor',a:'Se você estiver em uma crise agora, priorize se estabilizar antes de estudar: sente-se, firme os pés no chão, olhe ao redor e nomeie coisas que você vê e ouve. Faça expirações lentas, sem forçar respirações enormes.\n\nQuando a intensidade baixar, escolha algo simples: água, ambiente mais tranquilo e uma pausa curta. Se crises assim se repetem ou parecem incontroláveis, procure apoio profissional.'},
  {k:/deu branco|branco.*prova|esqueci tudo|trav.*quest/i,mood:'acolhedor',a:'Deu branco? Isso não prova que você “não sabe”. Pare de encarar a mesma linha. Solte o ar, releia somente o comando e procure uma informação concreta que você reconhece.\n\nSe em 30–60 segundos nada destravar, pule e volte. Muitas vezes o cérebro recupera o acesso ao conteúdo quando a pressão daquela questão diminui.'},
  {k:/dormir|sono|ins[oô]nia|virar a noite/i,mood:'acolhedor',a:'Sono faz parte da preparação. Evite tentar compensar conteúdo virando a noite — isso costuma cobrar caro em atenção, memória de trabalho e controle emocional.\n\nNa semana da prova, preserve horários relativamente estáveis. Na véspera, seu objetivo é chegar funcional, não aprender o edital inteiro em uma noite.'},
  {k:/cansad|esgotad|burnout|exaust/i,mood:'acolhedor',a:'Se você está esgotado, aumentar a cobrança pode diminuir ainda mais o rendimento. Faça uma triagem: o que é essencial hoje, o que pode esperar e quanto descanso seu corpo está pedindo.\n\nReduza volume por um dia se necessário e mantenha apenas um contato leve com o estudo. Persistência não é ignorar limite físico.'},
  {k:/compara|todo mundo.*melhor|sou burro|sou ruim|n[aã]o sou capaz/i,mood:'acolhedor',a:'Comparar bastidores seus com o resultado dos outros distorce a realidade. Para a prova, o dado útil é: quais erros você está cometendo hoje e qual deles consegue reduzir nesta semana?\n\nSua preparação não precisa parecer impressionante. Precisa ficar um pouco mais consistente. Vamos trabalhar no próximo ponto controlável.'},
  {k:/medo.*fracass|medo.*n[aã]o passar|e se eu n[aã]o passar|decepcionar/i,mood:'acolhedor',a:'Esse medo costuma misturar prova, futuro e expectativa de outras pessoas numa única coisa enorme. Separe: o ENEM é uma avaliação importante, mas não é uma definição do seu valor nem a única decisão possível para a sua vida.\n\nHoje você controla processo: estudar, descansar, treinar estratégia e comparecer preparado. O resultado vem depois.'},
  {k:/pais|fam[ií]lia.*press|cobran[cç]a/i,mood:'acolhedor',a:'Cobrança de família pode transformar estudo em ameaça. Se for possível, tente conversar com linguagem concreta: diga o que você está fazendo, qual é seu plano e qual tipo de apoio ajuda — por exemplo, menos perguntas sobre nota e mais respeito ao horário de estudo/descanso.\n\nVocê pode levar a prova a sério sem transformar cada dia num julgamento.'},
  {k:/perfeccion|tenho que acertar tudo|n[aã]o posso errar/i,mood:'acolhedor',a:'No ENEM, tentar garantir perfeição em cada questão pode destruir sua gestão de tempo. O objetivo é somar o máximo de boas decisões durante horas de prova.\n\nAceite erros inevitáveis, proteja as questões acessíveis e não entregue 8 minutos para uma única questão só porque você “deveria” saber.'},
  {k:/v[eé]spera|dia antes|um dia antes/i,mood:'acolhedor',a:'🌙 Na véspera, faça pouco e conhecido: revisão leve de fórmulas/erros frequentes, confira documento, canetas, lanche, água, trajeto e horário.\n\nEvite simulado gigante ou assunto novo até tarde. Sua prioridade é chegar com energia cognitiva e sem pendências logísticas.'},
  {k:/lanche|comer|alimenta|[aá]gua|hidrata/i,mood:'confiante',a:'Leve água e alimentos que você já conhece e que sejam fáceis de consumir. Evite transformar o dia da prova em teste de energético, suplemento ou comida diferente.\n\nO INEP orienta que alimentos possam ser vistoriados; itens industrializados devem estar lacrados ou com rótulo visível. Coma de modo simples e regular.'},
  {k:/banheiro|ir ao banheiro/i,mood:'serio',a:'Você pode precisar ir ao banheiro durante a aplicação seguindo o procedimento dos fiscais. Estratégia prática: use o banheiro antes de entrar, hidrate-se sem exagero e não espere chegar a um desconforto enorme para pedir para sair.'},
  {k:/inscri[cç][aã]o|inscrever|taxa.*enem/i,mood:'serio',a:'Para o ENEM 2026, o período regular de inscrições foi de 25 de maio a 12 de junho, e o pagamento da taxa teve prazo até 22 de junho.\n\nComo esses prazos mudam a cada edição, para qualquer situação específica de inscrição o que vale é a Página do Participante e o edital oficial do INEP.'},
  {k:/resultado|nota.*enem|quando sai.*nota/i,mood:'serio',a:'A data de divulgação do resultado deve ser confirmada no cronograma oficial do INEP para a edição correspondente. Eu prefiro não inventar uma data quando ela pode mudar.\n\nQuando a nota sair, olhe cada área e a redação separadamente antes de pensar em Sisu, Prouni ou Fies.'},
  {k:/sisu|prouni|fies|faculdade/i,mood:'confiante',a:'Depois do ENEM, sua nota pode ser usada em processos como Sisu, Prouni e Fies, conforme as regras e calendários de cada programa.\n\nA melhor escolha depende de curso, instituição, modalidade e sua nota por área. Quando você tiver suas notas, posso te ajudar a organizar uma comparação sem misturar tudo.'},
  {k:/rem[eé]dio|ansiol[ií]tico|calmante|medica[cç][aã]o/i,mood:'serio',a:'Não comece, pare ou mude remédio para ansiedade por conta própria só por causa da prova. Se você já usa medicação, siga a orientação do profissional que te acompanha.\n\nSe existe uma dúvida específica sobre efeito, dose ou horário, fale com médico ou farmacêutico — isso é mais seguro do que testar algo novo perto do ENEM.'},
  {k:/quero morrer|me matar|suic[ií]d|n[aã]o quero viver|acabar com tudo/i,mood:'acolhedor',a:'Eu quero tratar isso como algo importante. Se você está pensando em se machucar ou não se sente seguro agora, procure uma pessoa de confiança e fique perto de alguém.\n\nNo Brasil, você pode ligar para o CVV no 188. Se houver risco imediato, procure um pronto atendimento ou acione o SAMU 192 / emergência local. Estudo e prova podem esperar — sua segurança vem primeiro.'}
];

function nexoQuestionContext(text){
  if(!/(essa quest|quest[aã]o atual|me ajuda.*quest|macete.*quest|como resolver.*essa)/i.test(text))return null;
  const q=state.current;
  if(!q)return {mood:'duvida',text:'Abre uma questão no NEXO e me chama de novo. Aí eu consigo usar a matéria e o tema da questão atual para te orientar sem entregar resposta antes da hora.'};
  const hint=getQuestionHint(q);
  if(state.lastAnswer){
    const selected=state.selectedOption===null?Number(state.lastAnswer.correct_option):Number(state.selectedOption);
    const detail=buildAnswerExplanation(q,state.lastAnswer,selected);
    return {mood:state.lastAnswer.correct?'animado':'acolhedor',text:
      'Estamos em '+(q.subject||q.area)+' — '+(q.topic||'tema da questão')+'.\n\n'+
      detail.summary+'\n\n'+detail.method+(hint?'\n\n⚡ '+hint:'')};
  }
  return {mood:'serio',text:
    'Estamos em '+(q.subject||q.area)+' — '+(q.topic||'tema da questão')+'. Eu não vou te entregar o gabarito antes de você confirmar.\n\n'+
    (hint||'Comece pelo comando: descubra exatamente o que ele pede, volte ao texto/dados e elimine alternativas que não respondem ao recorte.')};
}

function niaAnswer(text){
  const context=nexoQuestionContext(text);
  if(context)return context;
  const hit=NEXO_ANSWERS.find(x=>x.k.test(text));
  if(hit)return {mood:hit.mood||'feliz',text:typeof hit.a==='function'?hit.a():hit.a};
  return {mood:'duvida',text:
    'Boa pergunta. Eu ainda não tenho uma resposta fechada para esse jeito específico de perguntar — mas posso continuar com você.\n\nTenta reformular em uma destas linhas: “como estudo isso?”, “o que faço na prova?”, “estou ansioso”, “me ajuda nessa questão”, “como melhorar a redação?” ou “qual é a regra do ENEM?”.\n\nSe for sobre a questão que está aberta, diga “me ajuda nessa questão” que eu uso o contexto dela.'};
}

const NEXO_EMOTIONS={feliz:'😊',serio:'🎯',confiante:'💪',duvida:'🤔',acolhedor:'💙',animado:'✨'};

function initNexoMascotVisuals(){
  const a=window.NEXO_MASCOT_ASSETS;
  if(!a)return;
  const launcher=$('#nexoLauncherAvatar'),avatar=$('#nexoAvatarImage'),hero=$('#nexoHeroImage');
  if(launcher)launcher.src=a.head;
  if(avatar)avatar.src=a.head;
  if(hero)hero.src=a.hero;
}
initNexoMascotVisuals();

function setNexoMood(mood='feliz'){
  const panel=$('#niaPanel');
  if(panel)panel.dataset.mood=mood;
  const em=$('#nexoEmotion');
  if(em)em.textContent=NEXO_EMOTIONS[mood]||'🐾';
}

function addNiaMessage(text,type){
  const div=document.createElement('div');
  div.className='nia-msg '+type;
  div.textContent=text;
  $('#niaMessages').appendChild(div);
  $('#niaMessages').scrollTop=$('#niaMessages').scrollHeight;
}

function addNexoTyping(){
  const div=document.createElement('div');
  div.className='nia-msg bot typing';
  div.innerHTML='<i></i><i></i><i></i>';
  $('#niaMessages').appendChild(div);
  $('#niaMessages').scrollTop=$('#niaMessages').scrollHeight;
  return div;
}

function askNia(text){
  if(!text?.trim())return;
  const clean=text.trim();
  addNiaMessage(clean,'user');
  setNexoMood('duvida');
  const panel=$('#niaPanel');
  panel?.classList.add('thinking');
  const typing=addNexoTyping();
  const result=niaAnswer(clean);
  const delay=Math.min(900,Math.max(380,clean.length*9));
  setTimeout(()=>{
    typing.remove();
    panel?.classList.remove('thinking');
    setNexoMood(result.mood);
    addNiaMessage(result.text,'bot');
  },delay);
}

$('#niaButton').onclick=()=>{
  $('#niaPanel').classList.toggle('hidden');
  if(!$('#niaPanel').classList.contains('hidden'))setNexoMood('feliz');
};
$('#closeNia').onclick=()=>$('#niaPanel').classList.add('hidden');
$('#niaSend').onclick=()=>{const v=$('#niaInput').value;$('#niaInput').value='';askNia(v)};
$('#niaInput').addEventListener('keydown',e=>{if(e.key==='Enter'){$('#niaSend').click()}});
$$('[data-nia]').forEach(b=>b.onclick=()=>askNia(b.dataset.nia));

function normalizeNexoStyle(style){
  const legacy={neon:'classic',street:'competitive'};
  return legacy[style]||style;
}
function applyNexoStyle(style,save=true){
  style=normalizeNexoStyle(style);
  const allowed=['classic','purple','academic','competitive'];
  if(!allowed.includes(style))style='classic';
  const avatar=$('#niaAvatar');
  if(avatar)avatar.className='nia-mini-avatar outfit-'+style;
  $$('[data-outfit]').forEach(b=>b.classList.toggle('active',b.dataset.outfit===style));
  localStorage.setItem('nexo-style',style);
  if(save&&state.user){
    client.from('profiles').update({assistant_outfit:style,updated_at:new Date().toISOString()}).eq('id',state.user.id)
      .then(({error})=>{if(error)console.error('nexo style',error)});
  }
  setNexoMood(style==='competitive'?'confiante':style==='academic'?'serio':'feliz');
}
function applyNiaOutfit(outfit,save=true){applyNexoStyle(outfit,save)}
$$('[data-outfit]').forEach(b=>b.onclick=()=>applyNexoStyle(b.dataset.outfit,true));


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

  const reports=await client.rpc('get_reported_comments');
  $('#reportedComments').innerHTML=reports.data?.length?reports.data.map(x=>`<div class="feedback-entry"><span class="mini-avatar">!</span><div><b>${esc(x.author_name)} · ${x.report_count} denúncia(s)</b><p>${esc(x.body)}</p><small>Questão #${x.question_id}</small><div class="comment-actions"><button data-admin-remove="${x.comment_id}" class="danger">Remover comentário</button></div></div></div>`).join(''):'<p style="color:var(--muted)">Nenhum comentário denunciado.</p>';
  $$('[data-admin-remove]').forEach(b=>b.onclick=async()=>{if(!confirm('Remover este comentário da comunidade?'))return;const {error}=await client.rpc('admin_remove_comment',{p_comment_id:Number(b.dataset.adminRemove)});if(error)return toast('Falha ao remover.','error');toast('Comentário removido.');loadAdmin()});
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