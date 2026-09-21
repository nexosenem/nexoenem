/* NEXO V13 · ENEM essay rubric (orientative, not official grading) */
(function(){
  const stop=new Set('a o os as um uma uns umas de da do das dos em no na nos nas por para com sem e ou que se ao aos a partir sua seu suas seus'.split(' '));
  const connectors=['portanto','além disso','alem disso','contudo','porém','porem','todavia','assim','desse modo','nesse sentido','consequentemente','logo','dessa forma','ademais','entretanto','em contrapartida','por conseguinte','diante disso','visto que','uma vez que'];
  const causal=['porque','devido','visto que','uma vez que','decorre','causa','consequência','consequencia','resultado','impacto','efeito','leva a','contribui'];
  const thesis=['é necessário','e necessario','é preciso','e preciso','torna-se','deve-se','urge','diante desse cenário','diante desse cenario'];
  const agents=['estado','governo','escola','sociedade','mídia','midia','empresas','família','familia','ministério','ministerio','prefeitura','ong','universidade'];
  const actions=['deve','devem','promover','criar','ampliar','garantir','implementar','investir','fiscalizar','oferecer','desenvolver'];
  const means=['por meio','mediante','através','atraves','com campanhas','com investimentos','por intermédio','por intermedio'];
  const goals=['a fim de','para que','com o objetivo','visando','de modo a','com a finalidade'];
  const details=['por exemplo','especialmente','priorizando','sobretudo','como','incluindo'];

  const countHits=(norm,list)=>list.reduce((n,x)=>n+(norm.includes(v13N(x))?1:0),0);
  const uniqueHits=(norm,list)=>list.filter(x=>norm.includes(v13N(x))).length;
  const wordsOf=t=>(String(t||'').match(/\b[\p{L}\p{N}][\p{L}\p{N}'’-]*\b/gu)||[]);
  const themeTokens=()=>{try{return v13N(getEssayThemeData()?.title||'').split(' ').filter(x=>x.length>3&&!stop.has(x))}catch{return []}};

  function rubric(text){
    const raw=String(text||'').trim(),norm=v13N(raw),words=wordsOf(raw),paras=raw.split(/\n\s*\n|\n{2,}/).map(x=>x.trim()).filter(Boolean);
    const sentences=raw.split(/[.!?]+/).map(x=>x.trim()).filter(Boolean);
    const avgSentence=sentences.length?words.length/sentences.length:words.length;
    const conn=uniqueHits(norm,connectors);
    const cause=countHits(norm,causal);
    const thesisCount=countHits(norm,thesis);
    const theme=themeTokens(),themeMatch=theme.length?theme.filter(x=>norm.includes(x)).length/theme.length:.55;
    const proper=(raw.match(/\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}]{3,}(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}]{2,})*/gu)||[]).length;
    const agentsN=countHits(norm,agents),actionsN=countHits(norm,actions),meansN=countHits(norm,means),goalsN=countHits(norm,goals),detailsN=countHits(norm,details);

    let c1=120;
    if(words.length>=260)c1+=20;if(avgSentence<=28)c1+=20;if(avgSentence>38)c1-=40;
    if((raw.match(/[;:]/g)||[]).length>=2)c1+=10;
    if((raw.match(/\b(eu|acho|acredito|na minha opinião|na minha opiniao)\b/gi)||[]).length)c1-=20;
    if(sentences.length<8)c1-=20;

    let c2=60 + themeMatch*80 + (words.length>=260?20:0) + (paras.length>=4?20:0) + Math.min(20,proper*4);
    if(themeMatch<.25)c2=Math.min(c2,80);

    let c3=60 + Math.min(60,cause*12) + Math.min(40,thesisCount*20) + (paras.length>=4?20:0) + (sentences.length>=10?20:0);
    if(words.length<220)c3-=20;

    let c4=60 + Math.min(100,conn*14) + (paras.length>=4?20:0) + (avgSentence<32?20:0);
    if(conn<3)c4-=20;

    const interventionParts=[agentsN>0,actionsN>0,meansN>0,goalsN>0,detailsN>0].filter(Boolean).length;
    let c5=interventionParts*40;
    if(!agentsN||!actionsN)c5=Math.min(c5,80);
    if(words.length<180)c5=Math.min(c5,120);

    const scores=[c1,c2,c3,c4,c5].map(x=>v13Band(Math.max(0,Math.min(200,x))));
    return {scores,words:words.length,paras:paras.length,sentences:sentences.length,avgSentence:Math.round(avgSentence),connectors:conn,themeMatch,causal:cause,thesis:thesisCount,interventionParts};
  }

  window.essayScores=function(text){return rubric(text).scores};

  window.buildDetailedEssayReview=function(text,scores){
    const r=rubric(text),notes=[];
    notes.push(r.themeMatch>=.5?'O texto mantém boa aderência lexical ao tema.':'A relação com o tema precisa ficar mais explícita; retome palavras-chave do recorte ao longo do desenvolvimento.');
    notes.push(r.paras>=4?'A arquitetura do texto está organizada em pelo menos quatro blocos.':'Considere uma estrutura mais nítida: introdução, dois desenvolvimentos e conclusão.');
    notes.push(r.causal>=2?'Há relações de causa, consequência ou impacto no desenvolvimento.':'Transforme afirmações em raciocínio: apresente causa, explique o mecanismo e mostre a consequência.');
    notes.push(r.connectors>=5?'Há variedade razoável de conectivos.':'A coesão ainda depende de poucos conectivos; varie relações de contraste, causa, consequência e conclusão.');
    notes.push(r.avgSentence<=30?'O tamanho médio dos períodos favorece clareza.':'Há períodos longos; divida frases extensas para reduzir ambiguidade e problemas de pontuação.');
    notes.push(r.interventionParts>=4?'A proposta de intervenção apresenta a maior parte dos elementos esperados.':'Na intervenção, confira agente, ação, meio, finalidade e detalhamento.');
    notes.push('A nota é orientativa: o NEXO usa sinais estruturais e linguísticos, mas não substitui a correção humana oficial do ENEM.');
    return {paras:r.paras,words:r.words,connectors:r.connectors,intervention:r.interventionParts>=3,thesis:r.thesis>0,notes,v13:{theme_match:Math.round(r.themeMatch*100),causal_links:r.causal,avg_sentence:r.avgSentence,intervention_parts:r.interventionParts}};
  };

  function paragraphSignals(text){
    const paras=String(text||'').split(/\n\s*\n|\n{2,}/).map(x=>x.trim()).filter(Boolean);
    return paras.map((p,i)=>{
      const n=v13N(p),words=wordsOf(p).length,conn=uniqueHits(n,connectors),cause=countHits(n,causal),th=countHits(n,thesis);
      const inter=[countHits(n,agents)>0,countHits(n,actions)>0,countHits(n,means)>0,countHits(n,goals)>0,countHits(n,details)>0].filter(Boolean).length;
      const sentences=p.split(/[.!?]+/).map(x=>x.trim()).filter(Boolean);
      const avg=sentences.length?Math.round(words/sentences.length):words;
      let label='Desenvolvimento',note='';
      if(i===0){label='Introdução';note=th?'Tese ou direcionamento argumentativo identificado.':'Deixe a tese e os eixos do desenvolvimento mais explícitos.'}
      else if(i===paras.length-1){label='Conclusão';note=inter>=4?'Intervenção com boa cobertura de elementos.':'Confira agente, ação, meio, finalidade e detalhamento.'}
      else{note=cause>=1?'Há explicação causal ou relação de consequência.':'Evite apenas afirmar: explique causa, mecanismo e consequência.'}
      if(avg>32)note+=' Há períodos longos; considere dividi-los.';
      if(conn===0&&i>0)note+=' A conexão com o parágrafo anterior pode ficar mais explícita.';
      return {index:i+1,label,words,connectors:conn,causal:cause,intervention:inter,note};
    });
  }

  const oldShow=window.showEssayResult;
  if(typeof oldShow==='function'){
    window.showEssayResult=function(text,scores,total){
      oldShow(text,scores,total);
      const root=document.querySelector('#essayResult .essay-correction-shell');
      if(root&&!root.querySelector('.v13-essay-disclaimer')){
        const d=document.createElement('div');d.className='v13-essay-disclaimer';
        d.innerHTML='<b>Correção orientativa V13</b><span>Use a análise para revisão e reescrita. A nota real do ENEM depende da banca oficial e pode divergir desta estimativa.</span>';
        root.prepend(d);const r=buildDetailedEssayReview(text,scores).v13||{};const diag=document.createElement('div');diag.className='v13-essay-diagnostics';diag.innerHTML='<span><b>'+Number(r.theme_match||0)+'%</b>Aderência ao tema</span><span><b>'+Number(r.causal_links||0)+'</b>Relações causais</span><span><b>'+Number(r.intervention_parts||0)+'/5</b>Intervenção</span><span><b>'+Number(r.avg_sentence||0)+'</b>Palavras/período</span>';d.after(diag);const ps=paragraphSignals(text);if(ps.length){const pr=document.createElement('section');pr.className='v13-paragraph-review';pr.innerHTML='<div class="v13-section-head"><span>LEITURA POR PARÁGRAFO</span><small>diagnóstico estrutural</small></div>'+ps.map(x=>'<article><b>P'+x.index+' · '+v13E(x.label)+'</b><span>'+x.words+' palavras · '+x.connectors+' conectivo(s)</span><p>'+v13E(x.note)+'</p></article>').join('');diag.after(pr)};
      }
    };
  }
})();