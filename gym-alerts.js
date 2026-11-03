/* EDGY Gym — workout chronometer and opt-in device notifications */
"use strict";
let gymAlertServiceWorker=null;
let gymAlertServiceWorkerReady=null;
let gymAlertProcessing=false;
const gymAlertKinds=["rest","social"];
function gymAlertPrefsKey(){return "edgy-gym-alerts-"+(user?.id||"guest")}
function gymAlertPrefs(){
 try{
  const saved=JSON.parse(localStorage.getItem(gymAlertPrefsKey())||"{}");
  return {rest:saved.rest===true,social:saved.social===true};
 }catch{return {rest:false,social:false}}
}
function gymAlertSet(kind,enabled){
 const next={...gymAlertPrefs(),[kind]:enabled};
 localStorage.setItem(gymAlertPrefsKey(),JSON.stringify(next));
}
function gymAlertSupported(){
 return typeof Notification!=="undefined"&&"serviceWorker" in navigator&&
  typeof navigator.serviceWorker?.register==="function";
}
function gymAlertHelp(){
 if(!gymAlertSupported())return "Este navegador não suporta alertas do sistema. No iPhone, adiciona a Gym Logger ao ecrã principal e abre-a a partir do ícone.";
 if(Notification.permission==="denied")return "As notificações estão bloqueadas nas definições do sistema ou navegador. Altera essa permissão para receber alertas.";
 return "Os alertas locais funcionam enquanto a Gym Logger estiver em execução. Alertas com a app totalmente fechada requerem envio push pelo servidor.";
}
function gymAlertButton(kind){
 const enabled=gymAlertPrefs()[kind]&&gymAlertSupported()&&Notification.permission==="granted";
 return '<button type="button" class="gymAlertOption '+(enabled?'is-enabled':'')+'" data-gym-alert-toggle="'+kind+'" aria-pressed="'+enabled+'">'+
 (enabled?"✓":"♢")+' '+(kind==="rest"?"Alertas de descanso":"Alertas de likes e respostas")+
 '<span>'+(enabled?"Ativados":"Ativar")+'</span></button>';
}
function gymAlertSettingsCard(){
 if(!user)return "";
 return '<section class="card gymAlertsSettings"><div class="gymAlertsHeader"><div><span class="gymAlertsEyebrow">ALERTAS</span><h3>Notificações no telemóvel</h3><p class="muted">Escolhe os avisos que queres receber nesta aplicação.</p></div><span class="gymAlertsBadge">EDGY</span></div>'+
 '<div class="gymAlertsOptions">'+gymAlertButton("rest")+gymAlertButton("social")+'</div>'+
 '<p class="gymAlertsDisclaimer">'+esc(gymAlertHelp())+'</p></section>';
}
// Keep notifications optional; never ask for permission on startup.
async function gymAlertRegisterWorker(){
 if(!gymAlertSupported())return null;
 if(gymAlertServiceWorkerReady)return gymAlertServiceWorkerReady;
 gymAlertServiceWorkerReady=navigator.serviceWorker.register("./sw.js",{scope:"./"})
   .then(reg=>{gymAlertServiceWorker=reg;return reg})
   .catch(error=>{
     gymAlertServiceWorkerReady=null;
     console.warn("EDGY Gym notifications unavailable:",error);
     return null;
   });
 return gymAlertServiceWorkerReady;
}
async function gymShowDeviceNotification(kind,title,body,tag){
 if(!user||!gymAlertPrefs()[kind]||!gymAlertSupported()||Notification.permission!=="granted")return false;
 try{
  const reg=await gymAlertRegisterWorker();
  if(!reg||typeof reg.showNotification!=="function")return false;
  const page=kind==="rest"?"treino":"feed";
  await reg.showNotification(title,{
   body,icon:"./icon.svg",badge:"./icon.svg",tag:String(tag||"gym-"+kind).slice(0,90),
   data:{page},renotify:false
  });
  return true;
 }catch(error){console.warn("EDGY Gym device notification:",error);return false}
}
function gymWorkoutElapsedValue(started){
 const ms=Date.now()-new Date(started).getTime();
 if(!Number.isFinite(ms)||ms<0)return "00:00:00";
 const sec=Math.floor(ms/1000);
 return [Math.floor(sec/3600),Math.floor((sec%3600)/60),sec%60].map(n=>String(n).padStart(2,"0")).join(":");
}
function gymPaintWorkoutElapsed(){
 const node=document.getElementById("gymWorkoutElapsed");
 if(!node||!user||!active)return;
 const value=gymWorkoutElapsedValue(active.started_at);
 if(node.textContent!==value)node.textContent=value;
}
function gymAlertRestFinished(deadline){
 if(!user||Date.now()-deadline>120000)return; // Don't alert for an hours-old timer on reopening.
 gymShowDeviceNotification("rest","Descanso terminado","Já podes começar a próxima série.","gym-rest-"+user.id+"-"+deadline);
}
function gymAlertActivityIDs(){
 const myPosts=new Set((gymFreshOwnPosts||[]).map(p=>p.id));
 return [
  ...(gymFreshOwnLikes||[]).filter(l=>l.user_id!==user.id&&myPosts.has(l.post_id))
    .map(l=>({id:"like:"+l.post_id+":"+l.user_id,
      title:"Novo gosto no teu post",body:"Alguém gostou da tua publicação."})),
  ...(gymFreshOwnComments||[]).filter(c=>c.user_id!==user.id&&myPosts.has(c.post_id))
    .map(c=>({id:"reply:"+c.id,title:"Nova resposta no teu post",
      body:"Recebeste uma nova resposta na tua publicação."}))
 ];
}
function gymAlertSeenKey(){return "edgy-gym-alert-seen-"+(user?.id||"guest")}
function gymAlertCheckSocialChanges(){
 if(!user)return;
 const current=gymAlertActivityIDs();
 const key=gymAlertSeenKey();
 let known=null;
 try{const stored=JSON.parse(localStorage.getItem(key)||"null");if(Array.isArray(stored))known=stored}catch{}
 const currentIds=current.map(x=>x.id);
 // First sync establishes a baseline; existing old likes must not notify as new.
 if(!known){
  try{localStorage.setItem(key,JSON.stringify(currentIds.slice(-1000)))}catch{}
  return;
 }
 const prior=new Set(known);
 const incoming=current.filter(n=>!prior.has(n.id));
 const combined=[...new Set([...known,...currentIds])].slice(-1000);
 try{localStorage.setItem(key,JSON.stringify(combined))}catch{}
 if(!gymAlertPrefs().social)return;
 for(const entry of incoming.slice(0,5)){
  gymShowDeviceNotification("social",entry.title,entry.body,"gym-"+entry.id);
 }
}
function gymAlertCaptureBaseline(){
 if(!user)return;
 try{
  const old=JSON.parse(localStorage.getItem(gymAlertSeenKey())||"[]");
  const all=[...new Set([...(Array.isArray(old)?old:[]),...gymAlertActivityIDs().map(x=>x.id)])].slice(-1000);
  localStorage.setItem(gymAlertSeenKey(),JSON.stringify(all));
 }catch{}
}
const gymAlertPriorFetchActivity=gymFetchActivity;
gymFetchActivity=async function(...args){
 const currentId=user?.id;
 const wasFetching=gymActivityRefreshing;
 await gymAlertPriorFetchActivity(...args);
 if(!wasFetching&&!gymActivityRefreshing&&user?.id===currentId)gymAlertCheckSocialChanges();
};
const gymAlertPriorProfile=renderProfile;
renderProfile=function(){return gymAlertPriorProfile()+gymAlertSettingsCard()};
document.addEventListener("click",event=>{
 const button=event.target.closest?.("button[data-gym-alert-toggle]");
 if(!button||!user||gymAlertProcessing)return;
 event.preventDefault();event.stopImmediatePropagation();
 const kind=button.dataset.gymAlertToggle;
 if(!gymAlertKinds.includes(kind))return;
 const currentlyEnabled=gymAlertPrefs()[kind]&&gymAlertSupported()&&Notification.permission==="granted";
 if(currentlyEnabled){
  gymAlertSet(kind,false);
  render();
  toast("Alertas desativados.");
  return;
 }
 if(!gymAlertSupported()){toast(gymAlertHelp());return}
 if(Notification.permission==="denied"){toast("Autoriza notificações nas definições do telemóvel.");return}
 // Must request permission synchronously within this direct user gesture.
 let permissionRequest=null;
 if(Notification.permission==="default")permissionRequest=Notification.requestPermission();
 gymAlertProcessing=true;
 button.disabled=true;
 (async()=>{
  try{
   const granted=permissionRequest?await permissionRequest:Notification.permission;
   if(granted!=="granted")throw new Error("Não foi concedida autorização para notificações.");
   const reg=await gymAlertRegisterWorker();
   if(!reg)throw new Error("Não foi possível ativar os alertas neste navegador.");
   if(kind==="social")gymAlertCaptureBaseline();
   gymAlertSet(kind,true);
   render();
   toast(kind==="rest"?"Alertas de descanso ativados!":"Alertas de likes e respostas ativados!");
  }catch(error){
   button.disabled=false;
   toast(error?.message||"Não foi possível ativar as notificações.");
  }finally{gymAlertProcessing=false}
 })();
},true);
if("serviceWorker" in navigator){
 gymAlertRegisterWorker();
 navigator.serviceWorker.addEventListener?.("message",event=>{
  if(event.data?.type!=="EDGY_GYM_OPEN"||!user)return;
  const target=event.data.page==="feed"?"feed":"treino";
  if(page!==target){page=target;render()}
 });
}
const gymAlertLink=new URLSearchParams(window.location.search).get("open");
if(gymAlertLink==="feed"||gymAlertLink==="treino"){
 const gymAlertOriginalStart=window.EDGY_GYM_START;
 window.EDGY_GYM_START=async function(...args){
  await gymAlertOriginalStart(...args);
  if(user&&page!==gymAlertLink){page=gymAlertLink;render()}
 };
}
