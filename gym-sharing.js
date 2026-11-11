/* EDGY Gym · structured workouts, public shared training cards, and opt-in PR posts */
"use strict";
const gymSharedWorkoutCache=new Map();
let gymSharedCacheOwner=null;
function gymShareEnsureAccount(){
 const current=user?.id||null;
 if(current!==gymSharedCacheOwner){
  gymSharedWorkoutCache.clear();
  gymOwnWorkoutsVisible=12;
  gymSharedCacheOwner=current;
 }
}
let gymSharedLoading=false;
let gymSharePublishing=false;
let gymOwnWorkoutsVisible=12;
function gymSharingWorkoutToDetail(workout){
 const entries=(workout.gym_workout_exercises||[]).slice().sort((a,b)=>a.position-b.position);
 return {
  id:workout.id,name:workout.name,started_at:workout.started_at,finished_at:workout.finished_at,
  duration_minutes:duration(workout),volume_kg:volume(workout),completed_sets:count(workout),
  exercise_count:entries.length,
  exercises:entries.map(we=>({
   name:we.gym_exercises?.name||"Exercício",exercise_id:we.exercise_id,
   sets:(we.gym_sets||[]).filter(set=>set.completed).slice().sort((a,b)=>a.position-b.position)
  }))
 };
}
function gymSharingNum(value){return fmt(Number(value)||0)}
function gymSharingSetsHTML(sets){
 if(!sets?.length)return '<p class="gymShareEmpty">Sem séries concluídas neste exercício.</p>';
 return '<div class="gymShareSets">'+sets.map((s,i)=>{
  const tag=s.set_type==="warmup"?"W":s.set_type==="dropset"?"D":String(i+1);
  return '<div class="gymShareSet"><span class="gymShareSetTag '+(s.set_type==="warmup"?"warmup":s.set_type==="dropset"?"dropset":"")+'">'+tag+'</span>'+
   '<strong>'+gymSharingNum(s.weight)+' kg <span>×</span> '+gymSharingNum(s.reps)+'</strong>'+
   (s.to_failure?'<small class="gymShareFailure">FALHA</small>':'')+
   (s.rpe!=null?'<small>RPE '+gymSharingNum(s.rpe)+'</small>':'')+
   '</div>';
 }).join("")+'</div>';
}
function gymSharingTopSet(exercise){
 const sets=(exercise?.sets||[]).filter(s=>s.completed!==false&&Number(s.reps)>0);
 const working=sets.filter(s=>s.set_type!=="warmup"&&s.set_type!=="dropset");
 const candidates=working.length?working:sets.filter(s=>s.set_type!=="warmup");
 const available=candidates.length?candidates:sets;
 return available.slice().sort((a,b)=>Number(b.weight||0)-Number(a.weight||0)||Number(b.reps||0)-Number(a.reps||0))[0]||null;
}
function gymSharingTopSetsText(workout){
 return (workout.exercises||[]).map(ex=>{
  const s=gymSharingTopSet(ex);
  return s?ex.name+": "+gymSharingNum(s.weight)+" kg × "+gymSharingNum(s.reps):null;
 }).filter(Boolean).join("\n");
}
function gymSharingCompactHTML(workout){
 if(!workout)return '<p class="gymShareEmpty">Treino indisponível ou privado.</p>';
 const exercises=workout.exercises||[];
 const topSets=exercises.map(ex=>{
  const s=gymSharingTopSet(ex);
  return '<div class="gymShareTopRow"><span>'+esc(ex.name||"Exercício")+'</span>'+
   '<strong>'+(s?gymSharingNum(s.weight)+' kg <small>×</small> '+gymSharingNum(s.reps):'Sem séries concluídas')+'</strong></div>';
 }).join("");
 return '<div class="gymShareCompact"><div class="gymShareCompactMeta"><span>'+gymSharingNum(workout.duration_minutes)+' min</span><span>'+gymSharingNum(workout.volume_kg)+' kg volume</span><span>'+gymSharingNum(workout.completed_sets)+' séries</span></div>'+
 '<div class="gymShareTopSets"><div class="gymShareTopHeading">TOP SETS · MELHOR SÉRIE DE CADA EXERCÍCIO</div>'+
 (topSets||'<p class="gymShareEmpty">Sem exercícios concluídos.</p>')+'</div>'+
 '<details class="gymShareDetails"><summary>Ver treino completo <span>Exercícios e todas as séries</span></summary><div class="gymShareExpanded">'+gymSharingWorkoutHTML(workout)+'</div></details></div>';
}
function gymSharingWorkoutHTML(workout){
 if(!workout)return '<p class="gymShareEmpty">Treino indisponível ou privado.</p>';
 const exercises=(workout.exercises||[]);
 const total=Number(workout.volume_kg)||0;
 return '<div class="gymShareSummary">'+
 '<div class="gymShareMeta"><span><strong>'+gymSharingNum(workout.duration_minutes)+'</strong><small>minutos</small></span>'+
 '<span><strong>'+gymSharingNum(total)+'</strong><small>kg de volume</small></span>'+
 '<span><strong>'+gymSharingNum(workout.completed_sets)+'</strong><small>séries</small></span>'+
 '<span><strong>'+gymSharingNum(exercises.length)+'</strong><small>exercícios</small></span></div>'+
 '<div class="gymShareExerciseList">'+exercises.map((ex,i)=>
 '<section class="gymShareExercise"><header><span class="gymShareExerciseIndex">'+String(i+1).padStart(2,"0")+'</span><strong>'+esc(ex.name||"Exercício")+'</strong><small>'+ex.sets.length+' '+(ex.sets.length===1?"série":"séries")+'</small></header>'+
 gymSharingSetsHTML(ex.sets)+'</section>').join("")+'</div></div>';
}
function gymSharingInline(workoutId){
 gymShareEnsureAccount();
 const known=gymSharedWorkoutCache.has(workoutId);
 const saved=gymSharedWorkoutCache.get(workoutId);
 return '<div class="gymSharedWorkoutInline" data-gym-workout-preview="'+esc(workoutId)+'">'+
 (known?gymSharingCompactHTML(saved):'<p class="gymShareLoading">A carregar top sets…</p>')+'</div>';
}
function gymPaintSharedWorkoutPreviews(){
 for(const node of document.querySelectorAll("[data-gym-workout-preview]")){
  const id=node.dataset.gymWorkoutPreview;
  if(!gymSharedWorkoutCache.has(id)||node.dataset.gymHydrated==="1")continue;
  node.innerHTML=gymSharingCompactHTML(gymSharedWorkoutCache.get(id));
  node.dataset.gymHydrated="1";
 }
}
async function gymHydrateSharedWorkouts(){
 gymShareEnsureAccount();
 if(!user)return;
 gymPaintSharedWorkoutPreviews();
 if(gymSharedLoading)return;
 const nodes=[...document.querySelectorAll("[data-gym-workout-preview]")];
 if(!nodes.length)return;
 const ids=[...new Set(nodes.map(node=>node.dataset.gymWorkoutPreview))].filter(Boolean);
 const missing=ids.filter(id=>!gymSharedWorkoutCache.has(id));
 if(!missing.length)return;
 gymSharedLoading=true;
 const requestOwner=user.id;
 try{
  for(let i=0;i<missing.length;i+=30){
   const subset=missing.slice(i,i+30);
   const {data,error}=await db.rpc("gym_shared_workouts",{p_workout_ids:subset});
   if(error)throw error;
   if(user?.id!==requestOwner)return;
   const fetched=new Map((Array.isArray(data)?data:[]).map(w=>[w.id,w]));
   for(const id of subset)gymSharedWorkoutCache.set(id,fetched.get(id)||null);
   // Render into current DOM (old cards may have been replaced during the request).
   gymPaintSharedWorkoutPreviews();
  }
 }catch(error){
  console.warn("EDGY shared workout:",error);
  for(const node of nodes)if(missing.includes(node.dataset.gymWorkoutPreview))
   node.innerHTML='<p class="gymShareEmpty">Não foi possível carregar o treino. Podes tentar abrir novamente.</p>';
 }finally{
  gymSharedLoading=false;
  if(user?.id!==requestOwner)return;
  gymPaintSharedWorkoutPreviews();
  const needsNew=document.querySelectorAll("[data-gym-workout-preview]");
  if([...needsNew].some(node=>!gymSharedWorkoutCache.has(node.dataset.gymWorkoutPreview)&&!ids.includes(node.dataset.gymWorkoutPreview))){
   // Only needed if a new set of cards appeared during the previous request.
   gymHydrateSharedWorkouts();
  }
 }
}
function gymSharingPostCaption(body){
 const text=String(body||"").trim();
 if(text.startsWith("TOP SETS\n"))return "";
 const start=text.indexOf("\n\nTOP SETS\n");
 if(start>=0)return text.slice(0,start).trim();
 return text.replace(/(?:\n\n)?Treino concluído · [^\n]*$/u,"").trim();
}
const gymSharingPreviousFeedCard=gymFeedCard;
gymFeedCard=function(post){
 const html=gymSharingPreviousFeedCard(post.workout_id?{...post,body:gymSharingPostCaption(post.body)}:post);
 if(!post.workout_id)return html;
 const insert=gymSharingInline(post.workout_id);
 const boundary='<div class="gymPostActions">';
 if(!html.includes(boundary))return html;
 return html.replace(boundary,insert+boundary);
};
function gymSharingWorkoutEntry(workout){
 return '<article class="gymPublicWorkoutEntry"><div class="gymPublicWorkoutEntryHead"><span class="gymPublicWorkoutIcon">▤</span>'+
 '<div><strong>'+esc(workout.name||"Treino")+'</strong><small>'+date(workout.started_at)+' · '+gymSharingNum(workout.duration_minutes)+' min</small></div></div>'+
 gymSharingInline(workout.id)+'</article>';
}
function gymSharingPublicWorkoutList(workouts,hasMore=false){
 const list=Array.isArray(workouts)?workouts:[];
 return '<section class="gymPublicWorkoutCollection"><div class="gymPublicSectionHead"><div><span class="gymPublicEyebrow">HISTÓRICO PÚBLICO</span><h3>Treinos concluídos</h3><small>Todos os treinos do atleta, mesmo os não publicados no Feed</small></div><strong>'+list.length+(hasMore?'+':'')+'</strong></div>'+
 (list.length?list.map(gymSharingWorkoutEntry).join(""):'<p class="gymShareEmpty">Ainda não há treinos concluídos.</p>')+
 (hasMore?'<button type="button" class="gymShareLoadMore" data-gym-more-public="true">Mostrar mais treinos</button>':'')+'</section>';
}
function gymSharingPersonalWorkoutList(){
 if(!user)return "";
 const all=gymDone().slice().sort((a,b)=>new Date(b.started_at)-new Date(a.started_at));
 const show=all.slice(0,gymOwnWorkoutsVisible);
 const own=gymOwnSocial();
 return '<section class="gymPublicWorkoutCollection gymPersonalWorkoutCollection"><div class="gymPublicSectionHead"><div><span class="gymPublicEyebrow">O TEU HISTÓRICO</span><h3>Treinos concluídos</h3><small>'+(own?.is_public?'Visíveis para outros atletas no teu perfil público':'Só tu podes consultar estes treinos enquanto o perfil for privado')+'</small></div><strong>'+all.length+'</strong></div>'+
 (show.length?show.map(w=>gymSharingWorkoutEntry({id:w.id,name:w.name,started_at:w.started_at,duration_minutes:duration(w)})).join(""):'<p class="gymShareEmpty">Ainda não tens treinos concluídos.</p>')+
 (all.length>show.length?'<button type="button" class="gymShareLoadMore" data-gym-more-own="true">Mostrar mais '+Math.min(12,all.length-show.length)+' treinos</button>':'')+'</section>';
}
async function gymSharingOpenWorkout(id){
 if(!user||!id)return;
 gymShareEnsureAccount();
 const requester=user.id;
 gymUXShow("Treino partilhado","A consultar os exercícios e séries…",'<div class="gymShareLoading">A carregar treino…</div>',true);
 try{
  // Check permission again on every open. A previously shared workout may have become private.
  const {data,error}=await db.rpc("gym_shared_workout",{p_workout_id:id});
  if(error)throw error;
  if(user?.id!==requester||!gymUXModalOpen)return;
  const workout=data||null;
  gymSharedWorkoutCache.set(id,workout);
  gymUXShow(workout?workout.name:"Treino privado",workout?"Treino completo partilhado pelo atleta":"Este treino já não está disponível.",gymSharingWorkoutHTML(workout),true);
 }catch(error){
  console.warn("Gym shared workout view:",error);
  if(user?.id===requester&&gymUXModalOpen)gymUXShow("Treino indisponível","Não foi possível consultar este treino.",'<p class="gymShareEmpty">Tenta novamente. Apenas treinos partilhados podem ser consultados.</p>',true);
 }
}
function gymSharingOptInCard(){
 if(!user)return "";
 const own=gymOwnSocial(),enabled=own?.auto_share_pr===true;
 return '<section class="card gymShareOptIn"><div><span class="gymShareEyebrow">CONQUISTAS</span><h3>Publicação automática de PRs</h3><p class="muted">Quando bates um novo recorde de carga num treino concluído, a EDGY pode publicar um post com o treino e as séries. Nunca publica treinos antigos automaticamente.</p></div>'+
 '<button type="button" class="gymShareOptToggle '+(enabled?'is-active':'')+'" data-gym-toggle-autopr="true" aria-pressed="'+enabled+'">'+(enabled?"✓ Ativado":"Ativar publicação automática")+'</button>'+
 '<small>'+(own?.is_public?"Funciona apenas enquanto o perfil for público. Podes desativar a qualquer momento.":"Ativa primeiro o teu perfil público para publicar conquistas.")+'</small></section>';
}
const gymSharingProfileBase=renderProfile;
renderProfile=function(){return gymSharingProfileBase()+gymSharingPersonalWorkoutList()+gymSharingOptInCard()};
function gymSharingComposePost(workout,caption){
 const topSets=gymSharingTopSetsText(gymSharingWorkoutToDetail(workout));
 const intro=String(caption||"").trim().slice(0,220);
 return (intro?intro+'\n\n':'')+(topSets?'TOP SETS\n'+topSets:'Treino concluído');
}
function gymSharingDialog(id){
 gymShareEnsureAccount();
 const workout=gymDone().find(w=>w.id===id);
 if(!workout||!user)return;
 if(!gymOwnSocial()?.is_public){toast("Ativa primeiro o teu perfil público para partilhar treinos.");return}
 const prs=gymPRData().events.get(id)||[];
 const intro=prs.length?'<div class="gymSharePR">🏆 '+prs.length+' '+(prs.length===1?"recorde neste treino":"recordes neste treino")+
 ': '+prs.map(pr=>esc(pr.name)+" "+gymSharingNum(pr.weight)+" kg").join(" · ")+'</div>':'';
 gymUXShow("Partilhar treino","Resumo com top sets no Feed",'<form id="gymShareWorkoutForm" data-gym-share-id="'+esc(id)+'">'+
 '<div class="gymShareComposeTitle"><strong>'+esc(workout.name)+'</strong><small>'+date(workout.started_at)+'</small></div>'+intro+
 gymSharingCompactHTML(gymSharingWorkoutToDetail(workout))+
 '<label class="gymShareCaption">Adiciona uma mensagem (opcional)<textarea name="caption" maxlength="220" rows="3" placeholder="Como correu o treino? O que melhoraste?"></textarea></label>'+
 '<p class="gymSharePrivacy">O Feed mostra os top sets e permite expandir todas as séries. Com o perfil público, todos os teus treinos concluídos (incluindo os anteriores e não publicados) também são visíveis no perfil. As medidas continuam privadas.</p>'+
 '<div class="gymShareFormActions"><button type="button" class="btn secondary" data-ux-close>Cancelar</button><button class="btn" type="submit">Publicar treino</button></div></form>',true);
}
document.addEventListener("click",event=>{
 const button=event.target.closest?.("button");
 if(!button||!user)return;
 if(button.dataset.gymMoreOwn){
  event.preventDefault();event.stopImmediatePropagation();
  gymOwnWorkoutsVisible+=12;
  const section=document.querySelector(".gymPersonalWorkoutCollection");
  if(section){section.outerHTML=gymSharingPersonalWorkoutList();gymHydrateSharedWorkouts()}
  return;
 }
 if(button.dataset.gymMorePublic){
  event.preventDefault();event.stopImmediatePropagation();
  const snapshot=gymPublicProfileSnapshot,athleteId=gymPublicProfileId,requester=user.id;
  if(!snapshot||!athleteId||!snapshot.hasMoreWorkouts)return;
  button.disabled=true;button.textContent="A carregar…";
  (async()=>{
   try{
    const {data,error}=await db.rpc("gym_public_athlete_workouts",{p_athlete_id:athleteId,p_limit:13,p_offset:snapshot.workouts.length});
    if(error)throw error;
    if(user?.id!==requester||gymPublicProfileSnapshot!==snapshot||gymPublicProfileId!==athleteId)return;
    const entries=Array.isArray(data)?data:[];
    snapshot.workouts.push(...entries.slice(0,12));
    snapshot.hasMoreWorkouts=entries.length>12;
    gymPublicRenderCached();
   }catch(error){
    console.warn("Gym more public workouts:",error);
    toast("Não foi possível carregar mais treinos.");
    if(button.isConnected){button.disabled=false;button.textContent="Mostrar mais treinos"}
   }
  })();
  return;
 }
 if(button.dataset.shareWorkout){
  event.preventDefault();event.stopImmediatePropagation();
  gymSharingDialog(button.dataset.shareWorkout);return;
 }
 if(button.dataset.gymOpenWorkout){
  event.preventDefault();event.stopImmediatePropagation();
  gymSharingOpenWorkout(button.dataset.gymOpenWorkout);return;
 }
 if(button.dataset.gymToggleAutopr){
  event.preventDefault();event.stopImmediatePropagation();
  const own=gymOwnSocial();
  if(!own?.is_public){toast("Ativa primeiro o perfil público em Editar perfil.");return}
  button.disabled=true;
  (async()=>{
   try{
    const next=!Boolean(own.auto_share_pr);
    const {data,error}=await db.from("gym_social_profiles").update({auto_share_pr:next}).eq("user_id",user.id).select("auto_share_pr").single();
    if(error)throw error;
    own.auto_share_pr=Boolean(data.auto_share_pr);
    render();
    toast(next?"PRs automáticos ativados.":"PRs automáticos desativados.");
   }catch(error){console.warn("EDGY auto PR:",error);toast("Não foi possível alterar a preferência.");button.disabled=false}
  })();
 }
},true);
document.addEventListener("submit",event=>{
 const form=event.target;
 if(form?.id!=="gymShareWorkoutForm"||!user)return;
 event.preventDefault();event.stopImmediatePropagation();
 if(gymSharePublishing)return;
 const id=form.dataset.gymShareId,workout=gymDone().find(w=>w.id===id);
 if(!workout||!gymOwnSocial()?.is_public){toast("O treino ou perfil já não está disponível.");return}
 gymSharePublishing=true;
 const button=form.querySelector('button[type="submit"]');
 if(button){button.disabled=true;button.textContent="A publicar…"}
 (async()=>{
  try{
   const check=await db.from("gym_feed_posts").select("id").eq("user_id",user.id).eq("workout_id",id).limit(1);
   if(check.error)throw check.error;
   if(check.data?.length)throw new Error("Este treino já está partilhado no Feed.");
   const caption=String(new FormData(form).get("caption")||"");
   const {error}=await db.from("gym_feed_posts").insert({
    user_id:user.id,workout_id:id,kind:"workout",title:("Treino: "+workout.name).slice(0,130),
    body:gymSharingComposePost(workout,caption).slice(0,500)
   });
   if(error)throw error;
   gymSharedWorkoutCache.set(id,gymSharingWorkoutToDetail(workout));
   gymUXClose();await load();page="feed";render();toast("Treino completo partilhado no Feed!");
  }catch(error){console.warn("EDGY share workout:",error);toast(error.message||"Não foi possível partilhar o treino.")}
  finally{gymSharePublishing=false;if(button?.isConnected){button.disabled=false;button.textContent="Publicar treino"}}
 })();
},true);
