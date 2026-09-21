/* NEXO V13 · production hardening and in-browser diagnostics */
(function(){
  const VERSION='2026.09.21-hardening-1';
  const REQUIRED=['v13State','v13LoadPrefs','v13LoadBrief','v13OpenRecall','v13OpenSearch','v13LoadErrors','v13Boot'];
  const ASSETS=[
    './assets/nexo-v13.css','./assets/nexo-v13-core.js','./assets/nexo-v13-planner.js',
    './assets/nexo-v13-questions.js','./assets/nexo-v13-essay.js','./assets/nexo-v13-recall.js',
    './assets/nexo-v13-content.js','./assets/nexo-v13-repertoire.js','./assets/nexo-v13-calendar.js',
    './assets/nexo-v13-tutor.js','./assets/nexo-v13-search-errors.js','./assets/nexo-v13-ui.js',
    './manifest.webmanifest','./sw.js'
  ];
  const dedupe=new Map();

  function report(area,error,code){
    const message=String(error?.message||error||'unknown').slice(0,500);
    const key=code+'|'+message;
    const now=Date.now(),last=dedupe.get(key)||0;
    if(now-last<30000)return;
    dedupe.set(key,now);
    try{
      if(typeof logClientError==='function')logClientError(area,new Error(message),code);
      else console.warn('[NEXO hardening]',code,message);
    }catch(_){}
  }

  window.addEventListener('error',event=>{
    const target=event.target;
    if(target&&target!==window){
      const src=target.currentSrc||target.src||target.href||target.getAttribute?.('src')||target.getAttribute?.('href')||'asset';
      report('asset',new Error('Falha ao carregar '+src),'asset_load_error');
      return;
    }
    report('runtime',event.error||new Error(event.message||'window error'),'window_error');
  },true);

  window.addEventListener('unhandledrejection',event=>{
    report('runtime',event.reason||new Error('Unhandled promise rejection'),'unhandled_rejection');
  });

  async function fetchOk(url,timeout=8000){
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeout);
    try{
      const res=await fetch(url+(url.includes('?')?'&':'?')+'diag='+Date.now(),{cache:'no-store',signal:ctl.signal});
      return {ok:res.ok,status:res.status};
    }catch(err){return {ok:false,status:0,error:String(err?.message||err)}}
    finally{clearTimeout(timer)}
  }

  async function syncServiceWorker(){
    if(!('serviceWorker' in navigator)||location.protocol!=='https:')return;
    try{
      const reg=await navigator.serviceWorker.getRegistration();
      if(reg)await reg.update();
    }catch(err){report('pwa',err,'sw_update')}
  }

  let swReloading=false;
  if('serviceWorker' in navigator){
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(swReloading)return;
      const key='nexo-sw-controller-'+VERSION;
      if(sessionStorage.getItem(key))return;
      sessionStorage.setItem(key,'1');
      swReloading=true;
      location.reload();
    });
    window.addEventListener('load',()=>setTimeout(syncServiceWorker,1200),{once:true});
  }

  function row(name,status,detail){
    return {name,status,detail:String(detail||'')};
  }

  async function runDiagnostics(){
    const results=[];
    const missing=REQUIRED.filter(name=>typeof window[name]!=='function');
    results.push(row('Módulos V13',missing.length?'fail':'ok',missing.length?'Ausentes: '+missing.join(', '):'Todos os módulos essenciais carregados'));

    const css=!!document.querySelector('link[href*="nexo-v13.css"]');
    results.push(row('CSS V13',css?'ok':'fail',css?'Folha de estilo conectada':'CSS V13 não encontrado no documento'));

    const online=navigator.onLine;
    results.push(row('Rede',online?'ok':'warn',online?'Navegador online':'Navegador offline'));

    if(typeof client!=='undefined'){
      try{
        const session=await client.auth.getSession();
        results.push(row('Supabase Auth',session.error?'fail':'ok',session.error?.message||'Sessão consultada'));
      }catch(err){results.push(row('Supabase Auth','fail',err.message||err))}

      try{
        const q=await client.from('questions').select('id',{count:'exact',head:true}).eq('is_active',true);
        results.push(row('Banco de questões',q.error?'fail':'ok',q.error?.message||String(q.count??'contagem indisponível')+' ativas'));
      }catch(err){results.push(row('Banco de questões','fail',err.message||err))}

      try{
        const m=await client.from('materials').select('id',{count:'exact',head:true}).eq('is_published',true);
        results.push(row('Materiais',m.error?'fail':'ok',m.error?.message||String(m.count??0)+' publicados'));
      }catch(err){results.push(row('Materiais','fail',err.message||err))}
    }else results.push(row('Supabase','fail','Cliente Supabase não carregado'));

    if('serviceWorker' in navigator&&location.protocol==='https:'){
      try{
        const reg=await navigator.serviceWorker.getRegistration();
        results.push(row('PWA / Service Worker',reg?.active?'ok':'warn',reg?.active?'Service Worker ativo':'Service Worker ainda não ativo'));
      }catch(err){results.push(row('PWA / Service Worker','fail',err.message||err))}
    }else results.push(row('PWA / Service Worker','warn','Indisponível neste protocolo/navegador'));

    const failed=[];
    for(const asset of ASSETS){
      const res=await fetchOk(asset);
      if(!res.ok)failed.push(asset+' ('+(res.status||res.error||'erro')+')');
    }
    results.push(row('Assets críticos',failed.length?'fail':'ok',failed.length?failed.join(' · '):ASSETS.length+' recursos responderam corretamente'));

    const bad=results.filter(x=>x.status==='fail');
    if(bad.length)report('diagnostics',new Error(bad.map(x=>x.name+': '+x.detail).join(' | ')),'production_health_failed');
    return results;
  }

  function renderResults(root,results){
    root.innerHTML='<div class="v13-diag-grid">'+results.map(r=>
      '<article class="'+r.status+'"><i></i><div><b>'+String(r.name).replace(/[&<>]/g,'')+'</b><small>'+String(r.detail).replace(/[&<>]/g,'')+'</small></div><strong>'+(r.status==='ok'?'OK':r.status==='warn'?'ATENÇÃO':'FALHA')+'</strong></article>'
    ).join('')+'</div><small class="v13-diag-version">Diagnóstico '+VERSION+' · '+new Date().toLocaleString('pt-BR')+'</small>';
  }

  async function mountAdminDiagnostics(){
    if(state?.profile?.role!=='admin')return false;
    const admin=document.querySelector('#admin');if(!admin)return false;
    let panel=document.querySelector('#v13ProductionHealth');
    if(!panel){
      panel=document.createElement('section');
      panel.id='v13ProductionHealth';panel.className='panel v13-panel';
      panel.innerHTML='<div class="v13-head"><div><span>SAÚDE DE PRODUÇÃO</span><h3>Diagnóstico real do navegador</h3><p>Verifica módulos, Supabase, PWA e arquivos que o aluno realmente recebe.</p></div><button id="v13RunDiagnostics" class="outline-btn">Rodar diagnóstico</button></div><div id="v13DiagnosticsBody" class="v13-empty">Preparando diagnóstico…</div>';
      admin.appendChild(panel);
      panel.querySelector('#v13RunDiagnostics').onclick=async()=>{
        const btn=panel.querySelector('#v13RunDiagnostics'),body=panel.querySelector('#v13DiagnosticsBody');
        btn.disabled=true;btn.textContent='Testando…';body.innerHTML='<div class="v13-empty">Verificando produção…</div>';
        const results=await runDiagnostics();renderResults(body,results);
        btn.disabled=false;btn.textContent='Rodar novamente';
      };
    }
    if(!panel.dataset.ran){
      panel.dataset.ran='1';
      const results=await runDiagnostics();
      renderResults(panel.querySelector('#v13DiagnosticsBody'),results);
    }
    return true;
  }

  let mounted=false;
  setInterval(async()=>{
    if(mounted)return;
    try{mounted=await mountAdminDiagnostics()}catch(err){report('diagnostics',err,'diagnostics_mount')}
  },1400);

  setTimeout(()=>{
    const missing=REQUIRED.filter(name=>typeof window[name]!=='function');
    if(missing.length)report('boot',new Error('Módulos ausentes: '+missing.join(', ')),'v13_module_missing');
  },6000);

  window.nexoRunProductionDiagnostics=runDiagnostics;
})();