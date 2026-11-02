/* EDGY Gym · post conversations, public athlete profiles, personal feed */
"use strict";
let gymPostComments=[],gymExpandedComments=new Set();
const gymCommunityBaseLoad=load;
load=async function(){
 await gymCommunityBaseLoad();
 if(!user){gymPostComments=[];return}
 const [comments,ownPosts]=await Promise.all([
  db.from("gym_post_comments").select("id,post_id,user_id,body,created_at").order("created_at",{ascending:false}).limit(1000),
  db.from("gym_feed_posts").select("id,user_id,workout_id,kind,title,body,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(100)
 ]);
 if(comments.error)console.warn("EDGY post comments:",comments.error.message);
 gymPostComments=(comments.data||[]).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
 if(ownPosts.error)console.warn("EDGY own posts:",ownPosts.error.message);
 if(ownPosts.data){
  const map=new Map([...gymFeedPosts,...ownPosts.data].map(p=>[p.id,p]));
  gymFeedPosts=[...map.values()].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
 }
};
function gymCommunityAvatar(userId, fallbackName="Atleta EDGY"){
 const person=gymSocialProfiles.find(p=>p.user_id===userId);
 const isSelf=userId===user?.id;
 const name=person?.display_name||(isSelf?profile?.display_name:null)||fallbackName;
 const letter=esc(String(name||"E").trim().charAt(0).toUpperCase()||"E");
 const path=person?.avatar_path||(isSelf?profile?.avatar_path:null);
 const photo=path?db.storage.from("edgy-avatars").getPublicUrl(path).data.publicUrl:null;
 return '<span class="gymPostInitial '+(photo?'gymPostPhoto':'')+'"><span class="gymAvatarFallback">'+letter+'</span>'+
 (photo?'<img src="'+esc(photo)+'" alt="" data-gym-avatar loading="lazy" decoding="async">':'')+
 '</span>';
}
function gymCommentsFor(id){return gymPostComments.filter(x=>x.post_id===id)}
function gymCommunityComments(post){
 const comments=gymCommentsFor(post.id),expanded=gymExpandedComments.has(post.id);
 const shown=expanded?comments:comments.slice(-2);
 return '<div class="gymComments">'+
  (comments.length?shown.map(c=>{
   const author=gymSocialProfiles.find(p=>p.user_id===c.user_id);
   const editable=c.user_id===user.id||post.user_id===user.id;
   return '<div class="gymComment"><button type="button" class="gymCommentAvatar gymCommentAvatarButton" data-gym-athlete="'+esc(c.user_id)+'" aria-label="Ver perfil de '+esc(author?.display_name||(c.user_id===user.id?profile?.display_name:"Atleta EDGY")||"Atleta EDGY")+'">'+gymCommunityAvatar(c.user_id,author?.display_name||"Atleta")+'</button><div class="gymCommentText"><div class="gymCommentMeta"><button type="button" class="gymCommentName" data-gym-athlete="'+esc(c.user_id)+'">'+esc(author?.display_name||(c.user_id===user.id?profile?.display_name:"Atleta EDGY")||"Atleta EDGY")+'</button><span>'+date(c.created_at)+'</span></div><p>'+esc(c.body)+'</p></div>'+(editable?'<button class="gymCommentDelete" data-gym-delete-comment="'+c.id+'" aria-label="Eliminar resposta">×</button>':'')+'</div>';
  }).join(""):'')+
 (comments.length>2?'<button type="button" class="gymShowComments" data-gym-show-comments="'+post.id+'">'+(expanded?"Mostrar menos":"Ver todas as "+comments.length+" respostas")+'</button>':"")+
 (gymOwnSocial()?.is_public?'<form class="gymCommentForm" data-gym-comment="'+post.id+'"><input name="body" maxlength="500" required placeholder="Escreve uma resposta…" aria-label="Escrever resposta"><button type="submit" aria-label="Enviar resposta">Responder</button></form>':'<div class="gymCommentPrivate">Ativa o teu perfil público para responder.</div>')+
 '</div>';
}
gymFeedCard=function(p){
 const author=gymSocialProfiles.find(x=>x.user_id===p.user_id);
 const liked=gymPostLikes.some(x=>x.post_id===p.id&&x.user_id===user.id);
 const likes=gymPostLikes.filter(x=>x.post_id===p.id).length;
 const comments=gymCommentsFor(p.id).length;
 const kindLabel=({pr:"★ PR",workout:"Treino",goal:"Meta",post:"Publicação"}[p.kind]||"Publicação");
 const owner=p.user_id===user.id;
 const body=String(p.body||"").trim();
 const heading=p.kind!=="post"?'<h3 class="gymPostHeading">'+esc(p.title)+'</h3>':'';
 const postBody=p.kind==="post"?(body||p.title):body;
 return '<article class="card gymSocialPost" id="gym-post-'+p.id+'">'+
 '<div class="gymPostTop"><button class="gymPostAuthor" type="button" data-gym-athlete="'+p.user_id+'">'+gymCommunityAvatar(p.user_id,author?.display_name||(owner?profile?.display_name:"Atleta")||"Atleta")+'<span><strong>'+esc(author?.display_name||(owner?profile?.display_name:"Atleta EDGY")||"Atleta EDGY")+'</strong><small>@'+esc(author?.username||(owner?profile?.username:"edgy")||"edgy")+' · '+date(p.created_at)+'</small></span></button><span class="gymPostKind">'+kindLabel+'</span></div>'+
 heading+(postBody?'<p class="gymPostBody">'+esc(postBody)+'</p>':'')+
 '<div class="gymPostActions"><button class="'+(liked?"is-liked":"")+'" type="button" data-like="'+p.id+'">'+(liked?"♥":"♡")+' <span>'+likes+'</span></button><button type="button" data-gym-comments="'+p.id+'">◎ <span>'+comments+' respostas</span></button>'+(owner?'<button class="gymPostDelete" type="button" data-delete-post="'+p.id+'">Eliminar</button>':'')+'</div>'+
 gymCommunityComments(p)+'</article>';
};
const gymCommunityBaseProfile=renderProfile;
renderProfile=function(){
 const original=gymCommunityBaseProfile();
 if(!user)return original;
 const posts=gymFeedPosts.filter(p=>p.user_id===user.id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
 const feed='<section class="gymPersonalFeed"><div class="gymPersonalFeedHead"><div><h2>As tuas publicações</h2><p class="muted">O teu Feed e conquistas EDGY Gym.</p></div><button class="btn small secondary" id="gymGoFeed">Ver Feed</button></div>'+
 (posts.length?posts.map(gymFeedCard).join(""):'<div class="card gymUXEmpty"><strong>Ainda não publicaste nada</strong><p class="muted">Partilha a tua primeira meta ou uma frase no Feed.</p></div>')+
 '</section>';
 const anchor='<div class="card"><div class="row"><h3>Privacidade e conta</h3>';
 return original.includes(anchor)?original.replace(anchor,feed+anchor):original+feed;
};
async function gymAthleteDialog(id){
 if(!user||!id)return;
 if(id===user.id){gymUXClose();page="perfil";render();return}
 const originalUser=user.id;
 gymUXShow("Perfil EDGY Gym","A consultar o perfil público deste atleta.",'<div class="gymUXEmpty">A carregar o perfil…</div>',true);
 try{
  const {data:athlete,error:athleteError}=await db.from("gym_social_profiles")
   .select("user_id,display_name,username,is_public,avatar_path").eq("user_id",id).maybeSingle();
  if(athleteError)throw athleteError;
  if(!user||user.id!==originalUser)return;
  if(!athlete||!athlete.is_public){
   gymUXShow("Perfil privado","Este atleta não tem um perfil público disponível.",'<div class="gymUXEmpty">O perfil não pode ser consultado.</div>',true);
   return;
  }
  const {data:posts,error:postError}=await db.from("gym_feed_posts")
   .select("id,user_id,kind,title,body,created_at").eq("user_id",id).order("created_at",{ascending:false}).limit(50);
  if(postError)throw postError;
  if(!user||user.id!==originalUser||!gymUXModalOpen)return;
  const previous=gymSocialProfiles.findIndex(p=>p.user_id===id);
  if(previous<0)gymSocialProfiles.push(athlete);else gymSocialProfiles[previous]=athlete;
  const followers=gymFollowRows.filter(f=>f.followed_id===id).length;
  const followingCount=gymFollowRows.filter(f=>f.follower_id===id).length;
  const isFollowing=gymFollowRows.some(f=>f.followed_id===id&&f.follower_id===user.id);
  const listed=posts||[];
  const content='<div class="gymAthleteHeader">'+gymCommunityAvatar(id,athlete.display_name)+
   '<div><h3>'+esc(athlete.display_name||"Atleta EDGY")+'</h3><span>@'+esc(athlete.username||"edgy")+'</span></div></div>'+
   '<div class="gymAthleteActions"><button type="button" class="btn small '+(isFollowing?"secondary":"")+'" data-gym-athlete-follow="'+esc(id)+'">'+(isFollowing?"A seguir ✓":"Seguir atleta")+'</button></div>'+
   '<div class="gymAthleteStats"><span><strong>'+followers+'</strong> seguidores</span><span><strong>'+followingCount+'</strong> a seguir</span><span><strong>'+listed.length+'</strong> publicações recentes</span></div>'+
   '<h3 class="gymAthleteFeedTitle">Publicações</h3>'+
   (listed.length?listed.map(p=>'<article class="gymAthletePost"><strong>'+esc(({goal:"Meta",workout:"Treino",pr:"Recorde",post:"Publicação"}[p.kind]||"Publicação"))+'</strong><p>'+esc(p.kind==="post"?(p.body||p.title):p.title)+'</p>'+(p.kind!=="post"&&p.body?'<p>'+esc(p.body)+'</p>':"")+'<small>'+date(p.created_at)+'</small></article>').join(""):'<p class="muted">Este atleta ainda não tem publicações públicas.</p>');
  gymUXShow("Perfil EDGY Gym","Perfil público e publicações do atleta.",content,true);
 }catch(error){
  console.warn("EDGY Gym profile:",error);
  if(gymUXModalOpen)gymUXShow("Perfil indisponível","Não foi possível carregar este atleta.",'<div class="gymUXEmpty">Tenta abrir o perfil novamente.</div>',true);
 }
}
document.addEventListener("error",event=>{
 if(event.target?.matches?.("img[data-gym-avatar]"))event.target.remove();
},true);

document.addEventListener("click",event=>{
 const b=event.target.closest("button");if(!b||!user)return;
 if(b.id==="gymGoFeed"){page="feed";render();return}
 if(b.dataset.gymAthleteFollow){
  event.preventDefault();event.stopImmediatePropagation();
  const id=b.dataset.gymAthleteFollow;
  if(!gymOwnSocial()?.is_public){toast("Ativa o teu perfil público antes de seguires outros atletas.");return}
  (async()=>{
   try{
    const existing=gymFollowRows.some(f=>f.follower_id===user.id&&f.followed_id===id);
    const q=existing?db.from("gym_follows").delete().eq("follower_id",user.id).eq("followed_id",id):
     db.from("gym_follows").insert({follower_id:user.id,followed_id:id});
    const {error}=await q;if(error)throw error;
    await load();
    render();
    if(gymUXModalOpen)await gymAthleteDialog(id);
   }catch(err){console.warn("EDGY Gym follow:",err);toast("Não foi possível atualizar a ligação com este atleta.")}
  })();
  return;
 }
 if(b.dataset.gymAthlete){
  const id=b.dataset.gymAthlete;
  if(gymNotificationOpen){gymCloseNotifications();setTimeout(()=>gymAthleteDialog(id),230)}
  else gymAthleteDialog(id);
  return;
 }
 if(b.dataset.gymComments){
  const id=b.dataset.gymComments;
  gymExpandedComments.add(id);render();
  document.querySelector('[data-gym-comment="'+id+'"] input')?.focus();
  return;
 }
 if(b.dataset.gymShowComments){
  const id=b.dataset.gymShowComments;
  if(gymExpandedComments.has(id))gymExpandedComments.delete(id);else gymExpandedComments.add(id);
  render();return;
 }
 if(b.dataset.gymDeleteComment){
  const id=b.dataset.gymDeleteComment;
  const post=gymPostComments.find(c=>c.id===id);if(!post)return;
  if(!confirm("Eliminar esta resposta?"))return;
  action(async()=>{
   const {error}=await db.from("gym_post_comments").delete().eq("id",id);
   if(error)throw error;
   toast("Resposta eliminada");
  });
 }
});
document.addEventListener("submit",event=>{
 const form=event.target.closest?.("form[data-gym-comment]");
 if(!form||!user)return;
 event.preventDefault();event.stopImmediatePropagation();
 const id=form.dataset.gymComment;
 const field=form.querySelector('[name="body"]');
 const message=String(field?.value||"").trim();
 if(!message)return;
 if(message.length>500){toast("A resposta é demasiado longa.");return}
 if(!gymOwnSocial()?.is_public){toast("Ativa o perfil público para responder.");return}
 gymExpandedComments.add(id);
 action(async()=>{
  const {error}=await db.from("gym_post_comments").insert({user_id:user.id,post_id:id,body:message});
  if(error)throw error;
  toast("Resposta publicada!");
 });
},true);

/* Replies also appear in the EDGY Gym notification inbox. */
const gymCommunityBaseNotifications=gymNotificationItems;
gymNotificationItems=function(){
 const original=gymCommunityBaseNotifications();
 if(!user)return original;
 const own=new Map(gymFeedPosts.filter(p=>p.user_id===user.id).map(p=>[p.id,p]));
 const responses=gymPostComments.filter(c=>c.user_id!==user.id&&own.has(c.post_id)).map(c=>{
  const author=gymSocialProfiles.find(p=>p.user_id===c.user_id);
  return {id:"reply:"+c.id,title:"Nova resposta à tua publicação",body:(author?.display_name||"Um atleta")+" respondeu a "+own.get(c.post_id).title+".",icon:"✎",when:c.created_at};
 });
 return [...original,...responses].sort((a,b)=>new Date(b.when)-new Date(a.when)).slice(0,40);
};
