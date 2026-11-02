/* EDGY Gym: XP uses the single profile XP balance, awarded only by Supabase triggers. */
"use strict";
let gymXPAwards=[];
function gymXPForWorkout(workoutId){return gymXPAwards.find(a=>a.workout_id===workoutId)||null}
const gymXPOriginalLoad=load;
load=async function(){
 await gymXPOriginalLoad();
 if(!user){gymXPAwards=[];return}
 const {data,error}=await db.from("gym_xp_awards").select("workout_id,awarded_at,qualified,base_xp,volume_xp,pr_xp,xp_awarded,volume_kg,pr_count").order("awarded_at",{ascending:false}).limit(200);
 if(error){console.warn("EDGY Gym XP:",error.message);return}
 gymXPAwards=data||[];
};
const gymXPOriginalWorkout=renderWorkout;
renderWorkout=function(){
 const content=gymXPOriginalWorkout();
 if(!user||!active)return content;
 const widget='<div class="gymXPInfo"><div><h3>Ganha XP ao treinar</h3><p>+20 XP por treino válido · +5 XP/1.000 kg · +15 XP por PR.</p><p>Mínimo: 15 min, 3 séries, 2 exercícios, 300 kg. Máx. 2 treinos e 120 XP em 24 h.</p></div><span class="gymXPNumber">XP EDGY ✦</span></div>';
 const target='<div class="gymWorkoutFooterActions">';
 return content.includes(target)?content.replace(target,widget+target):content+widget;
};
const gymXPOriginalProfile=renderProfile;
renderProfile=function(){
 const content=gymXPOriginalProfile();
 if(!user)return content;
 const total=gymXPAwards.reduce((n,a)=>n+Number(a.xp_awarded||0),0);
 const earned=gymXPAwards.filter(a=>a.xp_awarded>0);
 const info='<div class="card gymXPRules"><h3>XP de treino</h3><p class="muted">Já ganhaste <strong>'+fmt(total)+' XP</strong> nos '+earned.length+' treinos recompensados. O XP soma-se ao teu nível EDGY.</p><details><summary>Como são calculados os pontos?</summary><p class="muted">20 XP por sessão válida, 5 XP por cada 1.000 kg de volume (máximo 30), 15 XP por cada novo recorde de carga (máximo 3). Máximo de 100 XP por treino, 120 XP e 2 treinos em 24 horas. As recompensas só se aplicam a treinos concluídos após a ativação deste sistema.</p></details></div>';
 const where='<div class="grid gymGrid4">';
 return content.includes(where)?content.replace(where,info+where):content+info;
};
