import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const failures=[];
const passes=[];
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const exists=file=>fs.existsSync(path.join(root,file));
const ok=(name,detail='')=>passes.push({name,detail});
const fail=(name,detail='')=>failures.push({name,detail});
const assert=(cond,name,detail='')=>cond?ok(name,detail):fail(name,detail);

const index=read('index.html');
const sw=read('sw.js');
const app=read('app.js');
const compat=read('assets/nexo-runtime-compat.js');
const referenceUi=read('assets/nexo-reference-v2.js');
const headers=read('_headers');

assert(!index.includes('\\n'),'HTML sem \\n literal');
assert((index.match(/id="viewerNote"/g)||[]).length===1,'viewerNote único');

const ids=[...index.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
const dupIds=[...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];
assert(dupIds.length===0,'IDs HTML únicos',dupIds.join(', '));

const refs=[...index.matchAll(/(?:src|href)="(\.\/[^"?#]+)(?:[?#][^"]*)?"/g)].map(m=>m[1]);
const missingRefs=[...new Set(refs)].filter(ref=>!exists(ref.replace(/^\.\//,'')));
assert(missingRefs.length===0,'Assets locais do index existem',missingRefs.join(', '));

const localScripts=[...index.matchAll(/<script\s+src="(\.\/[^"?#]+\.js)(?:\?[^"]*)?"[^>]*><\/script>/g)].map(m=>m[1].replace(/^\.\//,''));
const syntaxErrors=[];
for(const file of [...new Set(localScripts), 'sw.js']){
  try{new Function(read(file));}
  catch(err){syntaxErrors.push(file+': '+err.message);}
}
assert(syntaxErrors.length===0,'JavaScript parseável',syntaxErrors.join(' | '));

try{JSON.parse(read('manifest.webmanifest'));ok('Manifest JSON válido');}
catch(err){fail('Manifest JSON válido',err.message);}

const shell=[...sw.matchAll(/['"](\.\/[^'"]+)['"]/g)].map(m=>m[1].split('?')[0].replace(/^\.\//,''));
const missingShell=[...new Set(shell)].filter(file=>file!==''&&!exists(file));
assert(missingShell.length===0,'Assets do Service Worker existem',missingShell.join(', '));

const expectedV13=[
  'nexo-v13-hardening.js','nexo-v13-core.js','nexo-v13-planner.js','nexo-v13-questions.js',
  'nexo-v13-essay.js','nexo-v13-recall.js','nexo-v13-content.js','nexo-v13-repertoire.js',
  'nexo-v13-calendar.js','nexo-v13-tutor.js','nexo-v13-search-errors.js','nexo-v13-ui.js'
];
const missingV13=expectedV13.filter(name=>!index.includes(name));
assert(missingV13.length===0,'Todos os módulos V13 conectados',missingV13.join(', '));

const missingV13Cache=expectedV13.filter(name=>!sw.includes(name));
assert(missingV13Cache.length===0,'Todos os módulos V13 no PWA',missingV13Cache.join(', '));

const order=[
  index.indexOf('nexo-v13-hardening.js'),
  index.indexOf('./app.js'),
  index.indexOf('nexo-v13-core.js'),
  index.indexOf('nexo-v13-ui.js')
];
assert(order.every(x=>x>=0)&&order.every((x,i)=>i===0||x>order[i-1]),'Ordem segura de carregamento V13',JSON.stringify(order));

const emptyImages=[...index.matchAll(/<img[^>]*\ssrc=""[^>]*>/g)].map(m=>m[0].slice(0,120));
assert(emptyImages.length===0,'Sem imagens com src vazio',emptyImages.join(' | '));

const badCollectionSelectors=[...app.matchAll(/(?<!\$)\$\([^()\n]*\)\.(forEach|find|filter)\s*\(/g)].map(m=>m[0]);
assert(badCollectionSelectors.length===0,'Seletores de coleção usam $$',badCollectionSelectors.join(' | '));
assert(!/Element\.prototype\.forEach/.test(compat),'Sem monkey patch em Element.prototype.forEach');
assert(index.includes('nexo-reference-v2.css')&&index.includes('nexo-reference-v2.js'),'Interface de referência conectada');
assert(!index.includes('nexo-minimal-v1.css'),'Camada minimal antiga desativada');
assert(sw.includes('nexo-reference-v2.css')&&sw.includes('nexo-reference-v2.js'),'Interface de referência no PWA');
const badReferenceCollections=[...referenceUi.matchAll(/(?<!\$)\$\([^()\n]*\)\.(forEach|find|filter|map)\s*\(/g)].map(m=>m[0]);
assert(badReferenceCollections.length===0,'Seletores de coleção da interface de referência usam $',badReferenceCollections.join(' | '));
assert(/\/index\.html[\s\S]*Cache-Control: no-cache/.test(headers),'HTML força revalidação de cache');
assert(/\/sw\.js[\s\S]*Cache-Control: no-cache/.test(headers)&&/Service-Worker-Allowed: \//.test(headers),'Service Worker sem cache velho');

assert(/function\s+logClientError\s*\(/.test(app),'Telemetria de erro disponível');
assert(/serviceWorker\.register\(['"]\.\/sw\.js['"]\)/.test(app),'Service Worker registrado');
assert(/window\.addEventListener\(['"]online['"]/.test(app)&&/window\.addEventListener\(['"]offline['"]/.test(app),'Tratamento online/offline presente');
assert(index.includes('nexo-v13-search-errors.js'),'Busca universal publicada');
assert(index.includes('nexo-v13-hardening.js'),'Hardening publicado');
assert(/function\s+buildSiteSearchActionResults\s*\(/.test(app),'Busca interna por áreas/funções disponível');
assert(/function\s+nexoPercentTone\s*\(/.test(app),'Classificação visual de porcentagens disponível');
assert(index.includes('id="contextClose"'),'Botão fechar do contexto publicado');
assert(/function\s+closeNexoContextBar\s*\(/.test(app),'Ação fechar do contexto disponível');

console.log('\nNEXO Production Smoke');
console.log('=====================');
for(const p of passes)console.log('PASS',p.name,p.detail?'- '+p.detail:'');
for(const f of failures)console.error('FAIL',f.name,f.detail?'- '+f.detail:'');
console.log('\nResultado:',passes.length+' checks OK, '+failures.length+' falha(s).');

if(failures.length)process.exit(1);
