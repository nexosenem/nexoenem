/* NEXO V13 · active recall / Feynman */
(function(){
  const stop=new Set('a o os as um uma uns umas de da do das dos em no na nos nas por para com sem e ou que se ao aos como mais menos muito ser estar foi são uma cada quando onde qual quais porque pois texto questao questão alternativa enem acordo considerando sobre apresenta partir'.split(' '));
  const causal=['porque','causa','consequencia','consequência','devido','portanto','logo','assim','resulta','leva','provoca','depende','ocorre'];

  function anchorsFrom(rows){
    const freq={};
    (rows||[]).forEach(row=>{
      const tokens=v13N((row.prompt||'')+' '+(row.base_text||'')).split(' ');
      tokens.forEach(t=>{if(t.length>=5&&!stop.has(t)&&!/^\d+$/.test(t))freq[t]=(freq[t]||0)+1});
    });
    return Object.entries(freq).sort((a,b)=>b[1]-a[1]||b[0].length-a[0].length).slice(0,10).map(x=>x[0]);
  }

  function evaluate(text,anchors){
    const norm=v13N(text),tokens=norm.split(' ').filter(Boolean),set=new Set(tokens);
    const hit=anchors.filter(a=>set.has(a)||norm.includes(a)).length;
    const anchorPart=anchors.length?Math.round((hit/anchors.length)*70):35;
    const lengthPart=Math.min(20,Math.round(tokens.length/4));
    const logicPart=causal.some(x=>norm.includes(v13N(x)))?10:0;
    return {score:Math.max(0,Math.min(100,anchorPart+lengthPart+logicPart)),hit,words:tokens.length,missing:anchors.filter(a=>!set.has(a)&&!norm.includes(a)).slice(0,5)};
  }

  async function openRecall(area,subject,topic){
    v13Modal('Explique para aprender',`
      <div class="v13-recall">
        <span class="v13-recall-kicker">RECORDAÇÃO ATIVA · FEYNMAN</span>
        <h4>Explique “${v13E(topic)}” como se estivesse ensinando a um colega.</h4>
        <p>Não consulte material durante a primeira tentativa. Foque em definição, mecanismo, exemplo e limite/exceção quando fizer sentido.</p>
        <textarea id="v13RecallText" rows="9" maxlength="4000" placeholder="Explique com suas palavras..."></textarea>
        <div class="v13-confidence v13-recall-confidence"><span>Como você se sente sobre sua explicação?</span><div><button type="button" data-v13-rconf="sure">Seguro</button><button type="button" data-v13-rconf="unsure">Em dúvida</button><button type="button" data-v13-rconf="guess">Não lembro bem</button></div></div>
        <button id="v13RecallCheck" class="primary-btn wide">Checar minha cobertura</button>
        <div id="v13RecallResult"></div>
      </div>`);
    let confidence='unsure';
    document.querySelectorAll('[data-v13-rconf]').forEach(btn=>btn.onclick=()=>{confidence=btn.dataset.v13Rconf;document.querySelectorAll('[data-v13-rconf]').forEach(x=>x.classList.toggle('active',x===btn))});
    const {data,error}=await client.from('questions').select('prompt,base_text').eq('is_active',true).eq('topic',topic).limit(10);
    const anchors=error?[]:anchorsFrom(data||[]);
    const check=document.querySelector('#v13RecallCheck');
    if(!check)return;
    check.onclick=async()=>{
      const text=document.querySelector('#v13RecallText')?.value.trim()||'';
      if(text.length<80)return toast('Explique um pouco mais antes da checagem.','info');
      const r=evaluate(text,anchors);
      const {error:saveError}=await client.from('nexo_active_recall_sessions').insert({
        user_id:state.user.id,area:area||null,subject:subject||null,topic,response_text:text,
        coverage_score:r.score,confidence,anchor_terms:anchors
      });
      if(saveError)console.warn('v13 recall save',saveError);
      const result=document.querySelector('#v13RecallResult');
      if(result)result.innerHTML=`<section class="v13-recall-result"><div><span>COBERTURA APROXIMADA</span><b>${r.score}%</b></div><p>${r.score>=75?'Boa cobertura para uma primeira explicação. Agora compare com o material e procure imprecisões.':r.score>=50?'Você recuperou parte do assunto. Revise os pontos ausentes e tente explicar novamente sem consultar.':'A lembrança ainda está frágil. Faça uma revisão curta e repita a explicação depois.'}</p>${r.missing.length?'<small>Termos recorrentes nas questões que não apareceram na sua explicação: '+r.missing.map(v13E).join(', ')+'</small>':''}<em>Esta é uma checagem de cobertura por termos do banco, não uma validação factual completa.</em></section>`;
      v13LoadBrief?.();
    };
  }

  window.v13OpenRecall=openRecall;
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-v13-recall]');if(!b)return;
    openRecall(b.dataset.v13Area||'',b.dataset.v13Subject||'',b.dataset.v13Recall||'');
  });
})();