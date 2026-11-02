/* EDGY Gym Logger - integrated application to prevent cross-script initialization failures. */
(function(){

/* MODULE: app.js */
const URL='https://okzpfhjdckmoawmwmydu.supabase.co',KEY='sb_publishable_hF29Hv9P7Snfj2utKL-XjA_PvE0oK5a';
const db=window.supabase.createClient(URL,KEY), screen=document.querySelector('#screen');
let user=null,profile=null,page='treino',active=null,exercises=[],history=[],measurements=[],search='',filter='Todos';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n||0).toLocaleString('pt-PT',{maximumFractionDigits:1});
const date=s=>new Date(s).toLocaleDateString('pt-PT',{day:'2-digit',month:'short',year:'numeric'});
function toast(msg){const t=document.querySelector('#toast');t.textContent=msg;t.style.display='block';clearTimeout(window._toastTimer);window._toastTimer=setTimeout(()=>t.style.display='none',3200)}
const navIcons={
feed:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1"/>',
historico:'<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v5h5M12 7v5l3 2"/>',
treino:'<path d="M12 4v16M4 12h16"/>',
exercicios:'<path d="M2 9v6M5 6v12M8 8v8M16 8v8M19 6v12M22 9v6M8 12h8"/>',
perfil:'<circle cx="12" cy="8" r="4"/><path d="M4 21c.5-4 3.2-6 8-6s7.5 2 8 6"/>'
};
function nav(){document.querySelector('#nav').innerHTML=Object.entries(navIcons).map(([key,paths])=>{
const svg='<svg class="navIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths+'</svg>';
return '<button type="button" data-page="'+key+'" class="'+(key==='treino'?'navHome ':'')+(page===key?'active':'')+'" '+(page===key?'aria-current="page"':'')+'>'+(key==='treino'?'<span class="navHomeGlyph">'+svg+'</span>':svg)+'<span>'+({feed:'Feed',historico:'Histórico',treino:'Treino',exercicios:'Exercícios',perfil:'Perfil'}[key])+'</span></button>'}).join('');document.querySelectorAll('.gymSideNav [data-page]').forEach(button=>{const selected=button.dataset.page===page;button.classList.toggle('active',selected);if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current')})}
async function load(){if(!user)return;const [e,w,m,p]=await Promise.all([db.from('gym_exercises').select('*').order('name'),db.from('gym_workouts').select('*,gym_workout_exercises(*,gym_exercises(name,muscle),gym_sets(*))').eq('user_id',user.id).order('started_at',{ascending:false}),db.from('gym_measurements').select('*').eq('user_id',user.id).order('recorded_at',{ascending:false}),db.from('profiles').select('display_name,username,avatar_path,bio').eq('id',user.id).maybeSingle()]);if(e.error||w.error||m.error)toast('Erro ao carregar dados: '+(e.error||w.error||m.error).message);exercises=e.data||[];history=w.data||[];measurements=m.data||[];profile=p.data||null;active=history.find(x=>!x.finished_at)||null}
const volume=w=>(w.gym_workout_exercises||[]).flatMap(x=>x.gym_sets||[]).filter(s=>s.completed).reduce((a,s)=>a+Number(s.weight)*s.reps,0);
function previousFor(exerciseId){for(const w of history){if(!w.finished_at)continue;const we=(w.gym_workout_exercises||[]).find(x=>x.exercise_id===exerciseId);if(we){const sets=(we.gym_sets||[]).filter(x=>x.completed&&x.set_type!=='warmup').sort((a,b)=>a.position-b.position);if(sets.length)return sets}}return []}
const count=w=>(w.gym_workout_exercises||[]).flatMap(x=>x.gym_sets||[]).filter(s=>s.completed).length;
const duration=w=>Math.round((new Date(w.finished_at||Date.now())-new Date(w.started_at))/60000);
function render(){nav();document.querySelector('#status').textContent=user?'Conta EDGY':'Sem sessão';if(!user){screen.innerHTML='<section class="card hero"><h1>O teu progresso começa aqui.</h1><p class="muted">Entra com a mesma conta que utilizas na EDGY Games.</p><form id="login" class="stack"><input class="input" name="email" type="email" required placeholder="Email"><input class="input" name="password" type="password" required placeholder="Password"><button class="btn">Entrar com EDGY</button></form><p class="muted">Ainda não tens conta? Cria-a na EDGY Games.</p></section>';return}
screen.innerHTML=({treino:renderWorkout,historico:renderHistory,exercicios:renderExercises,perfil:renderProfile,feed:renderFeed}[page])()}
const workoutCard=w=>'<div class="card"><div class="row"><div><h3>'+esc(w.name)+'</h3><small class="muted">'+date(w.started_at)+'</small></div><span class="pill">'+(w.finished_at?'Concluído':'Em curso')+'</span></div><div class="grid" style="margin:16px 0"><div class="stat"><strong>'+duration(w)+'m</strong><small>Duração</small></div><div class="stat"><strong>'+fmt(volume(w))+'</strong><small>kg volume</small></div><div class="stat"><strong>'+count(w)+'</strong><small>Séries</small></div></div><div class="muted" style="font-size:13px">'+(w.gym_workout_exercises||[]).map(x=>esc(x.gym_exercises?.name)).join(' · ')+'</div></div>';
function renderWorkout(){if(!active)return '<div class="card hero"><span class="pill">Pronto para treinar?</span><h1>Vamos superar o último treino.</h1><p class="muted">Regista séries, consulta as cargas anteriores e acompanha o teu progresso.</p><button class="btn full" id="start">＋ Começar treino</button></div>'+(history.filter(w=>w.finished_at).length?'<h2>Última sessão</h2>'+workoutCard(history.find(w=>w.finished_at)):'');
return '<div class="row"><div><span class="pill">● Em curso</span><h1>'+esc(active.name)+'</h1></div><button class="btn ghost small" id="rename">Renomear</button></div><div class="grid"><div class="stat"><strong>'+duration(active)+'m</strong><small>Duração</small></div><div class="stat"><strong>'+fmt(volume(active))+'</strong><small>Volume</small></div><div class="stat"><strong>'+count(active)+'</strong><small>Séries feitas</small></div></div>'+(active.gym_workout_exercises||[]).sort((a,b)=>a.position-b.position).map(we=>'<div class="card"><div class="row"><h3>'+esc(we.gym_exercises?.name)+'</h3><button class="btn ghost small" data-remove-ex="'+we.id+'">Remover</button></div><div class="sethead muted" style="font-size:11px"><span>Série</span><span>Anterior</span><span>kg</span><span>Reps</span><span>RPE</span><span>✓</span></div>'+(we.gym_sets||[]).sort((a,b)=>a.position-b.position).map((s,i)=>'<div class="setrow"><button class="gymSetType" data-cycle-set="'+s.id+'" title="Alternar série: normal / aquecimento / dropset">'+(s.set_type==='warmup'?'W':s.set_type==='dropset'?'D':(i+1))+'</button><small class="muted" data-previous="'+s.id+'">'+(previousFor(we.exercise_id)[i]?fmt(previousFor(we.exercise_id)[i].weight)+' × '+previousFor(we.exercise_id)[i].reps:'—')+'</small><input class="input" type="number" min="0" step="0.5" data-set="'+s.id+'" data-field="weight" value="'+s.weight+'"><input class="input" type="number" min="0" step="1" data-set="'+s.id+'" data-field="reps" value="'+s.reps+'"><input class="input" type="number" min="1" max="10" step="0.5" placeholder="—" data-set="'+s.id+'" data-field="rpe" value="'+(s.rpe??'')+'"><input class="done" type="checkbox" data-set="'+s.id+'" data-field="completed" '+(s.completed?'checked':'')+'></div>').join('')+'<button class="btn secondary full" data-add-set="'+we.id+'">＋ Adicionar série</button></div>').join('')+'<button class="btn secondary full" id="pick">＋ Adicionar exercício</button><br><br><button class="btn full" id="finish">Terminar treino</button><div id="picker"></div>'}
function renderHistory(){const done=history.filter(w=>w.finished_at);return '<h1>Histórico</h1><p class="muted">As tuas sessões e cargas guardadas.</p>'+(done.length?done.map(w=>workoutCard(w)).join(''):'<div class="card">Ainda não tens treinos concluídos.</div>')}
function renderExercises(){const groups=['Todos',...new Set(exercises.map(e=>e.muscle))];const list=exercises.filter(e=>(filter==='Todos'||e.muscle===filter)&&e.name.toLowerCase().includes(search.toLowerCase()));return '<h1>Exercícios</h1><input class="input" id="search" value="'+esc(search)+'" placeholder="Pesquisar exercício…"><div class="filters">'+groups.map(g=>'<button class="btn small '+(filter===g?'':'secondary')+'" data-filter="'+esc(g)+'">'+esc(g)+'</button>').join('')+'</div><button class="btn secondary full" id="new-ex">＋ Criar exercício</button><div class="card">'+list.map(e=>'<div class="item"><strong>'+esc(e.name)+'</strong><div class="muted" style="font-size:12px">'+esc(e.muscle)+' · '+esc(e.equipment)+'</div></div>').join('')+'</div>'}
function renderProfile(){const done=history.filter(w=>w.finished_at),tot=done.reduce((a,w)=>a+volume(w),0);const weeks=Array.from({length:8},(_,i)=>{const end=Date.now()-(7-i)*604800000,start=end-604800000;return done.filter(w=>+new Date(w.started_at)>=start&&+new Date(w.started_at)<end).length});const max=Math.max(1,...weeks);return '<div class="card hero"><h1>'+esc(profile?.display_name||user.email?.split('@')[0])+'</h1><p class="muted">@'+esc(profile?.username||'edgy')+'</p><p class="muted">'+esc(user.email)+'</p></div><div class="grid"><div class="stat"><strong>'+done.length+'</strong><small>Treinos</small></div><div class="stat"><strong>'+fmt(tot)+'</strong><small>kg volume</small></div><div class="stat"><strong>'+done.reduce((a,w)=>a+duration(w),0)+'</strong><small>Minutos</small></div></div><div class="card"><h3>Treinos por semana</h3><div class="chart">'+weeks.map((v,i)=>'<div class="barslot"><div class="bar" style="height:'+Math.max(3,v/max*100)+'%"></div><small>S'+(i+1)+'</small></div>').join('')+'</div></div><div class="card"><h3>Medidas corporais</h3><form id="measure" class="stack"><input class="input" type="date" name="recorded_at" value="'+new Date().toLocaleDateString('en-CA')+'" required>'+[['body_weight','Peso (kg)'],['waist','Cintura (cm)'],['chest','Peito (cm)'],['shoulders','Ombros (cm)'],['arm','Braço (cm)'],['thigh','Coxa (cm)']].map(([key,label])=>'<label class="muted">'+label+'<input class="input" name="'+key+'" type="number" min="0" step="0.1" placeholder="—"></label>').join('')+'<button class="btn">Guardar medição</button></form>'+measurements.map(m=>'<div class="item"><strong>'+esc(m.recorded_at)+'</strong><div class="muted">'+[['body_weight','Peso','kg'],['waist','Cintura','cm'],['chest','Peito','cm'],['shoulders','Ombros','cm'],['arm','Braço','cm'],['thigh','Coxa','cm']].filter(x=>m[x[0]]!=null).map(x=>x[1]+': '+fmt(m[x[0]])+' '+x[2]).join(' · ')+'</div></div>').join('')+'</div><button class="btn ghost full" id="logout">Terminar sessão</button>'}
function renderFeed(){return '<h1>Feed</h1><p class="muted">A comunidade EDGY Gym.</p><div class="card hero"><h3>Em preparação</h3><p class="muted">Em breve: seguir atletas, publicar PRs e conquistas. Os teus treinos e medidas não serão partilhados automaticamente.</p></div><h2>A tua atividade</h2>'+history.filter(w=>w.finished_at).slice(0,5).map(workoutCard).join('')}
async function action(fn){try{await fn();await load();render()}catch(e){console.error(e);toast(e.message||'Ocorreu um erro')}}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.page){page=b.dataset.page;render();return}if(!user)return;
if(b.id==='start')action(async()=>{const name=prompt('Nome do treino','Treino')?.trim();if(!name)return;const {error}=await db.from('gym_workouts').insert({user_id:user.id,name});if(error)throw error});
if(b.id==='finish')action(async()=>{if(!confirm('Terminar treino?'))return;const {error}=await db.from('gym_workouts').update({finished_at:new Date().toISOString()}).eq('id',active.id);if(error)throw error;page='historico'});
if(b.id==='rename')action(async()=>{const name=prompt('Nome do treino',active.name)?.trim();if(!name)return;const {error}=await db.from('gym_workouts').update({name}).eq('id',active.id);if(error)throw error});
if(b.id==='pick'){const select='<div class="card"><h3>Adicionar exercício</h3><input class="input" id="pick-search" placeholder="Pesquisar…" style="margin-bottom:10px"><div id="pick-list">'+exercises.map(x=>'<button class="btn secondary full" style="margin:4px 0" data-ex-id="'+x.id+'">'+esc(x.name)+'</button>').join('')+'</div></div>';document.querySelector('#picker').innerHTML=select;document.querySelector('#picker').scrollIntoView({behavior:'smooth'})}
if(b.dataset.exId)action(async()=>{const {data:created,error}=await db.from('gym_workout_exercises').insert({workout_id:active.id,exercise_id:b.dataset.exId,position:active.gym_workout_exercises.length}).select('id').single();if(error)throw error;const prev=previousFor(b.dataset.exId)[0];const {error:setError}=await db.from('gym_sets').insert({workout_exercise_id:created.id,position:0,weight:prev?.weight??0,reps:prev?.reps??0});if(setError)throw setError});
if(b.dataset.cycleSet)action(async()=>{const set=active.gym_workout_exercises.flatMap(x=>x.gym_sets||[]).find(s=>s.id===b.dataset.cycleSet);if(!set)return;const types=['working','warmup','dropset'];const next=types[(types.indexOf(set.set_type)+1)%types.length];const {error}=await db.from('gym_sets').update({set_type:next}).eq('id',set.id);if(error)throw error});
if(b.dataset.addSet)action(async()=>{const we=active.gym_workout_exercises.find(x=>x.id===b.dataset.addSet),sets=we.gym_sets||[],last=sets.slice().sort((a,b)=>b.position-a.position)[0];const {error}=await db.from('gym_sets').insert({workout_exercise_id:we.id,position:sets.length,weight:last?.weight??previousFor(we.exercise_id)[0]?.weight??0,reps:last?.reps??previousFor(we.exercise_id)[0]?.reps??0});if(error)throw error});
if(b.dataset.removeEx)action(async()=>{if(!confirm('Remover este exercício e as suas séries?'))return;const {error}=await db.from('gym_workout_exercises').delete().eq('id',b.dataset.removeEx);if(error)throw error});
if(b.id==='new-ex')action(async()=>{const name=prompt('Nome do exercício')?.trim();if(!name)return;const muscle=prompt('Grupo muscular','Outro')?.trim()||'Outro',equipment=prompt('Equipamento','Outro')?.trim()||'Outro';const {error}=await db.from('gym_exercises').insert({user_id:user.id,name,muscle,equipment});if(error)throw error});
if(b.id==='logout')action(async()=>{await db.auth.signOut();user=null;profile=null;render()});
if(b.dataset.filter){filter=b.dataset.filter;render()}});
document.addEventListener('input',e=>{if(e.target.id==='search'){search=e.target.value;const caret=e.target.selectionStart;render();const input=document.querySelector('#search');input.focus();input.setSelectionRange(caret,caret)}if(e.target.id==='pick-search'){const q=e.target.value.toLowerCase();document.querySelectorAll('#pick-list button').forEach(b=>b.style.display=b.textContent.toLowerCase().includes(q)?'block':'none')}});
document.addEventListener('change',e=>{const el=e.target;if(!el.dataset.set)return;const field=el.dataset.field,value=field==='completed'?el.checked:(field==='rpe'&&el.value==='')?null:Number(el.value);action(async()=>{const {error}=await db.from('gym_sets').update({[field]:value}).eq('id',el.dataset.set);if(error)throw error})});
document.addEventListener('submit',e=>{e.preventDefault();if(e.target.id==='login')action(async()=>{const data=new FormData(e.target),{error}=await db.auth.signInWithPassword({email:data.get('email'),password:data.get('password')});if(error)throw error;user=(await db.auth.getUser()).data.user;await load()});if(e.target.id==='measure')action(async()=>{const data=new FormData(e.target),row={user_id:user.id,recorded_at:data.get('recorded_at')};for(const key of ['body_weight','waist','abdomen','chest','shoulders','arm','left_arm','thigh','calf','glutes'])if(data.get(key)!=='')row[key]=Number(data.get(key));const {error}=await db.from('gym_measurements').insert(row);if(error)throw error})});
// Present the application immediately. Authentication must never leave the UI blank.
render();
window.EDGY_GYM_START=async function(){
 try{
  const result=await Promise.race([
   db.auth.getUser(),
   new Promise((_,reject)=>setTimeout(()=>reject(new Error('A ligação à conta demorou demasiado.')),10000))
  ]);
  if(result.error)throw result.error;
  user=result.data?.user||null;
  if(user)await load();
  render();
 }catch(error){
  console.warn('EDGY Gym authentication:',error);
  toast('Não foi possível validar a sessão. Podes iniciar sessão novamente.');
  render();
 }
};



/* MODULE: enhancements.js */
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
 return '<div class="card hero"><div class="row" style="justify-content:flex-start">'+avatar+'<div><h1 style="margin:0">'+esc(profile?.display_name||user.email?.split("@")[0]||"Atleta")+'</h1><span class="muted">@'+esc(profile?.username||"edgy")+'</span><div class="muted" style="font-size:12px">'+esc(user.email||"")+'</div></div></div><p class="muted" style="margin-bottom:0">'+esc(profile?.bio||"O teu progresso, um treino de cada vez.")+'</p></div>'+
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
  const prs=ach.get(w.id)||[];
  return '<div class="card"><div class="row"><div><h3>'+esc(w.name)+'</h3><small class="muted">'+date(w.started_at)+'</small></div>'+(prs.length?'<span class="pill">🏆 '+prs.length+' PR</span>':'<span class="pill">Concluído</span>')+'</div><div class="grid" style="margin:13px 0"><div class="stat"><strong>'+duration(w)+'m</strong><small>Duração</small></div><div class="stat"><strong>'+fmt(volume(w))+'</strong><small>Volume kg</small></div><div class="stat"><strong>'+count(w)+'</strong><small>Séries</small></div></div><details><summary>Ver exercício e séries</summary>'+(w.gym_workout_exercises||[]).sort((a,b)=>a.position-b.position).map(we=>'<div class="item"><strong>'+esc(we.gym_exercises?.name)+'</strong><div class="muted" style="font-size:12px">'+(we.gym_sets||[]).sort((a,b)=>a.position-b.position).map(s=>(s.completed?"✓ ":"○ ")+fmt(s.weight)+" kg × "+s.reps).join(" · ")+'</div></div>').join("")+'</details>'+(prs.length?'<p class="muted" style="font-size:12px">🏆 '+prs.map(x=>esc(x.name)).join(", ")+'</p>':'')+(gymOwnSocial()?.is_public?(gymFeedPosts.some(p=>p.workout_id===w.id&&p.user_id===user.id)?'<span class="pill">✓ Partilhado</span>':'<button class="btn secondary full" data-share-workout="'+w.id+'">Partilhar no Feed</button>'):'')+'</div>';
 }).join(""):'<div class="card">Ainda não tens treinos concluídos.</div>');
}
function gymOwnSocial(){return gymSocialProfiles.find(p=>p.user_id===user?.id)}
async function gymRefreshSocial(){
 if(!user){gymSocialProfiles=[];gymFollowRows=[];gymFeedPosts=[];gymPostLikes=[];return}
 const requests=await Promise.all([
  db.from("gym_social_profiles").select("user_id,display_name,username,is_public").limit(100),
  db.from("gym_follows").select("follower_id,followed_id,created_at").limit(1000),
  db.from("gym_feed_posts").select("id,user_id,workout_id,kind,title,body,created_at").order("created_at",{ascending:false}).limit(100),
  db.from("gym_post_likes").select("post_id,user_id,created_at").limit(1000)
 ]);
 for(const r of requests)if(r.error)console.warn("EDGY community:",r.error.message);
 gymSocialProfiles=requests[0].data||[];gymFollowRows=requests[1].data||[];gymFeedPosts=requests[2].data||[];gymPostLikes=requests[3].data||[];
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
 return '<div class="row"><div><h1 style="margin-bottom:3px">Feed</h1><p class="muted">O progresso também se partilha.</p></div><button class="btn ghost small" id="gymLeaveFeed">Privacidade</button></div><div class="grid" style="grid-template-columns:repeat(2,1fr)"><div class="stat"><strong>'+following.size+'</strong><small>A seguir</small></div><div class="stat"><strong>'+gymFollowRows.filter(x=>x.followed_id===user.id).length+'</strong><small>Seguidores</small></div></div><div class="card"><h3>Partilhar uma meta</h3><form id="gymGoalForm" class="stack"><input class="input" name="title" maxlength="110" required placeholder="Ex.: 10 repetições com 40 kg"><input class="input" name="body" maxlength="450" placeholder="Descrição opcional"><button class="btn secondary full">Publicar objetivo</button></form></div><div class="card"><div class="row"><button class="btn small '+(gymFeedMode==="following"?"":"secondary")+'" data-feed-mode="following">A seguir</button><button class="btn small '+(gymFeedMode==="discover"?"":"secondary")+'" data-feed-mode="discover">Descobrir</button></div></div>'+
 (visible.length?visible.map(gymFeedCard).join(""):'<div class="card"><p class="muted">Ainda não há publicações nesta vista. Segue atletas ou partilha o teu próximo treino.</p></div>')+
 '<div class="card"><h3>Encontrar atletas</h3><input class="input" id="gymFindPeople" placeholder="Procurar por nome ou @" value="'+esc(gymFeedSearch)+'">'+(people.length?people.slice(0,25).map(p=>'<div class="row item"><div><strong>'+esc(p.display_name)+'</strong><div class="muted" style="font-size:12px">@'+esc(p.username||"edgy")+'</div></div><button class="btn small '+(following.has(p.user_id)?"secondary":"")+'" data-follow="'+p.user_id+'">'+(following.has(p.user_id)?"A seguir ✓":"Seguir")+'</button></div>').join(""):'<p class="muted">Ainda não há outros perfis públicos correspondentes.</p>')+'</div>';
}
function gymFeedCard(p){
 const author=gymSocialProfiles.find(x=>x.user_id===p.user_id);
 const likes=gymPostLikes.filter(x=>x.post_id===p.id).length;
 const liked=gymPostLikes.some(x=>x.post_id===p.id&&x.user_id===user.id);
 return '<div class="card"><div class="row"><div><strong>'+esc(author?.display_name||"Atleta EDGY")+'</strong><div class="muted" style="font-size:12px">@'+esc(author?.username||"edgy")+' · '+date(p.created_at)+'</div></div><span class="pill">'+({pr:"🏆 PR",workout:"🏋️ Treino",goal:"🎯 Meta"}[p.kind]||"Treino")+'</span></div><h3 style="margin-top:14px">'+esc(p.title)+'</h3><p class="muted" style="white-space:pre-wrap">'+esc(p.body)+'</p><div class="row"><button class="btn small '+(liked?"":"secondary")+'" data-like="'+p.id+'">'+(liked?"♥":"♡")+' '+likes+'</button>'+(p.user_id===user.id?'<button class="btn ghost small" data-delete-post="'+p.id+'">Eliminar</button>':"")+'</div></div>';
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



/* MODULE: edgy-shell.js */
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
   el.innerHTML=photo?'<img src="'+esc(photo)+'" alt="Fotografia de perfil" loading="lazy">':'<span>'+fallback+'</span>';
   el.title="Ver perfil";
 }else{el.innerHTML="<span>E</span>";el.title="Iniciar sessão para ver o perfil"}
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
 if(target?.id==="gymBrand"){if(!user){toast("Entra com a tua conta EDGY para começar.");return}page="treino";render();window.scrollTo({top:0,behavior:"smooth"});return}
 if(target?.id==="gymHeaderAvatar"){page="perfil";render();window.scrollTo({top:0,behavior:"smooth"});return}
 if(target?.id==="gymBell"){gymOpenNotifications();return}
 if(target?.id==="gymNotifClose"){gymCloseNotifications();return}
 if(event.target.id==="gymNotifBackdrop"){gymCloseNotifications()}
});
document.addEventListener("keydown",event=>{if(event.key==="Escape"&&gymNotificationOpen)gymCloseNotifications()});
db.auth.onAuthStateChange((event)=>{
 if(event==="SIGNED_OUT"){gymCloseNotifications();gymUpdateHeader()}
});
gymUpdateHeader();



/* MODULE: gym-templates.js */
/* Reusable workout templates for EDGY Gym Logger */
"use strict";
let gymTemplates=[],gymTemplateBusy=false;
const baseGymLoad=load;
load=async function(){
 await baseGymLoad();
 if(!user){gymTemplates=[];return}
 const {data,error}=await db.from("gym_templates").select("id,name,user_id,created_at,gym_template_exercises(id,exercise_id,position,target_sets,target_reps,gym_exercises(name))").eq("user_id",user.id).order("created_at",{ascending:false}).limit(60);
 if(error){console.warn("Gym templates:",error.message);gymTemplates=[]}
 else gymTemplates=data||[];
};
function gymTemplateCards(){
 if(!gymTemplates.length)return '<p class="muted">Ainda não tens modelos. Guarda um treino concluído através do Histórico.</p>';
 return gymTemplates.map(t=>'<div class="gymTemplateRow"><div class="gymTemplateInfo"><strong>'+esc(t.name)+'</strong><small>'+((t.gym_template_exercises||[]).length)+' exercícios · '+(t.gym_template_exercises||[]).map(x=>esc(x.gym_exercises?.name||"Exercício")).join(" · ")+'</small></div><button class="btn small" data-use-template="'+t.id+'">Iniciar</button><button class="btn ghost small" data-delete-template="'+t.id+'" aria-label="Eliminar modelo">×</button></div>').join("");
}
const gymTemplateWorkoutBase=renderWorkout;
renderWorkout=function(){
 const content=gymTemplateWorkoutBase();
 if(!user||active)return content;
 return content+'<div class="card"><h3>Modelos de treino</h3><p class="muted" style="font-size:12px">Treina mais rápido com exercícios e séries predefinidos.</p>'+gymTemplateCards()+'</div>';
};
const gymTemplateHistoryBase=renderHistory;
renderHistory=function(){
 const content=gymTemplateHistoryBase(),done=gymDone();
 if(!user||!done.length)return content;
 return content+'<div class="card"><h3>Guardar como modelo</h3><p class="muted" style="font-size:12px">Reutiliza os exercícios de um treino anterior.</p>'+done.slice(0,12).map(w=>'<div class="gymTemplateRow"><div class="gymTemplateInfo"><strong>'+esc(w.name)+'</strong><small>'+date(w.started_at)+'</small></div><button class="btn secondary small" data-save-template="'+w.id+'">Guardar</button></div>').join("")+'</div>';
};
const gymTemplateProfileBase=renderProfile;
renderProfile=function(){
 const content=gymTemplateProfileBase();
 if(!user||!gymTemplates.length)return content;const panel='<div class="card"><h3>Modelos de treino</h3>'+gymTemplateCards()+'</div>';return content.replace('<div class="card"><div class="row"><h3>Privacidade e conta</h3>',panel+'<div class="card"><div class="row"><h3>Privacidade e conta</h3>');
};
async function gymStartTemplate(id){
 if(gymTemplateBusy)return;
 if(active){toast("Termina primeiro o treino em curso.");return}
 const template=gymTemplates.find(x=>x.id===id);if(!template)return;
 const items=(template.gym_template_exercises||[]).slice().sort((a,b)=>a.position-b.position);
 if(!items.length){toast("O modelo não tem exercícios.");return}
 gymTemplateBusy=true;let workoutId=null;
 try{
  const {data:w,error:we}=await db.from("gym_workouts").insert({name:template.name,user_id:user.id}).select("id").single();
  if(we)throw we;workoutId=w.id;
  const {data:created,error:ce}=await db.from("gym_workout_exercises").insert(items.map((x,i)=>({workout_id:w.id,exercise_id:x.exercise_id,position:i}))).select("id,position,exercise_id");
  if(ce)throw ce;
  const rows=[];
  for(const item of created){
   const t=items[item.position],previous=previousFor(item.exercise_id);
   for(let i=0;i<t.target_sets;i++)rows.push({
    workout_exercise_id:item.id,position:i,
    weight:Number(previous[i]?.weight??previous[previous.length-1]?.weight??0),
    reps:Number(previous[i]?.reps??t.target_reps),set_type:"working"
   });
  }
  const {error:se}=await db.from("gym_sets").insert(rows);if(se)throw se;
  await load();page="treino";render();window.scrollTo(0,0);toast("Modelo carregado. Bom treino!");
 }catch(err){
  if(workoutId)await db.from("gym_workouts").delete().eq("id",workoutId);
  await load();render();toast(err.message||"Erro ao iniciar o modelo");
 }finally{gymTemplateBusy=false}
}
async function gymSaveTemplate(id){
 if(gymTemplateBusy)return;
 const workout=gymDone().find(w=>w.id===id);if(!workout)return;
 const name=prompt("Nome do modelo",workout.name)?.trim();
 if(!name)return;
 const items=(workout.gym_workout_exercises||[]).slice().sort((a,b)=>a.position-b.position);
 if(!items.length){toast("Não existem exercícios neste treino.");return}
 gymTemplateBusy=true;let templateId=null;
 try{
  const {data:t,error:te}=await db.from("gym_templates").insert({user_id:user.id,name:name.slice(0,70)}).select("id").single();
  if(te)throw te;templateId=t.id;
  const rows=items.map((x,i)=>{
   const working=(x.gym_sets||[]).filter(s=>s.set_type!=="warmup");
   const completed=working.filter(s=>s.completed);
   const reps=completed.length?completed[completed.length-1].reps:8;
   return {template_id:t.id,exercise_id:x.exercise_id,position:i,target_sets:Math.min(12,Math.max(1,working.length)),target_reps:Math.min(100,Math.max(1,reps||8))};
  });
  const {error:ie}=await db.from("gym_template_exercises").insert(rows);if(ie)throw ie;
  await load();render();toast("Modelo de treino guardado!");
 }catch(err){
  if(templateId)await db.from("gym_templates").delete().eq("id",templateId);
  toast(err.message||"Erro ao guardar o modelo");
 }finally{gymTemplateBusy=false}
}
document.addEventListener("click",event=>{
 const b=event.target.closest("button");if(!b||!user)return;
 if(b.dataset.useTemplate){gymStartTemplate(b.dataset.useTemplate);return}
 if(b.dataset.saveTemplate){gymSaveTemplate(b.dataset.saveTemplate);return}
 if(b.dataset.deleteTemplate){action(async()=>{
   const t=gymTemplates.find(x=>x.id===b.dataset.deleteTemplate);
   if(!t||!confirm('Eliminar "'+t.name+'"?'))return;
   const {error}=await db.from("gym_templates").delete().eq("id",t.id);if(error)throw error;
 });return}
});



/* MODULE: gym-rest.js */
/* Rest timer: local to the athlete, survives page reloads */
"use strict";
const gymRestWorkoutBase=renderWorkout;
renderWorkout=function(){
 const body=gymRestWorkoutBase();
 if(!user||!active)return body;
 const rest='<div class="card gymRestCard"><div class="row"><div><small class="muted">Descanso entre séries</small><div class="gymRestClock" id="gymRestClock">01:30</div></div><select class="input gymRestSelect" id="gymRestPreset" aria-label="Duração do descanso"><option value="45">45 s</option><option value="60">60 s</option><option value="90">90 s</option><option value="120">120 s</option><option value="180">180 s</option></select></div><div class="row" style="margin-top:12px"><button type="button" class="btn small" id="gymRestStart">Iniciar descanso</button><button type="button" class="btn secondary small" id="gymRestStop">Parar</button></div></div>';
 return rest+body;
};
function gymRestKey(type){return "edgy-gym-rest-"+(user?.id||"guest")+"-"+type}
function gymRestPresetSeconds(){return Number(localStorage.getItem(gymRestKey("preset")))||90}
function gymPaintRest(){
 const clock=document.getElementById("gymRestClock");if(!clock)return;
 const preset=gymRestPresetSeconds(),end=Number(localStorage.getItem(gymRestKey("end")))||0;
 const remain=end?Math.max(0,Math.ceil((end-Date.now())/1000)):0;
 const display=remain||preset;
 clock.textContent=String(Math.floor(display/60)).padStart(2,"0")+":"+String(display%60).padStart(2,"0");
 clock.classList.toggle("gymRestRunning",remain>0);
 const select=document.getElementById("gymRestPreset");
 if(select&&select.value!==String(preset))select.value=String(preset);
 if(end&&remain===0){
  localStorage.removeItem(gymRestKey("end"));
  toast("Descanso terminado. Próxima série!");
  if(navigator.vibrate)navigator.vibrate([110,80,110]);
 }
}
const gymRestRenderBase=render;
render=function(){gymRestRenderBase();gymPaintRest()};
setInterval(gymPaintRest,1000);
document.addEventListener("click",event=>{
 const b=event.target.closest("button");if(!b||!user)return;
 if(b.id==="gymRestStart"){
  localStorage.setItem(gymRestKey("end"),String(Date.now()+gymRestPresetSeconds()*1000));
  gymPaintRest();
 }
 if(b.id==="gymRestStop"){localStorage.removeItem(gymRestKey("end"));gymPaintRest()}
});
document.addEventListener("change",event=>{
 if(event.target.id==="gymRestPreset"){
  localStorage.setItem(gymRestKey("preset"),event.target.value);
  gymPaintRest();
 }
});


})();
