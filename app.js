(() => {
'use strict';

const $ = (q, root=document) => root.querySelector(q);
const $$ = (q, root=document) => [...root.querySelectorAll(q)];
const KEYS = {
  attempts:'nexo_attempts_v2', seen:'nexo_seen_v2', feedback:'nexo_feedback_v2',
  videos:'nexo_videos_v2', theme:'nexo_theme_v2', essays:'nexo_essays_v2'
};
const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } };
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const shuffle = arr => arr.map(v=>[Math.random(),v]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const nowLabel = () => new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});

const THEMES = [
  {id:1,axis:'Meio ambiente',title:'Transição energética no Brasil: desafios para um futuro sustentável',prompt:'Discuta caminhos para ampliar a transição energética brasileira de forma socialmente justa e ambientalmente responsável.'},
  {id:2,axis:'Tecnologia e sociedade',title:'Os impactos da inteligência artificial na formação dos jovens brasileiros',prompt:'Analise benefícios e riscos da inteligência artificial na educação e proponha medidas para seu uso responsável.'},
  {id:3,axis:'Cidadania',title:'Desafios para combater a desinformação na sociedade brasileira',prompt:'Discuta estratégias de educação midiática e responsabilidade social para reduzir a desinformação.'},
  {id:4,axis:'Saúde pública',title:'Caminhos para ampliar o cuidado com a saúde mental entre adolescentes',prompt:'Analise os obstáculos ao cuidado em saúde mental e proponha ações de prevenção e acolhimento.'},
  {id:5,axis:'Urbanização',title:'Mobilidade urbana e direito à cidade no Brasil contemporâneo',prompt:'Discuta os impactos da mobilidade desigual e proponha políticas para cidades mais acessíveis.'},
  {id:6,axis:'Cultura',title:'A preservação do patrimônio cultural diante das transformações digitais',prompt:'Analise como preservar memória e patrimônio cultural em uma sociedade cada vez mais digital.'}
];

const SUBJECTS = {
  'Linguagens':['Português','Literatura','Artes','Inglês','Tecnologias da Comunicação'],
  'Ciências Humanas':['História','Geografia','Filosofia','Sociologia','Atualidades'],
  'Ciências da Natureza':['Biologia','Química','Física','Ciências Ambientais','Saúde'],
  'Matemática':['Matemática','Estatística','Geometria','Funções','Matemática Financeira']
};

const TOPICS = {
  'Português':['Interpretação de texto','Coesão e coerência','Variação linguística','Gêneros textuais','Semântica'],
  'Literatura':['Modernismo','Realismo','Poesia','Narrativa','Literatura brasileira'],
  'Artes':['Arte moderna','Cultura popular','Linguagens artísticas','Patrimônio','Estética'],
  'Inglês':['Reading','Vocabulary','Text genre','Inference','Communication'],
  'Tecnologias da Comunicação':['Mídias digitais','Publicidade','Redes sociais','Linguagem multimodal','Informação'],
  'História':['Brasil República','Brasil Colônia','Era Vargas','Movimentos sociais','História contemporânea'],
  'Geografia':['Urbanização','Globalização','Cartografia','Climatologia','Geopolítica'],
  'Filosofia':['Ética','Política','Conhecimento','Filosofia moderna','Cidadania'],
  'Sociologia':['Cultura','Trabalho','Desigualdade','Cidadania','Movimentos sociais'],
  'Atualidades':['Tecnologia','Meio ambiente','Economia','Demografia','Direitos humanos'],
  'Biologia':['Ecologia','Genética','Fisiologia','Evolução','Citologia'],
  'Química':['Soluções','Estequiometria','Química orgânica','Eletroquímica','Ácidos e bases'],
  'Física':['Cinemática','Eletricidade','Ondulatória','Termologia','Óptica'],
  'Ciências Ambientais':['Sustentabilidade','Poluição','Energia','Ciclos biogeoquímicos','Recursos naturais'],
  'Saúde':['Vacinação','Nutrição','Epidemiologia','Saneamento','Prevenção'],
  'Matemática':['Razão e proporção','Porcentagem','Aritmética','Combinatória','Probabilidade'],
  'Estatística':['Média','Mediana','Gráficos','Amostragem','Dispersão'],
  'Geometria':['Áreas','Volumes','Semelhança','Trigonometria','Escala'],
  'Funções':['Função afim','Função quadrática','Exponencial','Modelagem','Sequências'],
  'Matemática Financeira':['Juros','Descontos','Inflação','Parcelamento','Planejamento']
};

function makeOptions(correct, wrongs){
  const list = shuffle([String(correct), ...wrongs.map(String)]);
  return {options:list, answer:list.indexOf(String(correct))};
}

function qMath(i){
  const kind=i%5, n=i+1, difficulty=1+(i%3);
  if(kind===0){
    const base=80+(n%31)*10, pct=[10,15,20,25,30][n%5], ans=base*(1+pct/100);
    const o=makeOptions(ans.toFixed(0),[(base+pct).toFixed(0),(ans+10).toFixed(0),(ans-10).toFixed(0),(base*(1-pct/100)).toFixed(0)]);
    return {subject:'Matemática Financeira',topic:'Porcentagem',difficulty,context:`Uma loja anunciou reajuste de ${pct}% sobre um produto que custava R$ ${base},00.`,prompt:'Qual será o novo preço desse produto?',...o,explanation:`Um aumento de ${pct}% corresponde a multiplicar ${base} por ${(1+pct/100).toFixed(2)}.`};
  }
  if(kind===1){
    const a=3+n%7,b=2+n%5,x=4+n%8,ans=a*x+b;
    const o=makeOptions(ans,[ans+a,ans-b,ans+x,a+b+x]);
    return {subject:'Funções',topic:'Função afim',difficulty,context:`Uma quantidade é modelada pela função f(x) = ${a}x + ${b}.`,prompt:`Qual é o valor de f(${x})?`,...o,explanation:`Substituindo x por ${x}: f(${x}) = ${a}·${x} + ${b} = ${ans}.`};
  }
  if(kind===2){
    const vals=[10+n%9,12+n%7,14+n%5,16+n%3]; const ans=vals.reduce((a,b)=>a+b,0)/4;
    const o=makeOptions(ans.toFixed(1),[(ans+1).toFixed(1),(ans-1).toFixed(1),(ans+2).toFixed(1),(ans-2).toFixed(1)]);
    return {subject:'Estatística',topic:'Média',difficulty,context:`As notas de quatro avaliações foram ${vals.join(', ')}.`,prompt:'Qual é a média aritmética dessas notas?',...o,explanation:'A média é a soma dos quatro valores dividida por 4.'};
  }
  if(kind===3){
    const w=4+n%8,h=3+n%6,ans=w*h;
    const o=makeOptions(ans,[2*(w+h),ans+w,ans-h,w+h]);
    return {subject:'Geometria',topic:'Áreas',difficulty,context:`Um painel retangular mede ${w} m de largura e ${h} m de altura.`,prompt:'Qual é a área do painel, em metros quadrados?',...o,explanation:`Área do retângulo = base × altura = ${w} × ${h} = ${ans} m².`};
  }
  const total=50+n%51, fav=5+n%11, ans=(fav/total*100);
  const o=makeOptions(ans.toFixed(1)+'%',[(fav/100).toFixed(1)+'%',(total/fav).toFixed(1)+'%',(ans+5).toFixed(1)+'%',(ans-5).toFixed(1)+'%']);
  return {subject:'Matemática',topic:'Probabilidade',difficulty,context:`Em uma pesquisa com ${total} pessoas, ${fav} escolheram determinada opção.`,prompt:'Que percentual do grupo corresponde a essa escolha?',...o,explanation:'Divida a quantidade favorável pelo total e multiplique por 100.'};
}

function qNature(i){
  const kind=i%5, difficulty=1+(i%3), n=i+1;
  if(kind===0) return {subject:'Biologia',topic:'Ecologia',difficulty,context:`Em um ecossistema, a redução intensa de predadores alterou a população de herbívoros no período ${2020+n%6}.`,prompt:'Qual consequência é mais compatível com essa alteração na cadeia alimentar?',options:['Aumento dos herbívoros e maior pressão sobre os produtores','Extinção imediata dos produtores','Redução automática da fotossíntese','Aumento obrigatório da biodiversidade','Interrupção total do fluxo de energia'],answer:0,explanation:'Com menos predadores, herbívoros tendem a aumentar e podem consumir mais produtores.'};
  if(kind===1){const pH=2+(n%4);return {subject:'Química',topic:'Ácidos e bases',difficulty,context:`Uma solução aquosa apresenta pH igual a ${pH}.`,prompt:'Essa solução é classificada como',options:['ácida','básica','neutra','saturada','metálica'],answer:0,explanation:'Em condições usuais, pH menor que 7 indica caráter ácido.'};}
  if(kind===2){const d=120+(n%10)*20,t=10+(n%5)*2,ans=d/t;const o=makeOptions(ans.toFixed(1)+' m/s',[(ans+2).toFixed(1)+' m/s',(ans-2).toFixed(1)+' m/s',(d*t).toFixed(0)+' m/s',(t/d).toFixed(2)+' m/s']);return {subject:'Física',topic:'Cinemática',difficulty,context:`Um veículo percorre ${d} m em ${t} s com velocidade média constante.`,prompt:'Qual é sua velocidade média?',...o,explanation:'Velocidade média é distância dividida pelo tempo.'};}
  if(kind===3) return {subject:'Ciências Ambientais',topic:'Sustentabilidade',difficulty,context:'Uma cidade pretende reduzir emissões sem diminuir o acesso da população à energia.',prompt:'Qual medida combina melhor eficiência energética e redução de emissões?',options:['Ampliar fontes renováveis e eficiência no consumo','Aumentar perdas na transmissão','Substituir transporte coletivo por carros individuais','Eliminar programas de reciclagem','Estimular desperdício de eletricidade'],answer:0,explanation:'Fontes renováveis e eficiência reduzem emissões preservando o acesso à energia.'};
  return {subject:'Saúde',topic:'Vacinação',difficulty,context:`Uma campanha de imunização pretende elevar a cobertura de uma comunidade no ciclo ${n}.`,prompt:'A vacinação coletiva contribui para a saúde pública principalmente porque',options:['reduz a circulação de agentes infecciosos e protege grupos vulneráveis','elimina qualquer doença em uma única dose','substitui saneamento e higiene','impede todas as mutações virais','dispensa acompanhamento epidemiológico'],answer:0,explanation:'Coberturas elevadas reduzem a circulação do agente e ajudam a proteger quem não pode ser vacinado.'};
}

function qHuman(i){
  const kind=i%5,difficulty=1+(i%3),n=i+1;
  if(kind===0)return {subject:'História',topic:'Brasil República',difficulty,context:`Uma análise histórica do Brasil republicano considera transformações políticas ocorridas ao longo do século XX. Documento ${n} destaca a ampliação da participação social.`,prompt:'Qual processo se relaciona diretamente à ampliação da cidadania política?',options:['Expansão de direitos e participação eleitoral','Retorno ao trabalho compulsório','Fim de toda organização sindical','Supressão permanente do voto','Eliminação dos movimentos sociais'],answer:0,explanation:'A ampliação de direitos e da participação eleitoral é central ao processo de cidadania política.'};
  if(kind===1)return {subject:'Geografia',topic:'Urbanização',difficulty,context:`Uma metrópole registrou crescimento periférico acelerado entre ${2000+n%10} e ${2010+n%10}.`,prompt:'Qual desafio urbano tende a acompanhar esse processo quando o planejamento é insuficiente?',options:['Déficit de mobilidade e infraestrutura','Desaparecimento das desigualdades espaciais','Redução automática do preço da terra','Fim dos deslocamentos pendulares','Homogeneização completa do espaço urbano'],answer:0,explanation:'Expansão periférica sem planejamento costuma ampliar distâncias, deslocamentos e déficits de infraestrutura.'};
  if(kind===2)return {subject:'Filosofia',topic:'Ética',difficulty,context:'Uma decisão pública precisa conciliar liberdade individual, responsabilidade e efeitos sobre outras pessoas.',prompt:'A reflexão ética se caracteriza por',options:['examinar criticamente princípios e consequências das ações','rejeitar qualquer justificativa racional','substituir leis por preferências pessoais','impedir todo conflito de valores','reduzir moralidade a costumes imutáveis'],answer:0,explanation:'A ética envolve reflexão crítica sobre princípios, razões e consequências das ações.'};
  if(kind===3)return {subject:'Sociologia',topic:'Desigualdade',difficulty,context:`Dados de uma pesquisa social, amostra ${n}, mostram diferenças persistentes no acesso a renda, educação e serviços.`,prompt:'Esse fenômeno pode ser compreendido sociologicamente como',options:['desigualdade social estruturada por oportunidades distintas','mera diferença biológica entre indivíduos','ausência completa de instituições','efeito exclusivo do clima','resultado inevitável sem relação histórica'],answer:0,explanation:'Desigualdades sociais envolvem distribuição desigual de recursos, oportunidades e poder.'};
  return {subject:'Atualidades',topic:'Direitos humanos',difficulty,context:'Uma política pública busca garantir acesso universal a serviços essenciais sem discriminação.',prompt:'Esse objetivo se aproxima do princípio de',options:['igualdade de direitos e dignidade humana','privilégio hereditário','censura de grupos sociais','exclusão de minorias','restrição arbitrária da cidadania'],answer:0,explanation:'Universalidade e não discriminação estão ligadas à igualdade de direitos e à dignidade humana.'};
}

function qLanguage(i){
  const kind=i%5,difficulty=1+(i%3),n=i+1;
  if(kind===0)return {subject:'Português',topic:'Interpretação de texto',difficulty,context:`Texto ${n}: “Em uma sociedade marcada por excesso de informação, compreender não significa apenas receber mensagens, mas avaliar contexto, intenção e evidências.”`,prompt:'A ideia central do texto é que compreender uma mensagem exige',options:['análise crítica do contexto e das evidências','memorização isolada de palavras','abandono de qualquer interpretação','leitura apenas de títulos','aceitação automática da primeira fonte'],answer:0,explanation:'O fragmento associa compreensão à avaliação crítica de contexto, intenção e evidências.'};
  if(kind===1)return {subject:'Português',topic:'Variação linguística',difficulty,context:'Em uma campanha voltada a adolescentes, o texto utiliza expressões próximas da conversa cotidiana e construções mais informais.',prompt:'Essa escolha linguística tem como principal função',options:['aproximar a mensagem do público-alvo','eliminar qualquer identidade do texto','transformar o texto em documento jurídico','impedir a compreensão por jovens','substituir o conteúdo informativo'],answer:0,explanation:'A adequação do registro ao público favorece proximidade e eficácia comunicativa.'};
  if(kind===2)return {subject:'Literatura',topic:'Narrativa',difficulty,context:`No fragmento literário ${n}, o narrador apresenta pensamentos da personagem e descreve sua percepção subjetiva do ambiente.`,prompt:'Esse recurso contribui para',options:['aprofundar a construção psicológica da personagem','eliminar o ponto de vista narrativo','tornar o texto exclusivamente científico','retirar qualquer ambiguidade da linguagem','substituir ações por dados estatísticos'],answer:0,explanation:'A focalização de pensamentos e percepções amplia a dimensão psicológica da personagem.'};
  if(kind===3)return {subject:'Artes',topic:'Linguagens artísticas',difficulty,context:'Uma obra contemporânea combina fotografia, texto, som e participação do público.',prompt:'A combinação de diferentes meios caracteriza',options:['hibridização de linguagens artísticas','negação da experiência estética','uso exclusivo da pintura acadêmica','abandono de recursos tecnológicos','reprodução obrigatória de um único estilo'],answer:0,explanation:'A integração de meios distintos é um exemplo de hibridização de linguagens.'};
  return {subject:'Inglês',topic:'Reading',difficulty,context:`Message ${n}: “Small daily choices can create lasting change when people act together.”`,prompt:'The main idea of the message is that',options:['collective consistent actions can produce long-term effects','change only happens through isolated actions','daily choices never influence society','people should avoid cooperation','lasting change is always immediate'],answer:0,explanation:'The sentence emphasizes consistent daily choices and collective action.'};
}

function buildQuestions(){
  const out=[]; const makers=[
    ['Linguagens',qLanguage],['Ciências Humanas',qHuman],['Ciências da Natureza',qNature],['Matemática',qMath]
  ];
  let id=1;
  for(const [area,maker] of makers){
    for(let i=0;i<125;i++){
      const q=maker(i);
      out.push({id:id++,area,source:'Banco NEXO — padrão ENEM',...q});
    }
  }
  return out;
}
const QUESTIONS=buildQuestions();

let current=null;
let activeArea='';
let sim=null;

function toast(msg){
  const el=$('#toast'); el.textContent=msg; el.classList.remove('hidden');
  clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.add('hidden'),2600);
}

function openPage(id){
  $$('.page').forEach(p=>p.classList.toggle('active',p.id===id));
  $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===id));
  document.body.classList.remove('menu-open'); $('.sidebar').classList.remove('open');
  window.scrollTo({top:0,behavior:'smooth'});
  if(id==='desempenho') renderPerformance();
  if(id==='focos') renderFocus();
  if(id==='videoaulas') renderVideos();
  if(id==='banco') renderBank();
  if(id==='feedback') renderFeedback();
  if(id==='admin') renderAdmin();
}
$$('[data-page]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();openPage(b.dataset.page)}));

$('#mobileMenu').onclick=()=>$('.sidebar').classList.toggle('open');
document.addEventListener('click',e=>{if(innerWidth<=760&&!e.target.closest('.sidebar')&&!e.target.closest('#mobileMenu'))$('.sidebar').classList.remove('open')});

const savedTheme=localStorage.getItem(KEYS.theme)||'dark';
if(savedTheme==='light') document.body.classList.add('light');
function setThemeButton(){ $('#themeToggle').textContent=document.body.classList.contains('light')?'☀':'☾'; }
setThemeButton();
$('#themeToggle').onclick=()=>{document.body.classList.toggle('light');localStorage.setItem(KEYS.theme,document.body.classList.contains('light')?'light':'dark');setThemeButton();renderChart();};

function subjectOptions(){
  const area=$('#areaFilter').value; const all=area?SUBJECTS[area]:Object.values(SUBJECTS).flat();
  $('#subjectFilter').innerHTML='<option value="">Todas as matérias</option>'+[...new Set(all)].map(x=>`<option>${esc(x)}</option>`).join('');
}
$('#areaFilter').addEventListener('change',subjectOptions); subjectOptions();

function getAttempts(){return read(KEYS.attempts,[])}
function getSeen(){return read(KEYS.seen,[])}
function saveAttempt(q,selected){
  const attempts=getAttempts();
  attempts.push({id:Date.now()+Math.random(),questionId:q.id,area:q.area,subject:q.subject,topic:q.topic,correct:selected===q.answer,selected,ts:Date.now()});
  write(KEYS.attempts,attempts.slice(-1500));
  const seen=getSeen(); if(!seen.includes(q.id)){seen.push(q.id);write(KEYS.seen,seen);}
}
function getWeakness(){
  const attempts=getAttempts(), map={};
  for(const a of attempts){const k=a.topic||a.subject;map[k]??={topic:k,subject:a.subject,total:0,wrong:0};map[k].total++;if(!a.correct)map[k].wrong++;}
  return Object.values(map).filter(x=>x.total>0).map(x=>({...x,score:Math.round(100*x.wrong/x.total)})).sort((a,b)=>b.score-a.score);
}
function nextQuestion(adaptive=false){
  const area=activeArea||$('#areaFilter').value, subject=$('#subjectFilter').value, diff=Number($('#difficultyFilter').value||0);
  let pool=QUESTIONS.filter(q=>(!area||q.area===area)&&(!subject||q.subject===subject)&&(!diff||q.difficulty===diff));
  if(adaptive){
    const weak=getWeakness().slice(0,4).map(x=>x.topic); if(weak.length){const p=pool.filter(q=>weak.includes(q.topic));if(p.length)pool=p;}
  }
  const seen=new Set(getSeen()); let fresh=pool.filter(q=>!seen.has(q.id));
  if(!fresh.length){write(KEYS.seen,[]);fresh=pool;toast('Ciclo concluído. As questões foram liberadas novamente.');}
  current=fresh[Math.floor(Math.random()*fresh.length)]||QUESTIONS[Math.floor(Math.random()*QUESTIONS.length)];
  renderQuestion();
}
function renderQuestion(){
  if(!current){nextQuestion();return}
  const card=$('#questionCard');
  card.innerHTML=`<div class="q-head"><span class="tag">${esc(current.area)}</span><span class="tag">${esc(current.subject)}</span><span class="tag">${esc(current.topic)}</span><span class="tag">Dificuldade ${current.difficulty}</span></div>
    ${current.context?`<div class="q-context">${esc(current.context)}</div>`:''}
    ${current.image&&current.imageExists?`<img class="q-media" src="${esc(current.image)}" alt="Recurso visual da questão" onerror="this.remove()">`:''}
    <div class="q-prompt">${esc(current.prompt)}</div>
    <div class="q-options">${current.options.map((o,i)=>`<button class="q-option" data-opt="${i}"><span>${'ABCDE'[i]}</span><b>${esc(o)}</b></button>`).join('')}</div>
    <div class="q-footer"><span>Fonte: ${esc(current.source)}</span><span>Questão ${current.id} de 500</span></div>`;
  $$('.q-option',card).forEach(btn=>btn.onclick=()=>answerQuestion(Number(btn.dataset.opt)));
}
function answerQuestion(selected){
  if(!current)return;
  saveAttempt(current,selected);
  $$('.q-option',$('#questionCard')).forEach((b,i)=>{b.disabled=true;if(i===current.answer)b.classList.add('correct');else if(i===selected)b.classList.add('wrong')});
  $('#questionCard').insertAdjacentHTML('beforeend',`<div class="explanation"><b>${selected===current.answer?'Resposta correta.':'Resposta incorreta.'}</b><br>${esc(current.explanation)}</div><div style="margin-top:14px;text-align:right"><button class="primary-btn" id="nextQ">Próxima questão →</button></div>`);
  $('#nextQ').onclick=()=>nextQuestion();
  updateDashboard();
}
$('#newQuestion').onclick=()=>nextQuestion();
$('#resetCycle').onclick=()=>{write(KEYS.seen,[]);toast('Ciclo de questões reiniciado.');nextQuestion();};
$$('.subject-card').forEach(b=>b.onclick=()=>{activeArea=b.dataset.area;$('#areaFilter').value=activeArea;subjectOptions();openPage('questoes');nextQuestion();});
$$('[data-action="adaptive"]').forEach(b=>b.onclick=()=>{activeArea='';openPage('questoes');nextQuestion(true);});

function updateDashboard(){
  const attempts=getAttempts(), total=attempts.length, correct=attempts.filter(x=>x.correct).length, wrong=total-correct;
  const pct=total?Math.round(correct/total*100):0;
  $('#progressPct').textContent=pct+'%';$('#correctCount').textContent=correct;$('#wrongCount').textContent=wrong;$('#answeredCount').textContent=total;
  $('#progressDonut').style.background=`conic-gradient(var(--cyan) 0 ${pct}%,#1c2b40 ${pct}% 100%)`;
  const weak=getWeakness();
  const defaults=[
    {topic:'Funções (Matemática)',score:32},{topic:'Química Orgânica',score:45},{topic:'Interpretação de Texto',score:52},{topic:'Filosofia',score:63},{topic:'Geografia (Mapas)',score:68}
  ];
  const list=(weak.length?weak.slice(0,5).map(x=>({topic:x.topic,score:100-x.score})):defaults);
  $('#weaknessBars').innerHTML=list.map(x=>`<div class="weak-row"><label>${esc(x.topic)}</label><div class="weak-track"><i style="width:${clamp(x.score,8,100)}%"></i></div><b>${x.score}%</b></div>`).join('');
  const recent=attempts.slice(-4).reverse();
  $('#recentAttempts').innerHTML=recent.length?recent.map(a=>`<div class="recent-item"><span class="recent-status ${a.correct?'ok':'bad'}">${a.correct?'✓':'×'}</span><div><b>${esc(a.subject)}</b><small>${esc(a.topic)}</small></div><time>${new Date(a.ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</time></div>`).join(''):
  ['Matemática','Ciências da Natureza','Linguagens','Ciências Humanas'].map((s,i)=>`<div class="recent-item"><span class="recent-status ${i===1?'bad':'ok'}">${i===1?'×':'✓'}</span><div><b>${s}</b><small>Comece a praticar para registrar seu histórico</small></div><time>—</time></div>`).join('');
}
updateDashboard();

function renderPerformance(){
  const attempts=getAttempts(), total=attempts.length, correct=attempts.filter(x=>x.correct).length, pct=total?Math.round(correct/total*100):0;
  const streak=calcStreak(attempts);
  $('#statsGrid').innerHTML=[
    ['Questões respondidas',total],['Aproveitamento',pct+'%'],['Acertos',correct],['Sequência de estudo',streak+' dias']
  ].map(x=>`<article class="stat-card"><small>${x[0]}</small><b>${x[1]}</b></article>`).join('');
  const rows=Object.keys(SUBJECTS).map(area=>{const a=attempts.filter(x=>x.area===area),p=a.length?Math.round(a.filter(x=>x.correct).length/a.length*100):0;return {area,p}});
  $('#areaPerformance').innerHTML=rows.map(x=>`<div class="perf-row"><span>${x.area}</span><div class="perf-track"><i style="width:${x.p}%"></i></div><b>${x.p}%</b></div>`).join('');
  renderChart();
}
function calcStreak(attempts){
  const days=new Set(attempts.map(a=>new Date(a.ts).toISOString().slice(0,10))); let n=0,d=new Date();
  while(days.has(d.toISOString().slice(0,10))){n++;d.setDate(d.getDate()-1)}return n;
}
function renderChart(){
  const c=$('#performanceChart'); if(!c)return; const ctx=c.getContext('2d'), attempts=getAttempts();
  const dark=!document.body.classList.contains('light'); const ink=dark?'#8290aa':'#64748b', line='#7164ff';
  ctx.clearRect(0,0,c.width,c.height);ctx.strokeStyle=ink;ctx.lineWidth=1;ctx.globalAlpha=.3;
  for(let y=40;y<c.height-25;y+=50){ctx.beginPath();ctx.moveTo(35,y);ctx.lineTo(c.width-15,y);ctx.stroke();}
  ctx.globalAlpha=1;
  const groups=[]; for(let i=0;i<8;i++){const part=attempts.slice(Math.max(0,attempts.length-(8-i)*10),attempts.length-(7-i)*10);groups.push(part.length?Math.round(part.filter(x=>x.correct).length/part.length*100):0);}
  ctx.strokeStyle=line;ctx.lineWidth=3;ctx.beginPath();
  groups.forEach((p,i)=>{const x=45+i*(c.width-75)/7,y=c.height-30-p*(c.height-70)/100;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();
  ctx.fillStyle=ink;ctx.font='12px sans-serif';groups.forEach((p,i)=>ctx.fillText(p+'%',40+i*(c.width-75)/7,c.height-10));
}

function renderFocus(){
  const weak=getWeakness(); const list=weak.length?weak.slice(0,9):[
    {topic:'Funções',subject:'Matemática',score:68,total:0},{topic:'Química Orgânica',subject:'Química',score:55,total:0},{topic:'Interpretação de texto',subject:'Português',score:48,total:0},
    {topic:'Geopolítica',subject:'Geografia',score:42,total:0},{topic:'Ecologia',subject:'Biologia',score:36,total:0},{topic:'Estatística',subject:'Matemática',score:30,total:0}
  ];
  $('#focusGrid').innerHTML=list.map(x=>`<article class="focus-card"><header><b>${esc(x.topic)}</b><span class="risk">prioridade</span></header><p>${esc(x.subject||'Revisão')} · ${x.total||'novo'} registro(s)</p><div class="focus-score">${x.score}%</div><button class="outline-btn small" data-focus="${esc(x.topic)}">Treinar este tema →</button></article>`).join('');
  $$('[data-focus]').forEach(b=>b.onclick=()=>{openPage('questoes');const topic=b.dataset.focus;const pool=QUESTIONS.filter(q=>q.topic===topic);if(pool.length){current=pool[Math.floor(Math.random()*pool.length)];renderQuestion();}});
}

function fillThemes(){
  $('#essayTheme').innerHTML=THEMES.map(t=>`<option value="${t.id}">${esc(t.title)}</option>`).join('');
  $('#themesGrid').innerHTML=THEMES.map(t=>`<article class="theme-card"><span class="axis">${esc(t.axis.toUpperCase())}</span><h3>${esc(t.title)}</h3><p>${esc(t.prompt)}</p><button class="outline-btn small" data-theme="${t.id}">Praticar tema →</button></article>`).join('');
  $$('[data-theme]').forEach(b=>b.onclick=()=>{$('#essayTheme').value=b.dataset.theme;openPage('redacao');$('#essayText').focus()});
}
fillThemes();
$('#essayText').addEventListener('input',()=>$('#wordCount').textContent=(($('#essayText').value.match(/\S+/g)||[]).length)+' palavras');

function essayScores(text){
  const words=text.match(/\S+/g)||[], count=words.length, paras=text.split(/\n\s*\n/).filter(x=>x.trim()).length;
  const accents=(text.match(/[áéíóúâêôãõç]/gi)||[]).length, connectors=(text.match(/\b(portanto|além disso|contudo|assim|desse modo|nesse sentido|porém|todavia|consequentemente|logo)\b/gi)||[]).length;
  const proposal=/\b(estado|governo|escola|sociedade|mídia|empresas|família|ministério|prefeitura)\b/i.test(text)&&/\b(deve|devem|promover|criar|ampliar|garantir|implementar|investir)\b/i.test(text);
  const c1=clamp(Math.round(80+Math.min(120,count*.5)+Math.min(20,accents)),40,200);
  const c2=clamp(Math.round(70+Math.min(110,count*.45)+(paras>=3?20:0)),40,200);
  const c3=clamp(Math.round(70+Math.min(80,count*.3)+Math.min(50,connectors*8)),40,200);
  const c4=clamp(Math.round(70+Math.min(90,connectors*12)+(paras>=4?30:0)),40,200);
  const c5=clamp(Math.round(60+(proposal?110:20)+Math.min(30,count*.08)),40,200);
  return [c1,c2,c3,c4,c5].map(x=>Math.round(x/20)*20);
}
$('#analyzeEssay').onclick=()=>{
  const text=$('#essayText').value.trim(); if(text.length<250){toast('Escreva pelo menos cerca de 250 caracteres para receber uma análise.');return}
  const loader=$('#essayLoader'), messages=['Avaliando estrutura e repertório.','Analisando coesão e progressão textual.','Verificando argumentação.','Estimando as cinco competências.','Preparando seu feedback.'];let i=0;
  loader.classList.remove('hidden');$('#loaderText').textContent=messages[0];
  const t=setInterval(()=>{$('#loaderText').textContent=messages[++i%messages.length]},600);
  setTimeout(()=>{clearInterval(t);loader.classList.add('hidden');showEssayResult(text)},2800);
};
function showEssayResult(text){
  const scores=essayScores(text), total=scores.reduce((a,b)=>a+b,0), words=(text.match(/\S+/g)||[]).length;
  const comps=['Domínio da norma-padrão','Compreensão da proposta','Seleção e organização de argumentos','Coesão textual','Proposta de intervenção'];
  const weak=scores.map((s,i)=>({s,i})).sort((a,b)=>a.s-b.s)[0].i;
  $('#essayResult').innerHTML=`<div class="score-card"><span class="eyebrow">NOTA ESTIMADA</span><div class="score-circle" style="background:conic-gradient(#5f7cff 0 ${total/10}%,#1e2b42 ${total/10}% 100%)"><b>${total}</b></div><p>${words} palavras analisadas</p></div>
  <div class="competencies">${scores.map((s,i)=>`<div class="comp-row"><span>C${i+1}</span><div><i style="width:${s/2}%"></i></div><b>${s}</b></div>`).join('')}</div>
  <div class="essay-notes"><article><h4>Ponto forte</h4><p>${scores[3]>=160?'Boa presença de mecanismos de coesão e encadeamento.':'Há uma estrutura identificável e espaço para tornar a progressão ainda mais clara.'}</p></article>
  <article><h4>Prioridade de melhoria — C${weak+1}</h4><p>${[
    'Revise concordância, pontuação e escolha vocabular. Frases mais controladas ajudam a reduzir desvios.',
    'Garanta que todos os parágrafos respondam diretamente ao recorte do tema e evite tangenciar a proposta.',
    'Aprofunde a relação entre repertório, causa, consequência e tese; evite apenas listar argumentos.',
    'Use conectivos variados e retome ideias de forma clara entre frases e parágrafos.',
    'Apresente agente, ação, meio, finalidade e detalhamento na proposta de intervenção.'
  ][weak]}</p></article><article><h4>Observação</h4><p>A nota é uma estimativa automática para estudo e não substitui a correção oficial do ENEM.</p></article></div>`;
  const essays=read(KEYS.essays,[]);essays.push({ts:Date.now(),total,scores,words,theme:Number($('#essayTheme').value)});write(KEYS.essays,essays.slice(-50));
}

const defaultVideos=[
  {title:'Como organizar uma rotina de estudos',subject:'Planejamento',url:'https://www.youtube.com/'},
  {title:'Estratégias para interpretação de texto',subject:'Linguagens',url:'https://www.youtube.com/'},
  {title:'Funções: leitura de gráficos e modelagem',subject:'Matemática',url:'https://www.youtube.com/'}
];
function getVideos(){return read(KEYS.videos,defaultVideos)}
function renderVideos(){
  const v=getVideos();$('#videoGrid').innerHTML=v.length?v.map(x=>`<article class="panel video-card"><div class="video-thumb">▶</div><div class="video-body"><b>${esc(x.title)}</b><small>${esc(x.subject)}</small><a href="${esc(x.url)}" target="_blank" rel="noopener">Assistir videoaula →</a></div></article>`).join(''):'<div class="panel">Nenhuma videoaula publicada.</div>';
}
$('#addVideo').onclick=()=>{
  const title=$('#videoTitle').value.trim(),subject=$('#videoSubject').value.trim(),url=$('#videoUrl').value.trim();
  if(!title||!subject||!/^https?:\/\//i.test(url)){toast('Preencha título, matéria e uma URL válida.');return}
  const v=getVideos();v.unshift({title,subject,url});write(KEYS.videos,v);$('#videoTitle').value=$('#videoSubject').value=$('#videoUrl').value='';toast('Videoaula adicionada.');renderAdmin();
};

function getFeedback(){return read(KEYS.feedback,[])}
$('#sendFeedback').onclick=()=>{
  const message=$('#feedbackText').value.trim(),rating=Number($('#feedbackRating').value);if(message.length<5){toast('Escreva um pouco mais sobre sua experiência.');return}
  const f=getFeedback();f.unshift({message,rating,ts:Date.now(),name:'Aluno NEXO'});write(KEYS.feedback,f.slice(0,100));$('#feedbackText').value='';toast('Feedback enviado. Obrigado!');renderFeedback();
};
function feedbackHTML(f){return f.map(x=>`<div class="feedback-entry"><span class="mini-avatar">${esc((x.name||'A')[0])}</span><div><b>${esc(x.name||'Aluno')} <span class="stars">${'★'.repeat(x.rating)}${'☆'.repeat(5-x.rating)}</span></b><p>${esc(x.message)}</p><small>${new Date(x.ts).toLocaleDateString('pt-BR')}</small></div></div>`).join('')}
function renderFeedback(){const f=getFeedback();$('#feedbackList').innerHTML=f.length?feedbackHTML(f):'<p class="muted">Ainda não há feedbacks salvos neste dispositivo.</p>'}
function renderAdmin(){const f=getFeedback();$('#adminFeedbacks').innerHTML=f.length?feedbackHTML(f):'<p class="muted">Nenhum feedback recebido ainda.</p>'}

function renderBank(search=''){
  const s=search.toLowerCase().trim();const list=QUESTIONS.filter(q=>!s||[q.area,q.subject,q.topic,q.prompt].join(' ').toLowerCase().includes(s)).slice(0,120);
  $('#bankList').innerHTML=list.map(q=>`<button class="bank-row q-option" data-bank="${q.id}"><b>#${q.id}</b><span><b>${esc(q.subject)}</b><small>${esc(q.topic)}</small></span><small>${esc(q.area)}</small><small>Nível ${q.difficulty}</small></button>`).join('');
  $$('[data-bank]').forEach(b=>b.onclick=()=>{current=QUESTIONS.find(q=>q.id===Number(b.dataset.bank));openPage('questoes');renderQuestion()});
}
$('#bankSearch').addEventListener('input',e=>renderBank(e.target.value));

$$('[data-sim]').forEach(b=>b.onclick=()=>startSim(Number(b.dataset.sim)));
function startSim(count){
  const ids=shuffle(QUESTIONS).slice(0,count).map(q=>q.id);sim={count,ids,index:0,correct:0,start:Date.now()};$('#simStatus').innerHTML=`<div class="sim-running"><b>Simulado iniciado: ${count} questões</b><div class="sim-progress"><i style="width:0%"></i></div><p>Abra “Resolver Questões” para responder. O modo simulado selecionará as questões desta sessão.</p><button class="primary-btn" id="goSim">Começar agora →</button></div>`;$('#goSim').onclick=()=>{current=QUESTIONS.find(q=>q.id===sim.ids[0]);openPage('questoes');renderQuestion();};toast('Simulado preparado.');
}

function renderRanking(){
  const my=getAttempts().filter(x=>x.correct).length;
  const rows=[['Marina S.',412],['Carlos R.',389],['Você',my],['Ana P.',276],['João L.',248]].sort((a,b)=>b[1]-a[1]);
  $('#rankingList').innerHTML=rows.map((x,i)=>`<div class="rank-row"><span class="rank-pos">#${i+1}</span><b>${x[0]}</b><span>${x[1]} acertos</span></div>`).join('');
}
renderRanking();renderVideos();renderBank();renderFeedback();renderAdmin();

$('#globalSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){openPage('banco');$('#bankSearch').value=e.target.value;renderBank(e.target.value)}});

window.addEventListener('resize',()=>{if(innerWidth>760)$('.sidebar').classList.remove('open')});
nextQuestion();
})();