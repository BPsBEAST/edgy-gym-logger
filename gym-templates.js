/* Reusable workout templates for EDGY Gym Logger */
"use strict";
let gymTemplates=[],gymTemplateBusy=false;
const baseGymLoad=load;
load=async function(){
 await baseGymLoad();
 if(!user){gymTemplates=[];return}
 const {data,error}=await db.from("gym_templates").select("id,name,user_id,created_at,gym_template_exercises(id,exercise_id,position,target_sets,target_reps,gym_exercises(name))").eq("user_id",user.id).order("created_at",{ascending:false}).limit(60);
 if(error){console.warn("Gym templates:",error.message);gymTemplates=[]}
 else gymTemplates=data||[];
};
function gymTemplateCards(){
 if(!gymTemplates.length)return '<p class="muted">Ainda não tens modelos. Guarda um treino concluído através do Histórico.</p>';
 return gymTemplates.map(t=>'<div class="gymTemplateRow"><div class="gymTemplateInfo"><strong>'+esc(t.name)+'</strong><small>'+((t.gym_template_exercises||[]).length)+' exercícios · '+(t.gym_template_exercises||[]).map(x=>esc(x.gym_exercises?.name||"Exercício")).join(" · ")+'</small></div><button class="btn small" data-use-template="'+t.id+'">Iniciar</button><button class="btn ghost small" data-delete-template="'+t.id+'" aria-label="Eliminar modelo">×</button></div>').join("");
}
const gymTemplateWorkoutBase=renderWorkout;
renderWorkout=function(){
 const content=gymTemplateWorkoutBase();
 if(!user||active)return content;
 return content+'<div class="card"><h3>Modelos de treino</h3><p class="muted" style="font-size:12px">Treina mais rápido com exercícios e séries predefinidos.</p>'+gymTemplateCards()+'</div>';
};
const gymTemplateHistoryBase=renderHistory;
renderHistory=function(){
 const content=gymTemplateHistoryBase(),done=gymDone();
 if(!user||!done.length)return content;
 return content+'<div class="card"><h3>Guardar como modelo</h3><p class="muted" style="font-size:12px">Reutiliza os exercícios de um treino anterior.</p>'+done.slice(0,12).map(w=>'<div class="gymTemplateRow"><div class="gymTemplateInfo"><strong>'+esc(w.name)+'</strong><small>'+date(w.started_at)+'</small></div><button class="btn secondary small" data-save-template="'+w.id+'">Guardar</button></div>').join("")+'</div>';
};
const gymTemplateProfileBase=renderProfile;
renderProfile=function(){
 const content=gymTemplateProfileBase();
 if(!user||!gymTemplates.length)return content;const panel='<div class="card"><h3>Modelos de treino</h3>'+gymTemplateCards()+'</div>';return content.replace('<div class="card"><div class="row"><h3>Privacidade e conta</h3>',panel+'<div class="card"><div class="row"><h3>Privacidade e conta</h3>');
};
async function gymStartTemplate(id){
 if(gymTemplateBusy)return;
 if(active){toast("Termina primeiro o treino em curso.");return}
 const template=gymTemplates.find(x=>x.id===id);if(!template)return;
 const items=(template.gym_template_exercises||[]).slice().sort((a,b)=>a.position-b.position);
 if(!items.length){toast("O modelo não tem exercícios.");return}
 gymTemplateBusy=true;let workoutId=null;
 try{
  const {data:w,error:we}=await db.from("gym_workouts").insert({name:template.name,user_id:user.id}).select("id").single();
  if(we)throw we;workoutId=w.id;
  const {data:created,error:ce}=await db.from("gym_workout_exercises").insert(items.map((x,i)=>({workout_id:w.id,exercise_id:x.exercise_id,position:i}))).select("id,position,exercise_id");
  if(ce)throw ce;
  const rows=[];
  for(const item of created){
   const t=items[item.position],previous=previousFor(item.exercise_id);
   for(let i=0;i<t.target_sets;i++)rows.push({
    workout_exercise_id:item.id,position:i,
    weight:Number(previous[i]?.weight??previous[previous.length-1]?.weight??0),
    reps:Number(previous[i]?.reps??t.target_reps),set_type:"working"
   });
  }
  const {error:se}=await db.from("gym_sets").insert(rows);if(se)throw se;
  await load();page="treino";render();window.scrollTo(0,0);toast("Modelo carregado. Bom treino!");
 }catch(err){
  if(workoutId)await db.from("gym_workouts").delete().eq("id",workoutId);
  await load();render();toast(err.message||"Erro ao iniciar o modelo");
 }finally{gymTemplateBusy=false}
}
async function gymSaveTemplate(id){
 if(gymTemplateBusy)return;
 const workout=gymDone().find(w=>w.id===id);if(!workout)return;
 const name=prompt("Nome do modelo",workout.name)?.trim();
 if(!name)return;
 const items=(workout.gym_workout_exercises||[]).slice().sort((a,b)=>a.position-b.position);
 if(!items.length){toast("Não existem exercícios neste treino.");return}
 gymTemplateBusy=true;let templateId=null;
 try{
  const {data:t,error:te}=await db.from("gym_templates").insert({user_id:user.id,name:name.slice(0,70)}).select("id").single();
  if(te)throw te;templateId=t.id;
  const rows=items.map((x,i)=>{
   const working=(x.gym_sets||[]).filter(s=>s.set_type!=="warmup");
   const completed=working.filter(s=>s.completed);
   const reps=completed.length?completed[completed.length-1].reps:8;
   return {template_id:t.id,exercise_id:x.exercise_id,position:i,target_sets:Math.min(12,Math.max(1,working.length)),target_reps:Math.min(100,Math.max(1,reps||8))};
  });
  const {error:ie}=await db.from("gym_template_exercises").insert(rows);if(ie)throw ie;
  await load();render();toast("Modelo de treino guardado!");
 }catch(err){
  if(templateId)await db.from("gym_templates").delete().eq("id",templateId);
  toast(err.message||"Erro ao guardar o modelo");
 }finally{gymTemplateBusy=false}
}
document.addEventListener("click",event=>{
 const b=event.target.closest("button");if(!b||!user)return;
 if(b.dataset.useTemplate){gymStartTemplate(b.dataset.useTemplate);return}
 if(b.dataset.saveTemplate){gymSaveTemplate(b.dataset.saveTemplate);return}
 if(b.dataset.deleteTemplate){action(async()=>{
   const t=gymTemplates.find(x=>x.id===b.dataset.deleteTemplate);
   if(!t||!confirm('Eliminar "'+t.name+'"?'))return;
   const {error}=await db.from("gym_templates").delete().eq("id",t.id);if(error)throw error;
 });return}
});
