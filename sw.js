const NEXO_CACHE='nexo-v13-20260921-1';
const SHELL=[
  './',
  './index.html',
  './styles.css?v=20260921-1',
  './app.js?v=20260921-4',
  './assets/nexo-runtime-compat.js',
  './assets/nexo-v13.css?v=20260921-1',
  './assets/nexo-v13-core.js?v=20260921-1',
  './assets/nexo-v13-planner.js?v=20260921-1',
  './assets/nexo-v13-questions.js?v=20260921-1',
  './assets/nexo-v13-essay.js?v=20260921-1',
  './assets/nexo-v13-recall.js?v=20260921-1',
  './assets/nexo-v13-tutor.js?v=20260921-1',
  './assets/nexo-v13-ui.js?v=20260921-1',
  './assets/nexo-family/bust.avif',
  './assets/nexo-family/bust-confiante.avif',
  './assets/nexo-family/bust-pensativo.avif',
  './assets/nexo-family/bust-acolhedor.avif'
];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(NEXO_CACHE);
    await Promise.allSettled(SHELL.map(url=>cache.add(new Request(url,{cache:'reload'}))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('nexo-')&&key!==NEXO_CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

async function networkFirst(request){
  const cache=await caches.open(NEXO_CACHE);
  try{
    const response=await fetch(request);
    if(response&&response.ok)cache.put(request,response.clone()).catch(()=>{});
    return response;
  }catch(err){
    const cached=await cache.match(request);
    if(cached)return cached;
    const fallback=await cache.match('./index.html');
    if(fallback&&request.mode==='navigate')return fallback;
    throw err;
  }
}

async function staleWhileRevalidate(request){
  const cache=await caches.open(NEXO_CACHE);
  const cached=await cache.match(request);
  const network=fetch(request).then(response=>{
    if(response&&response.ok&&response.type!=='opaque'){
      cache.put(request,response.clone()).catch(()=>{});
    }
    return response;
  }).catch(()=>null);
  if(cached){network.catch(()=>{});return cached}
  const response=await network;
  if(response)return response;
  throw new Error('offline-resource-unavailable');
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==='navigate'){
    event.respondWith(networkFirst(request));
    return;
  }

  const path=url.pathname.toLowerCase();
  const coreAsset=path.endsWith('/app.js')||path.endsWith('/styles.css')||path.endsWith('/index.html');
  if(coreAsset){
    event.respondWith(networkFirst(request));
    return;
  }

  const cacheable=
    path.endsWith('.css')||
    path.endsWith('.js')||
    path.endsWith('.html')||
    path.endsWith('.avif')||
    path.endsWith('.webp')||
    path.endsWith('.png')||
    path.endsWith('.jpg')||
    path.endsWith('.jpeg')||
    path.endsWith('.svg')||
    path.endsWith('.pdf');

  if(cacheable)event.respondWith(staleWhileRevalidate(request));
});
