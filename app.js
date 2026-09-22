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
  {id:6,axis:'Cultura',title:'A preservação do patrimônio cultural diante das transformações digitais',prompt:'Analise como preservar memória e patrimônio cultural em uma sociedade cada vez mais digital.'},

  {id:7,axis:'Educação',title:'Desafios para reduzir a evasão escolar no ensino médio brasileiro',prompt:'Analise fatores que afastam estudantes da escola e proponha caminhos para fortalecer permanência, aprendizagem e perspectiva de futuro.'},
  {id:8,axis:'Educação',title:'A valorização da leitura na formação de jovens brasileiros',prompt:'Discuta os obstáculos à formação de leitores e proponha ações que aproximem adolescentes da literatura e de práticas de leitura.'},
  {id:9,axis:'Educação',title:'Desigualdades de acesso a oportunidades educacionais no Brasil',prompt:'Analise como diferenças sociais e territoriais afetam trajetórias escolares e proponha medidas para ampliar a equidade educacional.'},
  {id:10,axis:'Educação',title:'A valorização dos profissionais da educação na qualidade do ensino',prompt:'Discuta a relação entre condições de trabalho, formação docente e qualidade educacional, propondo ações de valorização profissional.'},

  {id:11,axis:'Tecnologia e sociedade',title:'Privacidade e proteção de dados na vida digital dos brasileiros',prompt:'Analise riscos relacionados à exposição de dados pessoais e proponha medidas de educação e proteção para o uso seguro de serviços digitais.'},
  {id:12,axis:'Tecnologia e sociedade',title:'Os efeitos do uso excessivo de telas na infância',prompt:'Discuta impactos do tempo excessivo de tela no desenvolvimento infantil e proponha formas de promover hábitos digitais mais equilibrados.'},
  {id:13,axis:'Tecnologia e sociedade',title:'Inclusão digital de pessoas idosas no Brasil',prompt:'Analise barreiras enfrentadas por pessoas idosas no acesso a tecnologias e proponha iniciativas para ampliar autonomia e participação digital.'},
  {id:14,axis:'Tecnologia e sociedade',title:'Cyberbullying e violência digital entre adolescentes',prompt:'Discuta causas e consequências da violência praticada em ambientes digitais e proponha estratégias de prevenção, educação e acolhimento.'},

  {id:15,axis:'Trabalho',title:'Desafios para a inserção dos jovens no mercado de trabalho brasileiro',prompt:'Analise obstáculos enfrentados por jovens em busca do primeiro emprego e proponha ações de qualificação e ampliação de oportunidades.'},
  {id:16,axis:'Trabalho',title:'Automação e requalificação profissional no mundo do trabalho',prompt:'Discuta como transformações tecnológicas alteram profissões e proponha caminhos para preparar trabalhadores para novas demandas profissionais.'},
  {id:17,axis:'Trabalho',title:'A invisibilidade do trabalho de cuidado na sociedade brasileira',prompt:'Analise a importância social e econômica das atividades de cuidado e proponha medidas para seu reconhecimento e melhor distribuição.'},
  {id:18,axis:'Trabalho',title:'Caminhos para combater a informalidade e a precarização do trabalho juvenil',prompt:'Discuta fatores que levam jovens a ocupações precárias e proponha medidas para ampliar proteção, qualificação e acesso a trabalho digno.'},

  {id:19,axis:'Meio ambiente',title:'O descarte de lixo eletrônico e seus impactos no Brasil',prompt:'Analise os desafios do descarte de equipamentos eletrônicos e proponha ações de consumo responsável, coleta adequada e reciclagem.'},
  {id:20,axis:'Meio ambiente',title:'Adaptação das cidades brasileiras aos eventos climáticos extremos',prompt:'Discuta a vulnerabilidade urbana diante de calor intenso, enchentes e outros eventos extremos e proponha estratégias de prevenção e adaptação.'},
  {id:21,axis:'Meio ambiente',title:'Desperdício de alimentos e sustentabilidade no Brasil',prompt:'Analise causas e consequências do desperdício de alimentos e proponha ações para reduzir perdas em residências, comércio e cadeias produtivas.'},
  {id:22,axis:'Meio ambiente',title:'Uso consciente da água diante dos desafios de abastecimento',prompt:'Discuta fatores que pressionam os recursos hídricos e proponha estratégias de educação, gestão e consumo responsável da água.'},
  {id:23,axis:'Meio ambiente',title:'Saneamento básico e qualidade de vida nas cidades brasileiras',prompt:'Analise os impactos da falta de saneamento na saúde e no meio ambiente e proponha caminhos para ampliar o acesso a serviços adequados.'},

  {id:24,axis:'Saúde pública',title:'Sedentarismo entre jovens e promoção de hábitos saudáveis',prompt:'Analise fatores que favorecem o sedentarismo entre adolescentes e proponha ações para estimular atividade física e hábitos de vida saudáveis.'},
  {id:25,axis:'Saúde pública',title:'Desafios para fortalecer a confiança em campanhas de vacinação',prompt:'Discuta fatores que dificultam a adesão a campanhas de vacinação e proponha estratégias de comunicação, informação e acesso.'},
  {id:26,axis:'Saúde pública',title:'Promoção da saúde menstrual e combate à desinformação',prompt:'Analise obstáculos ao acesso a informação, produtos e cuidados relacionados à saúde menstrual e proponha medidas de educação e acolhimento.'},
  {id:27,axis:'Saúde pública',title:'Alimentação saudável diante da expansão dos ultraprocessados',prompt:'Discuta fatores que influenciam escolhas alimentares e proponha ações de educação e acesso que favoreçam uma alimentação mais saudável.'},

  {id:28,axis:'Cidadania',title:'Educação financeira e prevenção do endividamento entre jovens',prompt:'Analise a importância da educação financeira na juventude e proponha estratégias para estimular planejamento, consumo consciente e uso responsável do crédito.'},
  {id:29,axis:'Cidadania',title:'Solidão e enfraquecimento dos vínculos comunitários na vida contemporânea',prompt:'Discuta fatores que contribuem para o isolamento social e proponha ações capazes de fortalecer convivência, pertencimento e redes de apoio.'},
  {id:30,axis:'Cidadania',title:'Desafios para ampliar a participação social dos jovens em suas comunidades',prompt:'Analise barreiras à participação juvenil em iniciativas coletivas e proponha formas de estimular protagonismo, diálogo e ação comunitária.'},
  {id:31,axis:'Cidadania',title:'Combate ao trabalho infantil e garantia do direito à infância',prompt:'Analise fatores que mantêm crianças e adolescentes em situações de trabalho inadequado e proponha medidas de prevenção, proteção e permanência escolar.'},

  {id:32,axis:'Inclusão e acessibilidade',title:'Acessibilidade digital para pessoas com deficiência',prompt:'Discuta barreiras encontradas por pessoas com deficiência em sites, aplicativos e serviços digitais e proponha medidas para ampliar acessibilidade e autonomia.'},
  {id:33,axis:'Inclusão e acessibilidade',title:'Desafios da acessibilidade nos espaços urbanos brasileiros',prompt:'Analise obstáculos físicos e sociais à circulação de pessoas com deficiência e proponha ações para tornar as cidades mais inclusivas.'},
  {id:34,axis:'Inclusão e acessibilidade',title:'Etarismo e inclusão das pessoas idosas na sociedade brasileira',prompt:'Discuta formas de discriminação relacionadas à idade e proponha ações que valorizem autonomia, convivência e participação social das pessoas idosas.'},

  {id:35,axis:'Cultura',title:'Democratização do acesso à cultura no Brasil',prompt:'Analise barreiras econômicas, territoriais e sociais ao acesso a atividades culturais e proponha medidas para ampliar a participação da população.'},
  {id:36,axis:'Cultura',title:'Valorização das culturas indígenas e afro-brasileiras na formação social do país',prompt:'Discuta a importância da valorização de patrimônios, saberes e produções culturais indígenas e afro-brasileiras e proponha ações de reconhecimento e difusão.'},
  {id:37,axis:'Cultura',title:'Preservação das tradições e identidades culturais regionais brasileiras',prompt:'Analise desafios para manter vivas tradições regionais em meio às transformações sociais e proponha ações de registro, transmissão e valorização cultural.'},

  {id:38,axis:'Urbanização',title:'Déficit de áreas verdes e qualidade de vida nas cidades',prompt:'Discuta a importância de parques, arborização e espaços verdes urbanos e proponha estratégias para ampliar seu acesso de forma equilibrada.'},
  {id:39,axis:'Urbanização',title:'Moradia digna e segregação socioespacial nas cidades brasileiras',prompt:'Analise como desigualdades de moradia afetam o direito à cidade e proponha caminhos para ampliar habitação adequada e integração urbana.'},
  {id:40,axis:'Urbanização',title:'Segurança de pedestres e ciclistas no trânsito brasileiro',prompt:'Discuta fatores que aumentam a vulnerabilidade de pedestres e ciclistas e proponha ações de infraestrutura, educação e fiscalização para reduzir riscos.'},
  {id:41,axis:'Urbanização',title:'O acesso ao lazer e aos espaços públicos como fator de bem-estar',prompt:'Analise a importância de espaços públicos de convivência e lazer e proponha medidas para ampliar seu acesso, segurança e qualidade.'},

  {id:42,axis:'Ciência e sociedade',title:'Divulgação científica como ferramenta de combate à desinformação',prompt:'Discuta a importância da comunicação científica acessível e proponha estratégias para aproximar conhecimento científico e população.'},
  {id:43,axis:'Ciência e sociedade',title:'Incentivo à participação de jovens na ciência e na inovação',prompt:'Analise obstáculos que afastam estudantes de atividades científicas e proponha ações para ampliar iniciação científica, experimentação e interesse pela pesquisa.'},

  {id:44,axis:'Consumo',title:'Consumo consciente diante do crescimento da moda descartável',prompt:'Analise impactos sociais e ambientais do consumo acelerado de roupas e proponha estratégias para estimular escolhas mais responsáveis.'},
  {id:45,axis:'Consumo',title:'Publicidade digital e formação de hábitos de consumo entre adolescentes',prompt:'Discuta como publicidade personalizada e influenciadores afetam decisões de consumo de jovens e proponha medidas de educação para escolhas mais conscientes.'},

  {id:46,axis:'Proteção e prevenção',title:'Prevenção de desastres e cultura de redução de riscos nas cidades brasileiras',prompt:'Analise a importância do planejamento preventivo diante de enchentes, deslizamentos e outros desastres e proponha ações de informação, infraestrutura e preparação comunitária.'}
];


const NEXO_SUBTOPICS=Object.freeze({
  'Estatística e análise de dados':[
    {name:'Média e medidas centrais',keys:['média','media','mediana','moda']},
    {name:'Gráficos e tabelas',keys:['gráfico','grafico','tabela','coluna','barra','histograma']},
    {name:'Dispersão e comparação',keys:['desvio','amplitude','dispersão','dispersao']},
    {name:'Leitura de dados',keys:['percentual','frequência','frequencia','dados']}
  ],
  'Geometria e trigonometria':[
    {name:'Áreas e perímetros',keys:['área','area','perímetro','perimetro']},
    {name:'Pitágoras e triângulos',keys:['pitágoras','pitagoras','hipotenusa','triângulo','triangulo']},
    {name:'Escala e semelhança',keys:['escala','semelhança','semelhanca']},
    {name:'Trigonometria',keys:['seno','cosseno','tangente','ângulo','angulo']},
    {name:'Sólidos e volume',keys:['volume','cilindro','cone','esfera','prisma']}
  ],
  'Porcentagem e matemática financeira':[
    {name:'Porcentagem',keys:['porcentagem','percentual','%']},
    {name:'Variação percentual',keys:['aumento','redução','reducao','variação','variacao']},
    {name:'Juros',keys:['juros','taxa','capital','montante']},
    {name:'Descontos e preços',keys:['desconto','preço','preco','promoção','promocao']}
  ],
  'Probabilidade e combinatória':[
    {name:'Probabilidade simples',keys:['probabilidade','chance','evento']},
    {name:'Contagem',keys:['combinação','combinacao','arranjo','permutação','permutacao']},
    {name:'Princípio multiplicativo',keys:['possibilidades','maneiras','formas diferentes']},
    {name:'Probabilidade condicional',keys:['dado que','condicional']}
  ],
  'Funções e modelagem':[
    {name:'Função afim',keys:['função afim','funcao afim','reta','1º grau','primeiro grau']},
    {name:'Função quadrática',keys:['quadrática','quadratica','parábola','parabola','2º grau']},
    {name:'Gráficos',keys:['gráfico','grafico','eixo','coordenada']},
    {name:'Modelagem',keys:['modelo','expressão','expressao','equação','equacao']}
  ],
  'Raciocínio quantitativo':[
    {name:'Taxas e razões',keys:['taxa','razão','razao','por unidade']},
    {name:'Estimativa',keys:['aproximadamente','estimativa','aprox']},
    {name:'Conversão de unidades',keys:['km','metro','litro','minuto','hora','unidade']},
    {name:'Comparação quantitativa',keys:['comparar','maior','menor','proporção','proporcao']}
  ],
  'Mecânica':[
    {name:'Cinemática',keys:['velocidade','aceleração','aceleracao','deslocamento','movimento']},
    {name:'Forças e Newton',keys:['força','forca','newton','atrito','peso']},
    {name:'Energia e trabalho',keys:['energia','trabalho','cinética','cinetica','potencial']},
    {name:'Potência e impulso',keys:['potência','potencia','impulso','quantidade de movimento']}
  ],
  'Genética e evolução':[
    {name:'Mendel e heredogramas',keys:['mendel','alelo','genótipo','genotipo','heredograma']},
    {name:'DNA e genética molecular',keys:['dna','rna','gene','cromossomo','proteína','proteina']},
    {name:'Seleção natural',keys:['seleção','selecao','adaptação','adaptacao']},
    {name:'Evolução e variabilidade',keys:['evolução','evolucao','mutação','mutacao','variabilidade']}
  ],
  'Estequiometria e soluções':[
    {name:'Mol e massa molar',keys:['mol','massa molar']},
    {name:'Estequiometria',keys:['estequiometr','balanceamento','reagente','produto']},
    {name:'Concentração',keys:['concentração','concentracao','soluto','solução','solucao']},
    {name:'Diluição',keys:['diluição','diluicao','diluir']}
  ],
  'Brasil Colônia e Império':[
    {name:'Colonização',keys:['colonização','colonizacao','capitania','metrópole','metropole']},
    {name:'Escravidão e resistência',keys:['escravid','quilombo','resistência','resistencia']},
    {name:'Independência',keys:['independência','independencia','1822']},
    {name:'Império e cidadania',keys:['império','imperio','monarquia','cidadania','abolição','abolicao']}
  ],
  'Urbanização e população':[
    {name:'Urbanização',keys:['urbanização','urbanizacao','cidade','metrópole','metropole']},
    {name:'Migrações',keys:['migração','migracao','migratório','migratorio']},
    {name:'Demografia',keys:['natalidade','mortalidade','pirâmide etária','piramide etaria','população','populacao']},
    {name:'Segregação e rede urbana',keys:['segregação','segregacao','rede urbana','periferia']}
  ],
  'Variação linguística e linguagem':[
    {name:'Variação linguística',keys:['variação','variacao','regional','dialeto']},
    {name:'Registro e adequação',keys:['formal','informal','registro','adequação','adequacao']},
    {name:'Preconceito linguístico',keys:['preconceito linguístico','preconceito linguistico']},
    {name:'Efeito de sentido',keys:['efeito de sentido','gíria','giria','oralidade']}
  ],
  'Leitura e compreensão':[
    {name:'Compreensão global',keys:['main idea','tema','assunto','purpose','propósito','proposito']},
    {name:'Inferência',keys:['infer','imply','implied','deduz','concluir']},
    {name:'Referência e conectores',keys:['reference','refer','pronoun','however','therefore','pero','aunque']},
    {name:'Vocabulário em contexto',keys:['meaning','word','expressão','expressao','significa']}
  ],
  'Análise do texto literário':[
    {name:'Voz e foco',keys:['eu lírico','eu lirico','narrador','voz']},
    {name:'Figuras e efeitos',keys:['metáfora','metafora','ironia','figura','efeito']},
    {name:'Forma e linguagem',keys:['verso','ritmo','rima','linguagem']},
    {name:'Contexto literário',keys:['modernismo','romantismo','realismo','movimento']}
  ]
});

function normalizeTextKey(value=''){
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
}

function inferQuestionSubtopic(q={}){
  const topic=String(q.topic||'');
  const defs=NEXO_SUBTOPICS[topic]||[];
  if(!defs.length)return null;
  const hay=normalizeTextKey([q.prompt,q.base_text,q.source_reference,q.subject,q.topic].filter(Boolean).join(' '));
  let best=null,bestHits=0;
  for(const def of defs){
    let hits=0;
    for(const key of def.keys||[])if(hay.includes(normalizeTextKey(key)))hits++;
    if(hits>bestHits){best=def;bestHits=hits}
  }
  return bestHits?best.name:defs[0].name;
}

const state = {
  user:null,
  profile:null,
  dashboard:null,
  questionMeta:[],
  questionCatalog:null,
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
  externalVisualCache:new Map(),
  videos:[],
  materials:[],
  materialSubject:'',
  materialOpenTopic:'',
  contentProgress:new Map(),
  topicMastery:new Map(),
  subtopicMastery:new Map(),
  nexoScore:null,
  personalRadar:[],
  learningIntelligence:null,
  recommendationExplanation:null,
  dueReviewItems:[],
  questionNoteTarget:null,
  libraryQuickFive:false,
  featureFlags:new Map(),
  globalSearchItems:[],
  lastStudyAt:null,
  examTimer:null,
  pendingGuidedTraining:null,
  lastFinishedStudy:null,
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
  studyGroups:[],
  selectedStudyGroup:null,
  lastSimulationReport:null,
  completedEssayThemes:new Set(),
  essayThemeProgressLoaded:false,
  essayHistory:[],
  essayRevisionOf:null,
  essayTrainingCompetency:null,
  savedQuestions:new Set(),
  weekPlan:null,
  questionReportTarget:null,
  radarTopics:[],
  radarSubjects:[],
  radarYears:[],
  radarOverview:null,
  radarLoaded:false,
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

function nexoHapticsEnabled(){
  return localStorage.getItem('nexo-haptics')!=='off';
}
function nexoHaptic(pattern){
  if(!nexoHapticsEnabled())return;
  try{if(navigator.vibrate)navigator.vibrate(pattern)}catch(_){}
}
function renderHapticPreference(){
  const btn=$('#toggleNexoHaptics');
  if(!btn)return;
  btn.innerHTML='◉ <span>Feedback tátil: '+(nexoHapticsEnabled()?'ligado':'desligado')+'</span>';
}
$('#toggleNexoHaptics')?.addEventListener('click',()=>{
  localStorage.setItem('nexo-haptics',nexoHapticsEnabled()?'off':'on');
  renderHapticPreference();
  if(nexoHapticsEnabled())nexoHaptic([22]);
});

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

async function logProductEvent(eventName,metadata={},page=null){
  if(!state?.user?.id||!navigator.onLine)return;
  try{
    await client.from('nexo_product_events').insert({
      user_id:state.user.id,
      event_name:String(eventName||'event').slice(0,80),
      page:String(page||$('.page.active')?.id||'').slice(0,80)||null,
      metadata:metadata&&typeof metadata==='object'?metadata:{}
    });
  }catch(err){
    console.warn('product analytics unavailable',err);
  }
}

async function loadFeatureFlags(){
  if(!state.user?.id)return state.featureFlags;
  try{
    const {data,error}=await client.from('nexo_feature_flags').select('flag,enabled,min_plan');
    if(error)throw error;
    state.featureFlags=new Map((data||[]).map(x=>[x.flag,x]));
  }catch(err){console.warn('feature flags',err)}
  return state.featureFlags;
}
function featureEnabled(flag){
  const row=state.featureFlags.get(flag);
  if(!row)return true;
  if(!row.enabled)return false;
  const rank={free:0,plus:1,ultra:2};
  return (rank[nexoAccessTier()]??0)>=(rank[row.min_plan]??0);
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

const NEXO_EXPERIENCE_KEY='nexo-experience-v1';
function defaultExperienceSettings(){
  return {
    font:'normal',
    contrast:'normal',
    motion:window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'reduced':'normal',
    mode:'balanced',
    dataSaver:false
  };
}
function readExperienceSettings(){
  try{return {...defaultExperienceSettings(),...JSON.parse(localStorage.getItem(NEXO_EXPERIENCE_KEY)||'{}')}}catch(_){return defaultExperienceSettings()}
}
function applyExperienceSettings(settings=readExperienceSettings(),save=false){
  const s={...defaultExperienceSettings(),...settings};
  document.body.dataset.fontScale=s.font;
  document.body.dataset.contrast=s.contrast;
  document.body.dataset.motion=s.motion;
  document.body.dataset.experience=s.mode;
  document.body.classList.toggle('data-saver',Boolean(s.dataSaver));
  if(save)localStorage.setItem(NEXO_EXPERIENCE_KEY,JSON.stringify(s));
  $$('[data-font-scale]').forEach(b=>b.classList.toggle('active',b.dataset.fontScale===s.font));
  $$('[data-contrast]').forEach(b=>b.classList.toggle('active',b.dataset.contrast===s.contrast));
  $$('[data-motion]').forEach(b=>b.classList.toggle('active',b.dataset.motion===s.motion));
  $$('[data-experience-mode]').forEach(b=>b.classList.toggle('active',b.dataset.experienceMode===s.mode));
  if($('#dataSaverToggle'))$('#dataSaverToggle').checked=Boolean(s.dataSaver);
  return s;
}
function mutateExperience(patch){
  const next={...readExperienceSettings(),...patch};
  applyExperienceSettings(next,true);
}
applyExperienceSettings(readExperienceSettings(),false);
$('#openExperienceSettings')?.addEventListener('click',()=>{
  applyExperienceSettings(readExperienceSettings(),false);
  $('#experienceSettingsModal')?.classList.remove('hidden');
  $('#profileMenu')?.classList.add('hidden');
  document.body.style.overflow='hidden';
});
function closeExperienceSettings(){
  $('#experienceSettingsModal')?.classList.add('hidden');
  document.body.style.overflow='';
}
$('#closeExperienceSettings')?.addEventListener('click',closeExperienceSettings);
$('#experienceSettingsModal')?.addEventListener('click',e=>{if(e.target===$('#experienceSettingsModal'))closeExperienceSettings()});
$$('[data-font-scale]').forEach(b=>b.addEventListener('click',()=>mutateExperience({font:b.dataset.fontScale})));
$$('[data-contrast]').forEach(b=>b.addEventListener('click',()=>mutateExperience({contrast:b.dataset.contrast})));
$$('[data-motion]').forEach(b=>b.addEventListener('click',()=>mutateExperience({motion:b.dataset.motion})));
$$('[data-experience-mode]').forEach(b=>b.addEventListener('click',()=>mutateExperience({mode:b.dataset.experienceMode})));
$('#dataSaverToggle')?.addEventListener('change',e=>mutateExperience({dataSaver:Boolean(e.target.checked)}));
$('#resetExperienceSettings')?.addEventListener('click',()=>{const s=defaultExperienceSettings();applyExperienceSettings(s,true);toast('Experiência restaurada ao padrão.');});



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


function studyPhaseMeta(){
  const target=new Date('2026-11-08T00:00:00-03:00').getTime();
  const today=new Date();today.setHours(0,0,0,0);
  const days=Math.ceil((target-today.getTime())/86400000);
  const contentLast=[...state.contentProgress.values()]
    .map(x=>x?.last_opened_at?new Date(x.last_opened_at).getTime():0)
    .filter(Boolean)
    .sort((a,b)=>b-a)[0]||0;
  const questionLast=state.lastStudyAt?new Date(state.lastStudyAt).getTime():0;
  const last=Math.max(questionLast,contentLast);
  const inactiveDays=last?Math.max(0,Math.floor((Date.now()-last)/86400000)):0;
  const recovery=Boolean(last&&inactiveDays>=5);
  if(days<=0)return {key:'post',label:'PÓS-PROVA',days,inactiveDays,recovery:false,description:'Feche seu ciclo e preserve seu histórico.'};
  if(days<=7)return {key:'eve',label:'VÉSPERA',days,inactiveDays,recovery,description:'Revisar, proteger confiança e evitar conteúdo novo pesado.'};
  if(days<=21)return {key:'final',label:'RETA FINAL',days,inactiveDays,recovery,description:'Revisão, erros e simulados dominam o plano.'};
  if(days<=50)return {key:'consolidate',label:'CONSOLIDAÇÃO',days,inactiveDays,recovery,description:'Menos abertura de frentes e mais retenção.'};
  return {key:'learn',label:'CONSTRUÇÃO',days,inactiveDays,recovery,description:'Aprender, praticar e criar base para revisões futuras.'};
}

async function startRecoverySession(){
  const top=buildPersonalRadar()[0]||state.core?.recommended_action||null;
  const topic=top?.topic||'',subject=top?.subject||'',area=top?.area||state.profile?.difficult_areas?.[0]||'';
  const lesson=topic?topicLesson(topic,subject):null;
  if(lesson){
    openLibraryTopic(subject,topic);
    toast('Retomada leve: revise o assunto antes de fazer uma sessão curta.');
    return;
  }
  openPage('questoes');
  await startStudySession({mode:'recovery',area,subject,topic,radarTopic:topic||'',difficulty:'',visualOnly:false,size:5});
  if(state.session){
    $('#sessionAreaBadge').textContent='RETOMADA';
    $('#sessionTitle').textContent=topic||subject||area||'Sessão de retomada';
    $('#sessionSubtitle').textContent='Só 5 questões. O objetivo é recuperar ritmo, não compensar dias perdidos de uma vez.';
  }
}

function buildTodayPlan(){
  const core=state.core||{};
  const rec=core.recommended_action||null;
  const profile=state.profile||{};
  const phase=studyPhaseMeta();
  const minutes=Math.max(20,Number(profile.daily_minutes||core.profile?.daily_minutes||45));
  const focus=rec?.topic||rec?.subject||rec?.area||'diagnóstico inicial';
  const area=rec?.area||profile.difficult_areas?.[0]||'ENEM';
  const baseCount=Number(rec?.size||(minutes<=30?5:minutes<=60?8:10));
  const count=phase.recovery?5:phase.key==='eve'?Math.min(5,baseCount):baseCount;

  let blocks;
  if(phase.recovery){
    blocks=[
      {icon:'01',title:'Retomar sem culpa',detail:'Releia um resumo do último foco.',time:5},
      {icon:'02',title:'Sessão curta',detail:'5 questões · '+focus,time:15},
      {icon:'03',title:'Fechar lacuna',detail:'Revise apenas os erros de hoje.',time:10}
    ];
  }else if(phase.key==='eve'){
    blocks=[
      {icon:'01',title:'Revisão ultrarrápida',detail:'Fórmulas, conceitos e erros recorrentes.',time:10},
      {icon:'02',title:'Sprint de prova',detail:count+' questões · decisão e confiança',time:15},
      {icon:'03',title:'Encerrar cedo',detail:'Nada de abrir conteúdo pesado agora.',time:5}
    ];
  }else if(phase.key==='final'){
    blocks=[
      {icon:'01',title:'Fila de revisão',detail:'Ataque o que está vencendo na memória.',time:10},
      {icon:'02',title:'Questões foco',detail:count+' questões · '+focus,time:Math.max(20,minutes-25)},
      {icon:'03',title:'Correção estratégica',detail:'Erros + tempo + decisão de prova.',time:15}
    ];
  }else if(phase.key==='consolidate'){
    blocks=[
      {icon:'01',title:'Revisão espaçada',detail:'Proteja o que já aprendeu.',time:10},
      {icon:'02',title:'Sessão principal',detail:count+' questões · '+focus,time:Math.max(25,minutes-25)},
      {icon:'03',title:'Consolidação',detail:'Volte ao ponto fraco detectado.',time:15}
    ];
  }else if(minutes<=30){
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
  return {minutes,focus,area,count,blocks,phase};
}

function renderTodayPlan(){
  renderNexoCommandCenter();
  renderLongRangePlan();
  renderNexoContextBar($('.page.active')?.id||'inicio');
  const plan=buildTodayPlan();
  $$('[data-today-plan]').forEach(card=>{
    const total=card.querySelector('[data-today-total]');
    const summary=card.querySelector('[data-today-summary]');
    const blocks=card.querySelector('[data-today-blocks]');
    const start=card.querySelector('[data-today-start]');
    if(total)total.textContent=String(plan.minutes);
    if(summary)summary.textContent=plan.phase.label+' · '+(plan.phase.days>0?plan.phase.days+' dias para o 1º dia · ':'')+(plan.phase.recovery?'retomada leve após '+plan.phase.inactiveDays+' dias sem registro.':'foco: '+plan.area+' · '+plan.focus+'.');
    if(blocks)blocks.innerHTML=plan.blocks.map(item=>`
      <article class="today-plan-block">
        <span>${item.icon}</span>
        <div><b>${esc(item.title)}</b><small>${esc(item.detail)}</small></div>
        <strong>${item.time} min</strong>
      </article>`).join('');
    if(start)start.onclick=()=>{
      if(plan.phase.recovery)return startRecoverySession();
      if(plan.phase.key==='eve'){
        openPage('simulados');
        setTimeout(()=>document.querySelector('[data-sim-mode="sprint"]')?.click(),60);
        return;
      }
      if(state.core?.recommended_action)startCoreRecommendation();
      else{
        openPage('questoes');
        resetSessionUI();
        toast('Comece pelo diagnóstico para o NEXO Core calibrar seu plano.');
      }
    };
  });
}



function phaseDistribution(phase){
  if(phase.key==='eve')return {learn:5,review:45,questions:20,simulation:30};
  if(phase.key==='final')return {learn:10,review:35,questions:25,simulation:30};
  if(phase.key==='consolidate')return {learn:20,review:30,questions:35,simulation:15};
  if(phase.key==='post')return {learn:0,review:20,questions:0,simulation:0};
  return {learn:35,review:20,questions:35,simulation:10};
}
function renderLongRangePlan(){
  const phase=studyPhaseMeta(),dist=phaseDistribution(phase);
  if($('#studyPhaseLabel'))$('#studyPhaseLabel').textContent=phase.label;
  if($('#studyPhaseDescription'))$('#studyPhaseDescription').textContent=phase.description+(phase.recovery?' Você ficou '+phase.inactiveDays+' dia(s) sem registro, então o plano reduz a carga de retomada.':'');
  if($('#daysToEnem'))$('#daysToEnem').textContent=phase.days>0?phase.days:'—';
  const grid=$('#longRangePlan');
  if(grid)grid.innerHTML=[
    ['Aprender',dist.learn,'conteúdo novo'],
    ['Revisar',dist.review,'memória e erros'],
    ['Questões',dist.questions,'aplicação'],
    ['Simular',dist.simulation,'estratégia de prova']
  ].map(x=>'<article><span>'+x[0]+'</span><strong>'+x[1]+'%</strong><i><em style="width:'+x[1]+'%"></em></i><small>'+x[2]+'</small></article>').join('');
  $('#startRecoveryPlan')?.classList.toggle('hidden',!phase.recovery);
}
async function startTimedStudyMode(mode){
  if(mode==='recovery')return startRecoverySession();
  if(mode==='eve'){
    openPage('simulados');
    setTimeout(()=>document.querySelector('[data-sim-mode="sprint"]')?.click(),60);
    return;
  }
  const top=buildPersonalRadar()[0]||state.core?.recommended_action||{};
  const config={
    mode:mode==='intensive'?'intensive':'quick30',
    area:top.area||'',subject:top.subject||'',topic:top.topic||'',
    radarTopic:top.topic||'',fallbackTopic:top.topic||'',
    difficulty:'',visualOnly:false,size:mode==='intensive'?15:5
  };
  openPage('questoes');
  await startStudySession(config);
  if(state.session){
    $('#sessionAreaBadge').textContent=mode==='intensive'?'INTENSIVO':'30 MIN';
    $('#sessionTitle').textContent=top.topic||top.subject||top.area||'Plano NEXO';
    $('#sessionSubtitle').textContent=mode==='intensive'
      ?'Bloco maior para um dia de estudo forte. Pare se a qualidade cair.'
      :'Sessão curta para caber na sua rotina sem perder continuidade.';
  }
}
$('#studyMode30')?.addEventListener('click',()=>startTimedStudyMode('30'));
$('#studyModeEve')?.addEventListener('click',()=>startTimedStudyMode('eve'));
$('#studyModeIntensive')?.addEventListener('click',()=>startTimedStudyMode('intensive'));
$('#startRecoveryPlan')?.addEventListener('click',()=>startTimedStudyMode('recovery'));

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
  return $$('[data-avatar-field]').find(btn=>btn.dataset.avatarField===field&&btn.dataset.avatarValue===value)||null;
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
    },
    5:{
      title:'Agora eu posso calibrar seu ponto de partida.',
      text:'Um diagnóstico curto me ajuda a escolher melhor a dificuldade e os assuntos iniciais. Se preferir, você pode estudar primeiro.',
      image:NEXO_MEDIA_IMAGES.bustPensativo
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
  $$('[data-onboarding-diagnostic]').forEach(btn=>{
    btn.classList.toggle('active',(btn.dataset.onboardingDiagnostic!=='no')===Boolean(ob.diagnostic));
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
    diagnostic:true,
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
      onboarding_version:3,
      updated_at:completedAt
    }).eq('id',state.user.id);
    if(error)throw error;

    state.profile={
      ...(state.profile||{}),
      goal_score:ob.goalScore,
      difficult_areas:[...ob.areas],
      daily_minutes:ob.dailyMinutes,
      onboarding_completed_at:completedAt,
      onboarding_version:3
    };

    closeNexoOnboarding();
    await loadNexoCore();
    updateHomeExperience();
    setNexoMood('confiante');
    if(!ob.manual&&ob.diagnostic){
      const diagnosticSize=onboardingMissionSize(ob.dailyMinutes);
      openPage('questoes');
      await startStudySession({
        mode:'diagnostic',
        area:ob.areas[0]||'',
        subject:'',
        topic:'',
        difficulty:'',
        visualOnly:false,
        size:diagnosticSize
      });
      if(state.session){
        $('#sessionAreaBadge').textContent='DIAGNÓSTICO';
        $('#sessionTitle').textContent='Calibração inicial';
        $('#sessionSubtitle').textContent='Não vale nota. Use estas questões para eu conhecer seu ponto de partida.';
      }
      toast('Diagnóstico iniciado. Depois eu ajusto sua rota.');
    }else{
      openPage('inicio');
      toast(ob.manual?'Seu plano foi atualizado.':'Seu primeiro plano está pronto.');
    }
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
$$('[data-onboarding-diagnostic]').forEach(btn=>btn.onclick=()=>{
  state.onboarding.diagnostic=btn.dataset.onboardingDiagnostic!=='no';
  $$('[data-onboarding-diagnostic]').forEach(x=>x.classList.toggle('active',x===btn));
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

async function exportMyNexoData(){
  if(!state.user?.id)return;
  const btn=$('#exportMyData');
  if(btn){btn.disabled=true;btn.textContent='Preparando exportação...';}
  try{
    const uid=state.user.id;
    const requests={
      profile:client.from('profiles').select('*').eq('id',uid).maybeSingle(),
      membership:client.from('nexo_memberships').select('*').eq('user_id',uid).maybeSingle(),
      attempts:client.from('question_attempts').select('*').eq('user_id',uid).order('created_at',{ascending:true}),
      essays:client.from('essays').select('*').eq('user_id',uid).order('created_at',{ascending:true}),
      sessions:client.from('nexo_study_sessions').select('*').eq('user_id',uid).order('started_at',{ascending:true}),
      skills:client.from('nexo_skill_state').select('*').eq('user_id',uid),
      saved_questions:client.from('saved_questions').select('*').eq('user_id',uid).order('created_at',{ascending:true}),
      content_progress:client.from('content_progress').select('*').eq('user_id',uid),
      favorites:client.from('content_favorites').select('*').eq('user_id',uid),
      journey:client.from('gamification_profiles').select('*').eq('user_id',uid).maybeSingle(),
      inventory:client.from('gamification_inventory').select('*').eq('user_id',uid),
      achievements:client.from('gamification_achievements').select('*').eq('user_id',uid),
      missions:client.from('gamification_missions').select('*').eq('user_id',uid).order('created_at',{ascending:true}),
      week_tasks:client.from('nexo_week_tasks').select('*').eq('user_id',uid).order('week_start',{ascending:true})
    };
    const entries=await Promise.all(Object.entries(requests).map(async([key,promise])=>{
      const result=await promise;
      if(result.error) return [key,{error:result.error.message}];
      return [key,result.data??null];
    }));
    const payload={
      product:'NEXO ENEM',
      exported_at:new Date().toISOString(),
      account:{id:uid,email:state.user.email||null,created_at:state.user.created_at||null},
      data:Object.fromEntries(entries)
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download='nexo-meus-dados-'+new Date().toISOString().slice(0,10)+'.json';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    $('#profileMenu')?.classList.add('hidden');
    toast('Seus dados foram exportados.');
  }catch(err){
    console.error('data export',err);
    toast('Não foi possível exportar seus dados agora.','error');
  }finally{
    if(btn){btn.disabled=false;btn.textContent='⇩ Exportar meus dados';}
  }
}
$('#exportMyData')?.addEventListener('click',exportMyNexoData);

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

function updateNetworkStatus(){
  const online=navigator.onLine;
  document.body.classList.toggle('is-offline',!online);
  const el=$('#networkStatus');
  if(el){
    el.classList.toggle('hidden',online);
    const b=el.querySelector('b');if(b)b.textContent=online?'Online':'Offline parcial';
  }
  if(online)logProductEvent('network_restored',{},$('.page.active')?.id||null);
}
window.addEventListener('online',()=>{updateNetworkStatus();toast('Conexão restaurada.')});
window.addEventListener('offline',()=>{updateNetworkStatus();toast('Sem internet. Aulas já carregadas podem continuar disponíveis.','info')});
updateNetworkStatus();

const searchBox=$('.search');
const globalSearch=$('#globalSearch');

function setMobileSearchOpen(open,{focus=true}={}){
  if(!searchBox||!globalSearch)return;
  const shouldOpen=Boolean(open)&&innerWidth<=760;
  searchBox.classList.toggle('search-open',shouldOpen);
  searchBox.setAttribute('aria-expanded',String(shouldOpen));
  if(shouldOpen&&focus){
    requestAnimationFrame(()=>{
      try{globalSearch.focus({preventScroll:true})}catch(_){globalSearch.focus()}
    });
  }else if(!shouldOpen&&document.activeElement===globalSearch){
    globalSearch.blur();
  }
}

$('#themeToggle').onclick=()=>{
  setMobileSearchOpen(false,{focus:false});
  setTheme(document.body.classList.contains('light')?'dark':'light');
};
$('#profileButton').onclick=()=>$('#profileMenu').classList.toggle('hidden');

globalSearch.addEventListener('focus',()=>{if(innerWidth<=760)setMobileSearchOpen(true,{focus:false})});
searchBox.addEventListener('click',e=>{
  if(innerWidth<=760&&!searchBox.classList.contains('search-open')){
    e.preventDefault();
    setMobileSearchOpen(true);
  }
});
globalSearch.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    e.preventDefault();
    setMobileSearchOpen(false,{focus:false});
  }
});

function getSiteSearchActions(){
  const actions=[
    {id:'inicio',title:'Início',meta:'Voltar para a página inicial',icon:'⌂',keywords:['home','inicio','início','pagina inicial','começo'],run:()=>openPage('inicio')},
    {id:'evolucao',title:'Meu perfil de evolução',meta:'Desempenho, domínio, relatório e pontos de melhoria',icon:'▥',keywords:['perfil de evolucao','perfil de evolução','evolucao','evolução','meu desempenho','desempenho','progresso','estatisticas','estatísticas'],run:()=>openPage('desempenho')},
    {id:'focos',title:'Meus focos',meta:'Prioridades e pontos fracos para estudar',icon:'◎',keywords:['focos','prioridades','pontos fracos','fraquezas','dificuldades'],run:()=>openPage('focos')},
    {id:'questoes',title:'Resolver questões',meta:'Abrir treino de questões',icon:'✓',keywords:['questoes','questões','resolver','treinar','exercicios','exercícios'],run:()=>openPage('questoes')},
    {id:'adaptativo',title:'Treino adaptativo',meta:'Começar uma sessão ajustada ao seu desempenho',icon:'✦',keywords:['treino adaptativo','adaptativo','sessao adaptativa','sessão adaptativa','estudar agora'],run:()=>{openPage('questoes');return startAdaptive()}},
    {id:'redacao',title:'Redação',meta:'Escrever, corrigir e revisar redações',icon:'✎',keywords:['redacao','redação','texto dissertativo','competencias','competências'],run:()=>openPage('redacao')},
    {id:'temas',title:'Temas de redação',meta:'Explorar propostas para treinar',icon:'▧',keywords:['temas','tema de redacao','tema de redação','propostas de redacao','propostas de redação'],run:()=>openPage('temas')},
    {id:'simulados',title:'Simulados ENEM',meta:'Provas, sprints e treino em modo exame',icon:'▤',keywords:['simulado','simulados','prova','modo prova','mini enem','sprint'],run:()=>openPage('simulados')},
    {id:'semana',title:'Semana NEXO',meta:'Plano semanal e próximos estudos',icon:'◫',keywords:['semana','plano semanal','cronograma','calendario','calendário','rotina de estudo'],run:()=>openPage('semana')},
    {id:'radar',title:'Radar ENEM',meta:'Assuntos mais recorrentes e prioridades',icon:'◉',keywords:['radar','radar enem','o que mais cai','recorrencia','recorrência','prioridades enem'],run:()=>openPage('radar')},
    {id:'materiais',title:'Materiais e biblioteca',meta:'PDFs, aulas e conteúdos do NEXO',icon:'▧',keywords:['materiais','biblioteca','pdf','pdfs','conteudos','conteúdos','aulas'],run:()=>openPage('materiais')},
    {id:'videoaulas',title:'Videoaulas',meta:'Abrir biblioteca de vídeos',icon:'▶',keywords:['video','vídeo','videos','vídeos','videoaula','videoaulas','vídeoaulas'],run:()=>openPage('videoaulas')},
    {id:'banco',title:'Banco de questões',meta:'Explorar e filtrar o acervo',icon:'▦',keywords:['banco','banco de questoes','banco de questões','acervo','questoes salvas','questões salvas'],run:()=>openPage('banco')},
    {id:'jornada',title:'NEXO Jornada',meta:'Nível, missões, ranking, avatar e N-Coins',icon:'♕',keywords:['jornada','ranking','nivel','nível','missoes','missões','avatar','n-coins','ncoins','gamificacao','gamificação'],run:()=>openPage('ranking')},
    {id:'planos',title:'Planos Free & Plus',meta:'Ver seu plano e recursos disponíveis',icon:'＋',keywords:['plano','planos','plus','assinatura','premium','free'],run:()=>openPage('planos')},
    {id:'feedback',title:'Feedback',meta:'Enviar sugestão ou relatar experiência',icon:'◌',keywords:['feedback','sugestao','sugestão','opinar','reportar problema'],run:()=>openPage('feedback')},
    {id:'professor',title:'Professor Nexo',meta:'Abrir o assistente de estudos',icon:'✦',keywords:['professor','professor nexo','assistente','tutor','ajuda','tirar duvida','tirar dúvida'],run:()=>openProfessorNexo()},
    {id:'foco',title:'Modo Foco',meta:'Iniciar uma sessão sem distrações',icon:'◉',keywords:['modo foco','foco','timer','temporizador','pomodoro','concentracao','concentração'],run:()=>openFocusMode()},
    {id:'erros',title:'Caderno de erros',meta:'Revisar questões erradas e suas causas',icon:'×',keywords:['caderno de erros','erros','questoes erradas','questões erradas','revisar erros','meus erros'],run:()=>{openPage('desempenho');setTimeout(()=>document.querySelector('#v13Errors')?.scrollIntoView({behavior:'smooth',block:'start'}),120)}},
    {id:'dominio',title:'Mapa de domínio',meta:'Ver seu domínio por assunto',icon:'◎',keywords:['mapa de dominio','mapa de domínio','dominio','domínio','mastery','nivel por assunto','nível por assunto'],run:()=>{openPage('desempenho');setTimeout(()=>document.querySelector('#v13Mastery')?.scrollIntoView({behavior:'smooth',block:'start'}),120)}},
    {id:'relatorio',title:'Relatório semanal',meta:'Ver sua evolução dos últimos 7 dias',icon:'▥',keywords:['relatorio semanal','relatório semanal','relatorio','relatório','ultimos 7 dias','últimos 7 dias'],run:()=>{openPage('desempenho');setTimeout(()=>document.querySelector('#v13Weekly')?.scrollIntoView({behavior:'smooth',block:'start'}),120)}},
    {id:'conta',title:'Minha conta e perfil',meta:'Abrir informações da sua conta',icon:'●',keywords:['minha conta','conta','meu perfil','perfil','usuario','usuário','email'],run:()=>{document.querySelector('#profileMenu')?.classList.remove('hidden')}},
    {id:'experiencia',title:'Configurações de experiência',meta:'Fonte, contraste, movimento e economia de dados',icon:'⚙',keywords:['configuracoes','configurações','acessibilidade','fonte','tamanho da fonte','contraste','movimento','economia de dados','aparencia','aparência'],run:()=>document.querySelector('#openExperienceSettings')?.click()},
    {id:'preferencias',title:'Preferências de estudo',meta:'Curso, instituição, prova e duração das sessões',icon:'⚙',keywords:['preferencias','preferências','curso alvo','faculdade','instituicao','instituição','data da prova','duracao da sessao','duração da sessão'],run:()=>typeof window.v13OpenPrefs==='function'?window.v13OpenPrefs():null},
    {id:'feynman',title:'Recordação ativa / Feynman',meta:'Explique um assunto para testar sua lembrança',icon:'◇',keywords:['feynman','recordacao ativa','recordação ativa','explicar assunto','lembranca','lembrança','active recall'],run:()=>{const topic=state.core?.weakest_topic||state.core?.recommended_action?.topic||state.current?.topic||'';if(topic&&typeof window.v13OpenRecall==='function')return window.v13OpenRecall(state.current?.area||'',state.current?.subject||'',topic);toast('Abra um assunto ou faça algumas questões para o NEXO escolher um tema para recordação ativa.','info')}}
  ];
  if(state.profile?.role==='admin')actions.push({id:'admin',title:'Área do Admin',meta:'Saúde, conteúdo e operação do NEXO',icon:'♛',keywords:['admin','administracao','administração','painel admin','saude do sistema','saúde do sistema'],run:()=>openPage('admin')});
  return actions;
}
function buildSiteSearchActionResults(query){
  const q=normalizeTextKey(query).trim();
  if(q.length<2)return [];
  const tokens=q.split(/\s+/).filter(Boolean);
  return getSiteSearchActions().map(action=>{
    const title=normalizeTextKey(action.title);
    const aliases=(action.keywords||[]).map(normalizeTextKey);
    const hay=[title,...aliases,normalizeTextKey(action.meta||'')].join(' ');
    const allTokens=tokens.every(token=>hay.includes(token));
    if(!hay.includes(q)&&!allTokens)return null;
    let score=5;
    if(title===q)score=12;
    else if(title.startsWith(q))score=11;
    else if(aliases.some(alias=>alias===q))score=10;
    else if(aliases.some(alias=>alias.startsWith(q)))score=9;
    else if(hay.includes(q))score=8;
    return {type:'action',actionId:action.id,title:action.title,meta:action.meta,icon:action.icon,score};
  }).filter(Boolean).sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title,'pt-BR'));
}
function runSiteSearchAction(id){
  const action=getSiteSearchActions().find(item=>item.id===id);
  if(!action)return false;
  try{
    const result=action.run?.();
    logProductEvent('search_action_open',{action:id},'search');
    return result??true;
  }catch(err){
    console.error('search action',id,err);
    toast('Não consegui abrir essa função agora.','error');
    return false;
  }
}

function buildGlobalSearchResults(query){
  const q=normalizeTextKey(query).trim();
  if(q.length<2)return [];
  const out=[...buildSiteSearchActionResults(q)];
  for(const item of state.materials||[]){
    const hay=normalizeTextKey([item.title,item.subject,item.topic,item.area].join(' '));
    if(hay.includes(q))out.push({type:'material',title:item.title,meta:[item.subject,item.topic,materialKind(item).label].filter(Boolean).join(' · '),id:item.id,score:hay.startsWith(q)?3:2});
  }
  const seenTopic=new Set();
  for(const row of state.radarTopics||[]){
    const key=String(row.subject||'')+'::'+String(row.topic||'');
    if(seenTopic.has(key))continue;seenTopic.add(key);
    const hay=normalizeTextKey([row.subject,row.topic,row.area].join(' '));
    if(hay.includes(q))out.push({type:'topic',title:row.topic,meta:(row.subject||row.area||'')+' · Radar '+Math.round(Number(row.nexo_priority_score||0)),subject:row.subject||'',topic:row.topic,score:hay.startsWith(q)?3:1});
  }
  for(const [topic,defs] of Object.entries(NEXO_SUBTOPICS)){
    for(const def of defs){
      if(normalizeTextKey(def.name).includes(q))out.push({type:'subtopic',title:def.name,meta:'Subassunto · '+topic,topic,score:2});
    }
  }
  for(const theme of THEMES){
    const hay=normalizeTextKey([theme.title,theme.axis].join(' '));
    if(hay.includes(q))out.push({type:'essay',title:theme.title,meta:'Redação · '+theme.axis,themeId:theme.id,axis:theme.axis,score:1});
  }
  return out.sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title,'pt-BR')).slice(0,10);
}
function renderGlobalSearchResults(query){
  const box=$('#globalSearchResults');if(!box)return;
  const items=buildGlobalSearchResults(query);
  state.globalSearchItems=items;
  if(!items.length){box.innerHTML=query.trim().length>=2?'<div class="search-empty">Nada encontrado. Tente outro termo.</div>':'';box.classList.toggle('hidden',!query.trim());return}
  const icons={action:'→',material:'▣',topic:'◎',subtopic:'◇',essay:'✎'};
  box.innerHTML=items.map((item,index)=>'<button data-global-result="'+index+'" data-search-kind="'+esc(item.type)+'"><span>'+(item.icon||icons[item.type]||'→')+'</span><div><b>'+esc(item.title)+'</b><small>'+esc(item.meta||'')+'</small></div><i>→</i></button>').join('');
  box.classList.remove('hidden');
  $$('[data-global-result]',box).forEach(btn=>btn.onclick=async()=>{
    const item=state.globalSearchItems[Number(btn.dataset.globalResult)];if(!item)return;
    box.classList.add('hidden');globalSearch.value='';setMobileSearchOpen(false,{focus:false});
    logProductEvent('search_result_open',{type:item.type},'search');
    if(item.type==='action')return runSiteSearchAction(item.actionId);
    if(item.type==='material'){openPage('materiais');await loadMaterials({silent:true});return openContentViewer('material',item.id)}
    if(item.type==='topic'){const lesson=topicLesson(item.topic,item.subject);return lesson?openLibraryTopic(item.subject,item.topic):(openPage('questoes'),startStudySession({mode:'search',subject:item.subject,topic:item.topic,radarTopic:item.topic,size:5,difficulty:'',visualOnly:false}))}
    if(item.type==='subtopic'){const lesson=(state.materials||[]).find(m=>m.topic===item.topic&&materialKind(m).key==='lesson');return lesson?openLibraryTopic(lesson.subject,item.topic):(openPage('questoes'),startStudySession({mode:'search',topic:item.topic,size:5,difficulty:'',visualOnly:false}))}
    if(item.type==='essay'){openPage('redacao');if($('#essayAxis'))$('#essayAxis').value=item.axis;renderEssayThemeOptions({keepSelection:false});if($('#essayTheme'))$('#essayTheme').value=String(item.themeId);updateEssayPrompt();$('#essayText')?.focus();}
  });
}
function nexoPercentTone(value){
  const n=Number(value);
  if(!Number.isFinite(n)||n<0||n>100)return '';
  if(n<=39)return 'low';
  if(n<=79)return 'mid';
  return 'high';
}
function nexoApplyPercentTones(root=document){
  const scope=root?.querySelectorAll?root:document;
  const selector='b,strong,em,span,small,.focus-score,.weak-row b,.donut b,.v13-stats b,.v13-mastery-grid strong,.study-report-score b,.study-report-metrics b';
  const nodes=scope.querySelectorAll(selector);
  nodes.forEach(el=>{
    if(el.closest('style,script'))return;
    const text=String(el.textContent||'').replace(/\s+/g,' ').trim();
    const matches=[...text.matchAll(/(-?\d{1,3}(?:[.,]\d+)?)\s*%/g)];
    el.classList.remove('nexo-score-low','nexo-score-mid','nexo-score-high');
    delete el.dataset.scoreTone;
    if(matches.length!==1||text.length>56)return;
    const value=Number(matches[0][1].replace(',','.'));
    const tone=nexoPercentTone(value);
    if(!tone)return;
    el.classList.add('nexo-score-'+tone);
    el.dataset.scoreTone=tone;
  });
}
let nexoPercentToneQueued=false;
function scheduleNexoPercentTones(){
  if(nexoPercentToneQueued)return;
  nexoPercentToneQueued=true;
  requestAnimationFrame(()=>{
    nexoPercentToneQueued=false;
    nexoApplyPercentTones(document.querySelector('.page.active')||document);
    nexoApplyPercentTones(document.querySelector('#niaPanel')||document.createElement('div'));
    nexoApplyPercentTones(document.querySelector('#v13Modal')||document.createElement('div'));
  });
}
const nexoPercentObserver=new MutationObserver(scheduleNexoPercentTones);
nexoPercentObserver.observe(document.body,{subtree:true,childList:true,characterData:true});
scheduleNexoPercentTones();
window.nexoApplyPercentTones=nexoApplyPercentTones;
window.nexoPercentTone=nexoPercentTone;

let globalSearchTimer=null;
globalSearch.addEventListener('input',e=>{
  clearTimeout(globalSearchTimer);
  const value=e.target.value||'';
  globalSearchTimer=setTimeout(()=>renderGlobalSearchResults(value),120);
});


document.addEventListener('click',e=>{
  if(!e.target.closest('#profileButton')&&!e.target.closest('#profileMenu')) $('#profileMenu').classList.add('hidden');
  if(innerWidth<=760&&searchBox?.classList.contains('search-open')&&!e.target.closest('.search')){
    setMobileSearchOpen(false,{focus:false});
  }
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
  const isOpen=Boolean(open);
  $('#sidebar')?.classList.toggle('open',isOpen);
  $('#scrim')?.classList.toggle('hidden',!isOpen);
  document.body.classList.toggle('mobile-menu-open',isOpen&&innerWidth<=760);

  const contextBar=$('#nexoContextBar');
  if(contextBar){
    contextBar.classList.toggle('menu-hidden',isOpen&&innerWidth<=760);
    contextBar.setAttribute('aria-hidden',String(isOpen&&innerWidth<=760));
  }
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

// mobileMenu legado removido: a navegação responsiva atual usa sidebar + bottom nav.
$('#closeMenu')?.addEventListener('click',()=>toggleMenu(false));
$('#scrim')?.addEventListener('click',()=>toggleMenu(false));
$('#moreMobile')?.addEventListener('click',()=>toggleMenu(true));


function nexoAccessTier(){
  if(state.membership?.is_ultra||state.membership?.plan==='ultra')return 'ultra';
  if(state.membership?.is_plus||state.membership?.plan==='plus')return 'plus';
  return 'free';
}

function nexoPlanLabel(tier=nexoAccessTier()){
  return tier==='ultra'?'Ultra':tier==='plus'?'Plus':'Free';
}

function nexoRolePlanLabel(){
  const role=state.profile?.role==='admin'?'Administrador':'Estudante';
  return role+' · '+nexoPlanLabel();
}

function isNexoUltra(){
  return nexoAccessTier()==='ultra';
}

function isNexoPlus(){
  return ['plus','ultra'].includes(nexoAccessTier());
}

function planUsageReached(kind){
  const m=state.membership;
  if(!m||isNexoPlus())return false;
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

  Promise.all([
    loadNexoMembership({silent:true}),
    loadNexoJourney({silent:true})
  ]).catch(()=>{});

  // Não arranca o aluno da questão e joga direto para a página de planos.
  // O limite continua existindo, mas a oferta de upgrade passa a ser uma escolha.
  toast(message,'info');

  if(String(error?.message||error||'').includes('nexo_free_daily_question_limit')){
    const card=$('#questionCard');
    if(card&&!$('#questionLimitNotice')){
      const notice=document.createElement('div');
      notice.id='questionLimitNotice';
      notice.className='answer-panel wrong';
      notice.innerHTML=`
        <div class="learning-block primary-learning">
          <span>PLANO FREE</span>
          <h5>As 10 respostas de hoje foram concluídas.</h5>
          <p>Você pode continuar lendo e revisando a questão. Para confirmar novas respostas hoje, o NEXO Plus remove o limite diário.</p>
          <button id="questionLimitPlans" class="outline-btn" type="button">Ver NEXO Plus</button>
        </div>`;
      card.appendChild(notice);
      $('#questionLimitPlans')?.addEventListener('click',()=>openNexoPlans());
    }
  }
  return true;
}

function setUsageBar(id,value,limit){
  const el=$(id);
  if(!el)return;
  const pct=limit<0?100:clamp(Math.round(Number(value||0)*100/Math.max(1,Number(limit||1))),0,100);
  el.style.width=pct+'%';
}

function renderPlanExperience(){
  const m=state.membership||{usage:{},limits:{}};
  const tier=nexoAccessTier();
  const ultra=tier==='ultra',plus=tier==='plus'||ultra;
  const plan=ultra?'ULTRA':plus?'PLUS':'FREE';
  document.body.dataset.plan=ultra?'ultra':plus?'plus':'free';
  if(plus||ultra)$('#questionLimitNotice')?.remove();
  if($('#headerPlanBadge'))$('#headerPlanBadge').textContent=plan;
  if($('#profilePlanLabel'))$('#profilePlanLabel').textContent='Plano '+nexoPlanLabel(tier);
  if($('#profileRole'))$('#profileRole').textContent=nexoRolePlanLabel();
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
  if($('#planUsageStatus'))$('#planUsageStatus').textContent=ultra?'Ultra ativo · todos os recursos liberados':plus?'Plus ativo · sem limites de uso':'Free · limites reiniciam automaticamente';
  const request=$('#requestPlusBtn');
  if(request){
    request.disabled=plus||ultra;
    request.innerHTML=ultra?'✓ NEXO Ultra ativo':plus?'✓ NEXO Plus ativo':'Quero o Plus · R$ 9,99/mês <span>→</span>';
  }
}

async function loadNexoMembership({silent=true}={}){
  if(!state.user?.id)return null;
  try{
    const {data,error}=await client.rpc('get_nexo_membership');
    if(error)throw error;
    const server=data||{};
    state.membership={
      ...server,
      plan:server.plan||'free',
      is_ultra:Boolean(server.is_ultra||server.plan==='ultra'),
      is_plus:Boolean(server.is_plus||server.is_ultra||['plus','ultra'].includes(server.plan))
    };
    renderPlanExperience();
    return state.membership;
  }catch(err){
    console.error('NEXO membership',err);

    // Plano e uso são coisas diferentes: se a leitura de contadores falhar,
    // nunca rebaixe visualmente um Ultra/Plus para Free.
    try{
      const {data:fallback,error:fallbackError}=await client.rpc('get_nexo_access_tier');
      if(fallbackError)throw fallbackError;
      if(fallback){
        state.membership={
          ...(state.membership||{}),
          ...fallback,
          usage:state.membership?.usage||{},
          limits:state.membership?.limits||{},
          plan:fallback.plan||state.membership?.plan||'free',
          is_ultra:Boolean(fallback.is_ultra||fallback.plan==='ultra'),
          is_plus:Boolean(fallback.is_plus||fallback.is_ultra||['plus','ultra'].includes(fallback.plan))
        };
        renderPlanExperience();
        return state.membership;
      }
    }catch(fallbackErr){
      console.error('NEXO access tier fallback',fallbackErr);
    }

    if(!silent)toast('Não foi possível carregar seu plano agora.','error');
    return state.membership||null;
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
    renderPlanExperience();

    $$('.admin-only').forEach(el=>el.classList.toggle('hidden',!isAdmin));
    const roleLabel=$('#profileRole');
    if(roleLabel)roleLabel.textContent=nexoRolePlanLabel();

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



function radarPriorityMeta(score){
  const n=Number(score||0);
  if(n>=80)return {label:'Muito alta',className:'very-high'};
  if(n>=60)return {label:'Alta',className:'high'};
  if(n>=40)return {label:'Média',className:'medium'};
  return {label:'Em observação',className:'watch'};
}

function radarTrainingTopic(subject,topic){
  const exact={
    'Estatística e análise de dados':'Estatística e análise de dados',
    'Porcentagem e matemática financeira':'Porcentagem e matemática financeira',
    'Geometria e trigonometria':'Geometria',
    'Geometria':'Geometria',
    'Probabilidade e combinatória':'Raciocínio quantitativo',
    'Razão, proporção e grandezas':'Raciocínio quantitativo',
    'Aritmética e números':'Raciocínio quantitativo',
    'Álgebra e equações':'Funções e modelagem',
    'Leitura e compreensão':'Leitura e compreensão',
    'Análise do texto literário':'Literatura e análise do texto literário',
    'Movimentos literários':'Literatura e análise do texto literário',
    'Variação linguística e linguagem':'Variação linguística',
    'Interpretação e gêneros textuais':'Interpretação de texto',
    'Coesão, coerência e semântica':'Interpretação de texto',
    'Recursos expressivos e efeitos de sentido':'Interpretação de texto',
    'Teatro, dança e performance':'Linguagens artísticas',
    'Música e cultura':'Linguagens artísticas',
    'Artes visuais':'Linguagens artísticas',
    'Literatura e análise do texto literário':'Literatura e análise do texto literário',
    'Linguagens artísticas':'Linguagens artísticas'
  };
  if(exact[topic])return exact[topic];
  if(/funç/i.test(topic||''))return 'Funções e modelagem';
  const bySubject={
    'Física':'Fenômenos físicos e energia',
    'Química':'Transformações químicas e matéria',
    'Biologia':'Vida, ecologia e saúde',
    'Geografia':'Espaço geográfico e sociedade',
    'História':'Processos históricos e cidadania',
    'Filosofia':'Ética, política e conhecimento',
    'Sociologia':'Sociedade, trabalho e cidadania',
    'Literatura':'Literatura e análise do texto literário',
    'Artes':'Linguagens artísticas',
    'Português':'Interpretação de texto',
    'Língua Estrangeira':'Leitura e compreensão'
  };
  return bySubject[subject]||'';
}

function bindRadarControls(){
  const area=$('#radarArea'),subject=$('#radarSubject'),search=$('#radarSearch');
  if(area&&!area.dataset.bound){
    area.dataset.bound='1';
    area.addEventListener('change',()=>{
      refreshRadarSubjectOptions();
      renderEnemRadar();
    });
  }
  if(subject&&!subject.dataset.bound){
    subject.dataset.bound='1';
    subject.addEventListener('change',renderEnemRadar);
  }
  if(search&&!search.dataset.bound){
    search.dataset.bound='1';
    search.addEventListener('input',renderEnemRadar);
  }
}

function refreshRadarSubjectOptions(){
  const area=$('#radarArea')?.value||'';
  const select=$('#radarSubject');
  if(!select)return;
  const previous=select.value;
  const names=[...new Set((state.radarSubjects||[])
    .filter(row=>!area||row.area===area)
    .map(row=>row.subject)
    .filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b,'pt-BR'));
  select.innerHTML='<option value="">Todas as matérias</option>'+names.map(name=>'<option value="'+esc(name)+'">'+esc(name)+'</option>').join('');
  if(names.includes(previous))select.value=previous;
}

async function loadEnemRadar({silent=true}={}){
  if(!state.user?.id)return null;
  if(state.radarLoaded){
    bindRadarControls();
    refreshRadarSubjectOptions();
    renderEnemRadar();
    renderMathTrail();
    renderNexoToday();
    return state.radarTopics;
  }
  try{
    const [topicsRes,subjectsRes,yearsRes,overviewRes]=await Promise.all([
      client.from('enem_radar_topic_stats').select('area,subject,topic,questions,years_present,first_year,last_year,questions_2021_2025,years_2021_2025,avg_confidence,nexo_priority_score').order('nexo_priority_score',{ascending:false}),
      client.from('enem_radar_subject_stats').select('area,subject,classified_questions,years_present,questions_2021_2025,avg_confidence').order('classified_questions',{ascending:false}),
      client.from('enem_radar_year_stats').select('year,total_items,classified_items,review_items,avg_confidence,subjects_mapped').order('year',{ascending:true}),
      client.from('enem_radar_overview').select('total_items,editions,first_year,last_year,classified_items,review_items,avg_confidence,subjects_mapped,topics_mapped').maybeSingle()
    ]);
    const firstError=topicsRes.error||subjectsRes.error||yearsRes.error||overviewRes.error;
    if(firstError)throw firstError;
    state.radarTopics=topicsRes.data||[];
    state.radarSubjects=subjectsRes.data||[];
    state.radarYears=yearsRes.data||[];
    state.radarOverview=overviewRes.data||null;
    state.radarLoaded=true;
    bindRadarControls();
    refreshRadarSubjectOptions();
    renderEnemRadar();
    return state.radarTopics;
  }catch(err){
    console.error('ENEM radar',err);
    logClientError('enem_radar',err,'radar_load');
    const list=$('#radarList');
    if(list)list.innerHTML='<div class="radar-empty"><b>Não foi possível carregar o Radar agora.</b><small>Tente novamente em alguns instantes.</small></div>';
    if(!silent)toast('Não consegui carregar o Radar ENEM agora.','error');
    return null;
  }
}

function renderEnemRadar(){
  const overview=state.radarOverview||{};
  const topics=state.radarTopics||[];
  const area=$('#radarArea')?.value||'';
  const subject=$('#radarSubject')?.value||'';
  const query=($('#radarSearch')?.value||'').trim().toLocaleLowerCase('pt-BR');
  const fmt=n=>Number(n||0).toLocaleString('pt-BR');

  if($('#radarTotalItems'))$('#radarTotalItems').textContent=fmt(overview.total_items||3060);
  if($('#radarCoverage'))$('#radarCoverage').textContent=(overview.first_year||2009)+' a '+(overview.last_year||2025)+' · '+(overview.editions||17)+' edições';
  if($('#radarTopicsMapped'))$('#radarTopicsMapped').textContent=fmt(overview.topics_mapped||topics.length);
  if($('#radarClassifiedItems'))$('#radarClassifiedItems').textContent=fmt(overview.classified_items||0);
  if($('#radarReviewItems'))$('#radarReviewItems').textContent=fmt(overview.review_items||0)+' itens em revisão editorial';

  const globalTop=topics[0];
  if($('#radarTopTopic'))$('#radarTopTopic').textContent=globalTop?.topic||'—';
  if($('#radarTopTopicMeta'))$('#radarTopTopicMeta').textContent=globalTop
    ? fmt(globalTop.questions)+' questões · '+globalTop.years_present+'/17 edições'
    :'calculando incidência';

  if($('#radarQualityNote')){
    $('#radarQualityNote').textContent=fmt(overview.classified_items||0)+' itens com classificação confiável entram no ranking; '+fmt(overview.review_items||0)+' permanecem em revisão e não distorcem a prioridade.';
  }

  const filtered=topics.filter(row=>{
    if(area&&row.area!==area)return false;
    if(subject&&row.subject!==subject)return false;
    if(query){
      const hay=(String(row.topic||'')+' '+String(row.subject||'')+' '+String(row.area||'')).toLocaleLowerCase('pt-BR');
      if(!hay.includes(query))return false;
    }
    return true;
  });

  if($('#radarResultMeta')){
    const scope=subject||area||'todas as áreas';
    $('#radarResultMeta').textContent=filtered.length+' assuntos · '+scope;
  }

  const list=$('#radarList');
  if(list){
    if(!filtered.length){
      list.innerHTML='<div class="radar-empty"><b>Nenhum assunto encontrado.</b><small>Tente outro filtro ou termo de busca.</small></div>';
    }else{
      list.innerHTML=filtered.map((row,index)=>{
        const score=Math.max(0,Math.min(100,Number(row.nexo_priority_score||0)));
        const priority=radarPriorityMeta(score);
        const key=encodeURIComponent([row.area,row.subject,row.topic].join('||'));
        return '<article class="radar-topic-row">'+
          '<div class="radar-rank">'+String(index+1).padStart(2,'0')+'</div>'+
          '<div class="radar-topic-main">'+
            '<div class="radar-topic-head"><div><span>'+esc(row.subject)+'</span><h3>'+esc(row.topic)+'</h3></div><b class="radar-priority '+priority.className+'">'+priority.label+'</b></div>'+
            '<div class="radar-topic-stats"><span><b>'+fmt(row.questions)+'</b> questões</span><span><b>'+row.years_present+'/17</b> edições</span><span><b>'+fmt(row.questions_2021_2025)+'</b> desde 2021</span><span>última: <b>'+row.last_year+'</b></span></div>'+
            '<div class="radar-score-line"><i style="--radar-score:'+score+'%"></i><span>Índice NEXO <b>'+score.toFixed(1)+'</b></span></div>'+
          '</div>'+
          '<div class="radar-actions">'+
            (row.topic==='Estatística e análise de dados'?'<button class="outline-btn radar-study-btn" data-radar-study="'+key+'">Estudar <span>→</span></button>':'')+
            '<button class="outline-btn radar-train-btn" data-radar-train="'+key+'">Treinar <span>→</span></button>'+
          '</div>'+
        '</article>';
      }).join('');
      $$('[data-radar-study]',list).forEach(btn=>{
        btn.onclick=async()=>{
          if(btn.disabled)return;
          const key=decodeURIComponent(btn.dataset.radarStudy||'');
          const row=topics.find(item=>[item.area,item.subject,item.topic].join('||')===key);
          if(!row)return;
          const previous=btn.innerHTML;
          btn.disabled=true;
          btn.textContent='Abrindo aula...';
          try{await startRadarContent(row)}
          catch(err){
            console.error('radar study',err);
            logClientError('enem_radar',err,'radar_study');
            toast('Não consegui abrir essa aula agora.','error');
          }finally{
            btn.disabled=false;
            btn.innerHTML=previous;
          }
        };
      });
      $$('[data-radar-train]',list).forEach(btn=>{
        btn.onclick=async()=>{
          if(btn.disabled)return;
          const key=decodeURIComponent(btn.dataset.radarTrain||'');
          const row=topics.find(item=>[item.area,item.subject,item.topic].join('||')===key);
          if(!row)return;
          const previous=btn.innerHTML;
          btn.disabled=true;
          btn.textContent='Abrindo treino...';
          try{
            await startRadarTraining(row);
          }catch(err){
            console.error('radar train',err);
            logClientError('enem_radar',err,'radar_train');
            toast('Não consegui abrir esse treino agora.','error');
          }finally{
            btn.disabled=false;
            btn.innerHTML=previous;
          }
        };
      });
    }
  }

  const yearGrid=$('#radarYearGrid');
  if(yearGrid){
    yearGrid.innerHTML=(state.radarYears||[]).map(row=>{
      const classified=Number(row.classified_items||0);
      const total=Number(row.total_items||180);
      const pct=total?Math.round((classified/total)*100):0;
      return '<div class="radar-year-cell" title="'+classified+' de '+total+' itens com classificação confiável"><b>'+row.year+'</b><span>'+pct+'%</span><i style="--year-score:'+pct+'%"></i></div>';
    }).join('');
  }
}

async function startRadarContent(row){
  if(!row)return;
  if(!state.materials.length)await loadMaterials({silent:true});
  const wanted=String(radarTrainingTopic(row.subject,row.topic)||row.topic||'').toLocaleLowerCase('pt-BR');
  const item=(state.materials||[]).find(m=>
    String(m.topic||'').toLocaleLowerCase('pt-BR')===wanted &&
    (!row.subject||!m.subject||String(m.subject).toLocaleLowerCase('pt-BR')===String(row.subject).toLocaleLowerCase('pt-BR'))
  );
  if(!item){
    toast('A Aula NEXO deste assunto ainda está em preparação.','info');
    return;
  }
  await openContentViewer('material',item.id);
}

async function startRadarTraining(row,skipGate=false){
  if(!row)return;
  if(!skipGate){
    if(!state.materials.length)await loadMaterials({silent:true});
    const lesson=topicLesson(row.topic,row.subject);
    if(lesson&&showGuidedTraining(lesson,{source:'radar',size:10}))return;
  }
  const preferredTopic=radarTrainingTopic(row.subject,row.topic);
  const candidates=[
    {area:row.area||'',subject:row.subject||'',topic:row.topic||'',radarTopic:row.topic||'',fallbackTopic:preferredTopic||row.topic||''},
    {area:row.area||'',subject:row.subject||'',topic:preferredTopic||''},
    {area:row.area||'',subject:row.subject||'',topic:''},
    {area:row.area||'',subject:'',topic:''}
  ];
  let chosen=null;
  try{
    for(const candidate of candidates){
      const preview=await fetchQuestions(candidate);
      if(preview.length){chosen=candidate;break;}
    }
  }catch(err){
    console.error('radar training preview',err);
  }
  if(!chosen){
    toast('Ainda não há questões desse recorte no banco de treino.','info');
    return;
  }
  openPage('questoes');
  resetSessionUI();
  await startStudySession({...chosen,mode:'radar',size:10,difficulty:'',visualOnly:false});
  if(state.session){
    $('#sessionAreaBadge').textContent='Radar ENEM';
    $('#sessionTitle').textContent=row.topic;
    $('#sessionSubtitle').textContent='Treino sugerido pelo Radar com base na incidência histórica de 2009 a 2025.';
  }
}


const NEXO_WEEK_DAYS=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];

function weekTaskIcon(type){
  return ({questions:'✓',review:'↻',focus:'◷',essay:'✎',simulation:'▤',errors:'!',recovery:'+'})[type]||'•';
}
function weekTaskActionLabel(type){
  return ({questions:'Treinar agora',review:'Revisar agora',focus:'Abrir foco',essay:'Escrever redação',simulation:'Fazer simulado',errors:'Revisar erros',recovery:'Recuperar'})[type]||'Começar';
}
async function loadNexoWeekPlan({silent=true}={}){
  if(!state.user?.id)return null;
  try{
    const {data,error}=await client.rpc('get_or_create_nexo_week_plan');
    if(error)throw error;
    state.weekPlan=data||null;
    renderNexoWeekPlan();
    return state.weekPlan;
  }catch(err){
    console.error('NEXO week plan',err);
    logClientError('week_plan',err,'week_load');
    if(!silent)toast('Não consegui montar sua Semana NEXO agora.','error');
    return null;
  }
}
function renderNexoWeekPlan(){
  renderLongRangePlan();
  const plan=state.weekPlan||{},tasks=Array.isArray(plan.tasks)?plan.tasks:[];
  const completed=Number(plan.completed||tasks.filter(t=>t.status==='completed').length||0);
  const total=Number(plan.total||tasks.length||7),pct=total?Math.round(completed*100/total):0;
  const today=(new Date().getDay()+6)%7;
  $$('[data-week-progress]').forEach(el=>el.textContent=completed+'/'+total);
  $$('[data-week-summary]').forEach(el=>el.textContent=tasks.length?'Plano de '+Number(plan.daily_minutes||state.profile?.daily_minutes||60)+' min/dia · '+completed+' de '+total+' missões concluídas.':'Complete seu diagnóstico para o NEXO montar a semana.');
  $$('[data-week-tasks]').forEach(el=>{
    const compact=el.closest('.mobile-week-card')?tasks.slice(0,3):tasks.slice(0,4);
    el.innerHTML=compact.length?compact.map(task=>`<button class="week-mini-task ${task.status==='completed'?'done':''} ${Number(task.day_index)===today?'today':''}" data-week-open="${task.id}"><span>${weekTaskIcon(task.task_type)}</span><div><b>${NEXO_WEEK_DAYS[Number(task.day_index)]||'Dia'} · ${esc(task.title)}</b><small>${esc(task.topic||task.subject||task.area||'Plano NEXO')} · ${Number(task.target_minutes||0)} min</small></div><i>${task.status==='completed'?'✓':'→'}</i></button>`).join(''):'<p class="week-loading">Faça algumas questões para liberar o plano semanal.</p>';
  });
  if($('#weekFullProgress'))$('#weekFullProgress').textContent=pct+'%';
  if($('#weekFullTitle'))$('#weekFullTitle').textContent=completed===total&&total?'Semana concluída. Excelente consistência.':'Seu plano adaptativo desta semana';
  if($('#weekFullSummary')){const phase=studyPhaseMeta();$('#weekFullSummary').textContent=phase.label+' · '+(phase.days>0?phase.days+' dias para o primeiro domingo · ':'')+'o NEXO distribuiu '+total+' missões usando seu tempo disponível e suas prioridades atuais.';}
  const grid=$('#weekFullGrid');
  if(grid){
    grid.innerHTML=tasks.length?tasks.map(task=>`<article class="panel week-day-card ${task.status==='completed'?'done':''} ${Number(task.day_index)===today?'today':''}"><header><span>${String(Number(task.day_index)+1).padStart(2,'0')} · ${NEXO_WEEK_DAYS[Number(task.day_index)]||'Dia'}</span><b>${task.status==='completed'?'CONCLUÍDO':Number(task.day_index)===today?'HOJE':'PLANEJADO'}</b></header><div class="week-day-main"><span class="week-day-icon">${weekTaskIcon(task.task_type)}</span><div><h3>${esc(task.title)}</h3><p>${esc(task.topic||task.subject||task.area||'Atividade personalizada')}</p></div></div><div class="week-day-meta"><span>${Number(task.target_minutes||0)} min</span>${task.target_count?'<span>'+Number(task.target_count)+' item(ns)</span>':''}</div><div class="week-day-actions"><button class="outline-btn" data-week-launch="${task.id}">${weekTaskActionLabel(task.task_type)}</button><button class="primary-btn" data-week-complete="${task.id}" ${task.status==='completed'?'disabled':''}>${task.status==='completed'?'✓ Concluído':'Marcar concluído'}</button></div></article>`).join(''):'<article class="panel"><p style="color:var(--muted)">Ainda não há tarefas para esta semana.</p></article>';
    $$('[data-week-launch]',grid).forEach(btn=>btn.onclick=()=>{const task=tasks.find(t=>String(t.id)===String(btn.dataset.weekLaunch));if(task)launchNexoWeekTask(task)});
    $$('[data-week-complete]',grid).forEach(btn=>btn.onclick=()=>completeNexoWeekTask(Number(btn.dataset.weekComplete)));
  }
  $$('[data-week-open]').forEach(btn=>btn.onclick=()=>openPage('semana'));
}
async function completeNexoWeekTask(taskId){
  try{
    const {data,error}=await client.rpc('complete_nexo_week_task',{p_task_id:Number(taskId)});
    if(error)throw error;
    toast(data?.awarded?'Missão concluída · +30 XP e +5 N-Coins':'Missão concluída.');
    await Promise.all([loadNexoWeekPlan({silent:true}),loadNexoJourney({silent:true})]);
  }catch(err){console.error('week task complete',err);toast('Não consegui concluir essa missão agora.','error')}
}
async function launchNexoWeekTask(task){
  if(!task)return;
  const type=task.task_type;
  if(type==='focus'){const min=Number(task.target_minutes||25);if(!focusModeState.running)setFocusMinutes([25,45,60].reduce((best,x)=>Math.abs(x-min)<Math.abs(best-min)?x:best,25));openFocusMode();return}
  if(type==='essay'){openPage('redacao');$('#randomEssayTheme')?.click();setTimeout(()=>$('#essayText')?.focus(),120);return}
  if(type==='simulation'){openPage('questoes');await startStudySession({mode:'simulado',area:task.area||'',subject:'',topic:'',difficulty:'',visualOnly:false,size:Number(task.target_count||20)});return}
  if(type==='errors'){openPage('desempenho');await startErrorReview();return}
  openPage('questoes');
  await startStudySession({mode:type==='review'?'review':'adaptive',area:task.area||'',subject:task.subject||'',topic:task.topic||'',difficulty:'',visualOnly:false,size:Number(task.target_count||8)});
}


async function loadSavedQuestions({render=true}={}){
  if(!state.user?.id)return state.savedQuestions;
  try{
    const {data,error}=await client.from('saved_questions').select('question_id').eq('user_id',state.user.id).order('created_at',{ascending:false});
    if(error)throw error;
    state.savedQuestions=new Set((data||[]).map(x=>Number(x.question_id)));
    if(render)renderSavedQuestions();
    updateCurrentQuestionSaveButton();
    return state.savedQuestions;
  }catch(err){
    console.error('saved questions',err);
    return state.savedQuestions;
  }
}
function updateCurrentQuestionSaveButton(){
  const btn=$('#saveCurrentQuestion');
  if(!btn||!state.current)return;
  const saved=state.savedQuestions.has(Number(state.current.id));
  btn.textContent=saved?'★ Salva':'☆ Salvar questão';
  btn.classList.toggle('is-saved',saved);
}
async function toggleSavedQuestion(questionId){
  const id=Number(questionId);
  if(!id||!state.user?.id)return;
  const saved=state.savedQuestions.has(id);
  try{
    if(saved){
      const {error}=await client.from('saved_questions').delete().eq('user_id',state.user.id).eq('question_id',id);
      if(error)throw error;
      state.savedQuestions.delete(id);
      toast('Questão removida dos salvos.');
    }else{
      const {error}=await client.from('saved_questions').insert({user_id:state.user.id,question_id:id});
      if(error)throw error;
      state.savedQuestions.add(id);
      toast('Questão salva no seu caderno.');
    }
    updateCurrentQuestionSaveButton();
    renderSavedQuestions();
  }catch(err){
    console.error('toggle saved question',err);
    toast('Não consegui atualizar seus salvos agora.','error');
  }
}
function renderSavedQuestions(){
  const list=$('#savedQuestionList'),count=$('#savedQuestionsCount');
  if(count)count.textContent=state.savedQuestions.size+' salva'+(state.savedQuestions.size===1?'':'s');
  if(!list)return;
  const rows=(state.questionMeta||[]).filter(q=>state.savedQuestions.has(Number(q.id)));
  list.innerHTML=rows.length?rows.map(q=>`<article class="saved-question-row"><span>★</span><div><b>${esc(q.topic||q.subject||'Questão ENEM')}</b><small>${esc(q.subject||q.area||'')} · ENEM ${esc(q.source_year||'')} · Q${esc(q.source_question_number||q.id)}</small></div><button data-saved-open="${q.id}">Abrir →</button></article>`).join(''):'<p style="color:var(--muted)">Você ainda não salvou nenhuma questão.</p>';
  $$('[data-saved-open]',list).forEach(btn=>btn.onclick=()=>openSingleQuestion(Number(btn.dataset.savedOpen)));
}

function openQuestionIssueModal(questionId=state.current?.id){
  if(!questionId)return;
  state.questionReportTarget=Number(questionId);
  $('#questionIssueDetails').value='';
  $('#questionIssueType').value='gabarito';
  $('#questionIssueModal').classList.remove('hidden');
  document.body.style.overflow='hidden';
}
function closeQuestionIssueModal(){
  $('#questionIssueModal')?.classList.add('hidden');
  document.body.style.overflow='';
  state.questionReportTarget=null;
}
$('#closeQuestionIssue')?.addEventListener('click',closeQuestionIssueModal);
$('#cancelQuestionIssue')?.addEventListener('click',closeQuestionIssueModal);
$('#questionIssueModal')?.addEventListener('click',e=>{if(e.target===$('#questionIssueModal'))closeQuestionIssueModal()});
$('#sendQuestionIssue')?.addEventListener('click',async()=>{
  const questionId=Number(state.questionReportTarget||0);
  if(!questionId)return;
  const issue_type=$('#questionIssueType').value,details=$('#questionIssueDetails').value.trim(),btn=$('#sendQuestionIssue');
  btn.disabled=true;btn.textContent='Enviando...';
  try{
    const {error}=await client.from('question_issue_reports').insert({user_id:state.user.id,question_id:questionId,issue_type,details:details||null});
    if(error)throw error;
    closeQuestionIssueModal();
    toast('Reporte enviado. Obrigado por ajudar a revisar o banco.');
  }catch(err){
    console.error('question issue',err);
    const msg=String(err?.message||err||'');
    toast(msg.includes('duplicate')||msg.includes('unique')?'Você já tem um reporte aberto para esta questão.':'Não consegui enviar o reporte.','error');
  }finally{btn.disabled=false;btn.textContent='Enviar reporte'}
});
async function loadAdminQuestionIssues(){
  if(state.profile?.role!=='admin')return;
  const target=$('#adminQuestionIssues');if(!target)return;
  try{
    const {data,error}=await client.from('question_issue_reports')
      .select('id,question_id,issue_type,details,status,created_at,question:questions(area,subject,topic,source_year,source_question_number)')
      .in('status',['open','reviewing']).order('created_at',{ascending:false}).limit(100);
    if(error)throw error;
    if($('#questionIssueCount'))$('#questionIssueCount').textContent=(data||[]).length+' abertos';
    target.innerHTML=(data||[]).length?(data||[]).map(row=>`<div class="feedback-entry question-issue-admin"><span class="mini-avatar">!</span><div><b>${esc(String(row.issue_type||'outro').toUpperCase())} · Q${esc(row.question?.source_question_number||row.question_id)}</b><p>${esc(row.details||'Sem detalhes adicionais.')}</p><small>${esc(row.question?.subject||row.question?.area||'')} · ${esc(row.question?.topic||'')} · ${new Date(row.created_at).toLocaleString('pt-BR')}</small><div class="comment-actions"><button data-issue-open="${row.question_id}">Abrir questão</button><button data-issue-resolve="${row.id}">Resolver</button><button class="danger" data-issue-dismiss="${row.id}">Descartar</button></div></div></div>`).join(''):'<p style="color:var(--muted)">Nenhum problema de questão aberto.</p>';
    $$('[data-issue-open]',target).forEach(btn=>btn.onclick=()=>openSingleQuestion(Number(btn.dataset.issueOpen)));
    $$('[data-issue-resolve]',target).forEach(btn=>btn.onclick=()=>resolveQuestionIssue(Number(btn.dataset.issueResolve),'resolved'));
    $$('[data-issue-dismiss]',target).forEach(btn=>btn.onclick=()=>resolveQuestionIssue(Number(btn.dataset.issueDismiss),'dismissed'));
  }catch(err){
    console.error('admin question issues',err);
    target.innerHTML='<p style="color:var(--muted)">Não foi possível carregar os reportes agora.</p>';
  }
}
async function resolveQuestionIssue(id,status){
  const note=prompt(status==='resolved'?'Observação da correção (opcional)':'Motivo do descarte (opcional)','')??'';
  const {error}=await client.from('question_issue_reports').update({status,admin_note:note||null,resolved_at:new Date().toISOString(),resolved_by:state.user.id}).eq('id',Number(id));
  if(error)return toast('Não foi possível atualizar o reporte.','error');
  toast(status==='resolved'?'Reporte resolvido.':'Reporte descartado.');
  loadAdminQuestionIssues();
}



async function loadAdminProductAnalytics(){
  if(state.profile?.role!=='admin')return;
  const el=$('#adminProductAnalytics');if(!el)return;
  try{
    const {data,error}=await client.rpc('get_admin_product_metrics');
    if(error)throw error;
    const pages=Array.isArray(data?.page_views_7d)?data.page_views_7d:[];
    el.innerHTML='<div class="admin-product-kpis">'+[
      ['Usuários ativos · 7d',Number(data?.active_users_7d||0)],
      ['Questões · 7d',Number(data?.attempts_7d||0)],
      ['Acerto · 7d',Number(data?.accuracy_7d||0)+'%'],
      ['Conteúdos concluídos · 7d',Number(data?.content_completions_7d||0)],
      ['Redações · 30d',Number(data?.essays_30d||0)],
      ['Sessões · 7d',Number(data?.sessions_7d||0)]
    ].map(x=>'<article><small>'+x[0]+'</small><b>'+x[1]+'</b></article>').join('')+'</div>'+
    '<div class="admin-page-views"><b>Páginas mais abertas · 7 dias</b>'+(pages.length?pages.map(x=>'<div><span>'+esc(x.page)+'</span><strong>'+Number(x.views||0)+'</strong></div>').join(''):'<p>Sem eventos suficientes ainda.</p>')+'</div>';
  }catch(err){
    console.error('admin product analytics',err);
    el.innerHTML='<p class="learning-empty">Não foi possível carregar as métricas agora.</p>';
  }
}
$('#refreshProductAnalytics')?.addEventListener('click',loadAdminProductAnalytics);

async function loadEssayHistory(){
  if(!state.user?.id)return [];
  try{
    const {data,error}=await client.from('essays')
      .select('id,theme_title,essay_text,status,estimated_score,competencies,feedback,revision_of,version_number,word_count,created_at')
      .eq('user_id',state.user.id).eq('status','reviewed').order('created_at',{ascending:false}).limit(30);
    if(error)throw error;
    state.essayHistory=data||[];
    renderEssayHistory();
    return state.essayHistory;
  }catch(err){console.error('essay history',err);return []}
}
function essayScoresFromRow(row){
  const c=row?.competencies||{};
  return [c.c1,c.c2,c.c3,c.c4,c.c5].map(x=>Number(x||0));
}
function renderEssayHistory(){
  const list=$('#essayHistoryList'),summary=$('#essayHistorySummary'),trend=$('#essayHistoryTrend');
  if(!list)return;
  const rows=state.essayHistory||[],latest=rows[0],previous=rows[1];
  const avg=rows.length?Math.round(rows.reduce((sum,r)=>sum+Number(r.estimated_score||0),0)/rows.length):0;
  const delta=latest&&previous?Number(latest.estimated_score||0)-Number(previous.estimated_score||0):0;
  if(trend)trend.textContent=!latest?'—':!previous?'1ª redação':(delta>0?'+'+delta:delta)+' pts';
  if(summary)summary.innerHTML=rows.length?`<span><b>${Number(latest.estimated_score||0)}</b><small>última nota</small></span><span><b>${avg}</b><small>média</small></span><span><b>${rows.length}</b><small>correções</small></span>`:'';
  list.innerHTML=rows.length?rows.map(row=>{
    const scores=essayScoresFromRow(row),weak=scores.indexOf(Math.min(...scores))+1;
    return `<button class="essay-history-row" data-essay-history="${row.id}"><span class="essay-history-score">${Number(row.estimated_score||0)}</span><div><b>${esc(row.theme_title||'Redação')}</b><small>${new Date(row.created_at).toLocaleDateString('pt-BR')} · C${weak} para revisar${Number(row.version_number||1)>1?' · versão '+Number(row.version_number):''}</small></div><i>→</i></button>`;
  }).join(''):'<p style="color:var(--muted)">Seu histórico aparecerá aqui após a primeira correção.</p>';
  $$('[data-essay-history]',list).forEach(btn=>btn.onclick=()=>openEssayHistory(Number(btn.dataset.essayHistory)));
  renderEssayIntelligenceV5();
}
function openEssayHistory(id){
  const row=(state.essayHistory||[]).find(x=>Number(x.id)===Number(id));if(!row)return;
  const scores=essayScoresFromRow(row);
  showEssayResult(row.essay_text||'',scores,Number(row.estimated_score||scores.reduce((a,b)=>a+b,0)));
  $('#essayResult')?.scrollIntoView({behavior:'smooth',block:'start'});
  setTimeout(()=>{
    const actions=$('#essayResult .essay-priority-actions');
    if(actions&&!$('#rewriteHistoryEssay')){
      const btn=document.createElement('button');
      btn.id='rewriteHistoryEssay';btn.className='primary-btn';btn.textContent='Reescrever esta versão';btn.onclick=()=>rewriteEssayHistory(row.id);actions.appendChild(btn);
    }
  },30);
}
function rewriteEssayHistory(id){
  const row=(state.essayHistory||[]).find(x=>Number(x.id)===Number(id));if(!row)return;
  state.essayRevisionOf=Number(row.id);
  $('#essayTheme').value='custom';updateEssayPrompt();
  $('#customEssayTheme').value=row.theme_title||'Reescrita';
  $('#customEssayPrompt').value='Reescreva sua versão anterior melhorando a competência prioritária indicada pelo Professor Nexo.';
  $('#essayText').value=row.essay_text||'';
  $('#wordCount').textContent=(($('#essayText').value.match(/\S+/g)||[]).length)+' palavras';
  updateEssayPrompt();
  $('#essayText').focus();$('#essayText').scrollIntoView({behavior:'smooth',block:'center'});
  toast('Modo reescrita ativado. Sua próxima correção ficará ligada à versão anterior.');
}
function currentEssayVersionNumber(){
  if(!state.essayRevisionOf)return 1;
  const parent=(state.essayHistory||[]).find(x=>Number(x.id)===Number(state.essayRevisionOf));
  return Math.max(2,Number(parent?.version_number||1)+1);
}


function studyResumeKey(){
  return 'nexo-resume-session:'+String(state.user?.id||'guest');
}
function persistStudySession(){
  if(!state.user?.id||!state.session?.queue?.length)return;
  try{
    const s=state.session;
    localStorage.setItem(studyResumeKey(),JSON.stringify({
      savedAt:Date.now(),
      ids:s.queue.map(q=>Number(q.id)).filter(Boolean),
      index:Number(s.index||0),
      size:Number(s.size||s.queue.length),
      mode:s.mode||'manual',
      area:s.area||'',
      subject:s.subject||'',
      topic:s.topic||'',
      difficulty:s.difficulty||'',
      visualOnly:Boolean(s.visualOnly),
      reviewMode:Boolean(s.reviewMode),
      coreSessionId:s.coreSessionId||null,
      maxHints:s.maxHints||null,
      coachTimeSeconds:s.coachTimeSeconds||null,
      coachLongSeconds:s.coachLongSeconds||null,
      examMode:Boolean(s.examMode),
      examStartedAt:s.examStartedAt||null,
      paceAlerts:s.paceAlerts||{}
    }));
  }catch(_){}
}
function readPersistedStudySession(){
  try{
    const raw=localStorage.getItem(studyResumeKey());
    if(!raw)return null;
    const saved=JSON.parse(raw);
    if(!saved?.ids?.length||Date.now()-Number(saved.savedAt||0)>12*60*60*1000){
      localStorage.removeItem(studyResumeKey());
      return null;
    }
    if(Number(saved.index||0)>=Number(saved.size||saved.ids.length)){
      localStorage.removeItem(studyResumeKey());
      return null;
    }
    return saved;
  }catch(_){return null}
}
function clearPersistedStudySession(){
  try{localStorage.removeItem(studyResumeKey())}catch(_){}
  decorateResumeStudySession();
}
function decorateResumeStudySession(){
  const saved=readPersistedStudySession();
  ['#recentAttempts','#mobileRecent'].forEach(selector=>{
    const el=$(selector);if(!el)return;
    el.querySelector('.resume-study-row')?.remove();
    if(!saved)return;
    const row=document.createElement('button');
    row.className='resume-study-row';
    row.innerHTML='<span>▶</span><div><b>Continuar sessão</b><small>Questão '+(Number(saved.index||0)+1)+' de '+Number(saved.size||saved.ids.length)+' · '+esc(saved.topic||saved.subject||saved.area||'treino')+'</small></div><i>→</i>';
    row.onclick=resumePersistedStudySession;
    el.prepend(row);
  });
}
async function resumePersistedStudySession(){
  const saved=readPersistedStudySession();
  if(!saved)return toast('Não há sessão pendente.');
  try{
    const fields='id,area,subject,topic,difficulty,source_year,source_exam,source_question_number,source_reference,base_text,prompt,options,media_type,media_path,source_pdf_url,source_page,media_crop';
    const {data,error}=await client.from('questions').select(fields).in('id',saved.ids).eq('is_active',true);
    if(error)throw error;
    const byId=new Map((data||[]).map(q=>[Number(q.id),q]));
    const queue=saved.ids.map(id=>byId.get(Number(id))).filter(Boolean);
    if(!queue.length)throw new Error('session questions unavailable');
    state.session={...saved,queue,size:queue.length,index:Math.min(Number(saved.index||0),queue.length-1),correctStreak:0,wrongStreak:0,answeredCount:0,resultStats:{correct:0,wrong:0,totalSeconds:0,wrongIds:[],correctIds:[],xp:0,coins:0,patterns:{}}};
    openPage('questoes');
    $('#sessionSetup').classList.add('hidden');$('#studyWorkspace').classList.remove('hidden');
    $('#sessionAreaBadge').textContent=saved.mode==='core'?'NEXO Core':(saved.area||'Treino');
    $('#sessionTitle').textContent=saved.topic||saved.subject||saved.area||'Sessão retomada';
    $('#sessionSubtitle').textContent='Você voltou exatamente de onde parou.';
    updateStudyNavigation(state.session);
    ensureExamClock();
    await showCurrentQuestion();
    toast('Sessão retomada.');
  }catch(err){
    console.error('resume session',err);
    clearPersistedStudySession();
    toast('Não consegui retomar essa sessão.','error');
  }
}

function maintenanceModuleForPage(id){
  return ({
    questoes:'questions',
    banco:'questions',
    semana:'core',
    redacao:'essays',
    ranking:'journey',
    videoaulas:'content',
    materiais:'content',
    radar:'content'
  })[id]||null;
}


function contextPlanForPage(id=$('.page.active')?.id||'inicio'){
  const saved=readPersistedStudySession();
  const rec=state.core?.recommended_action||null;
  const top=state.personalRadar?.[0]||buildPersonalRadar?.()?.[0]||null;
  const essay=typeof essayPrioritySignal==='function'?essayPrioritySignal():null;
  const phase=studyPhaseMeta();
  if(id==='questoes'){
    const topic=state.session?.topic||state.session?.subject||state.session?.area||'Questões';
    return {
      where:state.session?'Questões · '+topic:'Questões · montar sessão',
      why:state.session?.examMode?'Treinar decisão e ritmo em condição de prova':state.session?'Aplicar o conteúdo e alimentar seu diagnóstico':'Escolher um recorte para treinar sem dispersão',
      next:state.answered?'Próxima questão':state.session?'Responder com calma':'Montar sessão',
      action:()=>state.answered?nextQuestion():state.session?$('#questionCard')?.scrollIntoView({behavior:'smooth'}):$('#sessionSetup')?.scrollIntoView({behavior:'smooth'})
    };
  }
  if(id==='materiais'){
    return {where:'Biblioteca · '+(state.materialSubject||'conteúdos'),why:'Transformar prioridade em entendimento antes do treino',next:top?.topic||'Continuar matéria',action:()=>top?.topic?openLibraryTopic(top.subject||state.materialSubject,top.topic):null};
  }
  if(id==='desempenho'){
    return {where:'Desempenho',why:'Descobrir onde seu próximo minuto rende mais',next:top?.topic||'Treinar prioridade',action:()=>{if(top?.topic){openPage('questoes');return startStudySession({mode:'core',area:top.area||'',subject:top.subject||'',topic:top.topic||'',radarTopic:top.topic||'',size:5,difficulty:'',visualOnly:false})}return startAdaptive()}};
  }
  if(id==='redacao'){
    return {where:'Redação'+(essay?' · '+essay.trainer.code:''),why:essay?'Sua competência mais fraca merece um treino específico':'Construir histórico por competência',next:essay?'Treinar '+essay.trainer.code:'Escrever uma redação',action:()=>{if(essay){state.essayTrainingCompetency=essay.index;renderEssayIntelligenceV5();$('#essayCompetencyPlan')?.scrollIntoView({behavior:'smooth'})}else $('#essayText')?.focus()}};
  }
  if(id==='simulados'){
    return {where:'Simulados · '+phase.label,why:'Treinar conteúdo, ritmo e decisão juntos',next:phase.key==='eve'?'Sprint 5 questões':'Mini ENEM',action:()=>document.querySelector(phase.key==='eve'?'[data-sim-mode="sprint"]':'[data-sim-mode="mini"]')?.click()};
  }
  if(id==='semana'){
    return {where:'Semana NEXO · '+phase.label,why:phase.description,next:phase.recovery?'Retomar leve':'Plano de hoje',action:()=>phase.recovery?startRecoverySession():startTimedStudyMode('30')};
  }
  if(id==='ranking'){
    return {where:'NEXO Jornada',why:'Recompensar consistência e progresso real',next:'Missões de hoje',action:()=>setJourneyTab('missions')};
  }
  if(saved)return {where:'Início',why:'Preservar o contexto que você já começou',next:'Continuar sessão',action:()=>resumePersistedStudySession()};
  if(rec)return {where:'Início · '+phase.label,why:rec.reason||'O Core cruzou seu desempenho e prioridade',next:rec.topic||rec.subject||'Treino recomendado',action:()=>startCoreRecommendation()};
  return {where:'Início · '+phase.label,why:'Construir dados suficientes para personalizar sua rota',next:'Começar diagnóstico',action:()=>{openPage('questoes');resetSessionUI()}};
}
function renderNexoContextBar(id=$('.page.active')?.id||'inicio'){
  const bar=$('#nexoContextBar');if(!bar)return;
  const plan=contextPlanForPage(id);
  if($('#contextWhere'))$('#contextWhere').textContent=plan.where;
  if($('#contextWhy'))$('#contextWhy').textContent=plan.why;
  if($('#contextNext'))$('#contextNext').textContent=plan.next;
  const btn=$('#contextNextAction');
  if(btn)btn.onclick=plan.action||(()=>{});
}
function closeNexoContextBar(){
  const bar=$('#nexoContextBar');
  if(!bar)return;
  bar.classList.add('is-dismissed');
}
$('#contextClose')?.addEventListener('click',closeNexoContextBar);
function openPage(id) {
  const featureByPage={desempenho:'v3_intelligence',simulados:'v4_exam_strategy',redacao:'v5_essay_intelligence',ranking:'v6_community'};
  const requiredFlag=featureByPage[id];
  if(requiredFlag&&!featureEnabled(requiredFlag)){
    toast('Este módulo está temporariamente indisponível.','info');
    return;
  }
  const maintenanceKey=maintenanceModuleForPage(id);
  if(maintenanceKey&&blockMaintenance(maintenanceKey))return;
  if (id === 'admin' && state.profile?.role !== 'admin') {
    toast('Essa área é restrita ao administrador.','error'); return;
  }
  $$('.page').forEach(p=>p.classList.toggle('active',p.id===id));
  $$('.nav-item[data-page], .mobile-bottom [data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===id));
  toggleMenu(false);
  window.scrollTo({top:0,behavior:document.body.dataset.motion==='reduced'?'auto':'smooth'});
  logProductEvent('page_view',{},id);
  if (id==='inicio') { renderNexoToday(); renderMathTrail(); }
  if (id==='desempenho') renderPerformance();
  if (id==='focos') renderFocus();
  if (id==='videoaulas') loadVideos();
  if (id==='materiais') loadMaterials();
  if (id==='radar') loadEnemRadar({silent:false});
  if (id==='banco') { renderBank(); renderSavedQuestions(); }
  if (id==='semana') loadNexoWeekPlan({silent:false});
  if (id==='redacao') {
    loadEssayThemeProgress({rerender:true}).catch(()=>{});
    updateOfficialEssaySheetAction().catch(()=>{});
    loadEssayHistory().catch(()=>{});
  }
  if (id==='feedback') loadMyFeedback();
  if (id==='ranking') loadNexoJourney();
  if (id==='planos') { loadNexoMembership({silent:true}); renderPlanExperience(); }
  if (id==='admin') { loadAdmin(); loadAdminProductAnalytics(); }
  renderNexoContextBar(id);
  if(id==='semana')renderLongRangePlan();
  if(typeof scheduleNexoPercentTones==='function')scheduleNexoPercentTones();
}
$$('[data-page]').forEach(b=>b.addEventListener('click',e=>{
  e.preventDefault();
  if(b.matches('.mobile-hero .primary-btn[data-page="questoes"]')){
    const saved=readPersistedStudySession();
    const partial=(state.materials||[]).map(item=>({item,p:getContentProgress('material',item.id)})).filter(x=>Number(x.p.progress_percent||0)>0&&!x.p.completed).sort((a,b)=>new Date(b.p.last_opened_at||0)-new Date(a.p.last_opened_at||0))[0];
    if(saved)return resumePersistedStudySession();
    if(partial?.item){openPage('materiais');setTimeout(()=>openContentViewer('material',partial.item.id),80);return}
  }
  openPage(b.dataset.page);
}));

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

  await safeBootStep('membership',async()=>loadNexoMembership({silent:true}));
  renderPlanExperience();

  const name = state.profile.full_name || state.user.email?.split('@')[0] || 'Aluno';
  await safeBootStep('identidade',async()=>{
    if($('#profileName'))$('#profileName').textContent = name.split(' ')[0];
    if($('#menuName'))$('#menuName').textContent = name;
    if($('#menuEmail'))$('#menuEmail').textContent = state.user.email || '';
    if($('#profileRole'))$('#profileRole').textContent=nexoRolePlanLabel();
    if($('#avatarFallback'))$('#avatarFallback').textContent=initials(name);
    $$('.admin-only').forEach(el=>el.classList.toggle('hidden',state.profile.role!=='admin'));
  });
  await safeBootStep('estilo',async()=>applyNexoStyle(state.profile.assistant_outfit || localStorage.getItem('nexo-style') || localStorage.getItem('nia-outfit') || 'classic', false));
  await safeBootStep('home',async()=>{updateHomeExperience();renderHapticPreference()});
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
    loadSystemModules({silent:true}),
    loadVideos({silent:true}),
    loadMaterials({silent:true}),
    loadTopicMastery(),
    loadSavedQuestions({render:false}),
    loadNexoWeekPlan({silent:true}),
    loadFeatureFlags(),
    loadDueReviewItems()
  ]);
  results.forEach((result,index)=>{
    if(result.status==='rejected'){
      const areas=['questões','dashboard','NEXO Core','Professor Nexo','NEXO Jornada','status dos módulos','videoaulas','materiais','domínio por assunto','questões salvas','Semana NEXO','feature flags'];
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

  await safeBootStep('temas',async()=>{
    await Promise.all([loadEssayThemeProgress({rerender:false}),loadEssayHistory()]);
    fillThemes();
    updateOfficialEssaySheetAction();
    renderSavedQuestions();
  });
  loadRecentAttempts().catch(err=>logClientError('recent_attempts',err,'recent_load'));
  await safeBootStep('banco',async()=>renderBank());

  if(needsOnboarding)await safeBootStep('onboarding',async()=>openNexoOnboarding(false));
  else $('#niaButton')?.classList.remove('hidden');
}

function registerNexoServiceWorker(){
  const localDev=location.hostname==='localhost'||location.hostname==='127.0.0.1';
  if(!('serviceWorker' in navigator)||(location.protocol!=='https:'&&!localDev))return;
  const register=()=>navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('service worker',err));
  if(document.readyState==='complete')register();
  else window.addEventListener('load',register,{once:true});
}
registerNexoServiceWorker();

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
    state.completedEssayThemes=new Set(); state.essayThemeProgressLoaded=false;
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

  client.auth.onAuthStateChange((event, session) => {
    // Mantém o callback síncrono e agenda a inicialização para o próximo tick.
    setTimeout(async() => {
      if(event==='PASSWORD_RECOVERY'&&session){
        try{
          const password=prompt('Crie sua nova senha do NEXO (mínimo 6 caracteres):','');
          if(password===null)return handleSession(session).catch(reportSessionError);
          if(password.length<6){
            alert('A senha precisa ter pelo menos 6 caracteres.');
            return;
          }
          const confirmPassword=prompt('Digite a nova senha novamente:','');
          if(confirmPassword!==password){
            alert('As senhas não coincidem. Abra novamente o link de recuperação para tentar de novo.');
            return;
          }
          const {error}=await client.auth.updateUser({password});
          if(error)throw error;
          alert('Senha alterada com sucesso. Você já pode continuar no NEXO.');
        }catch(err){
          console.error('password update',err);
          alert('Não foi possível alterar sua senha agora. Solicite um novo link de recuperação.');
        }
      }
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

function applyQuestionCatalogSummary(summary){
  if(!summary)return;
  const fmt=n=>Number(n||0).toLocaleString('pt-BR');
  const areaMap=new Map((summary.areas||[]).map(row=>[row.area,row]));
  $$('.subject-card[data-area]').forEach(card=>{
    const row=areaMap.get(card.dataset.area);
    const small=card.querySelector('small');
    if(row&&small)small.textContent=fmt(row.archive_questions||row.active_questions)+' questões no acervo';
  });
  const total=Number(summary.archive_total||0);
  if($('#desktopHeroSubtitle')&&total){
    $('#desktopHeroSubtitle').innerHTML='<b>'+fmt(total)+' questões ENEM no acervo</b> • provas de <b>2009 a 2025</b> • redação • NEXO Core adaptativo.';
  }
}

async function loadQuestionMeta() {
  const rows=[];
  const pageSize=1000;
  for(let from=0;from<10000;from+=pageSize){
    const {data,error}=await client.from('questions')
      .select('id,area,subject,topic,difficulty,source_year,source_question_number,media_type')
      .eq('is_active',true)
      .order('id',{ascending:true})
      .range(from,from+pageSize-1);
    if(error)throw error;
    const page=data||[];
    rows.push(...page);
    if(page.length<pageSize)break;
  }
  state.questionMeta=rows;

  let catalog=null;
  try{
    const {data,error}=await client.rpc('get_question_catalog_summary');
    if(error)throw error;
    catalog=data||null;
  }catch(err){
    console.error('question catalog summary',err);
  }
  state.questionCatalog=catalog;
  state.subjects={};

  if(Array.isArray(catalog?.subjects)&&catalog.subjects.length){
    for(const row of catalog.subjects){
      if(!row?.area||!row?.subject||Number(row.active_questions||0)<=0)continue;
      state.subjects[row.area]??=new Set();
      state.subjects[row.area].add(row.subject);
    }
  }else{
    for(const q of state.questionMeta){
      state.subjects[q.area]??=new Set();
      state.subjects[q.area].add(q.subject);
    }
  }
  applyQuestionCatalogSummary(catalog);
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
  renderNexoToday();
  renderMathTrail();
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

async function startCoreRecommendation(skipGate=false){
  if(blockMaintenance('core'))return;
  if(!state.core) await loadNexoCore();
  const rec=state.core?.recommended_action;
  if(!rec){
    openPage('questoes');
    resetSessionUI();
    toast('Ainda preciso de algumas respostas para montar um treino adaptativo.');
    return;
  }
  if(!skipGate&&rec.topic){
    if(!state.materials.length)await loadMaterials({silent:true});
    const lesson=topicLesson(rec.topic,rec.subject||'Matemática');
    if(lesson&&showGuidedTraining(lesson,{source:'core',size:Number(rec.size||6)}))return;
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
  state.lastStudyAt=data?.[0]?.created_at||null;
  const recentHtml = data?.length ? data.map(a=>`
    <div class="recent-item">
      <span class="recent-status ${a.is_correct?'ok':'bad'}">${a.is_correct?'✓':'×'}</span>
      <div><b>${esc(a.question?.subject||'Questão')}</b><small>${esc(a.question?.topic||a.question?.area||'')}</small></div>
      <time>${new Date(a.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</time>
    </div>`).join('') : '<p style="color:var(--muted);font-size:12px">Seu histórico aparecerá aqui quando você começar a resolver.</p>';
  $('#recentAttempts').innerHTML = recentHtml;
  $('#mobileRecent').innerHTML = recentHtml;
  decorateResumeStudySession();
  renderNexoToday();
  renderTodayPlan();
  renderNexoWeekPlan();
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
$('#continueStudy').onclick=()=>{
  const saved=readPersistedStudySession();
  if(saved)return resumePersistedStudySession();
  const partial=(state.materials||[]).map(item=>({item,p:getContentProgress('material',item.id)})).filter(x=>Number(x.p.progress_percent||0)>0&&!x.p.completed).sort((a,b)=>new Date(b.p.last_opened_at||0)-new Date(a.p.last_opened_at||0))[0];
  if(partial?.item){openPage('materiais');return setTimeout(()=>openContentViewer('material',partial.item.id),80)}
  openPage('questoes');
};
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
  stopExamClock();
  const previous=state.session;
  if(previous?.coreSessionId) closeNexoSession('abandoned',previous);
  stopQuestionBehaviorMonitor();
  clearPersistedStudySession();
  state.session=null; state.current=null; state.answered=false; state.selectedOption=null; state.lastAnswer=null;
  $('#sessionSetup').classList.remove('hidden');
  $('#studyWorkspace').classList.add('hidden');
  $('#studyBreadcrumb')?.classList.add('hidden');
  $('#backToContent')?.classList.add('hidden');
  $('#sessionSubtitle').textContent='Escolha uma área e comece uma sessão organizada.';
}

async function getSeenIds() {
  const seen=new Set();
  const pageSize=1000;
  for(let from=0;from<5000;from+=pageSize){
    const {data,error}=await client.from('question_attempts')
      .select('question_id')
      .order('created_at',{ascending:false})
      .range(from,from+pageSize-1);
    if(error){console.error('seen questions',error);break;}
    const page=data||[];
    page.forEach(x=>seen.add(Number(x.question_id)));
    if(page.length<pageSize)break;
  }
  return seen;
}

async function fetchQuestions(filters={}) {
  let radarKeys=null;
  if(filters.radarTopic){
    try{
      let rq=client.from('enem_radar_items').select('year,question_index').eq('topic',filters.radarTopic);
      if(filters.area)rq=rq.eq('area',filters.area);
      if(filters.subject)rq=rq.eq('subject',filters.subject);
      const {data:radarRows,error:radarError}=await rq.limit(1000);
      if(!radarError&&radarRows?.length){
        radarKeys=new Set(radarRows.map(r=>String(r.year)+'::'+String(r.question_index)));
      }
    }catch(err){
      console.warn('radar question filter fallback',err);
    }
  }

  let q = client.from('questions').select(
    'id,area,subject,topic,difficulty,source_year,source_exam,source_question_number,source_reference,base_text,prompt,options,media_type,media_path,source_pdf_url,source_page,media_crop'
  ).eq('is_active',true).limit(1000);
  if (filters.area) q=q.eq('area',filters.area);
  if (filters.subject) q=q.eq('subject',filters.subject);
  if (filters.difficulty) q=q.eq('difficulty',Number(filters.difficulty));
  if (!radarKeys&&filters.topic) q=q.eq('topic',filters.fallbackTopic||filters.topic);
  const { data, error } = await q;
  if (error) throw error;
  let rows=(data||[]).filter(questionVisualCanBeResolved);
  if(filters.visualOnly){
    rows=rows.filter(x=>Boolean(
      x.media_type||x.media_path||
      (x.source_pdf_url&&x.source_page&&x.media_crop)||
      likelyNeedsQuestionVisual(x)
    ));
  }
  if(!radarKeys)return rows;
  return rows.filter(x=>radarKeys.has(String(x.source_year)+'::'+String(x.source_question_number)));
}

async function fetchQuestionsResilient(filters={}){
  const attempts=[];
  const keys=new Set();
  const add=(candidate,relaxed)=>{
    const normalized={...candidate};
    const key=JSON.stringify([
      normalized.area||'',normalized.subject||'',normalized.topic||'',
      normalized.radarTopic||'',normalized.fallbackTopic||'',
      normalized.difficulty||'',Boolean(normalized.visualOnly)
    ]);
    if(keys.has(key))return;
    keys.add(key);
    attempts.push({filters:normalized,relaxed:[...relaxed]});
  };

  let current={...filters};
  const relaxed=[];
  add(current,relaxed);

  if(current.visualOnly){
    current={...current,visualOnly:false};
    relaxed.push('somente questões visuais');
    add(current,relaxed);
  }
  if(current.difficulty){
    current={...current,difficulty:''};
    relaxed.push('dificuldade');
    add(current,relaxed);
  }
  if(current.radarTopic||current.topic){
    current={...current,radarTopic:'',topic:'',fallbackTopic:''};
    relaxed.push('tópico');
    add(current,relaxed);
  }
  if(current.subject){
    current={...current,subject:''};
    relaxed.push('matéria');
    add(current,relaxed);
  }

  for(const attempt of attempts){
    const rows=await fetchQuestions(attempt.filters);
    if(rows.length)return {rows,filters:attempt.filters,relaxed:attempt.relaxed};
  }
  return {rows:[],filters:{...filters},relaxed:[]};
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


function updateStudyNavigation(config={}){
  const crumb=$('#studyBreadcrumb');
  const back=$('#backToContent');
  const topic=config.topic||config.subject||config.area||'Treino';
  if(crumb){
    crumb.classList.toggle('hidden',!state.session);
    const t=$('[data-study-breadcrumb-topic]',crumb);if(t)t.textContent=topic;
  }
  if(back){
    const hasContent=Boolean(config.topic&&topicLesson(config.topic,config.subject||'Matemática'));
    back.classList.toggle('hidden',!hasContent);
    back.onclick=()=>hasContent?openLibraryTopic(config.subject||'Matemática',config.topic):openPage('inicio');
  }
}
$('[data-study-back-home]')?.addEventListener('click',()=>openPage('inicio'));
$('[data-study-back-library]')?.addEventListener('click',()=>openPage('materiais'));


function stopExamClock(){
  if(state.examTimer){clearInterval(state.examTimer);state.examTimer=null}
  $('#examClockPill')?.classList.add('hidden');
}
function formatExamClock(totalSeconds){
  const s=Math.max(0,Math.floor(Number(totalSeconds||0)));
  const m=Math.floor(s/60),sec=s%60;
  return String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');
}
function renderExamClock(){
  const s=state.session,pill=$('#examClockPill');
  if(!s?.examMode||!pill){pill?.classList.add('hidden');return}
  pill.classList.remove('hidden');
  const elapsed=Math.max(0,Math.floor((Date.now()-Number(s.examStartedAt||Date.now()))/1000));
  const questionElapsed=Math.max(0,Math.floor((Date.now()-Number(state.questionStartedAt||Date.now()))/1000));
  const text=$('#examClockText'),status=$('#examClockStatus');
  if(text)text.textContent=formatExamClock(elapsed);
  pill.classList.toggle('warn',questionElapsed>=120&&questionElapsed<180);
  pill.classList.toggle('danger',questionElapsed>=180);
  if(status)status.textContent=questionElapsed>=180?'3+ min · considere pular':questionElapsed>=120?'2 min · atenção ao ritmo':'ritmo de prova';
  s.paceAlerts=s.paceAlerts||{};
  const key=String(s.index);
  if(questionElapsed>=120&&!s.paceAlerts[key+'-120']){
    s.paceAlerts[key+'-120']=true;
    toast('⏱ 2 minutos nesta questão. Procure a pista decisiva.');
  }
  if(questionElapsed>=180&&!s.paceAlerts[key+'-180']){
    s.paceAlerts[key+'-180']=true;
    nexoHaptic([35,45,35]);
    toast('⏱ 3 minutos. Em prova real, considere marcar para voltar depois.','info');
  }
}
function ensureExamClock(){
  if(!state.session?.examMode)return stopExamClock();
  if(!state.session.examStartedAt)state.session.examStartedAt=Date.now();
  if(state.examTimer)return renderExamClock();
  renderExamClock();
  state.examTimer=setInterval(renderExamClock,1000);
}
function renderExamRegisteredAnswer(option,duration){
  $$('.q-option',$('#questionCard')).forEach((b,i)=>{
    b.classList.remove('selected','correct','wrong','exam-registered');
    if(i===Number(option))b.classList.add('exam-registered');
  });
  $('.confirm-answer-wrap')?.remove();
  const box=document.createElement('div');
  box.className='exam-answer-registered';
  box.innerHTML='<span>✓ RESPOSTA REGISTRADA</span><div><b>Gabarito oculto até o final.</b><small>Tempo nesta questão: '+formatStudyDuration(duration)+' · mantenha o ritmo e siga.</small></div><button id="nextAfterExamAnswer" class="primary-btn">Próxima questão →</button>';
  $('#questionCard').appendChild(box);
  $('#nextAfterExamAnswer')?.addEventListener('click',()=>nextQuestion());
  $('#nextQuestionBottom')?.classList.remove('hidden');
  $('#nextQuestionBottom').onclick=()=>nextQuestion();
  $('.question-mobile-actions')?.classList.add('answered');
}

async function startStudySession(config={}) {
  if(blockMaintenance('questions'))return;
  if(['core','adaptive'].includes(config?.mode)&&blockMaintenance('core'))return;
  const btn=$('#startSession'); if(btn){btn.disabled=true;btn.textContent='Montando sessão...';}
  try{
    if(!state.membership)await loadNexoMembership({silent:true});
    // Abrir/montar uma sessão não consome a cota de questões.
    // O limite Free é validado somente no submit_answer_v2, ao confirmar uma nova resposta.
    if(config?.mode==='core'&&planUsageReached('core'))return openNexoPlans('Você já usou a sessão NEXO Core disponível hoje no Free.');
    if(config?.mode==='arena'&&planUsageReached('arena'))return openNexoPlans('Você já usou sua entrada gratuita da Arena nesta semana.');
    if(state.session?.coreSessionId) await closeNexoSession('abandoned',state.session);
    const requestedConfig={...config};
    const resolvedQuestions=await fetchQuestionsResilient(config);
    const all=resolvedQuestions.rows;
    const effectiveConfig={...config,...resolvedQuestions.filters};
    const seen = await getSeenIds();
    const requested=Math.max(1,Number(config.size||10));
    let fresh = shuffle(all.filter(x=>!seen.has(Number(x.id))));
    let reviewMode=false;
    if(fresh.length<requested){
      const freshIds=new Set(fresh.map(x=>Number(x.id)));
      const reviewPool=shuffle(all.filter(x=>!freshIds.has(Number(x.id))));
      fresh=[...fresh,...reviewPool];
      reviewMode=true;
    }
    if(!fresh.length) throw new Error('Nenhuma questão encontrada com esses filtros.');
    const size=Math.min(requested,fresh.length);
    const queue=fresh.slice(0,size);
    const coreSessionId=await beginNexoSession(effectiveConfig,queue.length);
    state.session={...effectiveConfig,mode:effectiveConfig.mode||'manual',requestedConfig,filterFallbacks:resolvedQuestions.relaxed,queue,index:0,size:queue.length,reviewMode,coreSessionId,correctStreak:0,wrongStreak:0,answeredCount:0,examStartedAt:effectiveConfig.examMode?Date.now():null,paceAlerts:{},resultStats:{correct:0,wrong:0,totalSeconds:0,wrongIds:[],correctIds:[],xp:0,coins:0,patterns:{}}};
    logProductEvent('study_session_start',{mode:effectiveConfig.mode||'manual',area:effectiveConfig.area||null,subject:effectiveConfig.subject||null,topic:effectiveConfig.topic||null,requested_subject:requestedConfig.subject||null,requested_topic:requestedConfig.topic||null,filter_fallbacks:resolvedQuestions.relaxed,size:queue.length,exam_mode:Boolean(effectiveConfig.examMode)},'questoes');
    $('#sessionSetup').classList.add('hidden');
    $('#studyWorkspace').classList.remove('hidden');
    $('#sessionAreaBadge').textContent=effectiveConfig.area||'Treino';
    $('#sessionTitle').textContent=effectiveConfig.topic ? effectiveConfig.topic : (effectiveConfig.subject||effectiveConfig.area||'Sessão');
    const sessionNotes=[];
    if(resolvedQuestions.relaxed.length){
      sessionNotes.push('O NEXO ampliou o recorte removendo '+resolvedQuestions.relaxed.join(', ')+' para encontrar questões válidas'+(effectiveConfig.area?' sem sair de '+effectiveConfig.area:'')+'.');
    }
    sessionNotes.push(reviewMode?'Modo revisão: você já respondeu todas as questões novas deste filtro.':'Sua sessão está fixa neste conteúdo até você decidir trocar.');
    $('#sessionSubtitle').textContent=sessionNotes.join(' ');
    if(resolvedQuestions.relaxed.length)toast('Ajustei o filtro para montar uma sessão válida sem sair da área escolhida.','info');
    updateStudyNavigation(state.session);
    persistStudySession();
    ensureExamClock();
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
  persistStudySession();
  state.answered=false;state.selectedOption=null;state.lastAnswer=null;state.questionStartedAt=Date.now();
  ensureExamClock();
  startQuestionBehaviorMonitor(state.current);
  $('.question-mobile-actions')?.classList.remove('answered');
  $('#nextQuestionBottom').classList.add('hidden');
  $('#sessionMeta').textContent=`Questão ${state.session.index+1} de ${state.session.size}`;
  $('#sessionProgress').style.width=`${Math.round((state.session.index/state.session.size)*100)}%`;
  $('#questionCard').innerHTML='<div class="question-loading"><div class="pulse-block"></div><div class="pulse-line"></div><div class="pulse-line short"></div></div>';
  await renderQuestion(state.current);
  renderNexoContextBar('questoes');
  scheduleNextVisualPrefetch();
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

async function prefetchVisualAsset(q){
  if(!q?.media_type)return;
  const id=Number(q.id);
  if(!id||state.visualCache.has(id)||state.visualCache.has('path:'+id)||q.media_path)return;
  try{
    const {data,error}=await client.from('question_media')
      .select('data_uri')
      .eq('question_id',id)
      .maybeSingle();
    if(!error&&data?.data_uri){
      state.visualCache.set(id,data.data_uri);
      return;
    }
    await ensureMediaPath(q);
  }catch(err){
    console.warn('visual prefetch',err);
  }
}

function scheduleNextVisualPrefetch(){
  const session=state.session;
  if(!session?.queue?.length)return;
  const next=session.queue[Number(session.index||0)+1];
  if(!next?.media_type)return;
  const sessionRef=session;
  const run=()=>{
    if(state.session!==sessionRef)return;
    prefetchVisualAsset(next);
  };
  if('requestIdleCallback' in window)window.requestIdleCallback(run,{timeout:1200});
  else setTimeout(run,250);
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

function likelyNeedsQuestionVisual(q){
  if(!q)return false;
  const text=String([q.base_text,q.prompt].filter(Boolean).join(' ')).toLocaleLowerCase('pt-BR');
  return /\b(figura|figuras|gráfico|grafico|imagem|mapa|diagrama|esquema|tirinha|charge|cartum|tabela|quadro)\b/.test(text);
}
function hasAccessibleVisualDescription(q){
  const text=String(q?.base_text||'').toLocaleLowerCase('pt-BR');
  if(!text)return false;
  if(/descri[cç][aã]o acess[ií]vel/.test(text))return true;
  if(/representa[cç][aã]o (?:acess[ií]vel|textual)/.test(text))return true;
  // Some imported official items transcribe all values of a table/graph into the
  // base text. Keep only clearly data-rich descriptions as a non-image fallback.
  const numeric=(text.match(/\d+(?:[.,]\d+)?/g)||[]).length;
  return numeric>=6&&/(gr[aá]fico|tabela|quadro).{0,90}(apresenta|mostra|dados|valores|classifica)/.test(text);
}
function questionVisualCanBeResolved(q){
  if(!likelyNeedsQuestionVisual(q))return true;
  if(q?.media_type||q?.media_path||q?.external_media_files?.length)return true;
  if(q?.source_pdf_url&&q?.source_page&&q?.media_crop)return true;
  if(hasAccessibleVisualDescription(q))return true;
  const year=Number(q?.source_year||0);
  // ENEM.dev currently exposes original media for 2009-2023 and is used only
  // as a recovery path when NEXO-owned media is absent.
  return year>=2009&&year<=2023&&Number(q?.source_question_number||0)>0;
}

async function ensureExternalQuestionAssets(q){
  if(!q||q.externalAssetsChecked||q.media_type||q.media_path||!likelyNeedsQuestionVisual(q))return q;
  q.externalAssetsChecked=true;
  const year=Number(q.source_year||0),index=Number(q.source_question_number||0);
  if(year<2009||year>2023||!index)return q;
  const cacheKey=year+':'+index;
  try{
    let data=state.externalVisualCache.get(cacheKey);
    if(data===undefined){
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),3200);
      try{
        const res=await fetch('https://api.enem.dev/v1/exams/'+year+'/questions/'+index,{signal:controller.signal});
        data=res.ok?await res.json():null;
      }finally{clearTimeout(timer)}
      state.externalVisualCache.set(cacheKey,data||null);
    }
    if(!data)return q;
    const files=[...new Set((Array.isArray(data.files)?data.files:[]).filter(x=>/^https:\/\//i.test(String(x||''))))];
    const optionMedia=(Array.isArray(data.alternatives)?data.alternatives:[]).map(a=>/^https:\/\//i.test(String(a?.file||''))?String(a.file):'');
    if(files.length){
      q.external_media_files=files;
      q.media_type='image';
    }
    if(optionMedia.some(Boolean))q.option_media=optionMedia;
  }catch(err){
    if(err?.name!=='AbortError')console.warn('external ENEM visual fallback',err);
  }
  return q;
}

async function renderQuestion(q) {
  const card=$('#questionCard');
  // Use NEXO-owned media first. When metadata is absent but the statement clearly
  // references a visual, recover official ENEM assets on demand (2009-2023).
  await ensureExternalQuestionAssets(q);
  const requiredVisual=likelyNeedsQuestionVisual(q)&&!hasAccessibleVisualDescription(q);
  const visual = Boolean(q.media_type || q.media_path || q.external_media_files?.length || requiredVisual);
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
    <div class="q-options">${(q.options||[]).map((opt,i)=>`<button class="q-option${q.option_media?.[i]?' has-media':''}" data-option="${i}"><span>${'ABCDE'[i]}</span><b>${esc(opt)}</b>${q.option_media?.[i]?`<img class="q-option-media" src="${esc(q.option_media[i])}" alt="Recurso visual da alternativa ${'ABCDE'[i]}" loading="lazy" decoding="async">`:''}</button>`).join('')}</div>
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
      if(hasAccessibleVisualDescription(q)){
        const wrap=$('#visualWrap');
        const stage=$('#visualStage');
        const head=$('#visualWrap .visual-head span:last-child');
        if(head)head.textContent='descrição textual disponível';
        if(stage)stage.innerHTML='<div class="visual-accessible-fallback"><b>Recurso visual descrito no texto-base</b><p>Esta questão possui uma descrição textual suficiente para manter as informações necessárias ao raciocínio.</p></div>';
        wrap?.classList.add('accessible-fallback');
      }else{
        showVisualFallback(q);
      }
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

function mountVisualGallery(q,sources){
  const clean=[...new Set((sources||[]).filter(Boolean))];
  if(!clean.length)return Promise.resolve(false);
  return new Promise(resolve=>{
    const stage=$('#visualStage');
    if(!stage||state.current?.id!==q.id)return resolve(false);
    const gallery=document.createElement('div');
    gallery.className='q-media-gallery'+(clean.length===1?' single':'');
    let loaded=0,settled=0;
    const done=()=>{
      settled++;
      if(settled<clean.length)return;
      if(!loaded)return resolve(false);
      stage.innerHTML='';
      stage.appendChild(gallery);
      const head=$('#visualWrap .visual-head span:last-child');
      if(head)head.textContent=innerWidth<=760?'Toque para ampliar':(loaded>1?loaded+' imagens da prova':'Imagem da prova');
      bindVisualZoom(stage);
      resolve(true);
    };
    clean.forEach((src,index)=>{
      const img=new Image();
      img.decoding='async';
      img.loading=index?'lazy':'eager';
      img.alt='Recurso visual original da questão'+(clean.length>1?' '+(index+1):'');
      img.className='q-media-image';
      img.onload=()=>{loaded++;gallery.appendChild(img);done()};
      img.onerror=()=>done();
      img.src=src;
    });
  });
}

async function loadExternalVisual(q){
  return q?.external_media_files?.length?mountVisualGallery(q,q.external_media_files):false;
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
  const options=Array.from(document.querySelectorAll('.q-option'));
  const confirm=$('#confirmAnswer');
  if(head) head.textContent='recurso necessário indisponível';
  options.forEach(b=>{b.disabled=true;b.setAttribute('aria-disabled','true')});
  if(confirm)confirm.disabled=true;
  if(stage){
    stage.innerHTML=`<div class="visual-fallback">
      <span>◌</span>
      <b>Este recurso visual é necessário para responder.</b>
      <p>Para não transformar uma questão incompleta em erro seu, as alternativas ficam bloqueadas até o visual carregar. Tente novamente ou pule esta questão.</p>
      <div><button id="retryVisual" class="outline-btn small">Tentar novamente</button><button id="skipBrokenVisual" class="ghost-btn">Pular questão</button></div>
    </div>`;
    $('#retryVisual').onclick=async()=>{
      stage.innerHTML='<div class="visual-loading"></div>';
      const ok=await renderVisual(q);
      if(ok){
        options.forEach(b=>{b.disabled=false;b.removeAttribute('aria-disabled')});
      }else showVisualFallback(q);
    };
    $('#skipBrokenVisual').onclick=()=>nextQuestion();
  }
  toast('O NEXO bloqueou uma questão visual incompleta para não prejudicar seu treino.','error');
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
    // Recovered API files are already known to be absent from NEXO's own
    // metadata, so render them first and avoid an unnecessary database round-trip.
    if(q.external_media_files?.length && await loadExternalVisual(q)) return true;
    // Primary path: dedicated visual store. This prevents Base64 assets from
    // bloating question/session payloads and keeps mobile memory stable.
    if(await loadStoredVisual(q)) return true;
    // Compatibility path for legacy/local questions that still carry media_path.
    if(await loadLocalVisual(q)) return true;
    if(q.media_type && !q.media_path){
      await ensureMediaPath(q);
      if(await loadLocalVisual(q)) return true;
    }
    // Last resort: reconstruct the crop from the original ENEM PDF.
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
  const rawExplanation=String(data.explanation||'').trim();
  const genericExplanation=/^Gabarito oficial:\s*alternativa\s+[A-E]\.\s*Compare a alternativa correta/i.test(rawExplanation);
  const hasEditorialExplanation=Boolean(rawExplanation&&!genericExplanation);
  const whyWrong=data.correct
    ? 'Sua escolha coincide com o gabarito da questão.'
    : hasEditorialExplanation
      ? `Você marcou ${'ABCDE'[selected]} (“${selectedText}”). Compare seu raciocínio com ${'ABCDE'[correct]} (“${correctText}”) usando a resolução editorial abaixo.`
      : `Você marcou ${'ABCDE'[selected]} (“${selectedText}”) e o gabarito é ${'ABCDE'[correct]} (“${correctText}”). A resolução editorial específica ainda está em revisão; por isso o NEXO não vai inventar uma justificativa que não foi validada.`;
  return {
    summary:hasEditorialExplanation?rawExplanation:`Gabarito: alternativa ${'ABCDE'[correct]}. Resolução específica em revisão editorial.`,
    whyWrong,
    method:`${method} O ponto de revisão desta questão é “${topic}”.`,
    hasEditorialExplanation,
    explanationStatus:hasEditorialExplanation?'editorial':'pending'
  };
}

function formatAnswerReactionTime(seconds){
  const value=Math.max(0,Number(seconds||0));
  if(value<60)return value+'s';
  const m=Math.floor(value/60),sec=value%60;
  return sec?m+'m '+sec+'s':m+' min';
}

function buildImmediateNexoReaction(q,data,duration,behavior={}){

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
  const firstSelection=Number(behavior.firstSelectionSeconds||0);
  const changes=Number(behavior.selectionChanges||0);
  const hints=Number(behavior.hintCount||0);
  const likelyPattern=!data.correct
    ? (Number(duration)>=180?'tempo'
      : firstSelection>0&&firstSelection<=12?'pressa'
      : changes>=2?'indecisão'
      : hints>0?'apoio'
      : 'conteúdo')
    : (Number(duration)>=180?'tempo':'acerto');

  let mood='confiante';
  let title='Boa leitura. Agora vamos consolidar.';
  let text='Você chegou ao gabarito. O ganho agora é entender qual pista tornou a resposta segura.';
  let badge='ACERTO';

  if(!data.correct){
    if(likelyPattern==='pressa'){
      mood='serio';
      title='Você decidiu rápido demais para o tamanho da questão.';
      text='O sinal aqui é de leitura apressada. Na próxima, destaque o comando e só então compare as alternativas.';
      badge='LEITURA · PRESSA';
    }else if(likelyPattern==='indecisão'){
      mood='pensativo';
      title='Você ficou entre caminhos. Vamos reduzir a indecisão.';
      text='Houve várias trocas de alternativa. Tente definir primeiro qual evidência do enunciado precisa aparecer na resposta.';
      badge='DECISÃO';
    }else if(likelyPattern==='apoio'){
      mood='acolhedor';
      title='A pista ajudou, mas o método ainda precisa ficar seu.';
      text='Use a explicação para reconstruir o raciocínio sem depender da dica na próxima tentativa.';
      badge='CONSOLIDAR MÉTODO';
    }else if(slow||hard){
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
    difficulty,
    likelyPattern
  };
}
async function submitAnswer(option) {
  if(state.answered||!state.current||state.selectedOption===null)return;
  if(!navigator.onLine)return toast('Você está offline. Reconecte para registrar e corrigir esta resposta.','error');
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
    state.answered=false;
    if(state.current)startQuestionBehaviorMonitor(state.current,behaviorSnapshot);
    $$('.q-option',$('#questionCard')).forEach(b=>b.disabled=false);
    if(confirm){confirm.disabled=false;confirm.textContent=`Confirmar ${'ABCDE'[option]}`;}
    if(handlePlanLimitError(error))return;
    logClientError('questions',error,'submit_answer');
    const msg=error?.message==='timeout_submit_answer'
      ? 'A correção demorou demais. Tente confirmar novamente.'
      : 'Não foi possível corrigir a resposta. Tente novamente.';
    toast(msg,'error');
    return;
  }

  const reaction=buildImmediateNexoReaction(state.current,data,duration,{
    firstSelectionSeconds,selectionChanges,hintCount
  });
  const game=data.gamification||{};
  const previousJourneyLevel=Number(state.journey?.profile?.level||0);
  state.lastAnswer={...data,duration_seconds:duration,first_selection_seconds:firstSelectionSeconds,selection_changes:selectionChanges,hint_count:hintCount,nexo_reaction:reaction};
  if(state.session){
    const stats=state.session.resultStats||{correct:0,wrong:0,totalSeconds:0,wrongIds:[],correctIds:[],xp:0,coins:0,patterns:{}};
    stats.totalSeconds+=duration;
    if(data.correct){stats.correct++;stats.correctIds.push(Number(state.current.id))}
    else{
      stats.wrong++;stats.wrongIds.push(Number(state.current.id));
      stats.patterns=stats.patterns||{};
      const key=reaction.likelyPattern||'conteúdo';
      stats.patterns[key]=Number(stats.patterns[key]||0)+1;
    }
    stats.xp+=Number(game.xp_gained||0);
    stats.coins+=Number(game.coins_gained||0);
    state.session.resultStats=stats;
  }
  const correct=Number(data.correct_option);
  if(state.session?.examMode){
    renderExamRegisteredAnswer(option,duration);
    client.rpc('refresh_my_learning_achievements').then(()=>loadNexoJourney({silent:true})).catch(()=>{});
    Promise.all([loadDashboard(),loadNexoCore(),loadNexoMembership({silent:true})]).catch(()=>{});
    return;
  }
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
      <button id="reviewQuestionTopic">↻ ${data.correct?'Consolidar tema':'Treinar 3 semelhantes'}</button>
      <button id="saveCurrentQuestion">☆ Salvar questão</button>
      <button id="questionPersonalNote">✎ Anotar</button>
      <button id="reportCurrentQuestion">⚑ Reportar problema</button>
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
    const fineTopic=state.session?.radarTopic||q.topic||'';
    await startStudySession({
      mode:data.correct?'consolidation':'similar_after_error',
      area:q.area||'',
      subject:q.subject||'',
      topic:fineTopic,
      radarTopic:state.session?.radarTopic||'',
      fallbackTopic:q.topic||fineTopic,
      difficulty:'',
      visualOnly:false,
      size:data.correct?5:3
    });
    if(state.session&&!data.correct){
      $('#sessionAreaBadge').textContent='PONTE DE ERRO';
      $('#sessionTitle').textContent=fineTopic||q.subject||'Questões semelhantes';
      $('#sessionSubtitle').textContent='Primeiro resolva 3 questões parecidas. A questão original fica no Caderno de Erros para voltar depois.';
    }
  };
  $('#questionPersonalNote')?.addEventListener('click',()=>openQuestionNote(state.current.id));
  $('#saveCurrentQuestion').onclick=()=>toggleSavedQuestion(state.current.id);
  updateCurrentQuestionSaveButton();
  $('#reportCurrentQuestion').onclick=()=>openQuestionIssueModal(state.current.id);
  $('#openComments').onclick=()=>openQuestionComments(state.current.id);
  $('#nextAfterAnswer').onclick=()=>nextQuestion();
  $('.question-mobile-actions')?.classList.add('answered');
  setNexoMood(reaction.mood);
  nexoHaptic(data.correct?[24]:[35,35,35])
  client.rpc('refresh_my_learning_achievements')
    .then(()=>loadNexoJourney({silent:true}))
    .catch(err=>console.warn('learning achievements after answer',err));
  Promise.all([
    loadDashboard(),
    loadNexoCore(),
    loadRecentAttempts(),
    loadNexoMembership({silent:true}),
    loadNexoJourney({silent:true}),
    loadNexoWeekPlan({silent:true}),
    loadTopicMastery(),
    loadSubtopicMastery(),
    loadDueReviewItems()
  ]).then(()=>{ if($('.page.active')?.id==='desempenho')renderV3Intelligence(); }).catch(err=>console.error('refresh after answer',err));
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

      <section class="sim-strategy-readout">
        <div><span>ESTRATÉGIA DE PROVA</span><h4>${Number(report?.slow_questions||0)>=3?'Sua maior alavanca é saber abandonar a questão na hora certa.':avg>150?'Ganhar alguns segundos por questão pode mudar muito o bloco inteiro.':'Seu ritmo está saudável; proteja a precisão.'}</h4><p>${Number(report?.slow_questions||0)>=3?'Regra prática: aos 2 minutos procure um caminho curto; aos 3 minutos, marque para voltar e siga a prova.':avg>150?'Treine um Sprint de 5 questões procurando identificar a pista decisiva antes de calcular tudo.':'Continue usando o relógio como referência, sem transformar velocidade em pressa.'}</p></div>
        <div class="sim-strategy-badges"><span><b>${Number(report?.slow_questions||0)}</b><small>acima de 3 min</small></span><span><b>${formatStudyDuration(avg)}</b><small>média</small></span><span><b>${changes}</b><small>trocas</small></span></div>
        <button id="startStrategySprint" class="outline-btn">Treinar decisão · 5 questões →</button>
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

  $('#startStrategySprint')?.addEventListener('click',async()=>{
    const target=weak[0];
    await startStudySession({
      mode:'simulado',examMode:true,
      area:finished.area||'',subject:target?.subject||finished.subject||'',topic:target?.topic||'',difficulty:'',visualOnly:false,size:5
    });
    if(state.session){
      $('#sessionAreaBadge').textContent='SPRINT';
      $('#sessionTitle').textContent=target?.topic||'Treino de decisão';
      $('#sessionSubtitle').textContent='5 questões em modo prova. Aos 3 minutos, pratique a decisão de seguir.';
      ensureExamClock();
    }
  });
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
    examMode:Boolean(finished.examMode),
    size:Number(finished.size||20)
  });
  $('#viewPerformanceAfterSim').onclick=()=>openPage('desempenho');
  $('#backSetup').onclick=()=>resetSessionUI();
  setNexoMood(mood);
}


async function startReviewQuestionIds(ids,finished={}){
  const clean=[...new Set((ids||[]).map(Number).filter(Boolean))];
  if(!clean.length)return toast('Nenhum erro desta sessão para revisar.','info');
  try{
    const fields='id,area,subject,topic,difficulty,source_year,source_exam,source_question_number,source_reference,base_text,prompt,options,media_type,media_path,source_pdf_url,source_page,media_crop';
    const {data,error}=await client.from('questions').select(fields).in('id',clean).eq('is_active',true);
    if(error)throw error;
    const byId=new Map((data||[]).map(q=>[Number(q.id),q]));
    const queue=clean.map(id=>byId.get(id)).filter(Boolean);
    if(!queue.length)throw new Error('Questões de revisão indisponíveis.');
    if(state.session?.coreSessionId)await closeNexoSession('abandoned',state.session);
    const config={mode:'review-errors',area:finished.area||'',subject:finished.subject||'',topic:finished.topic||'',size:queue.length};
    const coreSessionId=await beginNexoSession(config,queue.length);
    state.session={...config,queue,index:0,size:queue.length,coreSessionId,correctStreak:0,wrongStreak:0,answeredCount:0,resultStats:{correct:0,wrong:0,totalSeconds:0,wrongIds:[],correctIds:[],xp:0,coins:0}};
    openPage('questoes');
    $('#sessionSetup').classList.add('hidden');
    $('#studyWorkspace').classList.remove('hidden');
    $('#sessionAreaBadge').textContent='Revisão de erros';
    $('#sessionTitle').textContent=finished.topic||finished.subject||'Erros da sessão';
    $('#sessionSubtitle').textContent='Refaça apenas as questões que você errou, agora com o raciocínio fresco.';
    updateStudyNavigation(state.session);
    await showCurrentQuestion();
  }catch(err){
    console.error('review wrong ids',err);
    toast('Não consegui abrir a revisão dos erros agora.','error');
  }
}

function nextRadarTopic(currentTopic,subject='Matemática'){
  const rows=(state.radarTopics||[]).filter(r=>String(r.subject||'')===String(subject||'')).sort((a,b)=>Number(b.nexo_priority_score||0)-Number(a.nexo_priority_score||0));
  const index=rows.findIndex(r=>String(r.topic)===String(currentTopic));
  return index>=0&&index<rows.length-1?rows[index+1]:null;
}

function sessionLearningCopy(accuracy,wrong,topic){
  if(accuracy>=85)return {mood:'confiante',title:'Você consolidou bem esta rodada.',text:'Seu desempenho está forte. Vale avançar e voltar a este assunto em uma revisão espaçada.',status:'CONSOLIDANDO'};
  if(accuracy>=65)return {mood:'serio',title:'Bom avanço, com espaço claro para lapidar.',text:wrong?'Revise os erros antes de repetir o treino. Isso costuma render mais do que fazer outra bateria imediatamente.':'Seu padrão está estável. Faça mais uma rodada curta para confirmar. ',status:'EM EVOLUÇÃO'};
  return {mood:'acolhedor',title:'O treino mostrou exatamente o que revisar agora.',text:'Volte ao conteúdo de '+(topic||'este assunto')+', revise o ponto central e depois refaça os erros.',status:'REVISAR'};
}

function renderStudySessionReport(finished,report){
  const stats=finished.resultStats||{};
  const attempts=Number(report?.attempts||0)||Number(stats.correct||0)+Number(stats.wrong||0)||Number(finished.size||0);
  const correct=Number(report?.correct||0)||Number(stats.correct||0);
  const wrong=Math.max(0,attempts-correct);
  const accuracy=attempts?Math.round(correct*100/attempts):0;
  const totalSeconds=Number(report?.total_seconds||0)||Number(stats.totalSeconds||0);
  const avgSeconds=Number(report?.avg_seconds||0)||(attempts?Math.round(totalSeconds/attempts):0);
  const topic=finished.topic||finished.subject||finished.area||'Sessão';
  const learning=topicLearningMeta(topic,finished.subject||'Matemática');
  const domain=learning.attempts?learning.score:Math.min(70,accuracy);
  const copy=sessionLearningCopy(accuracy,wrong,topic);
  const next=nextRadarTopic(topic,finished.subject||'Matemática');
  const hasContent=Boolean(topicLesson(topic,finished.subject||'Matemática'));
  const wrongIds=Array.isArray(stats.wrongIds)?stats.wrongIds:[];
  const xp=Number(stats.xp||0),coins=Number(stats.coins||0);
  const patternLabels={tempo:'Tempo alto',pressa:'Leitura / pressa','indecisão':'Indecisão',apoio:'Dependência de pista','conteúdo':'Conteúdo / método'};
  const patternEntries=Object.entries(stats.patterns||{}).sort((a,b)=>Number(b[1])-Number(a[1]));
  const topPattern=patternEntries[0]?.[0]||'';

  state.lastFinishedStudy={finished,report,accuracy,correct,wrong,domain};
  $('#questionCard').innerHTML=`
    <div class="study-report-live">
      <section class="study-report-hero ${accuracy>=80?'strong':accuracy>=60?'mid':'review'}">
        <div class="study-report-professor">
          <div class="study-report-sparkles" aria-hidden="true">✦ · ✧ · ✦</div>
          <img src="${nexoBustForMood(copy.mood)}" alt="Professor Nexo">
          <div><span>SESSÃO CONCLUÍDA · PROFESSOR NEXO</span><h3>${esc(copy.title)}</h3><p>${esc(copy.text)}</p></div>
        </div>
        <div class="study-report-score"><small>APROVEITAMENTO</small><b>${accuracy}%</b><span>${correct}/${attempts} acertos</span></div>
      </section>

      <section class="study-report-metrics">
        <article><span>✓</span><div><b>${correct}</b><small>acertos</small></div></article>
        <article><span>×</span><div><b>${wrong}</b><small>pontos de revisão</small></div></article>
        <article><span>◷</span><div><b>${formatStudyDuration(avgSeconds)}</b><small>média por questão</small></div></article>
        <article><span>◎</span><div><b>${domain}%</b><small>domínio estimado</small></div></article>
      </section>

      <section class="study-report-progress">
        <div><span>${esc(topic)}</span><b>${esc(learning.label||copy.status)}</b></div>
        <div class="study-domain-track"><i style="width:${clamp(domain,0,100)}%"></i></div>
        <small>${learning.attempts||attempts} questão(ões) consideradas neste assunto · ${learning.completed}/${Math.max(1,learning.materials.length)} conteúdo(s) concluído(s)</small>
      </section>

      ${xp||coins?`<section class="study-report-rewards"><span><b>+${xp}</b><small>XP nesta sessão</small></span><span><b>+${coins}</b><small>N-Coins</small></span></section>`:''}

      <section class="study-report-next">
        <div><span class="eyebrow">O QUE FAZER AGORA</span><h4>${wrong?('Revisar antes de repetir '+topic+'.'):(next?('Avançar para '+next.topic+'.'):'Consolidar este assunto.')}</h4><p>${wrong?'Comece pelos erros desta sessão e volte ao conteúdo se alguma explicação ainda estiver fraca.':next?'Seu desempenho permite seguir a trilha sem abandonar a revisão futura.':'Uma nova rodada curta pode confirmar o domínio.'}</p>${topPattern?'<div class="study-error-signal"><b>Sinal principal desta sessão:</b> '+esc(patternLabels[topPattern]||topPattern)+'</div>':''}</div>
      </section>

      <div class="study-report-actions">
        ${hasContent?'<button id="reportBackContent" class="primary-btn">← Voltar ao conteúdo</button>':''}
        ${wrongIds.length?'<button id="reportReviewErrors" class="outline-btn">↻ Revisar meus erros ('+wrongIds.length+')</button>':''}
        <button id="newSameSession" class="outline-btn">Treinar novamente</button>
        ${next?'<button id="reportNextTopic" class="outline-btn">Próximo assunto →</button>':''}
        <button id="reportHome" class="ghost-btn">Ir para o início</button>
      </div>
    </div>`;

  $('#reportBackContent')?.addEventListener('click',()=>openLibraryTopic(finished.subject||'Matemática',topic));
  $('#reportReviewErrors')?.addEventListener('click',()=>startReviewQuestionIds(wrongIds,finished));
  $('#newSameSession')?.addEventListener('click',()=>{
    if(finished.mode==='content'){
      const item=topicLesson(topic,finished.subject||'Matemática');
      if(item)return startContentPractice(item,true,Number(finished.size||5));
    }
    startStudySession({
      mode:finished.mode||'manual',
      area:finished.area||'',
      subject:finished.subject||'',
      topic:finished.topic||'',
      radarTopic:finished.radarTopic||'',
      fallbackTopic:finished.fallbackTopic||'',
      difficulty:finished.difficulty||'',
      visualOnly:Boolean(finished.visualOnly),
      size:Number(finished.size||10)
    });
  });
  $('#reportNextTopic')?.addEventListener('click',()=>next&&openLibraryTopic(next.subject||'Matemática',next.topic));
  $('#reportHome')?.addEventListener('click',()=>openPage('inicio'));
  updateStudyNavigation(finished);
  setNexoMood(copy.mood);
  nexoHaptic(accuracy>=80?[30,40,30]:[28])
}

async function finishSession() {
  stopQuestionBehaviorMonitor();
  stopExamClock();
  clearPersistedStudySession();
  const finished={...(state.session||{})};
  const reportId=finished.coreSessionId||null;
  logProductEvent('study_session_finish',{mode:finished.mode||'manual',size:Number(finished.size||0),correct:Number(finished.resultStats?.correct||0),wrong:Number(finished.resultStats?.wrong||0),exam_mode:Boolean(finished.examMode)},'questoes');
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

  $('#questionCard').innerHTML='<div class="question-loading"><div class="pulse-block"></div><div class="pulse-line"></div><div class="pulse-line short"></div></div>';
  const [report]=await Promise.all([
    getNexoSessionReport(reportId),
    loadTopicMastery(),
    loadNexoCore().catch(err=>console.error('core after session',err))
  ]);
  renderStudySessionReport(finished,report);
  renderNexoToday();
  renderMathTrail();
}

$$('[data-sim-area], [data-sim-mode]').forEach(b=>b.onclick=async()=>{
  const mode=b.dataset.simMode||'area';
  const startExam=async(config,label,title,subtitle)=>{
    openPage('questoes');
    await startStudySession({...config,mode:'simulado',examMode:true});
    if(state.session){
      $('#sessionAreaBadge').textContent=label;
      $('#sessionTitle').textContent=title;
      $('#sessionSubtitle').textContent=subtitle;
      ensureExamClock();
    }
  };

  if(mode==='adaptive'){
    if(!state.core)await loadNexoCore();
    const rec=state.core?.recommended_action;
    return startExam({
      area:rec?.area||'',subject:rec?.subject||'',topic:rec?.topic||'',difficulty:'',visualOnly:false,size:20
    },'Simulado Core',rec?.topic||'Simulado adaptativo',rec?.reason||'Prova adaptada ao seu perfil. O gabarito aparece só no final.');
  }

  if(mode==='mixed'){
    return startExam({area:'',subject:'',topic:'',difficulty:'',visualOnly:false,size:30},
      'Misto ENEM','Simulado misto','30 questões entre as áreas disponíveis · feedback somente no final.');
  }

  if(mode==='sprint'){
    const top=buildPersonalRadar()[0];
    return startExam({area:top?.area||'',subject:top?.subject||'',topic:top?.topic||'',radarTopic:top?.topic||'',difficulty:'',visualOnly:false,size:5},
      'SPRINT','Ritmo e decisão','5 questões para treinar leitura, tempo e decisão de seguir ou pular.');
  }

  if(mode==='mini'){
    return startExam({area:'',subject:'',topic:'',difficulty:'',visualOnly:false,size:10},
      'MINI ENEM','Mini simulado','10 questões mistas em modo prova. Sem gabarito até o relatório final.');
  }

  if(mode==='full'){
    if(!state.membership)await loadNexoMembership({silent:true});
    if(nexoAccessTier()==='free')return openNexoPlans('A prova longa de 90 questões é um modo intensivo do NEXO Plus.');
    return startExam({area:'',subject:'',topic:'',difficulty:'',visualOnly:false,size:90},
      'PROVA LONGA','90 questões','Modo prova longo. Use o relógio, pule quando necessário e corrija tudo no final.');
  }

  const area=b.dataset.simArea||'';
  setSelectedArea(area);
  return startExam({area,subject:'',topic:'',difficulty:'',visualOnly:false,size:20},
    'SIMULADO',area,'20 questões de '+area+' · feedback somente no final.');
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
  $$('[data-mastery-area]',el).forEach(btn=>btn.onclick=async()=>{openPage('questoes');setSelectedArea(btn.dataset.masteryArea);await startStudySession({mode:'adaptive',area:btn.dataset.masteryArea,subject:'',topic:'',difficulty:'',visualOnly:false,size:10});});
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
    return '<article class="error-note-row"><span class="error-note-index">'+String(index+1).padStart(2,'0')+'</span><div><b>'+esc(q.topic||q.subject||'Questão ENEM')+'</b><small>'+esc(q.subject||q.area||'')+(q.source_year?' · ENEM '+esc(q.source_year):'')+(q.source_question_number?' · Q'+esc(q.source_question_number):'')+'</small></div><div class="error-note-actions"><button data-error-open="'+Number(item.question_id||q.id)+'">Refazer</button><button data-error-note="'+Number(item.question_id||q.id)+'">Minha nota</button><button data-error-topic="'+esc(q.topic||'')+'" data-error-area="'+esc(q.area||'')+'" data-error-subject="'+esc(q.subject||'')+'">Treinar tema</button></div></article>';
  }).join(''):'<div class="journey-empty">Nenhum erro recente por aqui. Continue treinando para alimentar sua revisão inteligente.</div>';
  $$('[data-error-open]',el).forEach(btn=>btn.onclick=()=>openSingleQuestion(Number(btn.dataset.errorOpen)));
  $$('[data-error-note]',el).forEach(btn=>btn.onclick=()=>openQuestionNote(Number(btn.dataset.errorNote)));
  $$('[data-error-topic]',el).forEach(btn=>btn.onclick=async()=>{
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
    // Revisar erros também não consome cota até uma nova resposta ser confirmada.
    const ids=(state.errorReviewIds?.length?state.errorReviewIds:await loadErrorNotebook()).slice(0,5);
    if(!ids.length)return toast('Ainda não há erros recentes para revisar.');
    const fields='id,area,subject,topic,difficulty,source_year,source_exam,source_question_number,source_reference,base_text,prompt,options,media_type,media_path,source_pdf_url,source_page,media_crop';
    const {data,error}=await client.from('questions').select(fields).in('id',ids).eq('is_active',true);
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



async function loadSubtopicMastery(){
  if(!state.user?.id)return state.subtopicMastery;
  try{
    const {data,error}=await client.from('question_attempts')
      .select('is_correct,duration_seconds,created_at,question:questions(area,subject,topic,difficulty,prompt,base_text,source_reference)')
      .order('created_at',{ascending:false})
      .limit(500);
    if(error)throw error;
    const map=new Map();
    for(const a of data||[]){
      const q=a.question||{};
      const name=inferQuestionSubtopic(q);
      if(!name)continue;
      const key=String(q.topic||'')+'::'+name;
      const row=map.get(key)||{topic:q.topic||'',subject:q.subject||'',area:q.area||'',name,attempts:0,correct:0,totalSeconds:0,lastAt:null};
      row.attempts++;
      if(a.is_correct)row.correct++;
      row.totalSeconds+=Number(a.duration_seconds||0);
      const at=a.created_at?new Date(a.created_at):null;
      if(at&&(!row.lastAt||at>row.lastAt))row.lastAt=at;
      map.set(key,row);
    }
    for(const row of map.values()){
      row.accuracy=row.attempts?Math.round(row.correct*100/row.attempts):0;
      const confidence=1-Math.exp(-row.attempts/5);
      row.confidence=Math.round(confidence*100);
      row.mastery=clamp(Math.round(((row.correct+1.5)/(row.attempts+3))*(.80+.20*confidence)*100),0,100);
      row.avgSeconds=row.attempts?Math.round(row.totalSeconds/row.attempts):0;
    }
    state.subtopicMastery=map;
  }catch(err){
    console.error('subtopic mastery',err);
    logClientError('learning',err,'subtopic_mastery');
  }
  return state.subtopicMastery;
}

function essayPreparationScore(){
  const rows=state.essayHistory||[];
  if(!rows.length)return 50;
  const recent=rows.slice(0,5);
  return clamp(Math.round(recent.reduce((sum,r)=>sum+Number(r.estimated_score||0),0)/recent.length/10),0,100);
}

function calculateNexoScore(){
  const topicRows=[...state.topicMastery.values()];
  const d=state.dashboard||{};
  const core=state.core||{};
  const momentum=core.momentum||{};
  const overall=core.overall||{};
  const mastery=topicRows.length?Math.round(topicRows.reduce((s,x)=>s+Number(x.masteryScore||0),0)/topicRows.length):50;
  const due=reviewQueueItems().length;
  const retention=clamp(Math.round(mastery-Math.min(30,due*5)),0,100);
  const questions=clamp(Number(d.accuracy||0)||50,0,100);
  const avgSec=Number(overall.avg_seconds||0);
  const speed=avgSec?clamp(Math.round(100-Math.max(0,avgSec-120)*.35),25,100):50;
  const days=Number(momentum.study_days_7d||0);
  const consistency=clamp(Math.round(days/7*100),0,100);
  const writing=essayPreparationScore();
  const raw=mastery*.30+retention*.15+questions*.20+speed*.10+consistency*.15+writing*.10;
  const attempts=Number(d.attempts||0);
  const confidence=clamp(Math.round((1-Math.exp(-attempts/35))*100),0,100);
  const score=Math.round(raw*10);
  state.nexoScore={score,confidence,components:{mastery,retention,questions,speed,consistency,writing}};
  return state.nexoScore;
}

function buildPersonalRadar(){
  const rows=(state.radarTopics||[]).map(row=>{
    const meta=topicLearningMeta(row.topic,row.subject);
    const global=clamp(Number(row.nexo_priority_score||0),0,100);
    const weakness=100-clamp(Number(meta.score||0),0,100);
    const review=meta.reviewDue?100:meta.key==='review'?80:20;
    const personal=Math.round(global*.45+weakness*.40+review*.15);
    return {...row,personal_priority:personal,student_mastery:Number(meta.score||0),review_due:Boolean(meta.reviewDue)};
  }).sort((a,b)=>b.personal_priority-a.personal_priority);
  state.personalRadar=rows;
  return rows;
}

function renderV3Intelligence(){
  const score=calculateNexoScore();
  const value=$('#nexoScoreValue'),label=$('#nexoScoreLabel'),conf=$('#nexoScoreConfidence'),breakdown=$('#nexoScoreBreakdown');
  if(value)value.textContent=score.score;
  if(label)label.textContent=score.score>=800?'Preparação forte':score.score>=650?'Boa base em construção':score.score>=500?'Evoluindo com pontos claros de ganho':'Fase de construção';
  if(conf)conf.textContent='confiança '+score.confidence+'%';
  if(breakdown){
    const labels={mastery:'Domínio',retention:'Retenção',questions:'Questões',speed:'Velocidade',consistency:'Consistência',writing:'Redação'};
    breakdown.innerHTML=Object.entries(score.components).map(([k,v])=>'<div><span>'+labels[k]+'</span><i><em style="width:'+v+'%"></em></i><b>'+v+'%</b></div>').join('');
  }

  const radar=buildPersonalRadar().slice(0,6),radarEl=$('#personalRadarList');
  if(radarEl)radarEl.innerHTML=radar.length?radar.map((x,i)=>'<button data-personal-radar-topic="'+encodeURIComponent(x.topic)+'" data-personal-radar-subject="'+encodeURIComponent(x.subject||'')+'"><span>'+String(i+1).padStart(2,'0')+'</span><div><b>'+esc(x.topic)+'</b><small>'+esc(x.subject||x.area||'')+' · domínio '+Math.round(x.student_mastery)+'%'+(x.review_due?' · revisão pendente':'')+'</small></div><strong>'+x.personal_priority+'</strong></button>').join(''):'<p class="learning-empty">Resolva algumas questões para gerar seu Radar Pessoal.</p>';
  $$('[data-personal-radar-topic]',radarEl||document).forEach(btn=>btn.onclick=()=>{
    const topic=decodeURIComponent(btn.dataset.personalRadarTopic||''),subject=decodeURIComponent(btn.dataset.personalRadarSubject||'');
    const lesson=topicLesson(topic,subject);
    lesson?openLibraryTopic(subject,topic):startStudySession({mode:'core',subject,topic,size:5,difficulty:'',visualOnly:false});
  });

  const subEl=$('#subtopicMasteryMap');
  if(subEl){
    const rows=[...state.subtopicMastery.values()].sort((a,b)=>(a.mastery-b.mastery)||(b.attempts-a.attempts)).slice(0,12);
    subEl.innerHTML=rows.length?rows.map(x=>'<article><div><small>'+esc(x.topic)+'</small><b>'+esc(x.name)+'</b><span>'+x.attempts+' questão(ões) · confiança '+x.confidence+'%</span></div><strong>'+x.mastery+'%</strong><i><em style="width:'+x.mastery+'%"></em></i></article>').join(''):'<p class="learning-empty">Os subassuntos aparecem conforme o NEXO reconhece padrões nas questões respondidas.</p>';
    if($('#subtopicConfidenceLabel'))$('#subtopicConfidenceLabel').textContent='estimativa por texto · '+rows.length+' subassunto'+(rows.length===1?'':'s');
  }
}

function buildRecommendationExplanation(){
  const saved=readPersistedStudySession();
  if(saved)return {title:'Continuar a sessão preserva seu contexto.',text:'Você já começou uma sessão e interromper agora criaria troca de contexto desnecessária.',factors:[['CONTINUIDADE','sessão em andamento'],['RESTANTE',Math.max(1,Number(saved.size||0)-Number(saved.index||0))+' questões'],['OBJETIVO',saved.topic||saved.subject||saved.area||'treino atual']]};
  const dueQuestion=state.dueReviewItems?.[0];
  if(dueQuestion)return {title:'Esta revisão chegou no intervalo certo.',text:'A questão original foi agendada após um erro anterior. O NEXO recomenda transferência primeiro e repetição depois.',factors:[['TEMA',dueQuestion.question?.topic||dueQuestion.topic||'revisão'],['LAPSOS',String(Number(dueQuestion.lapses||1))],['PRIORIDADE',String(Number(dueQuestion.priority||0))+'/100']]};
  const review=spacedReviewCandidate();
  if(review)return {title:'Este assunto chegou na hora de revisar.',text:'O intervalo de revisão venceu e uma sessão curta ajuda a proteger retenção.',factors:[['DOMÍNIO',Math.round(review.meta.score||0)+'%'],['INTERVALO',review.meta.intervalDays+' dia(s)'],['ÚLTIMO CONTATO',review.days+' dia(s) atrás']]};
  const rec=state.core?.recommended_action;
  if(rec)return {title:'O NEXO Core encontrou margem de evolução.',text:rec.reason||'A recomendação combina desempenho, prioridade e histórico recente.',factors:[['ASSUNTO',rec.topic||rec.subject||rec.area||'prioridade'],['DOMÍNIO',Math.round(Number(rec.mastery||0))+'%'],['PRIORIDADE',Math.round(Number(rec.priority||0))+'/100']]};
  const top=buildPersonalRadar()[0];
  if(top)return {title:'Este assunto tem alto retorno para você.',text:'O Radar Pessoal cruza frequência histórica no ENEM com seu domínio e necessidade de revisão.',factors:[['RADAR ENEM',Math.round(Number(top.nexo_priority_score||0))+'/100'],['SEU DOMÍNIO',Math.round(Number(top.student_mastery||0))+'%'],['PRIORIDADE PESSOAL',top.personal_priority+'/100']]};
  return {title:'Ainda estou calibrando.',text:'Com mais algumas respostas, a recomendação passa a usar seu desempenho real.',factors:[['DADOS','ainda insuficientes'],['PRÓXIMO PASSO','resolver questões'],['CONTROLE','você pode escolher qualquer matéria']]};
}

function openRecommendationWhy(){
  const data=buildRecommendationExplanation();
  state.recommendationExplanation=data;
  $('#recommendationWhyTitle').textContent=data.title;
  $('#recommendationWhyText').textContent=data.text;
  $('#recommendationWhyFactors').innerHTML=(data.factors||[]).map(x=>'<article><small>'+esc(x[0])+'</small><b>'+esc(x[1])+'</b></article>').join('');
  $('#recommendationWhyModal').classList.remove('hidden');
  document.body.style.overflow='hidden';
}
function closeRecommendationWhy(){
  $('#recommendationWhyModal')?.classList.add('hidden');
  document.body.style.overflow='';
}
$$('[data-nexo-why]').forEach(btn=>btn.addEventListener('click',openRecommendationWhy));
$('#closeRecommendationWhy')?.addEventListener('click',closeRecommendationWhy);
$('#recommendationWhyModal')?.addEventListener('click',e=>{if(e.target===$('#recommendationWhyModal'))closeRecommendationWhy()});


async function loadDueReviewItems(){
  if(!state.user?.id)return [];
  try{
    const {data,error}=await client.from('nexo_review_items')
      .select('question_id,topic,interval_days,streak,lapses,next_review_at,last_result,status,question:questions(id,area,subject,topic,difficulty,source_year,source_exam,source_question_number,source_reference,base_text,prompt,options,media_type,media_path,source_pdf_url,source_page,media_crop)')
      .eq('status','scheduled')
      .lte('next_review_at',new Date().toISOString())
      .order('next_review_at',{ascending:true})
      .limit(20);
    if(error)throw error;
    state.dueReviewItems=(data||[]).map(row=>{
      const radar=(state.radarTopics||[]).find(r=>String(r.topic||'')===String(row.topic||row.question?.topic||''));
      const overdue=Math.max(0,Math.floor((Date.now()-new Date(row.next_review_at||Date.now()).getTime())/86400000));
      const priority=Math.round(Math.min(100,35+Number(row.lapses||0)*14+overdue*4+Number(radar?.nexo_priority_score||0)*.35));
      return {...row,priority,overdue};
    }).sort((a,b)=>b.priority-a.priority);
    renderSmartReviewQueue();
    return state.dueReviewItems;
  }catch(err){
    console.error('due review items',err);
    logClientError('review',err,'due_review_load');
    return [];
  }
}

function renderSmartReviewQueue(){
  const el=$('#smartReviewQueue'),count=$('#smartReviewCount');
  if(!el)return;
  const rows=state.dueReviewItems||[];
  if(count)count.textContent=rows.length+' para hoje';
  if(!rows.length){
    el.innerHTML='<div class="smart-review-empty"><span>✓</span><div><b>Nenhuma questão original vencida.</b><small>Quando uma questão errada chegar ao momento certo, ela aparece aqui.</small></div></div>';
    return;
  }
  el.innerHTML=rows.slice(0,8).map((row,index)=>{
    const q=row.question||{};
    return '<article class="smart-review-row">'+
      '<span class="smart-review-rank">'+String(index+1).padStart(2,'0')+'</span>'+
      '<div class="smart-review-copy"><small>'+esc(q.subject||q.area||'Revisão')+'</small><b>'+esc(q.topic||row.topic||'Questão ENEM')+'</b><p>'+(Number(row.lapses||0)>1?'Erro recorrente · ':'')+(row.overdue?'atrasada '+row.overdue+' dia(s) · ':'')+'intervalo '+Number(row.interval_days||1)+' dia(s)</p></div>'+
      '<strong>'+row.priority+'</strong>'+
      '<div class="smart-review-actions"><button data-review-similar="'+Number(row.question_id)+'">≈ Parecida</button><button data-review-original="'+Number(row.question_id)+'">Original →</button></div>'+
    '</article>';
  }).join('');
  $$('[data-review-original]',el).forEach(btn=>btn.onclick=()=>openSingleQuestion(Number(btn.dataset.reviewOriginal)));
  $$('[data-review-similar]',el).forEach(btn=>btn.onclick=()=>startSimilarQuestionById(Number(btn.dataset.reviewSimilar)));
}
$('#startSmartReview')?.addEventListener('click',async()=>{
  if(!state.dueReviewItems.length)await loadDueReviewItems();
  const first=state.dueReviewItems[0];
  if(!first)return toast('Sua revisão inteligente está em dia.');
  startSimilarQuestionById(Number(first.question_id));
});

async function startSimilarQuestionById(questionId){
  try{
    let source=state.current&&Number(state.current.id)===Number(questionId)?state.current:null;
    if(!source){
      const {data,error}=await client.from('questions')
        .select('id,area,subject,topic,difficulty,source_year,source_exam,source_question_number,source_reference,base_text,prompt,options,media_type,media_path,source_pdf_url,source_page,media_crop')
        .eq('id',Number(questionId)).single();
      if(error)throw error;
      source=data;
    }
    const all=await fetchQuestions({area:source.area||'',subject:source.subject||'',topic:source.topic||''});
    const targetSub=inferQuestionSubtopic(source);
    const similar=shuffle((all||[]).filter(q=>Number(q.id)!==Number(source.id)))
      .sort((a,b)=>Number(inferQuestionSubtopic(b)===targetSub)-Number(inferQuestionSubtopic(a)===targetSub))[0];
    if(!similar)return toast('Ainda não encontrei outra questão parecida nesse recorte.','info');
    openPage('questoes');
    if(state.session?.coreSessionId)await closeNexoSession('abandoned',state.session);
    const config={mode:'similar_after_error',area:similar.area||'',subject:similar.subject||'',topic:similar.topic||'',size:1};
    const coreSessionId=await beginNexoSession(config,1);
    state.session={...config,queue:[similar],index:0,size:1,coreSessionId,correctStreak:0,wrongStreak:0,answeredCount:0,resultStats:{correct:0,wrong:0,totalSeconds:0,wrongIds:[],correctIds:[],xp:0,coins:0,patterns:{}}};
    $('#sessionSetup').classList.add('hidden');$('#studyWorkspace').classList.remove('hidden');
    $('#sessionAreaBadge').textContent='QUESTÃO PARECIDA';
    $('#sessionTitle').textContent=targetSub||similar.topic||similar.subject||'Treino de transferência';
    $('#sessionSubtitle').textContent='Resolva um problema parecido antes de voltar à questão original.';
    updateStudyNavigation(state.session);
    await showCurrentQuestion();
  }catch(err){
    console.error('similar question',err);
    toast('Não consegui abrir uma questão parecida agora.','error');
  }
}

async function openQuestionNote(questionId=state.current?.id){
  const id=Number(questionId||0);if(!id)return;
  state.questionNoteTarget=id;
  const q=state.current&&Number(state.current.id)===id?state.current:null;
  $('#questionNoteMeta').textContent=q
    ? (q.subject||q.area||'Questão')+' · '+(q.topic||'')+(q.source_year?' · ENEM '+q.source_year:'')
    : 'Escreva o que você quer lembrar quando esta questão voltar.';
  $('#questionNoteText').value='';
  try{
    const {data,error}=await client.from('question_notes').select('note').eq('question_id',id).maybeSingle();
    if(!error&&data?.note)$('#questionNoteText').value=data.note;
  }catch(_){}
  $('#questionNoteModal')?.classList.remove('hidden');
  document.body.style.overflow='hidden';
  setTimeout(()=>$('#questionNoteText')?.focus(),60);
}
function closeQuestionNote(){
  $('#questionNoteModal')?.classList.add('hidden');
  document.body.style.overflow='';
  state.questionNoteTarget=null;
}
$('#closeQuestionNote')?.addEventListener('click',closeQuestionNote);
$('#questionNoteModal')?.addEventListener('click',e=>{if(e.target===$('#questionNoteModal'))closeQuestionNote()});
$('#saveQuestionNote')?.addEventListener('click',async()=>{
  const id=Number(state.questionNoteTarget||0),note=$('#questionNoteText')?.value.trim()||'';
  if(!id)return;
  if(!note)return toast('Escreva uma nota antes de salvar.','error');
  const {error}=await client.from('question_notes').upsert({
    user_id:state.user.id,question_id:id,note,updated_at:new Date().toISOString()
  },{onConflict:'user_id,question_id'});
  if(error)return toast('Não consegui salvar sua nota.','error');
  closeQuestionNote();toast('Nota salva no seu Caderno de Erros.');
});
$('#deleteQuestionNote')?.addEventListener('click',async()=>{
  const id=Number(state.questionNoteTarget||0);if(!id)return;
  const {error}=await client.from('question_notes').delete().eq('question_id',id);
  if(error)return toast('Não consegui excluir sua nota.','error');
  closeQuestionNote();toast('Nota excluída.');
});

function classifyAttemptPattern(a){
  if(a?.is_correct)return null;
  const duration=Number(a?.duration_seconds||0);
  const first=Number(a?.first_selection_seconds||0);
  const changes=Number(a?.selection_changes||0);
  const hints=Number(a?.hint_count||0);
  if(duration>=180)return {key:'time',label:'Tempo alto',icon:'◷',help:'Você chega à resposta tarde ou trava no caminho.'};
  if(first>0&&first<=12)return {key:'rush',label:'Leitura / pressa',icon:'↯',help:'A primeira decisão veio cedo demais para o enunciado.'};
  if(changes>=2)return {key:'decision',label:'Indecisão',icon:'⇄',help:'Você alterna entre alternativas antes de confirmar.'};
  if(hints>0)return {key:'hint',label:'Dependência de pista',icon:'✦',help:'A dica está ajudando mais do que o método consolidado.'};
  return {key:'content',label:'Conteúdo / método',icon:'▣',help:'O principal sinal é lacuna de conceito ou procedimento.'};
}

async function loadLearningIntelligence(){
  if(!state.user?.id)return {patterns:[],attempts:[]};
  try{
    const {data,error}=await client.from('question_attempts')
      .select('is_correct,duration_seconds,first_selection_seconds,selection_changes,hint_count,created_at,question:questions(area,subject,topic)')
      .order('created_at',{ascending:false})
      .limit(nexoAccessTier()==='free'?30:120);
    if(error)throw error;
    const attempts=data||[];
    const counts=new Map();
    for(const a of attempts){
      const pattern=classifyAttemptPattern(a);
      if(!pattern)continue;
      const row=counts.get(pattern.key)||{...pattern,count:0};
      row.count++;counts.set(pattern.key,row);
    }
    const patterns=[...counts.values()].sort((a,b)=>b.count-a.count);
    state.learningIntelligence={patterns,attempts};
    return state.learningIntelligence;
  }catch(err){
    console.error('learning intelligence',err);
    logClientError('performance',err,'learning_intelligence');
    return {patterns:[],attempts:[]};
  }
}

function renderErrorPatternMap(intel=state.learningIntelligence||{}){
  const el=$('#errorPatternMap');if(!el)return;
  const patterns=intel.patterns||[];
  const total=patterns.reduce((s,x)=>s+Number(x.count||0),0);
  if($('#errorPatternStatus'))$('#errorPatternStatus').textContent=total?total+' erro'+(total===1?'':'s')+' analisados':'sem dados';
  if(!patterns.length){
    el.innerHTML='<p class="learning-empty">Responda algumas questões para eu separar os padrões prováveis dos seus erros.</p>';
    return;
  }
  const max=Math.max(...patterns.map(x=>Number(x.count||0)),1);
  el.innerHTML=(nexoAccessTier()==='free'?'<div class="analysis-depth-note">FREE · análise das últimas 30 respostas · Plus amplia a janela para 120</div>':'<div class="analysis-depth-note plus">PLUS · análise ampliada das últimas 120 respostas</div>')+patterns.map((x,index)=>'<article class="error-pattern-row '+(index===0?'primary':'')+'">'+
    '<span class="error-pattern-icon">'+x.icon+'</span>'+
    '<div><b>'+esc(x.label)+'</b><small>'+esc(x.help)+'</small><i><em style="width:'+Math.round(Number(x.count||0)*100/max)+'%"></em></i></div>'+
    '<strong>'+Number(x.count||0)+'</strong></article>').join('')+
    '<p class="error-pattern-note">Esses padrões são sinais comportamentais estimados a partir de tempo, trocas de alternativa e uso de pistas; não são diagnósticos definitivos.</p>';
}

function reviewQueueItems(){
  const lessons=(state.materials||[]).filter(m=>materialKind(m).key==='lesson');
  return lessons.map(item=>({item,meta:topicLearningMeta(item.topic,item.subject)}))
    .filter(x=>x.meta.reviewDue||x.meta.key==='review')
    .sort((a,b)=>Number(b.meta.reviewDue)-Number(a.meta.reviewDue)||Number(a.meta.score||0)-Number(b.meta.score||0))
    .slice(0,6);
}

function renderReviewQueue(){
  const el=$('#reviewQueue');if(!el)return;
  const items=reviewQueueItems();
  if($('#reviewQueueCount'))$('#reviewQueueCount').textContent=items.length+' pendente'+(items.length===1?'':'s');
  if(!items.length){
    el.innerHTML='<div class="review-queue-empty"><span>✓</span><div><b>Fila limpa por enquanto.</b><small>Quando um assunto precisar voltar, ele aparece aqui.</small></div></div>';
    return;
  }
  el.innerHTML=items.map(({item,meta})=>'<button class="review-queue-item" data-review-topic="'+encodeURIComponent(item.topic)+'" data-review-subject="'+encodeURIComponent(item.subject||'')+'">'+
    '<span>'+Math.round(Number(meta.score||0))+'%</span><div><b>'+esc(item.topic)+'</b><small>'+esc(meta.label)+' · '+(meta.daysSince<999?meta.daysSince+' dia(s) desde o último contato':'revisão recomendada')+'</small></div><i>→</i></button>').join('');
  $$('[data-review-topic]',el).forEach(btn=>btn.onclick=()=>{
    const topic=decodeURIComponent(btn.dataset.reviewTopic||'');
    const subject=decodeURIComponent(btn.dataset.reviewSubject||'');
    const item=topicLesson(topic,subject);
    if(item)startContentPractice(item,true,3);
  });
}

function renderProfileEvolution(){
  const el=$('#profileEvolution');if(!el)return;
  const d=state.dashboard||{},j=state.journey?.profile||{},m=[...state.topicMastery.values()];
  const mastered=m.filter(x=>Number(x.attempts||0)>=8&&Number(x.masteryScore||0)>=80).length;
  const consolidating=m.filter(x=>Number(x.masteryScore||0)>=65&&Number(x.attempts||0)>=5).length;
  const totalMinutes=Math.round(Number(d.total_duration_seconds||0)/60);
  const accuracy=Number(d.accuracy||0);
  el.innerHTML=[
    ['Questões',Number(d.attempts||0),'resolvidas'],
    ['Acerto',accuracy+'%','histórico'],
    ['Domínio',mastered,'assunto'+(mastered===1?'':'s')+' dominado'+(mastered===1?'':'s')],
    ['Consolidando',consolidating,'assunto'+(consolidating===1?'':'s')],
    ['Sequência',Number(j.streak_days||0)+'d','dias seguidos'],
    ['Nível',Number(j.level||1),esc(j.title||'Jornada NEXO')],
    ['Tempo',totalMinutes?totalMinutes+' min':'—','estudo registrado'],
    ['Liga',esc(j.league||'Bronze'),'Jornada NEXO']
  ].map((x,i)=>'<article><span>'+String(i+1).padStart(2,'0')+'</span><b>'+x[0]+'</b><strong>'+x[1]+'</strong><small>'+x[2]+'</small></article>').join('');
}

async function renderPerformance() {
  const [, , , intel]=await Promise.all([loadDashboard(),loadNexoCore(),loadErrorNotebook(),loadLearningIntelligence(),loadTopicMastery(),loadNexoJourney({silent:true}),loadMaterials({silent:true}),loadSubtopicMastery(),loadEssayHistory(),loadEnemRadar({silent:true}),loadDueReviewItems()]);
  const d=state.dashboard||{attempts:0,correct:0,accuracy:0,by_area:[]};
  const core=state.core||{};
  const momentum=core.momentum||{};
  const rec=core.recommended_action||null;
  const overall=core.overall||{};
  renderErrorPatternMap(intel);
  renderReviewQueue();
  renderProfileEvolution();
  renderV3Intelligence();
  renderSmartReviewQueue();

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


const ESSAY_COMPETENCY_TRAINERS=Object.freeze([
  {code:'C1',name:'Norma-padrão',mission:'Reescreva um parágrafo reduzindo períodos longos e revisando concordância, regência, pontuação e vocabulário.',check:'Leia em voz baixa e marque onde a frase exige releitura.'},
  {code:'C2',name:'Compreensão da proposta',mission:'Resuma o tema em uma frase com problema + recorte + sociedade brasileira e confira se cada parágrafo responde a isso.',check:'Se um parágrafo servir para qualquer tema, ele está genérico demais.'},
  {code:'C3',name:'Argumentação',mission:'Complete um argumento em quatro etapas: afirmação → causa → consequência → ligação com a tese.',check:'Mostre por que acontece, o que provoca e como sustenta a tese.'},
  {code:'C4',name:'Coesão',mission:'Substitua repetições por retomadas claras e varie conectivos sem mudar a relação lógica.',check:'O conectivo deve mostrar causa, oposição, consequência, exemplificação ou conclusão.'},
  {code:'C5',name:'Intervenção',mission:'Monte a intervenção em cinco peças: agente + ação + meio/modo + finalidade + detalhamento.',check:'A proposta precisa responder ao problema e respeitar os direitos humanos.'}
]);

const NEXO_REPERTOIRES=Object.freeze({
  default:[
    {name:'Constituição Federal de 1988',context:'Referência geral a direitos, cidadania e deveres do poder público.',use:'Use quando o direito citado tiver relação direta com o problema.'},
    {name:'Declaração Universal dos Direitos Humanos',context:'Referência para dignidade, igualdade e proteção de direitos.',use:'Conecte o princípio ao problema concreto.'},
    {name:'Milton Santos',context:'Espaço, cidadania, globalização e desigualdade podem ajudar em temas sociais e urbanos.',use:'Explique a ideia com suas palavras e ligue ao tema.'}
  ],
  'Educação':[
    {name:'Paulo Freire',context:'Educação como formação crítica e participação social.',use:'Relacione formação crítica ao obstáculo educacional específico.'},
    {name:'Educação como direito social',context:'Acesso, permanência e qualidade podem ser discutidos a partir da garantia do direito à educação.',use:'Mostre a distância entre direito e experiência concreta.'},
    {name:'Pierre Bourdieu',context:'Diferenças de capital cultural ajudam a pensar desigualdades escolares.',use:'Explique como condições sociais afetam oportunidades.'}
  ],
  'Tecnologia e sociedade':[
    {name:'Sociedade em rede',context:'Redes digitais alteram comunicação, circulação de informação e relações sociais.',use:'Relacione a estrutura de rede ao comportamento discutido.'},
    {name:'Proteção de dados',context:'Privacidade e responsabilidade ajudam a analisar serviços e plataformas digitais.',use:'Use em temas de exposição, segurança e coleta de dados.'},
    {name:'Educação midiática',context:'Leitura crítica de informação e meios de comunicação.',use:'Sustenta propostas contra desinformação e uso acrítico de plataformas.'}
  ],
  'Meio ambiente':[
    {name:'Desenvolvimento sustentável',context:'Busca conciliar necessidades sociais, economia e proteção ambiental.',use:'Mostre qual dimensão está em conflito no tema.'},
    {name:'Agenda 2030',context:'Os ODS organizam metas sociais e ambientais amplas.',use:'Use o objetivo relacionado como referência, não como lista.'},
    {name:'Justiça ambiental',context:'Impactos ambientais podem atingir grupos sociais de forma desigual.',use:'Relacione vulnerabilidade social à distribuição de riscos.'}
  ],
  'Saúde pública':[
    {name:'SUS',context:'Acesso, prevenção, atenção básica e informação estruturam discussões de saúde pública.',use:'Conecte o princípio ao obstáculo específico do tema.'},
    {name:'Determinantes sociais da saúde',context:'Renda, moradia, educação e território também influenciam saúde.',use:'Evita tratar saúde apenas como escolha individual.'},
    {name:'Prevenção e educação em saúde',context:'Informação e prevenção podem reduzir riscos antes do atendimento especializado.',use:'Base útil para propostas educativas e comunitárias.'}
  ],
  'Cidadania':[
    {name:'Participação no espaço público',context:'A cidadania também envolve ação coletiva e participação social.',use:'Relacione participação à capacidade de agir sobre problemas comuns.'},
    {name:'Direitos sociais',context:'Direitos dependem de acesso efetivo, não apenas reconhecimento formal.',use:'Mostre a distância entre garantia e realidade.'},
    {name:'Capital social',context:'Redes de confiança e cooperação fortalecem ação comunitária.',use:'Pode sustentar propostas de participação e pertencimento.'}
  ],
  'Trabalho':[
    {name:'Transformações do trabalho',context:'Tecnologia e mudanças econômicas alteram profissões e qualificação.',use:'Use para discutir requalificação e proteção profissional.'},
    {name:'Trabalho de cuidado',context:'Atividades de cuidado têm valor social e econômico, embora sejam frequentemente invisibilizadas.',use:'Conecte cuidado, desigualdade e reconhecimento.'},
    {name:'Qualificação profissional',context:'Formação contínua pode aproximar trabalhadores de novas demandas.',use:'Base para propostas de educação profissional.'}
  ],
  'Urbanização':[
    {name:'Direito à cidade',context:'Acesso a mobilidade, serviços e espaços públicos é distribuído de forma desigual.',use:'Relacione infraestrutura à participação na vida urbana.'},
    {name:'Segregação socioespacial',context:'Grupos sociais ocupam o espaço urbano de forma desigual.',use:'Explique como território e renda afetam oportunidades.'},
    {name:'Planejamento urbano',context:'Transporte, habitação e uso do solo moldam qualidade de vida.',use:'Base para propostas concretas de gestão urbana.'}
  ],
  'Cultura':[
    {name:'Patrimônio cultural',context:'Memória coletiva envolve bens, práticas e referências compartilhadas.',use:'Explique por que preservar determinada memória tem valor social.'},
    {name:'Indústria cultural',context:'Produção cultural em larga escala permite discutir consumo e circulação.',use:'Use quando o tema envolver mídia ou consumo cultural.'},
    {name:'Identidade cultural',context:'Identidades são construídas por práticas, memória e pertencimento.',use:'Relacione cultura ao grupo ou conflito do tema.'}
  ],
  'Inclusão e acessibilidade':[
    {name:'Desenho universal',context:'Produtos, espaços e serviços podem ser pensados para o maior número possível de pessoas.',use:'Sustenta propostas de acessibilidade desde o projeto.'},
    {name:'Barreiras atitudinais',context:'Atitudes e práticas também podem limitar participação.',use:'Ajuda a discutir preconceito, autonomia e inclusão.'},
    {name:'Acessibilidade como participação',context:'Acesso envolve comunicação, mobilidade e uso autônomo.',use:'Conecte recurso acessível à participação concreta.'}
  ]
});

const ESSAY_ARGUMENT_STRUCTURES=Object.freeze([
  {name:'Causa → consequência',template:'O problema persiste porque [causa]. Como resultado, [consequência], o que reforça [ligação com a tese].',best:'bom para explicar mecanismos e efeitos sociais'},
  {name:'Direito × realidade',template:'Embora [direito/princípio] seja reconhecido, [obstáculo] impede sua efetivação. Essa distância produz [consequência].',best:'bom para cidadania, educação, saúde e inclusão'},
  {name:'Agente → prática → impacto',template:'Quando [agente] adota [prática], ocorre [impacto]. Sem [mudança], tende a permanecer [problema].',best:'bom para tecnologia, trabalho, mídia e consumo'},
  {name:'Histórico → permanência',template:'Historicamente, [processo] contribuiu para [estrutura]. Hoje, esse legado aparece em [manifestação atual].',best:'bom quando houver relação histórica real'}
]);

function essayPrioritySignal(){
  const rows=state.essayHistory||[];
  if(!rows.length)return null;
  const recent=rows.slice(0,5);
  const avgs=[0,1,2,3,4].map(i=>Math.round(recent.reduce((sum,row)=>sum+Number(essayScoresFromRow(row)[i]||0),0)/recent.length));
  const weakIndex=avgs.indexOf(Math.min(...avgs));
  return {index:weakIndex,score:avgs[weakIndex],trainer:ESSAY_COMPETENCY_TRAINERS[weakIndex],averages:avgs,latest:rows[0]};
}

function currentEssayAxis(){
  const selected=getEssayThemeData?.();
  if(selected?.axis)return selected.axis;
  const axis=$('#essayAxis')?.value||'all';
  return axis!=='all'?axis:'default';
}

function activateEssayCompetency(index){
  state.essayTrainingCompetency=clamp(Number(index||0),0,4);
  renderEssayIntelligenceV5();
  $('#essayCompetencyPlan')?.scrollIntoView({behavior:'smooth',block:'center'});
}

function renderEssayCompetencyPlan(){
  const el=$('#essayCompetencyPlan');if(!el)return;
  const signal=essayPrioritySignal();
  const active=state.essayTrainingCompetency!==null?Number(state.essayTrainingCompetency):Number(signal?.index||0);
  const trainer=ESSAY_COMPETENCY_TRAINERS[active];
  if($('#essayPriorityCompetency'))$('#essayPriorityCompetency').textContent=signal?trainer.code+' · '+signal.score+'/200':'primeiro treino';
  el.innerHTML='<div class="essay-comp-trainer-tabs">'+ESSAY_COMPETENCY_TRAINERS.map((x,i)=>'<button data-essay-train-comp="'+i+'" class="'+(i===active?'active':'')+'">'+x.code+'</button>').join('')+'</div>'+
    '<article class="essay-comp-mission"><span>'+trainer.code+' · '+esc(trainer.name)+'</span><h4>Missão de 5 minutos</h4><p>'+esc(trainer.mission)+'</p><div><b>Como conferir:</b> '+esc(trainer.check)+'</div><footer><button id="askNexoCompetency" class="outline-btn">Perguntar ao Nexo</button><button id="focusEssayEditor" class="primary-btn">Levar para meu texto →</button></footer></article>';
  $$('[data-essay-train-comp]',el).forEach(btn=>btn.onclick=()=>activateEssayCompetency(Number(btn.dataset.essayTrainComp)));
  $('#askNexoCompetency')?.addEventListener('click',()=>openProfessorNexo('Quero treinar '+trainer.code+' ('+trainer.name+'). Me dê um exercício curto usando o tema da minha redação atual.'));
  $('#focusEssayEditor')?.addEventListener('click',()=>{$('#essayText')?.focus();$('#essayText')?.scrollIntoView({behavior:'smooth',block:'center'});toast('Foco ativo: '+trainer.code+' · '+trainer.name);});
}

function renderEssayVersionCompare(){
  const el=$('#essayVersionCompare');if(!el)return;
  const rows=state.essayHistory||[];
  const latest=rows[0];
  const previous=latest?.revision_of?rows.find(x=>Number(x.id)===Number(latest.revision_of)):rows[1];
  if(!latest||!previous){
    el.innerHTML='<p class="learning-empty">Depois de duas correções, o NEXO mostra a diferença por competência.</p>';
    if($('#essayCompareLabel'))$('#essayCompareLabel').textContent=latest?'falta uma versão':'sem comparação';
    return;
  }
  const a=essayScoresFromRow(previous),b=essayScoresFromRow(latest);
  const totalDelta=Number(latest.estimated_score||0)-Number(previous.estimated_score||0);
  if($('#essayCompareLabel'))$('#essayCompareLabel').textContent=(totalDelta>=0?'+':'')+totalDelta+' pts';
  el.innerHTML='<div class="essay-compare-head"><span><small>ANTES</small><b>'+Number(previous.estimated_score||0)+'</b></span><i>→</i><span><small>AGORA</small><b>'+Number(latest.estimated_score||0)+'</b></span></div>'+
    '<div class="essay-compare-comps">'+b.map((score,i)=>{const d=score-a[i];return '<div><span>C'+(i+1)+'</span><i><em style="width:'+score/2+'%"></em></i><b class="'+(d>0?'up':d<0?'down':'')+'">'+(d>0?'+':'')+d+'</b></div>'}).join('')+'</div>';
}

function renderEssayRepertoires(){
  const el=$('#essayRepertoireList');if(!el)return;
  const axis=currentEssayAxis();
  const items=NEXO_REPERTOIRES[axis]||NEXO_REPERTOIRES.default;
  if($('#essayRepertoireAxis'))$('#essayRepertoireAxis').textContent=axis==='default'?'repertório geral':axis;
  el.innerHTML=items.map((x,i)=>'<article><span>'+String(i+1).padStart(2,'0')+'</span><div><b>'+esc(x.name)+'</b><p>'+esc(x.context)+'</p><small><strong>Como usar:</strong> '+esc(x.use)+'</small></div></article>').join('');
}

function renderEssayArguments(){
  const el=$('#essayArgumentList');if(!el)return;
  el.innerHTML=ESSAY_ARGUMENT_STRUCTURES.map((x,i)=>'<article><span>'+String(i+1).padStart(2,'0')+'</span><div><b>'+esc(x.name)+'</b><p>'+esc(x.template)+'</p><small>'+esc(x.best)+'</small></div><button data-use-argument="'+i+'">Treinar →</button></article>').join('');
  $$('[data-use-argument]',el).forEach(btn=>btn.onclick=()=>{
    const x=ESSAY_ARGUMENT_STRUCTURES[Number(btn.dataset.useArgument)];
    openProfessorNexo('Quero praticar a estrutura '+x.name+'. Tema atual: '+getEssayThemeData().title+'. Crie um exercício para eu preencher, sem escrever a redação por mim.');
  });
}

function renderEssayIntelligenceV5(){
  renderEssayCompetencyPlan();
  renderEssayVersionCompare();
  renderEssayRepertoires();
  renderEssayArguments();
}

function essayThemeCompleted(theme){
  return Boolean(theme?.title&&state.completedEssayThemes?.has?.(theme.title));
}

async function loadEssayThemeProgress({rerender=true}={}){
  if(!state.user?.id)return state.completedEssayThemes;
  try{
    const {data,error}=await client.from('essays')
      .select('theme_title,status')
      .eq('user_id',state.user.id)
      .eq('status','reviewed')
      .order('created_at',{ascending:false});
    if(error)throw error;
    state.completedEssayThemes=new Set((data||[]).map(row=>String(row.theme_title||'').trim()).filter(Boolean));
    state.essayThemeProgressLoaded=true;
    if(rerender)fillThemes();
    return state.completedEssayThemes;
  }catch(err){
    console.error('essay theme progress',err);
    state.essayThemeProgressLoaded=true;
    return state.completedEssayThemes;
  }
}

function renderEssayThemeOptions({keepSelection=true}={}){
  const themeSelect=$('#essayTheme');
  if(!themeSelect)return;
  const axis=$('#essayAxis')?.value||'all';
  const previous=keepSelection?themeSelect.value:'';
  const visible=axis==='all'?THEMES:THEMES.filter(t=>t.axis===axis);
  const remaining=visible.filter(t=>!essayThemeCompleted(t));

  themeSelect.innerHTML=visible.map(t=>{
    const done=essayThemeCompleted(t);
    return `<option value="${t.id}" ${done?'disabled':''}>${done?'✓ Concluído · ':''}${esc(t.title)}</option>`;
  }).join('')+'<option value="custom">✦ Tema personalizado</option>';

  if(previous==='custom')themeSelect.value='custom';
  else if(previous&&visible.some(t=>String(t.id)===String(previous)))themeSelect.value=previous;
  else if(remaining[0])themeSelect.value=String(remaining[0].id);
  else themeSelect.value='custom';

  const counter=$('#essayThemeCount');
  if(counter){
    const done=visible.length-remaining.length;
    counter.textContent=remaining.length+' '+(remaining.length===1?'disponível':'disponíveis')+
      ' · '+done+' concluído'+(done===1?'':'s')+
      (axis==='all'?'':' neste eixo');
  }
  updateEssayPrompt();
}

function renderEssayThemeCards(){
  const grid=$('#themesGrid');
  if(!grid)return;
  grid.innerHTML=THEMES.map(t=>{
    const done=essayThemeCompleted(t);
    return `<article class="theme-card ${done?'theme-completed':''}">
      <span class="axis">${esc(t.axis.toUpperCase())}</span>
      <h3>${esc(t.title)}</h3>
      <p>${esc(t.prompt)}</p>
      <button class="outline-btn small" data-theme="${t.id}" ${done?'disabled':''}>${done?'✓ Tema concluído':'Praticar tema →'}</button>
    </article>`;
  }).join('');

  $$('[data-theme]',grid).forEach(b=>b.onclick=()=>{
    const t=THEMES.find(x=>String(x.id)===String(b.dataset.theme));
    if(!t||essayThemeCompleted(t))return;
    if($('#essayAxis'))$('#essayAxis').value=t.axis;
    renderEssayThemeOptions({keepSelection:false});
    $('#essayTheme').value=b.dataset.theme;
    updateEssayPrompt();
    openPage('redacao');
    $('#essayText').focus();
  });
}

function fillThemes() {
  const axisSelect=$('#essayAxis');
  if(axisSelect){
    const currentAxis=axisSelect.value||'all';
    const axes=[...new Set(THEMES.map(t=>t.axis))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    axisSelect.innerHTML='<option value="all">Todos os eixos</option>'+axes.map(axis=>`<option value="${esc(axis)}">${esc(axis)}</option>`).join('');
    axisSelect.value=axes.includes(currentAxis)?currentAxis:'all';
    axisSelect.onchange=()=>renderEssayThemeOptions({keepSelection:false});
  }

  renderEssayThemeOptions({keepSelection:true});

  const randomBtn=$('#randomEssayTheme');
  if(randomBtn)randomBtn.onclick=()=>{
    const axis=$('#essayAxis')?.value||'all';
    const axisPool=axis==='all'?THEMES:THEMES.filter(t=>t.axis===axis);
    const pool=axisPool.filter(t=>!essayThemeCompleted(t));
    if(!pool.length){
      toast(axis==='all'
        ?'Você já concluiu todos os temas disponíveis. Use um tema personalizado.'
        :'Você já concluiu todos os temas deste eixo. Escolha outro eixo.');
      return;
    }
    const current=Number($('#essayTheme').value);
    const choices=pool.length>1?pool.filter(t=>t.id!==current):pool;
    const picked=choices[Math.floor(Math.random()*choices.length)]||pool[0];
    $('#essayTheme').value=String(picked.id);
    updateEssayPrompt();
    randomBtn.animate?.([{transform:'scale(.97)'},{transform:'scale(1)'}],{duration:180});
  };

  renderEssayThemeCards();
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
  const done=!custom&&essayThemeCompleted(t);
  $('#essayPrompt').innerHTML=`<b>Proposta:</b> ${esc(t.prompt)}`;
  const full=$('#essayThemeFullTitle');
  if(full){
    full.innerHTML='<span>'+(done?'✓ TEMA CONCLUÍDO':'TEMA SELECIONADO')+'</span><b>'+esc(t.title)+'</b>';
    full.classList.toggle('completed',done);
  }
  renderEssayRepertoires();
}
$('#essayTheme').addEventListener('change',updateEssayPrompt);
$('#customEssayTheme').addEventListener('input',updateEssayPrompt);
$('#customEssayPrompt').addEventListener('input',updateEssayPrompt);
$('#essayText').addEventListener('input',()=>$('#wordCount').textContent=(($('#essayText').value.match(/\S+/g)||[]).length)+' palavras');

const OFFICIAL_ENEM_ESSAY_SHEET={
  localUrl:'./folha-redacao-enem.html',
  url:'./folha-redacao-enem.html',
  label:'Folha ENEM para treino - tamanho real',
  officialReference:'https://www.gov.br/inep/pt-br/centrais-de-conteudo/acervo-linha-editorial/publicacoes-institucionais/avaliacoes-e-exames-da-educacao-basica/a-redacao-do-enem-2026-cartilha-do-a-participante',
  loading:false,
  checked:false
};

function essaySheetTitleMatches(title=''){
  const normalized=String(title||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  return normalized.includes('enem')&&normalized.includes('folha')&&normalized.includes('reda');
}

async function updateOfficialEssaySheetAction({refresh=false}={}){
  const btn=$('#officialEssaySheetBtn');
  const note=$('#officialEssaySheetNote');
  if(!btn)return;

  if((refresh||!OFFICIAL_ENEM_ESSAY_SHEET.checked)&&!OFFICIAL_ENEM_ESSAY_SHEET.loading){
    OFFICIAL_ENEM_ESSAY_SHEET.loading=true;
    btn.disabled=true;
    btn.textContent='Procurando folha oficial...';
    try{
      const {data,error}=await client.from('materials')
        .select('title,file_url,format,is_published,created_at')
        .eq('is_published',true)
        .order('created_at',{ascending:false})
        .limit(100);
      if(error)throw error;

      const sheet=(data||[]).find(row=>{
        const isPdf=String(row.format||'').toLowerCase()==='pdf'||/\.pdf(?:$|\?)/i.test(String(row.file_url||''));
        return isPdf&&essaySheetTitleMatches(row.title);
      });

      OFFICIAL_ENEM_ESSAY_SHEET.url=sheet?.file_url||OFFICIAL_ENEM_ESSAY_SHEET.localUrl;
      OFFICIAL_ENEM_ESSAY_SHEET.label=sheet?.title||'Folha ENEM para treino - tamanho real';
      OFFICIAL_ENEM_ESSAY_SHEET.checked=true;
    }catch(err){
      console.error('official essay sheet',err);
      OFFICIAL_ENEM_ESSAY_SHEET.checked=true;
    }finally{
      OFFICIAL_ENEM_ESSAY_SHEET.loading=false;
    }
  }

  const ready=Boolean(OFFICIAL_ENEM_ESSAY_SHEET.url);
  const usingUploaded=Boolean(OFFICIAL_ENEM_ESSAY_SHEET.url&&OFFICIAL_ENEM_ESSAY_SHEET.url!==OFFICIAL_ENEM_ESSAY_SHEET.localUrl);
  btn.disabled=!ready;
  btn.textContent=usingUploaded?'Abrir folha enviada para imprimir ↗':'Abrir folha em tamanho real ↗';
  if(note)note.textContent=usingUploaded
    ?'A folha enviada está disponível para impressão.'
    :'Modelo de treino A4 com 30 linhas. A página abre visível no celular e permite imprimir ou salvar como PDF em escala 100%. A folha definitiva do Enem é personalizada e entregue pelo Inep no dia da prova.';
}

$('#officialEssaySheetBtn')?.addEventListener('click',()=>{
  const url=OFFICIAL_ENEM_ESSAY_SHEET.url||OFFICIAL_ENEM_ESSAY_SHEET.localUrl;
  if(!url)return toast('A folha de treino não está disponível agora.');
  window.open(url,'_blank','noopener,noreferrer');
});

$('#officialEssayGuideBtn')?.addEventListener('click',()=>{
  window.open(OFFICIAL_ENEM_ESSAY_SHEET.officialReference,'_blank','noopener,noreferrer');
});

const ESSAY_STOPWORDS=new Set([
  'a','as','o','os','e','de','da','das','do','dos','em','no','na','nos','nas','um','uma','uns','umas',
  'para','por','com','sem','que','se','ao','aos','à','às','como','mais','menos','muito','muita','muitos','muitas',
  'ser','são','foi','sua','seu','suas','seus','esse','essa','este','esta','isso','isto','sobre','entre','também',
  'texto','tema','proposta','produza','redação','dissertativo','argumentativo','partir','acerca','relação'
]);
function normalizeEssayWord(value=''){
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
}
function essayMetrics(text,theme={}){
  const rawWords=text.match(/\S+/g)||[];
  const tokens=(normalizeEssayWord(text).match(/[a-z]+/g)||[]).filter(w=>w.length>1);
  const meaningful=tokens.filter(w=>w.length>=4&&!ESSAY_STOPWORDS.has(w));
  const uniqueMeaningful=new Set(meaningful);
  const frequencies=new Map();
  meaningful.forEach(w=>frequencies.set(w,(frequencies.get(w)||0)+1));
  const dominant=Math.max(0,...frequencies.values());
  const lexicalDiversity=meaningful.length?uniqueMeaningful.size/meaningful.length:0;
  const dominantShare=meaningful.length?dominant/meaningful.length:1;
  const paras=text.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
  const sentences=text.split(/[.!?]+/).map(x=>x.trim()).filter(Boolean);
  const avgSentence=sentences.length?rawWords.length/sentences.length:rawWords.length;
  const connectorMatches=normalizeEssayWord(text).match(/\b(portanto|alem disso|contudo|assim|desse modo|nesse sentido|porem|todavia|consequentemente|logo|dessa forma|ademais|entretanto|porque|pois|embora|enquanto|primeiramente|finalmente)\b/g)||[];
  const connectorDiversity=new Set(connectorMatches).size;
  const argumentMarkers=(normalizeEssayWord(text).match(/\b(porque|pois|devido|causa|consequencia|consequentemente|portanto|evidencia|demonstra|revela|resulta|impacto|problema)\b/g)||[]).length;
  const thesis=/\b(portanto|assim|desse modo|diante disso|e necessario|e preciso|torna-se|deve-se)\b/i.test(normalizeEssayWord(text));

  const themeText=normalizeEssayWord((theme?.title||'')+' '+(theme?.prompt||''));
  const themeTokens=[...new Set((themeText.match(/[a-z]+/g)||[]).filter(w=>w.length>=5&&!ESSAY_STOPWORDS.has(w)))];
  const textSet=new Set(meaningful);
  const themeHits=themeTokens.filter(w=>textSet.has(w)).length;
  const themeCoverage=themeTokens.length?themeHits/themeTokens.length:.5;

  const normalized=normalizeEssayWord(text);
  const proposal={
    actor:/\b(estado|governo|escola|sociedade|midia|empresas|familia|ministerio|prefeitura|ong|ongs|comunidade|poder publico|instituicoes)\b/i.test(normalized),
    action:/\b(deve|devem|promover|criar|ampliar|garantir|implementar|investir|oferecer|realizar|fiscalizar|capacitar|desenvolver|incentivar)\b/i.test(normalized),
    means:/\b(por meio de|mediante|atraves de|com a criacao|campanhas|programas|politicas publicas|investimentos|formacao|fiscalizacao|parcerias)\b/i.test(normalized),
    purpose:/\b(a fim de|para que|com o objetivo de|visando|de modo a|com a finalidade de)\b/i.test(normalized),
    detail:/\b(por exemplo|especialmente|sobretudo|tais como|incluindo|isto e|ou seja)\b/i.test(normalized)
  };
  const proposalElements=Object.values(proposal).filter(Boolean).length;
  const punctuation=(text.match(/[.;:!?]/g)||[]).length;
  return {rawWords,tokens,meaningful,lexicalDiversity,dominantShare,paras,sentences,avgSentence,connectorMatches,connectorDiversity,argumentMarkers,thesis,themeCoverage,themeHits,themeTokenCount:themeTokens.length,proposal,proposalElements,punctuation};
}
function essayScores(text,theme={}){
  const m=essayMetrics(text,theme);
  const words=m.rawWords.length;
  const structureBonus=m.paras.length>=4&&m.paras.length<=6?40:m.paras.length>=3?20:0;
  const sentenceControl=m.avgSentence>=8&&m.avgSentence<=32?40:m.avgSentence<=42?20:0;
  const lexicalBonus=m.lexicalDiversity>=.48?40:m.lexicalDiversity>=.36?20:0;
  const punctuationBonus=m.punctuation>=Math.max(6,Math.floor(words/35))?20:0;
  const themeBonus=m.themeCoverage>=.30?100:m.themeCoverage>=.18?80:m.themeCoverage>=.08?50:20;
  const argumentBonus=Math.min(60,m.argumentMarkers*10)+(m.thesis?20:0);
  const cohesionBonus=Math.min(120,m.connectorDiversity*20);
  const proposalBonus=Math.min(180,m.proposalElements*36);

  let scores=[
    clamp(60+sentenceControl+lexicalBonus+punctuationBonus,40,180),
    clamp(40+themeBonus+(words>=160?40:words>=100?20:0),40,200),
    clamp(40+structureBonus+argumentBonus+(m.lexicalDiversity>=.36?20:0),40,180),
    clamp(40+cohesionBonus+(m.paras.length>=4?20:0),40,200),
    clamp(20+proposalBonus,40,200)
  ];

  const suspiciousRepetition=m.lexicalDiversity<.22||m.dominantShare>.12;
  if(suspiciousRepetition)scores=scores.map(x=>Math.min(x,80));
  if(words<120)scores=scores.map(x=>Math.min(x,120));
  if(words<80)scores=scores.map(x=>Math.min(x,80));
  if(m.themeCoverage<.05&&m.themeTokenCount>=3){
    scores[1]=Math.min(scores[1],80);
    scores[2]=Math.min(scores[2],100);
  }
  return scores.map(x=>Math.round(x/20)*20);
}
$('#analyzeEssay').onclick=async()=>{
  if(blockMaintenance('essays'))return;
  if(!state.membership)await loadNexoMembership({silent:true});
  if(planUsageReached('essay'))return openNexoPlans('Sua correção gratuita de redação deste mês já foi usada.');
  const text=$('#essayText').value.trim();
  const selectedTheme=getEssayThemeData();
  if($('#essayTheme').value!=='custom'&&essayThemeCompleted(selectedTheme)){
    return toast('Esse tema já foi concluído. Escolha ou sorteie um tema novo.','info');
  }
  if($('#essayTheme').value==='custom' && !$('#customEssayTheme').value.trim()){
    return toast('Escreva o tema personalizado antes de analisar.','error');
  }
  const essayWordCount=(text.match(/\S+/g)||[]).length;
  if(essayWordCount<80)return toast('Para estimar as 5 competências, escreva pelo menos 80 palavras.','error');
  const analyzeBtn=$('#analyzeEssay');
  analyzeBtn.disabled=true;
  analyzeBtn.textContent='Professor Nexo está lendo...';
  const loader=$('#essayLoader');loader.classList.remove('hidden');
  const msgs=['Avaliando estrutura e repertório.','Analisando coesão e progressão textual.','Verificando argumentação.','Estimando as cinco competências.','Salvando seu histórico.'];let i=0;
  const timer=setInterval(()=>{$('#loaderText').textContent=msgs[++i%msgs.length]},520);
  await sleep(350);
  const t=selectedTheme;
  const scores=essayScores(text,t),total=scores.reduce((a,b)=>a+b,0);
  const feedback={
    strength:scores[3]>=160?'Boa presença de mecanismos de coesão e encadeamento.':'A estrutura está identificável; vale tornar a progressão entre parágrafos ainda mais explícita.',
    priority:scores.indexOf(Math.min(...scores))+1,
    detailed_review:buildDetailedEssayReview(text,scores)
  };
  const { error }=await client.from('essays').insert({
    user_id:state.user.id,theme_title:t.title,essay_text:text,status:'reviewed',
    estimated_score:total,
    competencies:{c1:scores[0],c2:scores[1],c3:scores[2],c4:scores[3],c5:scores[4]},
    feedback,
    revision_of:state.essayRevisionOf||null,
    version_number:currentEssayVersionNumber(),
    word_count:(text.match(/\S+/g)||[]).length
  });
  clearInterval(timer);loader.classList.add('hidden');analyzeBtn.disabled=false;analyzeBtn.textContent='Analisar e salvar';
  if(error){
    console.error(error);logClientError('essay',error,'essay_save');
    if(handlePlanLimitError(error))return;
    toast('A análise foi feita, mas não consegui salvar o histórico.','error');
  }else{
    if($('#essayTheme').value!=='custom'){
      state.completedEssayThemes.add(t.title);
      renderEssayThemeOptions({keepSelection:true});
      renderEssayThemeCards();
    }
    loadNexoMembership({silent:true});
    loadEssayHistory().catch(()=>{});
    loadNexoWeekPlan({silent:true}).catch(()=>{});
    state.essayRevisionOf=null;
    logProductEvent('essay_review',{score_band:Math.floor(total/100)*100,priority_competency:feedback.priority},'redacao');
  }
  showEssayResult(text,scores,total);
};

function buildDetailedEssayReview(text,scores,theme=getEssayThemeData()){
  const m=essayMetrics(text,theme);
  const avg=Math.round(m.avgSentence||0);
  const notes=[];
  notes.push(m.paras.length>=4&&m.paras.length<=6?'A divisão em parágrafos está compatível com uma dissertação-argumentativa de treino.':'Revise a arquitetura do texto: introdução, desenvolvimento da tese e conclusão precisam ficar claramente separados.');
  notes.push(m.connectorDiversity>=5?'Há variedade razoável de conectivos; confira agora se cada um expressa a relação lógica correta.':'A coesão pode ficar mais explícita: varie conectivos de causa, contraste, consequência e conclusão.');
  notes.push(avg>32?'Alguns períodos estão longos. Dividi-los pode reduzir ambiguidade e problemas de pontuação.':'O tamanho médio dos períodos não acendeu um alerta automático de clareza.');
  notes.push(m.proposalElements>=4?'A intervenção contém vários elementos esperados. Confira se agente, ação, meio, finalidade e detalhamento estão realmente completos e coerentes.':'A proposta de intervenção ainda parece incompleta: explicite agente, ação, meio/modo, finalidade e detalhamento.');
  if(m.themeTokenCount>=3)notes.push(m.themeCoverage>=.18?'O vocabulário do texto mantém ligação detectável com a proposta.':'A ligação lexical com o tema está baixa; releia a proposta para evitar tangenciamento.');
  if(m.lexicalDiversity<.28||m.dominantShare>.10)notes.push('Há repetição lexical acima do esperado; varie o vocabulário e evite repetir a mesma palavra ou ideia em excesso.');
  return {paras:m.paras.length,words:m.rawWords.length,connectors:m.connectorMatches.length,connectorDiversity:m.connectorDiversity,intervention:m.proposalElements>=2,proposalElements:m.proposalElements,themeCoverage:m.themeCoverage,lexicalDiversity:m.lexicalDiversity,thesis:m.thesis,notes};
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
          <div class="essay-estimate-notice">Estimativa automática orientativa: não substitui a correção oficial do Inep nem uma leitura humana detalhada. Use a nota como faixa de treino e priorize os comentários por competência.</div>
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
          <button id="trainEssayWeak" class="outline-btn">Treinar prioridade · 5 min</button>
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
  $('#trainEssayWeak')?.addEventListener('click',()=>{
    state.essayTrainingCompetency=weak;
    renderEssayIntelligenceV5();
    $('#essayCompetencyPlan')?.scrollIntoView({behavior:'smooth',block:'center'});
  });
  if($('#trainEssayWeak'))$('#trainEssayWeak').textContent='Treinar '+shortComps[weak]+' · 5 min';
  $('#rewriteEssay').onclick=()=>{
    $('#essayText').focus();
    $('#essayText').scrollIntoView({behavior:'smooth',block:'center'});
    toast('Reescreva priorizando '+shortComps[weak]+'. O Professor Nexo mantém essa missão como foco.');
  };

  renderEssayIntelligenceV5();
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
  if(completed){
    client.rpc('refresh_my_learning_achievements').then(()=>{
      loadNexoJourney({silent:true}).catch(()=>{});
    }).catch(err=>console.warn('learning achievements',err));
  }
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


async function loadTopicMastery(){
  if(!state.user?.id)return state.topicMastery;
  try{
    const [{data:attempts,error:attemptError},{data:radarRows,error:radarError}]=await Promise.all([
      client.from('question_attempts')
        .select('question_id,is_correct,duration_seconds,created_at,question:questions(source_year,source_question_number,area,subject,topic,difficulty)')
        .order('created_at',{ascending:false})
        .limit(700),
      client.from('enem_radar_items')
        .select('year,question_index,area,subject,topic')
        .limit(4000)
    ]);
    if(attemptError)throw attemptError;
    const radarMap=new Map();
    if(!radarError){
      for(const row of radarRows||[])radarMap.set(String(row.year)+'::'+String(row.question_index),row);
    }
    const now=Date.now(),map=new Map();
    for(const a of attempts||[]){
      const q=a.question||{};
      const fine=radarMap.get(String(q.source_year)+'::'+String(q.source_question_number));
      const topic=fine?.topic||q.topic||q.subject||q.area||'Geral';
      const subject=fine?.subject||q.subject||q.area||'';
      const key=String(topic);
      const row=map.get(key)||{topic:key,subject,attempts:0,correct:0,totalSeconds:0,lastAt:null,weightedCorrect:0,weightTotal:0,difficultyTotal:0};
      const difficulty=clamp(Number(q.difficulty||2),1,5);
      const at=a.created_at?new Date(a.created_at):null;
      const ageDays=at?Math.max(0,(now-at.getTime())/86400000):30;
      const recency=ageDays<=7?1.15:ageDays<=30?1:0.88;
      const weight=(0.75+difficulty*0.15)*recency;
      row.attempts++;
      if(a.is_correct){row.correct++;row.weightedCorrect+=weight}
      row.weightTotal+=weight;
      row.difficultyTotal+=difficulty;
      row.totalSeconds+=Number(a.duration_seconds||0);
      if(at&&(!row.lastAt||at>row.lastAt))row.lastAt=at;
      map.set(key,row);
    }
    for(const row of map.values()){
      row.accuracy=row.attempts?Math.round(row.correct*100/row.attempts):0;
      row.avgSeconds=row.attempts?Math.round(row.totalSeconds/row.attempts):0;
      row.avgDifficulty=row.attempts?Number((row.difficultyTotal/row.attempts).toFixed(1)):0;
      // Bayesian prior prevents 1/1 from looking like real mastery.
      const priorWeight=3,priorRate=.5;
      const posterior=(row.weightedCorrect+priorWeight*priorRate)/(row.weightTotal+priorWeight);
      const confidence=1-Math.exp(-row.attempts/6);
      const paceFactor=row.avgSeconds&&row.avgSeconds>210?.95:1;
      row.masteryScore=clamp(Math.round(posterior*(.78+.22*confidence)*100*paceFactor),0,100);
      row.confidence=clamp(Math.round(confidence*100),0,100);
      row.daysSince=row.lastAt?Math.floor((now-row.lastAt.getTime())/86400000):999;
    }
    state.topicMastery=map;
  }catch(err){
    console.error('topic mastery',err);
    logClientError('learning',err,'topic_mastery');
  }
  renderNexoToday();
  renderMathTrail();
  if(state.materials.length)renderMaterials();
  return state.topicMastery;
}

function topicMaterials(topic,subject='Matemática'){
  return (state.materials||[]).filter(m=>
    String(m.topic||'').toLocaleLowerCase('pt-BR')===String(topic||'').toLocaleLowerCase('pt-BR') &&
    (!subject||!m.subject||String(m.subject).toLocaleLowerCase('pt-BR')===String(subject).toLocaleLowerCase('pt-BR'))
  );
}

function topicLesson(topic,subject='Matemática'){
  return topicMaterials(topic,subject).find(m=>materialKind(m).key==='lesson')||topicMaterials(topic,subject)[0]||null;
}

function topicLearningMeta(topic,subject='Matemática'){
  const materials=topicMaterials(topic,subject);
  const mastery=state.topicMastery.get(String(topic))||{attempts:0,accuracy:0,masteryScore:0,confidence:0,avgSeconds:0,lastAt:null,daysSince:999};
  const completed=materials.filter(m=>getContentProgress('material',m.id).completed).length;
  const progress=materials.length
    ? Math.round(materials.reduce((sum,m)=>sum+(getContentProgress('material',m.id).completed?100:Number(getContentProgress('material',m.id).progress_percent||0)),0)/materials.length)
    : 0;
  const score=mastery.attempts?Number(mastery.masteryScore||0):progress;
  let intervalDays=1;
  if(score>=80&&mastery.attempts>=8)intervalDays=7;
  else if(score>=65&&mastery.attempts>=5)intervalDays=3;
  const lastLearningAt=mastery.lastAt||materials.map(m=>getContentProgress('material',m.id).last_opened_at).filter(Boolean).map(x=>new Date(x)).sort((a,b)=>b-a)[0]||null;
  const daysSince=lastLearningAt?Math.floor((Date.now()-new Date(lastLearningAt).getTime())/86400000):999;
  const reviewDue=Boolean(mastery.attempts>=3&&daysSince>=intervalDays);
  let label='NOVO',key='new';
  if(reviewDue&&score>=55){label='HORA DE REVISAR';key='review'}
  else if(mastery.attempts>=8&&score>=80){label='DOMINADO';key='mastered'}
  else if(mastery.attempts>=5&&score<55){label='REVISAR';key='review'}
  else if(mastery.attempts>=5&&score>=65){label='CONSOLIDANDO';key='consolidating'}
  else if(mastery.attempts>0){label='EM TREINO';key='training'}
  else if(progress>0||completed>0){label='APRENDENDO';key='learning'}
  return {...mastery,score,materials,completed,progress,label,key,intervalDays,daysSince,reviewDue,lastLearningAt};
}

function openLibraryTopic(subject,topic){
  openPage('materiais');
  Promise.resolve(loadMaterials({silent:true})).then(()=>{
    if(subject)state.materialSubject=subject;
    const key=[subject||'Conteúdo',topic||'Materiais'].join('||');
    state.materialOpenTopic=key;
    renderMaterials();
    setTimeout(()=>{
      const nodes=$$('.content-topic-group');
      const target=nodes.find(el=>el.querySelector('.content-topic-name h3')?.textContent?.trim()===String(topic||'').trim());
      target?.scrollIntoView({behavior:'smooth',block:'start'});
    },80);
  });
}

function spacedReviewCandidate(){
  const lessons=(state.materials||[]).filter(m=>materialKind(m).key==='lesson');
  return lessons.map(item=>{
    const meta=topicLearningMeta(item.topic,item.subject);
    return {item,meta,days:meta.daysSince};
  }).filter(x=>x.meta.reviewDue)
    .sort((a,b)=>(Number(b.meta.score||0)-Number(a.meta.score||0))||(b.days-a.days))[0]||null;
}

function renderNexoToday(){
  const cards=$$('[data-nexo-today]');
  if(!cards.length)return;
  const saved=readPersistedStudySession();
  const partial=(state.materials||[])
    .map(item=>({item,p:getContentProgress('material',item.id)}))
    .filter(x=>Number(x.p.progress_percent||0)>0&&!x.p.completed)
    .sort((a,b)=>new Date(b.p.last_opened_at||0)-new Date(a.p.last_opened_at||0))[0];
  const review=spacedReviewCandidate();
  const dueQuestion=state.dueReviewItems?.[0]||null;
  const rec=state.core?.recommended_action||null;
  const radarMath=(state.radarTopics||[]).filter(r=>r.area==='Matemática').sort((a,b)=>Number(b.nexo_priority_score||0)-Number(a.nexo_priority_score||0));
  const firstIncomplete=radarMath.find(r=>topicLearningMeta(r.topic,r.subject).key!=='mastered');

  let title='Comece pelo assunto que mais retorna pontos.';
  let text='O NEXO vai conectar conteúdo, treino e revisão para você não estudar no escuro.';
  let status='PRÓXIMO PASSO',time='~12 min',mood='pensativo',action=()=>openPage('materiais'),actionLabel='Abrir Biblioteca →';

  if(saved){
    title='Continue '+(saved.topic||saved.subject||saved.area||'sua sessão')+'.';
    text='Você tem uma sessão em andamento. Volte exatamente à questão em que parou.';
    status='CONTINUAR',time=(Math.max(1,Number(saved.size||0)-Number(saved.index||0)))+' questões',mood='confiante';
    action=()=>resumePersistedStudySession(); actionLabel='Continuar sessão →';
  }else if(partial?.item){
    const kind=materialKind(partial.item);
    title='Continue '+(partial.item.topic||partial.item.title)+'.';
    text=(kind.label||'Conteúdo')+' está em '+Math.round(Number(partial.p.progress_percent||0))+'%. Termine essa etapa antes do próximo treino.';
    status='DE ONDE PAROU';time='~6 min';mood='acolhedor';
    action=()=>{openPage('materiais');setTimeout(()=>openContentViewer('material',partial.item.id),100)};actionLabel='Continuar conteúdo →';
  }else if(studyPhaseMeta().recovery){
    const phase=studyPhaseMeta();
    title='Volte com uma sessão leve de retomada.';
    text='Faz '+phase.inactiveDays+' dias desde seu último estudo registrado. Não vou empilhar tarefas atrasadas: começamos pequeno e recalculamos a rota.';
    status='RETOMADA INTELIGENTE';time='~20 min';mood='acolhedor';
    action=()=>startRecoverySession();actionLabel='Retomar sem sobrecarga →';
  }else if(dueQuestion){
    const q=dueQuestion.question||{};
    title='Revisão inteligente: '+(q.topic||dueQuestion.topic||'questão anterior')+'.';
    text='Esta questão que você errou chegou ao intervalo certo. Primeiro tente uma parecida e depois volte à original.';
    status='MEMÓRIA NEXO';time='~6 min';mood='serio';
    action=()=>startSimilarQuestionById(Number(dueQuestion.question_id));actionLabel='Treinar uma parecida →';
  }else if(review){
    title='Hora de revisar '+review.item.topic+'.';
    text='Faz '+review.days+' dia(s) desde o último contato. Seu intervalo atual de revisão é '+review.meta.intervalDays+' dia(s).';
    status='REVISÃO ESPAÇADA';time='3 questões';mood='serio';
    action=()=>startContentPractice(review.item,true,3);actionLabel='Revisar agora →';
  }else if(essayPrioritySignal()?.score<120){
    const essay=essayPrioritySignal();
    title='Treino rápido de '+essay.trainer.code+' · '+essay.trainer.name+'.';
    text='Suas redações recentes mostram esta competência como a principal oportunidade de evolução.';
    status='REDAÇÃO · COMPETÊNCIA';time='~5 min';mood='pensativo';
    action=()=>{openPage('redacao');state.essayTrainingCompetency=essay.index;renderEssayIntelligenceV5();setTimeout(()=>$('#essayCompetencyPlan')?.scrollIntoView({behavior:'smooth',block:'center'}),80)};
    actionLabel='Treinar '+essay.trainer.code+' →';
  }else if(rec?.topic){
    title=(rec.topic||rec.subject)+' é seu melhor próximo passo.';
    text=rec.reason||'O NEXO Core encontrou uma boa oportunidade de evolução.';
    status='RECOMENDADO PELO CORE';time='~10 min';mood=Number(rec.priority||0)>=70?'pensativo':'confiante';
    action=()=>{
      const item=topicLesson(rec.topic,rec.subject);
      item?openLibraryTopic(item.subject,item.topic):startCoreRecommendation();
    };
    actionLabel=topicLesson(rec.topic,rec.subject)?'Estudar recomendação →':'Começar recomendação →';
  }else if(firstIncomplete){
    const meta=topicLearningMeta(firstIncomplete.topic,firstIncomplete.subject);
    title='Próximo: '+firstIncomplete.topic+'.';
    text='Prioridade '+Math.round(Number(firstIncomplete.nexo_priority_score||0))+' no Radar · '+Number(firstIncomplete.questions||0)+' questões mapeadas.';
    status=meta.label;time='~12 min';mood='pensativo';
    action=()=>openLibraryTopic(firstIncomplete.subject,firstIncomplete.topic);actionLabel='Começar assunto →';
  }

  const img=nexoBustForMood(mood);
  cards.forEach(card=>{
    const avatar=$('[data-nexo-today-avatar]',card);if(avatar)setNexoImage(avatar,img);
    const titleEl=$('[data-nexo-today-title]',card);if(titleEl)titleEl.textContent=title;
    const textEl=$('[data-nexo-today-text]',card);if(textEl)textEl.textContent=text;
    const statusEl=$('[data-nexo-today-status]',card);if(statusEl)statusEl.textContent=status;
    const timeEl=$('[data-nexo-today-time]',card);if(timeEl)timeEl.textContent=time;
    const btn=$('[data-nexo-today-action]',card);if(btn){btn.textContent=actionLabel;btn.onclick=action}
  });
}

function renderMathTrail(){
  const roots=$$('[data-math-trail]');
  if(!roots.length)return;
  const rows=(state.radarTopics||[]).filter(r=>r.area==='Matemática').sort((a,b)=>Number(b.nexo_priority_score||0)-Number(a.nexo_priority_score||0));
  if(topicMaterials('Raciocínio quantitativo','Matemática').length&&!rows.some(r=>r.topic==='Raciocínio quantitativo')){
    rows.push({area:'Matemática',subject:'Matemática',topic:'Raciocínio quantitativo',questions:236,years_present:17,nexo_priority_score:-1,transversal:true});
  }
  const html=rows.length?rows.map((row,index)=>{
    const meta=topicLearningMeta(row.topic,row.subject);
    const score=meta.attempts?meta.score:meta.progress;
    return '<button class="trail-node '+meta.key+'" data-trail-topic="'+encodeURIComponent(row.topic)+'" data-trail-subject="'+encodeURIComponent(row.subject||'Matemática')+'">'+
      '<span class="trail-index">'+String(index+1).padStart(2,'0')+'</span>'+
      '<div class="trail-copy"><small>'+esc(meta.label)+'</small><b>'+esc(row.topic)+'</b><div class="trail-track"><i style="width:'+clamp(score,0,100)+'%"></i></div></div>'+
      '<div class="trail-score"><b>'+Math.round(score)+'%</b><small>'+(meta.attempts?meta.attempts+' questões · confiança '+meta.confidence+'%':meta.completed+'/'+Math.max(1,meta.materials.length)+' conteúdos')+'</small></div>'+
      '<i class="trail-arrow">→</i></button>';
  }).join(''):'<p class="trail-empty">Carregando sua trilha...</p>';
  roots.forEach(root=>{
    root.innerHTML=html;
    $$('[data-trail-topic]',root).forEach(btn=>btn.onclick=()=>openLibraryTopic(decodeURIComponent(btn.dataset.trailSubject||''),decodeURIComponent(btn.dataset.trailTopic||'')));
  });
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


function showGuidedTraining(item,{source='content',size=5}={}){
  if(!item)return false;
  const lesson=topicLesson(item.topic,item.subject)||item;
  const lessonProgress=getContentProgress('material',lesson.id);
  if(lessonProgress.completed)return false;
  state.pendingGuidedTraining={item,lesson,source,size};
  const modal=$('#guidedTrainingModal');
  if(!modal)return false;
  const meta=topicLearningMeta(item.topic,item.subject);
  $('#guidedTrainingTitle').textContent='Antes de treinar '+(item.topic||item.subject||'este assunto')+'.';
  $('#guidedTrainingText').textContent=meta.attempts
    ? 'Você já tem '+meta.attempts+' resposta(s) neste assunto e '+meta.accuracy+'% de acerto. Uma revisão curta pode deixar a próxima sessão mais eficiente.'
    : 'Você ainda não concluiu a Aula NEXO deste assunto. Estudar primeiro dá contexto para as questões e melhora a revisão dos erros.';
  $('#guidedProfessorImage')&&setNexoImage($('#guidedProfessorImage'),nexoBustForMood(meta.attempts&&meta.accuracy<60?'acolhedor':'pensativo'));
  modal.classList.remove('hidden');
  document.body.style.overflow='hidden';
  return true;
}

function closeGuidedTraining(){
  $('#guidedTrainingModal')?.classList.add('hidden');
  document.body.style.overflow='';
}

async function launchGuidedTrainingNow(){
  const pending=state.pendingGuidedTraining;
  closeGuidedTraining();
  state.pendingGuidedTraining=null;
  if(!pending?.item)return;
  if(pending.source==='radar'){
    const row=(state.radarTopics||[]).find(r=>String(r.topic)===String(pending.item.topic)&&String(r.subject||'')===String(pending.item.subject||''));
    if(row)return startRadarTraining(row,true);
  }
  if(pending.source==='core')return startCoreRecommendation(true);
  await startContentPractice(pending.item,true,pending.size||5);
}

async function openGuidedLesson(){
  const pending=state.pendingGuidedTraining;
  closeGuidedTraining();
  state.pendingGuidedTraining=null;
  if(!pending?.lesson)return;
  openPage('materiais');
  await loadMaterials({silent:true});
  state.materialSubject=pending.lesson.subject||pending.lesson.area||state.materialSubject;
  state.materialOpenTopic=[pending.lesson.subject||pending.lesson.area||'Conteúdo',pending.lesson.topic||'Materiais'].join('||');
  renderMaterials();
  setTimeout(()=>openContentViewer('material',pending.lesson.id),80);
}

$('#closeGuidedTraining')?.addEventListener('click',()=>{closeGuidedTraining();state.pendingGuidedTraining=null});
$('#guidedTrainingModal')?.addEventListener('click',e=>{if(e.target===$('#guidedTrainingModal')){closeGuidedTraining();state.pendingGuidedTraining=null}});
$('#guidedStudyFirst')?.addEventListener('click',openGuidedLesson);
$('#guidedTestNow')?.addEventListener('click',launchGuidedTrainingNow);

async function startContentPractice(item,skipGate=false,size=5){
  if(!item)return;
  if(!skipGate&&showGuidedTraining(item,{source:'content',size}))return;
  const radarTopic=item?.topic||'';
  const fallbackTopic=radarTrainingTopic(item?.subject||'',radarTopic)||radarTopic;
  closeContentViewer();
  openPage('questoes');
  await startStudySession({
    mode:'content',
    area:item.area||'',
    subject:item.subject||'',
    topic:radarTopic,
    radarTopic,
    fallbackTopic,
    sourceContentId:Number(item.id||0)||null,
    difficulty:'',
    visualOnly:false,
    size:Number(size||5)
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
  logProductEvent('content_open',{type,content_id:Number(item.id||0),subject:item.subject||null,topic:item.topic||null},'materiais');
  title.textContent=item.title||'Conteúdo';
  const itemKind=type==='material'?materialKind(item):null;
  const radarMeta=type==='material'?materialRadarMeta(item):null;
  subtitle.textContent=[
    itemKind?.label,
    item.area,
    item.subject,
    item.topic,
    radarMeta?('Prioridade '+radarMeta.score+' · '+radarMeta.questions+' questões'):''
  ].filter(Boolean).join(' · ');
  const practiceBtn=$('#viewerPractice');
  if(practiceBtn)practiceBtn.textContent=type==='material'?'Treinar este assunto →':'Treinar este assunto →';
  modal.classList.remove('hidden');
  document.body.style.overflow='hidden';

  const current=getContentProgress(type,id);
  if(type==='video'){
    if(document.body.classList.contains('data-saver')){
      body.innerHTML='<div class="data-saver-content"><span>ECONOMIA DE DADOS</span><h3>Vídeo pausado por padrão.</h3><p>O modo Economia de dados evita carregar mídia pesada automaticamente.</p><button id="loadDataSaverVideo" class="primary-btn">Carregar vídeo mesmo assim</button></div>';
      $('#loadDataSaverVideo')?.addEventListener('click',()=>{
        document.body.classList.remove('data-saver');
        openContentViewer(type,id);
        setTimeout(()=>document.body.classList.add('data-saver'),250);
      });
      updateViewerFavoriteButton();
      return;
    }
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
    const format=String(item.format||'').toLowerCase();
    const isPdf=format==='pdf'||/\.pdf(?:\?|$)/i.test(item.file_url||'');
    const isHtml=format==='html'||/\.html(?:\?|$)/i.test(item.file_url||'');
    body.innerHTML=isPdf
      ? `<iframe class="content-frame pdf-frame" src="${esc(item.file_url||'')}#toolbar=1&navpanes=0" title="${esc(item.title||'PDF')}"></iframe>`
      : isHtml
        ? `<iframe class="content-frame lesson-frame" src="${esc(item.file_url||'')}" title="${esc(item.title||'Aula NEXO')}"></iframe>`
        : `<div class="material-image-wrap"><img src="${esc(item.file_url||'')}" alt="${esc(item.title||'Material')}"></div>`;
    await saveContentProgress('material',id,{seconds:0,percent:Math.max(10,Number(current.progress_percent||0)),completed:current.completed});
    renderMaterials();
  }

  updateViewerFavoriteButton();
  const complete=$('#viewerComplete');
  if(complete)complete.textContent=current.completed?'✓ Concluído':'Marcar como concluído';
  const checkpoint=$('#viewerCheckpoint');
  if(checkpoint)checkpoint.classList.toggle('hidden',!(type==='material'&&materialKind(item).key==='lesson'));
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
  renderNexoToday();
  renderMathTrail();
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
window.addEventListener('message',e=>{
  if(e.origin!==location.origin||e.data?.type!=='nexo-content-train')return;
  const v=state.activeViewer;
  if(v?.item)startContentPractice(v.item);
});
$('#viewerSpeed')?.addEventListener('change',e=>{const p=$('#contentVideoPlayer');if(p)p.playbackRate=Number(e.target.value||1)});
$('#viewerCheckpoint')?.addEventListener('click',()=>{
  const v=state.activeViewer;
  if(v?.type==='material'&&v.item)startContentPractice(v.item,true,2);
});
$('#viewerAskNexo')?.addEventListener('click',()=>{
  const v=state.activeViewer;if(!v?.item)return;
  let selected='';
  try{
    const frame=$('#contentViewerBody iframe');
    selected=String(frame?.contentWindow?.getSelection?.()?.toString?.()||'').trim().slice(0,900);
  }catch(_){}
  const topic=v.item.topic||v.item.subject||v.item.title||'este conteúdo';
  const prompt=selected
    ? 'Estou estudando '+topic+'. Explique este trecho em linguagem simples, dê um exemplo no estilo ENEM e termine com uma pergunta curta para eu conferir se entendi. Trecho: “'+selected+'”'
    : 'Estou estudando '+topic+'. Me explique o ponto central em linguagem simples, dê um exemplo no estilo ENEM, um erro comum e uma pergunta curta de checagem. Não entregue respostas de uma questão que eu ainda não respondi.';
  openProfessorNexo(prompt);
});

async function loadVideos({silent=false}={}) {
  const grid=$('#videoGrid');
  if(grid&&!state.videos.length){
    grid.innerHTML='<article class="panel"><p style="color:var(--muted)">Carregando videoaulas...</p></article>';
  }

  let result=await client.from('videos').select('*').eq('is_published',true).order('created_at',{ascending:false});
  if(result.error){
    // Uma falha momentânea de rede não deve fazer a biblioteca "sumir".
    await sleep(450);
    result=await client.from('videos').select('*').eq('is_published',true).order('created_at',{ascending:false});
  }

  const {data,error}=result;
  if(error){
    console.error('load videos',error);
    logClientError('videos',error,'video_load');
    if(grid)grid.innerHTML='<article class="panel"><p style="color:var(--muted)">Não consegui carregar as videoaulas agora. Tente novamente em instantes.</p></article>';
    if(!silent)toast('Não foi possível carregar as videoaulas.','error');
    return state.videos;
  }

  state.videos=data||[];
  await loadContentState('video');
  renderVideos();
  return state.videos;
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

async function loadMaterials({silent=false}={}){
  const grid=$('#materialGrid');
  if(grid&&!state.materials.length){
    grid.innerHTML='<article class="panel"><p style="color:var(--muted)">Carregando materiais...</p></article>';
  }
  const {data,error}=await client.from('materials').select('*').eq('is_published',true).order('created_at',{ascending:false});
  if(error){
    console.error('load materials',error);
    logClientError('materials',error,'material_load');
    if(grid)grid.innerHTML='<article class="panel"><p style="color:var(--muted)">Não consegui carregar os materiais agora.</p></article>';
    if(!silent)toast('Não foi possível carregar os materiais.','error');
    return state.materials;
  }
  state.materials=data||[];
  await loadContentState('material');
  if(!state.radarLoaded)await loadEnemRadar({silent:true});
  renderMaterials();
  renderNexoToday();
  renderMathTrail();
  return state.materials;
}

function materialKind(item){
  const title=String(item?.title||'');
  if(/^Aula NEXO/i.test(title))return {key:'lesson',label:'AULA NEXO',cta:'Estudar aula →',icon:'AULA',order:1};
  if(/Resumo\/PDF|Resumo NEXO|Resumo/i.test(title))return {key:'summary',label:'RESUMO',cta:'Revisar resumo →',icon:'RESUMO',order:2};
  if(/^Macetes NEXO/i.test(title))return {key:'tips',label:'MACETES',cta:'Ver macetes →',icon:'MACETES',order:3};
  return {key:'material',label:'MATERIAL',cta:'Abrir material →',icon:String(item?.format||'PDF').toUpperCase(),order:9};
}

function materialRadarMeta(item){
  const row=(state.radarTopics||[]).find(r=>
    String(r.topic||'').toLocaleLowerCase('pt-BR')===String(item?.topic||'').toLocaleLowerCase('pt-BR') &&
    (!item?.subject||String(r.subject||'').toLocaleLowerCase('pt-BR')===String(item.subject).toLocaleLowerCase('pt-BR'))
  );
  if(row){
    return {
      questions:Number(row.questions||0),
      years:Number(row.years_present||0),
      score:Math.round(Number(row.nexo_priority_score||0)),
      transversal:false
    };
  }
  if(String(item?.topic||'').toLocaleLowerCase('pt-BR')==='raciocínio quantitativo'){
    return {questions:236,years:17,score:null,transversal:true};
  }
  return null;
}

function materialSequence(item){
  const m=String(item?.title||'').match(/#(\d+)/);
  return m?String(m[1]).padStart(2,'0'):'NEXO';
}

function renderMaterials(){
  const search=($('#materialSearch')?.value||'').toLocaleLowerCase('pt-BR').trim();
  const favoritesOnly=$('#materialFavoritesOnly')?.classList.contains('active');
  const statusFilter=$('#materialStatusFilter')?.value||'';
  const typeFilter=$('#materialTypeFilter')?.value||'';
  const referenceView=document.body.dataset.nrxMaterialsView||'study';
  const priorityFilter=$('#materialPriorityFilter')?.value||'';
  const quickFive=Boolean(state.libraryQuickFive);
  const all=state.materials||[];
  const subjects=[...new Set(all.map(m=>m.subject||m.area).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  if(!state.materialSubject||!subjects.includes(state.materialSubject))state.materialSubject=subjects[0]||'';

  const subjectNav=$('#materialSubjectNav');
  if(subjectNav){
    subjectNav.innerHTML=subjects.map(subject=>{
      const topicCount=new Set(all.filter(m=>(m.subject||m.area)===subject).map(m=>m.topic).filter(Boolean)).size;
      return '<button class="material-subject-chip '+(state.materialSubject===subject?'active':'')+'" data-material-subject="'+esc(subject)+'"><span>'+esc(subject)+'</span><small>'+topicCount+' assunto'+(topicCount===1?'':'s')+'</small></button>';
    }).join('');
    $$('[data-material-subject]',subjectNav).forEach(btn=>btn.onclick=()=>{
      state.materialSubject=btn.dataset.materialSubject||'';
      state.materialOpenTopic='';
      renderMaterials();
    });
  }

  const subjectItems=all
    .filter(m=>(m.subject||m.area)===state.materialSubject)
    .filter(m=>(!search||[m.title,m.area,m.subject,m.topic,m.description].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(search)))
    .filter(m=>!favoritesOnly||favoriteContent('material',m.id))
    .filter(m=>!statusFilter||topicLearningMeta(m.topic,m.subject).key===statusFilter)
    .filter(m=>!typeFilter||materialKind(m).key===typeFilter)
    .filter(m=>referenceView!=='resumos'||['summary','tips'].includes(materialKind(m).key))
    .filter(m=>{
      if(!priorityFilter)return true;
      const radar=materialRadarMeta(m);
      if(priorityFilter==='transversal')return Boolean(radar?.transversal);
      return Number(radar?.score||0)>=60;
    })
    .filter(m=>!quickFive||['summary','tips'].includes(materialKind(m).key));

  const grid=$('#materialGrid');
  if(!grid)return;
  const meta=$('#materialLibraryMeta');
  if(meta){
    const topicNames=[...new Set(subjectItems.map(m=>m.topic).filter(Boolean))];
    const topics=topicNames.length;
    const learning=topicNames.map(topic=>topicLearningMeta(topic,state.materialSubject));
    const subjectScore=learning.length?Math.round(learning.reduce((sum,x)=>sum+Number(x.score||x.progress||0),0)/learning.length):0;
    const mastered=learning.filter(x=>x.key==='mastered').length;
    const continueTopic=topicNames.find(topic=>topicLearningMeta(topic,state.materialSubject).key!=='mastered')||topicNames[0]||'';
    meta.innerHTML='<div class="library-course-meta"><div><b>'+esc(state.materialSubject||'Biblioteca')+'</b><span>'+mastered+'/'+topics+' assuntos dominados · '+subjectItems.length+' materiais</span></div><div class="library-course-progress"><i style="width:'+subjectScore+'%"></i></div><strong>'+subjectScore+'%</strong><button data-library-continue="'+encodeURIComponent(continueTopic)+'">Continuar matéria →</button></div>';
    $('[data-library-continue]',meta)?.addEventListener('click',()=>openLibraryTopic(state.materialSubject,decodeURIComponent($('[data-library-continue]',meta).dataset.libraryContinue||'')));
  }

  if(!subjectItems.length){
    grid.innerHTML='<article class="panel content-empty"><b>Nenhum conteúdo encontrado em '+esc(state.materialSubject||'esta matéria')+'.</b><p>Tente outro termo ou retire o filtro de favoritos.</p></article>';
    return;
  }

  const groups=new Map();
  subjectItems.forEach(item=>{
    const key=[item.subject||item.area||'Conteúdo',item.topic||'Materiais'].join('||');
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(item);
  });

  const orderedGroups=[...groups.entries()].sort((a,b)=>{
    const ra=materialRadarMeta(a[1][0]),rb=materialRadarMeta(b[1][0]);
    return Number(rb?.score||0)-Number(ra?.score||0) || String(a[1][0].topic||'').localeCompare(String(b[1][0].topic||''),'pt-BR');
  });
  if(state.materialOpenTopic!=='__closed__'&&(!state.materialOpenTopic||!orderedGroups.some(([k])=>k===state.materialOpenTopic)))state.materialOpenTopic=orderedGroups[0]?.[0]||'';

  grid.innerHTML=orderedGroups.map(([key,items],index)=>{
    items.sort((a,b)=>materialKind(a).order-materialKind(b).order||Number(a.id)-Number(b.id));
    const first=items[0],radar=materialRadarMeta(first),expanded=state.materialOpenTopic===key;
    const learning=topicLearningMeta(first.topic,first.subject);
    const completed=items.filter(m=>getContentProgress('material',m.id).completed).length;
    const avg=items.length?Math.round(items.reduce((sum,m)=>sum+(getContentProgress('material',m.id).completed?100:Number(getContentProgress('material',m.id).progress_percent||0)),0)/items.length):0;
    const encoded=encodeURIComponent(key);
    const seq=materialSequence(first);
    const radarText='<span class="content-learning-chip '+learning.key+'">'+esc(learning.label)+'</span>'+(radar?(radar.transversal?'<span class="content-radar-chip">FUNDAMENTO TRANSVERSAL</span><span>'+radar.questions+' itens no Radar bruto</span><span>'+radar.years+'/17 edições</span>':'<span class="content-radar-chip">🔥 Prioridade '+radar.score+'</span><span>'+radar.questions+' questões</span><span>'+radar.years+'/17 edições</span>'):'');
    const resources=items.map(m=>{
      const kind=materialKind(m),fav=favoriteContent('material',m.id);
      const p=getContentProgress('material',m.id);
      return `<article class="content-resource-card ${kind.key}">
        <button class="content-fav ${fav?'active':''}" data-content-fav="${m.id}" data-content-type="material" aria-label="Favoritar">${fav?'★':'☆'}</button>
        <button class="content-resource-open" data-content-open="${m.id}" data-content-type="material">
          <div class="content-resource-icon ${kind.key}"><small>#${materialSequence(m)}</small><b>${kind.icon}</b><i></i></div>
          <div class="content-resource-copy">
            <span class="material-type-badge ${kind.key}">${kind.label}</span>
            <strong>${esc(m.title)}</strong>
            <small>${esc(m.description||m.topic||'Conteúdo NEXO')}</small>
            ${contentCardProgress('material',m.id)}
            <em>${p.completed?'Revisar novamente →':kind.cta}</em>
          </div>
        </button>
      </article>`;
    }).join('');

    return `<section class="content-topic-group ${expanded?'open':''}">
      <button class="content-topic-toggle" data-material-topic-toggle="${encoded}" aria-expanded="${expanded?'true':'false'}">
        <div class="content-topic-rank">${String(index+1).padStart(2,'0')}</div>
        <div class="content-topic-name"><span>${esc(String(first.subject||first.area||'NEXO').toUpperCase())} #${seq}</span><h3>${esc(first.topic||first.subject||'Conteúdo')}</h3><div class="content-topic-meta">${radarText}</div></div>
        <div class="content-topic-progress"><b>${avg}%</b><small>${completed}/${items.length} conteúdos</small><span><i style="width:${avg}%"></i></span></div>
        <div class="content-topic-chevron">${expanded?'−':'+'}</div>
      </button>
      <div class="content-topic-detail ${expanded?'':'hidden'}">
        <div class="content-flow"><span>Aula</span><i>→</i><span>Resumo</span><i>→</i><span>Macetes</span><i>→</i><span>Treino</span></div>
        <div class="content-topic-cards">${resources}</div>
        <button class="content-topic-train" data-material-train="${encoded}"><span>✓</span><div><b>Treinar este assunto</b><small>5 questões ligadas a ${esc(first.topic||first.subject||'este conteúdo')}</small></div><i>→</i></button>
      </div>
    </section>`;
  }).join('');

  wireContentCards();
  $$('[data-material-topic-toggle]',grid).forEach(btn=>btn.onclick=()=>{
    const key=decodeURIComponent(btn.dataset.materialTopicToggle||'');
    state.materialOpenTopic=state.materialOpenTopic===key?'__closed__':key;
    renderMaterials();
  });
  $$('[data-material-train]',grid).forEach(btn=>btn.onclick=()=>{
    const key=decodeURIComponent(btn.dataset.materialTrain||'');
    const items=groups.get(key)||[];
    if(items[0])startContentPractice(items[0]);
  });
}
$('#materialSearch')?.addEventListener('input',renderMaterials);
$('#materialFavoritesOnly')?.addEventListener('click',e=>{e.currentTarget.classList.toggle('active');renderMaterials()});
$('#materialStatusFilter')?.addEventListener('change',renderMaterials);
$('#materialTypeFilter')?.addEventListener('change',renderMaterials);
$('#materialPriorityFilter')?.addEventListener('change',renderMaterials);
$('#materialQuickFive')?.addEventListener('click',e=>{
  state.libraryQuickFive=!state.libraryQuickFive;
  e.currentTarget.classList.toggle('active',state.libraryQuickFive);
  e.currentTarget.textContent=state.libraryQuickFive?'✓ Modo 5 min':'⚡ Tenho 5 min';
  renderMaterials();
});
$('#materialClearFilters')?.addEventListener('click',()=>{
  if($('#materialSearch'))$('#materialSearch').value='';
  if($('#materialStatusFilter'))$('#materialStatusFilter').value='';
  if($('#materialTypeFilter'))$('#materialTypeFilter').value='';
  if($('#materialPriorityFilter'))$('#materialPriorityFilter').value='';
  state.libraryQuickFive=false;
  $('#materialQuickFive')?.classList.remove('active');
  if($('#materialQuickFive'))$('#materialQuickFive').textContent='⚡ Tenho 5 min';
  $('#materialFavoritesOnly')?.classList.remove('active');
  renderMaterials();
});

function renderBank(){
  const search=$('#bankSearch').value.toLowerCase().trim(),area=$('#bankArea').value;
  const list=state.questionMeta.filter(q=>(!area||q.area===area)&&(!search||[q.subject,q.topic,q.source_year,q.source_question_number].join(' ').toLowerCase().includes(search))).slice(0,150);
  $('#bankList').innerHTML=list.map(q=>`<button class="bank-row" data-bank="${q.id}"><b>#${q.source_question_number||q.id}</b><span><b>${esc(q.subject)}</b><small>${esc(q.topic)}${q.media_type?' · ◉ visual':''}</small></span><small>${esc(q.area)}</small><small>ENEM ${esc(q.source_year||'')}</small></button>`).join('');
  $$('[data-bank]').forEach(b=>b.onclick=()=>openSingleQuestion(Number(b.dataset.bank)));
}
$('#bankSearch').addEventListener('input',renderBank);
$('#bankArea').addEventListener('change',renderBank);
$('#globalSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){openPage('banco');$('#bankSearch').value=e.target.value;renderBank();setMobileSearchOpen(false,{focus:false})}});
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
  $$('[data-journey-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.journeyTab===tab));
  $$('[data-journey-panel]').forEach(panel=>panel.classList.toggle('active',panel.dataset.journeyPanel===tab));
  if(tab==='avatar')renderAvatarBuilder();
  if(tab==='groups')loadStudyGroups({silent:true});
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
let storeFilter='all';
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
function nexoCollectionLabel(code){
  return ({
    core:'NEXO Core',
    focus:'Focus',
    academy:'Academy',
    aurora:'Aurora',
    royal:'Royal',
    starter:'Inicial'
  })[String(code||'core')]||'NEXO Core';
}
function wardrobeItemState(item,owned,level,plus,ultra){
  const mode=String(item?.grant_mode||'store');
  const planAllowed=!item?.plus_only||plus||ultra;
  const plusLocked=!planAllowed;
  const levelLocked=!ultra&&level<Number(item?.unlock_level||1);
  const autoEligible=Boolean(planAllowed&&!levelLocked&&(mode==='starter'||mode==='level'));
  const permanentOwned=Boolean(owned?.has?.(item?.item_code));
  const has=Boolean(ultra||(planAllowed&&(permanentOwned||autoEligible)));
  const available=Boolean(mode==='store'&&!has&&!plusLocked&&!levelLocked);
  return {has,plusLocked,levelLocked,available,autoEligible,permanentOwned,mode};
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
  const catalog=(j.catalog||[]).filter(item=>avatarItemCompatibleWithBase(item,base));
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
  const el=$('#journeyStore');
  if(!el)return;

  const owned=journeyInventorySet();
  const level=Number(j.profile?.level||1);
  const coins=Number(j.profile?.coins||0);
  const plus=isNexoPlus(),ultra=isNexoUltra();
  const baseAvatar=normalizedAvatar(j.profile?.avatar);
  const base=baseAvatar.base||'neutral';

  if($('#storeCoinBalance'))$('#storeCoinBalance').textContent=coins.toLocaleString('pt-BR')+' N¢';

  // The Store sells only explicit store items.
  // Starter and level rewards belong to progression / wardrobe, not checkout.
  const catalog=(j.catalog||[])
    .filter(item=>String(item.grant_mode||'store')==='store')
    .filter(item=>avatarItemCompatibleWithBase(item,base));

  const categories=[...new Set(catalog.map(item=>item.category).filter(Boolean))]
    .sort((a,b)=>wardrobeCategoryLabel(a).localeCompare(wardrobeCategoryLabel(b),'pt-BR'));

  const categorySelect=$('#storeCategory');
  if(categorySelect){
    const current=categorySelect.value||'all';
    categorySelect.innerHTML='<option value="all">Todas as categorias</option>'+
      categories.map(category=>'<option value="'+esc(category)+'">'+esc(wardrobeCategoryLabel(category))+'</option>').join('');
    categorySelect.value=categories.includes(current)?current:'all';
  }

  const collections=[...new Set(catalog.map(item=>item.collection_code||'core'))]
    .sort((a,b)=>nexoCollectionLabel(a).localeCompare(nexoCollectionLabel(b),'pt-BR'));
  const collectionSelect=$('#storeCollection');
  if(collectionSelect){
    const current=collectionSelect.value||'all';
    collectionSelect.innerHTML='<option value="all">Todas as coleções</option>'+
      collections.map(code=>'<option value="'+esc(code)+'">'+esc(nexoCollectionLabel(code))+'</option>').join('');
    collectionSelect.value=collections.includes(current)?current:'all';
  }

  const stateFor=item=>wardrobeItemState(item,owned,level,plus,ultra);
  const stats={owned:0,available:0,plus:0,locked:0};
  catalog.forEach(item=>{
    const s=stateFor(item);
    if(s.has)stats.owned++;
    else if(s.plusLocked)stats.plus++;
    else if(s.levelLocked)stats.locked++;
    else stats.available++;
  });

  if($('#storeSummary')){
    $('#storeSummary').innerHTML=
      '<span><b>'+stats.available+'</b><small>à venda</small></span>'+
      '<span><b>'+stats.owned+'</b><small>adquiridos</small></span>'+
      '<span><b>'+stats.plus+'</b><small>Plus</small></span>'+
      '<span><b>'+stats.locked+'</b><small>por nível</small></span>';
  }

  if($('#storeNotice')){
    $('#storeNotice').innerHTML=ultra
      ? '<b>Ultra ativo:</b> cosméticos compatíveis ficam incluídos enquanto o plano estiver ativo.'
      : 'Itens iniciais e recompensas por nível são liberados automaticamente na Jornada.';
  }

  const selectedCategory=$('#storeCategory')?.value||'all';
  const selectedCollection=$('#storeCollection')?.value||'all';
  const filtered=catalog.filter(item=>{
    const s=stateFor(item);
    if(selectedCategory!=='all'&&item.category!==selectedCategory)return false;
    if(selectedCollection!=='all'&&(item.collection_code||'core')!==selectedCollection)return false;
    if(storeFilter==='owned')return s.has;
    if(storeFilter==='plus')return Boolean(item.plus_only);
    if(storeFilter==='affordable')return s.available&&coins>=Number(item.price||0);
    return true;
  }).sort((a,b)=>{
    const sa=stateFor(a),sb=stateFor(b);
    const rank=s=>s.available?0:s.plusLocked?1:s.levelLocked?2:3;
    return rank(sa)-rank(sb)
      ||Number(a.unlock_level||1)-Number(b.unlock_level||1)
      ||Number(a.price||0)-Number(b.price||0)
      ||String(a.name||'').localeCompare(String(b.name||''),'pt-BR');
  });

  el.innerHTML=filtered.length?filtered.map(item=>{
    const s=stateFor(item);
    const price=Number(item.price||0);
    const affordable=coins>=price;
    const category=wardrobeCategoryLabel(item.category);
    const collection=nexoCollectionLabel(item.collection_code||'core');
    const status=ultra?'INCLUÍDO NO ULTRA'
      :s.plusLocked?'EXCLUSIVO PLUS'
      :s.permanentOwned?'ADQUIRIDO'
      :s.levelLocked?'LIBERA NO NÍVEL '+Number(item.unlock_level||1)
      :price===0?'RESGATE GRÁTIS'
      :price.toLocaleString('pt-BR')+' N¢';

    let action='';
    if(ultra)action='<button disabled>Incluído</button>';
    else if(s.plusLocked)action='<button data-open-plus>Ver Plus</button>';
    else if(s.permanentOwned)action='<button disabled>Adquirido</button>';
    else if(s.levelLocked)action='<button disabled>Nível '+Number(item.unlock_level||1)+'</button>';
    else if(!affordable)action='<button disabled>Faltam '+Math.max(0,price-coins).toLocaleString('pt-BR')+' N¢</button>';
    else action='<button data-buy-item="'+esc(item.item_code)+'">'+(price===0?'Resgatar':'Comprar · '+price.toLocaleString('pt-BR')+' N¢')+'</button>';

    return '<article class="journey-store-item rarity-'+esc(item.rarity)+' '+(s.has?'owned ':'')+(s.plusLocked?'plus-locked ':'')+(s.levelLocked?'level-locked ':'')+'">'+
      '<div class="store-item-visual"><div class="store-avatar-preview" data-store-preview="'+esc(item.item_code)+'"></div><i>'+esc(category)+'</i></div>'+
      '<div class="store-item-copy"><small>'+(item.plus_only?'NEXO PLUS · ':'')+esc(collection)+' · '+esc(String(item.rarity||'comum').toUpperCase())+'</small><h4>'+esc(item.name)+'</h4><p>'+esc(item.description||'Cosmético NEXO')+'</p></div>'+
      '<div class="store-item-bottom"><span>'+esc(status)+'</span>'+action+'</div>'+
    '</article>';
  }).join(''):'<div class="journey-empty">Nenhum item encontrado nesse filtro.</div>';

  $$('[data-store-preview]',el).forEach(node=>{
    const item=avatarCatalogItem(node.dataset.storePreview);
    if(item)renderStudentAvatar(node,wardrobePreviewAvatar(item,baseAvatar));
  });

  $$('[data-open-plus]',el).forEach(btn=>btn.onclick=()=>openNexoPlans('Esse cosmético é exclusivo do NEXO Plus e também está incluído no Ultra.'));

  $$('[data-buy-item]',el).forEach(btn=>btn.onclick=async()=>{
    const code=btn.dataset.buyItem;
    const item=avatarCatalogItem(code);
    btn.disabled=true;
    btn.textContent='Processando...';

    try{
      const {error}=await client.rpc('buy_nexo_item',{p_item_code:code});
      if(error)throw error;

      await loadNexoJourney({silent:true});
      toast((Number(item?.price||0)>0?'Compra concluída: ':'Item resgatado: ')+(item?.name||'cosmético')+'.');
      setJourneyTab('store');
    }catch(err){
      console.error('buy Nexo item',err);
      const msg=String(err?.message||err||'');
      if(msg.includes('nexo_plus_required'))openNexoPlans('Esse item exige NEXO Plus.');
      else if(msg.includes('nexo_insufficient_coins'))toast('Você ainda não tem N-Coins suficientes.','error');
      else if(msg.includes('nexo_level_required'))toast('Seu nível ainda não libera esse item.','error');
      else if(msg.includes('nexo_avatar_base_incompatible'))toast('Esse item não é compatível com a base atual do personagem.','error');
      else if(msg.includes('nexo_item_not_for_sale'))toast('Esse item é desbloqueado pela Jornada e não pode ser comprado.','info');
      else toast('Não foi possível concluir essa compra agora.','error');

      renderJourneyStore();
    }
  });
}


function achievementSeenKey(){
  return 'nexo-seen-achievements-'+String(state.user?.id||'guest');
}
function achievementSeenSet(){
  try{return new Set(JSON.parse(localStorage.getItem(achievementSeenKey())||'[]'))}catch(_){return new Set()}
}
function showAchievementCelebration(a){
  const modal=$('#achievementCelebration');if(!modal||!a)return;
  $('#achievementCelebrationName').textContent=a.name||'Nova conquista';
  $('#achievementCelebrationText').textContent=a.description||'Seu progresso virou um novo marco.';
  $('#achievementCelebrationReward').textContent='+'+Number(a.reward_xp||0)+' XP · +'+Number(a.reward_coins||0)+' N-Coins';
  modal.classList.remove('hidden');
  nexoHaptic([30,45,30,45,55]);
}
function celebrateUnlockedAchievements(list=[]){
  if(!state.user?.id)return;
  const seen=achievementSeenSet();
  const unlocked=(list||[]).filter(a=>a.unlocked&&a.code);
  const fresh=unlocked.filter(a=>!seen.has(a.code));
  // First load establishes baseline; future unlocks celebrate.
  const baselineKey=achievementSeenKey()+'-ready';
  if(!localStorage.getItem(baselineKey)){
    unlocked.forEach(a=>seen.add(a.code));
    localStorage.setItem(achievementSeenKey(),JSON.stringify([...seen]));
    localStorage.setItem(baselineKey,'1');
    return;
  }
  if(!fresh.length)return;
  fresh.forEach(a=>seen.add(a.code));
  localStorage.setItem(achievementSeenKey(),JSON.stringify([...seen]));
  state.achievementQueue=[...(state.achievementQueue||[]),...fresh];
  if(!$('#achievementCelebration')?.classList.contains('hidden'))return;
  showAchievementCelebration(state.achievementQueue.shift());
}
function closeAchievementCelebration(){
  $('#achievementCelebration')?.classList.add('hidden');
  if(state.achievementQueue?.length)setTimeout(()=>showAchievementCelebration(state.achievementQueue.shift()),180);
}
$('#closeAchievementCelebration')?.addEventListener('click',closeAchievementCelebration);
$('#achievementCelebration')?.addEventListener('click',e=>{if(e.target===$('#achievementCelebration'))closeAchievementCelebration()});
$('#openAchievementJourney')?.addEventListener('click',()=>{closeAchievementCelebration();openPage('ranking');setJourneyTab('achievements')});

function renderJourneyAchievements(){
  const list=state.journey?.achievements||[];
  celebrateUnlockedAchievements(list);
  const el=$('#journeyAchievements');if(!el)return;
  el.innerHTML=list.map(a=>{
    const hasLook=NEXO_AVATAR_LOOKS.some(look=>look.achievement_code===a.code);
    return `<article class="journey-achievement ${a.unlocked?'unlocked':'locked'} rarity-${esc(a.rarity)}">
      <span>${esc(a.icon||'✦')}</span>
      <div><small>${a.unlocked?'CONQUISTADA':esc(a.rarity).toUpperCase()}</small><h4>${esc(a.name)}</h4><p>${esc(a.description)}</p><em>+${Number(a.reward_xp||0)} XP · +${Number(a.reward_coins||0)} N-Coins${hasLook?' · Look NEXO':''}</em>${hasLook&&a.unlocked?'<button data-achievement-look="'+esc(a.code)+'">Ver Look</button>':''}</div>
    </article>`;
  }).join('');
  $$('[data-achievement-look]',el).forEach(btn=>btn.onclick=()=>{
    setJourneyTab('avatar');
    avatarEditorCategory='looks';
    renderAvatarBuilder();
    setTimeout(()=>{
      const look=NEXO_AVATAR_LOOKS.find(x=>x.achievement_code===btn.dataset.achievementLook);
      const card=look?document.querySelector('[data-avatar-look-card="'+look.code+'"]'):null;
      card?.scrollIntoView?.({behavior:'smooth',block:'center'});
    },80);
  });
}

const NEXO_AVATAR_LOOKS=Object.freeze([
  {
    code:'original',
    name:'NEXO Original',
    tag:'ESSENCIAL',
    description:'Visual limpo para começar: azul, preto e assinatura NEXO.',
    avatar:{hair:'wave',hair_color:'blue',outfit:'blue',accessory:'glasses',frame:'basic',background:'grid',aura:'none'}
  },
  {
    code:'first_step',
    name:'Primeiro Passo',
    tag:'CONQUISTA',
    achievement_code:'first_answer',
    description:'Seu primeiro marco no NEXO. Liberado ao responder a primeira questão.',
    avatar:{hair:'wave',hair_color:'blue',outfit:'cyan',accessory:'glasses',frame:'basic',background:'grid',aura:'none'}
  },
  {
    code:'autonomy',
    name:'Autonomia',
    tag:'CONQUISTA',
    achievement_code:'autonomy_10',
    description:'Para quem resolve sem depender de pistas.',
    avatar:{hair:'short',hair_color:'ink',outfit:'black',accessory:'headphones',frame:'basic',background:'study',aura:'none'}
  },
  {
    code:'pace',
    name:'Ritmo de Prova',
    tag:'CONQUISTA',
    achievement_code:'speed_10',
    description:'Visual de velocidade para quem acerta sob pressão de tempo.',
    avatar:{hair:'short',hair_color:'blue',outfit:'focus',accessory:'headphones',frame:'neon',background:'grid',aura:'blue'}
  },
  {
    code:'week_nexo',
    name:'Semana NEXO',
    tag:'CONQUISTA',
    achievement_code:'streak_7',
    description:'Exclusivo para quem mantém sete dias seguidos de estudo.',
    avatar:{hair:'wave',hair_color:'purple',outfit:'academy',accessory:'tiara',frame:'level',background:'library',aura:'none'}
  },
  {
    code:'centurion',
    name:'Centurião',
    tag:'CONQUISTA',
    achievement_code:'hundred_correct',
    description:'Marca visual dos 100 acertos acumulados.',
    avatar:{hair:'wave',hair_color:'blue',outfit:'cyan',accessory:'headphones',frame:'neon',background:'midnight',aura:'none'}
  },
  {
    code:'veteran',
    name:'Veterano NEXO',
    tag:'CONQUISTA',
    achievement_code:'level_10',
    description:'Look reservado a quem alcançou o nível 10 da Jornada.',
    avatar:{hair:'wave',hair_color:'purple',outfit:'focus',accessory:'tiara',frame:'level',background:'midnight',aura:'blue'}
  },
  {
    code:'focus',
    name:'Focus Mode',
    tag:'FOCO',
    description:'Setup de estudo intenso com Jaqueta Focus, headset e aura azul.',
    avatar:{hair:'short',hair_color:'ink',outfit:'focus',accessory:'headphones',frame:'neon',background:'study',aura:'blue'}
  },
  {
    code:'academy',
    name:'NEXO Academy',
    tag:'JORNADA',
    description:'Visual acadêmico para quem está construindo consistência.',
    avatar:{hair:'wave',hair_color:'brown',outfit:'academy',accessory:'glasses',frame:'level',background:'library',aura:'none'}
  },
  {
    code:'aurora',
    name:'Aurora Plus',
    tag:'PLUS',
    description:'Roxo, brilho e energia NEXO em um conjunto premium.',
    avatar:{hair:'hologram',hair_color:'purple',outfit:'aurora',accessory:'tiara',frame:'cosmic',background:'aurora',aura:'purple'}
  },
  {
    code:'royal',
    name:'Royal NEXO',
    tag:'PLUS',
    description:'Conjunto de alto nível com Royal, coroa e aura dourada.',
    avatar:{hair:'wave',hair_color:'blonde',outfit:'royal',accessory:'crown',frame:'diamond',background:'midnight',aura:'gold'}
  }
]);

let avatarEditorCategory='looks';

function avatarEditorGroupForField(field){
  return ['base','skin','hair','hair_color','outfit','accessory','frame','background','aura'].includes(field)
    ? field
    : 'base';
}

function avatarEditorIconForField(field){
  return ({
    base:'◉',skin:'●',hair:'✦',hair_color:'●',
    outfit:'▰',accessory:'◇',frame:'▣',background:'▦',aura:'✧'
  })[field]||'•';
}

function avatarEditorLabel(field){
  return ({
    looks:'Looks NEXO',
    base:'Base',skin:'Tom de pele',hair:'Cabelo',hair_color:'Cor do cabelo',
    outfit:'Roupa',accessory:'Acessório',frame:'Moldura',background:'Ambiente',aura:'Aura'
  })[field]||'Personalização';
}

function avatarOptionCleanLabel(btn){
  return String(btn?.dataset?.baseLabel||btn?.getAttribute?.('aria-label')||btn?.textContent||'')
    .replace(/\s*🔒$/,'')
    .replace(/\s*PLUS$/i,'')
    .replace(/\s+/g,' ')
    .trim();
}

function avatarPreviewForOption(btn,draft){
  const field=btn.dataset.avatarField;
  const value=btn.dataset.avatarValue;
  let preview=normalizedAvatar(draft);

  if(field==='base'){
    const starter=starterAvatarForBase(value);
    preview={
      ...preview,
      base:starter.base,
      hair:starter.hair,
      outfit:starter.outfit,
      accessory:'none'
    };
  }else{
    preview[field]=value;
  }

  return normalizeAvatarDraftForBase(preview);
}

function avatarOptionStateLabel(btn){
  if(btn.classList.contains('active'))return 'USANDO';
  if(btn.dataset.locked!=='true')return 'DISPONÍVEL';
  if(btn.dataset.lockReason==='plus')return 'PLUS';
  if(btn.dataset.lockReason==='level')return 'NÍVEL '+Number(btn.dataset.unlockLevel||1);
  return 'LOJA';
}

function renderAvatarVisualCard(btn,draft){
  if(!btn||btn.hidden)return;

  const field=btn.dataset.avatarField;
  const label=avatarOptionCleanLabel(btn);
  btn.dataset.baseLabel=label;

  if(btn.classList.contains('tone-swatch')){
    const stateLabel=avatarOptionStateLabel(btn);
    btn.innerHTML='<i></i><span class="avatar-option-copy"><b>'+esc(label||btn.getAttribute('aria-label')||'Tom')+'</b><small>'+esc(stateLabel)+'</small></span>';
    return;
  }

  const preview=avatarPreviewForOption(btn,draft);
  const stateLabel=avatarOptionStateLabel(btn);
  btn.innerHTML='<span class="avatar-option-preview"></span><span class="avatar-option-copy"><b>'+esc(label||btn.dataset.avatarValue||'Opção')+'</b><small>'+esc(stateLabel)+'</small></span>';
  const previewTarget=btn.querySelector('.avatar-option-preview');
  renderStudentAvatar(previewTarget,preview);
  btn.dataset.avatarIcon=avatarEditorIconForField(field);
}

function journeyAchievement(code){
  return (state.journey?.achievements||[]).find(a=>a.code===code)||null;
}

function avatarLookAchievementLabel(look){
  const achievement=look?.achievement_code?journeyAchievement(look.achievement_code):null;
  return achievement?.name||look?.achievement_code||'Conquista';
}

function avatarLookStatus(look){
  if(look?.achievement_code){
    const achievement=journeyAchievement(look.achievement_code);
    if(!achievement?.unlocked){
      return {
        state:'achievement',
        label:'CONQUISTA',
        achievement_code:look.achievement_code,
        achievement_name:achievement?.name||avatarLookAchievementLabel(look)
      };
    }
  }

  const issues=[];
  let levelRequired=0;
  let hasPlus=false;
  let hasStore=false;
  let incompatible=false;

  for(const [field,value] of Object.entries(look.avatar||{})){
    const btn=avatarOptionButton(field,value);
    if(!btn){
      issues.push(field+':missing');
      continue;
    }
    if(btn.hidden){
      incompatible=true;
      continue;
    }
    if(btn.dataset.locked==='true'){
      const reason=btn.dataset.lockReason||'store';
      if(reason==='plus')hasPlus=true;
      else if(reason==='level')levelRequired=Math.max(levelRequired,Number(btn.dataset.unlockLevel||1));
      else hasStore=true;
    }
  }

  const draft=normalizedAvatar(state.avatarDraft||state.journey?.profile?.avatar);
  const using=Object.entries(look.avatar||{}).every(([field,value])=>draft[field]===value);

  if(using)return {state:'using',label:'USANDO'};
  if(incompatible)return {state:'incompatible',label:'BASE INCOMPATÍVEL'};
  if(hasPlus)return {state:'plus',label:'PLUS'};
  if(levelRequired)return {state:'level',label:'NÍVEL '+levelRequired,level:levelRequired};
  if(hasStore)return {state:'store',label:'LOJA'};
  if(issues.length)return {state:'unavailable',label:'INDISPONÍVEL'};
  return {state:'available',label:'DISPONÍVEL'};
}

function avatarLookPreview(look){
  const draft=normalizedAvatar(state.avatarDraft||state.journey?.profile?.avatar);
  const next={...draft,...(look.avatar||{})};
  return normalizeAvatarDraftForBase(next);
}

function renderAvatarLooks(){
  const grid=$('#avatarLooksGrid');
  if(!grid)return;

  grid.innerHTML=NEXO_AVATAR_LOOKS.map(look=>{
    const status=avatarLookStatus(look);
    const achievement=look.achievement_code?journeyAchievement(look.achievement_code):null;
    const achievementLine=look.achievement_code
      ? '<em class="avatar-look-achievement '+(achievement?.unlocked?'unlocked':'locked')+'">'+
          (achievement?.unlocked?'✓ CONQUISTA DESBLOQUEADA':'🔒 '+esc(achievement?.name||avatarLookAchievementLabel(look)))+
        '</em>'
      : '';
    const action=status.state==='using'?'Em uso'
      :status.state==='available'?'Equipar'
      :status.state==='achievement'?'Ver conquista'
      :status.label;
    return '<article class="avatar-look-card '+esc(status.state)+'" data-avatar-look-card="'+esc(look.code)+'">'+
      '<div class="avatar-look-preview" data-avatar-look-preview="'+esc(look.code)+'"></div>'+
      '<div class="avatar-look-copy"><span>'+esc(look.tag)+'</span><h4>'+esc(look.name)+'</h4><p>'+esc(look.description)+'</p>'+achievementLine+'</div>'+
      '<div class="avatar-look-foot"><small>'+esc(status.label)+'</small><button data-avatar-look="'+esc(look.code)+'" '+(status.state==='using'?'disabled':'')+'>'+esc(action)+'</button></div>'+
    '</article>';
  }).join('');

  $$('[data-avatar-look-preview]',grid).forEach(node=>{
    const look=NEXO_AVATAR_LOOKS.find(x=>x.code===node.dataset.avatarLookPreview);
    if(look)renderStudentAvatar(node,avatarLookPreview(look));
  });
}

function applyAvatarLook(code){
  const look=NEXO_AVATAR_LOOKS.find(x=>x.code===code);
  if(!look)return;

  const status=avatarLookStatus(look);
  if(status.state==='using')return;
  if(status.state==='achievement'){
    toast('Esse Look libera com a conquista '+avatarLookAchievementLabel(look)+'.');
    setJourneyTab('achievements');
    return;
  }
  if(status.state==='plus')return openNexoPlans('Esse Look faz parte do NEXO Plus.');
  if(status.state==='level')return toast('Esse Look libera por completo no nível '+Number(status.level||1)+'.');
  if(status.state==='store'){
    toast('Alguns itens desse Look ainda precisam ser conquistados na Loja NEXO.');
    setJourneyTab('store');
    return;
  }
  if(status.state==='incompatible')return toast('Esse Look não é compatível com a base atual do personagem.');
  if(status.state!=='available')return toast('Esse Look ainda não está disponível.');

  state.avatarDraft=normalizeAvatarDraftForBase({
    ...normalizedAvatar(state.avatarDraft||state.journey?.profile?.avatar),
    ...(look.avatar||{})
  });
  renderAvatarBuilder();
  toast(look.name+' equipado. Salve o personagem para confirmar.');
  if(navigator.vibrate)navigator.vibrate(12);
}

function renderAvatarEditorCategory(){
  const controls=$('#avatarBuilderControls');
  if(!controls)return;

  $$('[data-avatar-category]',controls).forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.avatarCategory===avatarEditorCategory);
  });

  const looksPanel=$('#avatarLooksPanel');
  if(looksPanel)looksPanel.classList.toggle('editor-hidden',avatarEditorCategory!=='looks');

  $$('.avatar-option-group',controls).forEach(group=>{
    const first=group.querySelector('[data-avatar-field]');
    const category=avatarEditorGroupForField(first?.dataset.avatarField||'base');
    group.dataset.avatarEditorGroup=category;
    group.classList.toggle('editor-hidden',avatarEditorCategory==='looks'||category!==avatarEditorCategory);
  });

  const title=$('#avatarSelectionTitle');
  const text=$('#avatarSelectionText');
  if(title)title.textContent=avatarEditorLabel(avatarEditorCategory);

  if(avatarEditorCategory==='looks'){
    if(text)text.textContent='Conjuntos prontos que respeitam seu inventário, nível e plano.';
    renderAvatarLooks();
    return;
  }

  const activeGroups=$$('.avatar-option-group',controls).filter(group=>group.dataset.avatarEditorGroup===avatarEditorCategory);
  const selected=[];
  activeGroups.forEach(group=>{
    const active=group.querySelector('[data-avatar-field].active:not([hidden])');
    if(active)selected.push(avatarOptionCleanLabel(active));
  });

  if(text)text.textContent=selected.length
    ? selected.join(' · ')
    : 'Escolha uma opção para visualizar no personagem.';

  const draft=normalizedAvatar(state.avatarDraft||state.journey?.profile?.avatar);
  $$('[data-avatar-field]',controls)
    .filter(btn=>btn.dataset.avatarEditorCategory===avatarEditorCategory&&!btn.hidden)
    .forEach(btn=>renderAvatarVisualCard(btn,draft));
}

function renderAvatarBuilder(){
  const draft=normalizedAvatar(state.avatarDraft||state.journey?.profile?.avatar);
  state.avatarDraft=draft;
  renderStudentAvatar($('#avatarBuilderPreview'),draft);
  renderStudentAvatar($('#avatarBuilderMiniPreview'),draft);
  const status=$('#avatarBuilderStatus');
  if(status){
    const saved=normalizedAvatar(state.journey?.profile?.avatar);
    const changed=JSON.stringify(draft)!==JSON.stringify(saved);
    status.textContent=changed?'Alterações não salvas':'Personagem salvo';
    status.classList.toggle('dirty',changed);
  }
  const owned=journeyInventorySet(),plus=isNexoPlus(),ultra=isNexoUltra();
  const level=Number(state.journey?.profile?.level||1);
  $$('[data-avatar-field]').forEach(btn=>{
    const field=btn.dataset.avatarField,value=btn.dataset.avatarValue,itemCode=btn.dataset.avatarItem;
    btn.dataset.avatarIcon=avatarEditorIconForField(field);
    btn.dataset.avatarEditorCategory=avatarEditorGroupForField(field);
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
    btn.dataset.lockReason=plusLocked?'plus':itemLocked?(level<Number(item?.unlock_level||1)?'level':'store'):'';
    btn.dataset.unlockLevel=item?.unlock_level?String(item.unlock_level):'';
    if(!btn.dataset.baseLabel){
      btn.dataset.baseLabel=avatarOptionCleanLabel(btn);
    }
  });
  renderAvatarEditorCategory();
}


async function loadStudyGroups({silent=true}={}){
  if(!state.user?.id)return [];
  try{
    const {data,error}=await client.rpc('get_my_study_groups');
    if(error)throw error;
    state.studyGroups=Array.isArray(data)?data:[];
    if(state.selectedStudyGroup){
      state.selectedStudyGroup=state.studyGroups.find(g=>String(g.id)===String(state.selectedStudyGroup.id))||null;
    }
    if(!state.selectedStudyGroup&&state.studyGroups.length)state.selectedStudyGroup=state.studyGroups[0];
    renderStudyGroups();
    return state.studyGroups;
  }catch(err){
    console.error('study groups',err);
    if(!silent)toast('Não consegui carregar seus grupos agora.','error');
    return [];
  }
}
function renderStudyGroups(){
  const list=$('#studyGroupsList'),detail=$('#studyGroupDetail');
  if(list){
    list.innerHTML=state.studyGroups.length?state.studyGroups.map(g=>'<button class="study-group-row '+(state.selectedStudyGroup?.id===g.id?'active':'')+'" data-study-group="'+g.id+'"><span>'+String(g.name||'G').slice(0,2).toUpperCase()+'</span><div><b>'+esc(g.name)+'</b><small>'+Number(g.member_count||0)+' membro(s) · '+Number((g.goals||[]).length)+' meta(s)</small></div><i>→</i></button>').join(''):'<p class="learning-empty">Você ainda não participa de um grupo.</p>';
    $$('[data-study-group]',list).forEach(btn=>btn.onclick=()=>{
      state.selectedStudyGroup=state.studyGroups.find(g=>String(g.id)===String(btn.dataset.studyGroup))||null;
      renderStudyGroups();
    });
  }
  if(!detail)return;
  const g=state.selectedStudyGroup;
  if(!g){detail.innerHTML='<p class="learning-empty">Selecione um grupo para ver membros e metas.</p>';return}
  const members=Array.isArray(g.members)?g.members:[],goals=Array.isArray(g.goals)?g.goals:[];
  detail.innerHTML='<header class="study-group-detail-head"><div><span>GRUPO DE ESTUDO</span><h3>'+esc(g.name)+'</h3><p>'+esc(g.description||'Sem descrição.')+'</p></div><div class="study-group-code"><small>CÓDIGO</small><b>'+esc(g.join_code||'—')+'</b><button id="copyStudyGroupCode">Copiar</button></div></header>'+
    '<div class="study-group-columns"><section><div class="panel-title"><b>Membros</b><small>'+members.length+' no grupo</small></div><div class="study-group-members">'+members.map(m=>'<div><span>'+String(m.name||'A').slice(0,1).toUpperCase()+'</span><b>'+esc(m.name||'Aluno NEXO')+'</b><small>'+(m.role==='owner'?'organizador':'membro')+'</small></div>').join('')+'</div></section>'+
    '<section><div class="panel-title"><b>Metas compartilhadas</b><small>progresso somado do grupo</small></div><div class="study-group-goals">'+(goals.length?goals.map(goal=>{const current=Number(goal.current_value||0),target=Math.max(1,Number(goal.target_value||1)),pct=clamp(Math.round(current*100/target),0,100);return '<article><div><b>'+esc(goal.title)+'</b><small>'+current+' / '+target+' '+esc(goal.unit||'itens')+(goal.due_date?' · até '+new Date(goal.due_date+'T12:00:00').toLocaleDateString('pt-BR'):'')+'</small></div><strong>'+pct+'%</strong><i><em style="width:'+pct+'%"></em></i></article>'}).join(''):'<p class="learning-empty">Nenhuma meta criada ainda.</p>')+'</div></section></div>'+
    '<section class="study-group-goal-create"><input id="studyGroupGoalTitle" class="text-input" maxlength="120" placeholder="Nova meta: ex. Resolver questões de Matemática"><input id="studyGroupGoalTarget" class="text-input" type="number" min="1" max="10000" value="50"><select id="studyGroupGoalUnit"><option>questões</option><option>redações</option><option>dias</option></select><input id="studyGroupGoalDate" class="text-input" type="date"><button id="createStudyGroupGoal" class="outline-btn">Adicionar meta</button></section>'+
    '<footer class="study-group-footer">'+(g.is_owner?'<button id="deleteStudyGroup" class="ghost-btn danger">Excluir grupo</button>':'<button id="leaveStudyGroup" class="ghost-btn">Sair do grupo</button>')+'</footer>';
  $('#copyStudyGroupCode')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(g.join_code||'');toast('Código copiado.')}catch(_){toast('Código: '+g.join_code)}});
  $('#createStudyGroupGoal')?.addEventListener('click',async()=>{
    const title=$('#studyGroupGoalTitle')?.value.trim(),target=Number($('#studyGroupGoalTarget')?.value||1),unit=$('#studyGroupGoalUnit')?.value||'questões',due=$('#studyGroupGoalDate')?.value||null;
    if(!title)return toast('Dê um nome para a meta.','error');
    const {error}=await client.from('study_group_goals').insert({group_id:g.id,created_by:state.user.id,title,target_value:target,unit,due_date:due});
    if(error)return toast('Não consegui criar essa meta.','error');
    toast('Meta compartilhada criada.');loadStudyGroups({silent:true});
  });
  $('#leaveStudyGroup')?.addEventListener('click',async()=>{
    if(!confirm('Sair deste grupo?'))return;
    const {error}=await client.from('study_group_members').delete().eq('group_id',g.id).eq('user_id',state.user.id);
    if(error)return toast('Não consegui sair do grupo.','error');
    state.selectedStudyGroup=null;toast('Você saiu do grupo.');loadStudyGroups({silent:true});
  });
  $('#deleteStudyGroup')?.addEventListener('click',async()=>{
    if(!confirm('Excluir este grupo e suas metas?'))return;
    const {error}=await client.from('study_groups').delete().eq('id',g.id);
    if(error)return toast('Não consegui excluir o grupo.','error');
    state.selectedStudyGroup=null;toast('Grupo excluído.');loadStudyGroups({silent:true});
  });
}
$('#createStudyGroup')?.addEventListener('click',async()=>{
  const name=$('#studyGroupName')?.value.trim(),description=$('#studyGroupDescription')?.value.trim()||null;
  if(!name)return toast('Dê um nome para o grupo.','error');
  const {data,error}=await client.rpc('create_study_group',{p_name:name,p_description:description});
  if(error)return toast('Não consegui criar o grupo.','error');
  $('#studyGroupName').value='';$('#studyGroupDescription').value='';
  toast('Grupo criado · código '+data.join_code);
  await loadStudyGroups({silent:true});
  state.selectedStudyGroup=state.studyGroups.find(g=>String(g.id)===String(data.id))||state.selectedStudyGroup;
  renderStudyGroups();
});
$('#joinStudyGroup')?.addEventListener('click',async()=>{
  const code=$('#studyGroupCode')?.value.trim();
  if(!code)return toast('Digite o código do grupo.','error');
  const {data,error}=await client.rpc('join_study_group',{p_code:code});
  if(error)return toast('Código inválido ou grupo indisponível.','error');
  $('#studyGroupCode').value='';toast('Você entrou em '+(data?.name||'um grupo')+'.');
  await loadStudyGroups({silent:true});
});
$('#refreshStudyGroups')?.addEventListener('click',()=>loadStudyGroups({silent:false}));

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
$$('[data-wardrobe-filter]').forEach(btn=>btn.onclick=()=>{
  wardrobeFilter=btn.dataset.wardrobeFilter||'owned';
  $$('[data-wardrobe-filter]').forEach(x=>x.classList.toggle('active',x===btn));
  renderNexoWardrobe();
});
$('#wardrobeCategory')?.addEventListener('change',renderNexoWardrobe);
$$('[data-store-filter]').forEach(btn=>btn.onclick=()=>{
  storeFilter=btn.dataset.storeFilter||'all';
  $$('[data-store-filter]').forEach(x=>x.classList.toggle('active',x===btn));
  renderJourneyStore();
});
$('#storeCategory')?.addEventListener('change',renderJourneyStore);
$('#storeCollection')?.addEventListener('change',renderJourneyStore);
$$('[data-journey-tab-target]').forEach(btn=>btn.onclick=()=>setJourneyTab(btn.dataset.journeyTabTarget));
$('#refreshJourney')?.addEventListener('click',()=>loadNexoJourney());
$('#startNexoArena')?.addEventListener('click',startNexoArena);

function applyAvatarChoice(btn){
  if(!btn)return;
  if(btn.dataset.locked==='true'){
    const reason=btn.dataset.lockReason||'store';
    if(reason==='plus')return openNexoPlans('Esse estilo é exclusivo do NEXO Plus.');
    if(reason==='level')return toast('Esse item desbloqueia no nível '+Number(btn.dataset.unlockLevel||1)+'.');
    toast('Esse cosmético ainda não está no seu inventário. Veja na Loja NEXO.');
    setJourneyTab('store');
    return;
  }
  try{
    state.avatarDraft=normalizedAvatar(state.avatarDraft||state.journey?.profile?.avatar);
    const field=btn.dataset.avatarField;
    const value=btn.dataset.avatarValue;
    state.avatarDraft[field]=value;
    if(field==='base'){
      const starter=starterAvatarForBase(value);
      state.avatarDraft={...state.avatarDraft,base:starter.base,hair:starter.hair,outfit:starter.outfit,accessory:'none'};
    }
    state.avatarDraft=normalizeAvatarDraftForBase(state.avatarDraft);
    renderAvatarBuilder();
    if(navigator.vibrate)navigator.vibrate(8);
  }catch(err){
    console.error('avatar choice',err);
    logClientError('journey_avatar',err,'avatar_choice');
    toast('Não consegui aplicar esse item agora.','error');
  }
}

$('#avatarBuilderControls')?.addEventListener('click',e=>{
  const btn=e.target.closest?.('[data-avatar-field]');
  if(!btn)return;
  e.preventDefault();
  applyAvatarChoice(btn);
});

$('#avatarBuilderControls')?.addEventListener('click',e=>{
  const categoryBtn=e.target.closest?.('[data-avatar-category]');
  if(!categoryBtn)return;
  e.preventDefault();
  avatarEditorCategory=categoryBtn.dataset.avatarCategory||'looks';
  renderAvatarEditorCategory();
  categoryBtn.scrollIntoView?.({behavior:'smooth',block:'nearest',inline:'center'});
});

$('#avatarBuilderControls')?.addEventListener('click',e=>{
  const lookBtn=e.target.closest?.('[data-avatar-look]');
  if(!lookBtn)return;
  e.preventDefault();
  applyAvatarLook(lookBtn.dataset.avatarLook);
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
    btn.disabled=false;btn.innerHTML='Quero o Plus · R$ 9,99/mês <span>→</span>';
  }
});

$('#saveJourneyAvatar')?.addEventListener('click',async()=>{
  const btn=$('#saveJourneyAvatar');
  if(!state.avatarDraft)return;
  btn.disabled=true;btn.textContent='Salvando...';
  try{
    const cleanDraft=normalizeAvatarDraftForBase(state.avatarDraft);
    const {data,error}=await client.rpc('save_nexo_avatar',{p_avatar:cleanDraft});
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
  const {data,error}=await client.rpc('get_question_comments_v3',{p_question_id:Number(questionId)});
  if(error){console.error(error);$('#questionComments').innerHTML='<div class="comment-empty">Não foi possível carregar os comentários.</div>';return}
  $('#questionComments').innerHTML=data?.length?data.map((c,index)=>`<article class="comment-item">
    <div class="comment-top"><div class="comment-author"><span class="comment-social-avatar" data-comment-avatar="${index}"></span><div class="comment-meta"><b>${esc(c.author_name)} ${c.is_mine&&isNexoUltra()?'<i class="comment-plus-badge ultra">ULTRA</i>':c.plan==='plus'?'<i class="comment-plus-badge">PLUS</i>':''}</b><small>NV. ${Number(c.level||1)} · ${esc(c.league||'Bronze')} · ${Number(c.reputation||0)} ajuda(s) · ${new Date(c.created_at).toLocaleString('pt-BR')}</small></div></div>
    <div class="comment-actions">${c.is_mine?'<button data-delete-comment="'+c.id+'" class="danger">Excluir</button>':'<button data-report-comment="'+c.id+'">Denunciar</button>'}</div></div>
    <p>${esc(c.body)}</p>
    <div class="comment-helpful"><button data-helpful-comment="${c.id}" class="${c.helpful_by_me?'active':''}">✦ Útil <b>${Number(c.helpful_count||0)}</b></button><small>Marque quando a explicação realmente ajudar.</small></div>
  </article>`).join(''):'<div class="comment-empty">Ainda não há comentários. Seja o primeiro a compartilhar uma dúvida ou um jeito de resolver.</div>';
  $$('[data-comment-avatar]',$('#questionComments')).forEach(node=>{
    const row=data[Number(node.dataset.commentAvatar)];
    renderStudentAvatar(node,row?.avatar);
  });
  $$('[data-report-comment]').forEach(b=>b.onclick=()=>reportComment(Number(b.dataset.reportComment)));
  $$('[data-delete-comment]').forEach(b=>b.onclick=()=>deleteComment(Number(b.dataset.deleteComment)));
  $$('[data-helpful-comment]').forEach(b=>b.onclick=async()=>{
    const {data:vote,error:voteError}=await client.rpc('toggle_comment_helpful',{p_comment_id:Number(b.dataset.helpfulComment)});
    if(voteError)return toast('Não consegui registrar esse voto.','error');
    b.classList.toggle('active',Boolean(vote?.helpful));
    const count=b.querySelector('b');if(count)count.textContent=Number(vote?.helpful_count||0);
  });
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
  $$('[data-nexo-safe-avatar]').forEach(img=>bindImage(img,'./assets/nexo-family/bust-confiante.avif'));

  const stableFallback='./assets/nexo-family/bust-confiante.avif';
  $$('.focus-mascot-img,[data-nexo-family],#onboardingMascot,#performanceCoreMascot').forEach(img=>{
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
  if(!el)return false;
  el.className='cloudinary-security-status checking';
  el.textContent='Verificando proteção dos uploads...';
  try{
    const auth=await getCloudinaryUploadAuth();
    if(!auth)throw new Error('Assinatura indisponível.');
    el.className='cloudinary-security-status safe';
    el.textContent='✓ Upload assinado ativo — arquivos protegidos por autenticação de administrador.';
    return true;
  }catch(err){
    console.warn('Cloudinary security status',err);
    el.className='cloudinary-security-status warning';
    el.textContent='⚠ Upload assinado indisponível. Confira a configuração segura antes de enviar arquivos.';
    return false;
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
  const users=state.adminUsers.filter(u=>!q||[u.full_name,u.email,u.role,u.plan,u.access_tier].filter(Boolean).join(' ').toLowerCase().includes(q));

  list.innerHTML=users.length?users.map(u=>{
    const isAdmin=u.role==='admin';
    const current=Boolean(u.is_current_user);
    const storedPlan=['free','plus','ultra'].includes(u.plan)?u.plan:'free';
    const accessTier=['free','plus','ultra'].includes(u.access_tier)?u.access_tier:storedPlan;
    const expired=Boolean(u.membership_expired);
    const name=u.full_name||u.email?.split('@')[0]||'Usuário';

    let validity='Plano base';
    if(storedPlan!=='free'){
      validity=u.current_period_end
        ? (expired?'Expirou em ':'Válido até ')+new Date(u.current_period_end).toLocaleDateString('pt-BR')
        : 'Acesso permanente';
    }

    return `<article class="admin-user-row">
      <div class="admin-user-avatar">${esc(initials(name))}</div>
      <div class="admin-user-info">
        <b>${esc(name)} ${current?'<span class="you-chip">VOCÊ</span>':''}</b>
        <small>${esc(u.email||'Sem e-mail')}</small>
        <div class="admin-access-chips">
          <span class="role-chip ${isAdmin?'admin':'student'}">${isAdmin?'Administrador':'Aluno'}</span>
          <span class="plan-access-chip ${accessTier} ${expired?'expired':''}">Acesso ${accessTier==='ultra'?'Ultra':accessTier==='plus'?'Plus':'Free'}</span>
        </div>
        <em class="admin-plan-validity">${esc(validity)}</em>
      </div>
      <div class="admin-user-access">
        <div class="admin-access-control">
          <small>CARGO</small>
          <div class="admin-role-action">
            ${current
              ? '<button disabled title="Você não pode remover seu próprio acesso por aqui">Admin</button>'
              : isAdmin
                ? '<button class="danger" data-set-user-role="'+u.id+'" data-role="student">Remover admin</button>'
                : '<button class="promote" data-set-user-role="'+u.id+'" data-role="admin">Tornar admin</button>'}
          </div>
        </div>
        <div class="admin-access-control">
          <small>PLANO</small>
          <div class="admin-plan-switch" data-user-plan-control="${u.id}">
            <button class="${storedPlan==='free'?'active':''}" data-set-user-plan="${u.id}" data-plan="free">Free</button>
            <button class="${storedPlan==='plus'?'active':''}" data-set-user-plan="${u.id}" data-plan="plus">Plus</button>
            <button class="ultra ${storedPlan==='ultra'?'active':''}" data-set-user-plan="${u.id}" data-plan="ultra">Ultra</button>
          </div>
          <select class="admin-plan-duration" data-plan-duration="${u.id}" aria-label="Validade do plano">
            <option value="30">30 dias</option>
            <option value="7">7 dias</option>
            <option value="90">90 dias</option>
            <option value="permanent">Permanente</option>
          </select>
        </div>
      </div>
    </article>`;
  }).join(''):'<div class="admin-user-empty">Nenhuma conta encontrada.</div>';

  list.querySelectorAll('[data-set-user-role]').forEach(btn=>{
    btn.onclick=()=>setAdminUserRole(btn.dataset.setUserRole,btn.dataset.role);
  });
  list.querySelectorAll('[data-set-user-plan]').forEach(btn=>{
    btn.onclick=()=>setAdminUserPlan(btn.dataset.setUserPlan,btn.dataset.plan);
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

async function setAdminUserPlan(userId,plan){
  const user=state.adminUsers.find(u=>u.id===userId);
  if(!user||!['free','plus','ultra'].includes(plan))return;

  const name=user.full_name||user.email||'esta conta';
  const label=plan==='ultra'?'Ultra':plan==='plus'?'Plus':'Free';
  const durationSelect=document.querySelector('[data-plan-duration="'+userId+'"]');
  const durationValue=plan==='free'?'permanent':(durationSelect?.value||'30');
  const durationDays=durationValue==='permanent'?null:Number(durationValue);
  const validityLabel=plan==='free'
    ? 'sem acesso premium'
    : durationDays===null?'permanente':durationDays+' dias';

  if(!confirm('Definir '+name+' como NEXO '+label+' ('+validityLabel+')?'))return;

  try{
    const {data,error}=await client.functions.invoke('admin-users',{
      body:{
        action:'set_plan',
        target_user_id:userId,
        plan,
        duration_days:durationDays
      }
    });
    if(error)throw error;
    if(data?.error)throw new Error(data.error);

    toast('Plano de '+name+' atualizado para '+label+' · '+validityLabel+'.');

    if(user.is_current_user){
      await loadNexoMembership({silent:false});
      await loadNexoJourney({silent:true});
    }
    await loadAdminUsers();
  }catch(err){
    console.error('set admin plan',err);
    const msg=String(err?.message||err||'');
    toast(msg.includes('invalid_duration')?'Validade de plano inválida.':'Não foi possível alterar o plano dessa conta.','error');
  }
}

$('#adminUserSearch')?.addEventListener('input',renderAdminUsers);
$('#refreshAdminUsers')?.addEventListener('click',loadAdminUsers);

async function loadAdmin(){
  if(state.profile?.role!=='admin')return;
  loadNexoHealth({silent:true});
  checkCloudinarySecurityStatus();
  loadAdminUsers();
  loadAdminQuestionIssues();
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
    if(isPdf&&essaySheetTitleMatches(title)){
      OFFICIAL_ENEM_ESSAY_SHEET.checked=false;
      await updateOfficialEssaySheetAction({refresh:true});
    }
    await loadAdmin();
  }catch(err){
    console.error(err);
    status.textContent='Falha no upload/publicação: '+String(err?.message||err||'erro desconhecido');
    toast('Não foi possível publicar o material.','error');
  }
};


function ensureNotificationPanel(){
  let panel=$('#notificationPanel');
  if(panel)return panel;
  panel=document.createElement('div');
  panel.id='notificationPanel';
  panel.className='profile-menu nrx-notification-panel hidden';
  panel.setAttribute('role','dialog');
  panel.setAttribute('aria-label','Notificações NEXO');
  document.body.appendChild(panel);
  return panel;
}
function renderNotificationPanel(){
  const panel=ensureNotificationPanel();
  const due=Array.isArray(state.dueReviewItems)?state.dueReviewItems.length:0;
  let saved=null;
  try{saved=typeof readPersistedStudySession==='function'?readPersistedStudySession():null}catch(_){}
  const items=[];
  if(saved)items.push({icon:'▶',title:'Sessão em andamento',text:'Você pode continuar exatamente de onde parou.',action:'resume'});
  if(due>0)items.push({icon:'↻',title:due+' revisão'+(due===1?'':'ões')+' pendente'+(due===1?'':'s'),text:'Revise antes que esses conteúdos esfriem.',action:'focos'});
  if(!items.length)items.push({icon:'✓',title:'Tudo em dia',text:'Nenhuma ação urgente agora.',action:''});
  panel.innerHTML='<div class="nrx-notification-head"><div><b>Notificações</b><small>Seu próximo passo no NEXO</small></div><button type="button" data-nrx-notification-close aria-label="Fechar">×</button></div>'+
    '<div class="nrx-notification-list">'+items.map((item,index)=>'<button type="button" data-nrx-notification-action="'+item.action+'" '+(!item.action?'disabled':'')+'><span>'+item.icon+'</span><div><b>'+esc(item.title)+'</b><small>'+esc(item.text)+'</small></div><i>›</i></button>').join('')+'</div>'+
    '<div class="nrx-notification-footer"><button type="button" data-nrx-notification-page="semana">Abrir Planner</button><button type="button" data-nrx-notification-page="focos">Meus Focos</button></div>';
  $('[data-nrx-notification-close]',panel)?.addEventListener('click',()=>setNotificationPanel(false));
  $$('[data-nrx-notification-action]',panel).forEach(btn=>btn.addEventListener('click',()=>{
    const action=btn.dataset.nrxNotificationAction;
    if(action==='resume')$('#continueStudy')?.click();
    else if(action)openPage(action);
    setNotificationPanel(false);
  }));
  $$('[data-nrx-notification-page]',panel).forEach(btn=>btn.addEventListener('click',()=>{
    openPage(btn.dataset.nrxNotificationPage);
    setNotificationPanel(false);
  }));
  return panel;
}
function setNotificationPanel(open){
  const btn=$('#notificationBtn');
  const panel=open?renderNotificationPanel():$('#notificationPanel');
  if(!panel)return;
  panel.classList.toggle('hidden',!open);
  btn?.setAttribute('aria-expanded',String(Boolean(open)));
  if(open)$('#profileMenu')?.classList.add('hidden');
}
$('#notificationBtn')?.addEventListener('click',e=>{
  e.preventDefault();e.stopPropagation();
  const panel=ensureNotificationPanel();
  setNotificationPanel(panel.classList.contains('hidden'));
});
document.addEventListener('click',e=>{
  const panel=$('#notificationPanel');
  if(panel&&!panel.classList.contains('hidden')&&!e.target.closest('#notificationPanel')&&!e.target.closest('#notificationBtn'))setNotificationPanel(false);
});

window.addEventListener('resize',()=>{if(innerWidth>760)toggleMenu(false)});

// Importante: inicia a restauração da sessão somente após todo o arquivo ter
// terminado de declarar NEXO_EMOTIONS, imagens, Jornada e demais constantes.
queueMicrotask(startAuthBootstrap);
