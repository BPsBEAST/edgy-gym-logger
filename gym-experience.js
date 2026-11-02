/* EDGY Gym · social activity count, smooth workout interactions and page transitions */
"use strict";
let gymOwnPublishedCount=0,gymOwnReplyCount=0;
function gymOwnContentCount(){return gymOwnPublishedCount+gymOwnReplyCount}
const gymExperienceBaseLoad=load;
load=async function(){
 await gymExperienceBaseLoad();
 if(!user){gymOwnPublishedCount=0;gymOwnReplyCount=0;return}
 const id=user.id;
 try{
  const [posts,replies]=await Promise.all([
   db.from("gym_feed_posts").select("id",{count:"exact",head:true}).eq("user_id",id),
   db.from("gym_post_comments").select("id",{count:"exact",head:true}).eq("user_id",id)
  ]);
  if(!user||user.id!==id)return;
  if(posts.error)console.warn("EDGY Gym posts count:",posts.error.message);
  if(replies.error)console.warn("EDGY Gym replies count:",replies.error.message);
  gymOwnPublishedCount=posts.error?gymFeedPosts.filter(p=>p.user_id===id).length:Number(posts.count??gymFeedPosts.filter(p=>p.user_id===id).length);
  gymOwnReplyCount=replies.error?gymPostComments.filter(p=>p.user_id===id).length:Number(replies.count??gymPostComments.filter(p=>p.user_id===id).length);
 }catch(err){
  console.warn("EDGY Gym content count:",err.message);
  gymOwnPublishedCount=gymFeedPosts.filter(p=>p.user_id===id).length;
  gymOwnReplyCount=gymPostComments.filter(p=>p.user_id===id).length;
 }
};
let gymMotionNext=null,gymMotionPage=page;
function gymPrepareMotion(kind,id){gymMotionNext={kind,id,page}}
const gymExperienceBaseRender=render;
render=function(){
 const scrolling=document.querySelector(".app");
 const savedInside=scrolling?.scrollTop||0,savedWindow=window.scrollY||0;
 const pageChanged=gymMotionPage!==page;
 gymExperienceBaseRender();
 const display=document.getElementById("screen");
 if(!display)return;
 if(pageChanged){
  if(scrolling)scrolling.scrollTop=0;
  window.scrollTo?.(0,0);
  // No opacity fade or forced layout flush on tab switches: keep navigation responsive.
  display.classList.remove("gymPageEnter");
 }else{
  if(scrolling)scrolling.scrollTop=savedInside;
  if((window.scrollY||0)!==savedWindow)window.scrollTo?.(0,savedWindow);
 }
 gymMotionPage=page;
 const motion=gymMotionNext;
 if(!motion||motion.page!==page)return;
 gymMotionNext=null;
 let target=null;
 if(motion.kind==="exercise")target=display.querySelector('[data-exercise-id="'+motion.id+'"]');
 else if(motion.kind==="set")target=display.querySelector('[data-workout-exercise="'+motion.id+'"] .gymSetItem:last-child');
 else target=display.querySelector('[data-set-item="'+motion.id+'"]');
 if(!target)return;
 target.classList.remove("gymJustChanged");
 void target.offsetWidth;
 target.classList.add("gymJustChanged");
 if(motion.kind==="set"||motion.kind==="exercise"){
  target.scrollIntoView?.({block:"nearest",behavior:"smooth"});
 }
 setTimeout(()=>target.classList.remove("gymJustChanged"),650);
};
document.addEventListener("click",event=>{
 const button=event.target.closest("button");
 if(!button||!user)return;
 if(button.dataset.addSet)gymPrepareMotion("set",button.dataset.addSet);
 if(button.dataset.cycleSet){
  button.classList.add("gymTypePressed");
  setTimeout(()=>button.classList.remove("gymTypePressed"),340);
 }
 if(button.dataset.addSet)button.classList.add("gymAddPressed");
 if(button.dataset.uxAddEx)gymPrepareMotion("exercise",button.dataset.uxAddEx);
},true);
document.addEventListener("change",event=>{
 const t=event.target;
 if(!user||!t.dataset?.set)return;
 if(t.dataset.field==="completed"||t.dataset.field==="to_failure"){
  const row=t.closest?.(".gymSetItem");
  if(row){
   row.classList.add("gymTapFeedback");
   setTimeout(()=>row.classList.remove("gymTapFeedback"),420);
  }
 }
},true);
