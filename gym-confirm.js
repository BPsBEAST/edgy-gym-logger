/* EDGY Gym · branded confirmation dialogs */
"use strict";
let gymConfirmCallback=null;
function gymConfirmDialog(title,details,affirmative,fn,danger=false){
 gymConfirmCallback=fn;
 gymUXShow(title,details,'<div class="gymConfirmMark '+(danger?'danger':'')+'">'+(danger?'!':'✓')+'</div><div class="gymUXActions"><button type="button" class="btn secondary" data-ux-close>Cancelar</button><button type="button" class="btn '+(danger?'gymConfirmDanger':'')+'" id="gymConfirmGo">'+esc(affirmative)+'</button></div>');
}
document.addEventListener("click",event=>{
 const b=event.target.closest("button");if(!b||!user)return;
 if(b.id==="gymConfirmGo"){
  event.preventDefault();event.stopImmediatePropagation();
  const callback=gymConfirmCallback;gymConfirmCallback=null;gymUXClose();
  if(callback)callback();
  return;
 }
 const confirmAction=(title,message,button,callback,danger=false)=>{
  event.preventDefault();event.stopImmediatePropagation();
  gymConfirmDialog(title,message,button,callback,danger);
 };
 if(b.id==="cancelWorkout"&&active){
  const workoutId=active.id;
  confirmAction("Cancelar treino","Vais eliminar definitivamente este treino em curso, incluindo os exercícios, as séries e as cargas registadas. Não serão atribuídos XP e o treino não aparecerá no Histórico.","Eliminar treino",()=>{
   action(async()=>{
    const {error}=await db.from("gym_workouts").delete().eq("id",workoutId).eq("user_id",user.id);
    if(error)throw error;
    localStorage.removeItem("edgy-gym-rest-"+user.id+"-end");
    page="treino";
    toast("Treino cancelado.");
   });
  },true);
  return;
 }
 if(b.id==="finish"&&active){
  confirmAction("Terminar treino","Queres concluir esta sessão? As séries e cargas ficam guardadas no Histórico.","Terminar treino",()=>{
   action(async()=>{
    const workoutId=active.id;
    const {error}=await db.from("gym_workouts").update({finished_at:new Date().toISOString()}).eq("id",workoutId);
    if(error)throw error;
    const {data:reward,error:rewardError}=await db.from("gym_xp_awards").select("xp_awarded,base_xp,volume_xp,pr_xp").eq("workout_id",workoutId).maybeSingle();
    if(rewardError)console.warn("EDGY Gym XP:",rewardError.message);
    page="historico";
    toast("Treino concluído!"+(reward?.xp_awarded>0?" +"+reward.xp_awarded+" XP EDGY ✦":reward?" Sem XP nesta sessão.":""));
   });
  });return;
 }
 if(b.dataset.removeEx&&active){
  const id=b.dataset.removeEx;
  confirmAction("Remover exercício","As séries deste exercício serão eliminadas deste treino.","Remover exercício",()=>{
   action(async()=>{
    const {error}=await db.from("gym_workout_exercises").delete().eq("id",id);
    if(error)throw error;
   });
  },true);return;
 }
 if(b.dataset.deleteMeasure){
  const id=b.dataset.deleteMeasure;
  confirmAction("Eliminar medição","Esta medição será eliminada do teu histórico.","Eliminar medição",()=>{
   action(async()=>{
    const {error}=await db.from("gym_measurements").delete().eq("id",id);
    if(error)throw error;
   });
  },true);return;
 }
 if(b.dataset.deletePost){
  const id=b.dataset.deletePost;
  confirmAction("Eliminar publicação","Esta publicação, os gostos e todas as respostas serão eliminados.","Eliminar publicação",()=>{
   action(async()=>{
    const {error}=await db.from("gym_feed_posts").delete().eq("id",id);
    if(error)throw error;
   });
  },true);return;
 }
 if(b.dataset.gymDeleteComment){
  const id=b.dataset.gymDeleteComment;
  confirmAction("Eliminar resposta","Queres remover esta resposta da publicação?","Eliminar resposta",()=>{
   action(async()=>{
    const {error}=await db.from("gym_post_comments").delete().eq("id",id);
    if(error)throw error;
   });
  },true);return;
 }
 if(b.dataset.deleteTemplate){
  const id=b.dataset.deleteTemplate;
  const t=gymTemplates.find(x=>x.id===id);if(!t)return;
  confirmAction("Eliminar modelo","O modelo «"+t.name+"» será eliminado. Os treinos anteriores não serão afetados.","Eliminar modelo",()=>{
   action(async()=>{const {error}=await db.from("gym_templates").delete().eq("id",id);if(error)throw error});
  },true);return;
 }
 if(b.dataset.shareWorkout){
  const workout=gymDone().find(x=>x.id===b.dataset.shareWorkout);
  if(!workout||!gymOwnSocial()?.is_public){toast("Ativa o perfil público para partilhar.");return}
  const prs=gymPRData().events.get(workout.id)||[];
  const title=prs.length?"Novo recorde: "+prs[0].name:"Treino concluído: "+workout.name;
  const body=duration(workout)+" min · "+fmt(volume(workout))+" kg de volume · "+count(workout)+" séries."+(prs.length?" Recordes: "+prs.map(x=>x.name+" "+fmt(x.weight)+" kg × "+x.reps).join("; "):"");
  confirmAction("Partilhar treino",""+title+" · "+body,"Publicar no Feed",()=>{
   action(async()=>{const {error}=await db.from("gym_feed_posts").insert({user_id:user.id,workout_id:workout.id,kind:prs.length?"pr":"workout",title:title.slice(0,130),body:body.slice(0,500)});if(error)throw error;toast("Treino partilhado!")});
  });return;
 }
},true);
