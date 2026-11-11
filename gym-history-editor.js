/* EDGY Gym · controlled editor for completed sessions */
"use strict";
let gymEditFinishedSaving=false;
function gymEditFinishedOpen(id){
 const workout=gymDone().find(w=>w.id===id);
 if(!workout||!user)return;
 const entries=(workout.gym_workout_exercises||[]).slice().sort((a,b)=>a.position-b.position);
 const sections=entries.map((we,i)=>{
  const rows=(we.gym_sets||[]).slice().sort((a,b)=>a.position-b.position).map((s,j)=>
   '<div class="gymEditHistorySet" data-gym-edit-set="'+esc(s.id)+'">'+
    '<span class="gymEditHistorySetNumber">'+(j+1)+'</span>'+
    '<label><span>kg</span><input data-gym-edit="weight" type="number" min="0" max="1000" step="0.01" inputmode="decimal" required value="'+esc(s.weight)+'"></label>'+
    '<label><span>Reps</span><input data-gym-edit="reps" type="number" min="0" max="100" step="1" required value="'+esc(s.reps)+'"></label>'+
    '<label class="gymEditHistoryType"><span>Tipo</span><select data-gym-edit="type">'+
    [['working','Normal'],['warmup','Aquecimento'],['dropset','Drop set']].map(([val,label])=>'<option value="'+val+'" '+(s.set_type===val?'selected':'')+'>'+label+'</option>').join('')+'</select></label>'+
    '<label class="gymEditHistoryRpe"><span>RPE</span><input data-gym-edit="rpe" type="number" min="1" max="10" step="0.5" placeholder="—" value="'+(s.rpe==null?'':esc(s.rpe))+'"></label>'+
    '<label class="gymEditHistoryCheck"><input data-gym-edit="done" type="checkbox" '+(s.completed?'checked':'')+'><span>Feita</span></label>'+
    '<label class="gymEditHistoryCheck"><input data-gym-edit="failure" type="checkbox" '+(s.to_failure?'checked':'')+'><span>Falha</span></label>'+
   '</div>'
  ).join('');
  return '<section class="gymEditHistoryExercise"><header><span>'+String(i+1).padStart(2,'0')+'</span><strong>'+esc(we.gym_exercises?.name||'Exercício')+'</strong><small>'+(we.gym_sets||[]).length+' séries</small></header>'+rows+'</section>';
 }).join('');
 gymUXShow("Editar treino","Corrige as cargas e repetições deste treino concluído.",
  '<form id="gymEditFinishedForm" data-gym-edit-workout="'+esc(id)+'" class="gymEditHistoryForm">'+
  '<label class="gymUXField"><span>Nome do treino</span><input name="name" class="gymUXInput" maxlength="70" required value="'+esc(workout.name)+'"></label>'+
  '<div class="gymEditHistoryInfo">As alterações às séries atualizam os PRs, o volume e o resumo público. O XP atribuído quando terminaste o treino não é recalculado. Não é possível adicionar ou remover séries neste editor.</div>'+
  '<div class="gymEditHistoryExercises">'+(sections||'<p class="muted">Sem exercícios registados.</p>')+'</div>'+
  '<div class="gymUXActions"><button class="btn secondary" type="button" data-ux-close>Cancelar</button><button class="btn" type="submit">Guardar alterações</button></div></form>',true);
}
function gymEditFinishedData(form){
 const sets=[...form.querySelectorAll('[data-gym-edit-set]')].map(row=>{
  const input=name=>row.querySelector('[data-gym-edit="'+name+'"]');
  const rawRpe=input('rpe').value.trim();
  return {
   id:row.dataset.gymEditSet,
   weight:Number(input('weight').value),
   reps:Number(input('reps').value),
   set_type:input('type').value,
   rpe:rawRpe===''?null:Number(rawRpe),
   completed:input('done').checked,
   to_failure:input('failure').checked
  };
 });
 if(sets.some(s=>!Number.isFinite(s.weight)||s.weight<0||s.weight>1000||
 !Number.isInteger(s.reps)||s.reps<0||s.reps>100||
 (s.rpe!==null&&(!Number.isFinite(s.rpe)||s.rpe<1||s.rpe>10)))){
  throw new Error("Verifica as cargas, repetições e RPE antes de guardar.");
 }
 return sets;
}
document.addEventListener("click",event=>{
 const b=event.target.closest?.('button[data-edit-finished-workout]');
 if(!b||!user)return;
 event.preventDefault();event.stopImmediatePropagation();
 gymEditFinishedOpen(b.dataset.editFinishedWorkout);
},true);
document.addEventListener("submit",event=>{
 const form=event.target;
 if(form?.id!=="gymEditFinishedForm"||!user)return;
 event.preventDefault();event.stopImmediatePropagation();
 if(gymEditFinishedSaving)return;
 const id=form.dataset.gymEditWorkout;
 const workout=gymDone().find(w=>w.id===id);
 if(!workout){toast("Este treino já não está disponível.");return}
 const name=String(form.elements.name.value||"").trim();
 if(!name||name.length>70){toast("O nome do treino deve ter entre 1 e 70 caracteres.");return}
 let sets;
 try{sets=gymEditFinishedData(form)}catch(err){toast(err.message);return}
 const submit=form.querySelector('[type="submit"]');
 gymEditFinishedSaving=true;
 if(submit){submit.disabled=true;submit.textContent="A guardar…"}
 (async()=>{
  try{
   const {data,error}=await db.rpc("gym_edit_finished_workout",{
    p_workout_id:id,p_name:name,p_sets:sets
   });
   if(error)throw error;
   if(!data?.updated)throw new Error("Não foi possível confirmar a edição.");
   // Invalidate previews, top sets, PR charts and local history after the commit.
   gymSharedWorkoutCache.clear();
   gymUXClose();
   await load();
   page="historico";
   render();
   toast("Treino atualizado com sucesso.");
  }catch(err){
   console.warn("EDGY edit completed workout:",err);
   toast(err.message||"Não foi possível guardar as alterações.");
  }finally{
   gymEditFinishedSaving=false;
   if(submit?.isConnected){submit.disabled=false;submit.textContent="Guardar alterações"}
  }
 })();
},true);
