/* NEXO V13 · repertoire bank and argument organizer */
(function(){
  const reps=[
    ['Constituição Federal de 1988','Direitos, deveres, cidadania e políticas públicas. Use o princípio apenas quando houver relação direta com o argumento.',['cidadania','direitos','políticas públicas']],
    ['Declaração Universal dos Direitos Humanos','Dignidade, igualdade, liberdade, educação e proteção social. Explique a pertinência ao tema.',['direitos humanos','igualdade','proteção social']],
    ['Paulo Freire','Educação, autonomia, participação e formação crítica. Evite citação decorativa.',['educação','autonomia','participação']],
    ['Milton Santos','Território, desigualdade, cidadania e globalização quando o conceito realmente explicar o problema.',['desigualdade','território','globalização']],
    ['Determinantes sociais da saúde','Renda, moradia, educação, saneamento e acesso a serviços como fatores de resultados em saúde.',['saúde','saneamento','desigualdade']],
    ['Sociedade em rede','Em temas digitais, relacione acesso, informação, comportamento, trabalho e desigualdade sem tratar tecnologia como causa única.',['tecnologia','informação','trabalho']]
  ];
  function openBuilder(title){
    v13Modal('Organizador de argumento','<div class="v13-argument-builder"><span>REPERTÓRIO ESCOLHIDO</span><h4>'+v13E(title)+'</h4><p>Construa você mesmo o argumento. O NEXO organiza o raciocínio sem escrever a redação no seu lugar.</p><label>1 · Afirmação<textarea id="v13ArgClaim" rows="3" placeholder="Qual ideia você quer defender?"></textarea></label><label>2 · Explicação causal<textarea id="v13ArgWhy" rows="3" placeholder="Por que isso acontece?"></textarea></label><label>3 · Repertório/evidência<textarea id="v13ArgEvidence" rows="3" placeholder="Como o repertório ajuda a provar ou explicar sua ideia?"></textarea></label><label>4 · Consequência<textarea id="v13ArgImpact" rows="3" placeholder="Qual consequência se conecta à tese?"></textarea></label><button id="v13ArgCheck" class="primary-btn wide">Checar estrutura</button><div id="v13ArgResult"></div></div>');
    const b=document.querySelector('#v13ArgCheck');if(!b)return;
    b.onclick=()=>{const ids=['v13ArgClaim','v13ArgWhy','v13ArgEvidence','v13ArgImpact'],vals=ids.map(id=>document.querySelector('#'+id)?.value.trim()||''),done=vals.filter(x=>x.length>=35).length,res=document.querySelector('#v13ArgResult');res.innerHTML='<div class="v13-recall-result"><div><span>ESTRUTURA</span><b>'+done+'/4</b></div><p>'+(done===4?'Seu esqueleto contém afirmação, causa, evidência e consequência. Agora transforme-o em um parágrafo coeso.':'Complete os blocos fracos antes de redigir o parágrafo. O repertório precisa explicar a ideia, não apenas aparecer.')+'</p></div>';};
  }
  function mount(){
    const page=document.querySelector('#redacao');if(!page||page.querySelector('#v13Repertoire'))return;
    const el=document.createElement('section');el.id='v13Repertoire';el.className='panel v13-panel v13-repertoire';
    el.innerHTML='<div class="v13-head"><div><span>BANCO DE REPERTÓRIO</span><h3>Repertório para argumentar — não para decorar</h3><p>Escolha uma referência e conecte-a à sua própria tese.</p></div></div><div class="v13-rep-grid">'+reps.map((x,i)=>'<article><div class="nx2-rep-tags">'+(x[2]||[]).map(tag=>'<span>'+v13E(tag)+'</span>').join('')+'</div><b>'+v13E(x[0])+'</b><p>'+v13E(x[1])+'</p><button data-v13-rep="'+i+'">Usar no organizador →</button></article>').join('')+'</div>';
    page.appendChild(el);
    el.querySelectorAll('[data-v13-rep]').forEach(btn=>btn.onclick=()=>{
      const title=reps[Number(btn.dataset.v13Rep)][0];
      openBuilder(title);
      try{ if(typeof toast==='function')toast('Repertório enviado ao organizador: '+title) }catch(_){}
    });
  }
  window.v13MountRepertoire=mount;
  document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,900));
})();