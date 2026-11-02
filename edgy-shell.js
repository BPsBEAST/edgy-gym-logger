/* EDGY Gym - unified header, identity and real event notifications. */
"use strict";
const gymShellRender=render;
let gymNotificationOpen=false;
function gymNotificationItems(){
 if(!user)return [];
 const notices=[];
 const ownPosts=new Map(gymFeedPosts.filter(p=>p.user_id===user.id).map(p=>[p.id,p]));
 for(const f of gymFollowRows.filter(f=>f.followed_id===user.id)){
   const athlete=gymSocialProfiles.find(x=>x.user_id===f.follower_id);
   notices.push({id:"follow:"+f.follower_id,title:"Novo seguidor",body:(athlete?.display_name||"Um atleta")+" começou a seguir-te.",icon:"♧",when:f.created_at});
 }
 for(const like of gymPostLikes.filter(x=>x.user_id!==user.id&&ownPosts.has(x.post_id))){
   const athlete=gymSocialProfiles.find(x=>x.user_id===like.user_id);
   notices.push({id:"like:"+like.post_id+":"+like.user_id,title:"Gostaram da tua publicação",body:(athlete?.display_name||"Um atleta")+" gostou de "+ownPosts.get(like.post_id).title+".",icon:"♥",when:like.created_at});
 }
 if(typeof gymPRData==="function"){
   const events=gymPRData().events;
   for(const w of gymDone()){
     for(const p of events.get(w.id)||[]){
       notices.push({id:"pr:"+w.id+":"+p.id,title:"Novo recorde pessoal",body:p.name+" · "+fmt(p.weight)+" kg × "+p.reps,icon:"★",when:w.finished_at});
     }
   }
 }
 return notices.filter(x=>x.when).sort((a,b)=>new Date(b.when)-new Date(a.when)).slice(0,40);
}
function gymReadStoreKey(){return "edgy-gym-notices-read-"+(user?.id||"guest")}
function gymReadNotices(){try{const raw=localStorage.getItem(gymReadStoreKey());return new Set(JSON.parse(raw||"[]"))}catch{return new Set()}}
function gymMarkRead(items){if(!user)return;const read=gymReadNotices();items.forEach(x=>read.add(x.id));localStorage.setItem(gymReadStoreKey(),JSON.stringify([...read].slice(-400)))}
function gymUpdateHeader(){
 const el=document.getElementById("gymHeaderAvatar"),bell=document.getElementById("gymBell");
 if(!el||!bell)return;
 if(user){
   const photo=profile?.avatar_path?db.storage.from("edgy-avatars").getPublicUrl(profile.avatar_path).data.publicUrl:"";
   const fallback=esc((profile?.display_name||user.email||"E").trim().charAt(0).toUpperCase()||"E");
   const avatarKey=user.id+"|"+(profile?.avatar_path||"")+"|"+fallback;
   if(el.dataset.avatarKey!==avatarKey){
    el.innerHTML=photo?'<img src="'+esc(photo)+'" alt="Fotografia de perfil" loading="lazy">':'<span>'+fallback+'</span>';
    el.dataset.avatarKey=avatarKey;
   }
   el.title="Ver perfil";
 }else{
   if(el.dataset.avatarKey!=="guest"){el.innerHTML="<span>E</span>";el.dataset.avatarKey="guest"}
   el.title="Iniciar sessão para ver o perfil";
 }
 const notices=gymNotificationItems(),read=gymReadNotices();
 const unread=notices.filter(n=>!read.has(n.id)).length;
 const badge=document.getElementById("gymBellBadge");
 if(badge){badge.hidden=!unread;badge.textContent=unread>9?"9+":String(unread)}
 bell.classList.toggle("hasUnread",unread>0);
 bell.setAttribute("aria-label",unread?unread+" notificações por ler":"Notificações");
}
function gymCloseNotifications(){
 const b=document.getElementById("gymNotifBackdrop");
 if(!b)return;
 gymNotificationOpen=false;b.hidden=true;
 const bell=document.getElementById("gymBell");
 if(bell)bell.focus();
}
function gymOpenNotifications(){
 if(!user){toast("Inicia sessão para consultares as notificações.");return}
 const notices=gymNotificationItems(),read=gymReadNotices();
 const list=document.getElementById("gymNotifList");
 list.innerHTML=notices.length?notices.map(n=>'<div class="gymNotice '+(read.has(n.id)?"":"unread")+'"><span class="gymNoticeIcon" aria-hidden="true">'+n.icon+'</span><div><strong>'+esc(n.title)+'</strong><small>'+esc(n.body)+'</small><small style="margin-top:4px">'+esc(new Date(n.when).toLocaleDateString("pt-PT",{day:"numeric",month:"short",year:"numeric"}))+'</small></div></div>').join(""):'<div class="gymNoticeEmpty">Ainda não tens notificações. Os novos seguidores, gostos e recordes aparecem aqui.</div>';
 const b=document.getElementById("gymNotifBackdrop");if(!b)return;
 b.hidden=false;gymNotificationOpen=true;
 gymMarkRead(notices);gymUpdateHeader();
 document.getElementById("gymNotifClose")?.focus();
}
render=function(){
 gymShellRender();
 gymUpdateHeader();
};
document.addEventListener("click",event=>{
 const target=event.target.closest("button");
 if(target?.id==="gymBrand"){if(!user){toast("Entra com a tua conta EDGY para começar.");return}if(page!=="treino"){page="treino";render()}window.scrollTo({top:0,behavior:"smooth"});return}
 if(target?.id==="gymHeaderAvatar"){if(!user)return;if(page!=="perfil"){page="perfil";render()}window.scrollTo({top:0,behavior:"smooth"});return}
 if(target?.id==="gymBell"){gymOpenNotifications();return}
 if(target?.id==="gymNotifClose"){gymCloseNotifications();return}
 if(event.target.id==="gymNotifBackdrop"){gymCloseNotifications()}
});
document.addEventListener("keydown",event=>{if(event.key==="Escape"&&gymNotificationOpen)gymCloseNotifications()});
db.auth.onAuthStateChange((event)=>{
 if(event==="SIGNED_OUT"){gymCloseNotifications();gymUpdateHeader()}
});
gymUpdateHeader();
