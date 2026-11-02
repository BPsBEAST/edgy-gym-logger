/* EDGY Gym · real-time social sync & public athlete experience */
"use strict";
let gymPublicProfileId=null,gymPublicProfileSnapshot=null,gymPublicProfileRequest=0;
let gymLiveBusy=false,gymLiveQueued=false,gymLiveDebounce=null,gymLiveSubscribed=false;
const gymPublicExpandedReplies=new Set();
function gymPublicActor(id, fallback="Atleta EDGY"){
 const found=gymSocialProfiles.find(p=>p.user_id===id);
 return {name:found?.display_name||fallback,username:found?.username||"edgy"};
}
function gymPublicProfileMarkup(target,summary,posts,likes,comments){
 const xp=Math.max(0,Number(summary.xp)||0),level=1+Math.floor(xp/100);
 const following=gymFollowRows.some(f=>f.follower_id===user.id&&f.followed_id===target.user_id);
 const days=Array.isArray(summary.days)?summary.days:[0,0,0,0,0,0,0];
 const peak=Math.max(1,...days.map(Number)),total=days.reduce((v,n)=>v+(Number(n)||0),0);
 const counts={followers:Number(summary.followers)||0,following:Number(summary.following)||0,likes:Number(summary.likes_received)||0,posts:(Number(summary.posts)||0)+(Number(summary.replies)||0)};
 const d=new Date(summary.joined_at||Date.now());
 const joined=Number.isNaN(+d)?"":d.toLocaleDateString("pt-PT",{month:"long",year:"numeric"});
 const who=gymPublicActor(target.user_id,target.display_name||"Atleta EDGY");
 const hero='<div class="gymAthleteCover"><span class="gymPublicTag">PERFIL EDGY · GYM LOGGER</span><div class="gymPublicHeroRow">'+
 gymCommunityAvatar(target.user_id,who.name)+
 '<div class="gymPublicIdentity"><h2>'+esc(who.name)+'</h2><span>@'+esc(who.username)+'</span>'+(joined?'<small>Membro EDGY desde '+esc(joined)+'</small>':'')+'</div>'+
 '<button class="gymPublicFollowBtn '+(following?'following':'')+'" type="button" data-gym-public-follow="'+esc(target.user_id)+'">'+(following?"✓ A seguir":"+ Seguir")+'</button></div></div>';
 const stats='<div class="gymPublicStats">'+
 [['Seguidores',counts.followers],['A seguir',counts.following],['Likes',counts.likes],['Posts + respostas',counts.posts]]
 .map(([name,n])=>'<div><strong>'+fmt(n)+'</strong><small>'+name+'</small></div>').join("")+'</div>';
 const xpBox='<div class="gymPublicXp"><div class="gymPublicXpTitle"><span><small>NÍVEL EDGY</small><strong>Nível '+level+'</strong></span><span>'+fmt(xp)+' XP</span></div><div class="gymPublicXpRail"><span style="width:'+(xp%100)+'%"></span></div><small>'+((100-xp%100)%100||100)+' XP até ao próximo nível</small></div>';
 const bars='<div class="gymPublicWeekBars" role="img" aria-label="Treinos nesta semana: '+days.join(", ")+'">'+days.slice(0,7).map((count,i)=>
 '<div class="gymPublicWeekDay"><div class="gymPublicWeekTrack"><span style="height:'+(Number(count)?Math.max(12,100*Number(count)/peak):0)+'%"></span></div><b>'+["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"][i]+'</b><small>'+fmt(Number(count)||0)+'</small></div>').join("")+'</div>';
 const week='<section class="gymPublicWeek"><div class="gymPublicSectionHead"><div><span class="gymPublicEyebrow">ATIVIDADE</span><h3>Treinos desta semana</h3><small>Segunda a domingo · apenas contagem de sessões</small></div><strong>'+total+' '+(total===1?"treino":"treinos")+'</strong></div>'+bars+'</section>';
 const byLikes=new Map(),byComments=new Map();
 for(const l of likes||[])byLikes.set(l.post_id,[...(byLikes.get(l.post_id)||[]),l]);
 for(const c of comments||[])byComments.set(c.post_id,[...(byComments.get(c.post_id)||[]),c]);
 const content=posts.map(p=>{
  const ownerLikes=byLikes.get(p.id)||[],ownerComments=byComments.get(p.id)||[];
  const hasLiked=ownerLikes.some(l=>l.user_id===user.id);
  const content=p.kind==="post"?(p.body||p.title):p.title;
  const body=p.kind!=="post"&&p.body?'<p class="gymPublicPostBody">'+esc(p.body)+'</p>':'';
  const expanded=gymPublicExpandedReplies.has(p.id);
  const shown=expanded?ownerComments:ownerComments.slice(-3);
  const label=({post:"Publicação",goal:"Meta",pr:"Recorde",workout:"Treino"}[p.kind]||"Publicação");
  const replies=shown.map(c=>{
   const actor=gymPublicActor(c.user_id,c.user_id===user.id?profile?.display_name:"Atleta EDGY");
   return '<div class="gymPublicReply"><button type="button" data-gym-athlete="'+esc(c.user_id)+'" class="gymPublicReplyAvatar">'+gymCommunityAvatar(c.user_id,actor.name)+'</button><div><button type="button" class="gymPublicReplyName" data-gym-athlete="'+esc(c.user_id)+'">'+esc(actor.name)+'</button><p>'+esc(c.body)+'</p></div></div>';
  }).join("");
  return '<article class="gymPublicPost"><header><span>'+esc(label)+'</span><small>'+date(p.created_at)+'</small></header><p class="gymPublicPostTitle">'+esc(content)+'</p>'+body+
   '<div class="gymPublicPostActions"><button type="button" data-gym-public-like="'+esc(p.id)+'" aria-label="'+(hasLiked?'Retirar gosto':'Gostar da publicação')+'">'+(hasLiked?'♥':'♡')+' '+ownerLikes.length+' gostos</button><button type="button" data-gym-public-expand="'+esc(p.id)+'">◎ '+ownerComments.length+' '+(ownerComments.length===1?'resposta':'respostas')+'</button></div>'+
   (ownerComments.length?'<div class="gymPublicReplies">'+replies+(ownerComments.length>3?'<button class="gymPublicShowAll" type="button" data-gym-public-expand="'+esc(p.id)+'">'+(expanded?'Mostrar menos':'Ver todas as respostas')+'</button>':'')+'</div>':'')+
   (gymOwnSocial()?.is_public?'<form class="gymPublicReplyForm" data-gym-public-reply="'+esc(p.id)+'"><input name="body" required maxlength="500" placeholder="Escrever resposta…" aria-label="Responder à publicação"><button type="submit">Responder</button></form>':'')+
   '</article>';
 }).join("");
 return '<div class="gymPublicProfile">'+hero+stats+xpBox+week+'<section class="gymPublicPosts"><div class="gymPublicSectionHead"><div><span class="gymPublicEyebrow">COMUNIDADE</span><h3>Publicações</h3></div><strong>'+fmt(Number(summary.posts)||0)+' posts</strong></div>'+
 (content||'<p class="gymPublicEmpty">Este atleta ainda não tem publicações.</p>')+'</section></div>';
}
async function gymAthleteDialog(id,options={}){
 if(!user||!id)return;
 if(id===user.id){gymPublicProfileId=null;gymUXClose();page="perfil";render();return}
 const request=++gymPublicProfileRequest,uid=user.id;
 const quiet=Boolean(options.quiet);
 if(!quiet||!gymUXModalOpen){
  gymPublicProfileId=id;
  gymUXShow("Perfil EDGY","A carregar o perfil público…",'<div class="gymUXEmpty">A carregar o atleta e as publicações…</div>',true);
 }
 try{
  const [a,b,summaryResult]=await Promise.all([
   db.from("gym_social_profiles").select("user_id,display_name,username,is_public,avatar_path").eq("user_id",id).maybeSingle(),
   db.from("gym_feed_posts").select("id,user_id,kind,title,body,created_at").eq("user_id",id).order("created_at",{ascending:false}).limit(30),
   db.rpc("gym_public_athlete_summary",{p_athlete_id:id})
  ]);
  if(!user||user.id!==uid||gymPublicProfileRequest!==request||gymPublicProfileId!==id||!gymUXModalOpen)return;
  if(a.error)throw a.error;if(b.error)throw b.error;if(summaryResult.error)throw summaryResult.error;
  if(!a.data?.is_public||!summaryResult.data){
   gymUXShow("Perfil privado","Este perfil não está disponível publicamente.",'<p class="gymPublicEmpty">O atleta optou por não divulgar o seu perfil.</p>',true);return;
  }
  const posts=b.data||[],ids=posts.map(p=>p.id);
  const [likeResult,commentResult]=await Promise.all([
   ids.length?db.from("gym_post_likes").select("post_id,user_id,created_at").in("post_id",ids).limit(1000):Promise.resolve({data:[],error:null}),
   ids.length?db.from("gym_post_comments").select("id,post_id,user_id,body,created_at").in("post_id",ids).order("created_at",{ascending:true}).limit(1000):Promise.resolve({data:[],error:null})
  ]);
  if(likeResult.error)throw likeResult.error;if(commentResult.error)throw commentResult.error;
  if(!user||user.id!==uid||gymPublicProfileRequest!==request||gymPublicProfileId!==id||!gymUXModalOpen)return;
  const i=gymSocialProfiles.findIndex(p=>p.user_id===id);
  if(i>=0)gymSocialProfiles[i]=a.data;else gymSocialProfiles.push(a.data);
  const comments=commentResult.data||[];
  const missing=[...new Set(comments.map(c=>c.user_id).filter(w=>!gymSocialProfiles.some(p=>p.user_id===w)))].slice(0,100);
  if(missing.length){
   const {data:actors}=await db.from("gym_social_profiles").select("user_id,display_name,username,is_public,avatar_path").in("user_id",missing);
   for(const actor of actors||[])if(!gymSocialProfiles.some(p=>p.user_id===actor.user_id))gymSocialProfiles.push(actor);
  }
  if(!user||user.id!==uid||gymPublicProfileRequest!==request||gymPublicProfileId!==id||!gymUXModalOpen)return;
  gymPublicProfileSnapshot={athlete:a.data,summary:summaryResult.data,posts,likes:likeResult.data||[],comments};
  const scroll=document.querySelector("#gymUXModal .gymUXBody"),priorScroll=quiet?scroll?.scrollTop:0;
  gymUXShow("Perfil EDGY","Perfil público do atleta",gymPublicProfileMarkup(a.data,summaryResult.data,posts,likeResult.data||[],comments),true);
  if(quiet){const body=document.querySelector("#gymUXModal .gymUXBody");if(body)body.scrollTop=priorScroll||0}
 }catch(err){
  console.warn("EDGY public profile:",err);
  if(gymPublicProfileId===id&&gymUXModalOpen&&!quiet)gymUXShow("Perfil indisponível","Não foi possível carregar o perfil.",'<div class="gymUXEmpty">Tenta novamente dentro de alguns instantes.</div>',true);
 }
}
const gymPublicPriorClose=gymUXClose;
gymUXClose=function(){gymPublicProfileId=null;gymPublicProfileSnapshot=null;gymPublicProfileRequest++;gymPublicPriorClose()};
function gymPublicRenderCached(){
 if(!gymPublicProfileSnapshot||!gymPublicProfileId||!gymUXModalOpen)return;
 const s=gymPublicProfileSnapshot,body=document.querySelector("#gymUXModal .gymUXBody");
 if(!body)return;
 const scroll=body.scrollTop;
 body.innerHTML=gymPublicProfileMarkup(s.athlete,s.summary,s.posts,s.likes,s.comments);
 body.scrollTop=scroll;
}
document.addEventListener("click",event=>{
 const b=event.target.closest("button");if(!b||!user)return;
 if(b.dataset.gymPublicExpand){
  event.preventDefault();event.stopImmediatePropagation();
  const id=b.dataset.gymPublicExpand;
  if(gymPublicExpandedReplies.has(id))gymPublicExpandedReplies.delete(id);else gymPublicExpandedReplies.add(id);
  gymPublicRenderCached();return;
 }
 if(b.dataset.gymPublicLike){
  event.preventDefault();event.stopImmediatePropagation();
  if(!gymOwnSocial()?.is_public){toast("Ativa o perfil público para gostar de publicações.");return}
  const postId=b.dataset.gymPublicLike,loaded=gymPublicProfileSnapshot;if(!loaded)return;
  const liked=loaded.likes.some(l=>l.post_id===postId&&l.user_id===user.id);
  b.disabled=true;
  (async()=>{
   try{
    const q=liked?db.from("gym_post_likes").delete().eq("post_id",postId).eq("user_id",user.id):
      db.from("gym_post_likes").insert({post_id:postId,user_id:user.id});
    const {error}=await q;if(error)throw error;
    if(!gymPublicProfileSnapshot||gymPublicProfileSnapshot!==loaded)return;
    if(liked)loaded.likes=loaded.likes.filter(l=>!(l.post_id===postId&&l.user_id===user.id));
    else loaded.likes.push({post_id:postId,user_id:user.id,created_at:new Date().toISOString()});
    gymPublicRenderCached();
    gymScheduleLiveSync();
   }catch(err){console.warn(err);toast("Não foi possível atualizar o gosto.");b.disabled=false}
  })();
 }
 if(b.dataset.gymPublicFollow){
  event.preventDefault();event.stopImmediatePropagation();
  if(!gymOwnSocial()?.is_public){toast("Ativa o perfil público para seguir atletas.");return}
  const id=b.dataset.gymPublicFollow; b.disabled=true;
  (async()=>{
   try{
    const follows=gymFollowRows.some(f=>f.follower_id===user.id&&f.followed_id===id);
    const q=follows?db.from("gym_follows").delete().eq("follower_id",user.id).eq("followed_id",id):
       db.from("gym_follows").insert({follower_id:user.id,followed_id:id});
    const {error}=await q;if(error)throw error;
    if(follows)gymFollowRows=gymFollowRows.filter(f=>!(f.follower_id===user.id&&f.followed_id===id));
    else gymFollowRows.push({follower_id:user.id,followed_id:id,created_at:new Date().toISOString()});
    if(gymPublicProfileSnapshot&&gymPublicProfileId===id){
     gymPublicProfileSnapshot.summary.followers+=follows?-1:1;
     gymPublicRenderCached();
    }
    gymScheduleLiveSync();
   }catch(err){console.warn(err);toast("Não foi possível atualizar os seguidores.");b.disabled=false}
  })();
 }
},true);
document.addEventListener("submit",event=>{
 const form=event.target.closest?.("form[data-gym-public-reply]");
 if(!form||!user)return;
 event.preventDefault();event.stopImmediatePropagation();
 if(!gymOwnSocial()?.is_public){toast("Ativa o perfil público para responder.");return}
 const postId=form.dataset.gymPublicReply,message=String(form.querySelector('[name="body"]')?.value||"").trim();
 if(!message||message.length>500)return;
 const submit=form.querySelector('[type="submit"]');if(submit)submit.disabled=true;
 (async()=>{
  try{
   const {data,error}=await db.from("gym_post_comments").insert({post_id:postId,user_id:user.id,body:message}).select("id,post_id,user_id,body,created_at").single();
   if(error)throw error;
   if(gymPublicProfileSnapshot&&gymPublicProfileId){
    gymPublicProfileSnapshot.comments.push(data);
    gymPublicExpandedReplies.add(postId);gymPublicRenderCached();
   }
   gymScheduleLiveSync();
  }catch(err){console.warn(err);toast("Não foi possível enviar a resposta.");if(submit)submit.disabled=false}
 })();
},true);
async function gymLiveRefresh(){
 if(!user||gymLiveBusy){gymLiveQueued=true;return}
 gymLiveBusy=true;const id=user.id;
 try{
  const [social,comments,totals,postCount,replyCount]=await Promise.all([
   gymRefreshSocial(),
   db.from("gym_post_comments").select("id,post_id,user_id,body,created_at").order("created_at",{ascending:false}).limit(1000),
   db.from("gym_like_totals").select("user_id,likes_received,post_count").limit(300),
   db.from("gym_feed_posts").select("id",{count:"exact",head:true}).eq("user_id",id),
   db.from("gym_post_comments").select("id",{count:"exact",head:true}).eq("user_id",id)
  ]);
  if(!user||user.id!==id)return;
  if(!comments.error)gymPostComments=(comments.data||[]).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  if(!totals.error)gymLikeTotals=totals.data||[];
  if(!postCount.error)gymOwnPublishedCount=postCount.count||0;
  if(!replyCount.error)gymOwnReplyCount=replyCount.count||0;
  await gymFetchActivity();
  if(!user||user.id!==id)return;
  gymUpdateHeader();
  const isSocial=page==="perfil"||page==="feed";
  const focus=document.activeElement,typing=focus&&/^(INPUT|TEXTAREA|SELECT)$/.test(focus.tagName||"");
  if(isSocial&&!typing)render();
  if(gymPublicProfileId&&gymUXModalOpen&&!typing)await gymAthleteDialog(gymPublicProfileId,{quiet:true});
 }catch(e){console.warn("Gym live social:",e)}
 finally{
  gymLiveBusy=false;
  if(gymLiveQueued){gymLiveQueued=false;gymScheduleLiveSync()}
 }
}
function gymScheduleLiveSync(){
 if(gymLiveDebounce)clearTimeout(gymLiveDebounce);
 gymLiveDebounce=setTimeout(()=>{gymLiveDebounce=null;gymLiveRefresh()},260);
}
gymStartNotificationSync=function(){
 if(!user)return;
 if(gymRealtimeChannel){db.removeChannel?.(gymRealtimeChannel);gymRealtimeChannel=null}
 gymLiveSubscribed=false;
 if(typeof db.channel!=="function")return;
 try{
  const channel=db.channel("edgy-gym-social-"+user.id);
  gymRealtimeChannel=channel;
  for(const table of ["gym_post_likes","gym_post_comments","gym_follows","gym_feed_posts","gym_social_profiles"]){
   channel.on("postgres_changes",{event:"*",schema:"public",table},()=>gymScheduleLiveSync());
  }
  channel.subscribe(status=>{
   gymLiveSubscribed=status==="SUBSCRIBED";
   if(status==="SUBSCRIBED")gymScheduleLiveSync();
   if(status==="CHANNEL_ERROR"||status==="TIMED_OUT")console.warn("EDGY Gym realtime:",status);
  });
 }catch(err){console.warn("EDGY Gym channel:",err)}
};
const gymPublicBaseOpen=gymOpenNotifications;
gymOpenNotifications=function(){gymPublicBaseOpen();gymScheduleLiveSync()};
setInterval(()=>{
 if(user&&document.visibilityState!=="hidden")gymScheduleLiveSync();
},gymLiveSubscribed?12000:8000);
document.addEventListener("visibilitychange",()=>{
 if(user&&document.visibilityState==="visible")gymScheduleLiveSync();
});
window.addEventListener?.("focus",()=>{if(user)gymScheduleLiveSync()});
