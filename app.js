(() => {
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)], t=(key,args)=>window.VirgaI18n.t(key,args);
  function openModal(selector){const dialog=$(selector);if(dialog&&!dialog.open)dialog.showModal()}
  const records=[
    {id:'souvlaki',artist:'Slowdive',title:'Souvlaki',year:'1993',genre:'shoegaze',moods:['drizzle','static'],cover:'cover-a',art:'Souvlaki',note:'record.note.1',url:'https://music.apple.com/us/album/souvlaki/399211729'},
    {id:'grouper-hill',artist:'Grouper',title:'Dragging a Dead Deer Up a Hill',year:'2008',genre:'ambient',moods:['overcast','drizzle'],cover:'cover-b',art:'Dragging a Dead Deer',note:'record.note.2',url:'https://music.apple.com/us/album/dragging-a-dead-deer-up-a-hill/434319411'},
    {id:'eureka',artist:'Kinoko Teikoku',title:'eureka',year:'2013',genre:'indie',moods:['late','static'],cover:'cover-c',art:'eureka',note:'record.note.3',url:'https://kinokoteikoku.pages.dev/discography/101/'},
    {id:'bloom',artist:'Beach House',title:'Bloom',year:'2012',genre:'dream-pop',moods:['clear','overcast'],cover:'cover-d',art:'Bloom',note:'record.note.4',url:'https://beachhouse.bandcamp.com/album/bloom'}
  ];
  const moodKeys=['overcast','drizzle','clear','late','static'];
  let activeGenre='all', savedOnly=false, saved=new Set(window.VirgaStore.prefs.get('favorites',[])), toastTimer;
  const toastNode=$('#toast');
  function toast(message){toastNode.textContent=message;toastNode.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastNode.classList.remove('show'),2600)}
  function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function genreKey(value){return `genre.${value==='dream-pop'?'dreampop':value}`}
  function moodKey(value){return `mood.${value}`}
  function renderFilters(){
    const focusedGenre=document.activeElement?.dataset?.genre;
    const genres=['all',...new Set(records.map(record=>record.genre))];
    $('#genreFilters').innerHTML=genres.map(value=>`<button type="button" class="filter-chip ${value===activeGenre?'active':''}" data-genre="${value}" aria-pressed="${value===activeGenre}">${escapeHtml(value==='all'?t('archive.all'):t(genreKey(value)))}</button>`).join('');
    if(focusedGenre)$('#genreFilters [data-genre="'+CSS.escape(focusedGenre)+'"]')?.focus({preventScroll:true});
  }
  function renderArchive(){
    const focusedFavorite=document.activeElement?.dataset?.favorite;
    const focusedNote=document.activeElement?.dataset?.recordNote;
    const term=$('#searchInput').value.trim().toLocaleLowerCase(window.VirgaI18n.language);
    const visible=records.filter(record=>{
      const moodNames=record.moods.map(key=>t(moodKey(key)));
      const searchable=[record.artist,record.title,record.genre.replace('-',' '),...moodNames,t(genreKey(record.genre))].join(' ').toLocaleLowerCase(window.VirgaI18n.language);
      return(activeGenre==='all'||record.genre===activeGenre)&&(!savedOnly||saved.has(record.id))&&(!term||searchable.includes(term));
    });
    $('#savedCount').textContent=String(saved.size);
    $('#showSaved').setAttribute('aria-pressed',String(savedOnly));
    $('#showSaved').classList.toggle('selected',savedOnly);
    $('#archiveGrid').innerHTML=visible.length?visible.map(record=>{
      const isSaved=saved.has(record.id);
      return `<article class="album-card"><div class="cover ${record.cover}" role="img" aria-label="${escapeHtml(record.title)} — ${escapeHtml(record.artist)}"><span class="card-index">V / ${record.year}</span><span class="cover-title">${escapeHtml(record.art)}</span><span class="cover-sub">${escapeHtml(t(record.note))}</span><button class="favorite-button ${isSaved?'active':''}" type="button" data-favorite="${record.id}" aria-label="${escapeHtml(t(isSaved?'record.unfavorite':'record.favorite'))}" aria-pressed="${isSaved}">${isSaved?'♥':'♡'}</button></div><div class="card-meta"><div class="card-topline"><span>${escapeHtml(t(genreKey(record.genre)))}</span><span>${record.year}</span></div><h3>${escapeHtml(record.title)}</h3><p>${escapeHtml(record.artist)}</p><div class="card-bottom"><span class="reference-label mono">${escapeHtml(t('record.reference'))}</span><a class="record-link" href="${escapeHtml(record.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t('record.openRelease'))} ↗</a><button type="button" class="note-link" data-record-note="${record.id}">${escapeHtml(t('record.openNote'))} ↗</button></div><p class="record-limit">${escapeHtml(t('record.notPlayable'))}</p></div></article>`;
    }).join(''):`<div class="archive-empty">${escapeHtml(t('archive.empty'))}</div>`;
    if(focusedFavorite){$('#archiveGrid [data-favorite="'+CSS.escape(focusedFavorite)+'"]')?.focus({preventScroll:true})}
    else if(focusedNote){$('#archiveGrid [data-record-note="'+CSS.escape(focusedNote)+'"]')?.focus({preventScroll:true})}
  }
  function renderJournalMoodOptions(){
    const select=$('#noteMood'), previous=select.value;
    select.innerHTML=`<option value="">${escapeHtml(t('journal.noMood'))}</option>`+moodKeys.map(key=>`<option value="${key}">${escapeHtml(t(moodKey(key)))}</option>`).join('');
    select.value=moodKeys.includes(previous)?previous:'';
  }
  function renderJournal(entries,focusId=null){
    const host=$('#journalEntries');
    if(!entries.length){host.innerHTML=`<div class="empty-state empty-journal"><span class="empty-orbit">✳</span><b>${escapeHtml(t('journal.emptyTitle'))}</b><span>${escapeHtml(t('journal.emptyBody'))}</span></div>`}
    else host.innerHTML=entries.map(entry=>{
      const date=new Intl.DateTimeFormat(window.VirgaI18n.language,{dateStyle:'medium',timeStyle:'short'}).format(new Date(entry.createdAt));
      const weather=entry.mood?t(moodKey(entry.mood)):'';
      return `<article class="journal-entry" data-journal-entry="${escapeHtml(entry.id)}"><div class="journal-meta mono">${escapeHtml(date)}${weather?` <span>·</span> ${escapeHtml(weather)}`:''}</div><h3>${escapeHtml(entry.track)}</h3><p>${escapeHtml(entry.text)}</p><button type="button" class="delete-note" data-delete-note="${escapeHtml(entry.id)}">${escapeHtml(t('journal.delete'))} ×</button></article>`;
    }).join('');
    if(focusId)$('#journalEntries [data-delete-note="'+CSS.escape(focusId)+'"]')?.focus({preventScroll:true});
  }
  async function refreshJournal(focusId=null){try{renderJournal(await window.VirgaStore.listJournal(),focusId)}catch(_){toast(t('common.error'))}}
  function openJournal(record){
    $('#noteResponse').textContent='';$('#noteTrack').value=record?`${record.artist} — ${record.title}`:'';$('#noteText').value='';$('#noteMood').value=record?(record.moods[0]||''):'';openModal('#noteModal');setTimeout(()=>$('#noteTrack').focus(),40);
  }
  const checkPassword=password=>window.VirgaSecurity.checkPassword(password);
  let supabase=null, supabaseLoadError=false, authUser=null, recoveryEmail='';
  async function initSupabase(){
    const config=window.VIRGA_SUPABASE_CONFIG||{};
    if(!config.url||!config.anonKey)return;
    try{
      const sdk=await import('https://esm.sh/@supabase/supabase-js@2');
      supabase=sdk.createClient(config.url,config.anonKey,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
      supabase.auth.onAuthStateChange((event,session)=>{
        authUser=session?.user||null;updateAccountButton();
        if(event==='PASSWORD_RECOVERY'){showAuth('new-password')}
      });
      const {data,error}=await supabase.auth.getSession();if(error)throw error;authUser=data.session?.user||null;updateAccountButton();
    }catch(error){console.error('Supabase client could not initialize.');supabaseLoadError=true;}
  }
  function updateAccountButton(){
    const label=$('#profileButton .profile-label'),avatar=$('#profileButton .profile-avatar');
    if(authUser){label.textContent=authUser.email||t('auth.account');avatar.textContent=(authUser.email||'V').slice(0,1).toUpperCase()}
    else{label.textContent=t('auth.account');avatar.textContent='·'}
  }
  function authError(error){
    const code=String(error?.code||error?.name||'').toLowerCase(),message=String(error?.message||'').toLowerCase();
    if(code.includes('weak_password')||message.includes('weak password'))return t('auth.passwordWeak');
    if(code.includes('otp_expired')||code.includes('bad_code')||message.includes('expired')||message.includes('invalid token'))return t('auth.expiredCode');
    if(code.includes('rate_limit')||code.includes('over_email_send_rate_limit')||error?.status===429)return t('auth.rateLimit');
    if(message.includes('email not confirmed'))return t('auth.confirmEmail');
    if(message.includes('invalid login credentials'))return t('auth.invalidLogin');
    return t('auth.genericError');
  }
  function authSetupMarkup(){
    const title=supabaseLoadError?t('auth.connectionError'):t('auth.setupTitle');
    const body=supabaseLoadError?t('auth.connectionBody'):t('auth.setupBody');
    return `<h2>${escapeHtml(title)}</h2><p class="modal-intro">${escapeHtml(body)}</p><div class="auth-message">${escapeHtml(t('auth.setupNote'))}</div><a class="button button-outline full" href="#library" data-auth-close>${escapeHtml(t('common.close'))}</a>`;
  }
  function renderPasswordRules(password){
    const result=checkPassword(password), keys=['length','upper','digits','symbol','common','pattern'];
    const fill=$('#passwordStrengthFill'),status=$('#passwordStrengthText'),list=$('#passwordRules');
    if(!fill||!status||!list)return result;
    fill.style.width=`${(result.score/6)*100}%`;fill.dataset.level=result.level;status.dataset.level=result.level;
    status.textContent=t(password?`auth.strength${result.level[0].toUpperCase()+result.level.slice(1)}`:'auth.strengthEmpty');
    list.innerHTML=keys.map(key=>`<li class="${result.tests[key]?'passed':''}" data-rule="${key}"><span aria-hidden="true">${result.tests[key]?'✓':'○'}</span>${escapeHtml(t(`auth.rule${key[0].toUpperCase()+key.slice(1)}`))}</li>`).join('');
    return result;
  }
  function passwordField(id,label,placeholder,{confirm=false,checks=false,current=false}={}){
    return `<label class="form-label" for="${id}"><span>${escapeHtml(t(label))}</span><span class="password-input-wrap"><input id="${id}" type="password" autocomplete="${current?'current-password':'new-password'}" ${checks?'minlength="8" maxlength="20"':''} placeholder="${escapeHtml(t(placeholder))}" ${checks?'aria-describedby="passwordStrengthText passwordRules"':''} required><button class="password-toggle" type="button" data-toggle-password="${id}" aria-label="${escapeHtml(t('auth.showPassword'))}" aria-pressed="false">◉</button></span></label>`;
  }
  function showAuth(view='login'){
    if(!supabase){$('#authContent').innerHTML=authSetupMarkup();openModal('#authModal');return}
    if(view==='profile'){
      if(!authUser){view='login'}else{$('#authContent').innerHTML=`<h2>${escapeHtml(t('auth.profileTitle'))}</h2><p class="modal-intro">${escapeHtml(t('auth.signedIn',{email:authUser.email||''}))}</p><div class="auth-message">${escapeHtml(t('auth.localDataNote'))}</div><button class="auth-secondary" type="button" id="signOutButton">${escapeHtml(t('auth.signOut'))}</button>`;openModal('#authModal');$('#signOutButton').onclick=async()=>{const button=$('#signOutButton');button.disabled=true;try{const{error}=await supabase.auth.signOut();if(error)throw error;authUser=null;updateAccountButton();$('#authModal').close();toast(t('auth.signedOut'))}catch(error){button.disabled=false;toast(authError(error))}};return}
    }
    if(view==='new-password'){
      $('#authContent').innerHTML=`<h2>${escapeHtml(t('auth.resetTitle'))}</h2><p class="modal-intro">${escapeHtml(t('auth.newPasswordIntro'))}</p>${passwordField('newPassword','auth.newPassword','auth.passwordPlaceholder',{checks:true})}<div class="strength-wrap"><div class="strength-bar"><span id="passwordStrengthFill" data-level="weak"></span></div><span id="passwordStrengthText" role="status" aria-live="polite" data-level="weak">${escapeHtml(t('auth.strengthEmpty'))}</span><ul id="passwordRules"></ul></div>${passwordField('confirmPassword','auth.confirm','auth.confirmPlaceholder',{confirm:true})}<div class="auth-response" id="authResponse" aria-live="polite"></div><button class="button button-light full" id="updatePasswordButton">${escapeHtml(t('auth.updatePassword'))} ↗</button><p class="auth-note">${escapeHtml(t('auth.keyNotice'))}</p>`;
      openModal('#authModal');bindAuthForm('new-password');return;
    }
    if(view==='reset-code'){
      const recoveryEmailField=recoveryEmail?'':`<label class="form-label" for="resetEmail"><span>${escapeHtml(t('auth.email'))}</span><input id="resetEmail" type="email" autocomplete="email" placeholder="${escapeHtml(t('auth.emailPlaceholder'))}" required></label>`;
      $('#authContent').innerHTML=`<h2>${escapeHtml(t('auth.codeTitle'))}</h2><p class="modal-intro">${escapeHtml(t('auth.codeIntro'))}</p>${recoveryEmailField}<label class="form-label" for="recoveryCode"><span>${escapeHtml(t('auth.code'))}</span><input id="recoveryCode" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="${escapeHtml(t('auth.codePlaceholder'))}" required></label>${passwordField('newPassword','auth.newPassword','auth.passwordPlaceholder',{checks:true})}<div class="strength-wrap"><div class="strength-bar"><span id="passwordStrengthFill" data-level="weak"></span></div><span id="passwordStrengthText" role="status" aria-live="polite" data-level="weak">${escapeHtml(t('auth.strengthEmpty'))}</span><ul id="passwordRules"></ul></div>${passwordField('confirmPassword','auth.confirm','auth.confirmPlaceholder',{confirm:true})}<div class="auth-response" id="authResponse" aria-live="polite"></div><button class="button button-light full" id="verifyRecoveryButton">${escapeHtml(t('auth.updatePassword'))} ↗</button><button class="auth-secondary" type="button" data-auth-view="reset">${escapeHtml(t('auth.resend'))}</button>`;
      openModal('#authModal');bindAuthForm('reset-code');return;
    }
    if(view==='reset'){
      $('#authContent').innerHTML=`<h2>${escapeHtml(t('auth.resetTitle'))}</h2><p class="modal-intro">${escapeHtml(t('auth.resetIntro'))}</p><label class="form-label" for="resetEmail"><span>${escapeHtml(t('auth.email'))}</span><input id="resetEmail" type="email" autocomplete="email" placeholder="${escapeHtml(t('auth.emailPlaceholder'))}" required></label><div class="auth-response" id="authResponse" aria-live="polite"></div><button class="button button-light full" id="sendResetButton">${escapeHtml(t('auth.sendReset'))} ↗</button><div class="auth-links"><button type="button" data-auth-view="login">${escapeHtml(t('auth.backLogin'))}</button><button type="button" data-auth-view="reset-code">${escapeHtml(t('auth.enterCode'))}</button></div>`;
      openModal('#authModal');$('#sendResetButton').onclick=sendRecovery;return;
    }
    const signup=view==='signup';
    $('#authContent').innerHTML=`<h2>${escapeHtml(t(signup?'auth.signupTitle':'auth.loginTitle'))}</h2><p class="modal-intro">${escapeHtml(t('auth.intro'))}</p><div class="auth-tabs"><button class="${!signup?'active':''}" type="button" data-auth-view="login">${escapeHtml(t('auth.loginTab'))}</button><button class="${signup?'active':''}" type="button" data-auth-view="signup">${escapeHtml(t('auth.signupTab'))}</button></div>${signup?`<label class="form-label" for="displayName"><span>${escapeHtml(t('auth.name'))}</span><input id="displayName" maxlength="60" autocomplete="name" placeholder="${escapeHtml(t('auth.namePlaceholder'))}"></label>`:''}<label class="form-label" for="authEmail"><span>${escapeHtml(t('auth.email'))}</span><input id="authEmail" type="email" autocomplete="email" placeholder="${escapeHtml(t('auth.emailPlaceholder'))}" required></label>${passwordField('authPassword','auth.password',signup?'auth.passwordPlaceholder':'auth.loginPasswordPlaceholder',{checks:signup,current:!signup})}${signup?`<div class="strength-wrap"><div class="strength-bar"><span id="passwordStrengthFill" data-level="weak"></span></div><span id="passwordStrengthText" role="status" aria-live="polite" data-level="weak">${escapeHtml(t('auth.strengthEmpty'))}</span><ul id="passwordRules"></ul></div>${passwordField('confirmPassword','auth.confirm','auth.confirmPlaceholder',{confirm:true})}`:''}<div class="auth-response" id="authResponse" aria-live="polite"></div><button class="button button-light full" id="submitAuthButton">${escapeHtml(t(signup?'auth.submitSignup':'auth.submitLogin'))} ↗</button><div class="auth-links">${signup?'':`<button type="button" data-auth-view="reset">${escapeHtml(t('auth.forgot'))}</button>`}<span class="mono auth-secure">${escapeHtml(t('auth.status'))}</span></div>${signup?`<p class="auth-note">${escapeHtml(t('auth.keyNotice'))}</p>`:''}`;
    openModal('#authModal');bindAuthForm(signup?'signup':'login');
  }
  function showAuthMessage(message,kind='error'){
    const host=$('#authResponse');if(!host)return;host.innerHTML='';const el=document.createElement('div');el.className=`auth-message ${kind}`;el.textContent=message;host.append(el);
  }
  function setPending(button,pending){button.disabled=pending;button.dataset.original=button.dataset.original||button.textContent;if(pending)button.textContent=t('auth.loading');else button.textContent=button.dataset.original}
  function bindAuthForm(mode){
    const password=$('#authPassword')||$('#newPassword');
    if(password&&mode!=='login'){password.addEventListener('input',()=>renderPasswordRules(password.value));renderPasswordRules(password.value)}
    $$('[data-toggle-password]').forEach(button=>button.addEventListener('click',()=>{const input=$(`#${button.dataset.togglePassword}`),show=input.type==='password';input.type=show?'text':'password';button.setAttribute('aria-pressed',String(show));button.setAttribute('aria-label',t(show?'auth.hidePassword':'auth.showPassword'))}));
    if(mode==='login'||mode==='signup')$('#submitAuthButton').onclick=()=>submitAuth(mode);
    if(mode==='new-password')$('#updatePasswordButton').onclick=()=>updatePassword();
    if(mode==='reset-code')$('#verifyRecoveryButton').onclick=()=>verifyRecovery();
  }
  async function submitAuth(mode){
    const email=$('#authEmail').value.trim(),password=$('#authPassword').value,button=$('#submitAuthButton');
    if(!email||!password){showAuthMessage(t('auth.fieldsRequired'));return}
    if(!$('#authEmail').checkValidity()){showAuthMessage(t('auth.emailRequired'));return}
    if(mode==='signup'){
      const name=$('#displayName').value.trim(),confirm=$('#confirmPassword').value,quality=checkPassword(password);
      renderPasswordRules(password);
      if(!quality.strong){showAuthMessage(t('auth.passwordWeak'));return}
      if(password!==confirm){showAuthMessage(t('auth.passwordMismatch'));return}
      setPending(button,true);
      try{const{data,error}=await supabase.auth.signUp({email,password,options:{data:{display_name:name||null},emailRedirectTo:location.href.split('#')[0]}});if(error)throw error;if(data.session){authUser=data.user;updateAccountButton();$('#authModal').close();toast(t('auth.signedIn',{email}))}else showAuthMessage(t('auth.signupCheck'),'success')}
      catch(error){showAuthMessage(authError(error))}finally{setPending(button,false)}
      return;
    }
    setPending(button,true);
    try{const{data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;authUser=data.user;updateAccountButton();$('#authModal').close();toast(t('auth.signedIn',{email}))}
    catch(error){showAuthMessage(authError(error))}finally{setPending(button,false)}
  }
  async function sendRecovery(){
    const email=$('#resetEmail').value.trim(),button=$('#sendResetButton');if(!email||!$('#resetEmail').checkValidity()){showAuthMessage(t('auth.emailRequired'));return}
    recoveryEmail=email;setPending(button,true);
    try{const{error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:location.href.split('#')[0]});if(error)throw error;showAuthMessage(t('auth.emailCheck'),'success');const next=document.createElement('button');next.className='inline-link';next.type='button';next.textContent=t('auth.enterCode');next.addEventListener('click',()=>showAuth('reset-code'));$('#authResponse').append(next)}
    catch(error){showAuthMessage(authError(error))}finally{setPending(button,false)}
  }
  async function verifyRecovery(){
    const email=recoveryEmail||$('#resetEmail')?.value?.trim(),code=$('#recoveryCode').value.trim(),password=$('#newPassword').value,confirm=$('#confirmPassword').value,button=$('#verifyRecoveryButton');
    const quality=checkPassword(password);renderPasswordRules(password);
    if(!email||!code){showAuthMessage(t('auth.fieldsRequired'));return}if($('#resetEmail')&&!$('#resetEmail').checkValidity()){showAuthMessage(t('auth.emailRequired'));return}if(!quality.strong){showAuthMessage(t('auth.passwordWeak'));return}if(password!==confirm){showAuthMessage(t('auth.passwordMismatch'));return}
    setPending(button,true);
    try{const{error:verifyError}=await supabase.auth.verifyOtp({email,token:code,type:'recovery'});if(verifyError)throw verifyError;const{error:updateError}=await supabase.auth.updateUser({password});if(updateError)throw updateError;authUser=(await supabase.auth.getUser()).data.user;updateAccountButton();showAuthMessage(t('auth.passwordChanged'),'success');const back=document.createElement('button');back.className='inline-link';back.type='button';back.textContent=t('auth.backLogin');back.onclick=()=>showAuth('login');$('#authResponse').append(back)}
    catch(error){showAuthMessage(authError(error))}finally{setPending(button,false)}
  }
  async function updatePassword(){
    const password=$('#newPassword').value,confirm=$('#confirmPassword').value,button=$('#updatePasswordButton'),quality=checkPassword(password);renderPasswordRules(password);
    if(!quality.strong){showAuthMessage(t('auth.passwordWeak'));return}if(password!==confirm){showAuthMessage(t('auth.passwordMismatch'));return}
    setPending(button,true);try{const{error}=await supabase.auth.updateUser({password});if(error)throw error;showAuthMessage(t('auth.passwordChanged'),'success');const back=document.createElement('button');back.className='inline-link';back.type='button';back.textContent=t('auth.backLogin');back.onclick=async()=>{await supabase.auth.signOut();authUser=null;updateAccountButton();showAuth('login')};$('#authResponse').append(back)}catch(error){showAuthMessage(authError(error))}finally{setPending(button,false)}
  }
  function renderPrompt(){const index=Number(window.VirgaStore.prefs.get('promptIndex',0))%4;$('#promptText').textContent=t(index===0?'journal.prompt':`journal.newPrompt${index}`)}
  async function deleteNote(id){if(!window.confirm(t('journal.deleteConfirm')))return;try{const before=await window.VirgaStore.listJournal(),index=before.findIndex(entry=>entry.id===id),next=before[index+1]||before[index-1];await window.VirgaStore.deleteJournal(id);await refreshJournal(next?.id||null);if(!next)$('#addEntry').focus({preventScroll:true});toast(t('journal.deleted'))}catch(_){toast(t('journal.removeError'))}}
  function init(){
    window.VirgaI18n.apply();
    renderFilters();renderArchive();renderJournalMoodOptions();renderPrompt();refreshJournal();
    $('#languageSelect').addEventListener('change',event=>window.VirgaI18n.setLanguage(event.target.value));
    $('#quietToggle').setAttribute('aria-pressed',String(window.VirgaStore.prefs.get('quiet',false)));
    document.body.classList.toggle('quiet-mode',window.VirgaStore.prefs.get('quiet',false));
    $('#quietToggle').addEventListener('click',event=>{const enabled=!document.body.classList.contains('quiet-mode');document.body.classList.toggle('quiet-mode',enabled);event.currentTarget.setAttribute('aria-pressed',String(enabled));window.VirgaStore.prefs.set('quiet',enabled);toast(t(enabled?'settings.quietOn':'settings.quietOff'))});
    $('#genreFilters').addEventListener('click',event=>{const button=event.target.closest('[data-genre]');if(!button)return;activeGenre=button.dataset.genre;renderFilters();renderArchive()});
    $('#searchInput').addEventListener('input',renderArchive);
    $('#clearFilters').addEventListener('click',()=>{activeGenre='all';savedOnly=false;$('#searchInput').value='';renderFilters();renderArchive()});
    $('#showSaved').addEventListener('click',()=>{savedOnly=!savedOnly;renderArchive()});
    $('#archiveGrid').addEventListener('click',event=>{
      const favorite=event.target.closest('[data-favorite]');if(favorite){const id=favorite.dataset.favorite;saved.has(id)?saved.delete(id):saved.add(id);window.VirgaStore.prefs.set('favorites',[...saved]);renderArchive();toast(t(saved.has(id)?'record.savedToast':'record.removedToast'));return}
      const note=event.target.closest('[data-record-note]');if(note){const record=records.find(item=>item.id===note.dataset.recordNote);openJournal(record);return}
    });
    $('#addEntry').addEventListener('click',()=>openJournal(null));
    $('#saveJournalEntry').addEventListener('click',async()=>{const track=$('#noteTrack').value.trim(),text=$('#noteText').value.trim(),mood=moodKeys.includes($('#noteMood').value)?$('#noteMood').value:null;if(!track){$('#noteResponse').textContent=t('journal.trackRequired');return}if(!text){$('#noteResponse').textContent=t('journal.textRequired');return}try{await window.VirgaStore.putJournal({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),track,text,mood,createdAt:Date.now()});$('#noteModal').close();await refreshJournal();toast(t('journal.saved'))}catch(_){$('#noteResponse').textContent=t('journal.removeError')}});
    $('#journalEntries').addEventListener('click',event=>{const button=event.target.closest('[data-delete-note]');if(button)deleteNote(button.dataset.deleteNote)});
    $('#promptButton').addEventListener('click',()=>{const next=(Number(window.VirgaStore.prefs.get('promptIndex',0))+1)%4;window.VirgaStore.prefs.set('promptIndex',next);$('#promptText').textContent=t(next===0?'journal.prompt':`journal.newPrompt${next}`)});
    $('#profileButton').addEventListener('click',()=>showAuth(authUser?'profile':'login'));
    $('#authContent').addEventListener('click',event=>{const nav=event.target.closest('[data-auth-view]');if(nav){showAuth(nav.dataset.authView);return}if(event.target.closest('[data-auth-close]'))$('#authModal').close()});
    $('#authContent').addEventListener('keydown',event=>{if(event.key!=='Enter'||!event.target.matches('input')||event.target.type==='button')return;const button=$('#submitAuthButton')||$('#sendResetButton')||$('#verifyRecoveryButton')||$('#updatePasswordButton');if(button){event.preventDefault();button.click()}});
    $$('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
    [$('#authModal'),$('#noteModal')].forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()}));
    document.addEventListener('keydown',event=>{if(event.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){event.preventDefault();$('#archive').scrollIntoView({behavior:'smooth'});setTimeout(()=>$('#searchInput').focus(),300)}});
    $('.menu-toggle').addEventListener('click',()=>{const nav=$('.main-nav'),shown=nav.classList.toggle('mobile-open');$('.menu-toggle').setAttribute('aria-expanded',String(shown))});
    $('.main-nav').addEventListener('click',event=>{if(event.target.closest('a')){$('.main-nav').classList.remove('mobile-open');$('.menu-toggle').setAttribute('aria-expanded','false')}});
    document.addEventListener('virga:languagechange',()=>{renderFilters();renderArchive();renderJournalMoodOptions();renderPrompt();refreshJournal(document.activeElement?.dataset?.deleteNote||null);updateAccountButton();$('#volumeSlider').setAttribute('aria-label',t('player.volume'));$('#seekSlider').setAttribute('aria-label',t('player.seek'))});
    window.VirgaPlayer.init({onToast:toast});initSupabase();
  }
  document.addEventListener('DOMContentLoaded',init,{once:true});
})();
