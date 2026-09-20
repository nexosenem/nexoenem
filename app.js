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

const CLOUDINARY = Object.freeze({
  cloudName:'nmhbq6sd',
  uploadPreset:'nexo_uploads'
});

const NEXO_EMOTIONS=Object.freeze({
  feliz:'😊',serio:'🎯',confiante:'💪',duvida:'🤔',acolhedor:'💙',animado:'✨'
});
const NEXO_BASE_MASCOT=window.NEXO_MASCOT_ASSETS?.head||'';
const NEXO_MOOD_IMAGES=Object.freeze({
  feliz:'./assets/nexo-expressions/feliz.avif',
  serio:'./assets/nexo-expressions/serio.avif',
  confiante:'./assets/nexo-expressions/confiante.avif',
  duvida:'./assets/nexo-expressions/pensativo.avif',
  surpresa:'./assets/nexo-expressions/feliz.avif',
  pensativo:'./assets/nexo-expressions/pensativo.avif',
  acolhedor:'./assets/nexo-expressions/acolhedor.avif',
  calmo:'./assets/nexo-expressions/acolhedor.avif',
  animado:'./assets/nexo-expressions/confiante.avif',
  motivado:'./assets/nexo-expressions/confiante.avif'
});
const NEXO_MEDIA_IMAGES=Object.freeze({
  avatar:NEXO_MOOD_IMAGES.confiante,
  bust:'./assets/nexo-family/bust.avif',
  hero:'./assets/nexo-family/hero.avif',
  bustConfiante:'./assets/nexo-family/bust-confiante.avif',
  bustPensativo:'./assets/nexo-family/bust-pensativo.avif',
  bustAcolhedor:'./assets/nexo-family/bust-acolhedor.avif'
});

async function getCloudinaryUploadAuth(){
  try{
    const {data,error}=await client.functions.invoke('cloudinary-signature',{body:{}});
    if(error)throw error;
    if(!data?.signature||!data?.api_key||!data?.timestamp)throw new Error(data?.error||'Assinatura do Cloudinary indisponível.');
    return data;
  }catch(err){
    console.error('Cloudinary signed upload',err);
    throw new Error('Upload seguro indisponível. Verifique o CLOUDINARY_API_SECRET no Supabase.');
  }
}

async function uploadToCloudinary(file,onProgress=()=>{}){
  if(!file)throw new Error('Nenhum arquivo selecionado.');
  const auth=await getCloudinaryUploadAuth();
  const endpoint=`https://api.cloudinary.com/v1_1/${auth.cloud_name||CLOUDINARY.cloudName}/auto/upload`;
  const form=new FormData();
  form.append('file',file);
  form.append('api_key',String(auth.api_key));
  form.append('timestamp',String(auth.timestamp));
  form.append('signature',String(auth.signature));
  if(auth.folder)form.append('folder',String(auth.folder));

  return new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();
    xhr.open('POST',endpoint,true);
    xhr.upload.onprogress=e=>{
      if(e.lengthComputable)onProgress(Math.max(1,Math.min(99,Math.round((e.loaded/e.total)*100))));
    };
    xhr.onerror=()=>reject(new Error('Falha de rede ao enviar para o Cloudinary.'));
    xhr.onload=()=>{
      let payload={};
      try{payload=JSON.parse(xhr.responseText||'{}')}catch(_){}
      if(xhr.status<200||xhr.status>=300||!payload.secure_url){
        const message=payload?.error?.message||'O Cloudinary recusou o arquivo.';
        return reject(new Error(message));
      }
      onProgress(100);
      resolve(payload);
    };
    xhr.send(form);
  });
}

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
  questionBehavior:null,
  pdfCache:new Map(),
  visualCache:new Map(),
  videos:[],
  materials:[],
  contentProgress:new Map(),
  favorites:new Set(),
  activeViewer:null,
  progressSaveTimer:null,
  adminUsers:[],
  systemModules:new Map(),
  healthMonitorLoading:false,
  assistantIntents:[],
  core:null,
  journey:null,
  journeyLoading:false,
  membership:null,
  avatarDraft:null,
  registerBase:'neutral',
  journeyTab:'missions',
  lastSimulationReport:null,
  onboarding:{
    step:1,
    goalScore:750,
    areas:[],
    dailyMinutes:60,
    saving:false,
    manual:false,
    avatar:null
  }
};

const NEXO_FOCUS_KEY='nexo-focus-v1';
const focusModeState={
  minutes:25,
  running:false,
  paused:false,
  endAt:0,
  remaining:25*60,
  interval:null,
  completed:false
};

function focusStorageKey(){
  return NEXO_FOCUS_KEY+':'+String(state.user?.id||'guest');
}
function saveFocusMode(){
  try{
    localStorage.setItem(focusStorageKey(),JSON.stringify({
      minutes:focusModeState.minutes,
      running:focusModeState.running,
      paused:focusModeState.paused,
      endAt:focusModeState.endAt,
      remaining:focusModeState.remaining,
      completed:focusModeState.completed
    }));
  }catch(_){}
}
function restoreFocusMode(){
  try{
    const raw=localStorage.getItem(focusStorageKey());
    if(!raw)return;
    const saved=JSON.parse(raw);
    focusModeState.minutes=Number(saved.minutes||25);
    focusModeState.running=Boolean(saved.running);
    focusModeState.paused=Boolean(saved.paused);
    focusModeState.endAt=Number(saved.endAt||0);
    focusModeState.remaining=Math.max(0,Number(saved.remaining||focusModeState.minutes*60));
    focusModeState.completed=Boolean(saved.completed);
    if(focusModeState.running&&!focusModeState.paused&&focusModeState.endAt){
      focusModeState.remaining=Math.max(0,Math.ceil((focusModeState.endAt-Date.now())/1000));
      if(focusModeState.remaining<=0){
        focusModeState.running=false;
        focusModeState.completed=true;
      }
    }
  }catch(_){}
}
function focusSeconds(){
  if(focusModeState.running&&!focusModeState.paused&&focusModeState.endAt){
    return Math.max(0,Math.ceil((focusModeState.endAt-Date.now())/1000));
  }
  return Math.max(0,Number(focusModeState.remaining||0));
}
function formatFocusTime(total){
  const s=Math.max(0,Math.floor(Number(total||0)));
  const m=Math.floor(s/60),sec=s%60;
  return String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');
}
function updateFocusTarget(){
  const rec=state.core?.recommended_action;
  const title=$('#focusTargetTitle'), reason=$('#focusTargetReason');
  if(title)title.textContent=rec?.topic||rec?.subject||rec?.area||'Seu próximo melhor passo';
  if(reason)reason.textContent=rec?.reason||'Use esse tempo para uma tarefa só. Quando terminar, o NEXO te leva direto para um treino curto.';
}
function renderFocusMode(){
  const seconds=focusSeconds();
  focusModeState.remaining=seconds;
  const total=Math.max(1,focusModeState.minutes*60);
  const elapsed=Math.max(0,total-seconds);
  const angle=Math.min(360,Math.round((elapsed/total)*360));
  const timer=$('#focusTimerText'), ring=$('#focusRing'), stateEl=$('#focusTimerState');
  const start=$('#focusStart'), reset=$('#focusReset');
  const pill=$('#focusRunningPill'), pillText=$('#focusRunningText');
  if(timer)timer.textContent=formatFocusTime(seconds);
  if(ring)ring.style.setProperty('--focus-progress',angle+'deg');
  if(pillText)pillText.textContent=formatFocusTime(seconds);
  $$('[data-focus-minutes]').forEach(btn=>btn.classList.toggle('active',Number(btn.dataset.focusMinutes)===focusModeState.minutes));

  if(focusModeState.completed){
    if(stateEl)stateEl.textContent='CONCLUÍDO';
    if(start){start.textContent='Treinar esse foco →';start.dataset.focusAction='train';}
    reset?.classList.remove('hidden');
    pill?.classList.add('hidden');
  }else if(focusModeState.running&&focusModeState.paused){
    if(stateEl)stateEl.textContent='PAUSADO';
    if(start){start.textContent='Continuar';start.dataset.focusAction='resume';}
    reset?.classList.remove('hidden');
    pill?.classList.remove('hidden');
  }else if(focusModeState.running){
    if(stateEl)stateEl.textContent='EM FOCO';
    if(start){start.textContent='Pausar';start.dataset.focusAction='pause';}
    reset?.classList.remove('hidden');
    pill?.classList.remove('hidden');
  }else{
    if(stateEl)stateEl.textContent='PRONTO';
    if(start){start.textContent='Começar foco';start.dataset.focusAction='start';}
    reset?.classList.add('hidden');
    pill?.classList.add('hidden');
  }
}
function clearFocusInterval(){
  if(focusModeState.interval){clearInterval(focusModeState.interval);focusModeState.interval=null}
}
function beginFocusInterval(){
  clearFocusInterval();
  focusModeState.interval=setInterval(()=>{
    const seconds=focusSeconds();
    focusModeState.remaining=seconds;
    if(seconds<=0&&focusModeState.running){
      clearFocusInterval();
      focusModeState.running=false;
      focusModeState.paused=false;
      focusModeState.completed=true;
      focusModeState.remaining=0;
      saveFocusMode();
      renderFocusMode();
      try{navigator.vibrate?.([180,80,180])}catch(_){}
      toast('Foco concluído. Hora de transformar atenção em acertos.');
      $('#focusModeModal')?.classList.remove('hidden');
      document.body.style.overflow='hidden';
      return;
    }
    renderFocusMode();
  },1000);
}
function setFocusMinutes(minutes){
  if(focusModeState.running)return;
  focusModeState.minutes=Number(minutes||25);
  focusModeState.remaining=focusModeState.minutes*60;
  focusModeState.completed=false;
  saveFocusMode();
  renderFocusMode();
}
function startFocusMode(){
  focusModeState.completed=false;
  focusModeState.paused=false;
  focusModeState.running=true;
  if(!focusModeState.remaining||focusModeState.remaining<=0)focusModeState.remaining=focusModeState.minutes*60;
  focusModeState.endAt=Date.now()+focusModeState.remaining*1000;
  saveFocusMode();
  beginFocusInterval();
  renderFocusMode();
}
function pauseFocusMode(){
  focusModeState.remaining=focusSeconds();
  focusModeState.running=true;
  focusModeState.paused=true;
  focusModeState.endAt=0;
  clearFocusInterval();
  saveFocusMode();
  renderFocusMode();
}
function resumeFocusMode(){
  focusModeState.running=true;
  focusModeState.paused=false;
  focusModeState.endAt=Date.now()+focusModeState.remaining*1000;
  saveFocusMode();
  beginFocusInterval();
  renderFocusMode();
}
function resetFocusMode(){
  clearFocusInterval();
  focusModeState.running=false;
  focusModeState.paused=false;
  focusModeState.completed=false;
  focusModeState.endAt=0;
  focusModeState.remaining=focusModeState.minutes*60;
  saveFocusMode();
  renderFocusMode();
}
function openFocusMode(){
  updateFocusTarget();
  renderFocusMode();
  $('#focusModeModal')?.classList.remove('hidden');
  document.body.style.overflow='hidden';
}
function closeFocusMode(){
  $('#focusModeModal')?.classList.add('hidden');
  document.body.style.overflow='';
  renderFocusMode();
}
async function finishFocusIntoTraining(){
  resetFocusMode();
  closeFocusMode();
  if(state.core?.recommended_action){
    await startCoreRecommendation();
  }else{
    openPage('questoes');
    toast('Escolha uma área e faça uma sessão curta para fechar seu bloco de foco.');
  }
}

function toast(message, type='info') {
  const el = $('#toast');
  el.textContent = message;
  el.dataset.type = type;
  el.classList.remove('hidden');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(()=>el.classList.add('hidden'), 2900);
}

async function logClientError(area,error,code='runtime'){
  if(!state?.user?.id)return;
  const message=String(error?.message||error||'unknown error').slice(0,500);
  try{
    await client.from('nexo_client_errors').insert({
      user_id:state.user.id,
      area:String(area||'app').slice(0,80),
      code:String(code||'runtime').slice(0,80),
      message
    });
  }catch(logError){
    console.warn('NEXO telemetry unavailable',logError);
  }
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


function updateHomeExperience(){
  const first=(state.profile?.full_name||state.user?.email?.split('@')[0]||'').trim().split(/\s+/)[0]||'';
  const hour=new Date().getHours();
  const greeting=hour<12?'BOM DIA':hour<18?'BOA TARDE':'BOA NOITE';
  const label=first?greeting+', '+first.toUpperCase():greeting;
  const rec=state.core?.recommended_action||null;

  const desktop=$('#desktopHomeGreeting');
  const mobile=$('#mobileHomeGreeting');
  if(desktop)desktop.textContent=label;
  if(mobile)mobile.textContent=label;

  const desktopSub=$('#desktopHeroSubtitle');
  const mobileSub=$('#mobileHeroSubtitle');
  if(rec){
    const focus=(rec.subject||rec.area||'Treino')+' · '+(rec.topic||'revisão');
    if(desktopSub)desktopSub.innerHTML='<b>Seu próximo foco:</b> '+esc(focus)+' • '+Number(rec.size||6)+' questões recomendadas pelo NEXO Core.';
    if(mobileSub)mobileSub.textContent='Seu foco agora: '+focus+'.';
  }else{
    if(desktopSub)desktopSub.innerHTML='<b>500 questões reais</b> dos cadernos ENEM • sessões adaptativas • redação • análises personalizadas pelo NEXO Core.';
    if(mobileSub)mobileSub.textContent='Continue de onde parou ou siga a recomendação do NEXO Core.';
  }

  const hint=$('#heroCoreHint');
  if(hint)hint.textContent=rec
    ? 'próximo foco: '+(rec.topic||rec.subject||rec.area||'treino adaptativo')
    : 'analisando seu próximo foco';

  const desktopMascot=$('.home-nexo-mascot');
  const mobileMascot=$('.mobile-nexo-stage img');
  if(desktopMascot)setNexoImage(desktopMascot,NEXO_MEDIA_IMAGES.hero);
  if(mobileMascot){
    const homeMood=rec && Number(rec.priority||0)>=65?'pensativo':'confiante';
    setNexoImage(mobileMascot,nexoBustForMood(homeMood));
  }
}



function renderNexoCommandCenter(){
  const p=state.journey?.profile||{}, rec=state.core?.recommended_action||null;
  const daily=(state.journey?.missions||[]).filter(m=>m.period==='daily');
  const dailyDone=daily.filter(m=>m.status==='completed'||m.status==='claimed').length;
  const dailyPct=daily.length?Math.round(dailyDone*100/daily.length):0;
  document.querySelectorAll('[data-nexo-command]').forEach(card=>{
    const level=card.querySelector('[data-command-level]'), streak=card.querySelector('[data-command-streak]'), coins=card.querySelector('[data-command-coins]'), next=card.querySelector('[data-command-next]');
    const dailyCount=card.querySelector('[data-command-daily-count]'),dailyBar=card.querySelector('[data-command-daily-bar]'),dailyLabel=card.querySelector('[data-command-daily-label]'),start=card.querySelector('[data-command-start]');
    if(level)level.textContent='NV. '+Number(p.level||1);
    if(streak)streak.textContent=String(Number(p.streak_days||0));
    if(coins)coins.textContent=Number(p.coins||0).toLocaleString('pt-BR');
    if(next)next.innerHTML=rec?'<b>Próxima missão:</b> '+esc(rec.topic||rec.subject||rec.area||'treino adaptativo')+' · '+Number(rec.size||6)+' questões':'<b>Próxima missão:</b> faça o diagnóstico inicial para calibrar seu plano.';
    if(dailyCount)dailyCount.textContent=dailyDone+' / '+daily.length;
    if(dailyBar)dailyBar.style.width=dailyPct+'%';
    if(dailyLabel)dailyLabel.textContent=daily.length&&dailyDone===daily.length?'Missões do dia concluídas':'Missões de hoje';
    if(start){
      start.innerHTML=rec?'Começar missão <span>→</span>':'Fazer diagnóstico <span>→</span>';
      start.onclick=()=>rec?startCoreRecommendation():(openPage('questoes'),resetSessionUI());
    }
    card.classList.toggle('daily-complete',Boolean(daily.length&&dailyDone===daily.length));
  });
}

function buildTodayPlan(){
  const core=state.core||{};
  const rec=core.recommended_action||null;
  const profile=state.profile||{};
  const minutes=Math.max(20,Number(profile.daily_minutes||core.profile?.daily_minutes||45));
  const focus=rec?.topic||rec?.subject||rec?.area||'diagnóstico inicial';
  const area=rec?.area||profile.difficult_areas?.[0]||'ENEM';
  const count=Number(rec?.size||(minutes<=30?5:minutes<=60?8:10));

  let blocks;
  if(minutes<=30){
    blocks=[
      {icon:'01',title:'Aquecimento',detail:'Releia seu foco e entre no ritmo.',time:5},
      {icon:'02',title:'Questões foco',detail:count+' questões · '+focus,time:20},
      {icon:'03',title:'Revisão Nexo',detail:'Corrija os erros e veja os macetes.',time:5}
    ];
  }else if(minutes<=60){
    blocks=[
      {icon:'01',title:'Aquecimento',detail:'Meta do dia + leitura estratégica.',time:5},
      {icon:'02',title:'Sessão principal',detail:count+' questões · '+focus,time:Math.max(25,minutes-20)},
      {icon:'03',title:'Revisão Nexo',detail:'Erros, método e próximo passo.',time:10},
      {icon:'04',title:'Fechamento',detail:'Atualizar seu NEXO Core.',time:5}
    ];
  }else{
    const main=Math.max(35,Math.min(55,minutes-35));
    blocks=[
      {icon:'01',title:'Aquecimento',detail:'Ative foco e estratégia.',time:10},
      {icon:'02',title:'Questões foco',detail:count+' questões · '+focus,time:main},
      {icon:'03',title:'Correção guiada',detail:'Entenda erros e padrões.',time:15},
      {icon:'04',title:'Aprofundamento',detail:'Revisão curta do conteúdo.',time:10}
    ];
  }
  return {minutes,focus,area,count,blocks};
}

function renderTodayPlan(){
  renderNexoCommandCenter();
  const plan=buildTodayPlan();
  $$('[data-today-plan]').forEach(card=>{
    const total=card.querySelector('[data-today-total]');
    const summary=card.querySelector('[data-today-summary]');
    const blocks=card.querySelector('[data-today-blocks]');
    const start=card.querySelector('[data-today-start]');
    if(total)total.textContent=String(plan.minutes);
    if(summary)summary.textContent='Foco de hoje: '+plan.area+' · '+plan.focus+'. Uma rotina pensada para caber no seu tempo disponível.';
    if(blocks)blocks.innerHTML=plan.blocks.map(item=>`
      <article class="today-plan-block">
        <span>${item.icon}</span>
        <div><b>${esc(item.title)}</b><small>${esc(item.detail)}</small></div>
        <strong>${item.time} min</strong>
      </article>`).join('');
    if(start)start.onclick=()=>{
      if(state.core?.recommended_action)startCoreRecommendation();
      else{
        openPage('questoes');
        resetSessionUI();
        toast('Comece pelo diagnóstico para o NEXO Core calibrar seu plano.');
      }
    };
  });
}


function starterAvatarForBase(base='neutral'){
  const normalized=['masc','fem','neutral'].includes(base)?base:'neutral';
  if(normalized==='masc')return {...NEXO_AVATAR_DEFAULT,base:'masc',hair:'fade',outfit:'navy'};
  if(normalized==='fem')return {...NEXO_AVATAR_DEFAULT,base:'fem',hair:'bob',outfit:'lavender'};
  return {...NEXO_AVATAR_DEFAULT,base:'neutral',hair:'sidecut',outfit:'street'};
}

function avatarCatalogItem(code){
  return (state.journey?.catalog||[]).find(item=>item.item_code===code)||null;
}

function avatarItemCompatibleWithBase(item,base){
  if(!item)return true;
  const bases=Array.isArray(item.compatible_bases)?item.compatible_bases:[];
  return !bases.length||bases.includes(base);
}

function avatarOptionButton(field,value){
  return $('[data-avatar-field]').find(btn=>btn.dataset.avatarField===field&&btn.dataset.avatarValue===value)||null;
}

function avatarValueCompatibleWithBase(field,value,base){
  const btn=avatarOptionButton(field,value);
  if(!btn?.dataset.avatarBases)return true;
  return btn.dataset.avatarBases.split(',').map(x=>x.trim()).filter(Boolean).includes(base);
}

function normalizeAvatarDraftForBase(draft){
  const a=normalizedAvatar(draft);
  const base=a.base;
  const fallbacks=starterAvatarForBase(base);
  for(const field of ['hair','outfit','accessory']){
    if(!avatarValueCompatibleWithBase(field,a[field],base))a[field]=fallbacks[field]||NEXO_AVATAR_DEFAULT[field];
  }
  return a;
}

function starterChoicesForOnboarding(category,base){
  const inventory=journeyInventorySet();
  const level=Number(state.journey?.profile?.level||1);
  return (state.journey?.catalog||[])
    .filter(item=>item.category===category)
    .filter(item=>avatarItemCompatibleWithBase(item,base))
    .filter(item=>!item.plus_only)
    .filter(item=>item.grant_mode==='starter'||(item.grant_mode==='level'&&level>=Number(item.unlock_level||1)))
    .filter(item=>item.grant_mode==='starter'||inventory.has(item.item_code))
    .slice(0,8);
}

function renderOnboardingAvatar(){
  const ob=state.onboarding;
  if(!ob?.avatar)return;
  ob.avatar=normalizeAvatarDraftForBase(ob.avatar);
  try{
    renderStudentAvatar($('#onboardingAvatarPreview'),ob.avatar);
  }catch(err){
    console.error('onboarding avatar preview',err);
    logClientError('onboarding',err,'avatar_preview');
    const preview=$('#onboardingAvatarPreview');
    if(preview)preview.innerHTML='<div class="onboarding-avatar-fallback"><img src="./assets/nexo-family/bust-confiante.avif" alt="Nexo"></div>';
  }

  $$('[data-onboarding-avatar-field]').forEach(btn=>{
    btn.classList.toggle('active',ob.avatar[btn.dataset.onboardingAvatarField]===btn.dataset.onboardingAvatarValue);
  });

  const renderChoices=(target,category)=>{
    const el=$(target);if(!el)return;
    const choices=starterChoicesForOnboarding(category,ob.avatar.base);
    const builtin=category==='hair'
      ? [
          {item_code:'builtin_short',name:'Curto',visual:{value:'short'}},
          {item_code:'builtin_wave',name:'Ondulado',visual:{value:'wave'}},
          {item_code:'builtin_curly',name:'Cacheado',visual:{value:'curly'}},
          {item_code:'builtin_afro',name:'Afro',visual:{value:'afro'}}
        ]
      : [
          {item_code:'builtin_purple',name:'Roxo',visual:{value:'purple'}},
          {item_code:'builtin_blue',name:'Azul',visual:{value:'blue'}},
          {item_code:'builtin_teal',name:'Verde NEXO',visual:{value:'teal'}}
        ];
    const combined=[...builtin,...choices].filter((item,index,arr)=>arr.findIndex(x=>x.visual?.value===item.visual?.value)===index);
    el.innerHTML=combined.map(item=>{
      const value=item.visual?.value||'';
      const active=ob.avatar[category]===value;
      return '<button type="button" class="'+(active?'active':'')+'" data-onboarding-starter-field="'+category+'" data-onboarding-starter-value="'+esc(value)+'">'+esc(item.name||value)+'</button>';
    }).join('');
    $$('[data-onboarding-starter-field]',el).forEach(btn=>btn.onclick=()=>{
      ob.avatar[btn.dataset.onboardingStarterField]=btn.dataset.onboardingStarterValue;
      renderOnboardingAvatar();
    });
  };

  renderChoices('#onboardingHairChoices','hair');
  renderChoices('#onboardingOutfitChoices','outfit');
}

function onboardingMissionSize(minutes){
  const value=Number(minutes||60);
  return value<=30?5:value<=60?8:10;
}

function updateOnboardingPreview(){
  const ob=state.onboarding;
  const area=ob.areas[0]||'sua área prioritária';
  const size=onboardingMissionSize(ob.dailyMinutes);
  const timeLabel=ob.dailyMinutes>=60
    ? (ob.dailyMinutes===60?'1 hora':ob.dailyMinutes===90?'1h30':'2 horas')
    : ob.dailyMinutes+' minutos';
  const text=$('#onboardingPreviewText');
  if(text)text.textContent='Com '+timeLabel+' por dia, seu primeiro diagnóstico terá cerca de '+size+' questões em '+area+'. Meta atual: '+ob.goalScore+' pontos.';
}

function onboardingStepNumbers(){
  return [...document.querySelectorAll('#nexoOnboarding [data-onboarding-step]')]
    .map(section=>Number(section.dataset.onboardingStep))
    .filter(Number.isFinite)
    .sort((a,b)=>a-b);
}

function onboardingStepPosition(){
  const steps=onboardingStepNumbers();
  const index=Math.max(0,steps.indexOf(Number(state.onboarding.step)));
  return {steps,index,total:steps.length||1,current:steps[index]||1,last:steps[steps.length-1]||1};
}

function scrollOnboardingToTop(){
  const content=$('#nexoOnboarding .onboarding-content');
  if(content?.scrollTo)content.scrollTo({top:0,behavior:'smooth'});
  else if(content)content.scrollTop=0;
}

function renderOnboardingStep(){
  const ob=state.onboarding;
  const meta=onboardingStepPosition();
  if(!meta.steps.includes(Number(ob.step)))ob.step=meta.current;

  $$('[data-onboarding-step]').forEach(section=>{
    section.classList.toggle('hidden',Number(section.dataset.onboardingStep)!==Number(ob.step));
  });

  const currentIndex=Math.max(0,meta.steps.indexOf(Number(ob.step)));
  const position=currentIndex+1;
  const total=Math.max(1,meta.steps.length);
  const lastStep=meta.steps[meta.steps.length-1]||Number(ob.step);

  if($('#onboardingStepLabel'))$('#onboardingStepLabel').textContent=position+' de '+total;
  if($('#onboardingProgress'))$('#onboardingProgress').style.width=(position/total*100)+'%';
  if($('#onboardingBack'))$('#onboardingBack').classList.toggle('hidden',position===1);
  if($('#onboardingNext'))$('#onboardingNext').innerHTML=Number(ob.step)===lastStep
    ? 'Criar meu plano <span>→</span>'
    : 'Continuar <span>→</span>';

  const mentorMap={
    1:{
      title:'Esse é o seu espaço dentro do NEXO.',
      text:'Monte seu personagem com os itens gratuitos iniciais. Conforme você estuda, novos cabelos, roupas, acessórios e ambientes aparecem na Jornada.',
      image:NEXO_MEDIA_IMAGES.bustConfiante
    },
    2:{
      title:'Uma boa meta dá direção.',
      text:'Não precisa acertar o número perfeito. Use uma nota que represente o nível que você quer perseguir e eu ajusto o plano com seus dados reais.',
      image:NEXO_MEDIA_IMAGES.bustConfiante
    },
    3:{
      title:'Agora me diga onde aperta mais.',
      text:'Escolha no máximo duas áreas. A primeira vira seu diagnóstico inicial; depois o NEXO Core passa a usar seu desempenho real.',
      image:NEXO_MEDIA_IMAGES.bustPensativo
    },
    4:{
      title:'O melhor plano é o que cabe na rotina.',
      text:'Eu prefiro 30 minutos consistentes a duas horas que nunca acontecem. Escolha um tempo que você consegue sustentar.',
      image:NEXO_MEDIA_IMAGES.bustAcolhedor
    }
  };
  const mentor=mentorMap[Number(ob.step)]||{
    title:'Seu plano está quase pronto.',
    text:'Continue para concluir sua configuração inicial.',
    image:NEXO_MEDIA_IMAGES.bustConfiante
  };

  if($('#onboardingMentorTitle'))$('#onboardingMentorTitle').textContent=mentor.title;
  if($('#onboardingMentorText'))$('#onboardingMentorText').textContent=mentor.text;
  setNexoImage($('#onboardingMascot'),mentor.image);
  if(Number(ob.step)===1)renderOnboardingAvatar();

  if($('#goalScoreValue'))$('#goalScoreValue').textContent=String(ob.goalScore);
  if($('#goalScoreRange'))$('#goalScoreRange').value=String(ob.goalScore);
  $$('[data-goal-score]').forEach(btn=>{
    const v=Number(btn.dataset.goalScore);
    btn.classList.toggle('active',v===ob.goalScore || (v===900 && ob.goalScore>=900));
  });

  $$('[data-onboarding-area]').forEach(btn=>{
    const active=ob.areas.includes(btn.dataset.onboardingArea);
    btn.classList.toggle('active',active);
    const icon=btn.querySelector('i');
    if(icon)icon.textContent=active?'✓':'+';
  });
  if($('#onboardingAreaHint'))$('#onboardingAreaHint').textContent=ob.areas.length
    ? ob.areas.length+' selecionada(s) · '+(ob.areas[0]||'')+' será a primeira prioridade.'
    : 'Escolha pelo menos uma área.';

  $$('[data-onboarding-minutes]').forEach(btn=>{
    btn.classList.toggle('active',Number(btn.dataset.onboardingMinutes)===ob.dailyMinutes);
  });
  updateOnboardingPreview();
}

function openNexoOnboarding(manual=false){
  if(!state.user)return;
  state.onboarding={
    step:1,
    goalScore:Number(state.profile?.goal_score||750),
    areas:Array.isArray(state.profile?.difficult_areas)?[...state.profile.difficult_areas]:[],
    dailyMinutes:Number(state.profile?.daily_minutes||60),
    saving:false,
    manual:Boolean(manual),
    avatar:normalizedAvatar(state.journey?.profile?.avatar||starterAvatarForBase(state.registerBase||'neutral'))
  };
  $('#nexoOnboarding').classList.remove('hidden');
  document.body.classList.add('onboarding-open');
  $('#niaButton')?.classList.add('hidden');
  $('#niaPanel')?.classList.add('hidden');
  $('#profileMenu')?.classList.add('hidden');
  renderOnboardingStep();
}

function closeNexoOnboarding(){
  $('#nexoOnboarding').classList.add('hidden');
  document.body.classList.remove('onboarding-open');
  if(state.user)$('#niaButton')?.classList.remove('hidden');
}

async function saveNexoOnboarding(){
  const ob=state.onboarding;
  if(ob.saving)return;
  if(!ob.areas.length){
    toast('Escolha pelo menos uma área para o NEXO começar.','error');
    return;
  }
  ob.saving=true;
  const btn=$('#onboardingNext');
  btn.disabled=true;
  btn.textContent='Montando seu plano...';

  const completedAt=new Date().toISOString();
  try{
    const avatarResult=await client.rpc('save_nexo_avatar',{p_avatar:normalizeAvatarDraftForBase(ob.avatar)});
    if(avatarResult.error)throw avatarResult.error;
    if(state.journey?.profile)state.journey.profile.avatar=avatarResult.data;
    state.avatarDraft=normalizedAvatar(avatarResult.data);

    const {error}=await client.from('profiles').update({
      goal_score:ob.goalScore,
      difficult_areas:ob.areas,
      daily_minutes:ob.dailyMinutes,
      onboarding_completed_at:completedAt,
      onboarding_version:2,
      updated_at:completedAt
    }).eq('id',state.user.id);
    if(error)throw error;

    state.profile={
      ...(state.profile||{}),
      goal_score:ob.goalScore,
      difficult_areas:[...ob.areas],
      daily_minutes:ob.dailyMinutes,
      onboarding_completed_at:completedAt,
      onboarding_version:2
    };

    closeNexoOnboarding();
    await loadNexoCore();
    updateHomeExperience();
    openPage('inicio');
    setNexoMood('confiante');
    toast(ob.manual?'Seu plano foi atualizado.':'Seu primeiro plano está pronto.');
  }catch(err){
    console.error('onboarding save',err);
    logClientError('onboarding',err,'onboarding_save');
    toast('Não consegui salvar seu plano agora. Tente novamente.','error');
  }finally{
    ob.saving=false;
    btn.disabled=false;
    btn.innerHTML='Criar meu plano <span>→</span>';
  }
}

$$('[data-onboarding-avatar-field]').forEach(btn=>btn.onclick=()=>{
  const field=btn.dataset.onboardingAvatarField;
  const value=btn.dataset.onboardingAvatarValue;
  state.onboarding.avatar=normalizedAvatar(state.onboarding.avatar||starterAvatarForBase('neutral'));
  state.onboarding.avatar[field]=value;
  if(field==='base'){
    const next=starterAvatarForBase(value);
    state.onboarding.avatar={...state.onboarding.avatar,base:value,hair:next.hair,outfit:next.outfit,accessory:'none'};
  }
  renderOnboardingAvatar();
});

$('#goalScoreRange').addEventListener('input',e=>{
  state.onboarding.goalScore=Number(e.target.value);
  renderOnboardingStep();
});
$$('[data-goal-score]').forEach(btn=>btn.onclick=()=>{
  state.onboarding.goalScore=Number(btn.dataset.goalScore);
  renderOnboardingStep();
});
$$('[data-onboarding-area]').forEach(btn=>btn.onclick=()=>{
  const area=btn.dataset.onboardingArea;
  const list=state.onboarding.areas;
  const index=list.indexOf(area);
  if(index>=0)list.splice(index,1);
  else{
    if(list.length>=2){
      toast('Escolha no máximo duas áreas para manter o plano focado.','error');
      return;
    }
    list.push(area);
  }
  renderOnboardingStep();
});
$$('[data-onboarding-minutes]').forEach(btn=>btn.onclick=()=>{
  state.onboarding.dailyMinutes=Number(btn.dataset.onboardingMinutes);
  renderOnboardingStep();
});
$('#onboardingBack').onclick=()=>{
  try{
    const meta=onboardingStepPosition();
    const index=Math.max(0,meta.steps.indexOf(Number(state.onboarding.step)));
    if(index<=0)return;
    state.onboarding.step=meta.steps[index-1];
    renderOnboardingStep();
    scrollOnboardingToTop();
  }catch(err){
    console.error('onboarding back',err);
    logClientError('onboarding',err,'onboarding_back');
    toast('Não consegui voltar uma etapa. Tente novamente.','error');
  }
};
$('#onboardingNext').onclick=async e=>{
  e?.preventDefault?.();
  const btn=$('#onboardingNext');
  if(btn?.dataset.advancing==='1')return;
  if(btn)btn.dataset.advancing='1';

  try{
    const meta=onboardingStepPosition();
    const current=Number(state.onboarding.step);
    const index=Math.max(0,meta.steps.indexOf(current));

    if(current===3 && !state.onboarding.areas.length){
      toast('Escolha pelo menos uma área para continuar.','error');
      return;
    }

    if(index<meta.steps.length-1){
      state.onboarding.step=meta.steps[index+1];
      renderOnboardingStep();
      scrollOnboardingToTop();
      return;
    }

    await saveNexoOnboarding();
  }catch(err){
    console.error('onboarding next',err);
    logClientError('onboarding',err,'onboarding_next');
    toast('Não consegui avançar agora. Tente novamente.','error');
  }finally{
    if(btn)delete btn.dataset.advancing;
  }
};
$('#editStudyPlan').onclick=()=>openNexoOnboarding(true);

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

$$('[data-register-base]').forEach(btn=>btn.onclick=()=>{
  state.registerBase=btn.dataset.registerBase||'neutral';
  $$('[data-register-base]').forEach(x=>x.classList.toggle('active',x===btn));
});


$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  clearAuthMessage();
  const email = $('#loginEmail').value.trim();
  const password = $('#loginPassword').value;
  const btn = e.submitter || $('#loginForm button[type="submit"]');

  if(!email || !password){
    showAuthMessage('Preencha seu e-mail e sua senha para entrar.', true);
    return;
  }

  if(btn){
    btn.disabled = true;
    btn.textContent = 'Entrando...';
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      showAuthMessage(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message, true);
      return;
    }

    if(!data?.session){
      showAuthMessage('Login confirmado, mas a sessão não foi criada. Tente novamente.', true);
      return;
    }

    showAuthMessage('Login confirmado. Abrindo o NEXO...');
    await handleSession(data.session);
  } catch (err) {
    console.error('Falha no login:', err);
    reportSessionError(err);
    showAuthMessage('O login foi recebido, mas houve uma falha ao abrir a plataforma. Atualize a página e tente novamente.', true);
  } finally {
    if(btn){
      btn.disabled = false;
      btn.innerHTML = 'Entrar no NEXO <span>→</span>';
    }
  }
});

$('#registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  clearAuthMessage();
  const full_name = $('#registerName').value.trim();
  const email = $('#registerEmail').value.trim();
  const password = $('#registerPassword').value;
  const avatarBase=state.registerBase||'neutral';
  localStorage.setItem('nexo-pending-avatar-base',avatarBase);
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
    localStorage.removeItem('nexo-pending-avatar-base');
    showAuthMessage(err.message || 'Não foi possível criar a conta.', true);
  } finally {
    btn.disabled = false; btn.innerHTML = 'Criar minha conta <span>→</span>';
  }
});

$('#forgotPassword').onclick=async()=>{
  clearAuthMessage();
  const email=$('#loginEmail').value.trim();
  if(!email){
    showAuthMessage('Digite seu e-mail acima para receber o link de recuperação.',true);
    $('#loginEmail').focus();
    return;
  }
  const btn=$('#forgotPassword');
  btn.disabled=true;
  const old=btn.textContent;
  btn.textContent='Enviando...';
  try{
    const {error}=await client.auth.resetPasswordForEmail(email,{
      redirectTo:window.location.origin+window.location.pathname
    });
    if(error)throw error;
    showAuthMessage('Link de recuperação enviado. Confira sua caixa de entrada e o spam.');
  }catch(err){
    console.error('password recovery',err);
    showAuthMessage('Não foi possível enviar o link agora. Tente novamente em alguns instantes.',true);
  }finally{
    btn.disabled=false;
    btn.textContent=old;
  }
};

$('#logoutBtn').onclick = async () => {
  $('#niaButton')?.classList.add('hidden');
  $('#niaPanel')?.classList.add('hidden');
  $('#nexoOnboarding')?.classList.add('hidden');
  document.body.classList.remove('onboarding-open');
  await client.auth.signOut();
  $('#profileMenu').classList.add('hidden');
};

$('#mobileFocusMode')?.addEventListener('click',openFocusMode);
$('#desktopFocusMode')?.addEventListener('click',openFocusMode);
$('#focusRunningPill')?.addEventListener('click',openFocusMode);
$('#closeFocusMode')?.addEventListener('click',closeFocusMode);
$('#focusModeModal')?.addEventListener('click',e=>{if(e.target===$('#focusModeModal'))closeFocusMode()});
$$('[data-focus-minutes]').forEach(btn=>btn.addEventListener('click',()=>setFocusMinutes(Number(btn.dataset.focusMinutes))));
$('#focusReset')?.addEventListener('click',resetFocusMode);
$('#focusStart')?.addEventListener('click',async()=>{
  const action=$('#focusStart')?.dataset.focusAction||'start';
  if(action==='pause')pauseFocusMode();
  else if(action==='resume')resumeFocusMode();
  else if(action==='train')await finishFocusIntoTraining();
  else startFocusMode();
});

$('#themeToggle').onclick=()=>setTheme(document.body.classList.contains('light')?'dark':'light');
$('#profileButton').onclick=()=>$('#profileMenu').classList.toggle('hidden');
const searchBox=$('.search');
$('#globalSearch').addEventListener('focus',()=>searchBox.classList.add('search-open'));
searchBox.addEventListener('click',()=>{searchBox.classList.add('search-open');$('#globalSearch').focus()});
$('#globalSearch').addEventListener('blur',()=>{if(innerWidth<=760&&!$('#globalSearch').value.trim())setTimeout(()=>searchBox.classList.remove('search-open'),120)});
document.addEventListener('click',e=>{
  if(!e.target.closest('#profileButton')&&!e.target.closest('#profileMenu')) $('#profileMenu').classList.add('hidden');
});

const DESKTOP_SIDEBAR_KEY='nexo-desktop-sidebar-collapsed';

function setDesktopSidebarCollapsed(collapsed, persist=true){
  const shouldCollapse=Boolean(collapsed)&&innerWidth>760;
  document.body.classList.toggle('sidebar-collapsed',shouldCollapse);
  const toggle=$('#desktopSidebarToggle');
  if(toggle){
    toggle.setAttribute('aria-expanded',String(!shouldCollapse));
    toggle.setAttribute('aria-label',shouldCollapse?'Expandir menu lateral':'Recolher menu lateral');
    const icon=toggle.querySelector('span');
    if(icon)icon.textContent=shouldCollapse?'›':'‹';
  }
  if(persist){
    try{localStorage.setItem(DESKTOP_SIDEBAR_KEY,shouldCollapse?'1':'0')}catch(_){}
  }
}

function prepareDesktopSidebarLabels(){
  $$('.side-nav .nav-item').forEach(btn=>{
    if(btn.dataset.sidebarLabel)return;
    const clone=btn.cloneNode(true);
    clone.querySelectorAll('span').forEach(el=>el.remove());
    const label=String(clone.textContent||'').replace(/\s+/g,' ').trim();
    if(label){
      btn.dataset.sidebarLabel=label;
      btn.title=label;
    }
  });
}

function restoreDesktopSidebar(){
  if(innerWidth<=760){
    document.body.classList.remove('sidebar-collapsed');
    return;
  }
  let collapsed=false;
  try{collapsed=localStorage.getItem(DESKTOP_SIDEBAR_KEY)==='1'}catch(_){}
  setDesktopSidebarCollapsed(collapsed,false);
}

window.toggleDesktopSidebar=function(){
  const collapsed=!document.body.classList.contains('sidebar-collapsed');
  setDesktopSidebarCollapsed(collapsed,true);
  return false;
};

function toggleMenu(open) {
  $('#sidebar').classList.toggle('open', open);
  $('#scrim').classList.toggle('hidden', !open);
}
$('#desktopSidebarToggle')?.addEventListener('click',e=>{
  e.preventDefault();
  e.stopPropagation();
  window.toggleDesktopSidebar();
});
window.addEventListener('resize',()=>{
  if(innerWidth<=760){
    document.body.classList.remove('sidebar-collapsed');
  }else{
    prepareDesktopSidebarLabels();
  restoreDesktopSidebar();
  }
});

$('#mobileMenu')?.addEventListener('click',()=>toggleMenu(true));
$('#closeMenu')?.addEventListener('click',()=>toggleMenu(false));
$('#scrim')?.addEventListener('click',()=>toggleMenu(false));
$('#moreMobile')?.addEventListener('click',()=>toggleMenu(true));


function isNexoPlus(){
  return Boolean(state.membership?.is_plus);
}

function isNexoUltra(){
  return Boolean(state.membership?.is_ultra);
}

function planUsageReached(kind){
  const m=state.membership;
  if(!m||m.is_plus)return false;
  const usage=m.usage||{},limits=m.limits||{};
  const map={
    questions:['questions_today','questions_per_day'],
    core:['core_sessions_today','core_sessions_per_day'],
    arena:['arena_entries_week','arena_entries_per_week'],
    essay:['essay_reviews_month','essay_reviews_per_month']
  };
  const keys=map[kind];
  if(!keys)return false;
  const used=Number(usage[keys[0]]||0),limit=Number(limits[keys[1]]||0);
  return limit>=0&&used>=limit;
}

function planLimitMessage(error){
  const msg=String(error?.message||error||'');
  if(msg.includes('nexo_free_daily_question_limit'))return 'Você atingiu as 10 questões de hoje no plano Free. No Plus, as questões são ilimitadas.';
  if(msg.includes('nexo_free_daily_core_limit'))return 'Você usou a sessão NEXO Core de hoje no Free. O Plus libera sessões ilimitadas.';
  if(msg.includes('nexo_free_weekly_arena_limit'))return 'Sua entrada gratuita da Arena desta semana já foi usada. O Plus remove esse limite.';
  if(msg.includes('nexo_free_monthly_essay_limit'))return 'Você já usou a correção de redação deste mês no Free. No Plus, as correções são ilimitadas.';
  if(msg.includes('nexo_plus_required'))return 'Esse item é exclusivo do NEXO Plus.';
  return '';
}

function openNexoPlans(message=''){
  openPage('planos');
  if(message)toast(message,'info');
}

function handlePlanLimitError(error){
  const message=planLimitMessage(error);
  if(!message)return false;
  loadNexoJourney({silent:true}).catch(()=>{});
  setTimeout(()=>openNexoPlans(message),0);
  return true;
}

function setUsageBar(id,value,limit){
  const el=$(id);
  if(!el)return;
  const pct=limit<0?100:clamp(Math.round(Number(value||0)*100/Math.max(1,Number(limit||1))),0,100);
  el.style.width=pct+'%';
}

function renderPlanExperience(){
  const m=state.membership;
  if(!m)return;
  const ultra=Boolean(m.is_ultra),plus=Boolean(m.is_plus);
  const plan=ultra?'ULTRA':plus?'PLUS':'FREE';
  document.body.dataset.plan=ultra?'ultra':plus?'plus':'free';
  if($('#headerPlanBadge'))$('#headerPlanBadge').textContent=plan;
  if($('#profilePlanLabel'))$('#profilePlanLabel').textContent=ultra?'Acesso Ultra':('Plano '+(plus?'Plus':'Free'));
  if($('#profileRole'))$('#profileRole').textContent=ultra?'Administrador · Ultra':('Estudante · '+(plus?'Plus':'Free'));
  if($('#currentPlanChip')){
    $('#currentPlanChip').textContent=ultra?'NEXO Ultra':('Plano '+(plus?'Plus':'Free'));
    $('#currentPlanChip').classList.toggle('plus',plus&&!ultra);
    $('#currentPlanChip').classList.toggle('ultra',ultra);
  }

  const u=m.usage||{},l=m.limits||{};
  const fmt=(value,limit)=>(plus||ultra)?Number(value||0)+' · ilimitado':Number(value||0)+' / '+Number(limit||0);
  if($('#planQuestionsUsage'))$('#planQuestionsUsage').textContent=fmt(u.questions_today,l.questions_per_day);
  if($('#planCoreUsage'))$('#planCoreUsage').textContent=fmt(u.core_sessions_today,l.core_sessions_per_day);
  if($('#planEssayUsage'))$('#planEssayUsage').textContent=fmt(u.essay_reviews_month,l.essay_reviews_per_month);
  if($('#planArenaUsage'))$('#planArenaUsage').textContent=fmt(u.arena_entries_week,l.arena_entries_per_week);
  setUsageBar('#planQuestionsBar',u.questions_today,l.questions_per_day);
  setUsageBar('#planCoreBar',u.core_sessions_today,l.core_sessions_per_day);
  setUsageBar('#planEssayBar',u.essay_reviews_month,l.essay_reviews_per_month);
  setUsageBar('#planArenaBar',u.arena_entries_week,l.arena_entries_per_week);
  if($('#planUsageStatus'))$('#planUsageStatus').textContent=ultra?'Ultra administrativo · tudo liberado':plus?'Plus ativo · sem limites de uso':'Free · limites reiniciam automaticamente';
  const request=$('#requestPlusBtn');
  if(request){
    request.disabled=plus||ultra;
    request.innerHTML=ultra?'✓ NEXO Ultra ativo':plus?'✓ NEXO Plus ativo':'Quero o NEXO Plus <span>→</span>';
  }
}

async function loadNexoMembership({silent=true}={}){
  if(!state.user?.id)return null;
  try{
    const {data,error}=await client.rpc('get_nexo_membership');
    if(error)throw error;
    state.membership=data||null;
    renderPlanExperience();
    return state.membership;
  }catch(err){
    console.error('NEXO membership',err);
    if(!silent)toast('Não foi possível carregar seu plano agora.','error');
    return null;
  }
}

async function refreshCurrentRole({silent=true}={}){
  if(!state.user?.id)return null;
  try{
    const {data,error}=await client.from('profiles')
      .select('role,full_name')
      .eq('id',state.user.id)
      .maybeSingle();
    if(error)throw error;
    if(!data)return null;

    const previousRole=state.profile?.role||'student';
    state.profile={...(state.profile||{}),...data};
    const isAdmin=data.role==='admin';

    $('.admin-only').forEach(el=>el.classList.toggle('hidden',!isAdmin));
    const roleLabel=$('#profileRole');
    if(roleLabel)roleLabel.textContent=isAdmin?(isNexoUltra()?'Administrador · Ultra':'Administrador'):('Estudante · '+(isNexoPlus()?'Plus':'Free'));

    if(previousRole!==data.role&&!silent){
      toast(isAdmin?'Seu acesso de administrador foi liberado.':'Seu acesso de administrador foi removido.');
    }
    return data.role;
  }catch(err){
    console.error('refresh role',err);
    return state.profile?.role||null;
  }
}

async function loadSystemModules({silent=true}={}){
  if(!state.user?.id)return state.systemModules;
  try{
    const {data,error}=await client.from('nexo_system_modules')
      .select('module_key,label,maintenance,message,updated_at')
      .order('label',{ascending:true});
    if(error)throw error;
    state.systemModules=new Map((data||[]).map(row=>[row.module_key,row]));
    return state.systemModules;
  }catch(err){
    console.error('system modules',err);
    if(!silent)toast('Não foi possível atualizar o status dos módulos.','error');
    return state.systemModules;
  }
}

function maintenanceInfo(key){
  return state.systemModules?.get?.(key)||null;
}

function moduleInMaintenance(key){
  return Boolean(maintenanceInfo(key)?.maintenance);
}

function blockMaintenance(key){
  if(state.profile?.role==='admin'||!moduleInMaintenance(key))return false;
  const info=maintenanceInfo(key)||{};
  toast(info.message||((info.label||'Este módulo')+' está temporariamente em manutenção.'),'info');
  return true;
}

function maintenanceModuleForPage(id){
  return ({
    questoes:'questions',
    banco:'questions',
    redacao:'essays',
    ranking:'journey',
    videoaulas:'content',
    materiais:'content'
  })[id]||null;
}

function openPage(id) {
  const maintenanceKey=maintenanceModuleForPage(id);
  if(maintenanceKey&&blockMaintenance(maintenanceKey))return;
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
  if (id==='materiais') loadMaterials();
  if (id==='banco') renderBank();
  if (id==='feedback') loadMyFeedback();
  if (id==='ranking') loadNexoJourney();
  if (id==='planos') { loadNexoMembership({silent:true}); renderPlanExperience(); }
  if (id==='admin') loadAdmin();
}
$$('[data-page]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();openPage(b.dataset.page)}));

async function initApp(session) {
  state.user = session.user;

  let profile=null;
  try{
    const result=await client.from('profiles')
      .select('id,full_name,avatar_url,role,assistant_outfit,goal_score,daily_minutes,difficult_areas,onboarding_completed_at,onboarding_version')
      .eq('id',state.user.id)
      .maybeSingle();
    if(result.error)throw result.error;
    profile=result.data;
  }catch(err){
    console.error('profile bootstrap',err);
    logClientError('profile',err,'profile_load');
  }

  state.profile = profile || {
    id:state.user.id,
    full_name:state.user.user_metadata?.full_name || state.user.email?.split('@')[0] || 'Aluno',
    avatar_url:null,
    role:'student',
    assistant_outfit:'classic',
    goal_score:null,
    daily_minutes:null,
    difficult_areas:[],
    onboarding_completed_at:'profile-fallback',
    onboarding_version:2
  };

  const name = state.profile.full_name || state.user.email?.split('@')[0] || 'Aluno';
  await safeBootStep('identidade',async()=>{
    if($('#profileName'))$('#profileName').textContent = name.split(' ')[0];
    if($('#menuName'))$('#menuName').textContent = name;
    if($('#menuEmail'))$('#menuEmail').textContent = state.user.email || '';
    if($('#profileRole'))$('#profileRole').textContent = state.profile.role === 'admin' ? (isNexoUltra()?'Administrador · Ultra':'Administrador') : ('Estudante · '+(isNexoPlus()?'Plus':'Free'));
    if($('#avatarFallback'))$('#avatarFallback').textContent=initials(name);
    $$('.admin-only').forEach(el=>el.classList.toggle('hidden',state.profile.role!=='admin'));
  });
  await safeBootStep('estilo',async()=>applyNexoStyle(state.profile.assistant_outfit || localStorage.getItem('nexo-style') || localStorage.getItem('nia-outfit') || 'classic', false));
  await safeBootStep('home',async()=>updateHomeExperience());
  await safeBootStep('foco',async()=>{
    restoreFocusMode();
    if(focusModeState.running&&!focusModeState.paused)beginFocusInterval();
    renderFocusMode();
  });

  showAuthenticatedShell();
  await safeBootStep('sidebar',async()=>{
    prepareDesktopSidebarLabels();
    restoreDesktopSidebar();
  });
  $('#niaButton')?.classList.add('hidden');

  const needsOnboarding=!state.profile.onboarding_completed_at;

  const results=await Promise.allSettled([
    loadQuestionMeta(),
    loadDashboard(),
    loadNexoCore(),
    loadAssistantIntents(),
    loadNexoJourney({silent:true}),
    loadSystemModules({silent:true})
  ]);
  results.forEach((result,index)=>{
    if(result.status==='rejected'){
      const areas=['questões','dashboard','NEXO Core','Professor Nexo','NEXO Jornada','status dos módulos'];
      console.error('bootstrap '+areas[index],result.reason);
      logClientError('bootstrap',result.reason,'bootstrap_'+index);
    }
  });

  const pendingAvatarBase=localStorage.getItem('nexo-pending-avatar-base');
  if(needsOnboarding&&pendingAvatarBase){
    try{
      const avatarResult=await client.rpc('save_nexo_avatar',{p_avatar:starterAvatarForBase(pendingAvatarBase)});
      if(!avatarResult.error){
        if(state.journey?.profile)state.journey.profile.avatar=avatarResult.data;
        state.avatarDraft=normalizedAvatar(avatarResult.data);
        state.registerBase=pendingAvatarBase;
        await loadNexoJourney({silent:true});
      }
    }catch(err){
      console.error('pending registration avatar',err);
    }finally{
      localStorage.removeItem('nexo-pending-avatar-base');
    }
  }

  await safeBootStep('temas',async()=>fillThemes());
  loadRecentAttempts().catch(err=>logClientError('recent_attempts',err,'recent_load'));
  await safeBootStep('banco',async()=>renderBank());

  if(needsOnboarding)await safeBootStep('onboarding',async()=>openNexoOnboarding(false));
  else $('#niaButton')?.classList.remove('hidden');
}

let sessionInitPromise=null;
let initializedSessionUserId=null;

function showAuthenticatedShell(){
  $('#authScreen')?.classList.add('hidden');
  $('#app')?.classList.remove('hidden');
  $('#niaPanel')?.classList.add('hidden');
  clearAuthMessage();
  const boot=$('#boot');
  if(boot&&!boot.classList.contains('hidden')){
    boot.classList.add('fade');
    setTimeout(()=>boot.classList.add('hidden'),300);
  }
}

function showLoggedOutShell(){
  $('#app')?.classList.add('hidden');
  $('#authScreen')?.classList.remove('hidden');
  $('#niaButton')?.classList.add('hidden');
  $('#niaPanel')?.classList.add('hidden');
  $('#nexoOnboarding')?.classList.add('hidden');
  document.body.classList.remove('onboarding-open');
  clearAuthMessage();
  const boot=$('#boot');
  if(boot&&!boot.classList.contains('hidden')){
    boot.classList.add('fade');
    setTimeout(()=>boot.classList.add('hidden'),300);
  }
}

async function safeBootStep(label,fn){
  try{
    return await fn();
  }catch(err){
    console.error('NEXO bootstrap · '+label,err);
    try{logClientError('bootstrap_safe',err,'safe_'+String(label).replace(/[^a-z0-9]+/gi,'_').toLowerCase())}catch(_){}
    return null;
  }
}

async function handleSession(session) {
  if(window.__nexoBootWatchdog){clearTimeout(window.__nexoBootWatchdog);window.__nexoBootWatchdog=null;}

  if(!session){
    state.user=null; state.profile=null; state.journey=null; state.avatarDraft=null; state.membership=null;
    initializedSessionUserId=null;
    showLoggedOutShell();
    return;
  }

  // Regra de ouro do NEXO: sessão válida abre o produto primeiro.
  // Core, Jornada, conteúdos e personalizações nunca podem bloquear o acesso.
  state.user=session.user;
  showAuthenticatedShell();

  if(initializedSessionUserId===session.user.id)return;
  if(sessionInitPromise && session.user.id===state.user?.id)return sessionInitPromise;

  sessionInitPromise=(async()=>{
    try{
      await initApp(session);
      initializedSessionUserId=session.user.id;
    }catch(err){
      console.error('NEXO init parcial',err);
      try{logClientError('auth_session',err,'session_partial_init')}catch(_){}
      // A sessão permanece utilizável mesmo se um módulo secundário falhar.
      showAuthenticatedShell();
      toast('O NEXO abriu em modo seguro. Alguns módulos podem terminar de carregar em instantes.','info');
    }
  })();

  try{
    await sessionInitPromise;
  }finally{
    sessionInitPromise=null;
  }
}

function reportSessionError(err) {
  if(window.__nexoBootWatchdog){clearTimeout(window.__nexoBootWatchdog);window.__nexoBootWatchdog=null;}
  console.error('Falha ao carregar a sessão/app:', err);
  logClientError('auth_session',err,'session_load');

  // Se o Supabase já entregou uma sessão válida, um erro de inicialização da UI
  // não deve derrubar a conta nem mandar o usuário de volta para o login.
  if(state.user?.id){
    showAuthenticatedShell();
    toast('Sua sessão continua ativa. O NEXO entrou em modo seguro sem desconectar sua conta.','error');
  }else{
    $('#app').classList.add('hidden');
    $('#authScreen').classList.remove('hidden');
    $('#niaButton')?.classList.add('hidden');
    $('#niaPanel')?.classList.add('hidden');
    showAuthMessage('Não consegui restaurar sua sessão. Entre novamente para continuar.', true);
  }

  $('#boot').classList.add('fade');
  setTimeout(()=>$('#boot').classList.add('hidden'),450);
}

let authBootstrapStarted=false;

function startAuthBootstrap(){
  if(authBootstrapStarted)return;
  authBootstrapStarted=true;

  client.auth.onAuthStateChange((_event, session) => {
    // Mantém o callback síncrono e agenda a inicialização para o próximo tick.
    setTimeout(() => {
      handleSession(session).catch(reportSessionError);
    }, 0);
  });

  client.auth.getSession()
    .then(({data,error}) => {
      if(error)throw error;
      return handleSession(data.session);
    })
    .catch(reportSessionError);
}

window.addEventListener('focus',()=>refreshCurrentRole({silent:false}));
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible')refreshCurrentRole({silent:false});
});
setInterval(()=>{
  if(state.user)refreshCurrentRole({silent:false});
},30000);

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
  if (error) { console.error(error); logClientError('dashboard',error,'dashboard_load'); return; }
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


async function loadNexoCore(){
  try{
    const {data,error}=await client.rpc('get_nexo_core');
    if(error)throw error;
    state.core=data||null;
  }catch(err){
    console.error('NEXO Core',err);
    logClientError('nexo_core',err,'core_load');
    state.core=null;
  }
  renderNexoCore();
  return state.core;
}

function renderNexoCore(){
  const core=state.core||{};
  const rec=core.recommended_action||null;
  const momentum=core.momentum||{};
  const behavior=core.behavior||{};
  const initial=Boolean(rec && !rec.topic && Number(rec.attempts||0)===0);
  const signal=rec?.learning_signal||behavior.profile||'calibrating';
  const signalMeta={
    hesitation:{label:'DECISÃO',text:'Você sabe mais do que parece, mas ainda hesita para confirmar.'},
    content:{label:'CONTEÚDO',text:'O principal ganho agora vem de consolidar o conteúdo.'},
    guided:{label:'AUTONOMIA',text:'Você aprende com pistas; o Core vai reduzir a ajuda aos poucos.'},
    decisive:{label:'DECISÃO FORTE',text:'Suas escolhas estão ficando rápidas e estáveis.'},
    balanced:{label:'EQUILIBRADO',text:'Seu padrão de decisão está equilibrado.'},
    calibrating:{label:'CALIBRANDO',text:'Preciso de mais algumas questões para ler seu padrão de decisão.'},
    diagnostic:{label:'DIAGNÓSTICO',text:'Primeiro vamos medir domínio, tempo e comportamento de escolha.'}
  };
  const signalInfo=signalMeta[signal]||signalMeta.balanced;
  $$('.nexo-core-card').forEach(card=>card.classList.toggle('core-empty',!rec));
  $$('[data-core-status]').forEach(el=>el.textContent=initial?'primeiro diagnóstico':rec?('adaptativo · '+signalInfo.label.toLowerCase()):'calibrando');
  $$('[data-core-behavior]').forEach(el=>{
    const measured=Number(behavior.measured_attempts||0);
    const visible=Boolean(rec && !initial && (measured>=3 || ['content','hesitation','guided'].includes(signal)));
    el.classList.toggle('hidden',!visible);
    if(visible){
      const extra=signal==='hesitation'&&Number(rec?.hesitation_rate||0)
        ? ' · '+Math.round(Number(rec.hesitation_rate))+'% de hesitação'
        : signal==='guided'&&Number(rec?.avg_hints||0)
          ? ' · '+Number(rec.avg_hints).toFixed(1)+' pistas/questão'
          : signal==='decisive'&&Number(behavior.avg_first_choice_seconds||0)
            ? ' · '+Math.round(Number(behavior.avg_first_choice_seconds))+'s até a 1ª escolha'
            : '';
      el.innerHTML='<b>'+esc(signalInfo.label)+'</b><span>'+esc(signalInfo.text+extra)+'</span>';
      el.dataset.signal=signal;
    }
  });
  $$('[data-core-title]').forEach(el=>el.textContent=initial
    ? ('Diagnóstico inicial · '+(rec.area||'ENEM'))
    : rec
      ? ((rec.subject||rec.area||'Treino')+' · '+(rec.topic||'revisão direcionada'))
      : 'Seu próximo melhor passo');
  $$('[data-core-reason]').forEach(el=>el.textContent=rec
    ? (rec.reason||'O NEXO encontrou um ponto com boa margem de evolução.')
    : 'Resolva algumas questões para eu transformar seu desempenho em uma recomendação personalizada.');
  $$('[data-core-mastery]').forEach(el=>el.textContent=initial?'—':rec?Math.round(Number(rec.mastery||0))+'%':'—');
  $$('[data-core-priority]').forEach(el=>el.textContent=initial?'1ª':rec?Math.round(Number(rec.priority||0))+'%':'—');
  $$('[data-core-momentum]').forEach(el=>el.textContent=String(Number(momentum.attempts_7d||0)));
  const coreMood=rec
    ? (Number(rec.priority||0)>=70?'pensativo':Number(rec.mastery||0)>=70?'confiante':'serio')
    : 'pensativo';
  const coreSrc=nexoBustForMood(coreMood);
  $$('[data-core-avatar]').forEach(img=>{
    if(img.getAttribute('src')!==coreSrc)setNexoImage(img,coreSrc);
  });
  updateHomeExperience();
  renderTodayPlan();
  if(state.videos.length)renderVideos();
  if(state.materials.length)renderMaterials();
  $$('[data-core-start]').forEach(btn=>{
    btn.innerHTML=initial
      ? 'Iniciar diagnóstico · '+Number(rec.size||6)+' questões <span>→</span>'
      : rec
        ? 'Treinar '+Number(rec.size||6)+' questões <span>→</span>'
        : 'Começar diagnóstico <span>→</span>';
    btn.onclick=()=>{
      if(rec) startCoreRecommendation();
      else {
        openPage('questoes');
        resetSessionUI();
        toast('Faça uma sessão curta para o NEXO Core calibrar seu perfil.');
      }
    };
  });
}

async function startCoreRecommendation(){
  if(blockMaintenance('core'))return;
  if(!state.core) await loadNexoCore();
  const rec=state.core?.recommended_action;
  if(!rec){
    openPage('questoes');
    resetSessionUI();
    toast('Ainda preciso de algumas respostas para montar um treino adaptativo.');
    return;
  }
  openPage('questoes');
  const learningSignal=rec.learning_signal||'balanced';
  await startStudySession({
    mode:'core',
    area:rec.area||'',
    subject:rec.subject||'',
    topic:rec.topic||'',
    difficulty:'',
    visualOnly:false,
    size:Number(rec.size||6),
    learningSignal,
    maxHints:learningSignal==='guided'?2:3,
    coachTimeSeconds:learningSignal==='hesitation'?50:learningSignal==='content'?75:65,
    coachLongSeconds:learningSignal==='hesitation'?100:learningSignal==='content'?140:125
  });
  if(state.session){
    $('#sessionAreaBadge').textContent='NEXO Core';
    $('#sessionTitle').textContent=rec.topic||rec.subject||'Treino adaptativo';
    $('#sessionSubtitle').textContent=rec.reason||'Sessão montada com base no seu desempenho.';
  }
}

async function beginNexoSession(config,plannedCount){
  try{
    const {data,error}=await client.rpc('start_nexo_session',{
      p_mode:config.mode||'manual',
      p_area:config.area||null,
      p_subject:config.subject||null,
      p_topic:config.topic||null,
      p_planned_count:Number(plannedCount||config.size||10)
    });
    if(error)throw error;
    return data||null;
  }catch(err){
    console.error('start_nexo_session',err);
    if(planLimitMessage(err))throw err;
    return null;
  }
}

async function closeNexoSession(status='completed',session=state.session){
  const id=session?.coreSessionId;
  if(!id)return false;
  session.coreSessionId=null;
  try{
    const {error}=await client.rpc('finish_nexo_session',{
      p_session_id:id,
      p_status:status
    });
    if(error)throw error;
    return true;
  }catch(err){
    console.error('finish_nexo_session',err);
    return false;
  }
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
  const previous=state.session;
  if(previous?.coreSessionId) closeNexoSession('abandoned',previous);
  stopQuestionBehaviorMonitor();
  state.session=null; state.current=null; state.answered=false; state.selectedOption=null; state.lastAnswer=null;
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
  if(blockMaintenance('questions'))return;
  if(['core','adaptive'].includes(config?.mode)&&blockMaintenance('core'))return;
  const btn=$('#startSession'); if(btn){btn.disabled=true;btn.textContent='Montando sessão...';}
  try{
    if(!state.membership)await loadNexoMembership({silent:true});
    if(planUsageReached('questions'))return openNexoPlans('Você atingiu as 10 questões disponíveis hoje no plano Free.');
    if(config?.mode==='core'&&planUsageReached('core'))return openNexoPlans('Você já usou a sessão NEXO Core disponível hoje no Free.');
    if(config?.mode==='arena'&&planUsageReached('arena'))return openNexoPlans('Você já usou sua entrada gratuita da Arena nesta semana.');
    if(state.session?.coreSessionId) await closeNexoSession('abandoned',state.session);
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
    const coreSessionId=await beginNexoSession(config,queue.length);
    state.session={...config,mode:config.mode||'manual',queue,index:0,size:queue.length,reviewMode,coreSessionId,correctStreak:0,wrongStreak:0,answeredCount:0};
    $('#sessionSetup').classList.add('hidden');
    $('#studyWorkspace').classList.remove('hidden');
    $('#sessionAreaBadge').textContent=config.area||'Treino';
    $('#sessionTitle').textContent=config.topic ? config.topic : (config.subject||config.area||'Sessão');
    $('#sessionSubtitle').textContent=reviewMode?'Modo revisão: você já respondeu todas as questões novas deste filtro.':'Sua sessão está fixa neste conteúdo até você decidir trocar.';
    await showCurrentQuestion();
  }catch(err){
    console.error(err);logClientError('study_session',err,'session_build');
    if(!handlePlanLimitError(err))toast(err.message||'Não foi possível montar a sessão.','error');
  }finally{
    if(btn){btn.disabled=false;btn.innerHTML='Começar sessão <span>→</span>';}
  }
}

async function startAdaptive() {
  if(blockMaintenance('core'))return;
  if(!state.core) await loadNexoCore();
  const rec=state.core?.recommended_action;
  if(rec){
    openPage('questoes');
    await startStudySession({
      mode:'adaptive',
      topic:rec.topic||'',
      subject:rec.subject||'',
      area:rec.area||'',
      size:Number(rec.size||8),
      difficulty:'',
      visualOnly:false
    });
    if(state.session){
      $('#sessionAreaBadge').textContent='Adaptativo';
      $('#sessionTitle').textContent=rec.topic||rec.subject||'Treino adaptativo';
      $('#sessionSubtitle').textContent=rec.reason||'Foco automático definido pelo NEXO Core.';
    }
    return;
  }

  if(!state.dashboard) await loadDashboard();
  const weak=state.dashboard?.weak_topics||[];
  if(!weak.length){
    openPage('questoes');
    toast('Resolva algumas questões antes para liberar o treino adaptativo.');
    return;
  }
  const target=weak[0];
  openPage('questoes');
  await startStudySession({
    mode:'adaptive',
    topic:target.topic,
    size:8,
    area:'',
    subject:'',
    difficulty:'',
    visualOnly:false
  });
  if(state.session){
    $('#sessionAreaBadge').textContent='Adaptativo';
    $('#sessionTitle').textContent=target.topic;
    $('#sessionSubtitle').textContent='Foco automático no tema com maior taxa de erro.';
  }
}

async function showCurrentQuestion() {
  if(!state.session) return;
  if(state.session.index>=state.session.queue.length){
    await finishSession(); return;
  }
  state.current=state.session.queue[state.session.index];
  state.answered=false;state.selectedOption=null;state.lastAnswer=null;state.questionStartedAt=Date.now();
  startQuestionBehaviorMonitor(state.current);
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

function stopQuestionBehaviorMonitor(){
  const behavior=state.questionBehavior;
  if(behavior?.timers){
    behavior.timers.forEach(timer=>clearTimeout(timer));
  }
  state.questionBehavior=null;
}

function questionBehaviorIsActive(questionId){
  return Boolean(
    state.questionBehavior &&
    Number(state.questionBehavior.questionId)===Number(questionId) &&
    state.current &&
    Number(state.current.id)===Number(questionId) &&
    !state.answered
  );
}

function preAnswerHintFor(q,level=1){
  const area=q?.area||'';
  const topic=q?.topic||q?.subject||'conteúdo';
  if(level<=1){
    return 'Antes de olhar as alternativas de novo, resuma o comando em uma frase: o que exatamente a questão quer que você encontre, explique ou compare?';
  }
  if(level===2){
    return getQuestionHint(q)||'Separe os dados úteis do contexto e elimine primeiro as alternativas que não respondem diretamente ao comando.';
  }
  if(area==='Matemática'){
    return 'Terceira pista: faça uma estimativa antes da conta completa e teste a ordem de grandeza das alternativas. Isso reduz opções sem entregar o resultado.';
  }
  if(area==='Linguagens'){
    return 'Terceira pista: volte ao trecho que sustenta o comando e procure a alternativa que pode ser provada pelo texto, não a que apenas parece mais bonita.';
  }
  if(area==='Ciências da Natureza'){
    return 'Terceira pista: nomeie a relação de causa e efeito do fenômeno e confira unidades, direção da mudança e mecanismo antes de comparar as opções.';
  }
  if(area==='Ciências Humanas'){
    return 'Terceira pista: fixe tempo, espaço, agente social e conceito central. Depois elimine generalizações e anacronismos.';
  }
  return 'Terceira pista: tente explicar em voz mental por que duas alternativas estão erradas. A resposta fica mais clara quando você elimina por evidência.';
}

function showQuestionCoachReaction(type,{force=false}={}){
  const behavior=state.questionBehavior;
  const q=state.current;
  if(!behavior||!q||state.answered||Number(behavior.questionId)!==Number(q.id))return;
  if(behavior.lastReaction===type&&!force)return;

  const coach=$('#questionCoach');
  const avatar=$('#questionCoachAvatar');
  const text=$('#questionCoachText');
  const button=$('#preAnswerHint');
  if(!coach||!text)return;

  let mood='pensativo';
  let message='Se travar, eu te dou uma pista de estratégia sem revelar o gabarito.';
  let label='Pedir pista';

  if(type==='time'){
    message=state.selectedOption===null
      ? 'Você já está há mais de 1 minuto aqui. Tente reduzir o comando a uma pergunta simples; posso te dar uma pista leve.'
      : 'Você já escolheu uma alternativa e ainda está hesitando. Quer uma pista para conferir o raciocínio sem revelar a resposta?';
    label=behavior.hintCount?'Outra pista':'Quero uma pista';
  }else if(type==='long_time'){
    message='Essa questão já passou de 2 minutos. No ENEM, vale buscar o ponto decisivo agora e evitar ficar preso. Posso te orientar pelo método.';
    label=behavior.hintCount?'Mais uma pista':'Ver estratégia';
  }else if(type==='switching'){
    message='Percebi que você trocou de alternativa algumas vezes. Em vez de comparar todas de novo, volte ao comando e elimine por evidência.';
    label=behavior.hintCount?'Outra pista':'Me dá uma pista';
  }else if(type==='hint_repeat'){
    mood='acolhedor';
    message='Você já usou mais de uma pista. Agora tente aplicar uma delas antes de pedir outra; se ainda travar, eu aprofundo o método sem entregar o gabarito.';
    const maxHints=Math.max(1,Math.min(3,Number(state.session?.maxHints||3)));
    label=behavior.hintCount>=maxHints?'Pistas usadas':'Próxima pista';
  }

  behavior.lastReaction=type;
  coach.dataset.behavior=type;
  coach.classList.add('is-reacting');
  text.textContent=message;
  if(button&&!button.disabled)button.textContent=label;
  if(avatar)setNexoImage(avatar,nexoBustForMood(mood));
  setNexoMood(mood);

  clearTimeout(behavior.uiTimer);
  behavior.uiTimer=setTimeout(()=>{
    if(questionBehaviorIsActive(q.id))coach.classList.remove('is-reacting');
  },7000);
}

function startQuestionBehaviorMonitor(q,seed=null){
  stopQuestionBehaviorMonitor();
  const questionId=Number(q?.id||0);
  const signal=state.session?.learningSignal||'balanced';
  const coachSeconds=Number(state.session?.coachTimeSeconds||(
    signal==='hesitation'?50:
    signal==='content'?75:
    65
  ));
  const longSeconds=Number(state.session?.coachLongSeconds||(
    signal==='hesitation'?100:
    signal==='content'?140:
    125
  ));
  const startedAt=Number(seed?.startedAt||Date.now());
  const behavior={
    questionId,
    startedAt,
    selectionChanges:Number(seed?.selectionChanges||0),
    hintCount:Number(seed?.hintCount||0),
    firstSelectionAt:Number(seed?.firstSelectionAt||0),
    lastReaction:seed?.lastReaction||'',
    timers:[],
    uiTimer:null
  };
  state.questionBehavior=behavior;

  const elapsed=Math.max(0,Date.now()-startedAt);
  behavior.timers.push(setTimeout(()=>{
    if(questionBehaviorIsActive(questionId))showQuestionCoachReaction('time');
  },Math.max(500,coachSeconds*1000-elapsed)));

  behavior.timers.push(setTimeout(()=>{
    if(questionBehaviorIsActive(questionId))showQuestionCoachReaction('long_time',{force:true});
  },Math.max(1000,longSeconds*1000-elapsed)));
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
    <div class="question-coach" id="questionCoach" data-behavior="idle">
      <img id="questionCoachAvatar" src="${NEXO_MEDIA_IMAGES.bustPensativo}" data-nexo-family="bust" alt="Professor Nexo">
      <div><b>Professor Nexo</b><small id="questionCoachText">Se travar, eu te dou uma pista de estratégia sem revelar o gabarito.</small></div>
      <button id="preAnswerHint" type="button">Pedir pista</button>
    </div>
    <div id="preAnswerHintBox" class="pre-answer-hint hidden"></div>
    <div class="q-options">${(q.options||[]).map((opt,i)=>`<button class="q-option" data-option="${i}"><span>${'ABCDE'[i]}</span><b>${esc(opt)}</b></button>`).join('')}</div>
    <div class="confirm-answer-wrap"><small>Selecione uma alternativa. Você poderá conferir antes de enviar.</small><button id="confirmAnswer" class="primary-btn" disabled>Confirmar resposta</button></div>
    <div class="question-footer"><small>${esc(q.source_exam||'Exame Nacional do Ensino Médio')}</small></div>`;

  $$('.q-option',card).forEach(b=>b.onclick=()=>selectAnswerOption(Number(b.dataset.option)));
  const preHint=$('#preAnswerHint');
  if(preHint){
    preHint.onclick=()=>{
      const behavior=state.questionBehavior;
      if(!behavior||!questionBehaviorIsActive(q.id))return;
      const maxHints=Math.max(1,Math.min(3,Number(state.session?.maxHints||3)));
      if(Number(behavior.hintCount||0)>=maxHints)return;
      behavior.hintCount=Math.min(maxHints,Number(behavior.hintCount||0)+1);
      const box=$('#preAnswerHintBox');
      const hint=preAnswerHintFor(q,behavior.hintCount);
      box.innerHTML='<div class="pre-hint-icon">✦</div><div><b>Pista '+behavior.hintCount+' de '+maxHints+'</b><p>'+esc(hint)+'</p></div>';
      box.classList.remove('hidden');
      if(behavior.hintCount>=maxHints){
        preHint.textContent=maxHints+' pista'+(maxHints>1?'s':'')+' usada'+(maxHints>1?'s':'');
        preHint.disabled=true;
      }else{
        preHint.textContent='Outra pista';
      }
      if(behavior.hintCount>=2)showQuestionCoachReaction('hint_repeat',{force:true});
      else setNexoMood('pensativo');
    };
  }

  if(visual){
    const ok=await renderVisual(q);
    if(!ok && state.current?.id===q.id){
      $('#visualWrap')?.remove();
    }
  }
}

function selectAnswerOption(option){
  if(state.answered)return;
  const previous=state.selectedOption;
  const behavior=state.questionBehavior;
  if(behavior&&questionBehaviorIsActive(state.current?.id)){
    if(!behavior.firstSelectionAt)behavior.firstSelectionAt=Date.now();
    if(previous!==null&&Number(previous)!==Number(option)){
      behavior.selectionChanges=Number(behavior.selectionChanges||0)+1;
      if(behavior.selectionChanges>=2)showQuestionCoachReaction('switching',{force:behavior.selectionChanges===2});
    }
  }
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

function questionStudyText(q){
  return [q?.subject,q?.topic,q?.base_text,q?.prompt].filter(Boolean).join(' ').toLowerCase();
}

function questionVariant(q,choices,salt=0){
  if(!choices?.length)return '';
  const raw=String(q?.id||'')+'|'+String(q?.source_question_number||'')+'|'+String(q?.prompt||'')+'|'+salt;
  let hash=0;
  for(let i=0;i<raw.length;i++)hash=((hash<<5)-hash+raw.charCodeAt(i))|0;
  return choices[Math.abs(hash)%choices.length];
}

function questionAreaKey(q){
  const area=String(q?.area||'').toLowerCase();
  const subject=String(q?.subject||'').toLowerCase();
  const joined=area+' '+subject;
  if(/linguagens|portugu|literatura|ingl[eê]s|espanhol|arte|educa[cç][aã]o f[ií]sica/.test(joined))return 'linguagens';
  if(/humanas|hist[oó]ria|geografia|filosofia|sociologia/.test(joined))return 'humanas';
  if(/natureza|biologia|qu[ií]mica|f[ií]sica/.test(joined))return 'natureza';
  if(/matem[aá]tica/.test(joined))return 'matematica';
  return 'geral';
}

function getQuestionHint(q){
  const text=questionStudyText(q);
  const area=questionAreaKey(q);
  const topic=q?.topic||q?.subject||'este conteúdo';

  /* A área vem ANTES das palavras-chave.
     Assim "função da linguagem" nunca vira "função afim", por exemplo. */
  if(area==='linguagens'){
    if(/varia[cç][aã]o lingu[ií]stica|oralidade|escrita|registro|norma|dialeto/.test(text)){
      return questionVariant(q,[
        'Observe quem fala, para quem fala e em qual situação. A pista está em perceber como o uso da língua muda conforme contexto, grupo social ou grau de formalidade.',
        'Compare as marcas de oralidade e escrita presentes no trecho. Não julgue como “certo ou errado”; identifique qual efeito comunicativo aquela escolha produz.',
        'Procure palavras, construções ou pronúncias que indiquem variedade linguística. Depois relacione essas marcas ao contexto em que a fala aparece.'
      ],101);
    }
    if(/fun[cç][aã]o da linguagem|emissor|receptor|mensagem|canal|c[oó]digo|referente/.test(text)){
      return questionVariant(q,[
        'Descubra qual elemento da comunicação recebe mais destaque: emissor, receptor, mensagem, canal, código ou referente. Isso aponta para a função da linguagem.',
        'Não associe “função” a cálculo. Aqui, pense no objetivo comunicativo predominante do texto: informar, convencer, expressar emoção, manter contato ou falar da própria linguagem.',
        'Leia o texto perguntando “qual efeito ele quer produzir no leitor?”. A resposta ajuda a identificar a função da linguagem predominante.'
      ],102);
    }
    if(/figura de linguagem|met[aá]fora|meton[ií]mia|ironia|hip[eé]rbole|personifica[cç][aã]o|ant[ií]tese/.test(text)){
      return questionVariant(q,[
        'Localize a expressão que foge do sentido literal. Depois observe qual relação de sentido ela cria no contexto.',
        'Em vez de decorar nomes, pergunte o que aconteceu com o sentido: comparação implícita, exagero, oposição, substituição ou ironia.',
        'Compare o sentido literal com o efeito produzido pelo trecho. A figura correta precisa explicar essa mudança de sentido.'
      ],103);
    }
    if(/poema|poesia|conto|cr[oô]nica|romance|g[eê]nero|liter[aá]rio|narrador/.test(text)){
      return questionVariant(q,[
        'Observe gênero, voz do texto e organização do discurso. A resposta precisa ser sustentada por elementos presentes no próprio texto.',
        'Se a questão é literária, procure como forma e conteúdo trabalham juntos: narrador, imagens, ritmo, ironia ou ponto de vista.',
        'Volte ao trecho exato indicado pelo comando e identifique o efeito criado pelo recurso literário, sem depender só do tema geral.'
      ],104);
    }
    if(/publicidade|an[uú]ncio|campanha|cartaz|propaganda|persuas/.test(text)){
      return questionVariant(q,[
        'Identifique o público-alvo e o comportamento que a peça tenta provocar. Depois veja quais recursos verbais e visuais ajudam nessa persuasão.',
        'Separe informação de persuasão: qual escolha de palavra, imagem ou imperativo tenta aproximar o leitor da mensagem?',
        'Leia texto e imagem como um conjunto. O sentido publicitário costuma nascer da relação entre os dois, não de um elemento isolado.'
      ],105);
    }
    return questionVariant(q,[
      'Leia o verbo do comando — identificar, inferir, explicar, criticar ou comparar. Ele define o tipo de evidência que você deve procurar no texto.',
      'Volte ao trecho que sustenta a ideia pedida e compare as alternativas com esse trecho, não com sua opinião sobre o assunto.',
      'Observe quem fala, para quem fala e com qual efeito. Em Linguagens, contexto e intenção comunicativa costumam decidir a questão.'
    ],106);
  }

  if(area==='humanas'){
    if(/mapa|territ[oó]rio|migra[cç]|urbaniza[cç]|popula[cç]|clima|relevo|geopol/.test(text)){
      return questionVariant(q,[
        'Localize espaço, escala e processo geográfico envolvido. Depois relacione o fenômeno ao território mostrado ou descrito.',
        'Veja se o comando pede causa, consequência ou distribuição espacial. Isso evita escolher uma alternativa verdadeira, mas fora do recorte.',
        'Em mapas, confira legenda, orientação, escala e período antes de interpretar o fenômeno.'
      ],111);
    }
    if(/filosof|sociolog|cidadania|estado|poder|trabalho|sociedade|cultura/.test(text)){
      return questionVariant(q,[
        'Identifique o conceito central e a posição do autor. Depois compare as alternativas com essa ideia, sem extrapolar o texto.',
        'Procure a relação entre indivíduo, sociedade, poder ou conhecimento que o trecho estabelece. O comando normalmente cobra essa relação.',
        'Separe o conceito do exemplo usado no texto. A alternativa correta explica a ideia, não apenas repete uma palavra do trecho.'
      ],112);
    }
    return questionVariant(q,[
      'Localize época, espaço, grupo social e processo histórico citado. Depois elimine alternativas incompatíveis com esse contexto.',
      'Veja se a pergunta quer causa, consequência, característica ou comparação. O tipo de relação pedido é tão importante quanto o conteúdo.',
      'Use o texto-base como limite: descarte opções anacrônicas, muito gerais ou que atribuam ao autor algo que ele não afirma.'
    ],113);
  }

  if(area==='natureza'){
    if(/circuit|corrente|tens[aã]o|resist|pot[eê]ncia|el[eé]tr/.test(text)){
      return questionVariant(q,[
        'Identifique o que está em série e o que está em paralelo antes de usar fórmulas. Depois marque quais grandezas são iguais em cada trecho.',
        'Comece pelas unidades e pelo que o circuito pede: corrente, tensão, resistência ou potência. Isso indica qual relação física usar.',
        'Desenhe mentalmente o caminho da corrente. Saber onde ela se divide ou permanece igual costuma resolver metade da questão.'
      ],121);
    }
    if(/ph|[aá]cid|base|concentra|mol|rea[cç][aã]o|oxida|redu[cç]|estequi/.test(text)){
      return questionVariant(q,[
        'Separe quantidade de matéria, concentração e proporção estequiométrica. A unidade mostra qual etapa deve vir primeiro.',
        'Confira conservação de átomos e de carga antes de calcular. Se a reação não estiver balanceada, a conta seguinte ficará errada.',
        'Identifique reagente, produto e proporção molar antes de mexer nos números. Isso evita usar dados que não conversam entre si.'
      ],122);
    }
    if(/gen[eé]tica|dna|rna|c[eé]lula|ecologia|evolu[cç]|fisiologia|enzima/.test(text)){
      return questionVariant(q,[
        'Identifique o processo biológico central e acompanhe a sequência causa → mecanismo → consequência.',
        'Separe estrutura de função: descubra qual componente biológico está sendo citado e qual papel ele exerce naquele processo.',
        'Procure no enunciado o nível de organização envolvido — molécula, célula, organismo, população ou ecossistema — antes de comparar as opções.'
      ],123);
    }
    return questionVariant(q,[
      'Liste as grandezas, condições ou variáveis do fenômeno e identifique o princípio científico que liga esses dados.',
      'Antes da fórmula, pense no sentido físico, químico ou biológico do processo: o que deveria aumentar, diminuir ou permanecer constante?',
      'Pergunte qual variável foi alterada e qual resposta do sistema está sendo observada. Isso ajuda a separar causa de consequência.'
    ],124);
  }

  if(area==='matematica'){
    if(/rua|quarteir|trajeto|percurso|dist[aâ]ncia de percurso|malha/.test(text)){
      return questionVariant(q,[
        'Olhe para o mapa como uma malha: conte deslocamentos horizontais e verticais separadamente antes de comparar os caminhos.',
        'A pista está no tipo de percurso permitido. Conte quarteirões em cada direção e procure o ponto que satisfaz todas as distâncias pedidas.',
        'Não use distância em linha reta quando o trajeto acompanha ruas. Conte os blocos percorridos em cada direção.'
      ],131);
    }
    if(/m[eé]dia|mediana|moda|estat[ií]st|frequ[eê]ncia/.test(text)){
      return questionVariant(q,[
        'Primeiro identifique qual medida está sendo pedida: média, mediana, moda ou frequência. Cada uma exige um procedimento diferente.',
        'Antes de calcular, confira se existe peso ou frequência associada aos valores. Isso muda a média.',
        'Se for mediana, ordene os dados; se for média, confira todos os termos; se for moda, procure repetição.'
      ],132);
    }
    if(/porcent|percentual|desconto|acr[eé]scimo|taxa/.test(text)){
      return questionVariant(q,[
        'Descubra qual valor representa 100% antes de calcular. O erro mais comum é aplicar a taxa sobre a base errada.',
        'Veja se há variações sucessivas. Quando a base muda, os percentuais não devem ser simplesmente somados.',
        'Transforme o percentual em uma relação com o total e confira se o comando pede valor final, diferença ou taxa.'
      ],133);
    }
    if(/probabil|chance|sorteio|aleat|possibilidades/.test(text)){
      return questionVariant(q,[
        'Defina primeiro os casos possíveis e depois os favoráveis. Só então monte a probabilidade.',
        'Veja se existe reposição ou dependência entre os eventos. Isso altera as probabilidades de cada etapa.',
        'Confira se o comando pede “e”, “ou”, “pelo menos um” ou o complementar do evento.'
      ],134);
    }
    if(/fun[cç][aã]o|afim|quadr[aá]t|par[aá]bola|coeficiente|equa[cç][aã]o/.test(text)){
      return questionVariant(q,[
        'Traduza as grandezas para uma relação entre variáveis. Depois identifique quais dados permitem determinar a expressão.',
        'Se houver gráfico, procure intercepto, crescimento e pontos conhecidos antes de substituir números.',
        'Confira o que a incógnita representa e mantenha as unidades junto dela ao montar a equação.'
      ],135);
    }
    if(/geometr|[aá]rea|volume|per[ií]metro|tri[aâ]ng|c[ií]rculo|quadrado|ret[aâ]ng/.test(text)){
      return questionVariant(q,[
        'Marque só as medidas necessárias e diferencie área, perímetro e volume antes de escolher a fórmula.',
        'Procure decompor a figura em formas simples. Muitas questões ficam menores quando você calcula apenas a parte relevante.',
        'Confira a unidade esperada: comprimento, área e volume têm dimensões diferentes.'
      ],136);
    }
    if(/gr[aá]fico|tabela|eixo|coluna/.test(text)){
      return questionVariant(q,[
        'Leia título, unidade e escala dos eixos antes de comparar valores.',
        'Marque apenas o intervalo pedido no comando e observe tendência, crescimento ou queda nesse trecho.',
        'Confira se os dados são absolutos, percentuais ou acumulados antes de fazer qualquer conta.'
      ],137);
    }
    return questionVariant(q,[
      'Transforme o enunciado em relações matemáticas simples e identifique exatamente qual grandeza o comando quer encontrar.',
      'Faça uma estimativa antes da conta completa. Ela ajuda a detectar resultados incompatíveis com a ordem de grandeza.',
      'Use unidades e condições do problema para eliminar alternativas antes de fazer todas as contas.'
    ],138);
  }

  return questionVariant(q,[
    'Leia o comando novamente e destaque mentalmente o que precisa ser encontrado.',
    'Procure a condição principal do enunciado e teste as alternativas contra ela.',
    'Antes de escolher, resuma em uma frase o que a questão está pedindo.'
  ],151)+` Tema da questão: ${topic}.`;
}

function getQuestionShortcut(q){
  const text=questionStudyText(q);
  const area=questionAreaKey(q);

  if(area==='linguagens'){
    if(/varia[cç][aã]o lingu[ií]stica|oralidade|escrita|registro|norma|dialeto/.test(text)){
      return questionVariant(q,[
        'Macete: não trate variedade linguística como erro. Compare contexto + interlocutor + grau de formalidade para eliminar alternativas preconceituosas ou normativas demais.',
        'Atalho: circule mentalmente as marcas de fala, região ou grupo social. A alternativa correta costuma explicar a adequação daquela variedade à situação.',
        'Se aparecer oposição entre norma-padrão e fala real, pergunte primeiro “o texto está avaliando correção ou adequação comunicativa?”. No ENEM, essa diferença é decisiva.'
      ],201);
    }
    if(/fun[cç][aã]o da linguagem|emissor|receptor|mensagem|canal|c[oó]digo|referente/.test(text)){
      return questionVariant(q,[
        'Macete: associe o foco da mensagem ao elemento dominante — emissor = emotiva, receptor = conativa, referente = referencial, mensagem = poética, canal = fática, código = metalinguística.',
        'Atalho: pergunte “o texto quer informar, convencer, expressar, manter contato ou falar da própria linguagem?”. Isso reduz rapidamente as opções.',
        'Não escolha pela presença de uma característica isolada. Procure a função predominante no texto inteiro.'
      ],202);
    }
    if(/figura de linguagem|met[aá]fora|meton[ií]mia|ironia|hip[eé]rbole|personifica[cç][aã]o|ant[ií]tese/.test(text)){
      return questionVariant(q,[
        'Macete: traduza a expressão para o sentido literal. A diferença entre o literal e o sentido produzido revela a figura.',
        'Atalho: comparação implícita → metáfora; exagero → hipérbole; oposição → antítese; troca por relação de proximidade → metonímia.',
        'Se houver ironia, compare o que foi dito com o contexto: o efeito costuma surgir porque o sentido pretendido é diferente do literal.'
      ],203);
    }
    if(/poema|poesia|conto|cr[oô]nica|romance|g[eê]nero|liter[aá]rio|narrador/.test(text)){
      return questionVariant(q,[
        'Macete: em Literatura, não responda só pelo tema. Procure o recurso formal que produz o efeito pedido — narrador, imagem, ritmo, contraste ou ponto de vista.',
        'Atalho: quando duas opções parecem possíveis, volte ao trecho e escolha a que consegue ser provada por uma marca textual concreta.',
        'Identifique primeiro quem fala e de onde fala. Isso costuma resolver questões de narrador, eu lírico e ponto de vista sem releitura completa.'
      ],204);
    }
    return questionVariant(q,[
      'Macete: compare o verbo do comando com o núcleo de cada alternativa. Elimine as que respondem outra coisa, mesmo falando do mesmo tema.',
      'Atalho: desconfie de termos absolutos como “sempre”, “somente” e “exclusivamente” quando o texto é mais nuançado.',
      'Em interpretação, dê preferência à alternativa que pode ser sustentada por uma passagem do texto, sem precisar inventar informação externa.'
    ],206);
  }

  if(area==='humanas'){
    if(/mapa|territ[oó]rio|migra[cç]|urbaniza[cç]|popula[cç]|clima|relevo|geopol/.test(text)){
      return questionVariant(q,[
        'Macete: em mapa, leia primeiro legenda + escala + período. Só depois interprete cores, setas ou distribuição espacial.',
        'Atalho: transforme a pergunta em “onde ocorre, por que ocorre e qual consequência?”. Isso elimina alternativas que misturam escalas.',
        'Se duas opções parecem corretas, verifique qual delas respeita exatamente o espaço e o período mostrados.'
      ],211);
    }
    return questionVariant(q,[
      'Macete: monte uma mini linha do tempo e elimine alternativas anacrônicas antes de analisar as demais.',
      'Atalho: procure agente + ação + contexto. Se um desses três não combinar com o texto, descarte a opção.',
      'Quando duas respostas parecem verdadeiras, escolha a que corresponde à relação pedida — causa, consequência, característica ou comparação.'
    ],212);
  }

  if(area==='natureza'){
    if(/circuit|corrente|tens[aã]o|resist|pot[eê]ncia|el[eé]tr/.test(text)){
      return questionVariant(q,[
        'Macete: série → mesma corrente; paralelo → mesma tensão. Marque isso no circuito antes de usar qualquer equação.',
        'Atalho: escolha a fórmula pela grandeza pedida e pelas unidades fornecidas, não pela fórmula que você lembrar primeiro.',
        'Antes de calcular potência, resistência ou corrente, simplifique o circuito por blocos.'
      ],221);
    }
    if(/ph|[aá]cid|base|concentra|mol|rea[cç][aã]o|oxida|redu[cç]|estequi/.test(text)){
      return questionVariant(q,[
        'Macete: balanceie primeiro, transforme os dados em mol e só depois use a proporção da equação.',
        'Atalho: confira unidades antes de calcular concentração. Litro, mol e massa não podem ser misturados sem conversão.',
        'Em estequiometria, escreva a proporção dos coeficientes acima dos valores. Isso reduz erros de regra de três.'
      ],222);
    }
    return questionVariant(q,[
      'Macete: faça análise dimensional antes da conta. Se a unidade da alternativa não pode sair dos dados fornecidos, descarte-a.',
      'Use conservação como atalho quando couber: energia, carga, massa ou quantidade de matéria evitam várias etapas.',
      'Faça uma previsão qualitativa — aumenta, diminui ou permanece — antes de calcular. Isso elimina resultados fisicamente impossíveis.'
    ],223);
  }

  if(area==='matematica'){
    if(/rua|quarteir|trajeto|percurso|dist[aâ]ncia de percurso|malha/.test(text)){
      return questionVariant(q,[
        'Macete: em malha de ruas, distância = blocos horizontais + blocos verticais. Não use a diagonal.',
        'Atalho: transforme os cruzamentos em coordenadas e some as diferenças absolutas entre elas.',
        'Teste primeiro o ponto mais central entre os destinos; ele tende a reduzir a quantidade de alternativas que precisam ser verificadas.'
      ],231);
    }
    if(/m[eé]dia|mediana|moda|estat[ií]st|frequ[eê]ncia/.test(text)){
      return questionVariant(q,[
        'Atalho: média com frequência = soma(valor × frequência) ÷ total. Para mediana, ordene só até achar o centro; para moda, procure repetição.',
        'Macete: estime a média antes da conta. Se o resultado final ficar fora da faixa dos dados, revise.',
        'Em tabela, multiplique valor por frequência linha a linha e deixe a divisão pelo total para o final.'
      ],232);
    }
    if(/porcent|percentual|desconto|acr[eé]scimo|taxa/.test(text)){
      return questionVariant(q,[
        'Macete: aumento de p% → ×(1+p/100); desconto de p% → ×(1-p/100). Mudanças sucessivas pedem multiplicação dos fatores.',
        'Use equivalências rápidas: 50%=1/2, 25%=1/4, 20%=1/5, 10%=1/10 e 5%=1/20.',
        'Se a questão pede o valor original, monte “final = base × fator” e isole a base.'
      ],233);
    }
    if(/probabil|chance|sorteio|aleat|possibilidades/.test(text)){
      return questionVariant(q,[
        'Macete: “pelo menos um” muitas vezes fica mais rápido por 1 − P(nenhum).',
        'Atalho: eventos independentes permitem multiplicar probabilidades; sem reposição, a chance muda a cada etapa.',
        'Procure simetria antes de contar caso a caso. Casos equivalentes podem ser agrupados.'
      ],234);
    }
    if(/fun[cç][aã]o|afim|quadr[aá]t|par[aá]bola|coeficiente|equa[cç][aã]o/.test(text)){
      return questionVariant(q,[
        'Macete: numa função afim, dois pontos determinam a reta. Calcule Δy/Δx antes de montar a expressão.',
        'Atalho: use intercepto, crescimento e pontos conhecidos do gráfico antes de testar todas as alternativas.',
        'Se as opções são expressões, teste um valor simples permitido pelo enunciado para eliminar várias de uma vez.'
      ],235);
    }
    if(/geometr|[aá]rea|volume|per[ií]metro|tri[aâ]ng|c[ií]rculo|quadrado|ret[aâ]ng/.test(text)){
      return questionVariant(q,[
        'Macete: confira a unidade antes da fórmula — comprimento, área e volume terminam em dimensões diferentes.',
        'Se a figura é composta, tente “forma maior − recortes” antes de somar várias partes.',
        'Procure semelhança e proporcionalidade antes de usar fórmulas longas.'
      ],236);
    }
    if(/gr[aá]fico|tabela|eixo|coluna/.test(text)){
      return questionVariant(q,[
        'Macete: compare primeiro a ordem de grandeza das alternativas com a escala do gráfico; várias opções podem cair sem conta.',
        'Atalho: se a pergunta pede variação, use apenas os dois pontos relevantes em vez de analisar o gráfico inteiro.',
        'Anote a unidade ao lado do valor lido. Escala e percentual são pegadinhas frequentes.'
      ],237);
    }
    return questionVariant(q,[
      'Macete: use as alternativas como ferramenta. Elimine resultados incompatíveis com unidade, sinal ou ordem de grandeza antes da conta completa.',
      'Atalho: resolva só até obter informação suficiente para separar uma alternativa; não continue uma conta que já decidiu a resposta.',
      'Faça uma estimativa rápida antes da resolução exata para detectar erro de conta.'
    ],238);
  }

  return questionVariant(q,[
    'Macete: elimine primeiro as alternativas que contradizem diretamente o comando.',
    'Atalho: resolva apenas até ter informação suficiente para distinguir as opções.',
    'Faça uma estimativa rápida ou um resumo do enunciado antes da resolução completa.'
  ],251);
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

function formatAnswerReactionTime(seconds){
  const value=Math.max(0,Number(seconds||0));
  if(value<60)return value+'s';
  const m=Math.floor(value/60),sec=value%60;
  return sec?m+'m '+sec+'s':m+' min';
}

function buildImmediateNexoReaction(q,data,duration){
  const session=state.session||{};
  const difficulty=Number(q?.difficulty||0);

  if(data.correct){
    session.correctStreak=Number(session.correctStreak||0)+1;
    session.wrongStreak=0;
  }else{
    session.wrongStreak=Number(session.wrongStreak||0)+1;
    session.correctStreak=0;
  }
  session.answeredCount=Number(session.answeredCount||0)+1;

  const streak=Number(session.correctStreak||0);
  const wrongStreak=Number(session.wrongStreak||0);
  const slow=Number(duration)>=180;
  const verySlow=Number(duration)>=240;
  const hard=difficulty>=4;

  let mood='confiante';
  let title='Boa leitura. Agora vamos consolidar.';
  let text='Você chegou ao gabarito. O ganho agora é entender qual pista tornou a resposta segura.';
  let badge='ACERTO';

  if(!data.correct){
    if(slow||hard){
      mood='pensativo';
      title='Vamos destravar o raciocínio.';
      text=verySlow
        ? 'Essa questão consumiu bastante tempo e ainda terminou em erro. Vamos simplificar o caminho antes da próxima tentativa.'
        : hard
          ? 'Era uma questão exigente. O foco agora é separar a pista central das alternativas que só parecem plausíveis.'
          : 'O tempo subiu antes da resposta. Vale revisar o método para chegar ao ponto decisivo com menos esforço.';
      badge=hard?'QUESTÃO DIFÍCIL':'AJUSTE DE TEMPO';
    }else{
      mood='acolhedor';
      title=wrongStreak>=2?'Dois erros não definem sua sessão. Vamos ajustar.':'Essa questão virou material de evolução.';
      text=wrongStreak>=2
        ? 'A melhor resposta agora é reduzir a pressa, localizar o comando e reconstruir o raciocínio em etapas.'
        : 'O erro não encerra a questão: ele mostra exatamente o que vale revisar antes da próxima tentativa.';
      badge='PONTO DE REVISÃO';
    }
  }else if(streak>=3){
    mood='confiante';
    title=streak+' acertos seguidos. Seu padrão está ficando consistente.';
    text='Você não está só acertando: está criando repetição de raciocínio. Use o método desta questão como referência para a próxima.';
    badge='SEQUÊNCIA '+streak+'×';
  }else if(slow){
    mood='pensativo';
    title='Acertou. Agora vamos ganhar tempo.';
    text='O raciocínio chegou ao resultado certo, mas passou de 3 minutos. Tente identificar a pista decisiva mais cedo na próxima.';
    badge='ACERTO · TEMPO ALTO';
  }else if(hard){
    mood='confiante';
    title='Boa. Você segurou uma questão difícil.';
    text='Acertar uma questão de nível alto é ótimo; agora confirme qual passo tornou sua decisão segura para conseguir repetir o processo.';
    badge='ACERTO DIFÍCIL';
  }

  return {
    mood,
    image:nexoBustForMood(mood),
    title,
    text,
    badge,
    streak,
    wrongStreak,
    duration:Number(duration||0),
    difficulty
  };
}
async function submitAnswer(option) {
  if(state.answered||!state.current||state.selectedOption===null)return;
  const behaviorSnapshot=state.questionBehavior?{
    questionId:state.questionBehavior.questionId,
    startedAt:state.questionBehavior.startedAt,
    selectionChanges:Number(state.questionBehavior.selectionChanges||0),
    hintCount:Number(state.questionBehavior.hintCount||0),
    firstSelectionAt:Number(state.questionBehavior.firstSelectionAt||0),
    lastReaction:state.questionBehavior.lastReaction||''
  }:null;
  const firstSelectionSeconds=behaviorSnapshot?.firstSelectionAt
    ? Math.max(0,Math.round((behaviorSnapshot.firstSelectionAt-behaviorSnapshot.startedAt)/1000))
    : null;
  const selectionChanges=Number(behaviorSnapshot?.selectionChanges||0);
  const hintCount=Number(behaviorSnapshot?.hintCount||0);
  stopQuestionBehaviorMonitor();
  const confirm=$('#confirmAnswer');
  if(confirm){confirm.disabled=true;confirm.textContent='Corrigindo...';}
  state.answered=true;
  $$('.q-option',$('#questionCard')).forEach(b=>b.disabled=true);
  const duration=Math.max(1,Math.round((Date.now()-state.questionStartedAt)/1000));

  let data;
  try{
    const rpcPromise=client.rpc('submit_answer_v2',{
      p_question_id:Number(state.current.id),
      p_selected_option:Number(option),
      p_duration_seconds:duration,
      p_session_id:state.session?.coreSessionId||null,
      p_first_selection_seconds:firstSelectionSeconds,
      p_selection_changes:selectionChanges,
      p_hint_count:hintCount
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
    logClientError('questions',error,'submit_answer');
    state.answered=false;
    if(state.current)startQuestionBehaviorMonitor(state.current,behaviorSnapshot);
    $$('.q-option',$('#questionCard')).forEach(b=>b.disabled=false);
    if(confirm){confirm.disabled=false;confirm.textContent=`Confirmar ${'ABCDE'[option]}`;}
    if(handlePlanLimitError(error))return;
    const msg=error?.message==='timeout_submit_answer'
      ? 'A correção demorou demais. Tente confirmar novamente.'
      : 'Não foi possível corrigir a resposta. Tente novamente.';
    toast(msg,'error');
    return;
  }

  const reaction=buildImmediateNexoReaction(state.current,data,duration);
  const game=data.gamification||{};
  const previousJourneyLevel=Number(state.journey?.profile?.level||0);
  state.lastAnswer={...data,duration_seconds:duration,first_selection_seconds:firstSelectionSeconds,selection_changes:selectionChanges,hint_count:hintCount,nexo_reaction:reaction};
  const correct=Number(data.correct_option);
  $$('.q-option',$('#questionCard')).forEach((b,i)=>{
    b.classList.remove('selected');
    if(i===correct)b.classList.add('correct');
    else if(i===option)b.classList.add('wrong');
  });
  $('.confirm-answer-wrap')?.remove();
  const detail=buildAnswerExplanation(state.current,data,option);
  const shortcut=getQuestionShortcut(state.current);
  const box=document.createElement('div');
  box.className='answer-panel '+(data.correct?'':'wrong');
  box.innerHTML=`
    <div class="answer-hero ${data.correct?'is-correct':'is-wrong'}">
      <div class="answer-professor" data-reaction-mood="${reaction.mood}">
        <img src="${reaction.image}" data-nexo-family="bust" alt="Professor Nexo">
        <div>
          <span>PROFESSOR NEXO</span>
          <h4>${esc(reaction.title)}</h4>
          <p>${esc(reaction.text)}</p>
          <div class="nexo-reaction-meta">
            <small>${esc(reaction.badge)}</small>
            <small>⏱ ${formatAnswerReactionTime(duration)}</small>
            ${reaction.difficulty?'<small>NÍVEL '+reaction.difficulty+'</small>':''}
          </div>
        </div>
      </div>
      <div class="answer-verdict">
        <span class="answer-letter">${data.correct?'✓':'×'}</span>
        <div><small>${data.correct?'ACERTO':'PONTO DE REVISÃO'}</small><b>Gabarito ${'ABCDE'[correct]}</b></div>
      </div>
    </div>

    <div class="answer-reward-strip">
      <span><b>+${Number(game.xp_gained||0)}</b><small>XP</small></span>
      <span><b>+${Number(game.coins_gained||0)}</b><small>N-Coins</small></span>
      <span><b>+${Number(game.points_gained||0)}</b><small>Pontos NEXO</small></span>
      <span><b>NV. ${Number(game.level||state.journey?.profile?.level||1)}</b><small>${esc(game.title||'Jornada')}</small></span>
      ${Number(game.claimable_missions||0)>0?'<button id="answerJourneyOpen">✦ '+Number(game.claimable_missions)+' recompensa'+(Number(game.claimable_missions)>1?'s':'')+' pronta'+(Number(game.claimable_missions)>1?'s':'')+'</button>':''}
    </div>

    <div class="answer-learning-grid">
      <article class="learning-block primary-learning">
        <span>01 · ENTENDA</span>
        <h5>Por que essa é a resposta?</h5>
        <p>${esc(detail.summary)}</p>
      </article>
      <article class="learning-block">
        <span>02 · SUA ESCOLHA</span>
        <h5>${data.correct?'O que você percebeu corretamente':'Onde sua alternativa perde força'}</h5>
        <p>${esc(detail.whyWrong)}</p>
      </article>
      <article class="learning-block">
        <span>03 · MÉTODO</span>
        <h5>Como pensar em questões parecidas</h5>
        <p>${esc(detail.method)}</p>
      </article>
    </div>

    <div id="hintBox" class="hint-box hidden"></div>

    <div class="post-answer-actions premium-actions">
      ${shortcut?'<button id="showHint">🐾 Ver macete</button>':''}
      <button id="askNexoAboutQuestion">✦ Perguntar ao Nexo</button>
      <button id="reviewQuestionTopic">↻ Treinar este tema</button>
      <button id="openComments">💬 Comentários</button>
      <button id="nextAfterAnswer" class="next-action">Próxima questão →</button>
    </div>`
  $('#questionCard').appendChild(box);
  $('#answerJourneyOpen')?.addEventListener('click',()=>{
    openPage('ranking');
    setJourneyTab('missions');
  });
  if(previousJourneyLevel&&Number(game.level||0)>previousJourneyLevel){
    toast('Nível '+game.level+' alcançado! Nova etapa da NEXO Jornada desbloqueada.');
  }
  if(shortcut){
    $('#showHint').onclick=()=>{
      const h=$('#hintBox');
      h.classList.toggle('hidden');
      h.innerHTML=`<h4>🐾 Macete do Professor Nexo</h4><p>${esc(shortcut)}</p>`;
    };
  }
  $('#askNexoAboutQuestion').onclick=()=>{
    $('#niaPanel').classList.remove('hidden');
    setNexoMood(reaction.mood);
    askNia(data.correct
      ? (reaction.mood==='pensativo'
          ? 'Eu acertei, mas demorei nessa questão. Como eu faria mais rápido sem perder segurança?'
          : 'Por que eu acertei essa questão? Me ajuda a consolidar o raciocínio.')
      : (reaction.mood==='pensativo'
          ? 'Essa questão foi difícil e eu errei. Me ajuda a destravar o raciocínio passo a passo.'
          : 'Por que eu errei essa questão? Me ajuda a entender sem só repetir o gabarito.'));
  };
  $('#reviewQuestionTopic').onclick=async()=>{
    const q=state.current;
    if(!q)return;
    await startStudySession({
      mode:'review',
      area:q.area||'',
      subject:q.subject||'',
      topic:q.topic||'',
      difficulty:'',
      visualOnly:false,
      size:5
    });
  };
  $('#openComments').onclick=()=>openQuestionComments(state.current.id);
  $('#nextAfterAnswer').onclick=()=>nextQuestion();
  $('.question-mobile-actions')?.classList.add('answered');
  setNexoMood(reaction.mood);
  Promise.all([loadDashboard(),loadNexoCore(),loadRecentAttempts(),loadNexoJourney({silent:true})]).catch(err=>console.error('refresh after answer',err));
}

async function nextQuestion() {
  if(!state.session)return;
  state.session.index++;
  await showCurrentQuestion();
  window.scrollTo({top:Math.max(0,$('#studyWorkspace').offsetTop-75),behavior:'smooth'});
}
$('#skipQuestion').onclick=()=>nextQuestion();


function formatStudyDuration(seconds){
  const value=Math.max(0,Number(seconds||0));
  const minutes=Math.floor(value/60);
  const secs=value%60;
  if(minutes>=60){
    const hours=Math.floor(minutes/60);
    const rest=minutes%60;
    return hours+'h '+String(rest).padStart(2,'0')+'min';
  }
  return minutes?minutes+'min '+String(secs).padStart(2,'0')+'s':secs+'s';
}

async function getNexoSessionReport(sessionId){
  if(!sessionId)return null;
  try{
    const {data,error}=await client.rpc('get_nexo_session_report',{p_session_id:sessionId});
    if(error)throw error;
    return data||null;
  }catch(err){
    console.error('session report',err);
    logClientError('simulation',err,'session_report');
    return null;
  }
}

function simulationPaceCopy(report){
  const avg=Number(report?.avg_seconds||0);
  if(!report?.attempts)return 'Ainda não há respostas suficientes para avaliar seu ritmo.';
  if(avg<=90)return 'Ritmo rápido. Agora confirme se a velocidade não está custando leitura ou precisão.';
  if(avg<=150)return 'Ritmo equilibrado para uma sessão de treino.';
  if(avg<=210)return 'Seu tempo médio merece atenção. Tente reconhecer antes quais questões devem ser puladas.';
  return 'Você está investindo muito tempo por questão. O próximo treino deve priorizar decisão e abandono estratégico.';
}

function renderSimulationReport(finished,report){
  state.lastSimulationReport=report||null;
  const attempts=Number(report?.attempts||0);
  const correct=Number(report?.correct||0);
  const accuracy=Number(report?.accuracy||0);
  const avg=Number(report?.avg_seconds||0);
  const total=Number(report?.total_seconds||0);
  const firstChoice=Number(report?.avg_first_choice_seconds||0);
  const changes=Number(report?.selection_changes||0);
  const hints=Number(report?.hints_used||0);
  const learningSignal=report?.learning_signal||'balanced';
  const weak=Array.isArray(report?.weak_topics)?report.weak_topics:[];
  const subjects=Array.isArray(report?.by_subject)?report.by_subject:[];
  const mood=accuracy>=75?'confiante':accuracy>=55?'serio':'acolhedor';
  const title=accuracy>=80?'Ótima prova. Agora é lapidar.':accuracy>=65?'Bom desempenho, com pontos claros de evolução.':accuracy>=45?'Seu simulado mostrou exatamente onde atacar.':'Esse resultado é um mapa, não uma sentença.';

  $('#questionCard').innerHTML=`
    <div class="simulation-report">
      <section class="sim-report-hero">
        <div class="sim-report-professor">
          <img src="${nexoBustForMood(mood)}" alt="Professor Nexo">
          <div><span>RELATÓRIO PÓS-PROVA · PROFESSOR NEXO</span><h3>${title}</h3><p>${simulationPaceCopy(report)}</p></div>
        </div>
        <div class="sim-report-score"><small>APROVEITAMENTO</small><b>${accuracy}%</b><span>${correct}/${attempts} acertos</span></div>
      </section>

      <section class="sim-report-metrics">
        <article><span>⏱</span><div><b>${formatStudyDuration(total)}</b><small>tempo respondendo</small></div></article>
        <article><span>≈</span><div><b>${formatStudyDuration(avg)}</b><small>média por questão</small></div></article>
        <article><span>!</span><div><b>${Number(report?.slow_questions||0)}</b><small>questões acima de 3 min</small></div></article>
        <article><span>⚡</span><div><b>${Number(report?.fast_correct||0)}</b><small>acertos em até 75s</small></div></article>
        <article><span>◌</span><div><b>${firstChoice?formatStudyDuration(firstChoice):'—'}</b><small>até a 1ª escolha</small></div></article>
        <article><span>↔</span><div><b>${changes}</b><small>trocas de alternativa · ${hints} pistas</small></div></article>
      </section>
      <section class="sim-behavior-signal" data-signal="${esc(learningSignal)}">
        <span>LEITURA DE COMPORTAMENTO</span>
        <b>${learningSignal==='hesitation'?'Você conhece parte do conteúdo, mas hesita para decidir.':learningSignal==='content'?'O principal gargalo desta sessão foi conteúdo.':learningSignal==='guided'?'Você ainda depende bastante de pistas para avançar.':learningSignal==='calibrating'?'Ainda preciso de mais respostas para separar conteúdo de hesitação.':'Seu padrão de decisão ficou relativamente equilibrado.'}</b>
        <small>O NEXO Core usa tempo até a primeira escolha, trocas de alternativa e uso de pistas junto com seus acertos.</small>
      </section>

      <section class="sim-report-grid">
        <article class="sim-report-panel">
          <div class="panel-title"><b>Leitura por matéria</b><small>acertos no simulado</small></div>
          <div class="sim-subject-list">
            ${subjects.length?subjects.map(item=>`
              <div class="sim-subject-row">
                <span>${esc(item.subject||'Geral')}</span>
                <div><i style="width:${Number(item.accuracy||0)}%"></i></div>
                <b>${Number(item.accuracy||0)}%</b>
              </div>`).join(''):'<p class="sim-empty">Sem dados suficientes nesta sessão.</p>'}
          </div>
        </article>
        <article class="sim-report-panel">
          <div class="panel-title"><b>Onde você perdeu mais pontos</b><small>prioridade de revisão</small></div>
          <div class="sim-weak-list">
            ${weak.length?weak.slice(0,4).map((item,index)=>`
              <button data-sim-review="${esc(item.topic||'')}" data-sim-review-subject="${esc(item.subject||'')}">
                <span>${String(index+1).padStart(2,'0')}</span>
                <div><b>${esc(item.topic||'Tema')}</b><small>${esc(item.subject||'')} · ${Number(item.error_rate||0)}% de erro</small></div>
                <i>→</i>
              </button>`).join(''):'<p class="sim-empty">Nenhum tema crítico apareceu nesta sessão.</p>'}
          </div>
        </article>
      </section>

      <section class="sim-report-mission">
        <div class="sim-mission-copy">
          <span>✦ PRÓXIMA MISSÃO</span>
          <h4>${weak[0]?'Revisar '+esc(weak[0].topic):'Consolidar o desempenho'}</h4>
          <p>${weak[0]?'Comece pelo tema com maior taxa de erro e faça uma sessão curta antes de repetir outro simulado.':'Seu resultado ficou equilibrado. Faça uma revisão curta e avance para um novo bloco de prova.'}</p>
        </div>
        <div class="sim-mission-actions">
          <button id="askNexoSimulation" class="outline-btn">Perguntar ao Professor Nexo</button>
          <button id="simulationNextMission" class="primary-btn">Treinar recomendação</button>
        </div>
      </section>

      <div class="sim-report-footer">
        <button id="newSameSession" class="outline-btn">Refazer formato</button>
        <button id="viewPerformanceAfterSim" class="outline-btn">Ver desempenho completo</button>
        <button id="backSetup" class="ghost-btn">Trocar conteúdo</button>
      </div>
    </div>`;

  $$('[data-sim-review]').forEach(btn=>btn.onclick=()=>startStudySession({
    mode:'review',
    area:finished.area||'',
    subject:btn.dataset.simReviewSubject||'',
    topic:btn.dataset.simReview||'',
    difficulty:'',
    visualOnly:false,
    size:5
  }));

  $('#askNexoSimulation').onclick=()=>{
    $('#niaPanel').classList.remove('hidden');
    setNexoMood(mood);
    askNia('Analise meu último simulado e me diga o que devo fazer agora.');
  };
  $('#simulationNextMission').onclick=()=>weak[0]
    ? startStudySession({
        mode:'review',
        area:finished.area||'',
        subject:weak[0].subject||'',
        topic:weak[0].topic||'',
        difficulty:'',
        visualOnly:false,
        size:6
      })
    : startCoreRecommendation();
  $('#newSameSession').onclick=()=>startStudySession({
    mode:'simulado',
    area:finished.area||'',
    subject:finished.subject||'',
    topic:finished.topic||'',
    difficulty:finished.difficulty||'',
    visualOnly:false,
    size:Number(finished.size||20)
  });
  $('#viewPerformanceAfterSim').onclick=()=>openPage('desempenho');
  $('#backSetup').onclick=()=>resetSessionUI();
  setNexoMood(mood);
}

async function finishSession() {
  stopQuestionBehaviorMonitor();
  const finished={...(state.session||{})};
  const reportId=finished.coreSessionId||null;
  if(state.session?.coreSessionId) await closeNexoSession('completed',state.session);
  $('#sessionProgress').style.width='100%';
  $('#nextQuestionBottom').classList.add('hidden');

  if(finished.mode==='simulado'){
    $('#questionCard').innerHTML='<div class="question-loading"><div class="pulse-block"></div><div class="pulse-line"></div><div class="pulse-line short"></div></div>';
    const report=await getNexoSessionReport(reportId);
    renderSimulationReport(finished,report);
    loadNexoCore().catch(err=>console.error('core after simulation',err));
    return;
  }

  $('#questionCard').innerHTML=`<div class="empty-state session-finish-state"><img src="${NEXO_MEDIA_IMAGES.bustConfiante}" alt="Professor Nexo"><span>SESSÃO CONCLUÍDA</span><h3>Mais dados, uma recomendação melhor.</h3><p>Você terminou ${finished.size||0} questões. O NEXO Core já incorporou esse resultado ao seu perfil.</p><div><button id="newSameSession" class="primary-btn">Nova sessão igual</button><button id="backSetup" class="outline-btn">Trocar conteúdo</button></div></div>`;
  $('#newSameSession').onclick=()=>startStudySession({
    mode:finished.mode||'manual',
    area:finished.area||'',
    subject:finished.subject||'',
    topic:finished.topic||'',
    difficulty:finished.difficulty||'',
    visualOnly:Boolean(finished.visualOnly),
    size:Number(finished.size||10)
  });
  $('#backSetup').onclick=()=>resetSessionUI();
  loadNexoCore().catch(err=>console.error('core after session',err));
}

$$('[data-sim-area], [data-sim-mode]').forEach(b=>b.onclick=async()=>{
  const mode=b.dataset.simMode||'area';
  if(mode==='adaptive'){
    if(!state.core)await loadNexoCore();
    const rec=state.core?.recommended_action;
    openPage('questoes');
    await startStudySession({
      mode:'simulado',
      area:rec?.area||'',
      subject:rec?.subject||'',
      topic:rec?.topic||'',
      difficulty:'',
      visualOnly:false,
      size:20
    });
    if(state.session){
      $('#sessionAreaBadge').textContent='Simulado Core';
      $('#sessionTitle').textContent=rec?.topic||'Simulado adaptativo';
      $('#sessionSubtitle').textContent=rec?.reason||'Prova montada para calibrar seu perfil atual.';
    }
    return;
  }

  if(mode==='mixed'){
    openPage('questoes');
    await startStudySession({mode:'simulado',area:'',subject:'',difficulty:'',visualOnly:false,size:30});
    if(state.session){
      $('#sessionAreaBadge').textContent='Misto ENEM';
      $('#sessionTitle').textContent='Simulado misto';
      $('#sessionSubtitle').textContent='30 questões distribuídas entre as áreas disponíveis.';
    }
    return;
  }

  openPage('questoes');
  setSelectedArea(b.dataset.simArea);
  await startStudySession({mode:'simulado',area:b.dataset.simArea,subject:'',difficulty:'',visualOnly:false,size:20});
});

function renderMasteryMap(){
  const el=$('#nexoMasteryMap'); if(!el)return;
  const d=state.dashboard||{}, core=state.core||{};
  const map=new Map((d.by_area||[]).map(x=>[x.area,x]));
  const weak=core.weak_skills||[];
  const areas=['Linguagens','Ciências Humanas','Ciências da Natureza','Matemática'];
  el.innerHTML=areas.map(area=>{
    const x=map.get(area)||{}, attempts=Number(x.attempts||0), mastery=clamp(Math.round(Number(x.accuracy||0)),0,100);
    const priorities=weak.filter(w=>(w.area||'')===area).slice(0,2);
    const status=attempts<5?'CALIBRANDO':mastery>=75?'FORTE':mastery>=55?'EM EVOLUÇÃO':'PRIORIDADE';
    return '<article class="mastery-area '+(mastery<55&&attempts>=5?'priority':'')+'"><header><span>'+esc(area)+'</span><b>'+status+'</b></header><div class="mastery-score"><strong>'+mastery+'%</strong><small>domínio estimado</small></div><div class="mastery-track"><i style="width:'+mastery+'%"></i></div><p>'+(priorities.length?'Focos: '+priorities.map(p=>esc(p.topic)).join(' · '):attempts+' questões analisadas')+'</p><button data-mastery-area="'+esc(area)+'">Treinar área →</button></article>';
  }).join('');
  $('[data-mastery-area]',el).forEach(btn=>btn.onclick=async()=>{openPage('questoes');setSelectedArea(btn.dataset.masteryArea);await startStudySession({mode:'adaptive',area:btn.dataset.masteryArea,subject:'',topic:'',difficulty:'',visualOnly:false,size:10});});
}
function renderFocusRoadmap(){
  const el=$('#focusRoadmap'); if(!el)return;
  const weak=state.core?.weak_skills||[];
  const top=weak.slice(0,3);
  const label=$('#focusRoadmapLabel'); if(label)label.textContent=top.length?'atualizada pelo NEXO Core':'calibrando';
  el.innerHTML=top.length?top.map((x,i)=>{
    const mastery=Math.round(Number(x.mastery??x.accuracy??0));
    const stage=mastery<45?'RECUPERAR':mastery<65?'CONSOLIDAR':'MANTER';
    return '<article><span>0'+(i+1)+'</span><div><small>'+stage+'</small><b>'+esc(x.topic||x.subject||x.area||'Foco')+'</b><p>'+mastery+'% de domínio · '+Math.round(Number(x.priority??100-mastery))+'% prioridade</p></div></article>';
  }).join(''):'<div class="journey-empty">Complete algumas questões para o Core construir sua rota de evolução.</div>';
}
async function loadErrorNotebook(){
  const el=$('#errorNotebook'); if(!el)return [];
  const {data,error}=await client.from('question_attempts')
    .select('question_id,is_correct,created_at,question:questions(id,area,subject,topic,source_year,source_question_number)')
    .eq('is_correct',false)
    .order('created_at',{ascending:false})
    .limit(80);
  if(error){
    console.error('error notebook',error);
    el.innerHTML='<p style="color:var(--muted)">Não foi possível carregar o Caderno de Erros agora.</p>';
    return [];
  }
  const seen=new Set(),rows=[];
  for(const item of data||[]){
    const id=Number(item.question_id||item.question?.id||0);
    if(!id||seen.has(id))continue;
    seen.add(id); rows.push(item);
    if(rows.length>=8)break;
  }
  state.errorReviewIds=rows.map(x=>Number(x.question_id||x.question?.id)).filter(Boolean);
  el.innerHTML=rows.length?rows.map((item,index)=>{
    const q=item.question||{};
    return '<article class="error-note-row"><span class="error-note-index">'+String(index+1).padStart(2,'0')+'</span><div><b>'+esc(q.topic||q.subject||'Questão ENEM')+'</b><small>'+esc(q.subject||q.area||'')+(q.source_year?' · ENEM '+esc(q.source_year):'')+(q.source_question_number?' · Q'+esc(q.source_question_number):'')+'</small></div><div class="error-note-actions"><button data-error-open="'+Number(item.question_id||q.id)+'">Refazer</button><button data-error-topic="'+esc(q.topic||'')+'" data-error-area="'+esc(q.area||'')+'" data-error-subject="'+esc(q.subject||'')+'">Treinar tema</button></div></article>';
  }).join(''):'<div class="journey-empty">Nenhum erro recente por aqui. Continue treinando para alimentar sua revisão inteligente.</div>';
  $('[data-error-open]',el).forEach(btn=>btn.onclick=()=>openSingleQuestion(Number(btn.dataset.errorOpen)));
  $('[data-error-topic]',el).forEach(btn=>btn.onclick=async()=>{
    openPage('questoes');
    await startStudySession({mode:'review_topic',area:btn.dataset.errorArea||'',subject:btn.dataset.errorSubject||'',topic:btn.dataset.errorTopic||'',difficulty:'',visualOnly:false,size:6});
    if(state.session){
      $('#sessionAreaBadge').textContent='Revisão NEXO';
      $('#sessionTitle').textContent=btn.dataset.errorTopic||btn.dataset.errorSubject||'Revisão direcionada';
      $('#sessionSubtitle').textContent='Sessão curta para consolidar um conteúdo em que você errou recentemente.';
    }
  });
  return state.errorReviewIds;
}

async function startErrorReview(){
  try{
    if(!state.membership)await loadNexoMembership({silent:true});
    if(planUsageReached('questions'))return openNexoPlans('Você atingiu as 10 questões disponíveis hoje no plano Free.');
    const ids=(state.errorReviewIds?.length?state.errorReviewIds:await loadErrorNotebook()).slice(0,5);
    if(!ids.length)return toast('Ainda não há erros recentes para revisar.');
    const fields='id,area,subject,topic,difficulty,source_year,source_exam,source_question_number,source_reference,base_text,prompt,options,media_type,media_path,source_pdf_url,source_page,media_crop';
    const {data,error}=await client.from('questions').select(fields).in('id',ids);
    if(error)throw error;
    const byId=new Map((data||[]).map(q=>[Number(q.id),q]));
    const queue=ids.map(id=>byId.get(Number(id))).filter(Boolean);
    if(!queue.length)throw new Error('Não encontrei as questões da revisão.');
    if(state.session?.coreSessionId)await closeNexoSession('abandoned',state.session);
    const coreSessionId=await beginNexoSession({mode:'review'},queue.length);
    openPage('questoes');
    state.session={mode:'review',queue,index:0,size:queue.length,reviewMode:true,coreSessionId,correctStreak:0,wrongStreak:0,answeredCount:0,maxHints:2,coachTimeSeconds:55,coachLongSeconds:105};
    $('#sessionSetup').classList.add('hidden');$('#studyWorkspace').classList.remove('hidden');
    $('#sessionAreaBadge').textContent='Revisão NEXO';
    $('#sessionTitle').textContent='Caderno de Erros';
    $('#sessionSubtitle').textContent='Segunda tentativa: releia o comando, refaça o raciocínio e compare sua decisão com a anterior.';
    await showCurrentQuestion();
  }catch(err){
    console.error('error review',err);logClientError('error_review',err,'review_build');
    if(!handlePlanLimitError(err))toast('Não foi possível montar sua revisão agora.','error');
  }
}

async function renderPerformance() {
  await Promise.all([loadDashboard(),loadNexoCore(),loadErrorNotebook()]);
  const d=state.dashboard||{attempts:0,correct:0,accuracy:0,by_area:[]};
  const core=state.core||{};
  const momentum=core.momentum||{};
  const rec=core.recommended_action||null;
  const overall=core.overall||{};

  const {data:sessions,error:sessionError}=await client.from('nexo_study_sessions')
    .select('id,mode,area,subject,topic,planned_count,answered_count,correct_count,total_duration_seconds,status,started_at,ended_at')
    .order('started_at',{ascending:false})
    .limit(6);
  if(sessionError)logClientError('performance',sessionError,'session_history');

  $('#statsGrid').innerHTML=[
    ['Questões respondidas',d.attempts||0,'histórico total'],
    ['Aproveitamento',(d.accuracy||0)+'%','média acumulada'],
    ['Tempo médio',formatStudyDuration(overall.avg_seconds||0),'por questão'],
    ['Dias ativos',Number(momentum.study_days_7d||0)+'/7','últimos 7 dias']
  ].map((item,index)=>`<article class="stat-card performance-stat"><span>${String(index+1).padStart(2,'0')}</span><small>${item[0]}</small><b>${item[1]}</b><i>${item[2]}</i></article>`).join('');

  const heroTitle=$('#performanceCoreTitle');
  const heroText=$('#performanceCoreText');
  const heroMetric=$('#performanceCoreMetric');
  const heroMascot=$('#performanceCoreMascot');
  if(rec){
    heroTitle.textContent='Seu maior ganho agora está em '+(rec.topic||rec.subject||rec.area)+'.';
    heroText.textContent=rec.reason||'O NEXO Core encontrou um conteúdo com boa margem de evolução.';
    heroMetric.textContent=Math.round(Number(rec.mastery||0))+'%';
    setNexoImage(heroMascot,nexoBustForMood(Number(rec.priority||0)>=65?'pensativo':'confiante'));
  }else{
    heroTitle.textContent='Ainda estou calibrando seu perfil.';
    heroText.textContent='Faça algumas sessões para eu cruzar acertos, erros, tempo e consistência.';
    heroMetric.textContent='—';
    setNexoImage(heroMascot,NEXO_MEDIA_IMAGES.bustPensativo);
  }
  $('#performanceCoreStart').onclick=()=>rec?startCoreRecommendation():(openPage('questoes'),resetSessionUI());
  if($('#startErrorReview'))$('#startErrorReview').onclick=startErrorReview;

  const map=new Map((d.by_area||[]).map(x=>[x.area,x]));
  const areas=['Linguagens','Ciências Humanas','Ciências da Natureza','Matemática'];
  renderMasteryMap();
  $('#masteryMapTrain').onclick=()=>rec?startCoreRecommendation():(openPage('questoes'),resetSessionUI());
  $('#areaPerformance').innerHTML=areas.map(area=>{
    const x=map.get(area)||{accuracy:0,attempts:0};
    return `<div class="perf-row"><span>${area}<small>${Number(x.attempts||0)} questões</small></span><div class="perf-track"><i style="width:${Number(x.accuracy||0)}%"></i></div><b>${Number(x.accuracy||0)}%</b></div>`;
  }).join('');

  const attempts7=Number(momentum.attempts_7d||0);
  const accuracy7=Number(momentum.accuracy_7d||0);
  const days7=Number(momentum.study_days_7d||0);
  $('#performanceMomentum').innerHTML=`
    <div class="momentum-ring" style="--momentum:${Math.min(100,Math.round(days7/7*100))}%"><b>${days7}</b><small>dias ativos</small></div>
    <div class="momentum-copy">
      <span><b>${attempts7}</b><small>questões em 7 dias</small></span>
      <span><b>${accuracy7}%</b><small>aproveitamento recente</small></span>
      <p>${days7>=5?'Ótima constância. Agora proteja a qualidade das correções.':days7>=3?'Seu ritmo está ganhando consistência. Tente manter contato com o estudo nos próximos dias.':'A maior oportunidade agora é constância: sessões curtas e frequentes tendem a funcionar melhor que picos isolados.'}</p>
    </div>`;

  const {data:recent,error:recentError}=await client.from('question_attempts')
    .select('is_correct,duration_seconds,created_at,question:questions(subject,topic)')
    .order('created_at',{ascending:false}).limit(12);
  if(recentError)logClientError('performance',recentError,'recent_attempts');
  $('#performanceTimeline').innerHTML=(recent||[]).map(a=>`<div class="timeline-row"><span class="${a.is_correct?'ok':'bad'}">${a.is_correct?'✓':'×'}</span><div><b>${esc(a.question?.subject||'Questão')}</b><small>${esc(a.question?.topic||'')} · ${formatStudyDuration(a.duration_seconds||0)}</small></div><small>${new Date(a.created_at).toLocaleDateString('pt-BR')}</small></div>`).join('')||'<p style="color:var(--muted)">Ainda não há respostas registradas.</p>';

  $('#sessionHistory').innerHTML=(sessions||[]).map(item=>{
    const answered=Number(item.answered_count||0),correct=Number(item.correct_count||0);
    const accuracy=answered?Math.round(correct*100/answered):0;
    const label=item.mode==='simulado'?'Simulado':item.mode==='core'?'NEXO Core':item.mode==='adaptive'?'Adaptativo':'Sessão';
    return `<button class="session-history-row" data-session-history="${item.id}">
      <span class="session-type">${label}</span>
      <div><b>${esc(item.topic||item.subject||item.area||'Treino geral')}</b><small>${answered} respondida(s) · ${formatStudyDuration(item.total_duration_seconds||0)}</small></div>
      <strong>${accuracy}%</strong>
    </button>`;
  }).join('')||'<p style="color:var(--muted)">Suas sessões aparecerão aqui.</p>';

  $$('[data-session-history]').forEach(btn=>btn.onclick=async()=>{
    const report=await getNexoSessionReport(btn.dataset.sessionHistory);
    if(!report)return toast('Não encontrei detalhes suficientes dessa sessão.','error');
    state.lastSimulationReport=report;
    $('#niaPanel').classList.remove('hidden');
    setNexoMood(Number(report.accuracy||0)>=70?'confiante':'pensativo');
    addNiaMessage('Essa sessão teve '+Number(report.accuracy||0)+'% de aproveitamento, com média de '+formatStudyDuration(report.avg_seconds||0)+' por questão. Se quiser, me pergunte “o que revisar desta sessão?”.','bot');
  });
}

async function renderFocus() {
  await Promise.all([loadDashboard(),loadNexoCore()]);
  const coreWeak=state.core?.weak_skills||[];
  const fallback=(state.dashboard?.weak_topics||[]).map(x=>({
    topic:x.topic,subject:x.subject,attempts:x.attempts,
    accuracy:100-Number(x.error_rate||0),
    priority:Number(x.error_rate||0),
    mastery:100-Number(x.error_rate||0)
  }));
  const weak=coreWeak.length?coreWeak:fallback;

  renderFocusRoadmap();
  $('#focusGrid').innerHTML=weak.length?weak.map((x,index)=>{
    const mastery=Math.round(Number(x.mastery??x.accuracy??0));
    const priority=Math.round(Number(x.priority??(100-mastery)));
    const recommended=index===0;
    return `<article class="focus-card ${recommended?'core-focus':''}">
      <header><b>${esc(x.topic)}</b><span class="risk">${recommended?'NEXO recomenda':priority+'% prioridade'}</span></header>
      <p>${esc(x.subject||x.area||'Conteúdo')} · ${Number(x.attempts||0)} resposta(s)</p>
      <div class="focus-score">${mastery}%</div>
      <small style="display:block;color:var(--muted);margin:-3px 0 10px">domínio estimado</small>
      <button class="outline-btn small" data-focus="${esc(x.topic)}" data-focus-area="${esc(x.area||'')}" data-focus-subject="${esc(x.subject||'')}">Treinar este tema →</button>
    </article>`;
  }).join(''):'<article class="focus-card"><h3>O NEXO Core ainda está calibrando</h3><p>Resolva algumas questões para gerar seu plano personalizado.</p></article>';

  $$('[data-focus]').forEach(b=>b.onclick=()=>{
    openPage('questoes');
    startStudySession({
      mode:'core',
      topic:b.dataset.focus,
      area:b.dataset.focusArea||'',
      subject:b.dataset.focusSubject||'',
      size:8,
      difficulty:'',
      visualOnly:false
    });
  });
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
  if(blockMaintenance('essays'))return;
  if(!state.membership)await loadNexoMembership({silent:true});
  if(planUsageReached('essay'))return openNexoPlans('Sua correção gratuita de redação deste mês já foi usada.');
  const text=$('#essayText').value.trim();
  if(text.length<250)return toast('Escreva pelo menos 250 caracteres para receber uma análise.','error');
  const analyzeBtn=$('#analyzeEssay');
  analyzeBtn.disabled=true;
  analyzeBtn.textContent='Professor Nexo está lendo...';
  const loader=$('#essayLoader');loader.classList.remove('hidden');
  const msgs=['Avaliando estrutura e repertório.','Analisando coesão e progressão textual.','Verificando argumentação.','Estimando as cinco competências.','Salvando seu histórico.'];let i=0;
  const timer=setInterval(()=>{$('#loaderText').textContent=msgs[++i%msgs.length]},520);
  await sleep(2300);
  const scores=essayScores(text),total=scores.reduce((a,b)=>a+b,0);
  const t=getEssayThemeData();
  if($('#essayTheme').value==='custom' && !$('#customEssayTheme').value.trim()){
    clearInterval(timer);loader.classList.add('hidden');analyzeBtn.disabled=false;analyzeBtn.textContent='Analisar e salvar';
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
  clearInterval(timer);loader.classList.add('hidden');analyzeBtn.disabled=false;analyzeBtn.textContent='Analisar e salvar';
  if(error){
    console.error(error);logClientError('essay',error,'essay_save');
    if(handlePlanLimitError(error))return;
    toast('A análise foi feita, mas não consegui salvar o histórico.','error');
  }else{
    loadNexoMembership({silent:true});
  }
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
  const shortComps=['C1','C2','C3','C4','C5'];
  const weak=scores.map((score,index)=>({score,index})).sort((a,b)=>a.score-b.score)[0].index;
  const best=scores.map((score,index)=>({score,index})).sort((a,b)=>b.score-a.score)[0].index;
  const review=buildDetailedEssayReview(text,scores);
  const tips=[
    'Revise concordância, regência, pontuação e escolha vocabular. Procure períodos longos e veja se podem ser divididos.',
    'Faça cada parágrafo conversar diretamente com o tema. Repertório bom precisa ajudar a defender a tese, não apenas aparecer no texto.',
    'Transforme afirmações em raciocínio: apresente a ideia, explique a causa, mostre consequência e conecte tudo à tese.',
    'Use conectivos variados e retomadas claras. Coesão é deixar visível a relação entre as ideias, não repetir “portanto”.',
    'Na intervenção, confira agente, ação, meio/modo, finalidade e detalhamento — sempre respeitando os direitos humanos.'
  ];
  const t=getEssayThemeData();
  const mood=total>=800?'confiante':total>=600?'serio':'acolhedor';
  const scoreLabel=total>=900?'Excelente base':total>=800?'Muito competitivo':total>=700?'Boa construção':total>=600?'Em evolução':'Hora de fortalecer a base';

  $('#essayResult').innerHTML=`
    <div class="essay-correction-shell">
      <section class="essay-score-hero">
        <div class="essay-score-copy">
          <span class="eyebrow">CORREÇÃO ORIENTATIVA · PROFESSOR NEXO</span>
          <h3>${scoreLabel}</h3>
          <p>Seu texto sobre “${esc(t.title)}” já foi transformado em um plano de revisão. A prioridade agora é a ${shortComps[weak]}.</p>
          <div class="essay-meta-chips">
            <span>${review.words} palavras</span>
            <span>${review.paras} parágrafo(s)</span>
            <span>${review.connectors} conectivo(s)</span>
          </div>
        </div>
        <div class="essay-score-side">
          <img src="${NEXO_MOOD_IMAGES[mood]||NEXO_MOOD_IMAGES.serio}" alt="Professor Nexo">
          <div class="score-orb" style="--score:${total/10}%"><small>NOTA ESTIMADA</small><b>${total}</b><span>/1000</span></div>
        </div>
      </section>

      <section class="essay-competency-grid">
        ${scores.map((score,index)=>{
          const status=index===weak?'Prioridade':index===best?'Ponto forte':'Em análise';
          return `<article class="essay-comp-card ${index===weak?'is-priority':''} ${index===best?'is-strong':''}">
            <div class="essay-comp-top"><span>${shortComps[index]}</span><small>${status}</small></div>
            <h4>${comps[index]}</h4>
            <div class="essay-comp-score"><b>${score}</b><span>/200</span></div>
            <div class="essay-comp-track"><i style="width:${score/2}%"></i></div>
          </article>`;
        }).join('')}
      </section>

      <section class="essay-priority-card">
        <div class="essay-priority-prof">
          <img src="${NEXO_MEDIA_IMAGES.bustPensativo}" alt="Professor Nexo">
          <div><span>PRÓXIMA MISSÃO</span><h4>Melhorar ${shortComps[weak]} · ${comps[weak]}</h4><p>${esc(tips[weak])}</p></div>
        </div>
        <div class="essay-priority-actions">
          <button id="askNexoEssay" class="outline-btn">Perguntar ao Professor Nexo</button>
          <button id="rewriteEssay" class="primary-btn">Reescrever agora</button>
        </div>
      </section>

      <section class="essay-review-grid">
        <article>
          <span class="review-kicker">LEITURA DO PROFESSOR</span>
          <h4>Visão geral</h4>
          <p>Seu texto apresenta uma estrutura reconhecível de dissertação-argumentativa. O ganho mais rápido vem de trabalhar primeiro ${shortComps[weak]}, sem tentar corrigir tudo ao mesmo tempo.</p>
        </article>
        <article>
          <span class="review-kicker">PONTO FORTE</span>
          <h4>${shortComps[best]} · ${comps[best]}</h4>
          <p>${best===3?'A progressão e os mecanismos de ligação estão entre os aspectos mais fortes desta versão.':best===4?'A proposta de intervenção está entre os elementos mais fortes desta versão.':'Esta competência aparece como seu melhor resultado estimado nesta versão.'}</p>
        </article>
        <article class="essay-structure-card">
          <span class="review-kicker">CHECKLIST DE ESTRUTURA</span>
          <h4>O que eu observei</h4>
          <div class="review-checklist">${review.notes.map(note=>`<span><i>✓</i>${esc(note)}</span>`).join('')}</div>
        </article>
        <article>
          <span class="review-kicker">REESCRITA</span>
          <h4>Plano em 5 passos</h4>
          <ol class="rewrite-steps">
            <li>Escreva sua tese em uma frase.</li>
            <li>Dê uma função clara para cada parágrafo.</li>
            <li>Ligue causa, consequência e repertório aos argumentos.</li>
            <li>Revise conectivos e períodos longos.</li>
            <li>Finalize conferindo a intervenção e a norma-padrão.</li>
          </ol>
        </article>
      </section>

      <footer class="essay-analysis-note">
        <span>i</span>
        <p>Esta é uma análise automática de treino. Ela ajuda a orientar sua revisão, mas não substitui uma correção humana nem a avaliação oficial do ENEM.</p>
      </footer>
    </div>`;

  $('#askNexoEssay').onclick=()=>{
    $('#niaPanel').classList.remove('hidden');
    setNexoMood('pensativo');
    askNia('Como posso melhorar a '+shortComps[weak]+' ('+comps[weak]+') da redação que acabei de escrever?');
  };
  $('#rewriteEssay').onclick=()=>{
    $('#essayText').focus();
    $('#essayText').scrollIntoView({behavior:'smooth',block:'center'});
    toast('Reescreva priorizando '+shortComps[weak]+'. O Professor Nexo mantém essa missão como foco.');
  };

  setNexoMood(mood);
  addNiaMessage('Corrigi sua redação. Sua prioridade agora é '+shortComps[weak]+' — '+comps[weak]+'. Eu organizei a correção em uma missão de reescrita para você não tentar melhorar tudo ao mesmo tempo.','bot');
}

function contentKey(type,id){return String(type)+':'+String(id)}

async function loadContentState(type){
  if(!state.user?.id)return;
  const [progressRes,favoritesRes]=await Promise.all([
    client.from('content_progress').select('content_id,progress_seconds,progress_percent,completed,last_opened_at').eq('user_id',state.user.id).eq('content_type',type),
    client.from('content_favorites').select('content_id').eq('user_id',state.user.id).eq('content_type',type)
  ]);
  if(!progressRes.error){
    for(const row of progressRes.data||[]) state.contentProgress.set(contentKey(type,row.content_id),row);
  }
  if(!favoritesRes.error){
    for(const key of [...state.favorites]) if(key.startsWith(type+':')) state.favorites.delete(key);
    for(const row of favoritesRes.data||[]) state.favorites.add(contentKey(type,row.content_id));
  }
}

function getContentProgress(type,id){
  return state.contentProgress.get(contentKey(type,id))||{progress_seconds:0,progress_percent:0,completed:false};
}

function favoriteContent(type,id){return state.favorites.has(contentKey(type,id))}

async function toggleContentFavorite(type,id){
  if(!state.user?.id)return;
  const key=contentKey(type,id);
  if(state.favorites.has(key)){
    const {error}=await client.from('content_favorites').delete().eq('user_id',state.user.id).eq('content_type',type).eq('content_id',id);
    if(error)return toast('Não foi possível remover dos favoritos.','error');
    state.favorites.delete(key);
  }else{
    const {error}=await client.from('content_favorites').insert({user_id:state.user.id,content_type:type,content_id:id});
    if(error)return toast('Não foi possível favoritar.','error');
    state.favorites.add(key);
  }
  if(type==='video')renderVideos();else renderMaterials();
  updateViewerFavoriteButton();
}

async function saveContentProgress(type,id,{seconds=0,percent=0,completed=false}={}){
  if(!state.user?.id||!id)return;
  const safePercent=Math.max(0,Math.min(100,Number(percent)||0));
  const row={
    user_id:state.user.id,
    content_type:type,
    content_id:Number(id),
    progress_seconds:Math.max(0,Math.floor(Number(seconds)||0)),
    progress_percent:completed?100:Number(safePercent.toFixed(2)),
    completed:Boolean(completed),
    last_opened_at:new Date().toISOString(),
    updated_at:new Date().toISOString()
  };
  const {error}=await client.from('content_progress').upsert(row,{onConflict:'user_id,content_type,content_id'});
  if(error){console.error('content progress',error);return false}
  state.contentProgress.set(contentKey(type,id),row);
  return true;
}

function cloudinaryVideoPoster(url){
  if(!url||!url.includes('/video/upload/'))return '';
  try{
    const withFrame=url.replace('/video/upload/','/video/upload/so_1,q_auto,f_jpg/');
    return withFrame.replace(/\.[a-zA-Z0-9]+(?:\?.*)?$/,'.jpg');
  }catch(_){return ''}
}

function externalEmbedUrl(url=''){
  try{
    const u=new URL(url);
    if(u.hostname.includes('youtube.com')){
      const id=u.searchParams.get('v');
      if(id)return 'https://www.youtube.com/embed/'+encodeURIComponent(id);
      const m=u.pathname.match(/\/shorts\/([^/]+)/);
      if(m)return 'https://www.youtube.com/embed/'+encodeURIComponent(m[1]);
    }
    if(u.hostname==='youtu.be'){
      const id=u.pathname.split('/').filter(Boolean)[0];
      if(id)return 'https://www.youtube.com/embed/'+encodeURIComponent(id);
    }
    if(u.hostname.includes('vimeo.com')){
      const id=u.pathname.split('/').filter(Boolean).find(x=>/^\d+$/.test(x));
      if(id)return 'https://player.vimeo.com/video/'+id;
    }
  }catch(_){}
  return '';
}

function contentMatchesCore(item){
  const rec=state.core?.recommended_action;
  if(!rec||!item)return false;
  const sameTopic=rec.topic&&item.topic&&String(rec.topic).toLowerCase()===String(item.topic).toLowerCase();
  const sameSubject=rec.subject&&item.subject&&String(rec.subject).toLowerCase()===String(item.subject).toLowerCase();
  const sameArea=rec.area&&item.area&&String(rec.area).toLowerCase()===String(item.area).toLowerCase();
  return Boolean(sameTopic||sameSubject||sameArea);
}

function contentCardProgress(type,id){
  const p=getContentProgress(type,id);
  const pct=p.completed?100:Math.round(Number(p.progress_percent||0));
  return `<div class="content-progress"><span><i style="width:${pct}%"></i></span><small>${p.completed?'Concluído':pct>0?pct+'% concluído':'Ainda não iniciado'}</small></div>`;
}

function wireContentCards(){
  $$('[data-content-open]').forEach(b=>b.onclick=()=>openContentViewer(b.dataset.contentType,Number(b.dataset.contentOpen)));
  $$('[data-content-fav]').forEach(b=>b.onclick=e=>{e.stopPropagation();toggleContentFavorite(b.dataset.contentType,Number(b.dataset.contentFav))});
}

async function startContentPractice(item){
  closeContentViewer();
  openPage('questoes');
  await startStudySession({
    mode:'content',
    area:item.area||'',
    subject:item.subject||'',
    topic:item.topic||'',
    difficulty:'',
    visualOnly:false,
    size:5
  });
  if(state.session){
    $('#sessionAreaBadge').textContent='Revisão';
    $('#sessionTitle').textContent=item.topic||item.subject||'Treino do conteúdo';
    $('#sessionSubtitle').textContent='5 questões relacionadas ao conteúdo que você acabou de estudar.';
  }
}

function updateViewerFavoriteButton(){
  const btn=$('#viewerFavorite');
  const viewer=state.activeViewer;
  if(!btn||!viewer)return;
  const fav=favoriteContent(viewer.type,viewer.item.id);
  btn.textContent=fav?'★ Favoritado':'☆ Favoritar';
  btn.classList.toggle('active',fav);
}

async function openContentViewer(type,id){
  const item=(type==='video'?state.videos:state.materials).find(x=>Number(x.id)===Number(id));
  if(!item)return toast('Conteúdo não encontrado.','error');
  if(item.plus_only&&!isNexoPlus())return openNexoPlans('Esse conteúdo faz parte da biblioteca NEXO Plus.');
  const modal=$('#contentViewer');
  const body=$('#contentViewerBody');
  const title=$('#contentViewerTitle');
  const subtitle=$('#contentViewerSubtitle');
  const speed=$('#viewerSpeedWrap');
  if(!modal||!body)return;

  state.activeViewer={type,item,lastPersistAt:0};
  title.textContent=item.title||'Conteúdo';
  subtitle.textContent=[item.area,item.subject,item.topic].filter(Boolean).join(' · ');
  modal.classList.remove('hidden');
  document.body.style.overflow='hidden';

  const current=getContentProgress(type,id);
  if(type==='video'){
    const embed=externalEmbedUrl(item.video_url||'');
    speed?.classList.toggle('hidden',Boolean(embed));
    if(embed){
      body.innerHTML=`<iframe class="content-frame video-frame" src="${esc(embed)}" title="${esc(item.title||'Videoaula')}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
      await saveContentProgress('video',id,{seconds:current.progress_seconds||0,percent:Math.max(5,Number(current.progress_percent||0)),completed:current.completed});
      renderVideos();
    }else{
      const poster=item.thumbnail_url||cloudinaryVideoPoster(item.video_url||'');
      body.innerHTML=`<video id="contentVideoPlayer" class="content-video" controls playsinline preload="metadata" ${poster?'poster="'+esc(poster)+'"':''}><source src="${esc(item.video_url||'')}" type="${item.format?'video/'+esc(item.format):''}"></video>`;
      const player=$('#contentVideoPlayer');
      player.addEventListener('loadedmetadata',()=>{
        if(current.progress_seconds>0&&current.progress_seconds<player.duration-5)player.currentTime=current.progress_seconds;
        const sel=$('#viewerSpeed'); if(sel)player.playbackRate=Number(sel.value||1);
      });
      player.addEventListener('timeupdate',()=>{
        if(!player.duration||!isFinite(player.duration))return;
        const now=Date.now();
        const pct=(player.currentTime/player.duration)*100;
        state.contentProgress.set(contentKey('video',id),{
          progress_seconds:Math.floor(player.currentTime),
          progress_percent:pct,
          completed:pct>=95
        });
        if(now-(state.activeViewer?.lastPersistAt||0)>5000){
          if(state.activeViewer)state.activeViewer.lastPersistAt=now;
          saveContentProgress('video',id,{seconds:player.currentTime,percent:pct,completed:pct>=95});
        }
      });
      player.addEventListener('ended',async()=>{
        await saveContentProgress('video',id,{seconds:player.duration||0,percent:100,completed:true});
        renderVideos();
        toast('Videoaula concluída.');
      });
    }
  }else{
    speed?.classList.add('hidden');
    const isPdf=String(item.format||'').toLowerCase()==='pdf'||/\.pdf(?:\?|$)/i.test(item.file_url||'');
    body.innerHTML=isPdf
      ? `<iframe class="content-frame pdf-frame" src="${esc(item.file_url||'')}#toolbar=1&navpanes=0" title="${esc(item.title||'PDF')}"></iframe>`
      : `<div class="material-image-wrap"><img src="${esc(item.file_url||'')}" alt="${esc(item.title||'Material')}"></div>`;
    await saveContentProgress('material',id,{seconds:0,percent:Math.max(10,Number(current.progress_percent||0)),completed:current.completed});
    renderMaterials();
  }

  updateViewerFavoriteButton();
  const complete=$('#viewerComplete');
  if(complete)complete.textContent=current.completed?'✓ Concluído':'Marcar como concluído';
}

async function markViewerComplete(){
  const viewer=state.activeViewer;if(!viewer)return;
  let seconds=0;
  if(viewer.type==='video'){
    const player=$('#contentVideoPlayer');
    seconds=Math.floor(player?.duration||player?.currentTime||0);
  }
  await saveContentProgress(viewer.type,viewer.item.id,{seconds,percent:100,completed:true});
  $('#viewerComplete').textContent='✓ Concluído';
  viewer.type==='video'?renderVideos():renderMaterials();
  toast('Conteúdo marcado como concluído.');
}

function closeContentViewer(){
  const viewer=state.activeViewer;
  const player=$('#contentVideoPlayer');
  if(viewer?.type==='video'&&player&&player.duration&&isFinite(player.duration)){
    const pct=(player.currentTime/player.duration)*100;
    saveContentProgress('video',viewer.item.id,{seconds:player.currentTime,percent:pct,completed:pct>=95});
  }
  const modal=$('#contentViewer');
  if(modal)modal.classList.add('hidden');
  const body=$('#contentViewerBody');if(body)body.innerHTML='';
  document.body.style.overflow='';
  state.activeViewer=null;
}

$('#closeContentViewer')?.addEventListener('click',closeContentViewer);
$('#contentViewer')?.addEventListener('click',e=>{if(e.target===$('#contentViewer'))closeContentViewer()});
$('#viewerFavorite')?.addEventListener('click',()=>{const v=state.activeViewer;if(v)toggleContentFavorite(v.type,v.item.id)});
$('#viewerComplete')?.addEventListener('click',markViewerComplete);
$('#viewerPractice')?.addEventListener('click',()=>{const v=state.activeViewer;if(v)startContentPractice(v.item)});
$('#viewerSpeed')?.addEventListener('change',e=>{const p=$('#contentVideoPlayer');if(p)p.playbackRate=Number(e.target.value||1)});

async function loadVideos() {
  const {data,error}=await client.from('videos').select('*').eq('is_published',true).order('created_at',{ascending:false});
  if(error){console.error(error);return}
  state.videos=data||[];
  await loadContentState('video');
  renderVideos();
}
function renderVideos(){
  const s=$('#videoSearch').value.toLowerCase().trim();
  const favoritesOnly=$('#videoFavoritesOnly')?.classList.contains('active');
  const list=state.videos
    .filter(v=>(!s||[v.title,v.area,v.subject,v.topic,v.description].filter(Boolean).join(' ').toLowerCase().includes(s))&&(!favoritesOnly||favoriteContent('video',v.id)))
    .sort((a,b)=>Number(contentMatchesCore(b))-Number(contentMatchesCore(a)));
  $('#videoGrid').innerHTML=list.length?list.map(v=>{
    const fav=favoriteContent('video',v.id);
    const poster=v.thumbnail_url||cloudinaryVideoPoster(v.video_url||'');
    return `<article class="panel video-card content-card">
      <button class="content-fav ${fav?'active':''}" data-content-fav="${v.id}" data-content-type="video" aria-label="Favoritar">${fav?'★':'☆'}</button>
      <button class="content-open-area" data-content-open="${v.id}" data-content-type="video">
        <div class="video-thumb">${poster?'<img src="'+esc(poster)+'" alt="">':'<span>▶</span>'}</div>
        <div class="video-body">
          ${v.plus_only?'<span class="plus-content-badge">NEXO PLUS</span>':''}
          ${contentMatchesCore(v)?'<span class="core-content-badge">✦ RECOMENDADO PELO NEXO</span>':''}
          <b>${esc(v.title)}</b>
          <small>${esc([v.area,v.subject,v.topic].filter(Boolean).join(' · '))}</small>
          ${v.description?'<p>'+esc(v.description)+'</p>':''}
          ${contentCardProgress('video',v.id)}
          <span class="content-cta">Assistir no NEXO →</span>
        </div>
      </button>
    </article>`;
  }).join(''):'<article class="panel"><p style="color:var(--muted)">Nenhuma videoaula encontrada.</p></article>';
  wireContentCards();
}
$('#videoSearch').addEventListener('input',renderVideos);
$('#videoFavoritesOnly')?.addEventListener('click',e=>{e.currentTarget.classList.toggle('active');renderVideos()});

async function loadMaterials(){
  const {data,error}=await client.from('materials').select('*').eq('is_published',true).order('created_at',{ascending:false});
  if(error){console.error(error);return}
  state.materials=data||[];
  await loadContentState('material');
  renderMaterials();
}
function renderMaterials(){
  const s=($('#materialSearch')?.value||'').toLowerCase().trim();
  const favoritesOnly=$('#materialFavoritesOnly')?.classList.contains('active');
  const list=state.materials
    .filter(m=>(!s||[m.title,m.area,m.subject,m.topic,m.description].filter(Boolean).join(' ').toLowerCase().includes(s))&&(!favoritesOnly||favoriteContent('material',m.id)))
    .sort((a,b)=>Number(contentMatchesCore(b))-Number(contentMatchesCore(a)));
  const grid=$('#materialGrid');
  if(!grid)return;
  grid.innerHTML=list.length?list.map(m=>{
    const ext=String(m.format||'').toUpperCase();
    const icon=ext==='PDF'?'PDF':'▧';
    const size=m.bytes?(' · '+(m.bytes/1048576).toFixed(m.bytes>=10485760?0:1)+' MB'):'';
    const fav=favoriteContent('material',m.id);
    return `<article class="panel video-card content-card">
      <button class="content-fav ${fav?'active':''}" data-content-fav="${m.id}" data-content-type="material" aria-label="Favoritar">${fav?'★':'☆'}</button>
      <button class="content-open-area" data-content-open="${m.id}" data-content-type="material">
        <div class="video-thumb"><span>${icon}</span></div>
        <div class="video-body">
          ${m.plus_only?'<span class="plus-content-badge">NEXO PLUS</span>':''}
          ${contentMatchesCore(m)?'<span class="core-content-badge">✦ RECOMENDADO PELO NEXO</span>':''}
          <b>${esc(m.title)}</b>
          <small>${esc([m.area,m.subject,m.topic].filter(Boolean).join(' · '))}${size}</small>
          ${m.description?'<p>'+esc(m.description)+'</p>':''}
          ${contentCardProgress('material',m.id)}
          <span class="content-cta">Abrir no NEXO →</span>
        </div>
      </button>
    </article>`;
  }).join(''):'<article class="panel"><p style="color:var(--muted)">Nenhum material publicado ainda.</p></article>';
  wireContentCards();
}
$('#materialSearch')?.addEventListener('input',renderMaterials);
$('#materialFavoritesOnly')?.addEventListener('click',e=>{e.currentTarget.classList.toggle('active');renderMaterials()});

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


const NEXO_AVATAR_DEFAULT=Object.freeze({
  base:'neutral',
  skin:'tone3',
  hair:'short',
  hair_color:'ink',
  outfit:'purple',
  accessory:'none',
  frame:'basic',
  background:'grid',
  aura:'none'
});

const NEXO_AVATAR_LOCKS=Object.freeze({
  'outfit:cyan':'outfit_cyan',
  'outfit:gold':'outfit_gold',
  'outfit:focus':'outfit_focus',
  'outfit:aurora':'outfit_aurora',
  'accessory:headphones':'acc_headphones',
  'accessory:crown':'acc_crown',
  'accessory:tiara':'acc_tiara',
  'accessory:star':'acc_star',
  'frame:neon':'frame_neon',
  'frame:cosmic':'frame_cosmic',
  'frame:diamond':'frame_diamond',
  'background:midnight':'bg_midnight',
  'background:aurora':'bg_aurora',
  'background:library':'bg_library',
  'background:lab':'bg_lab',
  'aura:blue':'aura_blue',
  'aura:purple':'aura_purple'
});

function normalizedAvatar(input={}){
  const raw={...(input||{})};
  const legacySkin={light:'tone1',medium:'tone3',tan:'tone4',deep:'tone6'};
  if(legacySkin[raw.skin])raw.skin=legacySkin[raw.skin];
  return {...NEXO_AVATAR_DEFAULT,...raw};
}

function journeyInventorySet(){
  return new Set((state.journey?.inventory||[]).map(x=>x.item_code));
}

function renderStudentAvatar(target,avatarInput){
  const el=typeof target==='string'?$(target):target;
  if(!el)return;
  const a=normalizedAvatar(avatarInput);
  const safe={
    base:['masc','fem','neutral'].includes(a.base)?a.base:'neutral',
    skin:['tone1','tone2','tone3','tone4','tone5','tone6'].includes(a.skin)?a.skin:'tone3',
    hair:['short','wave','curly','buzz','long','ponytail','bun','afro','fringe','braids','locs','fade','quiff','bob','layered','sidecut','wolf','twintails','textured','mohawk','hologram','celestial','onyx','flux'].includes(a.hair)?a.hair:'short',
    hair_color:['ink','brown','blonde','blue','purple','pink'].includes(a.hair_color)?a.hair_color:'ink',
    outfit:['purple','blue','teal','cyan','gold','focus','aurora','black','white','lavender','navy','rose','varsity','street','academy','pastel','urban','celestial','phantom','royal'].includes(a.outfit)?a.outfit:'purple',
    accessory:['none','glasses','headphones','crown','tiara','star','cap','ribbon','chain','pin','halo','earrings','visor'].includes(a.accessory)?a.accessory:'none',
    frame:['basic','neon','cosmic','diamond','level','ultraviolet'].includes(a.frame)?a.frame:'basic',
    background:['grid','midnight','aurora','library','lab','study','skyline'].includes(a.background)?a.background:'grid',
    aura:['none','blue','purple','gold'].includes(a.aura)?a.aura:'none'
  };
  el.innerHTML=`
    <div class="student-avatar-shell frame-${safe.frame} bg-${safe.background} aura-${safe.aura}">
      <div class="student-avatar-figure"
        data-base="${safe.base}" data-skin="${safe.skin}" data-hair="${safe.hair}" data-hair-color="${safe.hair_color}"
        data-outfit="${safe.outfit}" data-accessory="${safe.accessory}">
        <span class="av-aura"></span>
        <span class="av-hair-back"></span>
        <span class="av-body"></span>
        <span class="av-neck"></span>
        <span class="av-head"></span>
        <span class="av-ear av-ear-left"></span><span class="av-ear av-ear-right"></span>
        <span class="av-hair"></span>
        <span class="av-brow av-brow-left"></span><span class="av-brow av-brow-right"></span>
        <span class="av-eye av-eye-left"></span><span class="av-eye av-eye-right"></span>
        <span class="av-lash av-lash-left"></span><span class="av-lash av-lash-right"></span>
        <span class="av-nose"></span><span class="av-mouth"></span>
        <span class="av-accessory"></span>
        <span class="av-logo">N</span>
      </div>
    </div>`;
}

function setJourneyTab(tab='missions'){
  state.journeyTab=tab;
  $('[data-journey-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.journeyTab===tab));
  $$('[data-journey-panel]').forEach(panel=>panel.classList.toggle('active',panel.dataset.journeyPanel===tab));
  if(tab==='avatar')renderAvatarBuilder();
}

function missionProgressText(m){
  return Math.min(Number(m.progress||0),Number(m.target||0))+' / '+Number(m.target||0);
}

function renderJourneyHome(){
  const j=state.journey;
  if(!j?.profile)return;
  const p=j.profile;
  renderStudentAvatar($('#headerJourneyAvatar'),p.avatar);
  renderStudentAvatar($('#avatar'),p.avatar);
  if($('#headerJourneyLevel'))$('#headerJourneyLevel').textContent='Nível '+p.level+' · '+(p.league||'Bronze');
  if($('#headerJourneyCoins'))$('#headerJourneyCoins').innerHTML=Number(p.coins||0).toLocaleString('pt-BR')+' <small>N¢</small>';
}

function renderJourneyMissions(){
  const missions=state.journey?.missions||[];
  const renderList=(items,target)=>{
    const el=$(target); if(!el)return;
    el.innerHTML=items.length?items.map(m=>{
      const pct=clamp(Math.round(Number(m.progress||0)*100/Math.max(1,Number(m.target||1))),0,100);
      const ready=m.status==='completed';
      const claimed=m.status==='claimed';
      return `<article class="journey-mission-card ${ready?'ready':''} ${claimed?'claimed':''}">
        <div class="journey-mission-icon">${claimed?'✓':ready?'✦':'◎'}</div>
        <div class="journey-mission-copy">
          <div><b>${esc(m.title)}</b><span>${missionProgressText(m)}</span></div>
          <p>${esc(m.description)}</p>
          <div class="journey-mission-progress"><i style="width:${pct}%"></i></div>
          <small>+${Number(m.reward_xp||0)} XP · +${Number(m.reward_coins||0)} N-Coins</small>
        </div>
        ${ready?`<button data-claim-mission="${m.id}">Resgatar</button>`:claimed?'<em>Resgatado</em>':''}
      </article>`;
    }).join(''):'<div class="journey-empty">Nenhuma missão disponível agora.</div>';
  };
  renderList(missions.filter(x=>x.period==='daily'),'#journeyDailyMissions');
  renderList(missions.filter(x=>x.period==='weekly'),'#journeyWeeklyMissions');

  $$('[data-claim-mission]').forEach(btn=>btn.onclick=async()=>{
    const id=Number(btn.dataset.claimMission);
    const mission=missions.find(x=>Number(x.id)===id);
    btn.disabled=true;btn.textContent='Resgatando...';
    try{
      const {data,error}=await client.rpc('claim_nexo_mission',{p_mission_id:id});
      if(error)throw error;
      state.journey=data;
      state.avatarDraft=normalizedAvatar(data?.profile?.avatar);
      renderNexoJourney();
      toast('Missão resgatada: +'+Number(mission?.reward_xp||0)+' XP e +'+Number(mission?.reward_coins||0)+' N-Coins.');
    }catch(err){
      console.error('claim mission',err);
      toast('Não foi possível resgatar essa missão.','error');
      btn.disabled=false;btn.textContent='Resgatar';
    }
  });
}

function renderJourneyBoards(){
  const j=state.journey||{};
  const render=(rows,target,arena=false)=>{
    const el=$(target);if(!el)return;
    el.innerHTML=rows?.length?rows.map((row,index)=>{
      const mine=String(row.user_id||'')===String(state.user?.id||'');
      const rowUltra=mine&&isNexoUltra();
      return `<div class="journey-rank-row ${mine?'mine':''}">
        <span class="journey-rank-pos">${Number(row.rank_position)<=3?['🥇','🥈','🥉'][Number(row.rank_position)-1]:'#'+row.rank_position}</span>
        <span class="journey-rank-avatar" data-rank-avatar="${index}"></span>
        <div class="journey-rank-user"><b>${esc(row.full_name)}${mine?' · você':''}${rowUltra?'<i class="ultra">NEXO ULTRA</i>':row.plan==='plus'?'<i>NEXO PLUS</i>':''}</b><small>NV. ${Number(row.level||1)} · ${arena?Number(row.correct_answers||0)+' acertos na Arena':esc(row.league||'Bronze')}</small></div>
        <strong>${Number(row.points||0).toLocaleString('pt-BR')}<small> pts</small></strong>
      </div>`;
    }).join(''):'<div class="journey-empty">A competição começa quando os alunos pontuarem nesta semana.</div>';
    $$('[data-rank-avatar]',el).forEach(node=>{
      const row=rows[Number(node.dataset.rankAvatar)];
      renderStudentAvatar(node,row?.avatar);
    });
  };
  render(j.leaderboard,'#journeyLeagueBoard',false);
  render(j.arena_leaderboard,'#journeyArenaBoard',true);

  const p=j.profile||{};
  $$('.league-road [data-league]').forEach(x=>x.classList.toggle('active',x.dataset.league===p.league));
  if($('#journeyWeekLabel')&&j.week_start&&j.week_end){
    const a=new Date(j.week_start+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
    const b=new Date(j.week_end+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
    $('#journeyWeekLabel').textContent=a+' — '+b;
  }
}

let wardrobeFilter='all';
function wardrobeItemField(item){
  const raw=String(item?.visual?.field||item?.category||'').trim().toLowerCase();
  const aliases={
    hair:'hair',cabelo:'hair',
    hair_color:'hair_color','hair-color':'hair_color','cor do cabelo':'hair_color',cor_cabelo:'hair_color',
    outfit:'outfit',roupa:'outfit',roupas:'outfit',
    accessory:'accessory',acessorio:'accessory','acessório':'accessory',acessorios:'accessory','acessórios':'accessory',
    frame:'frame',moldura:'frame',
    background:'background',fundo:'background',cenario:'background','cenário':'background',
    aura:'aura'
  };
  return aliases[raw]||raw;
}
function wardrobeCategoryLabel(category){
  const field=wardrobeItemField({category});
  return ({hair:'Cabelo',hair_color:'Cor do cabelo',outfit:'Roupa',accessory:'Acessório',frame:'Moldura',background:'Cenário',aura:'Aura'})[field]||String(category||'Item');
}
function wardrobeItemState(item,owned,level,plus,ultra){
  const plusLocked=Boolean(item.plus_only&&!plus&&!ultra);
  const levelLocked=!ultra&&level<Number(item.unlock_level||1);
  const autoEligible=Boolean(!plusLocked&&!levelLocked&&(item.grant_mode==='starter'||item.grant_mode==='level'));
  const has=ultra||owned.has(item.item_code)||autoEligible;
  const available=!has&&!plusLocked&&!levelLocked;
  return {has,plusLocked,levelLocked,available,autoEligible};
}
function wardrobePreviewAvatar(item,baseAvatar){
  const preview=normalizedAvatar(baseAvatar);
  const field=wardrobeItemField(item);
  const value=item?.visual?.value;
  if(value&&Object.prototype.hasOwnProperty.call(preview,field))preview[field]=value;
  return normalizeAvatarDraftForBase(preview);
}
function renderNexoWardrobe(){
  const j=state.journey||{}, el=$('#nexoWardrobe'), summary=$('#wardrobeSummary');
  if(!el)return;
  const owned=journeyInventorySet(), level=Number(j.profile?.level||1), plus=isNexoPlus(), ultra=isNexoUltra();
  const baseAvatar=normalizedAvatar(j.profile?.avatar);
  const base=baseAvatar.base||'neutral';
  const catalog=(j.catalog||[]).filter(item=>ultra||avatarItemCompatibleWithBase(item,base));
  const categories=[...new Set(catalog.map(x=>x.category).filter(Boolean))].sort((a,b)=>wardrobeCategoryLabel(a).localeCompare(wardrobeCategoryLabel(b),'pt-BR'));
  const categorySelect=$('#wardrobeCategory');
  if(categorySelect){
    const current=categorySelect.value||'all';
    categorySelect.innerHTML='<option value="all">Todas as categorias</option>'+categories.map(x=>'<option value="'+esc(x)+'">'+esc(wardrobeCategoryLabel(x))+'</option>').join('');
    categorySelect.value=categories.includes(current)?current:'all';
  }

  const counts={owned:0,available:0,level:0,plus:0};
  catalog.forEach(item=>{
    const s=wardrobeItemState(item,owned,level,plus,ultra);
    if(s.has)counts.owned++;
    else if(s.plusLocked)counts.plus++;
    else if(s.levelLocked)counts.level++;
    else counts.available++;
  });
  const total=Math.max(1,catalog.length),progress=Math.round(counts.owned*100/total);
  if(summary)summary.innerHTML='<span><b>'+counts.available+'</b><small>Disponível</small></span><span><b>'+counts.owned+'</b><small>Conquistado</small></span><span><b>'+counts.level+'</b><small>Por nível</small></span><span><b>'+counts.plus+'</b><small>Plus</small></span>';
  if($('#wardrobeProgressLabel'))$('#wardrobeProgressLabel').textContent=progress+'% conquistado · '+counts.owned+'/'+catalog.length+' itens';
  if($('#wardrobeProgressBar'))$('#wardrobeProgressBar').style.width=progress+'%';
  const nextLevel=catalog.filter(item=>!wardrobeItemState(item,owned,level,plus,ultra).has&&!item.plus_only&&Number(item.unlock_level||1)>level).sort((a,b)=>Number(a.unlock_level||1)-Number(b.unlock_level||1))[0];
  if($('#wardrobeNextUnlock'))$('#wardrobeNextUnlock').textContent=nextLevel?'Próximo desbloqueio: '+(nextLevel.name||'novo item')+' no nível '+Number(nextLevel.unlock_level||1)+'.':counts.available?'Você tem itens disponíveis para adicionar à coleção.':'Sua coleção está em dia com seu nível atual.';

  const currentAvatar=normalizedAvatar(j.profile?.avatar);
  const stateRank=s=>s.has?0:s.available?1:s.levelLocked?2:3;
  const filtered=catalog.filter(item=>{
    const s=wardrobeItemState(item,owned,level,plus,ultra);
    const cat=($('#wardrobeCategory')?.value||'all')==='all'||item.category===$('#wardrobeCategory').value;
    const match=wardrobeFilter==='all'||(wardrobeFilter==='owned'&&s.has)||(wardrobeFilter==='available'&&s.available)||(wardrobeFilter==='plus'&&s.plusLocked)||(wardrobeFilter==='level'&&!s.has&&!s.plusLocked&&s.levelLocked);
    return cat&&match;
  }).sort((a,b)=>{
    const sa=wardrobeItemState(a,owned,level,plus,ultra),sb=wardrobeItemState(b,owned,level,plus,ultra);
    return stateRank(sa)-stateRank(sb)||Number(a.unlock_level||1)-Number(b.unlock_level||1)||String(a.name||'').localeCompare(String(b.name||''),'pt-BR');
  });

  el.innerHTML=filtered.length?filtered.map(item=>{
    const s=wardrobeItemState(item,owned,level,plus,ultra);
    const field=wardrobeItemField(item),value=item?.visual?.value;
    const equipped=Boolean(s.has&&value&&currentAvatar[field]===value);
    const stateClass=equipped?'equipped':s.has?'owned':s.plusLocked?'plus':s.levelLocked?'level':'available';
    const label=equipped?'USANDO':s.has?'CONQUISTADO':s.plusLocked?'PLUS':s.levelLocked?'DESBLOQUEIA NO NÍVEL '+Number(item.unlock_level||1):'DISPONÍVEL';
    const action=equipped?'<button disabled>Em uso</button>':s.has?'<button data-wardrobe-equip="'+esc(item.item_code)+'">Usar</button>':s.plusLocked?'<button data-open-plus>Ver Plus</button>':s.available?'<button data-wardrobe-store>Ver na Loja</button>':'<button disabled>Nível '+Number(item.unlock_level||1)+'</button>';
    return '<article class="wardrobe-card '+stateClass+'"><div class="wardrobe-card-visual"><div class="wardrobe-avatar-preview" data-wardrobe-preview="'+esc(item.item_code)+'"></div><small>'+esc(wardrobeCategoryLabel(item.category))+'</small></div><div class="wardrobe-card-copy"><span class="wardrobe-state">'+label+'</span><h4>'+esc(item.name)+'</h4><p>'+esc(item.description||'Cosmético NEXO')+'</p></div><div class="wardrobe-card-foot"><small>'+esc(String(item.rarity||'comum').toUpperCase())+'</small>'+action+'</div></article>';
  }).join(''):'<div class="journey-empty">Nenhum item nesta categoria.</div>';

  $$('[data-wardrobe-preview]',el).forEach(node=>{
    const item=avatarCatalogItem(node.dataset.wardrobePreview);
    renderStudentAvatar(node,wardrobePreviewAvatar(item,baseAvatar));
  });
  $$('[data-open-plus]',el).forEach(btn=>btn.onclick=()=>openNexoPlans('Esse item faz parte do Guarda-roupa NEXO Plus.'));
  $$('[data-wardrobe-store]',el).forEach(btn=>btn.onclick=()=>setJourneyTab('store'));
  $$('[data-wardrobe-equip]',el).forEach(btn=>btn.onclick=()=>{
    const item=avatarCatalogItem(btn.dataset.wardrobeEquip), field=wardrobeItemField(item), value=item?.visual?.value;
    if(!item||!value||!Object.prototype.hasOwnProperty.call(NEXO_AVATAR_DEFAULT,field))return setJourneyTab('avatar');
    state.avatarDraft=normalizedAvatar(state.avatarDraft||j.profile?.avatar);
    state.avatarDraft[field]=value;
    state.avatarDraft=normalizeAvatarDraftForBase(state.avatarDraft);
    setJourneyTab('avatar');
    renderAvatarBuilder();
    toast('Item selecionado. Confira no personagem e salve.');
  });
}
function renderJourneyStore(){
  const j=state.journey||{};
  const owned=journeyInventorySet();
  const level=Number(j.profile?.level||1);
  const plus=isNexoPlus(),ultra=isNexoUltra();
  const base=j.profile?.avatar?.base||'neutral';
  const el=$('#journeyStore');if(!el)return;
  const rarityIcon={comum:'•',incomum:'◆',raro:'✦','épico':'✧','lendário':'♕'};
  const collectionLabel=item=>{
    const bases=Array.isArray(item.compatible_bases)?item.compatible_bases:[];
    if(bases.length===1&&bases[0]==='fem')return 'COLEÇÃO FEMININA';
    if(bases.length===1&&bases[0]==='masc')return 'COLEÇÃO MASCULINA';
    if(bases.length===1&&bases[0]==='neutral')return 'COLEÇÃO NEUTRA';
    return 'COLEÇÃO NEXO';
  };
  const visibleCatalog=(j.catalog||[]).filter(item=>ultra||avatarItemCompatibleWithBase(item,base));
  el.innerHTML=visibleCatalog.map(item=>{
    const itemState=wardrobeItemState(item,owned,level,plus,ultra);
    const has=itemState.has;
    const plusLocked=itemState.plusLocked;
    const levelLocked=itemState.levelLocked;
    const locked=plusLocked||levelLocked;
    const status=ultra?'ULTRA · LIBERADO'
      :has?'NO INVENTÁRIO'
      :plusLocked?'NEXO PLUS'
      :levelLocked?'LIBERA NO NÍVEL '+item.unlock_level
      :item.grant_mode==='starter'?'GRÁTIS'
      :Number(item.price||0)+' N-Coins';
    return `<article class="journey-store-item rarity-${esc(item.rarity)} ${has?'owned':''} ${plusLocked?'plus-locked':''}">
      <div class="store-item-visual"><span>${rarityIcon[item.rarity]||'✦'}</span><i>${item.plus_only?'PLUS · ':''}${esc(item.category)}</i></div>
      <div><small>${item.plus_only?'NEXO PLUS · ':''}${collectionLabel(item)} · ${esc(item.rarity).toUpperCase()}</small><h4>${esc(item.name)}</h4><p>${esc(item.description)}</p></div>
      <div class="store-item-bottom">
        <span>${status}</span>
        ${ultra?'<button disabled>Ultra</button>':has?'<button disabled>Adquirido</button>':plusLocked?'<button data-open-plus>Ver Plus</button>':levelLocked?'<button disabled>Bloqueado</button>':`<button data-buy-item="${esc(item.item_code)}">${Number(item.price||0)===0?'Resgatar':'Comprar'}</button>`}
      </div>
    </article>`;
  }).join('');

  $$('[data-open-plus]',el).forEach(btn=>btn.onclick=()=>openNexoPlans('Esse cosmético faz parte da coleção NEXO Plus.'));
  $$('[data-buy-item]',el).forEach(btn=>btn.onclick=async()=>{
    const code=btn.dataset.buyItem;
    btn.disabled=true;btn.textContent='Comprando...';
    try{
      const {data,error}=await client.rpc('buy_nexo_item',{p_item_code:code});
      if(error)throw error;
      state.journey={...(state.journey||{}),...(data||{}),catalog:state.journey?.catalog||[]};
      await loadNexoJourney({silent:true});
      toast('Item adicionado ao seu inventário.');
      setJourneyTab('store');
    }catch(err){
      console.error('buy Nexo item',err);
      const msg=String(err?.message||'');
      if(handlePlanLimitError(err))return;
      toast(msg.includes('insufficient')?'N-Coins insuficientes.':msg.includes('level required')?'Seu nível ainda não libera esse item.':msg.includes('base_incompatible')?'Esse item pertence a outra coleção de personagem.':'Não foi possível concluir a compra.','error');
      btn.disabled=false;btn.textContent='Comprar';
    }
  });
}

function renderJourneyAchievements(){
  const list=state.journey?.achievements||[];
  const el=$('#journeyAchievements');if(!el)return;
  el.innerHTML=list.map(a=>`<article class="journey-achievement ${a.unlocked?'unlocked':'locked'} rarity-${esc(a.rarity)}">
    <span>${esc(a.icon||'✦')}</span>
    <div><small>${a.unlocked?'CONQUISTADA':esc(a.rarity).toUpperCase()}</small><h4>${esc(a.name)}</h4><p>${esc(a.description)}</p><em>+${Number(a.reward_xp||0)} XP · +${Number(a.reward_coins||0)} N-Coins</em></div>
  </article>`).join('');
}

function renderAvatarBuilder(){
  const draft=normalizedAvatar(state.avatarDraft||state.journey?.profile?.avatar);
  state.avatarDraft=draft;
  renderStudentAvatar($('#avatarBuilderPreview'),draft);
  const owned=journeyInventorySet(),plus=isNexoPlus(),ultra=isNexoUltra();
  const level=Number(state.journey?.profile?.level||1);
  $$('[data-avatar-field]').forEach(btn=>{
    const field=btn.dataset.avatarField,value=btn.dataset.avatarValue,itemCode=btn.dataset.avatarItem;
    const item=itemCode?avatarCatalogItem(itemCode):null;
    const bases=btn.dataset.avatarBases?btn.dataset.avatarBases.split(',').map(x=>x.trim()):null;
    const incompatible=Boolean(bases&&!bases.includes(draft.base));
    const plusLocked=btn.dataset.plusStyle==='true'&&!plus&&!ultra;
    const autoEligible=Boolean(item&&avatarItemCompatibleWithBase(item,draft.base)&&(
      item.grant_mode==='starter'&&(!item.plus_only||plus||ultra)
      || item.grant_mode==='level'&&level>=Number(item.unlock_level||1)&&(!item.plus_only||plus||ultra)
    ));
    const itemLocked=Boolean(itemCode&&!owned.has(itemCode)&&!autoEligible&&!ultra);
    const locked=plusLocked||itemLocked;
    btn.hidden=incompatible;
    btn.classList.toggle('active',!incompatible&&draft[field]===value);
    btn.classList.toggle('locked',locked);
    btn.classList.toggle('plus-locked',plusLocked);
    btn.dataset.locked=locked?'true':'false';
    if(!btn.classList.contains('tone-swatch')){
      const base=(btn.dataset.baseLabel||btn.textContent).replace(/\s*🔒$/,'').replace(/\s*PLUS$/i,'');
      btn.dataset.baseLabel=base;
      btn.textContent=locked?(base+(plusLocked?' PLUS':' 🔒')):base;
    }
  });
}

function renderNexoJourney(){
  const j=state.journey;
  if(!j?.profile)return;
  const p=j.profile;
  const name=state.profile?.full_name||state.user?.user_metadata?.full_name||'Aluno NEXO';
  renderStudentAvatar($('#journeyAvatar'),p.avatar);
  if($('#journeyPlayerName'))$('#journeyPlayerName').textContent=name;
  if($('#journeyLevel'))$('#journeyLevel').textContent='Nível '+p.level;
  if($('#journeyTitle'))$('#journeyTitle').textContent=p.title||'Calouro NEXO';
  if($('#journeyCoins'))$('#journeyCoins').textContent=Number(p.coins||0).toLocaleString('pt-BR');
  if($('#journeyStreak'))$('#journeyStreak').textContent=Number(p.streak_days||0);
  if($('#journeyLeague'))$('#journeyLeague').textContent=p.league||'Bronze';
  if($('#journeyRank'))$('#journeyRank').textContent=p.rank_position?'#'+p.rank_position:'—';
  if($('#journeyArenaPoints'))$('#journeyArenaPoints').textContent=Number(p.arena_points||0).toLocaleString('pt-BR');
  if($('#journeyArenaRank'))$('#journeyArenaRank').textContent=p.arena_rank?'#'+p.arena_rank:'—';
  const pct=clamp(Math.round(Number(p.xp_in_level||0)*100/Math.max(1,Number(p.xp_to_next||180))),0,100);
  if($('#journeyLevelBar'))$('#journeyLevelBar').style.width=pct+'%';
  if($('#journeyLevelText'))$('#journeyLevelText').textContent=Number(p.xp_in_level||0)+' / '+Number(p.xp_to_next||180)+' XP para o próximo nível';
  renderNexoCommandCenter();
  renderJourneyHome();
  renderJourneyMissions();
  renderJourneyBoards();
  renderJourneyStore();
  renderNexoWardrobe();
  renderJourneyAchievements();
  renderAvatarBuilder();
  setJourneyTab(state.journeyTab||'missions');
}

async function loadNexoJourney({silent=false}={}){
  if(!state.user?.id)return null;
  if(state.journeyLoading)return state.journey;
  state.journeyLoading=true;
  try{
    const [journeyRes,membershipRes,socialRes,catalogRes]=await Promise.all([
      client.rpc('get_nexo_journey'),
      client.rpc('get_nexo_membership'),
      client.rpc('get_nexo_social_ranking'),
      client.rpc('get_nexo_store_catalog')
    ]);
    if(journeyRes.error)throw journeyRes.error;
    state.journey=journeyRes.data||null;
    if(!membershipRes.error)state.membership=membershipRes.data||null;
    if(state.journey&&!socialRes.error&&socialRes.data){
      state.journey.leaderboard=socialRes.data.weekly||state.journey.leaderboard||[];
      state.journey.arena_leaderboard=socialRes.data.arena||state.journey.arena_leaderboard||[];
    }
    if(state.journey&&!catalogRes.error&&catalogRes.data)state.journey.catalog=catalogRes.data;
    state.avatarDraft=normalizedAvatar(state.journey?.profile?.avatar);
    renderPlanExperience();
    renderNexoJourney();
    return state.journey;
  }catch(err){
    console.error('NEXO Journey',err);
    if(!silent)toast('Não foi possível carregar a NEXO Jornada agora.','error');
    return null;
  }finally{
    state.journeyLoading=false;
  }
}

async function loadRanking(){
  return loadNexoJourney();
}

async function startNexoArena(){
  if(!state.membership)await loadNexoMembership({silent:true});
  if(planUsageReached('arena'))return openNexoPlans('Você já usou sua entrada gratuita da Arena nesta semana.');
  const btn=$('#startNexoArena');
  if(btn){btn.disabled=true;btn.textContent='Montando Arena...';}
  try{
    openPage('questoes');
    resetSessionUI();
    await startStudySession({
      mode:'arena',
      area:'',
      subject:'',
      topic:'',
      difficulty:'',
      visualOnly:false,
      size:20
    });
    if(state.session){
      $('#sessionAreaBadge').textContent='ARENA NEXO';
      $('#sessionTitle').textContent='Desafio semanal';
      $('#sessionSubtitle').textContent='20 questões mistas. Seus acertos, dificuldade e eficiência valem Pontos NEXO.';
    }
  }finally{
    if(btn){btn.disabled=false;btn.innerHTML='Entrar na Arena <span>→</span>';}
  }
}

$$('[data-journey-tab]').forEach(btn=>btn.onclick=()=>setJourneyTab(btn.dataset.journeyTab));
$$('[data-wardrobe-filter]').forEach(btn=>btn.onclick=()=>{wardrobeFilter=btn.dataset.wardrobeFilter;$$('[data-wardrobe-filter]').forEach(x=>x.classList.toggle('active',x===btn));renderNexoWardrobe();});
$('#wardrobeCategory')?.addEventListener('change',renderNexoWardrobe);
$$('[data-journey-tab-target]').forEach(btn=>btn.onclick=()=>setJourneyTab(btn.dataset.journeyTabTarget));
$('#refreshJourney')?.addEventListener('click',()=>loadNexoJourney());
$('#startNexoArena')?.addEventListener('click',startNexoArena);

$$('[data-avatar-field]').forEach(btn=>btn.onclick=()=>{
  if(btn.dataset.locked==='true'){
    if(btn.classList.contains('plus-locked'))return openNexoPlans('Esse estilo é exclusivo do NEXO Plus.');
    toast('Desbloqueie esse cosmético na Loja NEXO.');
    setJourneyTab('store');
    return;
  }
  state.avatarDraft=normalizedAvatar(state.avatarDraft||state.journey?.profile?.avatar);
  state.avatarDraft[btn.dataset.avatarField]=btn.dataset.avatarValue;
  if(btn.dataset.avatarField==='base'){
    const starter=starterAvatarForBase(btn.dataset.avatarValue);
    state.avatarDraft={...state.avatarDraft,base:starter.base,hair:starter.hair,outfit:starter.outfit,accessory:'none'};
  }
  state.avatarDraft=normalizeAvatarDraftForBase(state.avatarDraft);
  renderAvatarBuilder();
});

$('#requestPlusBtn')?.addEventListener('click',async()=>{
  if(isNexoPlus()||isNexoUltra())return;
  const btn=$('#requestPlusBtn');
  btn.disabled=true;btn.textContent='Registrando interesse...';
  try{
    const {error}=await client.rpc('request_nexo_plus',{p_source:'plans_page'});
    if(error)throw error;
    toast('Interesse no NEXO Plus registrado. O checkout poderá ser conectado ao próximo passo.');
    btn.textContent='✓ Interesse registrado';
  }catch(err){
    console.error('request plus',err);
    toast('Não foi possível registrar agora.','error');
    btn.disabled=false;btn.innerHTML='Quero o NEXO Plus <span>→</span>';
  }
});

$('#saveJourneyAvatar')?.addEventListener('click',async()=>{
  const btn=$('#saveJourneyAvatar');
  if(!state.avatarDraft)return;
  btn.disabled=true;btn.textContent='Salvando...';
  try{
    const {data,error}=await client.rpc('save_nexo_avatar',{p_avatar:state.avatarDraft});
    if(error)throw error;
    if(state.journey?.profile)state.journey.profile.avatar=data;
    state.avatarDraft=normalizedAvatar(data);
    renderNexoJourney();
    setJourneyTab('avatar');
    toast('Seu personagem NEXO foi atualizado.');
  }catch(err){
    console.error('save avatar',err);
    toast('Não foi possível salvar o avatar.','error');
  }finally{
    btn.disabled=false;btn.textContent='Salvar personagem';
  }
});


async function openQuestionComments(questionId){
  if(blockMaintenance('community'))return;
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
  const {data,error}=await client.rpc('get_question_comments_v2',{p_question_id:Number(questionId)});
  if(error){console.error(error);$('#questionComments').innerHTML='<div class="comment-empty">Não foi possível carregar os comentários.</div>';return}
  $('#questionComments').innerHTML=data?.length?data.map((c,index)=>`<article class="comment-item">
    <div class="comment-top"><div class="comment-author"><span class="comment-social-avatar" data-comment-avatar="${index}"></span><div class="comment-meta"><b>${esc(c.author_name)} ${c.is_mine&&isNexoUltra()?'<i class="comment-plus-badge ultra">ULTRA</i>':c.plan==='plus'?'<i class="comment-plus-badge">PLUS</i>':''}</b><small>NV. ${Number(c.level||1)} · ${esc(c.league||'Bronze')} · ${new Date(c.created_at).toLocaleString('pt-BR')}</small></div></div>
    <div class="comment-actions">${c.is_mine?'<button data-delete-comment="'+c.id+'" class="danger">Excluir</button>':'<button data-report-comment="'+c.id+'">Denunciar</button>'}</div></div>
    <p>${esc(c.body)}</p>
  </article>`).join(''):'<div class="comment-empty">Ainda não há comentários. Seja o primeiro a compartilhar uma dúvida ou um jeito de resolver.</div>';
  $$('[data-comment-avatar]',$('#questionComments')).forEach(node=>{
    const row=data[Number(node.dataset.commentAvatar)];
    renderStudentAvatar(node,row?.avatar);
  });
  $$('[data-report-comment]').forEach(b=>b.onclick=()=>reportComment(Number(b.dataset.reportComment)));
  $$('[data-delete-comment]').forEach(b=>b.onclick=()=>deleteComment(Number(b.dataset.deleteComment)));
}

$('#sendComment').onclick=async()=>{
  if(blockMaintenance('community'))return;
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


function nexoStudyPlanContext(text){
  if(!/(minha meta|meu objetivo|quanto estudar|quanto tempo estudar|meu plano|plano de estudo|plano do nexo|areas que escolhi|áreas que escolhi)/i.test(text))return null;
  const goal=Number(state.profile?.goal_score||state.core?.profile?.goal_score||0);
  const minutes=Number(state.profile?.daily_minutes||state.core?.profile?.daily_minutes||0);
  const areas=Array.isArray(state.profile?.difficult_areas)
    ? state.profile.difficult_areas
    : Array.isArray(state.core?.profile?.difficult_areas)?state.core.profile.difficult_areas:[];
  if(!goal&&!minutes&&!areas.length)return null;
  const time=minutes>=60
    ? (minutes===60?'1 hora':minutes===90?'1h30':minutes===120?'2 horas':Math.round(minutes/60*10)/10+' horas')
    : minutes+' minutos';
  return {
    mood:'confiante',
    text:'Seu plano atual no NEXO está configurado'+
      (goal?' com meta de '+goal+' pontos':'')+
      (minutes?' e '+time+' disponíveis por dia':'')+'.'+
      (areas.length?' Suas prioridades iniciais são '+areas.join(' e ')+'.':'')+
      '\n\nEu uso isso como ponto de partida. Conforme você responde questões, o NEXO Core troca essas suposições pelo seu desempenho real.'
  };
}

function nexoSimulationContext(text){
  if(!/(meu (ultimo|último) simulado|analise.*simulado|an[aá]lise.*simulado|o que revisar.*sess[aã]o|resultado.*simulado|como fui.*simulado)/i.test(text))return null;
  const report=state.lastSimulationReport;
  if(!report)return {mood:'pensativo',text:'Ainda não tenho um relatório de simulado aberto nesta conversa. Termine um simulado ou toque em uma sessão na tela de Desempenho e me chame de novo.'};
  const weak=Array.isArray(report.weak_topics)?report.weak_topics:[];
  const top=weak[0];
  return {
    mood:Number(report.accuracy||0)>=70?'confiante':'serio',
    text:'No seu último relatório, você ficou com '+Number(report.accuracy||0)+'% de aproveitamento ('+Number(report.correct||0)+' de '+Number(report.attempts||0)+'). Seu tempo médio foi '+formatStudyDuration(report.avg_seconds||0)+'.\n\n'+
      (top?'Meu primeiro foco seria '+top.topic+' ('+(top.subject||'conteúdo')+'), porque apareceu com '+Number(top.error_rate||0)+'% de erro nesta sessão. Faça uma revisão curta e depois 5–6 questões desse tema antes de repetir outro simulado.':'Não apareceu um tema crítico isolado. Nesse caso, eu focaria em manter o ritmo e revisar os erros individualmente.')
  };
}

async function nexoCoreAssistantContext(text){
  if(!/(o que (eu )?devo estudar|o que estudar agora|qual (e |é )?meu foco|minha prioridade|minhas dificuldades|onde (eu )?estou pior|meu desempenho|meus resultados|o que voce recomenda estudar|o que você recomenda estudar|nexo core)/i.test(text)) return null;
  if(!state.core) await loadNexoCore();
  const core=state.core||{};
  const rec=core.recommended_action;
  const overall=core.overall||{};
  const momentum=core.momentum||{};

  if(!rec){
    return {
      mood:'pensativo',
      text:'O NEXO Core ainda está calibrando seu perfil. Faz algumas questões de pelo menos uma área; depois eu consigo cruzar acertos, erros, tempo e quantidade de tentativas para indicar seu próximo foco.'
    };
  }

  return {
    mood:Number(rec.priority||0)>=65?'serio':'confiante',
    text:'Pelos seus dados, meu foco recomendado agora é '+(rec.subject||rec.area)+' — '+rec.topic+'.\n\n'+
      'Domínio estimado: '+Math.round(Number(rec.mastery||0))+'%. Prioridade: '+Math.round(Number(rec.priority||0))+'%. '+
      'Você respondeu '+Number(momentum.attempts_7d||0)+' questão(ões) nos últimos 7 dias e seu aproveitamento geral está em '+Number(overall.accuracy||0)+'%.\n\n'+
      (rec.reason||'Esse é o ponto com melhor margem de evolução agora.')+
      '\n\nEu sugiro uma sessão de '+Number(rec.size||6)+' questões nesse tema. Você pode tocar em “NEXO Core” na tela inicial para começar.'
  };
}

async function loadAssistantIntents(){
  try{
    const {data,error}=await client.from('assistant_intents')
      .select('key,category,patterns,mood,response_text,response_variants,priority')
      .eq('active',true)
      .order('priority',{ascending:true});
    if(error)throw error;
    state.assistantIntents=data||[];
  }catch(err){
    console.error('assistant intents',err);
    state.assistantIntents=[];
  }
}

function normalizeAssistantInput(value=''){
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9\s]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function assistantIntentScore(input,pattern){
  const q=normalizeAssistantInput(input),p=normalizeAssistantInput(pattern);
  if(!q||!p)return 0;
  if(q===p)return 1000+p.length;
  if(q.includes(p))return 700+p.length;
  const qw=new Set(q.split(' ')),pw=p.split(' ').filter(Boolean);
  const hits=pw.filter(w=>qw.has(w)).length;
  return pw.length ? Math.round((hits/pw.length)*400) : 0;
}

function findAssistantIntent(input){
  let best=null,bestScore=0;
  for(const intent of state.assistantIntents||[]){
    const patterns=Array.isArray(intent.patterns)?intent.patterns:[];
    for(const pattern of patterns){
      const score=assistantIntentScore(input,pattern);
      if(score>bestScore){bestScore=score;best=intent}
    }
  }
  return bestScore>=220?best:null;
}

function chooseAssistantText(intent){
  const variants=Array.isArray(intent?.response_variants)?intent.response_variants.filter(Boolean):[];
  const pool=[intent?.response_text,...variants].filter(Boolean);
  return pool.length?pool[Math.floor(Math.random()*pool.length)]:'';
}

async function logAssistantTurn(input,result){
  if(!state.user)return;
  const context=state.current?'question':($('#essayText')?.value?.trim()?'essay':'general');
  const contextId=state.current?String(state.current.id):null;
  try{
    await client.from('assistant_logs').insert({
      user_id:state.user.id,
      input_text:input,
      matched_key:result.key||null,
      matched_category:result.category||null,
      mood:result.mood||null,
      response_text:result.text||null,
      context_type:context,
      context_id:contextId
    });
  }catch(err){console.error('assistant log',err)}
}

async function niaAnswer(text){
  const context=nexoQuestionContext(text);
  if(context)return {...context,key:'question_context',category:'question'};

  const simulationContext=nexoSimulationContext(text);
  if(simulationContext)return {...simulationContext,key:'simulation_report',category:'simulation'};

  const planContext=nexoStudyPlanContext(text);
  if(planContext)return {...planContext,key:'study_plan_profile',category:'adaptive'};

  const coreContext=await nexoCoreAssistantContext(text);
  if(coreContext)return {...coreContext,key:'nexo_core',category:'adaptive'};

  const intent=findAssistantIntent(text);
  if(intent){
    return {
      key:intent.key,
      category:intent.category,
      mood:intent.mood||'feliz',
      text:chooseAssistantText(intent)
    };
  }

  const hit=NEXO_ANSWERS.find(x=>x.k.test(text));
  if(hit)return {
    key:'local_fallback',
    category:'fallback',
    mood:hit.mood||'feliz',
    text:typeof hit.a==='function'?hit.a():hit.a
  };

  return {
    key:'fallback',
    category:'fallback',
    mood:'duvida',
    text:'Eu ainda não tenho uma resposta pronta para esse jeito específico de perguntar, mas consigo continuar com você. Tenta me dizer o objetivo: “me ajuda nessa questão”, “corrige minha redação”, “estou ansioso”, “como estudo isso?” ou “qual regra do ENEM eu preciso saber?”.'
  };
}

function initNexoMascotVisuals(){
  const a=window.NEXO_MASCOT_ASSETS||{};
  const fallback=a.head||'';

  function bindImage(el,src,fallbackSrc=fallback){
    if(!el)return;
    el.removeAttribute('alt');
    el.onerror=()=>{
      if(fallbackSrc && el.src!==fallbackSrc){
        el.onerror=null;
        el.src=fallbackSrc;
      }else{
        el.style.display='none';
      }
    };
    if(src||fallbackSrc){
      el.style.display='block';
      el.src=src||fallbackSrc;
    }else{
      el.style.display='none';
    }
  }

  bindImage($('#nexoLauncherAvatar'),'./assets/nexo-expressions/confiante.avif');
  bindImage($('#nexoAvatarImage'),'./assets/nexo-expressions/confiante.avif');
  bindImage($('#nexoHeroImage'),'./assets/nexo-family/bust-confiante.avif');
  $('[data-nexo-safe-avatar]').forEach(img=>bindImage(img,'./assets/nexo-family/bust-confiante.avif'));

  const stableFallback='./assets/nexo-family/bust-confiante.avif';
  $('.focus-mascot-img,[data-nexo-family],#onboardingMascot,#performanceCoreMascot').forEach(img=>{
    if(!img)return;
    const original=img.getAttribute('src')||stableFallback;
    img.onerror=()=>{
      img.onerror=()=>{
        if(NEXO_BASE_MASCOT)img.src=NEXO_BASE_MASCOT;
      };
      img.src=stableFallback;
    };
    if(!img.getAttribute('src'))img.src=stableFallback;
    else img.src=original;
  });
}
initNexoMascotVisuals();

function nexoBustForMood(mood='confiante'){
  if(['pensativo','serio','duvida'].includes(mood))return NEXO_MEDIA_IMAGES.bustPensativo;
  if(['acolhedor','feliz','calmo'].includes(mood))return NEXO_MEDIA_IMAGES.bustAcolhedor;
  return NEXO_MEDIA_IMAGES.bustConfiante;
}

function setNexoImage(img,src){
  if(!img)return;
  img.onerror=()=>{
    img.onerror=null;
    if(NEXO_BASE_MASCOT)img.src=NEXO_BASE_MASCOT;
  };
  img.src=src||NEXO_BASE_MASCOT;
}

function setNexoMood(mood='feliz'){
  const panel=$('#niaPanel');
  if(panel)panel.dataset.mood=mood;
  const em=$('#nexoEmotion');
  if(em)em.textContent=NEXO_EMOTIONS[mood]||'🐾';
  const avatar=$('#nexoAvatarImage');
  const launcher=$('#nexoLauncherAvatar');
  const hero=$('#nexoHeroImage');
  const src=NEXO_MOOD_IMAGES[mood]||NEXO_MOOD_IMAGES.feliz;
  setNexoImage(hero,nexoBustForMood(mood));
  setNexoImage(avatar,src);
  if(launcher)setNexoImage(launcher,src);
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

async function askNia(text){
  if(!text?.trim())return;
  const clean=text.trim();
  addNiaMessage(clean,'user');
  setNexoMood('pensativo');
  const panel=$('#niaPanel');
  panel?.classList.add('thinking');
  const typing=addNexoTyping();
  let result;
  try{
    result=await niaAnswer(clean);
  }catch(err){
    console.error('Professor Nexo',err);
    result={key:'error',category:'fallback',mood:'acolhedor',text:'Tive um tropeço para buscar essa resposta. Tenta de novo em alguns segundos; eu continuo aqui com você.'};
  }
  const delay=Math.min(950,Math.max(360,clean.length*8));
  setTimeout(()=>{
    typing.remove();
    panel?.classList.remove('thinking');
    setNexoMood(result.mood||'feliz');
    addNiaMessage(result.text,'bot');
    logAssistantTurn(clean,result);
  },delay);
}

function openProfessorNexo(prompt=''){
  const panel=$('#niaPanel');
  if(!panel)return;
  toggleMenu(false);
  panel.classList.remove('hidden');
  $('#niaButton')?.classList.remove('hidden');
  const active=$('.page.active')?.id||'inicio';
  setNexoMood(active==='redacao'?'serio':active==='questoes'?'pensativo':'feliz');
  if(prompt){
    const input=$('#niaInput');
    if(input)input.value='';
    askNia(prompt);
  }else{
    setTimeout(()=>$('#niaInput')?.focus(),60);
  }
}

$('#niaButton')?.addEventListener('click',()=>{
  const panel=$('#niaPanel');
  if(!panel)return;
  if(panel.classList.contains('hidden'))openProfessorNexo();
  else panel.classList.add('hidden');
});
$('#openNexoFromMenu')?.addEventListener('click',()=>openProfessorNexo());
$('#closeNia')?.addEventListener('click',()=>$('#niaPanel')?.classList.add('hidden'));
$('#niaSend')?.addEventListener('click',()=>{
  const input=$('#niaInput');
  const value=input?.value||'';
  if(input)input.value='';
  if(value.trim())openProfessorNexo(value);
});
$('#niaInput')?.addEventListener('keydown',e=>{
  if(e.key==='Enter'){
    e.preventDefault();
    $('#niaSend')?.click();
  }
});
document.addEventListener('click',e=>{
  const trigger=e.target.closest?.('[data-nia]');
  if(!trigger)return;
  e.preventDefault();
  openProfessorNexo(trigger.dataset.nia||'');
});

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


function healthServiceIcon(key){
  return ({auth:'◎',database:'▦',core:'✦',journey:'♕',edge:'⚡',uploads:'☁'})[key]||'•';
}

function healthStatusText(status){
  if(status==='healthy')return 'Operacional';
  if(status==='warning')return 'Atenção';
  if(status==='down')return 'Indisponível';
  return 'Verificando';
}

function renderOpsBars(target,series){
  const el=$(target); if(!el)return;
  const rows=Array.isArray(series)?series:[];
  const max=Math.max(1,...rows.map(x=>Number(x.count||0)));
  el.innerHTML=rows.length?rows.map((row,index)=>{
    const count=Number(row.count||0);
    const height=Math.max(count?8:3,Math.round(count/max*100));
    const time=row.at?new Date(row.at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'';
    return '<span title="'+esc(time+' · '+count)+'"><i style="height:'+height+'%"></i><small>'+(index%3===0?esc(time):'')+'</small></span>';
  }).join(''):'<div class="journey-empty">Sem dados no período.</div>';
}

function renderMaintenanceModules(modules){
  const el=$('#opsMaintenanceModules'); if(!el)return;
  const rows=Array.isArray(modules)?modules:[];
  el.innerHTML=rows.length?rows.map(module=>{
    const on=Boolean(module.maintenance);
    return '<article class="ops-maintenance-row '+(on?'active':'')+'"><div><b>'+esc(module.label||module.module_key)+'</b><small>'+(on?esc(module.message||'Manutenção ativa'):'Operacional para alunos')+'</small></div><button data-maintenance-key="'+esc(module.module_key)+'" data-maintenance-enabled="'+(on?'0':'1')+'">'+(on?'Reabrir':'Manutenção')+'</button></article>';
  }).join(''):'<p>Nenhum módulo configurado.</p>';
  $$('[data-maintenance-key]',el).forEach(btn=>btn.onclick=async()=>{
    const key=btn.dataset.maintenanceKey;
    const enabled=btn.dataset.maintenanceEnabled==='1';
    let message='';
    if(enabled){
      message=window.prompt('Mensagem que os alunos verão durante a manutenção:','Estamos fazendo uma manutenção rápida neste módulo. Tente novamente em alguns minutos.');
      if(message===null)return;
    }
    await setNexoMaintenance(key,enabled,message||'');
  });
}

function renderNexoHealth(payload){
  const services=Array.isArray(payload?.services)?payload.services:[];
  const grid=$('#nexoHealthGrid');
  if(grid){
    grid.innerHTML=services.length?services.map(service=>{
      const status=['healthy','warning','down'].includes(service.status)?service.status:'checking';
      const latency=Number(service.latency_ms||0);
      return '<article class="health-service '+status+'"><span class="health-dot">'+healthServiceIcon(service.key)+'</span><div><b>'+esc(service.label||service.key||'Serviço')+'</b><small>'+esc(service.detail||healthStatusText(status))+'</small></div><em>'+healthStatusText(status)+(latency?' · '+latency+'ms':'')+'</em></article>';
    }).join(''):'<div class="journey-empty">Nenhum serviço retornado pelo monitor.</div>';
  }

  const overall=$('#healthOverall');
  if(overall){
    const status=['healthy','warning','down'].includes(payload?.overall)?payload.overall:'checking';
    overall.className='health-overall '+status;
    overall.innerHTML='<i></i> '+(status==='healthy'?'Tudo operacional':status==='warning'?'Atenção necessária':status==='down'?'Falha detectada':'Verificando');
  }

  const m=payload?.metrics||{};
  const metrics=$('#nexoHealthMetrics');
  if(metrics)metrics.innerHTML=[
    [m.users,'usuários'],[m.questions,'questões'],[m.attempts,'respostas'],[m.errors_last_15m,'erros / 15 min']
  ].map(([value,label])=>'<span><b>'+(value===null||value===undefined?'—':Number(value).toLocaleString('pt-BR'))+'</b><small>'+label+'</small></span>').join('');

  if($('#opsActiveStudents'))$('#opsActiveStudents').textContent=m.active_students_15m??'—';
  if($('#opsOpenSessions'))$('#opsOpenSessions').textContent=m.open_sessions??'—';
  if($('#opsResponsesMinute'))$('#opsResponsesMinute').textContent=m.responses_per_minute??'—';
  if($('#opsMaintenanceCount'))$('#opsMaintenanceCount').textContent=m.maintenance_modules??'—';

  const checked=$('#healthLastCheck');
  if(checked){
    const date=payload?.checked_at?new Date(payload.checked_at):new Date();
    checked.textContent='Atualizado às '+date.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }

  const errors=$('#nexoHealthErrors');
  const recent=Array.isArray(payload?.recent_errors)?payload.recent_errors:[];
  if(errors)errors.innerHTML=recent.length?recent.map(row=>'<article><span>'+esc(row.area||'app')+'</span><div><b>'+esc(row.code||'runtime')+'</b><p>'+esc(row.message||'Erro sem mensagem')+'</p></div><time>'+new Date(row.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+'</time></article>').join(''):'<div class="health-no-errors">✓ Nenhum erro recente registrado.</div>';

  renderOpsBars('#opsErrorTrend',payload?.trends?.errors_6h||[]);
  renderOpsBars('#opsResponseTrend',payload?.trends?.responses_60m||[]);

  const modules=Array.isArray(payload?.modules)?payload.modules:[];
  if(modules.length){
    state.systemModules=new Map(modules.map(row=>[row.module_key,row]));
    renderMaintenanceModules(modules);
  }

  const incidents=$('#opsIncidentList');
  const rows=Array.isArray(payload?.incidents)?payload.incidents:[];
  if(incidents)incidents.innerHTML=rows.length?rows.map(row=>{
    const ops=row.type==='ops';
    return '<article class="'+(ops?'ops-event':'error-event')+'"><span>'+(ops?'⚙':'!')+'</span><div><b>'+esc(row.area||'app')+' · '+esc(row.code||'evento')+'</b><p>'+esc(row.message||'Sem detalhes')+'</p></div><time>'+new Date(row.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+'</time></article>';
  }).join(''):'<div class="health-no-errors">✓ Nenhum incidente recente.</div>';
}

async function setNexoMaintenance(moduleKey,enabled,message=''){
  if(state.profile?.role!=='admin')return;
  try{
    const {data,error}=await client.functions.invoke('nexo-health',{
      body:{action:'set_maintenance',module_key:moduleKey,enabled:Boolean(enabled),message}
    });
    if(error)throw error;
    if(data?.error)throw new Error(data.error);
    toast(enabled?'Manutenção ativada para este módulo.':'Módulo reaberto para os alunos.');
    await Promise.all([loadSystemModules({silent:true}),loadNexoHealth({silent:true})]);
  }catch(err){
    console.error('maintenance control',err);
    toast('Não foi possível alterar o modo de manutenção.','error');
  }
}

async function loadNexoHealth({silent=false}={}){
  if(state.profile?.role!=='admin')return;
  if(state.healthMonitorLoading)return;
  state.healthMonitorLoading=true;
  const btn=$('#refreshNexoHealth');
  const overall=$('#healthOverall');
  if(btn){btn.disabled=true;btn.textContent='Verificando...';}
  if(overall&&!silent){overall.className='health-overall checking';overall.innerHTML='<i></i> Verificando';}

  try{
    const {data,error}=await client.functions.invoke('nexo-health',{body:{}});
    if(error)throw error;
    if(data?.error)throw new Error(data.error);
    renderNexoHealth(data||{});
  }catch(err){
    console.error('NEXO Health Monitor',err);
    if(overall){overall.className='health-overall down';overall.innerHTML='<i></i> Monitor indisponível';}
    const grid=$('#nexoHealthGrid');
    if(grid)grid.innerHTML='<div class="health-monitor-failure"><b>Não foi possível executar o diagnóstico.</b><span>'+esc(String(err?.message||err||'Falha desconhecida'))+'</span></div>';
    const checked=$('#healthLastCheck');
    if(checked)checked.textContent='Falha na última verificação';
    if(!silent)toast('O Health Monitor não respondeu.','error');
  }finally{
    state.healthMonitorLoading=false;
    if(btn){btn.disabled=false;btn.textContent='Atualizar agora';}
  }
}

$('#refreshNexoHealth')?.addEventListener('click',()=>loadNexoHealth({silent:false}));
setInterval(()=>{
  if(state.user&&state.profile?.role==='admin'&&$('.page.active')?.id==='admin'){
    loadNexoHealth({silent:true});
  }
},30000);
setInterval(()=>{
  if(state.user)loadSystemModules({silent:true});
},60000);

async function checkCloudinarySecurityStatus(){
  const el=$('#cloudinarySecurityStatus');
  if(!el)return;
  el.className='cloudinary-security-status checking';
  el.textContent='Verificando proteção dos uploads...';
  const auth=await getCloudinaryUploadAuth();
  if(auth){
    el.className='cloudinary-security-status safe';
    el.textContent='✓ Upload assinado ativo — arquivos protegidos por autenticação de administrador.';
  }else{
    el.className='cloudinary-security-status warning';
    el.textContent='⚠ Upload assinado indisponível. Confira o CLOUDINARY_API_SECRET no Supabase antes de enviar arquivos.';
  }
}

async function loadAdminUsers(){
  if(state.profile?.role!=='admin')return;
  const list=$('#adminUserList');
  if(list)list.innerHTML='<div class="admin-user-empty">Carregando contas...</div>';
  try{
    const {data,error}=await client.functions.invoke('admin-users',{body:{action:'list'}});
    if(error)throw error;
    if(data?.error)throw new Error(data.error);
    state.adminUsers=Array.isArray(data?.users)?data.users:[];
    renderAdminUsers();
  }catch(err){
    console.error('admin users',err);
    if(list)list.innerHTML='<div class="admin-user-empty">Não foi possível carregar as contas.</div>';
  }
}

function renderAdminUsers(){
  const list=$('#adminUserList');
  if(!list)return;
  const q=($('#adminUserSearch')?.value||'').trim().toLowerCase();
  const users=state.adminUsers.filter(u=>!q||[u.full_name,u.email,u.role].filter(Boolean).join(' ').toLowerCase().includes(q));
  list.innerHTML=users.length?users.map(u=>{
    const isAdmin=u.role==='admin';
    const current=Boolean(u.is_current_user);
    const name=u.full_name||u.email?.split('@')[0]||'Usuário';
    return `<article class="admin-user-row">
      <div class="admin-user-avatar">${esc(initials(name))}</div>
      <div class="admin-user-info">
        <b>${esc(name)} ${current?'<span class="you-chip">VOCÊ</span>':''}</b>
        <small>${esc(u.email||'Sem e-mail')}</small>
        <span class="role-chip ${isAdmin?'admin':'student'}">${isAdmin?'Administrador':'Aluno'}</span>
      </div>
      <div class="admin-user-action">
        ${current
          ? '<button disabled title="Você não pode remover seu próprio acesso por aqui">Administrador</button>'
          : isAdmin
            ? '<button class="danger" data-set-user-role="'+u.id+'" data-role="student">Remover admin</button>'
            : '<button class="promote" data-set-user-role="'+u.id+'" data-role="admin">Tornar admin</button>'}
      </div>
    </article>`;
  }).join(''):'<div class="admin-user-empty">Nenhuma conta encontrada.</div>';

  list.querySelectorAll('[data-set-user-role]').forEach(btn=>{
    btn.onclick=()=>setAdminUserRole(btn.dataset.setUserRole,btn.dataset.role);
  });
}

async function setAdminUserRole(userId,role){
  const user=state.adminUsers.find(u=>u.id===userId);
  if(!user)return;
  const name=user.full_name||user.email||'esta conta';
  const promoting=role==='admin';
  const message=promoting
    ? 'Dar acesso de administrador para '+name+'? Essa pessoa poderá publicar conteúdo e gerenciar a plataforma.'
    : 'Remover o acesso de administrador de '+name+'?';
  if(!confirm(message))return;

  try{
    const {data,error}=await client.functions.invoke('admin-users',{
      body:{action:'set_role',target_user_id:userId,role}
    });
    if(error)throw error;
    if(data?.error)throw new Error(data.error);
    toast(promoting?'Administrador adicionado.':'Acesso de administrador removido.');
    await loadAdminUsers();
    await loadAdmin();
  }catch(err){
    console.error('set admin role',err);
    const msg=String(err?.message||err||'');
    toast(msg.includes('cannot_remove_own_admin')?'Você não pode remover seu próprio acesso.':'Não foi possível alterar o acesso dessa conta.','error');
  }
}

$('#adminUserSearch')?.addEventListener('input',renderAdminUsers);
$('#refreshAdminUsers')?.addEventListener('click',loadAdminUsers);

async function loadAdmin(){
  if(state.profile?.role!=='admin')return;
  loadNexoHealth({silent:true});
  checkCloudinarySecurityStatus();
  loadAdminUsers();
  const [profiles,attempts,feedbacks,videosCount,materialsCount,progressRows,videosRows,materialsRows]=await Promise.all([
    client.from('profiles').select('*',{count:'exact',head:true}),
    client.from('question_attempts').select('*',{count:'exact',head:true}),
    client.from('feedback').select('*',{count:'exact',head:true}),
    client.from('videos').select('*',{count:'exact',head:true}),
    client.from('materials').select('*',{count:'exact',head:true}),
    client.from('content_progress').select('content_type,content_id,completed'),
    client.from('videos').select('id,title,area,subject,topic,is_published,plus_only,created_at,video_url,cloudinary_public_id').order('created_at',{ascending:false}).limit(100),
    client.from('materials').select('id,title,area,subject,topic,is_published,plus_only,created_at,file_url,cloudinary_public_id,format').order('created_at',{ascending:false}).limit(100)
  ]);
  const totalViews=(progressRows.data||[]).length;
  $('#adminStats').innerHTML=[
    ['Usuários',profiles.count||0],
    ['Respostas',attempts.count||0],
    ['Videoaulas',videosCount.count||0],
    ['Materiais',materialsCount.count||0],
    ['Aberturas',totalViews]
  ].map(x=>`<article class="admin-stat"><small>${x[0]}</small><b>${x[1]}</b></article>`).join('');

  const {data}=await client.from('feedback').select('id,rating,message,status,created_at,user_id').order('created_at',{ascending:false}).limit(60);
  $('#adminFeedbacks').innerHTML=data?.length?data.map(x=>`<div class="feedback-entry"><span class="mini-avatar">N</span><div><b><span class="stars">${'★'.repeat(x.rating)}${'☆'.repeat(5-x.rating)}</span></b><p>${esc(x.message)}</p><small>${new Date(x.created_at).toLocaleString('pt-BR')} · ${esc(x.status)}</small></div></div>`).join(''):'<p style="color:var(--muted)">Nenhum feedback recebido.</p>';

  const reports=await client.rpc('get_reported_comments');
  $('#reportedComments').innerHTML=reports.data?.length?reports.data.map(x=>`<div class="feedback-entry"><span class="mini-avatar">!</span><div><b>${esc(x.author_name)} · ${x.report_count} denúncia(s)</b><p>${esc(x.body)}</p><small>Questão #${x.question_id}</small><div class="comment-actions"><button data-admin-remove="${x.comment_id}" class="danger">Remover comentário</button></div></div></div>`).join(''):'<p style="color:var(--muted)">Nenhum comentário denunciado.</p>';
  $$('[data-admin-remove]').forEach(b=>b.onclick=async()=>{if(!confirm('Remover este comentário da comunidade?'))return;const {error}=await client.rpc('admin_remove_comment',{p_comment_id:Number(b.dataset.adminRemove)});if(error)return toast('Falha ao remover.','error');toast('Comentário removido.');loadAdmin()});

  const counts=new Map();
  for(const row of progressRows.data||[]){
    const key=contentKey(row.content_type,row.content_id);
    const stat=counts.get(key)||{views:0,completed:0};
    stat.views++;if(row.completed)stat.completed++;
    counts.set(key,stat);
  }
  renderAdminContentList('video',videosRows.data||[],counts);
  renderAdminContentList('material',materialsRows.data||[],counts);
}

function renderAdminContentList(type,rows,counts){
  const target=type==='video'?$('#adminVideoList'):$('#adminMaterialList');
  if(!target)return;
  target.innerHTML=rows.length?rows.map(row=>{
    const stat=counts.get(contentKey(type,row.id))||{views:0,completed:0};
    return `<div class="admin-content-row">
      <div><b>${esc(row.title)}</b><small>${esc([row.subject,row.topic].filter(Boolean).join(' · '))}</small><small>${stat.views} abertura(s) · ${stat.completed} conclusão(ões)</small></div>
      <div class="admin-content-flags">
        <span class="status-pill ${row.is_published?'published':'draft'}">${row.is_published?'Publicado':'Oculto'}</span>
        ${row.plus_only?'<span class="status-pill plus">PLUS</span>':'<span class="status-pill free">FREE</span>'}
      </div>
      <div class="admin-content-actions">
        <button data-admin-edit="${type}:${row.id}">Editar</button>
        <button data-admin-plus="${type}:${row.id}">${row.plus_only?'Tornar Free':'Tornar Plus'}</button>
        <button data-admin-toggle="${type}:${row.id}">${row.is_published?'Ocultar':'Publicar'}</button>
        <button class="danger" data-admin-delete="${type}:${row.id}">Remover</button>
      </div>
    </div>`;
  }).join(''):'<p style="color:var(--muted)">Nenhum conteúdo cadastrado.</p>';
  target.querySelectorAll('[data-admin-edit]').forEach(b=>b.onclick=()=>editAdminContent(b.dataset.adminEdit));
  target.querySelectorAll('[data-admin-plus]').forEach(b=>b.onclick=()=>toggleAdminPlusContent(b.dataset.adminPlus));
  target.querySelectorAll('[data-admin-toggle]').forEach(b=>b.onclick=()=>toggleAdminContent(b.dataset.adminToggle));
  target.querySelectorAll('[data-admin-delete]').forEach(b=>b.onclick=()=>deleteAdminContent(b.dataset.adminDelete));
}

function parseAdminContentKey(value){
  const [type,id]=String(value||'').split(':');
  return {type,id:Number(id),table:type==='video'?'videos':'materials'};
}
async function editAdminContent(value){
  const {type,id,table}=parseAdminContentKey(value);
  const source=(type==='video'?state.videos:state.materials).find(x=>Number(x.id)===id);
  const fallback=await client.from(table).select('title,subject,topic,area,description').eq('id',id).maybeSingle();
  const item=source||fallback.data||{};
  const title=prompt('Título',item.title||'');if(title===null)return;
  const subject=prompt('Matéria',item.subject||'');if(subject===null)return;
  const topic=prompt('Tema',item.topic||'');if(topic===null)return;
  const description=prompt('Descrição',item.description||'');if(description===null)return;
  const {error}=await client.from(table).update({title:title.trim(),subject:subject.trim(),topic:topic.trim()||null,description:description.trim()||null,updated_at:new Date().toISOString()}).eq('id',id);
  if(error)return toast('Não foi possível editar.','error');
  toast('Conteúdo atualizado.');
  await loadAdmin();
  if(type==='video')loadVideos();else loadMaterials();
}
async function toggleAdminPlusContent(value){
  const {type,id,table}=parseAdminContentKey(value);
  const {data,error}=await client.from(table).select('plus_only').eq('id',id).single();
  if(error)return toast('Não foi possível alterar o plano do conteúdo.','error');
  const next=!Boolean(data.plus_only);
  const {error:updateError}=await client.from(table).update({plus_only:next,updated_at:new Date().toISOString()}).eq('id',id);
  if(updateError)return toast('Não foi possível alterar o plano do conteúdo.','error');
  toast(next?'Conteúdo marcado como NEXO Plus.':'Conteúdo liberado no plano Free.');
  await loadAdmin();
  if(type==='video')loadVideos();else loadMaterials();
}

async function toggleAdminContent(value){
  const {type,id,table}=parseAdminContentKey(value);
  const {data,error}=await client.from(table).select('is_published').eq('id',id).single();
  if(error)return toast('Não foi possível alterar publicação.','error');
  const {error:updateError}=await client.from(table).update({is_published:!data.is_published,updated_at:new Date().toISOString()}).eq('id',id);
  if(updateError)return toast('Não foi possível alterar publicação.','error');
  toast(data.is_published?'Conteúdo ocultado.':'Conteúdo publicado.');
  await loadAdmin();
  if(type==='video')loadVideos();else loadMaterials();
}
async function deleteAdminContent(value){
  const {type,id,table}=parseAdminContentKey(value);
  if(!confirm('Remover este conteúdo? Se a exclusão segura do Cloudinary estiver configurada, o arquivo também será apagado de lá.'))return;

  const fields=type==='video'?'cloudinary_public_id':'cloudinary_public_id,resource_type';
  const {data:asset}=await client.from(table).select(fields).eq('id',id).maybeSingle();
  let cloudDeleted=false;
  if(asset?.cloudinary_public_id){
    try{
      const {data,error}=await client.functions.invoke('cloudinary-destroy',{
        body:{
          public_id:asset.cloudinary_public_id,
          resource_type:type==='video'?'video':(asset.resource_type||'image')
        }
      });
      cloudDeleted=!error&&Boolean(data?.ok);
    }catch(err){console.warn('cloudinary destroy unavailable',err)}
  }

  const {error}=await client.from(table).delete().eq('id',id);
  if(error)return toast('Não foi possível remover.','error');
  toast(cloudDeleted?'Conteúdo e arquivo removidos.':'Conteúdo removido do NEXO. O arquivo do Cloudinary pode continuar armazenado.');
  await loadAdmin();
  if(type==='video')loadVideos();else loadMaterials();
}

$('#addVideo').onclick=async()=>{
  if(state.profile?.role!=='admin')return toast('Acesso restrito.','error');
  const title=$('#videoTitle').value.trim(),area=$('#videoArea').value,subject=$('#videoSubject').value.trim(),topic=$('#videoTopic').value.trim(),description=$('#videoDescription')?.value.trim()||'';
  const external=$('#videoUrl').value.trim(),file=$('#videoFile').files[0],plus_only=Boolean($('#videoPlusOnly')?.checked);
  if(!title||!subject||(!file&&!/^https?:\/\//i.test(external)))return toast('Preencha título, matéria e um arquivo ou URL válida.','error');
  if(file&&!/^video\//i.test(file.type||''))return toast('Selecione um arquivo de vídeo válido.','error');

  const status=$('#uploadStatus');
  status.classList.remove('hidden');
  status.textContent=file?'Preparando envio para o Cloudinary...':'Publicando URL externa...';

  let video_url=external,storage_path=null;
  let cloudinary_public_id=null,upload_format=null,upload_bytes=null,upload_duration=null,upload_thumbnail=null;
  try{
    if(file){
      const uploaded=await uploadToCloudinary(file,pct=>{
        status.textContent=pct<100?`Enviando ao Cloudinary... ${pct}%`:'Upload concluído. Salvando no NEXO...';
      });
      video_url=uploaded.secure_url;
      storage_path=`cloudinary:${uploaded.resource_type||'auto'}:${uploaded.public_id}`;
      cloudinary_public_id=uploaded.public_id||null;
      upload_format=uploaded.format||null;
      upload_bytes=Number(uploaded.bytes||file.size||0)||null;
      upload_duration=Math.round(Number(uploaded.duration||0))||null;
      upload_thumbnail=uploaded.resource_type==='video'?cloudinaryVideoPoster(uploaded.secure_url):null;
    }

    const {error}=await client.from('videos').insert({
      title,description:description||null,area,subject,topic,video_url,storage_path,
      cloudinary_public_id,
      format:upload_format,
      bytes:upload_bytes,
      duration_seconds:upload_duration,
      thumbnail_url:upload_thumbnail,
      plus_only,
      created_by:state.user.id,is_published:true
    });
    if(error)throw error;

    status.textContent=file?'Videoaula publicada no Cloudinary com sucesso.':'Videoaula publicada com sucesso.';
    $('#videoTitle').value=$('#videoSubject').value=$('#videoTopic').value=$('#videoUrl').value='';if($('#videoDescription'))$('#videoDescription').value='';
    $('#videoFile').value='';if($('#videoPlusOnly'))$('#videoPlusOnly').checked=false;
    toast(plus_only?'Videoaula publicada como conteúdo Plus.':'Videoaula publicada.');
    await loadAdmin();
  }catch(err){
    console.error(err);
    status.textContent='Falha no upload/publicação: '+String(err?.message||err||'erro desconhecido');
    toast('Não foi possível publicar a videoaula.','error');
  }
};

$('#addMaterial').onclick=async()=>{
  if(state.profile?.role!=='admin')return toast('Acesso restrito.','error');

  const title=$('#materialTitle').value.trim();
  const area=$('#materialArea').value;
  const subject=$('#materialSubject').value.trim();
  const topic=$('#materialTopic').value.trim();
  const description=$('#materialDescription').value.trim();
  const plus_only=Boolean($('#materialPlusOnly')?.checked);
  const file=$('#materialFile').files[0];

  if(!title||!subject||!file)return toast('Preencha título, matéria e selecione um PDF ou imagem.','error');
  const isPdf=file.type==='application/pdf'||/\.pdf$/i.test(file.name||'');
  const isImage=/^image\//i.test(file.type||'');
  if(!isPdf&&!isImage)return toast('Envie um PDF ou uma imagem.','error');

  const status=$('#materialUploadStatus');
  status.classList.remove('hidden');
  status.textContent='Preparando envio para o Cloudinary...';

  try{
    const uploaded=await uploadToCloudinary(file,pct=>{
      status.textContent=pct<100?`Enviando ao Cloudinary... ${pct}%`:'Upload concluído. Salvando no NEXO...';
    });

    const {error}=await client.from('materials').insert({
      title,
      description:description||null,
      area,
      subject,
      topic:topic||null,
      file_url:uploaded.secure_url,
      cloudinary_public_id:uploaded.public_id||null,
      resource_type:uploaded.resource_type||null,
      format:uploaded.format||(isPdf?'pdf':null),
      bytes:Number(uploaded.bytes||file.size||0)||null,
      plus_only,
      created_by:state.user.id,
      is_published:true
    });
    if(error)throw error;

    status.textContent='Material publicado no Cloudinary com sucesso.';
    $('#materialTitle').value=$('#materialSubject').value=$('#materialTopic').value=$('#materialDescription').value='';
    $('#materialFile').value='';if($('#materialPlusOnly'))$('#materialPlusOnly').checked=false;
    toast(plus_only?'Material publicado como conteúdo Plus.':'Material publicado.');
    await loadAdmin();
  }catch(err){
    console.error(err);
    status.textContent='Falha no upload/publicação: '+String(err?.message||err||'erro desconhecido');
    toast('Não foi possível publicar o material.','error');
  }
};

window.addEventListener('resize',()=>{if(innerWidth>760)toggleMenu(false)});

// Importante: inicia a restauração da sessão somente após todo o arquivo ter
// terminado de declarar NEXO_EMOTIONS, imagens, Jornada e demais constantes.
queueMicrotask(startAuthBootstrap);
})();