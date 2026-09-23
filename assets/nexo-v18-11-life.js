(function(){
'use strict';
function init(){
  const body=document.body;
  if(!body||body.dataset.nx11Init==='1')return;
  body.dataset.nx11Init='1';
  requestAnimationFrame(()=>body.classList.add('nx11-ready'));

  // Make the mobile search self-explanatory even when older markup has an empty placeholder.
  const search=document.querySelector('.nrx-mobile-search-slot .search input');
  if(search&&!String(search.placeholder||'').trim())search.placeholder='Pesquisar no NEXO...';

  // Defensive boot cleanup: admin operation modals must never be opened merely because the user is admin.
  document.querySelectorAll('.community-modal.admin-only').forEach(modal=>{
    if(!modal.dataset.openedByUser)modal.classList.add('hidden');
  });

  // Mark admin modals only when a real admin action explicitly opens them.
  document.addEventListener('click',event=>{
    const trigger=event.target.closest('[data-visual-repair],[data-admin-explanation]');
    if(!trigger)return;
    const id=trigger.hasAttribute('data-visual-repair')?'adminVisualRepairModal':'adminExplanationModal';
    const modal=document.getElementById(id);
    if(modal)modal.dataset.openedByUser='1';
  },{capture:true,passive:true});

  // Add a short "alive" state on real user interaction. CSS can use it without timers or observers.
  let aliveTimer=0;
  document.addEventListener('pointerdown',()=>{
    body.classList.add('nx11-touch');
    clearTimeout(aliveTimer);
    aliveTimer=setTimeout(()=>body.classList.remove('nx11-touch'),180);
  },{passive:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();