/* EDGY Gym · analytics, exercise records and opt-in community */
"use strict";
let gymSelectedExercise=null,gymCalendarMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);
let gymMeasureMetric="body_weight",gymFeedSearch="",gymFeedMode="following";
let gymSocialProfiles=[],gymFollowRows=[],gymFeedPosts=[],gymPostLikes=[];
const gymMetricFields=[["body_weight","Peso","kg"],["waist","Cintura","cm"],["abdomen","Abdómen","cm"],["chest","Peito","cm"],["shoulders","Ombros","cm"],["arm","Braço direito","cm"],["left_arm","Braço esquerdo","cm"],["thigh","Coxa","cm"],["calf","Gémeo","cm"],["glutes","Glúteo","cm"]];
const gymDone=()=>history.filter(w=>!!w.finished_at);
const gymSets=w=>(w.gym_workout_exercises||[]).flatMap(we=>(we.gym_sets||[]).map(s=>({...s,exercise_id:we.exercise_id,exercise_name:we.gym_exercises?.name||"Exercício"}))).filter(s=>s.completed&&s.set_type!=="warmup"&&Number(s.reps)>0);
const gymOneRM=s=>Number(s.weight)*(1+Math.min(12,Number(s.reps))/30);
function gymPRData(){
 const best=new Map(),events=new Map();
 for(const w of gymDone().slice().sort((a,b)=>new Date(a.started_at)-new Date(b.started_at))){
  const prs=[];
  for(const s of gymSets(w)){
   const prior=best.get(s.exercise_id)||{weight:0,one:0,volume:0};
   const one=gymOneRM(s),vol=Number(s.weight)*Number(s.reps);
   const isPR=Number(s.weight)>prior.weight||one>prior.one+0.01||vol>prior.volume;
   if(isPR&&Number(s.weight)>0&&!prs.some(p=>p.id===s.exercise_id))prs.push({id:s.exercise_id,name:s.exercise_name,weight:Number(s.weight),reps:Number(s.reps)});
   best.set(s.exercise_id,{weight:Math.max(prior.weight,Number(s.weight)),one:Math.max(prior.one,one),volume:Math.max(prior.volume,vol)});
  }
  events.set(w.id,prs);
 }
 return {best,events};
}
function gymPlot(series,unit){
 const values=series.filter(x=>Number.isFinite(x.value)).slice(-30);
 if(!values.length)return '<p class="muted">Ainda não existem registos para este gráfico.</p>';
 const low=Math.min(...values.map(v=>v.value)),high=Math.max(...values.map(v=>v.value));
 const min=low===high?low-1:low-(high-low)*.14,max=high===low?high+1:high+(high-low)*.14;
 const points=values.map((v,i)=>({x:18+(values.length===1?.5:i/(values.length-1))*284,y:109-((v.value-min)/(max-min))*91}));
 const path=points.map((p,i)=>(i===0?"M":"L")+p.x.toFixed(2)+" "+p.y.toFixed(2)).join(" ");
 const dots=points.map(p=>'<circle cx="'+p.x+'" cy="'+p.y+'" r="3.6" fill="#8995ff" stroke="#10111a" stroke-width="2"/>').join("");
 return '<svg viewBox="0 0 320 133" role="img" aria-label="Gráfico de progressão" style="width:100%;height:auto;display:block"><path d="M18 110H304 M18 62H304 M18 17H304" stroke="#3a3c54" stroke-dasharray="3 5"/><path d="'+path+'" stroke="#8d96ff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'+dots+'<text x="18" y="128" fill="#a6aac2" font-size="10">'+esc(values[0].label)+'</text><text x="303" y="128" text-anchor="end" fill="#a6aac2" font-size="10">'+esc(values[values.length-1].label)+'</text><text x="302" y="12" text-anchor="end" fill="#abb0d0" font-size="10">'+fmt(high)+' '+esc(unit)+'</text></svg>';
}
function gymProfileMarkup(){
 const done=gymDone(),total=done.reduce((v,w)=>v+volume(w),0),minutes=done.reduce((v,w)=>v+duration(w),0);
 const prs=gymPRData(),records=[...prs.events.values()].reduce((n,a)=>n+a.length,0);
 const weeks=Array.from({length:12},(_,i)=>{
  const start=new Date();start.setHours(0,0,0,0);start.setDate(start.getDate()-((start.getDay()+6)%7)-(11-i)*7);
  const end=new Date(start);end.setDate(end.getDate()+7);
  const selected=done.filter(w=>new Date(w.started_at)>=start&&new Date(w.started_at)<end);
  return {label:(start.getMonth()+1)+"/"+start.getDate(),count:selected.length,minutes:selected.reduce((n,w)=>n+duration(w),0)};
 });
 const max=Math.max(1,...weeks.map(w=>w.count));
 const m= gymCalendarMonth,year=m.getFullYear(),month=m.getMonth(),first=new Date(year,month,1);
 const offset=(first.getDay()+6)%7,days=new Date(year,month+1,0).getDate(),trained=new Set(done.filter(w=>new Date(w.started_at).getMonth()===month&&new Date(w.started_at).getFullYear()===year).map(w=>new Date(w.started_at).getDate()));
 const today=new Date();
 let cells='<div class="gymCalendarGrid">'+["S","T","Q","Q","S","S","D"].map(x=>'<span class="gymDayLabel">'+x+'</span>').join("");
 for(let i=0;i<offset;i++)cells+='<span></span>';
 for(let n=1;n<=days;n++)cells+='<span class="gymDay '+(trained.has(n)?"trained ":"")+(today.getDate()===n&&today.getMonth()===month&&today.getFullYear()===year?"today":"")+'">'+n+'</span>';
 cells+='</div>';
 const current=measurements.filter(x=>x[gymMeasureMetric]!=null).slice().reverse().map(m=>({label:m.recorded_at.slice(5),value:Number(m[gymMeasureMetric])}));
 const latest=measurements[0];
 const avatar=profile?.avatar_path?'<img class="gymAvatar" src="'+esc(db.storage.from("edgy-avatars").getPublicUrl(profile.avatar_path).data.publicUrl)+'" alt="Fotografia de perfil">':'<div class="gymAvatar gymAvatarFallback">◉</div>';
 return '<div class="card hero"><div class="row" style="justify-content:flex-start">'+avatar+'<div><h1 style="margin:0">'+esc(profile?.display_name||user.email?.split("@")[0]||"Atleta")+'</h1><span class="muted">@'+esc(profile?.username||"edgy")+'</span><div class="gymJoined">Membro EDGY desde '+((user?.created_at||profile?.created_at)?new Date(user?.created_at||profile?.created_at).toLocaleDateString("pt-PT",{day:"numeric",month:"long",year:"numeric"}):"—")+'</div></div></div><p class="muted" style="margin-bottom:0">'+esc(profile?.bio||"O teu progresso, um treino de cada vez.")+'</p></div>'+
 '<div class="gymSharedXP"><div><span class="gymXPTag">XP EDGY</span><strong>Nível '+(Math.floor(Math.max(0,Number(profile?.xp)||0)/100)+1)+'</strong></div><div class="gymXPProgress"><div class="gymXPProgressBar"><span style="width:'+(Math.max(0,Number(profile?.xp)||0)%100)+'%"></span></div><small>'+fmt(profile?.xp||0)+' XP EDGY</small></div></div>'+
 '<div class="grid gymGrid4"><div class="stat"><strong>'+done.length+'</strong><small>Treinos</small></div><div class="stat"><strong>'+fmt(total)+'</strong><small>Volume kg</small></div><div class="stat"><strong>'+Math.round(minutes/60*10)/10+'h</strong><small>Tempo</small></div><div class="stat"><strong>'+records+'</strong><small>Recordes</small></div></div>'+
 '<div class="card"><div class="row"><h3>Treinos por semana</h3><span class="pill">12 semanas</span></div><div class="chart gymWeekChart">'+weeks.map(w=>'<div class="barslot" title="'+w.count+' treinos · '+w.minutes+' minutos"><div class="bar" style="height:'+(w.count?Math.max(5,w.count/max*100):1)+'%;opacity:'+(w.count?1:.18)+'"></div><small>'+w.count+'</small></div>').join("")+'</div><small class="muted">Cada coluna representa uma semana, de segunda a domingo.</small></div>'+
 '<div class="card"><div class="row"><h3>Calendário</h3><div class="row"><button class="btn ghost small" id="gymCalPrev" aria-label="Mês anterior">‹</button><span class="muted" style="font-size:12px">'+m.toLocaleDateString("pt-PT",{month:"long",year:"numeric"})+'</span><button class="btn ghost small" id="gymCalNext" aria-label="Mês seguinte">›</button></div></div>'+cells+'<p class="muted" style="font-size:12px">Os dias assinalados correspondem a treinos concluídos.</p></div>'+
 '<div class="card"><div class="row"><h3>Medidas corporais</h3><span class="pill">'+measurements.length+' medições</span></div><select class="input" id="gymMetric">'+gymMetricFields.map(([k,label])=>'<option value="'+k+'" '+(k===gymMeasureMetric?"selected":"")+'>'+label+'</option>').join("")+'</select><div style="margin-top:12px">'+gymPlot(current,gymMetricFields.find(x=>x[0]===gymMeasureMetric)?.[2]||"")+'</div><div class="gymLatest">'+(latest?gymMetricFields.filter(f=>latest[f[0]]!=null).map(f=>'<div><small class="muted">'+esc(f[1])+'</small><strong>'+fmt(latest[f[0]])+' '+f[2]+'</strong></div>').join(""):'<p class="muted">Regista as primeiras medidas para acompanhares a evolução.</p>')+'</div><details><summary>＋ Adicionar medição</summary><form id="measure" class="stack" style="margin-top:14px"><label class="muted">Data<input class="input" type="date" name="recorded_at" value="'+new Date().toLocaleDateString("en-CA")+'" required></label><div class="gymMeasureForm">'+gymMetricFields.map(([k,label,unit])=>'<label class="muted" style="font-size:12px">'+esc(label)+' ('+unit+')<input class="input" name="'+k+'" type="number" min="0" step="0.1" placeholder="—"></label>').join("")+'</div><button class="btn full">Guardar medição</button></form></details>'+(measurements.length?'<details><summary>Ver histórico de medições</summary>'+measurements.slice(0,35).map(x=>'<div class="item row"><div><strong>'+esc(x.recorded_at)+'</strong><div class="muted" style="font-size:12px">'+gymMetricFields.filter(f=>x[f[0]]!=null).map(f=>f[1]+": "+fmt(x[f[0]])+" "+f[2]).join(" · ")+'</div></div><button class="btn ghost small" data-delete-measure="'+x.id+'">Eliminar</button></div>').join("")+'</details>':'')+'</div>'+
 '<div class="card"><div class="row"><h3>Privacidade e conta</h3><span class="pill">EDGY</span></div><p class="muted" style="font-size:13px">As cargas e medidas são privadas. Só o que decidires publicar é visível no Feed.</p><button class="btn ghost full" id="logout">Terminar sessão</button></div>';
}
function gymExercisesMarkup(){
 if(gymSelectedExercise){
  const ex=exercises.find(x=>x.id===gymSelectedExercise);if(!ex){gymSelectedExercise=null;return gymExercisesMarkup()}
  const sets=gymDone().slice().reverse().flatMap(w=>(w.gym_workout_exercises||[]).filter(x=>x.exercise_id===ex.id).flatMap(x=>gymSets({gym_workout_exercises:[x]}).map(s=>({...s,date:w.started_at}))));
  const max=sets.length?Math.max(...sets.map(s=>Number(s.weight))):0;
  const best=sets.length?Math.max(...sets.map(gymOneRM)):0;
  const graph=gymDone().slice().reverse().map(w=>{const chosen=gymSets(w).filter(s=>s.exercise_id===ex.id&&s.weight>0);return chosen.length?{label:new Date(w.started_at).toLocaleDateString("pt-PT",{day:"2-digit",month:"2-digit"}),value:Math.max(...chosen.map(s=>Number(s.weight)))}:null}).filter(Boolean);
  return '<button class="btn ghost small" id="gymBackExercises">‹ Exercícios</button><h1>'+esc(ex.name)+'</h1><p class="muted">'+esc(ex.muscle)+' · '+esc(ex.equipment)+'</p><div class="grid"><div class="stat"><strong>'+fmt(max)+' kg</strong><small>Mais pesado</small></div><div class="stat"><strong>'+fmt(best)+' kg</strong><small>1RM estimado</small></div><div class="stat"><strong>'+sets.length+'</strong><small>Séries</small></div></div><div class="card"><h3>Evolução da carga máxima</h3>'+gymPlot(graph,"kg")+'</div><div class="card"><h3>Histórico de séries</h3>'+(sets.length?sets.slice().reverse().slice(0,35).map(s=>'<div class="item row"><span class="muted">'+date(s.date)+'</span><strong>'+fmt(s.weight)+' kg × '+s.reps+'</strong></div>').join(""):'<p class="muted">Ainda não há séries concluídas deste exercício.</p>')+'</div>';
 }
 const groups=["Todos",...new Set(exercises.map(e=>e.muscle))];
 const list=exercises.filter(e=>(filter==="Todos"||e.muscle===filter)&&e.name.toLowerCase().includes(search.toLowerCase()));
 return '<h1>Exercícios</h1><p class="muted">Biblioteca e recordes individuais.</p><input class="input" id="search" value="'+esc(search)+'" placeholder="Pesquisar exercício…"><div class="filters">'+groups.map(g=>'<button class="btn small '+(filter===g?"":"secondary")+'" data-filter="'+esc(g)+'">'+esc(g)+'</button>').join("")+'</div><button class="btn secondary full" id="new-ex">＋ Criar exercício</button><div class="card">'+(list.length?list.map(e=>'<button class="gymExerciseItem" data-view-ex="'+e.id+'"><strong>'+esc(e.name)+'</strong><small>'+esc(e.muscle)+' · '+esc(e.equipment)+'</small><span>›</span></button>').join(""):'<p class="muted">Nenhum exercício encontrado.</p>')+'</div>';
}
function gymHistoryMarkup(){
 const done=gymDone(),ach=gymPRData().events;
 return '<h1>Histórico</h1><p class="muted">'+done.length+' treinos concluídos. Todos os registos ficam na tua conta.</p>'+(done.length?done.map(w=>{
  const prs=ach.get(w.id)||[]; const award=(typeof gymXPForWorkout==='function'?gymXPForWorkout(w.id):null);
  return '<div class="card"><div class="row"><div><h3>'+esc(w.name)+'</h3><small class="muted">'+date(w.started_at)+'</small></div>'+'<div class="gymHistoryHeaderActions">'+(prs.length?'<span class="pill">🏆 '+prs.length+' PR</span>':'<span class="pill">Concluído</span>')+'<button type="button" class="gymDeleteHistoryBtn" data-delete-workout="'+w.id+'" aria-label="Eliminar treino '+esc(w.name)+' do Histórico">Eliminar</button></div></div><div class="grid" style="margin:13px 0"><div class="stat"><strong>'+duration(w)+'m</strong><small>Duração</small></div><div class="stat"><strong>'+fmt(volume(w))+'</strong><small>Volume kg</small></div><div class="stat"><strong>'+count(w)+'</strong><small>Séries</small></div></div>'+(award?'<div class="gymXPBreakdown"><strong>+'+award.xp_awarded+' XP</strong>'+(award.xp_awarded?'<span class="gymXPPart">Treino +'+award.base_xp+'</span><span class="gymXPPart">Volume +'+award.volume_xp+'</span><span class="gymXPPart">PR +'+award.pr_xp+'</span>':'<span>Este treino não cumpriu os critérios de XP.</span>')+'</div>':'')+'<details><summary>Ver exercício e séries</summary>'+(w.gym_workout_exercises||[]).sort((a,b)=>a.position-b.position).map(we=>'<div class="item"><strong>'+esc(we.gym_exercises?.name)+'</strong><div class="muted" style="font-size:12px">'+(we.gym_sets||[]).sort((a,b)=>a.position-b.position).map(s=>(s.completed?"✓ ":"○ ")+fmt(s.weight)+" kg × "+s.reps+(s.to_failure?" · Falha":"")).join(" · ")+'</div></div>').join("")+'</details>'+(prs.length?'<p class="muted" style="font-size:12px">🏆 '+prs.map(x=>esc(x.name)).join(", ")+'</p>':'')+(gymOwnSocial()?.is_public?(gymFeedPosts.some(p=>p.workout_id===w.id&&p.user_id===user.id)?'<span class="pill">✓ Partilhado</span>':'<button class="btn secondary full" data-share-workout="'+w.id+'">Partilhar no Feed</button>'):'')+'</div>';
 }).join(""):'<div class="card">Ainda não tens treinos concluídos.</div>');
}
function gymOwnSocial(){return gymSocialProfiles.find(p=>p.user_id===user?.id)}
async function gymRefreshSocial(){
 if(!user){gymSocialProfiles=[];gymFollowRows=[];gymFeedPosts=[];gymPostLikes=[];return}
 const requests=await Promise.all([
  db.from("gym_social_profiles").select("user_id,display_name,username,is_public,avatar_path").limit(1000),
  db.from("gym_follows").select("follower_id,followed_id,created_at").limit(1000),
  db.from("gym_feed_posts").select("id,user_id,workout_id,kind,title,body,created_at").order("created_at",{ascending:false}).limit(100),
  db.from("gym_post_likes").select("post_id,user_id,created_at").limit(1000)
 ]);
 for(const r of requests)if(r.error)console.warn("EDGY community:",r.error.message);
 if(!requests[0].error)gymSocialProfiles=requests[0].data||[];
 if(!requests[1].error)gymFollowRows=requests[1].data||[];
 if(!requests[2].error)gymFeedPosts=requests[2].data||[];
 if(!requests[3].error)gymPostLikes=requests[3].data||[];
}
const gymOldLoad=load;
load=async function(){await gymOldLoad();await gymRefreshSocial()};
function gymFeedMarkup(){
 const own=gymOwnSocial(),publicProfile=own?.is_public;
 if(!publicProfile){
  return '<h1>Feed</h1><div class="card hero"><span class="pill">Privado por defeito</span><h2>A tua comunidade de treino</h2><p class="muted">Segue outros atletas, partilha recordes e reage às conquistas. Só serão públicos o nome e @ da EDGY e as publicações que decidires partilhar. Os teus treinos, medidas e cargas continuam privados.</p><button class="btn full" id="gymJoinFeed">Ativar perfil no Feed</button></div>'+(gymFeedPosts.length?'<h2>Publicações da comunidade</h2>'+gymFeedPosts.slice(0,10).map(gymFeedCard).join(""):'');
 }
 const people=gymSocialProfiles.filter(p=>p.user_id!==user.id&&p.is_public&&(p.display_name+" "+p.username).toLowerCase().includes(gymFeedSearch.toLowerCase()));
 const following=new Set(gymFollowRows.filter(f=>f.follower_id===user.id).map(f=>f.followed_id));
 const visible=gymFeedPosts.filter(p=>gymFeedMode==="discover"||p.user_id===user.id||following.has(p.user_id));
 return '<div class="row"><div><h1 style="margin-bottom:3px">Feed</h1><p class="muted">O progresso também se partilha.</p></div></div><div class="grid" style="grid-template-columns:repeat(2,1fr)"><div class="stat"><strong>'+following.size+'</strong><small>A seguir</small></div><div class="stat"><strong>'+gymFollowRows.filter(x=>x.followed_id===user.id).length+'</strong><small>Seguidores</small></div></div><div class="card"><h3>Partilhar uma meta</h3><form id="gymGoalForm" class="stack"><input class="input" name="title" maxlength="110" required placeholder="Ex.: 10 repetições com 40 kg"><input class="input" name="body" maxlength="450" placeholder="Descrição opcional"><button class="btn secondary full">Publicar objetivo</button></form></div><div class="card"><div class="row"><button class="btn small '+(gymFeedMode==="following"?"":"secondary")+'" data-feed-mode="following">A seguir</button><button class="btn small '+(gymFeedMode==="discover"?"":"secondary")+'" data-feed-mode="discover">Descobrir</button></div></div>'+
 (visible.length?visible.map(gymFeedCard).join(""):'<div class="card"><p class="muted">Ainda não há publicações nesta vista. Segue atletas ou partilha o teu próximo treino.</p></div>')+
 '<div class="card"><h3>Encontrar atletas</h3><input class="input" id="gymFindPeople" placeholder="Procurar por nome ou @" value="'+esc(gymFeedSearch)+'">'+(people.length?people.slice(0,25).map(p=>'<div class="row item"><div><strong>'+esc(p.display_name)+'</strong><div class="muted" style="font-size:12px">@'+esc(p.username||"edgy")+'</div></div><button class="btn small '+(following.has(p.user_id)?"secondary":"")+'" data-follow="'+p.user_id+'">'+(following.has(p.user_id)?"A seguir ✓":"Seguir")+'</button></div>').join(""):'<p class="muted">Ainda não há outros perfis públicos correspondentes.</p>')+'</div>';
}
function gymFeedCard(p){
 const author=gymSocialProfiles.find(x=>x.user_id===p.user_id);
 const likes=gymPostLikes.filter(x=>x.post_id===p.id).length;
 const liked=gymPostLikes.some(x=>x.post_id===p.id&&x.user_id===user.id);
 return '<div class="card"><div class="row"><div><strong>'+esc(author?.display_name||"Atleta EDGY")+'</strong><div class="muted" style="font-size:12px">@'+esc(author?.username||"edgy")+' · '+date(p.created_at)+'</div></div><span class="pill">'+({pr:"🏆 PR",workout:"🏋️ Treino",goal:"🎯 Meta",post:"✎ Publicação"}[p.kind]||"Treino")+'</span></div><h3 style="margin-top:14px">'+esc(p.title)+'</h3><p class="muted" style="white-space:pre-wrap">'+esc(p.body)+'</p><div class="row"><button class="btn small '+(liked?"":"secondary")+'" data-like="'+p.id+'">'+(liked?"♥":"♡")+' '+likes+'</button>'+(p.user_id===user.id?'<button class="btn ghost small" data-delete-post="'+p.id+'">Eliminar</button>':"")+'</div></div>';
}
const gymOldRender=render;
render=function(){gymOldRender()};
renderProfile=gymProfileMarkup;
renderExercises=gymExercisesMarkup;
renderHistory=gymHistoryMarkup;
renderFeed=gymFeedMarkup;
document.addEventListener("click",event=>{
 const btn=event.target.closest("button");if(!btn||!user)return;
 if(btn.id==="gymCalPrev"||btn.id==="gymCalNext"){gymCalendarMonth=new Date(gymCalendarMonth.getFullYear(),gymCalendarMonth.getMonth()+(btn.id==="gymCalNext"?1:-1),1);render();return}
 if(btn.dataset.viewEx){gymSelectedExercise=btn.dataset.viewEx;render();window.scrollTo(0,0);return}
 if(btn.id==="gymBackExercises"){gymSelectedExercise=null;render();return}
 if(btn.dataset.deleteMeasure){action(async()=>{if(!confirm("Eliminar esta medição?"))return;const {error}=await db.from("gym_measurements").delete().eq("id",btn.dataset.deleteMeasure);if(error)throw error});return}
 if(btn.id==="gymJoinFeed"){action(async()=>{if(!profile){toast("Configura primeiro o teu perfil na EDGY Games.");return}const {error}=await db.from("gym_social_profiles").upsert({user_id:user.id,display_name:profile.display_name,username:profile.username,is_public:true},{onConflict:"user_id"});if(error)throw error;toast("Perfil público ativado")});return}
 if(btn.id==="gymLeaveFeed"){action(async()=>{if(!confirm("Desativar o perfil público? As tuas publicações deixarão de estar visíveis."))return;const {error}=await db.from("gym_social_profiles").update({is_public:false}).eq("user_id",user.id);if(error)throw error});return}
 if(btn.dataset.feedMode){gymFeedMode=btn.dataset.feedMode;render();return}
 if(btn.dataset.follow){action(async()=>{const id=btn.dataset.follow;const follows=gymFollowRows.some(f=>f.follower_id===user.id&&f.followed_id===id);const q=follows?db.from("gym_follows").delete().eq("follower_id",user.id).eq("followed_id",id):db.from("gym_follows").insert({follower_id:user.id,followed_id:id});const {error}=await q;if(error)throw error});return}
 if(btn.dataset.like){action(async()=>{const id=btn.dataset.like,liked=gymPostLikes.some(l=>l.post_id===id&&l.user_id===user.id);const q=liked?db.from("gym_post_likes").delete().eq("post_id",id).eq("user_id",user.id):db.from("gym_post_likes").insert({post_id:id,user_id:user.id});const {error}=await q;if(error)throw error});return}
 if(btn.dataset.deletePost){action(async()=>{if(!confirm("Eliminar a publicação?"))return;const {error}=await db.from("gym_feed_posts").delete().eq("id",btn.dataset.deletePost);if(error)throw error});return}
 if(btn.dataset.shareWorkout){action(async()=>{const w=gymDone().find(x=>x.id===btn.dataset.shareWorkout);if(!w||!gymOwnSocial()?.is_public){toast("Ativa primeiro o teu perfil público.");return}const prs=gymPRData().events.get(w.id)||[];const title=prs.length?"Novo recorde: "+prs[0].name:"Treino concluído: "+w.name;const body=duration(w)+" min · "+fmt(volume(w))+" kg de volume · "+count(w)+" séries."+(prs.length?" Recordes: "+prs.map(x=>x.name+" "+fmt(x.weight)+" kg × "+x.reps).join("; "):"");if(!confirm("Publicar no Feed?\\n\\n"+title+"\\n"+body))return;const {error}=await db.from("gym_feed_posts").insert({user_id:user.id,workout_id:w.id,kind:prs.length?"pr":"workout",title:title.slice(0,130),body:body.slice(0,500)});if(error)throw error;toast("Partilhado no Feed!")});return}
});
document.addEventListener("change",e=>{if(e.target.id==="gymMetric"){gymMeasureMetric=e.target.value;render()}});
document.addEventListener("input",e=>{if(e.target.id==="gymFindPeople"){gymFeedSearch=e.target.value;const pos=e.target.selectionStart;render();const input=document.querySelector("#gymFindPeople");if(input){input.focus();input.setSelectionRange(pos,pos)}}});

document.addEventListener("submit",event=>{
 if(event.target.id!=="gymGoalForm"||!user)return;
 event.preventDefault();
 const data=new FormData(event.target),goal=String(data.get("title")||"").trim(),desc=String(data.get("body")||"").trim();
 if(!goal)return;
 action(async()=>{
  if(!gymOwnSocial()?.is_public)throw new Error("Ativa primeiro o Feed.");
  const {error}=await db.from("gym_feed_posts").insert({user_id:user.id,kind:"goal",title:("Objetivo: "+goal).slice(0,130),body:desc.slice(0,500)});
  if(error)throw error;
  toast("Meta publicada!");
 });
});
