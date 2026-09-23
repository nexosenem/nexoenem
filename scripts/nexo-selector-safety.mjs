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

const failures=[];
const directCollectionUse=/(?<!\$)\$\([^\n;]*?\)\.(forEach|filter|map|find|some|every|reduce)\s*\(/g;

for(const file of files){
  const src=fs.readFileSync(file,'utf8');
  let match;
  while((match=directCollectionUse.exec(src))){
    const line=src.slice(0,match.index).split(/\r?\n/).length;
    failures.push({
      file,
      line,
      method:match[1],
      code:match[0].replace(/\s+/g,' ').slice(0,180)
    });
  }
}

console.log(JSON.stringify({name:'NEXO selector safety',files:files.length,failures},null,2));
if(failures.length)throw new Error('Unsafe single-element selector used as collection: '+failures.length);
