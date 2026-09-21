/* NEXO V13 · persistent notes for library content */
(function(){
  async function openNote(){
    const v=state.activeViewer;
    if(!v?.item||!state.user?.id)return toast('Abra um conteúdo antes de anotar.','info');
    const {data,error}=await client.from('nexo_content_notes').select('id,note').eq('user_id',state.user.id).eq('content_type',v.type).eq('content_id',Number(v.item.id)).maybeSingle();
    if(error)return toast('Não consegui carregar sua anotação.','error');
    const deleteButton=data?.id?'<button type="button" id="v13DeleteContentNote" class="outline-btn danger">Excluir</button>':'';
    const body='<form id="v13ContentNoteForm" class="v13-form">'+
      '<div class="v13-note-context"><span>'+v13E(v.type==='video'?'VÍDEO':'MATERIAL')+'</span><b>'+v13E(v.item.title||'Conteúdo')+'</b><small>'+v13E(v.item.subject||v.item.area||'')+' · '+v13E(v.item.topic||'')+'</small></div>'+
      '<textarea id="v13ContentNoteText" rows="12" maxlength="6000" placeholder="Escreva o que você quer lembrar, dúvidas, fórmulas, argumentos ou um resumo com suas palavras...">'+v13E(data?.note||'')+'</textarea>'+
      '<div class="v13-note-actions">'+deleteButton+'<button class="primary-btn">Salvar anotação</button></div></form>';
    v13Modal('Anotação do conteúdo',body);
    const form=document.querySelector('#v13ContentNoteForm');
    form.onsubmit=async e=>{
      e.preventDefault();
      const note=document.querySelector('#v13ContentNoteText')?.value.trim()||'';
      if(!note)return toast('Escreva algo antes de salvar.','info');
      const payload={user_id:state.user.id,content_type:v.type,content_id:Number(v.item.id),note,updated_at:new Date().toISOString()};
      const {error:saveError}=await client.from('nexo_content_notes').upsert(payload,{onConflict:'user_id,content_type,content_id'});
      if(saveError)return toast('Não consegui salvar a anotação.','error');
      v13Close();toast('Anotação salva.');
    };
    const del=document.querySelector('#v13DeleteContentNote');
    if(del)del.onclick=async()=>{
      const {error:delError}=await client.from('nexo_content_notes').delete().eq('id',data.id);
      if(delError)return toast('Não consegui excluir a anotação.','error');
      v13Close();toast('Anotação excluída.');
    };
  }
  window.v13OpenContentNote=openNote;
  document.addEventListener('DOMContentLoaded',()=>{const btn=document.querySelector('#viewerNote');if(btn)btn.addEventListener('click',openNote)});
})();