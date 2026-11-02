/* EDGY Gym · lightweight set editor. Never refetch the app for a set edit. */
"use strict";
const gymSetSaveQueue=new Map();
const gymPendingAdds=new Set();
let gymSetLastFailure=null;
function gymFindSet(id){
 for(const we of active?.gym_workout_exercises||[]){
  const found=(we.gym_sets||[]).find(s=>s.id===id);
  if(found)return {record:found,exercise:we};
 }
 return null;
}
function gymSetSaveLabel(state){
 const el=document.getElementById("gymSetSaveStatus");
 if(!el)return;
 const states={saving:"A guardar…",saved:"✓ Guardado",error:"Falha ao guardar · tentar novamente"};
 el.textContent=states[state]||states.saved;
 el.dataset.saveState=state;
 el.setAttribute("role",state==="error"?"button":"status");
 if(state==="error")el.setAttribute("tabindex","0");
 else el.removeAttribute("tabindex");
}
function gymHasPendingSetEdits(){
 return [...gymSetSaveQueue.values()].some(q=>q.writing||Object.keys(q.pending).length>0);
}
function gymPaintSaveStatus(){
 if(gymSetLastFailure){gymSetSaveLabel("error");return}
 gymSetSaveLabel(gymHasPendingSetEdits()?"saving":"saved");
}
function gymScheduleSetSave(id,patch,delay=620){
 let q=gymSetSaveQueue.get(id);
 if(!q){q={pending:{},writing:null,timer:null,retries:0};gymSetSaveQueue.set(id,q)}
 Object.assign(q.pending,patch);
 gymSetLastFailure=null;
 if(q.timer)clearTimeout(q.timer);
 q.timer=setTimeout(()=>{q.timer=null;gymPersistSet(id).catch(()=>{})},delay);
 gymPaintSaveStatus();
}
async function gymPersistSet(id){
 const q=gymSetSaveQueue.get(id);
 if(!q)return;
 if(q.timer){clearTimeout(q.timer);q.timer=null}
 if(q.writing){await q.writing; if(Object.keys(q.pending).length)return gymPersistSet(id);return}
 q.writing=(async()=>{
  while(Object.keys(q.pending).length){
   const patch=q.pending;
   q.pending={};
   try{
    const {error}=await db.from("gym_sets").update(patch).eq("id",id);
    if(error)throw error;
    q.retries=0;
    gymSetLastFailure=null;
   }catch(err){
    q.pending={...patch,...q.pending};
    gymSetLastFailure=err;
    q.retries+=1;
    console.warn("EDGY Gym set save:",err);
    throw err;
   }
  }
 })();
 try{await q.writing}
 catch(err){
  if(q.retries<=2&&!q.timer){
   q.timer=setTimeout(()=>{q.timer=null;gymPersistSet(id).catch(()=>{})},1500*q.retries);
  }
  throw err;
 }finally{
  q.writing=null;
  if(!Object.keys(q.pending).length&&!q.timer)gymSetSaveQueue.delete(id);
  gymPaintSaveStatus();
 }
}
async function gymFlushSetWrites(){
 for(let attempt=0;attempt<2;attempt++){
  for(const q of gymSetSaveQueue.values())if(q.timer){clearTimeout(q.timer);q.timer=null}
  const ids=[...gymSetSaveQueue.keys()];
  const results=await Promise.allSettled(ids.map(id=>gymPersistSet(id)));
  if(results.every(r=>r.status==="fulfilled")&&!gymHasPendingSetEdits()){
   gymSetLastFailure=null;gymPaintSaveStatus();return;
  }
 }
 gymSetSaveLabel("error");
 throw gymSetLastFailure||new Error("Não foi possível guardar todas as séries. Verifica a ligação antes de terminares o treino.");
}
function gymUpdateWorkoutNumbers(){
 if(!active||page!=="treino")return;
 const nodes=document.querySelectorAll(".gymWorkoutStats .stat strong");
 if(nodes.length<3)return;
 nodes[1].innerHTML=fmt(volume(active))+" <em>kg</em>";
 nodes[2].textContent=String(count(active));
}
function gymSetItemUpdate(id,patch){
 const item=document.querySelector('[data-set-item="'+id+'"]');
 if(!item)return;
 const record=gymFindSet(id)?.record;
 if("completed" in patch){
  const state=item.querySelector(".gymSetState");
  if(state)state.textContent=patch.completed?"Concluída":"Por fazer";
  gymUpdateWorkoutNumbers();
 }
 if("rpe" in patch){
  const input=item.querySelector('[data-field="rpe"]');
  if(input&&document.activeElement!==input)input.value=patch.rpe??"";
 }
 if("to_failure" in patch||"completed" in patch){
  item.classList.remove("gymSetQuickFeedback");
  item.classList.add("gymSetQuickFeedback");
  setTimeout(()=>item.classList.remove("gymSetQuickFeedback"),390);
 }
 if(record&&("weight" in patch||"reps" in patch)&&record.completed)gymUpdateWorkoutNumbers();
}
function gymHandleSetChange(el,commit=false){
 if(!user||!active)return;
 const id=el.dataset.set,field=el.dataset.field,match=gymFindSet(id);
 if(!match||!["weight","reps","rpe","completed","to_failure"].includes(field))return;
 const record=match.record;
 let value;
 if(field==="completed"||field==="to_failure"){
  if(!commit)return;
  value=Boolean(el.checked);
 }else{
  const raw=String(el.value).trim().replace(",",".");
  if(raw===""){
   if(!commit)return;
   value=field==="rpe"?null:0;
   el.value=value===null?"":"0";
  }else{
   value=Number(raw);
   if(!Number.isFinite(value)||value<0||(field==="reps"&&!Number.isInteger(value))||(field==="rpe"&&(value<1||value>10))){
    if(commit){toast("Introduz um valor válido.");el.value=record[field]??""}
    return;
   }
  }
 }
 if(Object.is(record[field],value))return;
 const patch={[field]:value};
 if(field==="to_failure"&&value&&record.rpe==null)patch.rpe=10;
 Object.assign(record,patch);
 gymSetItemUpdate(id,patch);
 gymScheduleSetSave(id,patch,commit?130:700);
}
function gymFastStepper(btn){
 if(!user||!active)return;
 const id=btn.dataset.stepSet,field=btn.dataset.stepField;
 if(!["weight","reps"].includes(field))return;
 const match=gymFindSet(id);if(!match)return;
 const step=field==="weight"?2.5:1;
 const dir=Number(btn.dataset.stepDir)||1;
 const el=document.querySelector('input[data-set="'+id+'"][data-field="'+field+'"]');
 if(!el)return;
 const current=Number(String(el.value).replace(",","."))||0;
 const next=Math.max(0,Math.round((current+step*dir)*100)/100);
 el.value=String(next);
 el.classList.add("gymStepUpdated");
 setTimeout(()=>el.classList.remove("gymStepUpdated"),260);
 gymHandleSetChange(el,true);
}
function gymFastCycleSet(btn){
 const id=btn.dataset.cycleSet,match=gymFindSet(id);
 if(!match||!user)return;
 const record=match.record,types=["working","warmup","dropset"];
 const next=types[(types.indexOf(record.set_type)+1)%types.length];
 record.set_type=next;
 const item=btn.closest(".gymSetItem");
 const index=match.exercise.gym_sets.slice().sort((a,b)=>a.position-b.position).indexOf(record);
 btn.textContent=next==="warmup"?"W":next==="dropset"?"D":String(index+1);
 btn.classList.remove("gymSetType-working","gymSetType-warmup","gymSetType-dropset");
 btn.classList.add("gymSetType-"+next,"gymTypePressed");
 setTimeout(()=>btn.classList.remove("gymTypePressed"),340);
 if(item)item.dataset.setType=next;
 gymScheduleSetSave(id,{set_type:next},170);
}
async function gymFastAddSet(btn){
 if(!user||!active)return;
 const id=btn.dataset.addSet,exercise=active.gym_workout_exercises.find(we=>we.id===id);
 if(!exercise||gymPendingAdds.has(id))return;
 gymPendingAdds.add(id);
 btn.disabled=true;
 const label=btn.textContent;btn.textContent="A adicionar…";
 try{
  await gymFlushSetWrites();
  const sets=(exercise.gym_sets||[]).slice().sort((a,b)=>a.position-b.position);
  const last=sets[sets.length-1],previous=previousFor(exercise.exercise_id)[0];
  const payload={workout_exercise_id:id,position:sets.length,weight:last?.weight??previous?.weight??0,reps:last?.reps??previous?.reps??0};
  const {data:created,error}=await db.from("gym_sets").insert(payload).select("*").single();
  if(error)throw error;
  exercise.gym_sets.push(created);
  const list=btn.closest(".gymExerciseWorkoutCard")?.querySelector(".gymSetList");
  if(list){
   list.insertAdjacentHTML("beforeend",gymSetEditor(exercise,created,sets.length));
   const row=list.lastElementChild;
   row?.classList.add("gymJustChanged");
   row?.scrollIntoView?.({behavior:"smooth",block:"nearest"});
  }else render();
  const labelCount=btn.closest(".gymExerciseWorkoutCard")?.querySelector(".gymExerciseHeading small");
  if(labelCount)labelCount.textContent=exercise.gym_sets.length+" séries";
 }catch(err){console.error(err);toast(err.message||"Não foi possível adicionar a série")}
 finally{gymPendingAdds.delete(id);btn.disabled=false;btn.textContent=label}
}
async function gymFastAddExercise(id){
 if(!user||!active||gymPendingAdds.has("exercise:"+id))return;
 gymPendingAdds.add("exercise:"+id);
 const workoutId=active.id;
 gymUXClose();
 try{
  await gymFlushSetWrites();
  const position=(active.gym_workout_exercises||[]).length;
  const {data:created,error}=await db.from("gym_workout_exercises").insert({workout_id:workoutId,exercise_id:id,position}).select("*").single();
  if(error)throw error;
  const prev=previousFor(id)[0];
  const {data:set,error:setError}=await db.from("gym_sets").insert({workout_exercise_id:created.id,position:0,weight:prev?.weight??0,reps:prev?.reps??0}).select("*").single();
  if(setError)throw setError;
  const exercise=exercises.find(e=>e.id===id);
  active.gym_workout_exercises.push({...created,gym_exercises:{name:exercise?.name||"Exercício",muscle:exercise?.muscle},gym_sets:[set]});
  gymPrepareMotion("exercise",id);
  render();
 }catch(err){
  console.error(err);
  toast(err.message||"Não foi possível adicionar o exercício");
  // Reconcile a possible partial insert without refetching the other app data.
  const {data,error}=await db.from("gym_workouts").select("*,gym_workout_exercises(*,gym_exercises(name,muscle),gym_sets(*))").eq("id",workoutId).maybeSingle();
  if(!error&&data&&active?.id===workoutId){active=data;history=history.map(w=>w.id===workoutId?data:w);render()}
 }finally{gymPendingAdds.delete("exercise:"+id)}
}
// Override only the hot-path exercise picker operation, preserving the rest of the app.
gymUXAddExercise=gymFastAddExercise;
document.addEventListener("click",event=>{
 const btn=event.target.closest("button");
 if(btn?.id==="gymSetSaveStatus"&&gymSetLastFailure)gymFlushSetWrites().catch(()=>toast("Sem ligação: as alterações continuam pendentes."));
});
document.addEventListener("visibilitychange",()=>{
 if(document.visibilityState==="hidden"&&gymHasPendingSetEdits())gymFlushSetWrites().catch(()=>{});
});
