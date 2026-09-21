/* NEXO V13 · self-rebalancing 7-day route */
(function(){
  const dayNames=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  function ranked(){
    const u=v13State().brief?.uncertain||{},rec=v13State().brief?.recall||{};
    return [...(v13State().mastery||[])].sort((a,b)=>{
      const score=x=>{const k=[x.area||'',x.subject||'',x.topic||''].join('|'),rr=rec[k],rb=rr?.n?Math.max(0,(65-(rr.sum/rr.n))*.35):0;return Number(x.priority_score||0)+(u[k]||0)*6+rb};
      return score(b)-score(a);
    });
  }
  function build(){
    const p=v13State().prefs||{},rows=ranked(),due=Number(v13State().brief?.due||0),daily=Math.max(15,Math.round(Number(p.weekly_goal_minutes||300)/7));
    const daysToExam=p.exam_date?Math.ceil((new Date(p.exam_date+'T12:00:00')-new Date().setHours(0,0,0,0))/86400000):null;
    const intense=daysToExam!==null&&daysToExam<=45;
    const out=[];
    for(let i=0;i<7;i++){
      const date=new Date();date.setDate(date.getDate()+i);
      const topic=rows[i%Math.max(1,rows.length)]||rows[0]||null;
      let type='questions',title=topic?(topic.topic||topic.subject||topic.area):'Diagnóstico ENEM',minutes=daily;
      if(i===0&&due>0){type='review';title=due+' revisão'+(due>1?'ões':'')+' vencida'+(due>1?'s':'');}
      else if(i===2){type='essay';title='Redação · treino de competência';minutes=Math.max(30,daily)}
      else if((i===5&&intense)||(i===6&&!intense)){type='simulation';title=intense?'Simulado de reta final':'Mini simulado ENEM';minutes=Math.max(45,daily)}
      else if(i===4&&topic){type='recall';title='Explique: '+(topic.topic||topic.subject);minutes=Math.min(20,daily)}
      out.push({date,type,title,minutes,topic});
    }
    return out;
  }
  function render(){
    const root=document.querySelector('#v13WeekRoute');if(!root)return;
    const route=build(),p=v13State().prefs||{};
    root.innerHTML='<div class="v13-head"><div><span>ROTA DE 7 DIAS</span><h3>Plano que se recalcula com seu progresso</h3><p>'+Number(p.weekly_goal_minutes||300)+' min/semana · revisões, redação e simulado entram conforme sua necessidade.</p></div></div><div class="v13-week-route">'+route.map((x,i)=>'<button data-v13-day="'+i+'"><span>'+dayNames[x.date.getDay()]+' · '+x.date.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})+'</span><b>'+v13E(x.title)+'</b><small>'+x.minutes+' min · '+({questions:'questões',review:'revisão',essay:'redação',simulation:'simulado',recall:'recordação ativa'}[x.type]||x.type)+'</small></button>').join('')+'</div>';
    root.querySelectorAll('[data-v13-day]').forEach(btn=>btn.onclick=()=>start(route[Number(btn.dataset.v13Day)]));
  }
  async function start(item){
    if(!item)return;
    if(item.type==='essay'){openPage('redacao');toast('Rota aberta: pratique uma redação e foque na competência mais fraca.');return}
    if(item.type==='simulation'){openPage('simulados');toast('Rota aberta: escolha o simulado compatível com seu tempo.');return}
    if(item.type==='recall'&&item.topic){v13OpenRecall(item.topic.area||'',item.topic.subject||'',item.topic.topic||item.topic.subject||'');return}
    if(item.type==='review'){openPage('desempenho');setTimeout(()=>document.querySelector('#startSmartReview')?.click(),80);return}
    const t=item.topic;
    openPage('questoes');
    if(t){await startStudySession({mode:'week_route',area:t.area||'',subject:t.subject||'',topic:t.topic||'',difficulty:'',visualOnly:false,size:item.minutes<=20?6:item.minutes<=35?10:15})}
    else resetSessionUI();
  }
  window.v13RenderWeekRoute=render;
})();