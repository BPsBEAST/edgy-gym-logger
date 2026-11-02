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
function gymCommunityAvatar(initial){return '<span class="gymPostInitial">'+esc((initial||"E").trim().charAt(0).toUpperCase())+'</span>'}
function gymCommentsFor(id){return gymPostComments.filter(x=>x.post_id===id)}
function gymCommunityComments(post){
 const comments=gymCommentsFor(post.id),expanded=gymExpandedComments.has(post.id);
 const shown=expanded?comments:comments.slice(-2);
 return '<div class="gymComments">'+
  (comments.length?shown.map(c=>{
   const author=gymSocialProfiles.find(p=>p.user_id===c.user_id);
   const editable=c.user_id===user.id||post.user_id===user.id;
   return '<div class="gymComment"><div class="gymCommentAvatar">'+gymCommunityAvatar(author?.display_name||"Atleta")+'</div><div class="gymCommentText"><div class="gymCommentMeta"><strong>'+esc(author?.display_name||"Atleta EDGY")+'</strong><span>'+date(c.created_at)+'</span></div><p>'+esc(c.body)+'</p></div>'+(editable?'<button class="gymCommentDelete" data-gym-delete-comment="'+c.id+'" aria-label="Eliminar resposta">×</button>':'')+'</div>';
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
 '<div class="gymPostTop"><button class="gymPostAuthor" type="button" data-gym-athlete="'+p.user_id+'">'+gymCommunityAvatar(author?.display_name||"Atleta")+'<span><strong>'+esc(author?.display_name||(owner?profile?.display_name:"Atleta EDGY")||"Atleta EDGY")+'</strong><small>@'+esc(author?.username||(owner?profile?.username:"edgy")||"edgy")+' · '+date(p.created_at)+'</small></span></button><span class="gymPostKind">'+kindLabel+'</span></div>'+
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
function gymAthleteDialog(id){
 if(id===user.id){gymUXClose();page="perfil";render();return}
 const athlete=gymSocialProfiles.find(p=>p.user_id===id&&p.is_public);
 if(!athlete){toast("Este perfil é privado ou já não está disponível.");return}
 const posts=gymFeedPosts.filter(p=>p.user_id===id).slice(0,30);
 const following=gymFollowRows.some(f=>f.follower_id===user.id&&f.followed_id===id);
 const content='<div class="gymAthleteHeader">'+gymCommunityAvatar(athlete.display_name)+'<div><h3>'+esc(athlete.display_name)+'</h3><span>@'+esc(athlete.username||"edgy")+'</span></div></div>'+
 '<div class="gymAthleteActions"><button type="button" class="btn small '+(following?"secondary":"")+'" data-follow="'+id+'">'+(following?"A seguir ✓":"Seguir atleta")+'</button></div>'+
 '<h3 class="gymAthleteFeedTitle">Publicações</h3>'+
 (posts.length?posts.map(p=>'<div class="gymAthletePost"><strong>'+esc(p.kind==="goal"?"Meta":p.kind==="workout"?"Treino":p.kind==="pr"?"Recorde":"Publicação")+'</strong><p>'+esc(p.kind==="post"?(p.body||p.title):p.title)+'</p><small>'+date(p.created_at)+'</small></div>').join(""):'<p class="muted">Ainda não tem publicações.</p>');
 gymUXShow("Perfil EDGY Gym","O Feed público deste atleta.",content,true);
}
document.addEventListener("click",event=>{
 const b=event.target.closest("button");if(!b||!user)return;
 if(b.id==="gymGoFeed"){page="feed";render();return}
 if(b.dataset.gymAthlete){gymAthleteDialog(b.dataset.gymAthlete);return}
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
