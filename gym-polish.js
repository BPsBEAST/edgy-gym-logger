/* EDGY Gym · fast set steppers, likes totals and reactive notifications */
"use strict";
let gymLikeTotals=[];
let gymFreshOwnPosts=[],gymFreshOwnLikes=[],gymFreshOwnComments=[],gymFreshFollows=[],gymFreshActors=[],gymFollowerIdentityRows=[];
let gymRealtimeChannel=null,gymActivityRefreshing=false,gymNoticeRefreshTimer=null,gymLastUnread=null;
const gymStepTimers=new Map();
function gymTotalLikesFor(id){
 const x=gymLikeTotals.find(row=>row.user_id===id);
 return Number(x?.likes_received)||0;
}
const gymPolishBaseLoad=load;
load=async function(){
 await gymPolishBaseLoad();
 if(!user){gymLikeTotals=[];return}
 const {data,error}=await db.from("gym_like_totals").select("user_id,likes_received,post_count").limit(300);
 if(error)console.warn("Gym likes totals:",error.message);
 else gymLikeTotals=data||[];
};
const gymPolishBaseNotices=gymNotificationItems;
gymNotificationItems=function(){
 const original=gymPolishBaseNotices();
 if(!user)return original;
 const own=new Map(gymFreshOwnPosts.map(p=>[p.id,p]));
 const actors=new Map([...gymSocialProfiles,...gymFreshActors,...gymFollowerIdentityRows].map(p=>[p.user_id||p.follower_id,p.display_name]));
 const incoming=[];
 for(const l of gymFreshOwnLikes){
  if(l.user_id===user.id||!own.has(l.post_id))continue;
  incoming.push({id:"like:"+l.post_id+":"+l.user_id,title:"Gostaram da tua publicação",body:(actors.get(l.user_id)||"Um atleta")+" gostou de "+own.get(l.post_id).title+".",icon:"♥",when:l.created_at});
 }
 for(const c of gymFreshOwnComments){
  if(c.user_id===user.id||!own.has(c.post_id))continue;
  incoming.push({id:"reply:"+c.id,title:"Nova resposta à tua publicação",body:(actors.get(c.user_id)||"Um atleta")+" respondeu a "+own.get(c.post_id).title+".",icon:"✎",when:c.created_at});
 }
 for(const f of gymFreshFollows){
  incoming.push({id:"follow:"+f.follower_id,title:"Novo seguidor",body:(actors.get(f.follower_id)||"Atleta EDGY")+" começou a seguir-te.",icon:"♧",when:f.created_at,actorId:f.follower_id});
 }
 const unique=new Map([...original,...incoming].filter(n=>n.when).map(n=>[n.id,n]));
 return [...unique.values()].sort((a,b)=>new Date(b.when)-new Date(a.when)).slice(0,50);
};
const gymPolishBaseHeader=gymUpdateHeader;
gymUpdateHeader=function(){
 gymPolishBaseHeader();
 const bell=document.getElementById("gymBell");if(!bell||!user)return;
 const read=gymReadNotices();
 const unseen=gymNotificationItems().filter(n=>!read.has(n.id)).length;
 if(gymLastUnread!==null&&unseen>gymLastUnread){
  bell.classList.remove("gymBellPulse");
  void bell.offsetWidth;
  bell.classList.add("gymBellPulse");
  setTimeout(()=>bell.classList.remove("gymBellPulse"),750);
 }
 gymLastUnread=unseen;
};
function gymPaintNotificationList(){
 const host=document.getElementById("gymNotifList");
 if(!host||!gymNotificationOpen)return;
 const notices=gymNotificationItems(),read=gymReadNotices();
 host.innerHTML=notices.length?notices.map((n,i)=>
  '<div class="gymNotice '+(read.has(n.id)?"":"unread")+'" style="--note-index:'+Math.min(i,10)+'"><span class="gymNoticeIcon" aria-hidden="true">'+n.icon+'</span><div><strong>'+esc(n.title)+'</strong><small>'+esc(n.body)+'</small><small class="gymNoticeDate">'+esc(new Date(n.when).toLocaleDateString("pt-PT",{day:"numeric",month:"short",year:"numeric"}))+'</small>'+(n.actorId?'<button type="button" class="gymNoticeProfileLink" data-gym-athlete="'+esc(n.actorId)+'">Ver perfil</button>':'')+'</div></div>'
 ).join(""):'<div class="gymNoticeEmpty">Ainda não tens notificações. Os likes, respostas, seguidores e recordes aparecem aqui.</div>';
 gymMarkRead(notices);
 gymUpdateHeader();
}
async function gymFetchActivity(){
 if(!user||gymActivityRefreshing)return;
 gymActivityRefreshing=true;
 try{
  const uid=user.id;
  const {data:posts,error:postError}=await db.from("gym_feed_posts").select("id,user_id,title,created_at").eq("user_id",uid).order("created_at",{ascending:false}).limit(500);
  if(postError)throw postError;
  if(!user||user.id!==uid)return;
  gymFreshOwnPosts=posts||[];
  const ids=gymFreshOwnPosts.map(p=>p.id);
  const [likes,comments,follows,totals,followerNames]=await Promise.all([
   ids.length?db.from("gym_post_likes").select("post_id,user_id,created_at").in("post_id",ids).order("created_at",{ascending:false}).limit(600):Promise.resolve({data:[],error:null}),
   ids.length?db.from("gym_post_comments").select("id,post_id,user_id,created_at").in("post_id",ids).order("created_at",{ascending:false}).limit(600):Promise.resolve({data:[],error:null}),
   db.from("gym_follows").select("follower_id,followed_id,created_at").eq("followed_id",uid).order("created_at",{ascending:false}).limit(300),
   db.from("gym_like_totals").select("user_id,likes_received,post_count").limit(300),
   db.rpc("gym_my_follower_identities")
  ]);
  for(const res of [likes,comments,follows,totals])if(res.error)throw res.error;
  if(!user||user.id!==uid)return;
  gymFreshOwnLikes=likes.data||[];
  gymFreshOwnComments=comments.data||[];
  gymFreshFollows=follows.data||[];
  if(!followerNames.error)gymFollowerIdentityRows=followerNames.data||[];
  else console.warn("Follower identity notification lookup:",followerNames.error.message);
  gymLikeTotals=totals.data||gymLikeTotals;
  const actorIds=[...new Set([...gymFreshOwnLikes.map(x=>x.user_id),...gymFreshOwnComments.map(x=>x.user_id),...gymFreshFollows.map(x=>x.follower_id)].filter(x=>x!==uid))].slice(0,200);
  if(actorIds.length){
   const {data}=await db.from("gym_social_profiles").select("user_id,display_name,username").in("user_id",actorIds);
   gymFreshActors=data||[];
  }else gymFreshActors=[];
  gymUpdateHeader();gymPaintNotificationList();
 }catch(error){console.warn("EDGY Gym notification sync:",error.message||error)}
 finally{gymActivityRefreshing=false}
}
const gymPolishBaseOpen=gymOpenNotifications;
gymOpenNotifications=function(){
 gymPolishBaseOpen();
 const layer=document.getElementById("gymNotifBackdrop");
 if(gymCloseTimer){clearTimeout(gymCloseTimer);gymCloseTimer=null}
 if(layer&&!layer.hidden){layer.classList.remove("gymNotifClosing");layer.classList.add("gymNotifOpening")}
 gymFetchActivity();
};
const gymPolishBaseClose=gymCloseNotifications;
let gymCloseTimer=null;
gymCloseNotifications=function(){
 const layer=document.getElementById("gymNotifBackdrop");
 if(!layer||layer.hidden){gymPolishBaseClose();return}
 layer.classList.remove("gymNotifOpening");
 layer.classList.add("gymNotifClosing");
 if(gymCloseTimer)clearTimeout(gymCloseTimer);
 gymCloseTimer=setTimeout(()=>{
  gymPolishBaseClose();
  layer.classList.remove("gymNotifClosing");
 },210);
};
// Real-time notifications are initialized once in gym-live-community.js.
let gymStartNotificationSync;
const gymPolishBaseStart=window.EDGY_GYM_START;
window.EDGY_GYM_START=async function(){
 await gymPolishBaseStart();
 if(user){await gymFetchActivity();gymStartNotificationSync()}
};
// Social polling and foreground refresh are centralized in gym-live-community.js.
document.addEventListener("click",event=>{
 const btn=event.target.closest("button[data-step-set]");
 if(btn&&user&&active){event.preventDefault();gymFastStepper(btn)}
});
db.auth.onAuthStateChange(event=>{
 if(event==="SIGNED_IN"){
  setTimeout(()=>{if(user&&!gymRealtimeChannel){gymStartNotificationSync();gymFetchActivity()}},500);
 }
 if(event==="SIGNED_OUT"){
  gymLastUnread=null;gymFreshOwnPosts=[];gymFreshOwnLikes=[];gymFreshOwnComments=[];gymFreshFollows=[];gymFollowerIdentityRows=[];gymLikeTotals=[];
  if(gymRealtimeChannel){db.removeChannel?.(gymRealtimeChannel);gymRealtimeChannel=null}
 }
});
