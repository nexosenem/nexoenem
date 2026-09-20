(()=>{
  'use strict';
  // Compatibilidade temporária para componentes que tratam um Element como coleção.
  // Escolhe o seletor mais específico do próprio elemento e itera o grupo correto.
  if(typeof Element==='undefined'||Element.prototype.forEach)return;
  Object.defineProperty(Element.prototype,'forEach',{
    configurable:true,
    writable:true,
    value:function(callback,thisArg){
      if(typeof callback!=='function')return;
      let nodes=[this];
      try{
        const candidates=[];
        for(const attr of [...this.attributes]){
          if(!attr.name.startsWith('data-'))continue;
          const list=[...document.querySelectorAll('['+CSS.escape(attr.name)+']')];
          if(list.includes(this))candidates.push(list);
        }
        for(const cls of [...this.classList]){
          const list=[...document.getElementsByClassName(cls)];
          if(list.includes(this))candidates.push(list);
        }
        const best=candidates.filter(list=>list.length>1).sort((a,b)=>a.length-b.length)[0];
        if(best)nodes=best;
      }catch(_){}
      nodes.forEach(callback,thisArg);
    }
  });
})();