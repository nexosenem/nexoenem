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

const collectionMethods=['forEach','filter','map','find','some','every','reduce'];
const failures=[];

for(const file of files){
  const src=fs.readFileSync(file,'utf8');
  const lines=src.split(/\r?\n/);
  lines.forEach((line,index)=>{
    const compact=line.trim();
    for(const method of collectionMethods){
      const marker=').'+method+'(';
      let at=0;
      while((at=compact.indexOf(marker,at))>=0){
        const left=compact.slice(0,at+1);
        const dollar=left.lastIndexOf('$(');
        if(dollar>=0){
          const previous=compact[dollar-1]||'';
          if(previous!=='$'){
            // Allow nested single-element lookups used only as an argument to an outer $$().
            const outer=compact.lastIndexOf('$$(',dollar);
            const comma=compact.lastIndexOf(',',dollar);
            const nestedInOuter=outer>=0&&comma>=outer;
            if(!nestedInOuter){
              failures.push({file,line:index+1,method,code:compact.slice(Math.max(0,dollar-40),Math.min(compact.length,at+method.length+3))});
            }
          }
        }
        at+=marker.length;
      }
    }
  });
}

console.log(JSON.stringify({name:'NEXO selector safety',files:files.length,failures},null,2));
if(failures.length)throw new Error('Unsafe single-element selector used as collection: '+failures.length);
