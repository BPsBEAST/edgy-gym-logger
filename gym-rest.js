/* Rest timer: local to the athlete, survives page reloads */
"use strict";
const gymRestWorkoutBase=renderWorkout;
renderWorkout=function(){
 const body=gymRestWorkoutBase();
 if(!user||!active)return body;
 const rest='<section class="card gymRestCard"><div class="gymRestTop"><div><span class="gymRestEyebrow">RECUPERAÇÃO</span><h3>Descanso entre séries</h3><div class="gymRestClock" id="gymRestClock">01:30</div></div><label class="gymRestSelectGroup"><span>Duração</span><select class="input gymRestSelect" id="gymRestPreset" aria-label="Duração do descanso"><option value="45">45 s</option><option value="60">60 s</option><option value="90">90 s</option><option value="120">120 s</option><option value="180">180 s</option></select></label></div><div class="gymRestTrack" role="progressbar" aria-label="Descanso restante"><span id="gymRestProgress"></span></div><div class="gymRestActions"><button type="button" class="btn small" id="gymRestStart">▶ Iniciar descanso</button><button type="button" class="btn secondary small" id="gymRestStop">Parar</button></div><div class="gymRestAlertOption">'+gymAlertButton("rest")+'<small>Recebe um aviso quando o descanso terminar, com as notificações autorizadas.</small></div></section>';
 const place=body.indexOf('<section class="card gymExerciseWorkoutCard">');
 const fallback=body.indexOf('<div class="gymWorkoutFooterActions">');
 const at=place>=0?place:(fallback>=0?fallback:0);
 return body.slice(0,at)+rest+body.slice(at);
};
function gymRestKey(type){return "edgy-gym-rest-"+(user?.id||"guest")+"-"+type}
function gymRestPresetSeconds(){return Number(localStorage.getItem(gymRestKey("preset")))||90}
function gymPaintRest(){
 if(!user)return;
 const clock=document.getElementById("gymRestClock");
 const preset=gymRestPresetSeconds(),end=Number(localStorage.getItem(gymRestKey("end")))||0;
 const remain=end?Math.max(0,Math.ceil((end-Date.now())/1000)):0;
 const display=remain||preset;
 if(clock){
  clock.textContent=String(Math.floor(display/60)).padStart(2,"0")+":"+String(display%60).padStart(2,"0");
  clock.classList.toggle("gymRestRunning",remain>0);
 }
 const bar=document.getElementById("gymRestProgress");
 if(bar)bar.style.width=(end&&remain>0?Math.max(0,Math.min(100,(1-remain/preset)*100)):0)+"%";
 const track=bar?.parentElement;
 if(track)track.setAttribute("aria-valuenow",String(end&&remain>0?Math.round((1-remain/preset)*100):0));
 const select=document.getElementById("gymRestPreset");
 if(select&&select.value!==String(preset))select.value=String(preset);
 if(end&&remain===0){
  localStorage.removeItem(gymRestKey("end"));
  if(active){
   toast("Descanso terminado. Próxima série!");
   if(navigator.vibrate)navigator.vibrate([110,80,110]);
   gymAlertRestFinished(end);
  }
 }
}
const gymRestRenderBase=render;
render=function(){gymRestRenderBase();gymPaintRest()};
setInterval(()=>{gymPaintRest();gymPaintWorkoutElapsed()},1000);
document.addEventListener("visibilitychange",()=>{
 if(document.visibilityState==="visible"){gymPaintRest();gymPaintWorkoutElapsed()}
});
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
