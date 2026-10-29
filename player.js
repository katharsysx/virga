(() => {
  const audio=document.getElementById('audioElement');
  const $=s=>document.querySelector(s);
  let tracks=[], currentId=null, currentUrl=null, onToast=()=>{}, onLibraryChange=()=>{};
  const t=(id,args)=>window.VirgaI18n.t(id,args);
  function id(){return crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`}
  function formatTime(seconds){if(!Number.isFinite(seconds)||seconds<0)return '0:00';const m=Math.floor(seconds/60),s=Math.floor(seconds%60);return `${m}:${String(s).padStart(2,'0')}`}
  function readableFileName(name){return name.replace(/\.[^.]+$/,'').replace(/[_]+/g,' ').trim()||name}
  function splitName(name){const pretty=readableFileName(name),parts=pretty.split(/\s+[-–—]\s+/);return parts.length>1?{artist:parts.shift(),title:parts.join(' — ')}:{artist:'',title:pretty}}
  function active(){return tracks.find(x=>x.id===currentId)||null}
  function updatePlayer(){
    const item=active(), playing=!audio.paused&&!audio.ended;
    const dock=$('#playerDock'),hasTracks=tracks.length>0;
    dock.hidden=!hasTracks;document.body.classList.toggle('has-player',hasTracks);
    $('#currentTrack').textContent=item?item.title:t('player.empty');
    $('#currentArtist').textContent=item?(item.artist||t('library.metaUnknown')):t('player.importHint');
    $('#playerThumb').textContent=item?'◉':'♫';
    const play=$('#togglePlayback');play.textContent=playing?'Ⅱ':'▶';play.setAttribute('aria-label',t(playing?'player.pause':'player.play'));
    $('#currentTime').textContent=formatTime(audio.currentTime);
    $('#totalTime').textContent=formatTime(audio.duration);
    const seek=$('#seekSlider');seek.value=audio.duration?Math.round(audio.currentTime/audio.duration*1000):0;
    onLibraryChange(tracks);
  }
  function paintLibrary(focusId=null){
    const focusedPlay=document.activeElement?.dataset?.localPlay;
    const focusedRemove=document.activeElement?.dataset?.removeAudio;
    const host=$('#fileLibrary');
    if(!tracks.length){host.innerHTML=`<div class="empty-state"><span class="empty-orbit">○</span><b data-i18n="library.emptyTitle">${escapeHtml(t('library.emptyTitle'))}</b><span>${escapeHtml(t('library.emptyBody'))}</span></div>`;return;}
    host.innerHTML=tracks.map(item=>`<article class="local-track ${item.id===currentId?'is-current':''}"><button class="local-play" type="button" data-local-play="${escapeHtml(item.id)}" aria-label="${escapeHtml(t(item.id===currentId&&!audio.paused?'player.pause':'player.play'))}: ${escapeHtml(item.title)}">${item.id===currentId&&!audio.paused?'Ⅱ':'▶'}</button><span class="local-track-copy"><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.artist||t('library.metaUnknown'))} <i>·</i> ${escapeHtml(item.duration?formatTime(item.duration):t('library.durationUnknown'))}</small></span><span class="local-badge mono">${escapeHtml(t('library.localBadge'))}</span><button class="remove-file" type="button" data-remove-audio="${escapeHtml(item.id)}" aria-label="${escapeHtml(t('library.remove'))}: ${escapeHtml(item.title)}">×</button></article>`).join('');
    if(focusId){$(`[data-local-play="${CSS.escape(focusId)}"]`)?.focus({preventScroll:true});return}
    if(focusedPlay)$(`[data-local-play="${CSS.escape(focusedPlay)}"]`)?.focus({preventScroll:true});
    else if(focusedRemove)$(`[data-remove-audio="${CSS.escape(focusedRemove)}"]`)?.focus({preventScroll:true});
  }
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  async function refresh(focusId=null){tracks=await window.VirgaStore.listAudio();if(currentId&&!tracks.some(x=>x.id===currentId)){currentId=null;audio.pause();audio.removeAttribute('src');audio.load();revokeUrl()}paintLibrary(focusId);updatePlayer();}
  function revokeUrl(){if(currentUrl){URL.revokeObjectURL(currentUrl);currentUrl=null}}
  function fileSignature(file){return `${file.name}\u0000${file.size}\u0000${file.lastModified}\u0000${file.type}`}
  function isDuplicate(file,item){
    if(item.signature)return item.signature===fileSignature(file);
    return item.fileName===file.name&&item.size===file.size&&item.mime===(file.type||'application/octet-stream');
  }
  function setSource(item,autoplay=false){
    if(!item)return;
    if(currentId!==item.id||!audio.src){audio.pause();revokeUrl();currentId=item.id;currentUrl=URL.createObjectURL(item.blob);audio.src=currentUrl;audio.load()}
    updatePlayer();paintLibrary();
    if(autoplay)audio.play().catch(()=>{onToast(t('player.error'));updatePlayer()});
  }
  async function addFiles(fileList){
    let accepted=0,duplicates=0;const files=[...fileList],max=100*1024*1024,extensions=/\.(mp3|wav|ogg|m4a)$/i;
    for(const file of files){
      if(file.size>max){onToast(t('library.sizeError',{file:file.name,limit:100}));continue}
      if(!extensions.test(file.name)&&!/^audio\/(mpeg|wav|x-wav|ogg|mp4|x-m4a)$/i.test(file.type)){onToast(t('library.typeError',{file:file.name}));continue}
      if(tracks.some(item=>isDuplicate(file,item))){duplicates++;continue}
      try{
        const meta=splitName(file.name), item={id:id(),title:meta.title,artist:meta.artist,fileName:file.name,mime:file.type||'application/octet-stream',size:file.size,lastModified:file.lastModified,signature:fileSignature(file),blob:file,addedAt:Date.now(),duration:0};
        await window.VirgaStore.putAudio(item);tracks.push(item);accepted++;
      }catch(error){onToast(t('library.storageError',{file:file.name}));}
    }
    if(accepted){tracks.sort((a,b)=>a.addedAt-b.addedAt);paintLibrary();updatePlayer();onToast(t(duplicates?'library.addedWithDuplicates':'library.added',{count:accepted,duplicates}));try{await navigator.storage?.persist?.()}catch(_){}}
    else if(duplicates)onToast(t('library.duplicate'));
    return accepted;
  }
  async function remove(idValue){
    const item=tracks.find(x=>x.id===idValue);if(!item)return;
    if(!window.confirm(t('library.removeConfirm',{title:item.title})))return;
    const index=tracks.indexOf(item),neighbor=tracks[index+1]||tracks[index-1];
    try{await window.VirgaStore.deleteAudio(idValue);if(currentId===idValue){audio.pause();audio.removeAttribute('src');audio.load();revokeUrl();currentId=null}await refresh(neighbor?.id||null);if(!neighbor)$('#fileInput').focus({preventScroll:true});onToast(t('library.removed'))}catch(_){onToast(t('common.error'))}
  }
  function next(delta){
    if(!tracks.length)return;
    let index=tracks.findIndex(x=>x.id===currentId);if(index<0)index=delta>0?-1:0;
    index=(index+delta+tracks.length)%tracks.length;
    const item=tracks[index];
    if(item.id===currentId){audio.currentTime=0;if(delta!==0)audio.play().catch(()=>onToast(t('player.error')));updatePlayer();paintLibrary();return}
    setSource(item,true);
  }
  async function toggle(){
    const item=active();if(!item){if(tracks[0])setSource(tracks[0],true);else onToast(t('player.importHint'));return}
    if(audio.paused){try{await audio.play()}catch(_){onToast(t('player.error'))}}else audio.pause();updatePlayer();paintLibrary();
  }
  function init(options={}){
    onToast=options.onToast||onToast;onLibraryChange=options.onLibraryChange||onLibraryChange;
    $('#fileInput').addEventListener('change',async e=>{await addFiles(e.target.files);e.target.value=''});
    $('#fileLibrary').addEventListener('click',e=>{const play=e.target.closest('[data-local-play]');if(play){const item=tracks.find(x=>x.id===play.dataset.localPlay);if(item&&item.id===currentId)toggle();else setSource(item,true);return}const removeButton=e.target.closest('[data-remove-audio]');if(removeButton)remove(removeButton.dataset.removeAudio)});
    $('#togglePlayback').addEventListener('click',toggle);$('#previousTrack').addEventListener('click',()=>next(-1));$('#nextTrack').addEventListener('click',()=>next(1));
    $('#volumeSlider').addEventListener('input',e=>{audio.volume=Number(e.target.value)});audio.volume=.8;
    $('#seekSlider').addEventListener('input',e=>{if(Number.isFinite(audio.duration))audio.currentTime=audio.duration*Number(e.target.value)/1000});
    $('#seekSlider').addEventListener('change',updatePlayer);
    audio.addEventListener('loadedmetadata',async()=>{
      const item=active();if(item&&Number.isFinite(audio.duration)&&item.duration!==audio.duration){item.duration=audio.duration;try{await window.VirgaStore.updateAudioMetadata(item)}catch(_){}}
      updatePlayer();paintLibrary();
    });
    ['timeupdate','durationchange','play','pause','ended','error'].forEach(event=>audio.addEventListener(event,()=>{
      if(event==='ended'){if(tracks.length>1)next(1);else{audio.pause();audio.currentTime=0;updatePlayer();paintLibrary()}return}
      if(event==='error'&&currentId)onToast(t('player.error'));
      updatePlayer();if(event!=='timeupdate'&&event!=='durationchange')paintLibrary();
    }));
    document.addEventListener('virga:languagechange',()=>{paintLibrary();updatePlayer()});
    refresh().catch(()=>{onToast(t('common.error'))});
  }
  window.VirgaPlayer={init,refresh,addFiles,get tracks(){return tracks},get current(){return active()}};
})();
