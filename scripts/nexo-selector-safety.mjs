import fs from 'node:fs';

const files=[
  'app.js',
  'assets/nexo-reference-v2.js',
  'assets/nexo-v15-ui.js',
  'assets/nexo-v17.js',
  'assets/nexo-phase1-core.js',
  'assets/nexo-phase2-core-ux.js',
  'assets/nexo-phase2-flows.js'
];

const collectionMethods=new Set(['forEach','filter','map','find','some','every','reduce']);
const failures=[];

function matchingParen(src,open){
  let depth=0,quote='',escaped=false;
  for(let i=open;i<src.length;i++){
    const ch=src[i];
    if(quote){
      if(escaped){escaped=false;continue}
      if(ch==='\\\\'){escaped=true;continue}
      if(ch===quote)quote='';
      continue;
    }
    if(ch==="'"||ch==='"' || ch===String.fromCharCode(96)){quote=ch;continue}
    if(ch==='(')depth++;
    else if(ch===')'){
      depth--;
      if(depth===0)return i;
    }
  }
  return -1;
}

for(const file of files){
  const src=fs.readFileSync(file,'utf8');
  for(let i=0;i<src.length-1;i++){
    if(src[i]!=='$'||src[i+1]!=='('||src[i-1]==='$')continue;
    const close=matchingParen(src,i+1);
    if(close<0)continue;
    let j=close+1;
    while(/\\s/.test(src[j]||''))j++;
    if(src[j]!=='.')continue;
    j++;
    const m=/^[A-Za-z_$][\\w$]*/.exec(src.slice(j));
    const method=m?.[0]||'';
    if(!collectionMethods.has(method))continue;
    const line=src.slice(0,i).split(/\\r?\\n/).length;
    failures.push({
      file,
      line,
      method,
      code:src.slice(i,Math.min(src.length,j+method.length+1)).replace(/\\s+/g,' ').slice(0,180)
    });
  }
}

console.log(JSON.stringify({name:'NEXO selector safety',files:files.length,failures},null,2));
if(failures.length)throw new Error('Unsafe single-element selector used as collection: '+failures.length);
