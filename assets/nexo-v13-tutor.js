/* NEXO V13 · tutor modes */
(function(){
  const old=window.niaAnswer;
  if(typeof old!=='function')return;
  const modeLabel={socratic:'Socrático',simple:'Simples',strict:'Rigoroso',hints:'Só pistas',review:'Revisão',exam:'Modo prova'};
  window.niaAnswer=async function(text){
    const mode=v13State().prefs?.tutor_mode||'socratic';
    const q=state.current;
    const askingQuestion=Boolean(q)&&/quest|alternativa|gabarito|resposta|macete|pista|como resolv|por que/i.test(String(text||''));
    if(askingQuestion&&!state.answered){
      if(mode==='exam')return {key:'v13_exam',category:'question',mood:'serio',text:'Modo prova: eu não vou indicar a alternativa nem confirmar seu caminho antes da resposta. Leia o verbo do comando, identifique os dados indispensáveis e elimine primeiro o que contradiz o enunciado.'};
      if(mode==='hints'||mode==='socratic'){
        const hint=typeof preAnswerHintFor==='function'?preAnswerHintFor(q,1):'Volte ao comando e identifique exatamente o que precisa ser demonstrado.';
        return {key:'v13_hint',category:'question',mood:'pensativo',text:mode==='socratic'?'Antes de eu explicar: qual informação do enunciado você considera decisiva? Minha primeira pista é: '+hint:hint};
      }
    }
    const result=await old(text);
    if(mode==='simple'&&result?.text)result.text='Versão direta: '+result.text;
    if(mode==='strict'&&result?.text)result.text=result.text+' Agora prove isso voltando ao trecho, dado ou cálculo que sustenta a conclusão.';
    if(mode==='review'&&result?.text&&q)result.text=result.text+' Depois, registre em uma frase o que você precisa lembrar quando esta questão voltar na revisão.';
    return result;
  };
  function badge(){
    const head=document.querySelector('#niaPanel .nia-head, #niaPanel header');
    if(!head||document.querySelector('#v13TutorBadge'))return;
    const b=document.createElement('button');b.id='v13TutorBadge';b.className='v13-tutor-badge';
    b.onclick=v13OpenPrefs;head.appendChild(b);
    const refresh=()=>b.textContent='Professor · '+(modeLabel[v13State().prefs?.tutor_mode||'socratic']||'Socrático');
    refresh();setInterval(refresh,2500);
  }
  document.addEventListener('DOMContentLoaded',()=>setTimeout(badge,1200));
})();