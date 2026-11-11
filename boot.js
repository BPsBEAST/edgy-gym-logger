/* EDGY Gym · resilient asset/bootstrap loader
   Fetch the Supabase browser bundle using the same documented CDN as EDGY Game Hub.
   Only start application scripts after the SDK exists. */
(function(){
"use strict";
const main=document.getElementById("screen");
const sources=[
 "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
 "https://unpkg.com/@supabase/supabase-js@2"
];
const local=["gym-avatar-editor.js?v=1","gym-app.bundle.js?v=36"];
function showIssue(message){
 if(!main)return;
 main.innerHTML='<section class="card hero" role="alert"><h1>Não foi possível carregar a aplicação</h1><p class="muted">'+message+'</p><button type="button" class="btn" id="gymRetryLoad">Tentar novamente</button></section>';
 document.getElementById("gymRetryLoad")?.addEventListener("click",()=>location.reload());
}
function insertScript(url,seconds){
 return new Promise((resolve,reject)=>{
  const el=document.createElement("script");
  el.src=url;el.async=false;
  let settled=false;
  const timeout=setTimeout(()=>{
   if(settled)return;settled=true;el.onload=el.onerror=null;el.remove();
   reject(new Error("Tempo de carregamento excedido: "+url));
  },seconds*1000);
  el.onload=()=>{if(settled)return;settled=true;clearTimeout(timeout);resolve()};
  el.onerror=()=>{if(settled)return;settled=true;clearTimeout(timeout);reject(new Error("Recurso indisponível: "+url))};
  document.head.appendChild(el);
 });
}
function fallbackNav(){
 const nav=document.getElementById("nav");
 if(!nav)return;
 nav.querySelectorAll("button").forEach(button=>{
  button.addEventListener("click",()=>{
   if(!window.EDGY_GYM_LOADED)showIssue("Não foi possível estabelecer a ligação necessária. Confirma a internet e tenta novamente.");
  });
 });
}
fallbackNav();
(async function(){
 try{
  if(!window.supabase?.createClient){
   let available=false;
   for(const url of sources){
    try{await insertScript(url,12);if(window.supabase?.createClient){available=true;break}}catch(error){console.warn("EDGY SDK:",error.message)}
   }
   if(!available)throw new Error("A biblioteca Supabase não carregou. Experimenta desativar temporariamente um bloqueador de scripts ou atualizar o navegador.");
  }
  for(const asset of local){await insertScript(asset,10)}
  if(typeof window.EDGY_GYM_START!=="function")throw new Error("Falhou a inicialização da interface EDGY Gym. Atualiza a página.");
  await window.EDGY_GYM_START();
  window.EDGY_GYM_LOADED=true;
  const content=main?.textContent||"";
  if(content.includes("A iniciar a aplicação")||content.includes("A preparar a aplicação")){
   showIssue("O JavaScript carregou, mas não conseguiu iniciar a interface. Tenta atualizar a página.");
  }
 }catch(error){
  console.error("EDGY Gym:",error);
  showIssue(error.message||"Não foi possível iniciar.");
 }
})();
})();
