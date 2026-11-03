/* EDGY Gym Logger — notification service worker. No cache, no cross-app interception. */
"use strict";
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));
const scopeUrl=()=>new URL(self.registration.scope);
const safeTarget=(page)=>{
 const root=scopeUrl();
 const target=new URL(page==="feed"?"?open=feed":"?open=treino",root);
 return target.href;
};
self.addEventListener("push",event=>{
 let data={};
 try{data=event.data?.json()||{}}catch(e){data={body:event.data?.text()||""}}
 const type=data.type==="rest"?"rest":"social";
 const title=String(data.title||"EDGY — Gym Logger").slice(0,90);
 const body=String(data.body||"Tens novidades na EDGY.").slice(0,220);
 event.waitUntil(self.registration.showNotification(title,{
  body,icon:"./icon.svg",badge:"./icon.svg",tag:String(data.tag||"gym-"+type).slice(0,90),
  data:{page:type==="rest"?"treino":"feed"},renotify:false
 }));
});
self.addEventListener("notificationclick",event=>{
 event.notification.close();
 const page=event.notification.data?.page==="feed"?"feed":"treino";
 event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:"window",includeUncontrolled:true});
  for(const client of windows){
   if(!client.url.startsWith(scopeUrl().href))continue;
   await client.focus();
   client.postMessage({type:"EDGY_GYM_OPEN",page});
   return;
  }
  await self.clients.openWindow(safeTarget(page));
 })());
});
