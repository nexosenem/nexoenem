import { chromium } from 'playwright';

const BASE=process.env.NEXO_SMOKE_URL||'http://127.0.0.1:4173/';
const failures=[];
const browser=await chromium.launch({headless:true});

try{
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'pt-BR',serviceWorkers:'block'});
  const page=await context.newPage();
  await page.goto(BASE+'?phase1_resilience=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof persistStudySession==='function'&&typeof persistEssayDraftLocal==='function',{timeout:12000});

  const result=await page.evaluate(()=>{
    const uid='00000000-0000-4000-8000-000000000001';
    state.user={id:uid,email:'phase1@nexo.local'};
    state.session={
      queue:[{id:101}],
      index:0,
      size:1,
      mode:'adaptive',
      area:'Matemática',
      subject:'Matemática',
      topic:'Porcentagem',
      paceAlerts:{}
    };
    state.current={id:101};
    state.selectedOption=2;
    state.questionStartedAt=Date.now()-42000;
    persistStudySession();
    const saved=readPersistedStudySession();

    const essay=document.querySelector('#essayText');
    const theme=document.querySelector('#essayTheme');
    if(theme&&[...theme.options].some(o=>o.value==='custom'))theme.value='custom';
    const customTheme=document.querySelector('#customEssayTheme');
    const customPrompt=document.querySelector('#customEssayPrompt');
    if(customTheme)customTheme.value='Tema de teste';
    if(customPrompt)customPrompt.value='Proposta de teste';
    if(essay)essay.value='Rascunho resiliente do NEXO com conteúdo suficiente para validar a persistência local.';
    persistEssayDraftLocal();
    const draft=JSON.parse(localStorage.getItem('nexo-essay-draft-v1:'+uid)||'null');

    const critical=nexoHasCriticalUnsavedWork();

    return {
      session:{
        exists:Boolean(saved),
        questionId:saved?.currentQuestionId,
        option:saved?.selectedOption,
        elapsed:saved?.questionElapsedSeconds
      },
      essay:{
        exists:Boolean(draft),
        text:draft?.essay_text||'',
        title:draft?.theme_title||''
      },
      critical
    };
  });

  if(!result.session.exists)failures.push('session-not-persisted');
  if(result.session.questionId!==101)failures.push('session-question-id');
  if(result.session.option!==2)failures.push('session-selected-option');
  if(!(result.session.elapsed>=40&&result.session.elapsed<=45))failures.push('session-elapsed-time');
  if(!result.essay.exists||!result.essay.text.includes('Rascunho resiliente'))failures.push('essay-draft');
  if(!result.critical)failures.push('critical-work-detection');

  console.log(JSON.stringify({name:'NEXO Phase 1 resilience smoke',result,failures},null,2));
  await context.close();
}finally{
  await browser.close();
}

if(failures.length)throw new Error('Resilience smoke failed: '+failures.join(', '));
