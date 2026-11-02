/* EDGY Gym Logger · profile, feed, modal and exercise UX */
"use strict";
let gymUXModalOpen=false,gymUXPickerSearch="",gymUXPickerMuscle="Todos",gymUXPickerEquipment="Todos";
let gymUXExSearch="",gymUXExMuscle="Todos",gymUXExEquipment="Todos",gymUXExSort="recentes";
const gymUXMuscles=["Todos","Peito","Costas","Ombros","Bíceps","Tríceps","Pernas","Gémeos","Abdómen","Outro"];
const gymUXEquip=["Todos","Halteres","Barra","Smith","Máquina","Cabo","Peso corporal","Barra EZ","Outro"];
const gymUXLabels=arr=>arr.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join("");
function gymUXModalRoot(){return document.getElementById("gymUXModal")}
function gymUXClose(){
 const root=gymUXModalRoot();if(!root)return;
 root.classList.remove("is-open");root.setAttribute("aria-hidden","true");root.innerHTML="";
 gymUXModalOpen=false;document.body.classList.remove("gymDialogLocked");
}
function gymUXShow(title,hint,content,wide=false){
 const root=gymUXModalRoot();if(!root)return;
 root.className="gymUXBackdrop is-open";root.setAttribute("aria-hidden","false");
 root.innerHTML='<section class="gymUXDialog '+(wide?'gymUXWide':'')+'" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><header class="gymUXHead"><div><span class="gymUXEyebrow">EDGY · GYM LOGGER</span><h2>'+esc(title)+'</h2><p>'+esc(hint)+'</p></div><button class="gymUXClose" type="button" data-ux-close aria-label="Fechar">×</button></header><div class="gymUXBody">'+content+'</div></section>';
 gymUXModalOpen=true;document.body.classList.add("gymDialogLocked");
 root.querySelector(title==="Perfil EDGY"?".gymUXClose":"input:not([type=hidden]),textarea,select,button")?.focus({preventScroll:true});
}
function gymUXField(name,label,placeholder,value="",attrs=""){
 return '<label class="gymUXField"><span>'+label+'</span><input class="gymUXInput" name="'+name+'" placeholder="'+esc(placeholder)+'" value="'+esc(value)+'" '+attrs+'></label>';
}
function gymUXActions(main){return '<div class="gymUXActions"><button class="btn secondary" type="button" data-ux-close>Cancelar</button><button class="btn" type="submit">'+esc(main)+'</button></div>'}
function gymUXWorkoutDialog(kind="start"){
 const start=kind==="start",title=start?"Começar treino":"Renomear treino";
 const suggestions=["Push","Pull","Legs","Upper","Lower","Peito","Costas + Bíceps","Ombros"];
 gymUXShow(title,start?"Escolhe um nome para a tua sessão.":"Atualiza o nome deste treino.",
 '<form class="gymUXForm" data-ux-form="workout">'+gymUXField("name","Nome do treino","Ex.: Peito + Ombros",start?"":active?.name||"", 'required maxlength="70" autocomplete="off"')+
 (start?'<div class="gymUXSuggestLabel">Sugestões rápidas</div><div class="gymUXChips">'+suggestions.map(x=>'<button type="button" class="gymUXChip" data-ux-suggestion="'+esc(x)+'">'+esc(x)+'</button>').join("")+'</div>':"")+gymUXActions(start?"Começar treino":"Guardar alterações")+
 '<input type="hidden" name="kind" value="'+kind+'"></form>');
}
function gymUXTemplateModal(id){
 const workout=gymDone().find(w=>w.id===id);if(!workout)return;
 gymUXShow("Guardar modelo","Reutiliza os exercícios e séries deste treino.",
 '<form class="gymUXForm" data-ux-form="template">'+
 gymUXField("name","Nome do modelo","Ex.: Push A",workout.name,'required maxlength="70"')+
 '<input type="hidden" name="workout_id" value="'+esc(id)+'">'+gymUXActions("Guardar modelo")+'</form>');
}
async function gymUXSaveTemplate(form){
 const data=new FormData(form),workout=gymDone().find(w=>w.id===data.get("workout_id"));
 const name=String(data.get("name")||"").trim();if(!workout||!name)return;
 const entries=(workout.gym_workout_exercises||[]).slice().sort((a,b)=>a.position-b.position);
 if(!entries.length){toast("Treino sem exercícios.");return}
 gymUXClose();
 action(async()=>{
  const {data:t,error}=await db.from("gym_templates").insert({user_id:user.id,name:name.slice(0,70)}).select("id").single();
  if(error)throw error;
  try{
   const rows=entries.map((x,i)=>{
    const working=(x.gym_sets||[]).filter(s=>s.set_type!=="warmup");
    const completed=working.filter(s=>s.completed);
    return {template_id:t.id,exercise_id:x.exercise_id,position:i,target_sets:Math.min(12,Math.max(1,working.length)),target_reps:Math.min(100,Math.max(1,completed[completed.length-1]?.reps||8))};
   });
   const {error:e}=await db.from("gym_template_exercises").insert(rows);
   if(e)throw e;
  }catch(e){await db.from("gym_templates").delete().eq("id",t.id);throw e}
  toast("Modelo guardado!");
 });
}
function gymUXCreateExercise(){
 gymUXShow("Criar exercício","Adiciona um exercício personalizado à tua biblioteca.",
 '<form class="gymUXForm" data-ux-form="exercise">'+gymUXField("name","Nome do exercício","Ex.: Incline Dumbbell Press","","required maxlength='95'")+
 '<div class="gymUXTwo"><label class="gymUXField"><span>Grupo muscular</span><select name="muscle" class="gymUXInput">'+gymUXLabels(gymUXMuscles.filter(x=>x!=="Todos"))+'</select></label><label class="gymUXField"><span>Equipamento</span><select name="equipment" class="gymUXInput">'+gymUXLabels(gymUXEquip.filter(x=>x!=="Todos"))+'</select></label></div>'+gymUXActions("Criar exercício")+'</form>');
}
function gymUXFavorites(){try{return new Set(JSON.parse(localStorage.getItem("edgy-gym-favs-"+user.id)||"[]"))}catch{return new Set()}}
function gymUXStoreFav(ids){localStorage.setItem("edgy-gym-favs-"+user.id,JSON.stringify([...ids]))}
function gymUXUsedIds(){
 const used=new Map();
 for(const w of history){for(const x of w.gym_workout_exercises||[]){if(!used.has(x.exercise_id))used.set(x.exercise_id,new Date(w.started_at).getTime())}}
 return used;
}
function gymUXExerciseFilter(items,query,muscle,eq,sort){
 const used=gymUXUsedIds(),favs=gymUXFavorites();
 let result=items.filter(x=>(muscle==="Todos"||x.muscle===muscle)&&(eq==="Todos"||x.equipment===eq)&&(x.name+" "+x.equipment+" "+x.muscle).toLowerCase().includes(query.trim().toLowerCase()));
 if(sort==="favoritos")result=result.filter(x=>favs.has(x.id));
 if(sort==="recentes")result.sort((a,b)=>(used.get(b.id)||0)-(used.get(a.id)||0)||a.name.localeCompare(b.name));
 if(sort==="alfabetico")result.sort((a,b)=>a.name.localeCompare(b.name));
 return result;
}
function gymUXExerciseRow(ex,mode){
 const fav=gymUXFavorites().has(ex.id);
 return '<div class="gymUXExerciseRow"><button type="button" class="gymUXExMain" '+(mode==="pick"?'data-ux-add-ex="'+ex.id+'"':'data-view-ex="'+ex.id+'"')+'><strong>'+esc(ex.name)+'</strong><small>'+esc(ex.muscle)+' <span>·</span> '+esc(ex.equipment)+'</small></button><button type="button" class="gymUXFav '+(fav?"is-fav":"")+'" data-ux-fav="'+ex.id+'" aria-label="'+(fav?"Remover favorito":"Adicionar favorito")+'">'+(fav?"★":"☆")+'</button></div>';
}
function gymUXPickerContent(){
 const rows=gymUXExerciseFilter(exercises,gymUXPickerSearch,gymUXPickerMuscle,gymUXPickerEquipment,"recentes");
 return '<div class="gymUXPickerControls">'+
 '<input class="gymUXInput" id="gymUXPickerSearch" placeholder="Pesquisar 158+ exercícios…" value="'+esc(gymUXPickerSearch)+'" autocomplete="off">'+
 '<div class="gymUXTwo"><select class="gymUXInput" id="gymUXPickerMuscle">'+gymUXLabels(gymUXMuscles)+'</select><select class="gymUXInput" id="gymUXPickerEquipment">'+gymUXLabels(gymUXEquip)+'</select></div></div>'+
 '<div class="gymUXList" id="gymUXPickerList">'+(rows.length?rows.map(x=>gymUXExerciseRow(x,"pick")).join(""):'<p class="muted">Não encontrámos exercícios com esses filtros.</p>')+'</div>';
}
function gymUXPickExercise(){
 gymUXPickerSearch="";gymUXPickerMuscle="Todos";gymUXPickerEquipment="Todos";
 gymUXShow("Adicionar exercício","Escolhe a variante e o equipamento que utilizaste.",gymUXPickerContent(),true);
 gymUXSetSelect("gymUXPickerMuscle",gymUXPickerMuscle);gymUXSetSelect("gymUXPickerEquipment",gymUXPickerEquipment);
}
function gymUXSetSelect(id,value){const x=document.getElementById(id);if(x)x.value=value}
function gymUXRefreshPicker(){
 const list=document.getElementById("gymUXPickerList");if(!list)return;
 list.innerHTML=gymUXExerciseFilter(exercises,gymUXPickerSearch,gymUXPickerMuscle,gymUXPickerEquipment,"recentes").map(x=>gymUXExerciseRow(x,"pick")).join("")||'<p class="muted">Nenhum resultado.</p>';
}
const gymUXPriorExercises=renderExercises;
renderExercises=function(){
 if(gymSelectedExercise)return gymUXPriorExercises();
 const filtered=gymUXExerciseFilter(exercises,gymUXExSearch,gymUXExMuscle,gymUXExEquipment,gymUXExSort);
 const metrics=gymUXUsedIds();
 return '<div class="gymUXTitleRow"><div><h1>Exercícios</h1><p class="muted">'+exercises.length+' exercícios disponíveis · '+metrics.size+' utilizados</p></div><button class="btn small" id="new-ex">＋ Criar</button></div>'+
 '<div class="card gymUXLibrary"><div class="gymUXPickerControls">'+
 '<input id="gymUXExSearch" class="gymUXInput" value="'+esc(gymUXExSearch)+'" placeholder="Pesquisar exercício ou equipamento…">'+
 '<div class="gymUXTwo"><select id="gymUXExMuscle" class="gymUXInput">'+gymUXLabels(gymUXMuscles)+'</select><select id="gymUXExEquipment" class="gymUXInput">'+gymUXLabels(gymUXEquip)+'</select></div>'+
 '<div class="gymUXSort"><button data-ux-sort="recentes" class="'+(gymUXExSort==="recentes"?"is-on":"")+'">Recentes</button><button data-ux-sort="favoritos" class="'+(gymUXExSort==="favoritos"?"is-on":"")+'">Favoritos</button><button data-ux-sort="alfabetico" class="'+(gymUXExSort==="alfabetico"?"is-on":"")+'">A–Z</button></div></div>'+
 '<div class="gymUXList">'+(filtered.length?filtered.map(x=>gymUXExerciseRow(x,"browse")).join(""):'<div class="gymUXEmpty">Nenhum exercício encontrado.</div>')+'</div></div>';
};
function gymUXFindUsers(title,people){
 gymUXShow(title,"Atletas da comunidade EDGY Gym.",
 '<div class="gymUXList">'+(people.length?people.map(p=>'<div class="gymUXPeopleRow">'+(p.user_id?'<button type="button" class="gymUXAthleteLink" data-gym-athlete="'+esc(p.user_id)+'">'+gymCommunityAvatar(p.user_id,p.display_name||"Atleta EDGY")+'<span><strong>'+esc(p.display_name||"Atleta EDGY")+'</strong><small>@'+esc(p.username||"edgy")+'</small></span></button>':'<div><strong>Perfil privado</strong></div>')+'</div>').join(""):'<div class="gymUXEmpty">Ainda não existem atletas nesta lista.</div>')+'</div>',true);
}
function gymUXSocialStats(){
 const followers=gymFollowRows.filter(f=>f.followed_id===user.id).map(f=>gymSocialProfiles.find(p=>p.user_id===f.follower_id)||{display_name:"Atleta EDGY",username:"privado"});
 const following=gymFollowRows.filter(f=>f.follower_id===user.id).map(f=>gymSocialProfiles.find(p=>p.user_id===f.followed_id)).filter(Boolean);
 return {followers,following};
}
const gymUXPriorProfile=renderProfile;
renderProfile=function(){
 let base=gymUXPriorProfile();
 if(!user)return base;
 const own=gymOwnSocial(),social=gymUXSocialStats();
 const controls='<div class="card gymUXProfileActions"><div class="gymUXProfileTop"><div><strong>A tua identidade EDGY</strong><small>As alterações de nome, @, descrição e fotografia também aparecem na EDGY Games.</small></div><button id="gymUXEditProfile" class="btn small">Editar perfil</button></div><div class="gymUXSocialStats"><button id="gymUXFollowers"><strong>'+social.followers.length+'</strong><span>Seguidores</span></button><button id="gymUXFollowing"><strong>'+social.following.length+'</strong><span>A seguir</span></button><div class="gymUXStatLikes"><strong>'+fmt(gymTotalLikesFor(user.id))+'</strong><span>Likes recebidos</span></div><div class="gymUXStatPosts"><strong>'+fmt(gymOwnContentCount())+'</strong><span>Posts e respostas</span></div><div class="gymUXVisibility"><span class="gymUXDot '+(own?.is_public?"public":"")+'"></span>'+(own?.is_public?"Perfil público":"Perfil privado")+'</div></div></div>';
 const marker='<div class="grid gymGrid4">';
 if(base.includes(marker))base=base.replace(marker,controls+marker);else base=controls+base;
 base=base.replace('<details><summary>＋ Adicionar medição</summary>','<details><summary>＋ Adicionar medição</summary><p class="muted" style="font-size:12px">Preenche só o que quiseres. Podes guardar apenas o peso, por exemplo.</p>');
 return base;
};
function gymUXEditProfile(){
 const social=gymOwnSocial();
 gymUXShow("Editar perfil","A tua identidade é partilhada com a EDGY Game Hub.",
 '<form class="gymUXForm" data-ux-form="profile">'+
 '<div class="gymUXPhoto"><div class="gymUXPhotoPreview" id="gymUXPhotoPreview">'+(profile?.avatar_path?'<img src="'+esc(db.storage.from("edgy-avatars").getPublicUrl(profile.avatar_path).data.publicUrl)+'" alt="Fotografia atual">':esc((profile?.display_name||"E").charAt(0)))+'</div><div><strong>Fotografia de perfil</strong><small>JPG, PNG ou WEBP. Podes recortar e ajustar antes de guardar.</small><label class="gymUXUpload">Alterar fotografia<input type="file" id="gymUXPhotoFile" accept="image/png,image/jpeg,image/webp" hidden></label></div></div>'+
 gymUXField("display_name","Nome","O teu nome",profile?.display_name||"", 'required maxlength="22" minlength="1" autocomplete="nickname"')+
 gymUXField("username","Identificador @","O teu identificador",profile?.username||"", 'required minlength="3" maxlength="20" pattern="[a-zA-Z0-9_]+" title="3 a 20 caracteres: letras, números ou _" autocapitalize="none" spellcheck="false"')+
 '<p class="gymUXProfileHint">O @ tem entre 3 e 20 caracteres: letras, números e _ (sem espaços, pontos ou hífenes).</p>'+
 '<label class="gymUXField"><span>Descrição</span><textarea name="bio" class="gymUXInput" rows="3" maxlength="160" placeholder="Sobre ti…">'+esc(profile?.bio||"")+'</textarea></label>'+
 '<label class="gymUXPrivacy"><span><strong>Perfil público no Gym</strong><small>Permite que outros atletas vejam o teu nome, @ e publicações. As medidas e os treinos completos permanecem privados.</small></span><input name="is_public" type="checkbox" '+(social?.is_public?"checked":"")+'></label>'+
 '<p class="gymUXFine">Email: '+esc(user.email||"")+' · Alterar a visibilidade aqui não altera a visibilidade do teu perfil na EDGY Games.</p><p class="gymUXProfileStatus" data-gym-profile-status role="status" aria-live="polite" hidden></p>'+gymUXActions("Guardar perfil")+'</form>',true);
}
const gymUXPriorFeed=renderFeed;
renderFeed=function(){
 const own=gymOwnSocial(),publicProfile=!!own?.is_public;
 const people=gymSocialProfiles.filter(p=>p.user_id!==user.id&&p.is_public&&(p.display_name+" "+p.username).toLowerCase().includes(gymFeedSearch.toLowerCase()));
 const following=new Set(gymFollowRows.filter(f=>f.follower_id===user.id).map(f=>f.followed_id));
 const visible=gymFeedPosts.filter(p=>gymFeedMode==="discover"||p.user_id===user.id||following.has(p.user_id));
 return '<div class="gymUXTitleRow"><div><h1>Feed</h1><p class="muted">Partilha o progresso com a comunidade.</p></div><div class="gymUXFeedHeadActions"><button type="button" class="gymUXNewPost" id="gymUXNewPost" aria-label="Criar publicação">＋ <span>Publicar</span></button></div></div>'+
 (!publicProfile?'<div class="card gymUXPrivate"><strong>O teu perfil está privado</strong><p class="muted">Podes descobrir publicações. Para publicar e receber seguidores, ativa o perfil público nas definições do Perfil.</p><button class="btn secondary small" id="gymUXEditProfile">Editar privacidade</button></div>':"")+
 '<div class="card gymUXFeedSwitch"><button class="'+(gymFeedMode==="following"?"is-on":"")+'" data-feed-mode="following">A seguir</button><button class="'+(gymFeedMode==="discover"?"is-on":"")+'" data-feed-mode="discover">Descobrir</button></div>'+
 (visible.length?visible.map(gymFeedCard).join(""):'<div class="card gymUXEmpty"><strong>Sem publicações nesta vista</strong><p class="muted">Encontra atletas ou publica a tua primeira conquista.</p></div>')+
 '<div class="card"><h3>Encontrar atletas</h3><input class="gymUXInput" id="gymFindPeople" placeholder="Procurar por nome ou @" value="'+esc(gymFeedSearch)+'">'+(people.length?people.slice(0,30).map(p=>'<div class="gymUXPeopleRow"><button type="button" class="gymUXAthleteLink" data-gym-athlete="'+esc(p.user_id)+'">'+gymCommunityAvatar(p.user_id,p.display_name)+'<span><strong>'+esc(p.display_name)+'</strong><small>@'+esc(p.username||"edgy")+'</small></span></button><button class="btn small '+(following.has(p.user_id)?"secondary":"")+'" data-follow="'+p.user_id+'">'+(following.has(p.user_id)?"A seguir ✓":"Seguir")+'</button></div>').join(""):'<p class="muted">Não há outros perfis públicos correspondentes.</p>')+'</div>';
};
function gymUXPostModal(){
 if(!gymOwnSocial()?.is_public){gymUXEditProfile();toast("Ativa o perfil público para publicares no Feed.");return}
 gymUXShow("Nova publicação","Partilha uma meta ou escreve uma mensagem.",
 '<form class="gymUXForm" data-ux-form="post"><div class="gymUXPostKinds"><label><input type="radio" name="kind" value="post" checked><span>✎ Publicação</span></label><label><input type="radio" name="kind" value="goal"><span>☆ Meta</span></label></div>'+
 '<label class="gymUXField"><span id="gymUXPostLabel">O que queres partilhar?</span><textarea name="text" class="gymUXInput" rows="4" minlength="1" maxlength="500" required placeholder="Escreve uma frase, uma conquista ou novidade…"></textarea></label>'+
 '<label class="gymUXField"><span>Detalhes adicionais (opcional)</span><textarea name="details" class="gymUXInput" rows="2" maxlength="450" placeholder="Mais contexto…"></textarea></label>'+gymUXActions("Publicar no Feed")+'</form>',true);
}
function gymUXAfterSave(){return load().then(()=>{render()})}
let gymUXProfileSaving=false;
async function gymUXProfileSave(form){
 if(gymUXProfileSaving||!user)return;
 const fields=new FormData(form);
 const name=String(fields.get("display_name")||"").trim();
 const username=String(fields.get("username")||"").trim().toLowerCase();
 const bio=String(fields.get("bio")||"").trim();
 const isPublic=fields.get("is_public")==="on";
 const status=form.querySelector("[data-gym-profile-status]");
 const button=form.querySelector('button[type="submit"]');
 const show=(message,error=false)=>{
  if(status){status.hidden=false;status.textContent=message;status.classList.toggle("is-error",error);status.classList.toggle("is-saving",!error)}
  else toast(message);
 };
 if(!name||name.length>22){show("O nome deve ter entre 1 e 22 caracteres.",true);return}
 if(!/^[a-z0-9_]{3,20}$/.test(username)){show("O @ deve ter 3 a 20 caracteres: letras, números ou _. Não são permitidos espaços, pontos ou hífenes.",true);return}
 if(bio.length>160){show("A descrição deve ter no máximo 160 caracteres.",true);return}
 gymUXProfileSaving=true;
 if(button){button.disabled=true;button.textContent="A guardar…"}
 show("A guardar o perfil EDGY…");
 try{
  const {data:saved,error}=await db.rpc("gym_update_my_profile",{
   p_display_name:name,
   p_username:username,
   p_bio:bio,
   p_is_public:isPublic
  });
  if(error)throw error;
  if(!saved?.saved)throw new Error("Não foi possível confirmar a gravação do perfil.");
  profile={...profile,display_name:name,username,bio};
  const own=gymSocialProfiles.find(p=>p.user_id===user.id);
  if(own)Object.assign(own,{display_name:name,username,is_public:isPublic});
  else gymSocialProfiles.push({user_id:user.id,display_name:name,username,is_public:isPublic,avatar_path:profile?.avatar_path||null});
  gymUXClose();
  render();
  toast("Perfil guardado com sucesso!");
  try{await load();render()}catch(refreshError){console.warn("Profile saved but refresh failed:",refreshError)}
 }catch(error){
  console.error("Gym profile update:",error);
  const message=error?.code==="23505"?"Esse identificador @ já está a ser utilizado. Escolhe outro.":
   error?.code==="23514"?"Os dados ultrapassam os limites permitidos pela EDGY.":
   error?.code==="PGRST202"?"Não foi possível aceder à atualização do perfil. Atualiza a aplicação e tenta novamente.":
   error?.message||"Não foi possível guardar. Verifica a ligação e tenta novamente.";
  show(message,true);
 }finally{
  gymUXProfileSaving=false;
  if(button?.isConnected){button.disabled=false;button.textContent="Guardar perfil"}
 }
}
async function gymUXUploadPhoto(file){
 if(!file)return;
 if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>12*1024*1024){toast("Escolhe JPG, PNG ou WEBP até 12 MB.");return}
 try{
  const cropped=typeof window.EDGY_editAvatar==="function"?await window.EDGY_editAvatar(file):file;
  if(!cropped)return;
  const newPath=user.id+"/"+(crypto.randomUUID?.()||String(Date.now()))+".jpg";
  const {error:u}=await db.storage.from("edgy-avatars").upload(newPath,cropped,{contentType:"image/jpeg",upsert:false});if(u)throw u;
  const {error:p}=await db.from("profiles").update({avatar_path:newPath}).eq("id",user.id);
  if(p){await db.storage.from("edgy-avatars").remove([newPath]);throw p}
  const old=profile?.avatar_path;
  await load();render();gymUXEditProfile();toast("Fotografia atualizada!");
  if(old&&old!==newPath&&old.startsWith(user.id+"/"))db.storage.from("edgy-avatars").remove([old]).catch(()=>{});
 }catch(error){console.error(error);toast(error.message||"Não foi possível guardar a fotografia")}
}
async function gymUXAddExercise(id){
 gymPrepareMotion("exercise",id);
 gymUXClose();
 action(async()=>{
  const {data:we,error:e}=await db.from("gym_workout_exercises").insert({workout_id:active.id,exercise_id:id,position:(active.gym_workout_exercises||[]).length}).select("id").single();
  if(e)throw e;
  const previous=previousFor(id)[0];
  const {error:s}=await db.from("gym_sets").insert({workout_exercise_id:we.id,position:0,weight:previous?.weight||0,reps:previous?.reps||0});
  if(s)throw s;
 });
}
document.addEventListener("click",event=>{
 const b=event.target.closest("button");if(!b)return;
 if(b.matches('[data-ux-close]')){event.preventDefault();gymUXClose();return}
 if(!user)return;
 // Capture existing prompt-based actions before the legacy handler can fire.
 if(b.dataset.saveTemplate){event.preventDefault();event.stopImmediatePropagation();gymUXTemplateModal(b.dataset.saveTemplate);return}
 if(["start","rename","new-ex","pick"].includes(b.id)){
  event.preventDefault();event.stopImmediatePropagation();
  if(b.id==="start")gymUXWorkoutDialog();
  if(b.id==="rename")gymUXWorkoutDialog("rename");
  if(b.id==="new-ex")gymUXCreateExercise();
  if(b.id==="pick")gymUXPickExercise();
  return;
 }
 if(b.dataset.uxSuggestion){event.preventDefault();document.querySelector('[data-ux-form="workout"] [name="name"]').value=b.dataset.uxSuggestion;return}
 if(b.dataset.uxFav){event.preventDefault();const favs=gymUXFavorites();favs.has(b.dataset.uxFav)?favs.delete(b.dataset.uxFav):favs.add(b.dataset.uxFav);gymUXStoreFav(favs);if(gymUXModalOpen)gymUXRefreshPicker();if(!gymUXModalOpen)render();return}
 if(b.dataset.uxAddEx){event.preventDefault();gymUXAddExercise(b.dataset.uxAddEx);return}
 if(b.dataset.uxSort){gymUXExSort=b.dataset.uxSort;render();return}
 if(b.id==="gymUXEditProfile"){gymUXEditProfile();return}
 if(b.id==="gymUXFollowers"){gymUXFindUsers("Seguidores",gymUXSocialStats().followers);return}
 if(b.id==="gymUXFollowing"){gymUXFindUsers("A seguir",gymUXSocialStats().following);return}
 if(b.id==="gymUXNewPost"){gymUXPostModal();return}
},true);
document.addEventListener("submit",event=>{
 const form=event.target;
 if(form.id==="measure"){
  event.preventDefault();event.stopImmediatePropagation();
  if(!user)return;
  const data=new FormData(form),fields=gymMetricFields.map(f=>f[0]),row={user_id:user.id,recorded_at:data.get("recorded_at")};
  let filled=0;
  for(const field of fields){const str=String(data.get(field)||"").trim();if(!str)continue;const val=Number(str);if(!Number.isFinite(val)||val<=0){toast("As medidas têm de ser valores positivos.");return}row[field]=val;filled++}
  if(!filled){toast("Preenche pelo menos uma medida, como o peso.");return}
  action(async()=>{const {error}=await db.from("gym_measurements").insert(row);if(error)throw error;toast("Medição guardada!")});
  return;
 }
 if(!form.matches("[data-ux-form]"))return;
 event.preventDefault();event.stopImmediatePropagation();
 if(!user)return;
 const data=new FormData(form),type=form.dataset.uxForm;
 if(type==="workout"){
  const name=String(data.get("name")||"").trim();if(!name){toast("Escreve o nome do treino.");return}
  const kind=data.get("kind");gymUXClose();
  action(async()=>{const q=kind==="rename"?db.from("gym_workouts").update({name}).eq("id",active.id):db.from("gym_workouts").insert({name,user_id:user.id});const {error}=await q;if(error)throw error});
 }
 if(type==="exercise"){
  const name=String(data.get("name")||"").trim();if(!name)return;
  gymUXClose();action(async()=>{const {error}=await db.from("gym_exercises").insert({user_id:user.id,name,muscle:data.get("muscle"),equipment:data.get("equipment")});if(error)throw error;toast("Exercício criado!")});
 }
 if(type==="profile")gymUXProfileSave(form);
 if(type==="template")gymUXSaveTemplate(form);
 if(type==="post"){
  const kind=data.get("kind"),value=String(data.get("text")||"").trim(),extra=String(data.get("details")||"").trim();
  if(!value)return;
  const title=kind==="goal"?"Objetivo: "+value.slice(0,115):value.slice(0,130);
  const body=kind==="post"?(value+(extra?"\n\n"+extra:"")).slice(0,500):extra.slice(0,500);
  gymUXClose();
  action(async()=>{const {error}=await db.from("gym_feed_posts").insert({user_id:user.id,kind,title,body});if(error)throw error;toast("Publicação criada!")});
 }
},true);
document.addEventListener("change",event=>{
 const x=event.target;
 if(x.id==="gymUXPickerMuscle"){gymUXPickerMuscle=x.value;gymUXRefreshPicker()}
 if(x.id==="gymUXPickerEquipment"){gymUXPickerEquipment=x.value;gymUXRefreshPicker()}
 if(x.id==="gymUXExMuscle"){gymUXExMuscle=x.value;render();gymUXSetSelect("gymUXExMuscle",gymUXExMuscle);gymUXSetSelect("gymUXExEquipment",gymUXExEquipment)}
 if(x.id==="gymUXExEquipment"){gymUXExEquipment=x.value;render();gymUXSetSelect("gymUXExMuscle",gymUXExMuscle);gymUXSetSelect("gymUXExEquipment",gymUXExEquipment)}
 if(x.id==="gymUXPhotoFile")gymUXUploadPhoto(x.files?.[0]);
 if(x.name==="kind"&&x.closest('[data-ux-form="post"]')){
  const label=document.getElementById("gymUXPostLabel");
  if(label)label.textContent=x.value==="goal"?"Qual é a tua meta?":"O que queres partilhar?";
 }
});
document.addEventListener("input",event=>{
 const x=event.target;
 if(x.id==="gymUXPickerSearch"){gymUXPickerSearch=x.value;gymUXRefreshPicker()}
 if(x.id==="gymUXExSearch"){
  gymUXExSearch=x.value;
  const caret=x.selectionStart;render();
  const input=document.getElementById("gymUXExSearch");
  input?.focus();input?.setSelectionRange(caret,caret);
  gymUXSetSelect("gymUXExMuscle",gymUXExMuscle);gymUXSetSelect("gymUXExEquipment",gymUXExEquipment);
 }
});
document.addEventListener("keydown",event=>{
 if(event.key==="Escape"&&gymUXModalOpen){event.preventDefault();gymUXClose()}
});
document.getElementById("gymUXModal")?.addEventListener("click",event=>{if(event.target===event.currentTarget)gymUXClose()});

const gymUXOldRender=render;
render=function(){gymUXOldRender();if(page==="exercicios"&&!gymSelectedExercise){gymUXSetSelect("gymUXExMuscle",gymUXExMuscle);gymUXSetSelect("gymUXExEquipment",gymUXExEquipment)}};
