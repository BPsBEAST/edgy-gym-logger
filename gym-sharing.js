/* EDGY Gym · structured workouts, public shared training cards, and opt-in PR posts */
"use strict";
const gymSharedWorkoutCache=new Map();
let gymSharedLoading=false;
let gymSharePublishing=false;
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
 const saved=gymSharedWorkoutCache.get(workoutId);
 return '<div class="gymSharedWorkoutInline" data-gym-workout-preview="'+esc(workoutId)+'">'+
 (saved?gymSharingWorkoutHTML(saved):'<p class="gymShareLoading">A carregar exercícios e séries…</p>')+
 '</div><button type="button" class="gymShareOpen" data-gym-open-workout="'+esc(workoutId)+'">Ver treino completo</button>';
}
function gymPaintSharedWorkoutPreviews(){
 for(const node of document.querySelectorAll("[data-gym-workout-preview]")){
  const id=node.dataset.gymWorkoutPreview;
  if(!gymSharedWorkoutCache.has(id)||node.dataset.gymHydrated==="1")continue;
  node.innerHTML=gymSharingWorkoutHTML(gymSharedWorkoutCache.get(id));
  node.dataset.gymHydrated="1";
 }
}
async function gymHydrateSharedWorkouts(){
 if(!user)return;
 gymPaintSharedWorkoutPreviews();
 if(gymSharedLoading)return;
 const nodes=[...document.querySelectorAll("[data-gym-workout-preview]")];
 if(!nodes.length)return;
 const ids=[...new Set(nodes.map(node=>node.dataset.gymWorkoutPreview))].filter(Boolean);
 const missing=ids.filter(id=>!gymSharedWorkoutCache.has(id));
 if(!missing.length)return;
 gymSharedLoading=true;
 try{
  for(let i=0;i<missing.length;i+=30){
   const subset=missing.slice(i,i+30);
   const {data,error}=await db.rpc("gym_shared_workouts",{p_workout_ids:subset});
   if(error)throw error;
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
  gymPaintSharedWorkoutPreviews();
  const needsNew=document.querySelectorAll("[data-gym-workout-preview]");
  if([...needsNew].some(node=>!gymSharedWorkoutCache.has(node.dataset.gymWorkoutPreview)&&!ids.includes(node.dataset.gymWorkoutPreview))){
   // Only needed if a new set of cards appeared during the previous request.
   gymHydrateSharedWorkouts();
  }
 }
}
const gymSharingPreviousFeedCard=gymFeedCard;
gymFeedCard=function(post){
 const html=gymSharingPreviousFeedCard(post);
 if(!post.workout_id)return html;
 const insert=gymSharingInline(post.workout_id);
 const boundary='<div class="gymPostActions">';
 if(!html.includes(boundary))return html;
 return html.replace(boundary,insert+boundary);
};
function gymSharingPublicWorkoutList(posts){
 const shared=[...new Map(posts.filter(p=>p.workout_id).map(p=>[p.workout_id,p])).values()];
 return '<section class="gymPublicWorkoutCollection"><div class="gymPublicSectionHead"><div><span class="gymPublicEyebrow">TREINOS PARTILHADOS</span><h3>Explorar os treinos</h3><small>Apenas os treinos que este atleta decidiu publicar</small></div><strong>'+shared.length+'</strong></div>'+
 (shared.length?shared.map(p=>'<button type="button" class="gymPublicWorkoutLink" data-gym-open-workout="'+esc(p.workout_id)+'">'+
 '<span class="gymPublicWorkoutIcon">▤</span><span><strong>'+esc(p.title||"Treino partilhado")+'</strong><small>'+date(p.created_at)+'</small></span><b>Ver treino</b></button>').join(""):
 '<p class="gymShareEmpty">Ainda não há treinos partilhados.</p>')+'</section>';
}
async function gymSharingOpenWorkout(id){
 if(!user||!id)return;
 let workout=gymSharedWorkoutCache.get(id);
 if(!workout){
  gymUXShow("Treino partilhado","A consultar os exercícios e séries…",'<div class="gymShareLoading">A carregar treino…</div>',true);
  try{
   const {data,error}=await db.rpc("gym_shared_workout",{p_workout_id:id});
   if(error)throw error;
   workout=data||null;
   gymSharedWorkoutCache.set(id,workout);
  }catch(error){
   console.warn("Gym shared workout view:",error);
   gymUXShow("Treino indisponível","Não foi possível consultar este treino.",'<p class="gymShareEmpty">Tenta novamente. Apenas treinos partilhados podem ser consultados.</p>',true);
   return;
  }
 }
 gymUXShow(workout?workout.name:"Treino privado",workout?"Treino completo partilhado pelo atleta":"Este treino já não está disponível.",gymSharingWorkoutHTML(workout),true);
}
function gymSharingOptInCard(){
 if(!user)return "";
 const own=gymOwnSocial(),enabled=own?.auto_share_pr===true;
 return '<section class="card gymShareOptIn"><div><span class="gymShareEyebrow">CONQUISTAS</span><h3>Publicação automática de PRs</h3><p class="muted">Quando bates um novo recorde de carga num treino concluído, a EDGY pode publicar um post com o treino e as séries. Nunca publica treinos antigos automaticamente.</p></div>'+
 '<button type="button" class="gymShareOptToggle '+(enabled?'is-active':'')+'" data-gym-toggle-autopr="true" aria-pressed="'+enabled+'">'+(enabled?"✓ Ativado":"Ativar publicação automática")+'</button>'+
 '<small>'+(own?.is_public?"Funciona apenas enquanto o perfil for público. Podes desativar a qualquer momento.":"Ativa primeiro o teu perfil público para publicar conquistas.")+'</small></section>';
}
const gymSharingProfileBase=renderProfile;
renderProfile=function(){return gymSharingProfileBase()+gymSharingOptInCard()};
function gymSharingComposePost(workout,caption){
 const summary='Treino concluído · '+duration(workout)+' min · '+gymSharingNum(volume(workout))+' kg de volume · '+count(workout)+' séries · '+(workout.gym_workout_exercises||[]).length+' exercícios.';
 return (caption.trim()?caption.trim().slice(0,220)+'\n\n':'')+summary;
}
function gymSharingDialog(id){
 const workout=gymDone().find(w=>w.id===id);
 if(!workout||!user)return;
 if(!gymOwnSocial()?.is_public){toast("Ativa primeiro o teu perfil público para partilhar treinos.");return}
 const prs=gymPRData().events.get(id)||[];
 const intro=prs.length?'<div class="gymSharePR">🏆 '+prs.length+' '+(prs.length===1?"recorde neste treino":"recordes neste treino")+
 ': '+prs.map(pr=>esc(pr.name)+" "+gymSharingNum(pr.weight)+" kg").join(" · ")+'</div>':'';
 gymUXShow("Partilhar treino","Publicação completa no Feed",'<form id="gymShareWorkoutForm" data-gym-share-id="'+esc(id)+'">'+
 '<div class="gymShareComposeTitle"><strong>'+esc(workout.name)+'</strong><small>'+date(workout.started_at)+'</small></div>'+intro+
 gymSharingWorkoutHTML(gymSharingWorkoutToDetail(workout))+
 '<label class="gymShareCaption">Adiciona uma mensagem (opcional)<textarea name="caption" maxlength="220" rows="3" placeholder="Como correu o treino? O que melhoraste?"></textarea></label>'+
 '<p class="gymSharePrivacy">Este treino, incluindo todas as cargas e repetições concluídas, ficará visível no Feed e no teu perfil público até eliminares a publicação ou tornares o perfil privado.</p>'+
 '<div class="gymShareFormActions"><button type="button" class="btn secondary" data-ux-close>Cancelar</button><button class="btn" type="submit">Publicar treino</button></div></form>',true);
}
document.addEventListener("click",event=>{
 const button=event.target.closest?.("button");
 if(!button||!user)return;
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
