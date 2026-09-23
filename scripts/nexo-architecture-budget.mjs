import { readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const files=['index.html','app.js','styles.css','sw.js'];
const text=Object.fromEntries(files.map(file=>[file,readFileSync(file,'utf8')]));
const failures=[];

const size=(file)=>statSync(file).size;
const gzip=(file)=>gzipSync(readFileSync(file)).length;

const budgets={
  'app.js':{raw:580000,gzip:130000},
  'styles.css':{raw:510000,gzip:90000}
};

for(const [file,budget] of Object.entries(budgets)){
  const raw=size(file),gz=gzip(file);
  if(raw>budget.raw)failures.push(file+' raw '+raw+' > '+budget.raw);
  if(gz>budget.gzip)failures.push(file+' gzip '+gz+' > '+budget.gzip);
}

const externalScripts=[...text['index.html'].matchAll(/<script\s+([^>]*?)src="([^"]+)"[^>]*><\/script>/g)]
  .map(match=>({attrs:match[1],src:match[2],full:match[0]}));
const blocking=externalScripts.filter(x=>!/(^|\s)defer(\s|$)/.test(x.attrs)&&!/(^|\s)async(\s|$)/.test(x.attrs));
if(blocking.length)failures.push('parser-blocking scripts: '+blocking.map(x=>x.src).join(', '));

const cssLinks=[...text['index.html'].matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map(x=>x[1]);
if(cssLinks.length>6)failures.push('too many render-blocking stylesheets: '+cssLinks.length);

const legacyPrecache=[
  'nexo-v18-10-readable.css',
  'nexo-v18-12-spice.css',
  'nexo-v18-13-readable-global.css',
  'nexo-phase1-foundation.css'
].filter(name=>text['sw.js'].includes(name));
if(legacyPrecache.length)failures.push('legacy precache entries: '+legacyPrecache.join(', '));

if(!text['sw.js'].includes('nexo-phase1-ui.css'))failures.push('phase1 UI bundle missing from precache');
if(!text['index.html'].includes('preconnect" href="https://xeesttjsvscuqkeytmdz.supabase.co'))failures.push('Supabase preconnect missing');
if(!text['index.html'].includes('preconnect" href="https://cdn.jsdelivr.net'))failures.push('CDN preconnect missing');

console.log(JSON.stringify({
  name:'NEXO architecture budget',
  sizes:Object.fromEntries(Object.keys(budgets).map(file=>[file,{raw:size(file),gzip:gzip(file),budget:budgets[file]}])),
  scripts:externalScripts.length,
  stylesheets:cssLinks.length,
  failures
},null,2));

if(failures.length)throw new Error('Architecture budget failed: '+failures.join(' | '));
