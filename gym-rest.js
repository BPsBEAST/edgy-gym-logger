/* Rest timer: local to the athlete, survives page reloads */
"use strict";
const gymRestWorkoutBase=renderWorkout;
renderWorkout=function(){
 const body=gymRestWorkoutBase();
 if(!user||!active)return body;
 const rest='<div class="card gymRestCard"><div class="row"><div><small class="muted">Descanso entre séries</small><div class="gymRestClock" id="gymRestClock">01:30</div></div><select class="input gymRestSelect" id="gymRestPreset" aria-label="Duração do descanso"><option value="45">45 s</option><option value="60">60 s</option><option value="90">90 s</option><option value="120">120 s</option><option value="180">180 s</option></select></div><div class="row" style="margin-top:12px"><button type="button" class="btn small" id="gymRestStart">Iniciar descanso</button><button type="button" class="btn secondary small" id="gymRestStop">Parar</button></div></div>';
 return rest+body;
};
function gymRestKey(type){return "edgy-gym-rest-"+(user?.id||"guest")+"-"+type}
function gymRestPresetSeconds(){return Number(localStorage.getItem(gymRestKey("preset")))||90}
function gymPaintRest(){
 const clock=document.getElementById("gymRestClock");if(!clock)return;
 const preset=gymRestPresetSeconds(),end=Number(localStorage.getItem(gymRestKey("end")))||0;
 const remain=end?Math.max(0,Math.ceil((end-Date.now())/1000)):0;
 const display=remain||preset;
 clock.textContent=String(Math.floor(display/60)).padStart(2,"0")+":"+String(display%60).padStart(2,"0");
 clock.classList.toggle("gymRestRunning",remain>0);
 const select=document.getElementById("gymRestPreset");
 if(select&&select.value!==String(preset))select.value=String(preset);
 if(end&&remain===0){
  localStorage.removeItem(gymRestKey("end"));
  toast("Descanso terminado. Próxima série!");
  if(navigator.vibrate)navigator.vibrate([110,80,110]);
 }
}
const gymRestRenderBase=render;
render=function(){gymRestRenderBase();gymPaintRest()};
setInterval(gymPaintRest,1000);
document.addEventListener("click",event=>{
 const b=event.target.closest("button");if(!b||!user)return;
 if(b.id==="gymRestStart"){
  localStorage.setItem(gymRestKey("end"),String(Date.now()+gymRestPresetSeconds()*1000));
  gymPaintRest();
 }
 if(b.id==="gymRestStop"){localStorage.removeItem(gymRestKey("end"));gymPaintRest()}
});
document.addEventListener("change",event=>{
 if(event.target.id==="gymRestPreset"){
  localStorage.setItem(gymRestKey("preset"),event.target.value);
  gymPaintRest();
 }
});
