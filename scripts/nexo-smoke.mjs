import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const failures=[];
const passes=[];
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const exists=file=>fs.existsSync(path.join(root,file));
const ok=(name,detail='')=>passes.push({name,detail});
const fail=(name,detail='')=>failures.push({name,detail});
const assert=(cond,name,detail='')=>cond?ok(name,detail):fail(name,detail);

const index=read('index.html');
const sw=read('sw.js');
const app=read('app.js');
const compat=read('assets/nexo-runtime-compat.js');
const referenceUi=read('assets/nexo-reference-v2.js');
const referenceCss=read('assets/nexo-reference-v2.css');
const experienceV14=read('assets/nexo-v14-experience.js');
const uiV15=read('assets/nexo-v15-ui.js');
const cssV15=read('assets/nexo-v15-ui.css');
const liveSmoke=read('scripts/nexo-live-smoke.mjs');
const headers=read('_headers');

const contentDir=path.join(root,'assets','conteudo');
const contentFiles=fs.readdirSync(contentDir).filter(name=>name.endsWith('.html')).sort();
const invalidContent=[];
for(const name of contentFiles){
  const source=fs.readFileSync(path.join(contentDir,name),'utf8');
  const checks={
    doctype:/<!doctype html>/i.test(source),
    lang:/<html\s+lang="pt-BR"/i.test(source),
    viewport:/name="viewport"/i.test(source),
    title:/<title>[^<]+<\/title>/i.test(source),
    train:/nexo-content-train/.test(source),
    responsive:/@media\(max-width:600px\)/.test(source)
  };
  if(Object.values(checks).some(v=>!v))invalidContent.push(name+':'+Object.entries(checks).filter(([,v])=>!v).map(([k])=>k).join(','));
}
assert(contentFiles.length>=126,'Biblioteca autoral mantém pelo menos 126 materiais HTML',String(contentFiles.length));
assert(invalidContent.length===0,'Materiais autorais têm HTML, viewport, responsividade e CTA de treino',invalidContent.join(' | '));

assert(!index.includes('\\n'),'HTML sem \\n literal');
assert((index.match(/id="viewerNote"/g)||[]).length===1,'viewerNote único');

const ids=[...index.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
const dupIds=[...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];
assert(dupIds.length===0,'IDs HTML únicos',dupIds.join(', '));

const refs=[...index.matchAll(/(?:src|href)="(\.\/[^"?#]+)(?:[?#][^"]*)?"/g)].map(m=>m[1]);
const missingRefs=[...new Set(refs)].filter(ref=>!exists(ref.replace(/^\.\//,'')));
assert(missingRefs.length===0,'Assets locais do index existem',missingRefs.join(', '));

const localScripts=[...index.matchAll(/<script\s+src="(\.\/[^"?#]+\.js)(?:\?[^"]*)?"[^>]*><\/script>/g)].map(m=>m[1].replace(/^\.\//,''));
const localStyles=[...index.matchAll(/<link\b[^>]*href="(\.\/[^"?#]+\.css)(?:\?[^"]*)?"[^>]*>/g)].map(m=>m[1].replace(/^\.\//,''));
const literalAssetRefs=[];
for(const file of [...new Set(localScripts)]){
  const src=read(file);
  for(const match of src.matchAll(/\.\/assets\/[A-Za-z0-9_./-]+\.(?:avif|webp|png|jpe?g|svg|gif|woff2?|mp4|webm|pdf)/gi)){
    const raw=match[0];
    literalAssetRefs.push({from:file,raw,resolved:raw.replace(/^\.\//,'')});
  }
}
for(const file of [...new Set(localStyles)]){
  const src=read(file);
  for(const match of src.matchAll(/url\(\s*['"]?([^)'"]+)['"]?\s*\)/gi)){
    const raw=String(match[1]||'').trim();
    if(!raw||/^(?:data:|https?:|\/\/)/i.test(raw)||raw.includes('$'))continue;
    if(!/\.(?:avif|webp|png|jpe?g|svg|gif|woff2?|mp4|webm|pdf)(?:[?#].*)?$/i.test(raw))continue;
    const clean=raw.split(/[?#]/)[0];
    const resolved=path.normalize(path.join(path.dirname(file),clean));
    literalAssetRefs.push({from:file,raw,resolved});
  }
}
const missingLiteralAssets=literalAssetRefs.filter(item=>!exists(item.resolved));
assert(missingLiteralAssets.length===0,'Assets literais de JS/CSS existem',missingLiteralAssets.map(x=>x.from+' -> '+x.raw).join(' | '));
const syntaxErrors=[];
for(const file of [...new Set(localScripts), 'sw.js']){
  try{new Function(read(file));}
  catch(err){syntaxErrors.push(file+': '+err.message);}
}
assert(syntaxErrors.length===0,'JavaScript parseável',syntaxErrors.join(' | '));

try{JSON.parse(read('manifest.webmanifest'));ok('Manifest JSON válido');}
catch(err){fail('Manifest JSON válido',err.message);}

const shell=[...sw.matchAll(/['"](\.\/[^'"]+)['"]/g)].map(m=>m[1].split('?')[0].replace(/^\.\//,''));
const missingShell=[...new Set(shell)].filter(file=>file!==''&&!exists(file));
assert(missingShell.length===0,'Assets do Service Worker existem',missingShell.join(', '));

const expectedV13=[
  'nexo-v13-hardening.js','nexo-v13-core.js','nexo-v13-planner.js','nexo-v13-questions.js',
  'nexo-v13-essay.js','nexo-v13-recall.js','nexo-v13-content.js','nexo-v13-repertoire.js',
  'nexo-v13-calendar.js','nexo-v13-tutor.js','nexo-v13-search-errors.js','nexo-v13-ui.js'
];
const missingV13=expectedV13.filter(name=>!index.includes(name));
assert(missingV13.length===0,'Todos os módulos V13 conectados',missingV13.join(', '));

const missingV13Cache=expectedV13.filter(name=>!sw.includes(name));
assert(missingV13Cache.length===0,'Todos os módulos V13 no PWA',missingV13Cache.join(', '));

const order=[
  index.indexOf('nexo-v13-hardening.js'),
  index.indexOf('./app.js'),
  index.indexOf('nexo-v13-core.js'),
  index.indexOf('nexo-v13-ui.js')
];
assert(order.every(x=>x>=0)&&order.every((x,i)=>i===0||x>order[i-1]),'Ordem segura de carregamento V13',JSON.stringify(order));

const emptyImages=[...index.matchAll(/<img[^>]*\ssrc=""[^>]*>/g)].map(m=>m[0].slice(0,120));
assert(emptyImages.length===0,'Sem imagens com src vazio',emptyImages.join(' | '));

const badCollectionSelectors=[...app.matchAll(/(?<!\$)\$\([^()\n]*\)\.(forEach|find|filter)\s*\(/g)].map(m=>m[0]);
assert(badCollectionSelectors.length===0,'Seletores de coleção usam $$',badCollectionSelectors.join(' | '));
assert(!/Element\.prototype\.forEach/.test(compat),'Sem monkey patch em Element.prototype.forEach');
assert(index.includes('nexo-reference-v2.css')&&index.includes('nexo-reference-v2.js'),'Interface de referência conectada');
assert(!index.includes('nexo-minimal-v1.css'),'Camada minimal antiga desativada');
assert(sw.includes('nexo-reference-v2.css')&&sw.includes('nexo-reference-v2.js'),'Interface de referência no PWA');
assert(index.includes('nexo-v14-experience.js'),'Experiência V14 conectada');
assert(sw.includes('nexo-v14-experience.js'),'Experiência V14 no PWA');
assert(experienceV14.includes('v14LearningLoop')&&experienceV14.includes('Diagnóstico NEXO')&&experienceV14.includes('ENEM Real'),'Ciclo de aprendizagem/diagnóstico V14 publicados');
assert(index.includes('id="realExamModal"')&&index.includes('data-real-exam-day="1"')&&index.includes('data-real-exam-day="2"'),'ENEM Real oferece escolha de Dia 1 e Dia 2 sem poluir a grade de simulados');
assert(app.includes("['Linguagens','Ciências Humanas']")&&app.includes("['Ciências da Natureza','Matemática']")&&app.includes('examDay:dayNumber')&&app.includes('size:90'),'ENEM Real preserva 45+45 áreas oficiais por dia');
assert(app.includes('const areaList=Array.isArray(filters.areas)')&&app.includes('blocks.push(...ordered.slice(0,quota))'),'Sessões com múltiplas áreas mantêm cotas balanceadas antes de montar a fila');
assert(app.includes("document.querySelectorAll('[data-real-exam-day]')")&&app.includes("document.querySelectorAll('[data-sim-area], [data-sim-mode]')"),'Bindings de Simulados usam coleções reais e não quebram com múltiplos botões');
assert(index.includes('nexo-v15-ui.css')&&index.includes('nexo-v15-ui.js'),'Experiência V15 conectada');
assert(index.includes('<meta name="nexo-build" content="V16.3.0">')&&app.includes("const NEXO_BUILD='V16.3.0'"),'Build V16.3 é verificável no HTML e no runtime');
assert(liveSmoke.includes('expectedBuild')&&liveSmoke.includes('hasBuild')&&liveSmoke.includes("first.build!==expectedBuild"),'Smoke público rejeita deploy antigo mesmo com HTTP 200');
assert(sw.includes('nexo-v15-ui.css')&&sw.includes('nexo-v15-ui.js'),'Experiência V15 no PWA');
assert(uiV15.includes('v15QuestionModes')&&uiV15.includes('v15EssayTabs')&&uiV15.includes('v15-voice-search'),'V15 mantém modos de questão, navegação de redação e busca por voz progressiva');
assert(cssV15.includes('NEXO V15')&&cssV15.includes('.nrx-mob-hero-media:before')&&cssV15.includes('.v15-question-modes'),'Design system V15 publicado');
assert(app.includes('TEXTO-BASE')&&app.includes('RECURSO VISUAL ORIGINAL')&&app.includes('COMANDO'),'Questão preserva texto-base, recurso visual e comando');
assert(app.indexOf('TEXTO-BASE')<app.indexOf('RECURSO VISUAL ORIGINAL')&&app.indexOf('RECURSO VISUAL ORIGINAL')<app.indexOf('COMANDO'),'Ordem pedagógica texto → visual → comando preservada');
assert(app.includes("const requiredVisual=likelyNeedsQuestionVisual(q)&&!hasAccessibleVisualDescription(q)")&&app.includes("q.external_media_files?.length || requiredVisual"),'Questão visual mantém guarda pedagógica mesmo quando a recuperação externa falha');
assert(app.includes('function likelyNeedsQuestionVisual')&&app.includes('async function ensureExternalQuestionAssets'),'Recuperação de mídia ausente por semântica publicada');
assert(app.includes("https://api.enem.dev/v1/exams/")&&app.includes('externalVisualCache'),'Fallback ENEM usa endpoint público com cache local');
assert(app.includes('function mountVisualGallery')&&app.includes('q.external_media_files'),'Questões com múltiplas imagens são suportadas');
assert(app.includes('q.option_media')&&app.includes('q-option-media'),'Alternativas com recurso visual são suportadas');
assert(app.includes("genericExplanation=/^Gabarito oficial:")&&app.includes("explanationStatus:hasEditorialExplanation?'editorial':'pending'"),'Placeholder de gabarito não é tratado como resolução editorial');

const renderVisualBlock=app.slice(app.indexOf('async function renderVisual(q)'),app.indexOf('function questionStudyText(q)'));
assert(renderVisualBlock.indexOf('if(await loadStoredVisual(q)) return true;')>=0&&renderVisualBlock.indexOf('if(await loadStoredVisual(q)) return true;')<renderVisualBlock.indexOf('await ensureMediaPath(q);'),'Mídia dedicada é carregada antes do fallback Base64 legado');
assert(renderVisualBlock.includes("q.external_media_files?.length && await loadExternalVisual(q)"),'Mídia recuperada externamente evita round-trip desnecessário');
assert(cssV15.includes('.q-media-gallery')&&cssV15.includes('.q-option-media'),'Design V15 suporta galeria e alternativas visuais');
assert(uiV15.includes("typeof openProfessorNexo==='function'")&&uiV15.includes("$('#niaButton')?.click()"),'Professor Nexo contextual possui abertura direta e fallback');
const fetchQuestionsBlock=app.slice(app.indexOf('async function fetchQuestions(filters={})'),app.indexOf('async function fetchQuestionsResilient'));
assert(fetchQuestionsBlock.includes('media_path'),'Fila leve conhece caminho de mídia sem buscar o blob visual');
assert(!fetchQuestionsBlock.includes('data_uri'),'Filas de questões não carregam Base64 antecipadamente');
assert(app.includes('function hasAccessibleVisualDescription')&&app.includes('function questionVisualCanBeResolved'),'Integridade visual filtra questões irresolvíveis sem apagar descrições acessíveis');
assert(app.includes('const transcribedTable=')&&app.includes('lineBreaks>=8'),'Quadros/tabelas integralmente transcritos podem ser resolvidos sem imagem ornamental');
assert(app.includes('const nonVisualQuadro=')&&app.includes("subject==='artes'"),'Detector visual distingue figura/quadro ambíguos de recursos realmente exibidos');
assert(app.includes("String([q?.base_text,q?.prompt].filter(Boolean).join('\\n'))"),'Descrição visual acessível preserva texto-base, enunciado e estrutura de linhas importada');
assert(!app.includes('media_type,source_pdf_url,source_page,media_crop'),'Todas as rotas de questão completa preservam media_path');
assert(fetchQuestionsBlock.includes('if(filters.visualOnly)')&&fetchQuestionsBlock.includes('likelyNeedsQuestionVisual(x)'),'Modo visual considera mídia nativa e questões ENEM recuperáveis, não apenas media_type');
assert(fetchQuestionsBlock.includes("client.rpc('get_study_question_candidates_v2'")&&fetchQuestionsBlock.includes('p_limit:candidateLimit')&&fetchQuestionsBlock.includes('candidateLimit=Math.min(160,Math.max(30,Math.ceil(requested*1.5)))'),'Treinos usam candidatos leves, aleatórios e proporcionais ao tamanho da sessão');
assert(app.includes("const hasSeenMetadata=all.length>0&&all.every(x=>typeof x._seen==='boolean')"),'Sessões reaproveitam metadado de visto e evitam consulta extra de histórico');
assert(app.includes('LEARNING_TOPIC_ALIASES')&&app.includes('function materialTrainingTopic'),'Taxonomia separa aliases editoriais de fallback amplo de treino');
assert(app.includes("state.topicMastery.get(String(trainingTopic))"),'Domínio de questões reaproveita tópico de treino sem fundir progresso editorial');
assert(app.includes("normalizeTextKey(r.topic||'')===normalizeTextKey(trainingTopic)"),'Prioridade do Radar reconhece o tópico de treino equivalente');
assert(app.includes("explanationHeading:hasEditorialExplanation?'Por que essa é a resposta?':'Gabarito confirmado'"),'Resposta distingue resolução validada de gabarito em revisão');
assert(app.includes("NEXO_ESSAY_RUBRIC_VERSION='enem-2026'")&&app.includes('function toEnemCompetencyBand'),'Estimador de redação usa rubrica ENEM 2026 em faixas de competência');
assert(app.includes('scores.map(toEnemCompetencyBand)')&&app.includes('function essayEstimateRange'),'Redação usa níveis de 40 pontos e mostra faixa orientativa');
assert(app.includes('analysis_version:NEXO_ESSAY_ANALYSIS_VERSION')&&app.includes('rubric_version:NEXO_ESSAY_RUBRIC_VERSION'),'Histórico de redação registra versões da análise e rubrica');
assert(app.includes("client.rpc('get_admin_explanation_queue'")&&app.includes("client.rpc('admin_set_question_explanation'"),'Fluxo editorial Admin usa RPCs protegidos');
assert(index.includes('id="adminExplanationQueue"')&&index.includes('id="adminExplanationModal"'),'Fila e editor de resolução editorial publicados no Admin');
assert(index.includes('id="adminVisualRepairQueue"')&&index.includes('id="adminVisualRepairModal"'),'Fila e editor de restauração visual publicados no Admin');
assert(app.includes("client.rpc('get_admin_visual_repair_queue_v2'")&&app.includes("client.rpc('admin_set_question_media_path'"),'Fluxo Admin restaura mídia apenas por RPC protegido');
assert(app.includes('await uploadToCloudinary(file')&&app.includes('loadAdminVisualRepairQueue()'),'Restauração visual aceita upload assinado e atualiza a fila');
assert(index.includes('id="adminVisualRepairSource"')&&app.includes("String(row.source_pdf_url||'')")&&app.includes("source.startsWith('https://download.inep.gov.br/')")&&cssV15.includes('.admin-source-link'),'Restauração visual separa referência legível da prova oficial do Inep');
assert(cssV15.includes('.admin-visual-repair-panel')&&cssV15.includes('.admin-visual-repair-sheet'),'Restauração visual segue o design system V15');
assert(cssV15.includes('.answer-editorial-status')&&cssV15.includes('.admin-editorial-row'),'Estados editoriais seguem o design system V15')
assert(cssV15.includes('Tablet bridge: preserve desktop navigation')&&cssV15.includes('width:calc(100vw - 176px)!important'),'Breakpoint 761–900 mantém desktop sem overflow horizontal');
assert(app.includes("client.rpc('get_question_catalog_items_v2'"),'Banco usa catálogo leve com status de integridade visual');
assert(app.includes("q.visual_status!=='repair'"),'Banco oculta questões visuais em restauração');
assert(app.includes("if(!questionVisualCanBeResolved(data))"),'Abertura avulsa bloqueia questão visual irresolúvel');
assert((app.match(/\.filter\(questionVisualCanBeResolved\)/g)||[]).length>=4,'Retomada/revisões removem itens visuais irresolúveis')
assert(app.includes('Este recurso visual é necessário para responder.')&&app.includes("b.disabled=true"),'Questão visual quebrada bloqueia resposta em vez de penalizar o aluno');
assert(cssV15.includes('.visual-accessible-fallback')&&cssV15.includes('.q-option:disabled'),'UI V15 diferencia descrição acessível de visual quebrado');
assert(uiV15.includes('v15AdvancedQuestionSetup')&&uiV15.includes('v15LibraryFilters'),'Filtros avançados V15 usam divulgação progressiva');
assert(referenceCss.includes('body.nexo-reference-ui:not(.nrx-context-open) #nexoContextBar')&&referenceCss.includes('display:none!important'),'Guia contextual fica recolhido por padrão e abre sob demanda');
assert(referenceCss.includes('body.nexo-reference-ui #v13SearchButton')&&referenceCss.includes('#v15TutorFab'),'Busca/Tutor flutuantes redundantes ficam fora da camada visual');
assert(referenceCss.includes('body.nexo-reference-ui #v15QuestionModes')&&referenceCss.includes('body.nexo-reference-ui #v15EssayTabs'),'Nós compatíveis duplicados permanecem montados, mas não visíveis');
assert(referenceCss.includes('#sessionSetup.v15-progressive-setup')&&uiV15.includes("setup.classList.add('v15-progressive-setup')"),'Configuração de Questões usa divulgação progressiva sem perder controles');
assert(referenceUi.includes("const advanced=$('#v15AdvancedQuestionSetup',setup)")&&referenceUi.includes("advanced.open=true"),'Treino por assunto abre os controles avançados sob demanda')
assert(referenceUi.includes('function addDesktopCrown()')&&referenceUi.includes("crown.addEventListener('click',openStore)"),'Coroa desktop reutiliza a mesma Loja NEXO do mobile');
assert(uiV15.includes('v15MaterialTabs')&&uiV15.includes('data-v15-material-tab'),'Biblioteca V15 oferece navegação simples sem remover filtros avançados');
assert(uiV15.includes('syncSidebarAvatar')&&uiV15.includes('data-nrx-target'),'Avatar real e recursos secundários seguem o sistema visual V15');
assert(app.includes('scheduleNextVisualPrefetch')&&app.includes('prefetchVisualAsset')&&app.includes('requestIdleCallback'),'Questões visuais pré-carregam somente o próximo recurso em tempo ocioso');
assert(app.includes('const recoverableExternal=!q.media_type&&!q.media_path&&likelyNeedsQuestionVisual(q)')&&app.includes('await ensureExternalQuestionAssets(q)'),'Pré-carregamento alcança também o próximo visual ENEM recuperável');


const badReferenceCollections=[...referenceUi.matchAll(/(?<!\$)\$\([^()\n]*\)\.(forEach|find|filter|map)\s*\(/g)].map(m=>m[0]);
assert(badReferenceCollections.length===0,'Seletores de coleção da interface de referência usam $',badReferenceCollections.join(' | '));
assert(/\/index\.html[\s\S]*Cache-Control: no-cache/.test(headers),'HTML força revalidação de cache');
assert(/\/sw\.js[\s\S]*Cache-Control: no-cache/.test(headers)&&/Service-Worker-Allowed: \//.test(headers),'Service Worker sem cache velho');

assert(/function\s+logClientError\s*\(/.test(app),'Telemetria de erro disponível');
assert(/serviceWorker\.register\(['"]\.\/sw\.js['"]\)/.test(app),'Service Worker registrado');
assert(/window\.addEventListener\(['"]online['"]/.test(app)&&/window\.addEventListener\(['"]offline['"]/.test(app),'Tratamento online/offline presente');
assert(index.includes('nexo-v13-search-errors.js'),'Busca universal publicada');
assert(index.includes('nexo-v13-hardening.js'),'Hardening publicado');
assert(/function\s+buildSiteSearchActionResults\s*\(/.test(app),'Busca interna por áreas/funções disponível');
assert(/function\s+nexoPercentTone\s*\(/.test(app),'Classificação visual de porcentagens disponível');

const allScriptSource=[...new Set(localScripts)].map(file=>read(file)).join('\n');
const staticButtons=[...index.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)].map(m=>{
  const attrs=m[1]||'';
  const id=attrs.match(/\bid="([^"]+)"/i)?.[1]||'';
  const dataPage=attrs.match(/\bdata-page="([^"]+)"/i)?.[1]||'';
  const disabled=/\bdisabled\b/i.test(attrs);
  const submit=/\btype="submit"/i.test(attrs);
  const inline=/\bonclick\s*=/i.test(attrs);
  const dataAttrs=[...attrs.matchAll(/\b(data-[\w-]+)(?:="([^"]*)")?/gi)].map(x=>x[1]);
  return {attrs,id,dataPage,disabled,submit,inline,dataAttrs};
});
const deadStaticButtons=staticButtons.filter(btn=>{
  if(btn.disabled||btn.submit||btn.inline)return false;
  if(btn.dataPage&&/\$\$\('\[data-page\]'\)/.test(allScriptSource))return false;
  if(btn.id){
    const refs=['#'+btn.id,"getElementById('"+btn.id+"')",'getElementById("'+btn.id+'")'];
    if(refs.some(ref=>allScriptSource.includes(ref)))return false;
  }
  for(const attr of btn.dataAttrs){
    const camel=attr.replace(/^data-/,'').replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
    if(allScriptSource.includes('['+attr+']')||allScriptSource.includes('dataset.'+camel))return false;
  }
  return true;
});
assert(deadStaticButtons.length===0,'Todos os controles estáticos visíveis têm ação',deadStaticButtons.map(x=>x.id||x.attrs.slice(0,80)).join(' | '));

const legacyNav=index.match(/<nav class="side-nav">([\s\S]*?)<\/nav>/)?.[1]||'';
const legacyButtons=[...legacyNav.matchAll(/<button\b([^>]*)>/gi)].map(m=>m[1]);
const legacyPages=legacyButtons.filter(attrs=>!/retired-video-feature/.test(attrs)).map(attrs=>attrs.match(/data-page="([^"]+)"/)?.[1]).filter(Boolean);
const missingReferenceRoutes=[...new Set(legacyPages)].filter(page=>!referenceUi.includes("go('"+page+"')")&&!referenceUi.includes('go("'+page+'")'));
assert(missingReferenceRoutes.length===0,'Todas as rotas antigas continuam acessíveis na interface nova',missingReferenceRoutes.join(', '));
assert(referenceUi.includes("$('#openNexoFromMenu')?.click()"),'Professor Nexo preservado na navegação nova');
assert(referenceUi.includes('nrx-profile-tools')&&referenceUi.includes('nrx-side-more-panel'),'Recursos secundários preservados sem poluir a navegação');

assert(!/id="desktopSidebarToggle"[^>]*onclick=/.test(index),'Toggle da sidebar não possui handler duplicado');
assert(!app.includes("  $('.q-option',$('#questionCard')).forEach"),'Questões usam coleção ao iterar alternativas');
assert(!referenceUi.includes("const targets=['#profileName','#profileAdminShortcut','#progressPct','#mobileProgressPct','#weaknessBars','#mobileRecent','#recentAttempts','#studyWorkspace','#inicio','#app']"),'Observer da interface não observa a própria árvore inteira');
assert(referenceUi.includes('function scheduleReferenceSync()'),'Sincronização da interface é agrupada por frame');
assert(referenceUi.includes("e.stopPropagation();")&&referenceUi.includes("if(page==='more')")&&referenceUi.includes("$('#moreMobile')?.click()"),'Botão Mais móvel abre o menu completo sem propagar o clique');
assert(index.includes('id="contextClose"'),'Botão fechar do contexto publicado');
assert(/function\s+closeNexoContextBar\s*\(/.test(app),'Ação fechar do contexto disponível');

console.log('\nNEXO Production Smoke');
console.log('=====================');
for(const p of passes)console.log('PASS',p.name,p.detail?'- '+p.detail:'');
for(const f of failures)console.error('FAIL',f.name,f.detail?'- '+f.detail:'');
console.log('\nResultado:',passes.length+' checks OK, '+failures.length+' falha(s).');

if(failures.length)process.exit(1);
