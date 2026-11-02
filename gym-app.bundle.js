/* EDGY — Gym Logger · atomic profile save */
(function(){

/* app.js */
const URL='https://okzpfhjdckmoawmwmydu.supabase.co',KEY='sb_publishable_hF29Hv9P7Snfj2utKL-XjA_PvE0oK5a';
const db=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'sb-okzpfhjdckmoawmwmydu-auth-token'}}), screen=document.querySelector('#screen');
let user=null,profile=null,page='treino',active=null,exercises=[],history=[],measurements=[],search='',filter='Todos';
let gymAuthReady=false;
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
async function load(){if(!user)return;const [e,w,m,p]=await Promise.all([db.from('gym_exercises').select('*').order('name'),db.from('gym_workouts').select('*,gym_workout_exercises(*,gym_exercises(name,muscle),gym_sets(*))').eq('user_id',user.id).order('started_at',{ascending:false}),db.from('gym_measurements').select('*').eq('user_id',user.id).order('recorded_at',{ascending:false}),db.from('profiles').select('display_name,username,avatar_path,bio,created_at,xp').eq('id',user.id).maybeSingle()]);if(e.error||w.error||m.error)toast('Erro ao carregar dados: '+(e.error||w.error||m.error).message);exercises=e.data||[];history=w.data||[];measurements=m.data||[];profile=p.data||null;active=history.find(x=>!x.finished_at)||null}
const volume=w=>(w.gym_workout_exercises||[]).flatMap(x=>x.gym_sets||[]).filter(s=>s.completed).reduce((a,s)=>a+Number(s.weight)*s.reps,0);
function previousFor(exerciseId){for(const w of history){if(!w.finished_at)continue;const we=(w.gym_workout_exercises||[]).find(x=>x.exercise_id===exerciseId);if(we){const sets=(we.gym_sets||[]).filter(x=>x.completed&&x.set_type!=='warmup').sort((a,b)=>a.position-b.position);if(sets.length)return sets}}return []}
const count=w=>(w.gym_workout_exercises||[]).flatMap(x=>x.gym_sets||[]).filter(s=>s.completed).length;
const duration=w=>Math.round((new Date(w.finished_at||Date.now())-new Date(w.started_at))/60000);
function render(){
 const authorized=Boolean(gymAuthReady&&user);
 document.body.classList.toggle('gymAuthGate',!authorized);
 if(authorized)nav();
 else document.querySelector('#nav').replaceChildren();
 document.querySelector('#status').textContent=!gymAuthReady?'A confirmar a sessão EDGY':user?'Conta EDGY':'Sem sessão';if(!gymAuthReady){screen.innerHTML='<section class="card hero gymAuthLoading" aria-busy="true"><span class="gymAuthSpinner" aria-hidden="true"></span><h2>A entrar na EDGY…</h2><p class="muted">A recuperar a tua sessão guardada.</p></section>';return}if(!user){screen.innerHTML=gymAuthMarkup();return}
screen.innerHTML=({treino:renderWorkout,historico:renderHistory,exercicios:renderExercises,perfil:renderProfile,feed:renderFeed}[page])()}
const workoutCard=w=>'<div class="card"><div class="row"><div><h3>'+esc(w.name)+'</h3><small class="muted">'+date(w.started_at)+'</small></div><span class="pill">'+(w.finished_at?'Concluído':'Em curso')+'</span></div><div class="grid" style="margin:16px 0"><div class="stat"><strong>'+duration(w)+'m</strong><small>Duração</small></div><div class="stat"><strong>'+fmt(volume(w))+'</strong><small>kg volume</small></div><div class="stat"><strong>'+count(w)+'</strong><small>Séries</small></div></div><div class="muted" style="font-size:13px">'+(w.gym_workout_exercises||[]).map(x=>esc(x.gym_exercises?.name)).join(' · ')+'</div></div>';
function gymSetEditor(we,s,i){
 const prev=previousFor(we.exercise_id)[i],previous=prev?fmt(prev.weight)+' kg × '+prev.reps:'—';
 const kind=s.set_type==='warmup'?'W':s.set_type==='dropset'?'D':String(i+1);
 const stepper=(field,label,increment,unit)=>{
   const value=field==='weight'?s.weight:s.reps;
   return '<div class="gymInputGroup gymGroup'+field+'"><span class="gymSetLabel">'+label+'</span><div class="gymStepper">'+
    '<button type="button" class="gymStepBtn" data-step-set="'+s.id+'" data-step-field="'+field+'" data-step-dir="-1" aria-label="Diminuir '+label+'" title="Diminuir '+increment+'">−</button>'+
    '<input class="gymStepValue" type="number" min="0" step="'+increment+'" inputmode="'+(field==="reps"?"numeric":"decimal")+'" data-set="'+s.id+'" data-field="'+field+'" value="'+value+'" aria-label="'+label+(unit?' em '+unit:'')+'">'+
    '<button type="button" class="gymStepBtn" data-step-set="'+s.id+'" data-step-field="'+field+'" data-step-dir="1" aria-label="Aumentar '+label+'" title="Aumentar '+increment+'">+</button>'+
    '</div></div>';
 };
 return '<div class="gymSetItem" data-set-item="'+s.id+'">'+
   '<div class="gymSetTop"><div class="gymSetIdentity"><button type="button" class="gymSetType gymSetType-'+esc(s.set_type)+'" data-cycle-set="'+s.id+'" title="Alternar tipo de série: normal, aquecimento, dropset" aria-label="Alterar tipo de série">'+kind+'</button><span class="gymSetOrdinal">Série '+(i+1)+'</span><span class="gymPrevLabel">Anterior: <strong>'+previous+'</strong></span></div><span class="gymSetState">'+(s.completed?'Concluída':'Por fazer')+'</span></div>'+
   '<div class="gymSetControls">'+
     stepper('weight','Peso',2.5,'kg')+
     stepper('reps','Reps',1,'')+
     '<label class="gymInputGroup gymGroupRpe"><span class="gymSetLabel">RPE</span><input class="gymRpeValue" type="number" min="1" max="10" step=".5" inputmode="decimal" placeholder="—" data-set="'+s.id+'" data-field="rpe" value="'+(s.rpe??'')+'"></label>'+
     '<label class="gymToggleGroup gymFailureGroup"><span class="gymSetLabel">Falha</span><input type="checkbox" class="gymSetToggleNative" data-set="'+s.id+'" data-field="to_failure" '+(s.to_failure?'checked':'')+'><span class="gymFailureToggle" title="Série realizada até à falha muscular">F</span></label>'+
     '<label class="gymToggleGroup gymDoneGroup"><span class="gymSetLabel">Feita</span><input type="checkbox" class="gymSetToggleNative" data-set="'+s.id+'" data-field="completed" '+(s.completed?'checked':'')+'><span class="gymDoneToggle" aria-label="Série concluída">✓</span></label>'+
   '</div></div>';
}
function renderWorkout(){
 if(!active)return '<div class="card hero gymWorkoutEmpty"><span class="pill">Pronto para treinar?</span><h1>Vamos superar o último treino.</h1><p class="muted">Regista séries, consulta as cargas anteriores e acompanha o teu progresso.</p><button class="btn full" id="start">＋ Começar treino</button></div>'+(history.filter(w=>w.finished_at).length?'<h2>Última sessão</h2>'+workoutCard(history.find(w=>w.finished_at)):'');
 const cards=(active.gym_workout_exercises||[]).slice().sort((a,b)=>a.position-b.position).map(we=>
  '<section class="card gymExerciseWorkoutCard" data-exercise-id="'+we.exercise_id+'" data-workout-exercise="'+we.id+'"><header class="gymExerciseWorkoutHead"><div class="gymExerciseHeading"><span class="gymExerciseAccent"></span><div><h3>'+esc(we.gym_exercises?.name||"Exercício")+'</h3><small>'+((we.gym_sets||[]).length)+' séries</small></div></div><button type="button" class="gymRemoveExercise" data-remove-ex="'+we.id+'" aria-label="Remover exercício '+esc(we.gym_exercises?.name||"")+'">Remover</button></header>'+
  '<div class="gymSetList">'+(we.gym_sets||[]).slice().sort((a,b)=>a.position-b.position).map((s,i)=>gymSetEditor(we,s,i)).join('')+'</div>'+
  '<button type="button" class="gymAddSet" data-add-set="'+we.id+'">＋ Adicionar série</button></section>'
 ).join('');
 return '<div class="gymWorkoutHero"><div class="gymWorkoutHeroTitle"><div><span class="gymWorkoutLive"><i></i> Em curso</span><h1>'+esc(active.name)+'</h1></div><div class="gymWorkoutHeaderActions"><span id="gymSetSaveStatus" class="gymSetSaveStatus" role="status" aria-live="polite">✓ Guardado</span><button class="btn ghost small" id="rename">Renomear</button><button class="gymWorkoutCancelTop" type="button" id="cancelWorkout">Cancelar treino</button></div></div>'+
  '<div class="gymWorkoutStats"><div class="stat"><strong>'+duration(active)+'m</strong><small>Duração</small></div><div class="stat"><strong>'+fmt(volume(active))+' <em>kg</em></strong><small>Volume</small></div><div class="stat"><strong>'+count(active)+'</strong><small>Séries feitas</small></div></div></div>'+
  cards+'<div class="gymWorkoutFooterActions"><button type="button" class="btn secondary full gymAddExerciseButton" id="pick">＋ Adicionar exercício</button><div class="gymWorkoutFinishRow"><button type="button" class="btn full gymFinishWorkoutButton" id="finish">Terminar treino</button><button type="button" class="gymCancelWorkoutButton" id="cancelWorkoutBottom">Cancelar treino</button></div></div><div id="picker"></div>';
}
function renderHistory(){const done=history.filter(w=>w.finished_at);return '<h1>Histórico</h1><p class="muted">As tuas sessões e cargas guardadas.</p>'+(done.length?done.map(w=>workoutCard(w)).join(''):'<div class="card">Ainda não tens treinos concluídos.</div>')}
function renderExercises(){const groups=['Todos',...new Set(exercises.map(e=>e.muscle))];const list=exercises.filter(e=>(filter==='Todos'||e.muscle===filter)&&e.name.toLowerCase().includes(search.toLowerCase()));return '<h1>Exercícios</h1><input class="input" id="search" value="'+esc(search)+'" placeholder="Pesquisar exercício…"><div class="filters">'+groups.map(g=>'<button class="btn small '+(filter===g?'':'secondary')+'" data-filter="'+esc(g)+'">'+esc(g)+'</button>').join('')+'</div><button class="btn secondary full" id="new-ex">＋ Criar exercício</button><div class="card">'+list.map(e=>'<div class="item"><strong>'+esc(e.name)+'</strong><div class="muted" style="font-size:12px">'+esc(e.muscle)+' · '+esc(e.equipment)+'</div></div>').join('')+'</div>'}
function renderProfile(){const done=history.filter(w=>w.finished_at),tot=done.reduce((a,w)=>a+volume(w),0);const weeks=Array.from({length:8},(_,i)=>{const end=Date.now()-(7-i)*604800000,start=end-604800000;return done.filter(w=>+new Date(w.started_at)>=start&&+new Date(w.started_at)<end).length});const max=Math.max(1,...weeks);return '<div class="card hero"><h1>'+esc(profile?.display_name||user.email?.split('@')[0])+'</h1><p class="muted">@'+esc(profile?.username||'edgy')+'</p><p class="muted">'+esc(user.email)+'</p></div><div class="grid"><div class="stat"><strong>'+done.length+'</strong><small>Treinos</small></div><div class="stat"><strong>'+fmt(tot)+'</strong><small>kg volume</small></div><div class="stat"><strong>'+done.reduce((a,w)=>a+duration(w),0)+'</strong><small>Minutos</small></div></div><div class="card"><h3>Treinos por semana</h3><div class="chart">'+weeks.map((v,i)=>'<div class="barslot"><div class="bar" style="height:'+Math.max(3,v/max*100)+'%"></div><small>S'+(i+1)+'</small></div>').join('')+'</div></div><div class="card"><h3>Medidas corporais</h3><form id="measure" class="stack"><input class="input" type="date" name="recorded_at" value="'+new Date().toLocaleDateString('en-CA')+'" required>'+[['body_weight','Peso (kg)'],['waist','Cintura (cm)'],['chest','Peito (cm)'],['shoulders','Ombros (cm)'],['arm','Braço (cm)'],['thigh','Coxa (cm)']].map(([key,label])=>'<label class="muted">'+label+'<input class="input" name="'+key+'" type="number" min="0" step="0.1" placeholder="—"></label>').join('')+'<button class="btn">Guardar medição</button></form>'+measurements.map(m=>'<div class="item"><strong>'+esc(m.recorded_at)+'</strong><div class="muted">'+[['body_weight','Peso','kg'],['waist','Cintura','cm'],['chest','Peito','cm'],['shoulders','Ombros','cm'],['arm','Braço','cm'],['thigh','Coxa','cm']].filter(x=>m[x[0]]!=null).map(x=>x[1]+': '+fmt(m[x[0]])+' '+x[2]).join(' · ')+'</div></div>').join('')+'</div><button class="btn ghost full" id="logout">Terminar sessão</button>'}
function renderFeed(){return '<h1>Feed</h1><p class="muted">A comunidade EDGY Gym.</p><div class="card hero"><h3>Em preparação</h3><p class="muted">Em breve: seguir atletas, publicar PRs e conquistas. Os teus treinos e medidas não serão partilhados automaticamente.</p></div><h2>A tua atividade</h2>'+history.filter(w=>w.finished_at).slice(0,5).map(workoutCard).join('')}
async function action(fn){try{if(typeof gymHasPendingSetEdits==='function'&&gymHasPendingSetEdits())await gymFlushSetWrites();await fn();await load();render()}catch(e){console.error(e);toast(e.message||'Ocorreu um erro')}}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.page){if(!user||!gymAuthReady)return;page=b.dataset.page;render();return}if(!user)return;
if(b.id==='start')gymUXWorkoutDialog();
if(b.id==='finish')action(async()=>{if(!confirm('Terminar treino?'))return;const {error}=await db.from('gym_workouts').update({finished_at:new Date().toISOString()}).eq('id',active.id);if(error)throw error;page='historico'});
if(b.id==='rename')gymUXWorkoutDialog('rename');
if(b.id==='pick')gymUXPickExercise();
if(b.dataset.exId)gymFastAddExercise(b.dataset.exId);
if(b.dataset.cycleSet)gymFastCycleSet(b);
if(b.dataset.addSet)gymFastAddSet(b);
if(b.dataset.removeEx)action(async()=>{if(!confirm('Remover este exercício e as suas séries?'))return;const {error}=await db.from('gym_workout_exercises').delete().eq('id',b.dataset.removeEx);if(error)throw error});
if(b.id==='new-ex')gymUXCreateExercise();
if(b.id==='logout')action(async()=>{await db.auth.signOut();user=null;profile=null;render()});
if(b.dataset.filter){filter=b.dataset.filter;render()}});
document.addEventListener('input',e=>{if(e.target.id==='search'){search=e.target.value;const caret=e.target.selectionStart;render();const input=document.querySelector('#search');input.focus();input.setSelectionRange(caret,caret)}if(e.target.id==='pick-search'){const q=e.target.value.toLowerCase();document.querySelectorAll('#pick-list button').forEach(b=>b.style.display=b.textContent.toLowerCase().includes(q)?'block':'none')}});
document.addEventListener('change',e=>{
 const target=e.target;
 if(target?.dataset?.set)gymHandleSetChange(target,true);
});
document.addEventListener('input',e=>{
 const target=e.target;
 if(target?.dataset?.set)gymHandleSetChange(target,false);
});
document.addEventListener('submit',e=>{e.preventDefault();if(e.target.id==='login')action(async()=>{const data=new FormData(e.target),{error}=await db.auth.signInWithPassword({email:data.get('email'),password:data.get('password')});if(error)throw error;user=(await db.auth.getUser()).data.user;gymAuthReady=true;await load()});if(e.target.id==='measure')action(async()=>{const data=new FormData(e.target),row={user_id:user.id,recorded_at:data.get('recorded_at')};for(const key of ['body_weight','waist','abdomen','chest','shoulders','arm','left_arm','thigh','calf','glutes'])if(data.get(key)!=='')row[key]=Number(data.get(key));const {error}=await db.from('gym_measurements').insert(row);if(error)throw error})});
// Keep the server-rendered loading screen until session validation completes.
document.querySelector('#status').textContent='A verificar a sessão EDGY…';
window.EDGY_GYM_START=async function(){
 // Never display the login screen until saved auth state has been checked completely.
 gymAuthReady=false;
 render();
 try{
  let stored=await db.auth.getSession();
  if(stored.error)throw stored.error;
  const key='sb-okzpfhjdckmoawmwmydu-auth-token';
  // An existing token can be temporarily unavailable while another tab refreshes it.
  if(!stored.data?.session&&localStorage.getItem(key)){
   for(const pause of [400,850,1250]){
    await new Promise(resolve=>setTimeout(resolve,pause));
    stored=await db.auth.getSession();
    if(stored.error)throw stored.error;
    if(stored.data?.session)break;
   }
  }
  if(!stored.data?.session){
   user=null;gymAuthReady=true;render();return;
  }
  let check=await db.auth.getUser();
  if(check.error){
   await new Promise(resolve=>setTimeout(resolve,500));
   check=await db.auth.getUser();
  }
  if(check.error)throw check.error;
  user=check.data?.user||null;
  if(user)await load();
  gymAuthReady=true;
  render();
 }catch(error){
  console.warn('EDGY Gym authentication:',error);
  if(user){gymAuthReady=true;render();toast('Falha temporária na ligação.');return}
  screen.innerHTML='<section class="card hero" role="alert"><h1>Não foi possível confirmar a sessão</h1><p class="muted">Não encerrámos a tua sessão. Verifica a ligação e tenta novamente.</p><button type="button" class="btn" id="gymAuthRetry">Tentar novamente</button></section>';
  document.getElementById('gymAuthRetry')?.addEventListener('click',()=>window.EDGY_GYM_START());
 }
};


/* enhancements.js */
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
  return '<div class="card"><div class="row"><div><h3>'+esc(w.name)+'</h3><small class="muted">'+date(w.started_at)+'</small></div>'+(prs.length?'<span class="pill">🏆 '+prs.length+' PR</span>':'<span class="pill">Concluído</span>')+'</div><div class="grid" style="margin:13px 0"><div class="stat"><strong>'+duration(w)+'m</strong><small>Duração</small></div><div class="stat"><strong>'+fmt(volume(w))+'</strong><small>Volume kg</small></div><div class="stat"><strong>'+count(w)+'</strong><small>Séries</small></div></div>'+(award?'<div class="gymXPBreakdown"><strong>+'+award.xp_awarded+' XP</strong>'+(award.xp_awarded?'<span class="gymXPPart">Treino +'+award.base_xp+'</span><span class="gymXPPart">Volume +'+award.volume_xp+'</span><span class="gymXPPart">PR +'+award.pr_xp+'</span>':'<span>Este treino não cumpriu os critérios de XP.</span>')+'</div>':'')+'<details><summary>Ver exercício e séries</summary>'+(w.gym_workout_exercises||[]).sort((a,b)=>a.position-b.position).map(we=>'<div class="item"><strong>'+esc(we.gym_exercises?.name)+'</strong><div class="muted" style="font-size:12px">'+(we.gym_sets||[]).sort((a,b)=>a.position-b.position).map(s=>(s.completed?"✓ ":"○ ")+fmt(s.weight)+" kg × "+s.reps+(s.to_failure?" · Falha":"")).join(" · ")+'</div></div>').join("")+'</details>'+(prs.length?'<p class="muted" style="font-size:12px">🏆 '+prs.map(x=>esc(x.name)).join(", ")+'</p>':'')+(gymOwnSocial()?.is_public?(gymFeedPosts.some(p=>p.workout_id===w.id&&p.user_id===user.id)?'<span class="pill">✓ Partilhado</span>':'<button class="btn secondary full" data-share-workout="'+w.id+'">Partilhar no Feed</button>'):'')+'</div>';
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


/* edgy-shell.js */
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


/* gym-templates.js */
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


/* gym-rest.js */
/* Rest timer: local to the athlete, survives page reloads */
"use strict";
const gymRestWorkoutBase=renderWorkout;
renderWorkout=function(){
 const body=gymRestWorkoutBase();
 if(!user||!active)return body;
 const rest='<section class="card gymRestCard"><div class="gymRestTop"><div><span class="gymRestEyebrow">RECUPERAÇÃO</span><h3>Descanso entre séries</h3><div class="gymRestClock" id="gymRestClock">01:30</div></div><label class="gymRestSelectGroup"><span>Duração</span><select class="input gymRestSelect" id="gymRestPreset" aria-label="Duração do descanso"><option value="45">45 s</option><option value="60">60 s</option><option value="90">90 s</option><option value="120">120 s</option><option value="180">180 s</option></select></label></div><div class="gymRestTrack" role="progressbar" aria-label="Descanso restante"><span id="gymRestProgress"></span></div><div class="gymRestActions"><button type="button" class="btn small" id="gymRestStart">▶ Iniciar descanso</button><button type="button" class="btn secondary small" id="gymRestStop">Parar</button></div></section>';
 const place=body.indexOf('<section class="card gymExerciseWorkoutCard">');
 const fallback=body.indexOf('<div class="gymWorkoutFooterActions">');
 const at=place>=0?place:(fallback>=0?fallback:0);
 return body.slice(0,at)+rest+body.slice(at);
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
 const bar=document.getElementById("gymRestProgress");
 if(bar)bar.style.width=(end&&remain>0?Math.max(0,Math.min(100,(1-remain/preset)*100)):0)+"%";
 const track=bar?.parentElement;
 if(track)track.setAttribute("aria-valuenow",String(end&&remain>0?Math.round((1-remain/preset)*100):0));
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


/* gym-ux.js */
/* EDGY Gym Logger · profile, feed, modal and exercise UX */
"use strict";
let gymUXModalOpen=false,gymUXPickerSearch="",gymUXPickerMuscle="Todos",gymUXPickerEquipment="Todos";
let gymUXExSearch="",gymUXExMuscle="Todos",gymUXExEquipment="Todos",gymUXExSort="recentes";
const gymUXMuscles=["Todos","Peito","Costas","Ombros","Bíceps","Tríceps","Pernas","Gémeos","Abdómen","Outro"];
const gymUXEquip=["Todos","Halteres","Barra","Smith","Máquina","Cabo","Peso corporal","Barra EZ","Outro"];
const gymUXLabels=arr=>arr.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join("");
function gymUXModalRoot(){return document.getElementById("gymUXModal")}
function gymUXClose(){
 const root=gymUXModalRoot();if(!root)return;
 root.classList.remove("is-open");root.setAttribute("aria-hidden","true");root.innerHTML="";
 gymUXModalOpen=false;document.body.classList.remove("gymDialogLocked");
}
function gymUXShow(title,hint,content,wide=false){
 const root=gymUXModalRoot();if(!root)return;
 root.className="gymUXBackdrop is-open";root.setAttribute("aria-hidden","false");
 root.innerHTML='<section class="gymUXDialog '+(wide?'gymUXWide':'')+'" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><header class="gymUXHead"><div><span class="gymUXEyebrow">EDGY · GYM LOGGER</span><h2>'+esc(title)+'</h2><p>'+esc(hint)+'</p></div><button class="gymUXClose" type="button" data-ux-close aria-label="Fechar">×</button></header><div class="gymUXBody">'+content+'</div></section>';
 gymUXModalOpen=true;document.body.classList.add("gymDialogLocked");
 root.querySelector(title==="Perfil EDGY"?".gymUXClose":"input:not([type=hidden]),textarea,select,button")?.focus({preventScroll:true});
}
function gymUXField(name,label,placeholder,value="",attrs=""){
 return '<label class="gymUXField"><span>'+label+'</span><input class="gymUXInput" name="'+name+'" placeholder="'+esc(placeholder)+'" value="'+esc(value)+'" '+attrs+'></label>';
}
function gymUXActions(main){return '<div class="gymUXActions"><button class="btn secondary" type="button" data-ux-close>Cancelar</button><button class="btn" type="submit">'+esc(main)+'</button></div>'}
function gymUXWorkoutDialog(kind="start"){
 const start=kind==="start",title=start?"Começar treino":"Renomear treino";
 const suggestions=["Push","Pull","Legs","Upper","Lower","Peito","Costas + Bíceps","Ombros"];
 gymUXShow(title,start?"Escolhe um nome para a tua sessão.":"Atualiza o nome deste treino.",
 '<form class="gymUXForm" data-ux-form="workout">'+gymUXField("name","Nome do treino","Ex.: Peito + Ombros",start?"":active?.name||"", 'required maxlength="70" autocomplete="off"')+
 (start?'<div class="gymUXSuggestLabel">Sugestões rápidas</div><div class="gymUXChips">'+suggestions.map(x=>'<button type="button" class="gymUXChip" data-ux-suggestion="'+esc(x)+'">'+esc(x)+'</button>').join("")+'</div>':"")+gymUXActions(start?"Começar treino":"Guardar alterações")+
 '<input type="hidden" name="kind" value="'+kind+'"></form>');
}
function gymUXTemplateModal(id){
 const workout=gymDone().find(w=>w.id===id);if(!workout)return;
 gymUXShow("Guardar modelo","Reutiliza os exercícios e séries deste treino.",
 '<form class="gymUXForm" data-ux-form="template">'+
 gymUXField("name","Nome do modelo","Ex.: Push A",workout.name,'required maxlength="70"')+
 '<input type="hidden" name="workout_id" value="'+esc(id)+'">'+gymUXActions("Guardar modelo")+'</form>');
}
async function gymUXSaveTemplate(form){
 const data=new FormData(form),workout=gymDone().find(w=>w.id===data.get("workout_id"));
 const name=String(data.get("name")||"").trim();if(!workout||!name)return;
 const entries=(workout.gym_workout_exercises||[]).slice().sort((a,b)=>a.position-b.position);
 if(!entries.length){toast("Treino sem exercícios.");return}
 gymUXClose();
 action(async()=>{
  const {data:t,error}=await db.from("gym_templates").insert({user_id:user.id,name:name.slice(0,70)}).select("id").single();
  if(error)throw error;
  try{
   const rows=entries.map((x,i)=>{
    const working=(x.gym_sets||[]).filter(s=>s.set_type!=="warmup");
    const completed=working.filter(s=>s.completed);
    return {template_id:t.id,exercise_id:x.exercise_id,position:i,target_sets:Math.min(12,Math.max(1,working.length)),target_reps:Math.min(100,Math.max(1,completed[completed.length-1]?.reps||8))};
   });
   const {error:e}=await db.from("gym_template_exercises").insert(rows);
   if(e)throw e;
  }catch(e){await db.from("gym_templates").delete().eq("id",t.id);throw e}
  toast("Modelo guardado!");
 });
}
function gymUXCreateExercise(){
 gymUXShow("Criar exercício","Adiciona um exercício personalizado à tua biblioteca.",
 '<form class="gymUXForm" data-ux-form="exercise">'+gymUXField("name","Nome do exercício","Ex.: Incline Dumbbell Press","","required maxlength='95'")+
 '<div class="gymUXTwo"><label class="gymUXField"><span>Grupo muscular</span><select name="muscle" class="gymUXInput">'+gymUXLabels(gymUXMuscles.filter(x=>x!=="Todos"))+'</select></label><label class="gymUXField"><span>Equipamento</span><select name="equipment" class="gymUXInput">'+gymUXLabels(gymUXEquip.filter(x=>x!=="Todos"))+'</select></label></div>'+gymUXActions("Criar exercício")+'</form>');
}
function gymUXFavorites(){try{return new Set(JSON.parse(localStorage.getItem("edgy-gym-favs-"+user.id)||"[]"))}catch{return new Set()}}
function gymUXStoreFav(ids){localStorage.setItem("edgy-gym-favs-"+user.id,JSON.stringify([...ids]))}
function gymUXUsedIds(){
 const used=new Map();
 for(const w of history){for(const x of w.gym_workout_exercises||[]){if(!used.has(x.exercise_id))used.set(x.exercise_id,new Date(w.started_at).getTime())}}
 return used;
}
function gymUXExerciseFilter(items,query,muscle,eq,sort){
 const used=gymUXUsedIds(),favs=gymUXFavorites();
 let result=items.filter(x=>(muscle==="Todos"||x.muscle===muscle)&&(eq==="Todos"||x.equipment===eq)&&(x.name+" "+x.equipment+" "+x.muscle).toLowerCase().includes(query.trim().toLowerCase()));
 if(sort==="favoritos")result=result.filter(x=>favs.has(x.id));
 if(sort==="recentes")result.sort((a,b)=>(used.get(b.id)||0)-(used.get(a.id)||0)||a.name.localeCompare(b.name));
 if(sort==="alfabetico")result.sort((a,b)=>a.name.localeCompare(b.name));
 return result;
}
function gymUXExerciseRow(ex,mode){
 const fav=gymUXFavorites().has(ex.id);
 return '<div class="gymUXExerciseRow"><button type="button" class="gymUXExMain" '+(mode==="pick"?'data-ux-add-ex="'+ex.id+'"':'data-view-ex="'+ex.id+'"')+'><strong>'+esc(ex.name)+'</strong><small>'+esc(ex.muscle)+' <span>·</span> '+esc(ex.equipment)+'</small></button><button type="button" class="gymUXFav '+(fav?"is-fav":"")+'" data-ux-fav="'+ex.id+'" aria-label="'+(fav?"Remover favorito":"Adicionar favorito")+'">'+(fav?"★":"☆")+'</button></div>';
}
function gymUXPickerContent(){
 const rows=gymUXExerciseFilter(exercises,gymUXPickerSearch,gymUXPickerMuscle,gymUXPickerEquipment,"recentes");
 return '<div class="gymUXPickerControls">'+
 '<input class="gymUXInput" id="gymUXPickerSearch" placeholder="Pesquisar 158+ exercícios…" value="'+esc(gymUXPickerSearch)+'" autocomplete="off">'+
 '<div class="gymUXTwo"><select class="gymUXInput" id="gymUXPickerMuscle">'+gymUXLabels(gymUXMuscles)+'</select><select class="gymUXInput" id="gymUXPickerEquipment">'+gymUXLabels(gymUXEquip)+'</select></div></div>'+
 '<div class="gymUXList" id="gymUXPickerList">'+(rows.length?rows.map(x=>gymUXExerciseRow(x,"pick")).join(""):'<p class="muted">Não encontrámos exercícios com esses filtros.</p>')+'</div>';
}
function gymUXPickExercise(){
 gymUXPickerSearch="";gymUXPickerMuscle="Todos";gymUXPickerEquipment="Todos";
 gymUXShow("Adicionar exercício","Escolhe a variante e o equipamento que utilizaste.",gymUXPickerContent(),true);
 gymUXSetSelect("gymUXPickerMuscle",gymUXPickerMuscle);gymUXSetSelect("gymUXPickerEquipment",gymUXPickerEquipment);
}
function gymUXSetSelect(id,value){const x=document.getElementById(id);if(x)x.value=value}
function gymUXRefreshPicker(){
 const list=document.getElementById("gymUXPickerList");if(!list)return;
 list.innerHTML=gymUXExerciseFilter(exercises,gymUXPickerSearch,gymUXPickerMuscle,gymUXPickerEquipment,"recentes").map(x=>gymUXExerciseRow(x,"pick")).join("")||'<p class="muted">Nenhum resultado.</p>';
}
const gymUXPriorExercises=renderExercises;
renderExercises=function(){
 if(gymSelectedExercise)return gymUXPriorExercises();
 const filtered=gymUXExerciseFilter(exercises,gymUXExSearch,gymUXExMuscle,gymUXExEquipment,gymUXExSort);
 const metrics=gymUXUsedIds();
 return '<div class="gymUXTitleRow"><div><h1>Exercícios</h1><p class="muted">'+exercises.length+' exercícios disponíveis · '+metrics.size+' utilizados</p></div><button class="btn small" id="new-ex">＋ Criar</button></div>'+
 '<div class="card gymUXLibrary"><div class="gymUXPickerControls">'+
 '<input id="gymUXExSearch" class="gymUXInput" value="'+esc(gymUXExSearch)+'" placeholder="Pesquisar exercício ou equipamento…">'+
 '<div class="gymUXTwo"><select id="gymUXExMuscle" class="gymUXInput">'+gymUXLabels(gymUXMuscles)+'</select><select id="gymUXExEquipment" class="gymUXInput">'+gymUXLabels(gymUXEquip)+'</select></div>'+
 '<div class="gymUXSort"><button data-ux-sort="recentes" class="'+(gymUXExSort==="recentes"?"is-on":"")+'">Recentes</button><button data-ux-sort="favoritos" class="'+(gymUXExSort==="favoritos"?"is-on":"")+'">Favoritos</button><button data-ux-sort="alfabetico" class="'+(gymUXExSort==="alfabetico"?"is-on":"")+'">A–Z</button></div></div>'+
 '<div class="gymUXList">'+(filtered.length?filtered.map(x=>gymUXExerciseRow(x,"browse")).join(""):'<div class="gymUXEmpty">Nenhum exercício encontrado.</div>')+'</div></div>';
};
function gymUXFindUsers(title,people){
 gymUXShow(title,"Atletas da comunidade EDGY Gym.",
 '<div class="gymUXList">'+(people.length?people.map(p=>'<div class="gymUXPeopleRow">'+(p.user_id?'<button type="button" class="gymUXAthleteLink" data-gym-athlete="'+esc(p.user_id)+'">'+gymCommunityAvatar(p.user_id,p.display_name||"Atleta EDGY")+'<span><strong>'+esc(p.display_name||"Atleta EDGY")+'</strong><small>@'+esc(p.username||"edgy")+'</small></span></button>':'<div><strong>Perfil privado</strong></div>')+'</div>').join(""):'<div class="gymUXEmpty">Ainda não existem atletas nesta lista.</div>')+'</div>',true);
}
function gymUXSocialStats(){
 const followers=gymFollowRows.filter(f=>f.followed_id===user.id).map(f=>gymSocialProfiles.find(p=>p.user_id===f.follower_id)||{display_name:"Atleta EDGY",username:"privado"});
 const following=gymFollowRows.filter(f=>f.follower_id===user.id).map(f=>gymSocialProfiles.find(p=>p.user_id===f.followed_id)).filter(Boolean);
 return {followers,following};
}
const gymUXPriorProfile=renderProfile;
renderProfile=function(){
 let base=gymUXPriorProfile();
 if(!user)return base;
 const own=gymOwnSocial(),social=gymUXSocialStats();
 const controls='<div class="card gymUXProfileActions"><div class="gymUXProfileTop"><div><strong>A tua identidade EDGY</strong><small>As alterações de nome, @, descrição e fotografia também aparecem na EDGY Games.</small></div><button id="gymUXEditProfile" class="btn small">Editar perfil</button></div><div class="gymUXSocialStats"><button id="gymUXFollowers"><strong>'+social.followers.length+'</strong><span>Seguidores</span></button><button id="gymUXFollowing"><strong>'+social.following.length+'</strong><span>A seguir</span></button><div class="gymUXStatLikes"><strong>'+fmt(gymTotalLikesFor(user.id))+'</strong><span>Likes recebidos</span></div><div class="gymUXStatPosts"><strong>'+fmt(gymOwnContentCount())+'</strong><span>Posts e respostas</span></div><div class="gymUXVisibility"><span class="gymUXDot '+(own?.is_public?"public":"")+'"></span>'+(own?.is_public?"Perfil público":"Perfil privado")+'</div></div></div>';
 const marker='<div class="grid gymGrid4">';
 if(base.includes(marker))base=base.replace(marker,controls+marker);else base=controls+base;
 base=base.replace('<details><summary>＋ Adicionar medição</summary>','<details><summary>＋ Adicionar medição</summary><p class="muted" style="font-size:12px">Preenche só o que quiseres. Podes guardar apenas o peso, por exemplo.</p>');
 return base;
};
function gymUXEditProfile(){
 const social=gymOwnSocial();
 gymUXShow("Editar perfil","A tua identidade é partilhada com a EDGY Game Hub.",
 '<form class="gymUXForm" data-ux-form="profile">'+
 '<div class="gymUXPhoto"><div class="gymUXPhotoPreview" id="gymUXPhotoPreview">'+(profile?.avatar_path?'<img src="'+esc(db.storage.from("edgy-avatars").getPublicUrl(profile.avatar_path).data.publicUrl)+'" alt="Fotografia atual">':esc((profile?.display_name||"E").charAt(0)))+'</div><div><strong>Fotografia de perfil</strong><small>JPG, PNG ou WEBP. Podes recortar e ajustar antes de guardar.</small><label class="gymUXUpload">Alterar fotografia<input type="file" id="gymUXPhotoFile" accept="image/png,image/jpeg,image/webp" hidden></label></div></div>'+
 gymUXField("display_name","Nome","O teu nome",profile?.display_name||"", 'required maxlength="22" minlength="1" autocomplete="nickname"')+
 gymUXField("username","Identificador @","O teu identificador",profile?.username||"", 'required minlength="3" maxlength="20" pattern="[a-zA-Z0-9_]+" title="3 a 20 caracteres: letras, números ou _" autocapitalize="none" spellcheck="false"')+
 '<p class="gymUXProfileHint">O @ tem entre 3 e 20 caracteres: letras, números e _ (sem espaços, pontos ou hífenes).</p>'+
 '<label class="gymUXField"><span>Descrição</span><textarea name="bio" class="gymUXInput" rows="3" maxlength="160" placeholder="Sobre ti…">'+esc(profile?.bio||"")+'</textarea></label>'+
 '<label class="gymUXPrivacy"><span><strong>Perfil público no Gym</strong><small>Permite que outros atletas vejam o teu nome, @ e publicações. As medidas e os treinos completos permanecem privados.</small></span><input name="is_public" type="checkbox" '+(social?.is_public?"checked":"")+'></label>'+
 '<p class="gymUXFine">Email: '+esc(user.email||"")+' · Alterar a visibilidade aqui não altera a visibilidade do teu perfil na EDGY Games.</p><p class="gymUXProfileStatus" data-gym-profile-status role="status" aria-live="polite" hidden></p>'+gymUXActions("Guardar perfil")+'</form>',true);
}
const gymUXPriorFeed=renderFeed;
renderFeed=function(){
 const own=gymOwnSocial(),publicProfile=!!own?.is_public;
 const people=gymSocialProfiles.filter(p=>p.user_id!==user.id&&p.is_public&&(p.display_name+" "+p.username).toLowerCase().includes(gymFeedSearch.toLowerCase()));
 const following=new Set(gymFollowRows.filter(f=>f.follower_id===user.id).map(f=>f.followed_id));
 const visible=gymFeedPosts.filter(p=>gymFeedMode==="discover"||p.user_id===user.id||following.has(p.user_id));
 return '<div class="gymUXTitleRow"><div><h1>Feed</h1><p class="muted">Partilha o progresso com a comunidade.</p></div><div class="gymUXFeedHeadActions"><button type="button" class="gymUXNewPost" id="gymUXNewPost" aria-label="Criar publicação">＋ <span>Publicar</span></button><button type="button" class="btn secondary small" id="gymUXFeedPrivacy">Privacidade</button></div></div>'+
 (!publicProfile?'<div class="card gymUXPrivate"><strong>O teu perfil está privado</strong><p class="muted">Podes descobrir publicações. Para publicar e receber seguidores, ativa o perfil público nas definições do Perfil.</p><button class="btn secondary small" id="gymUXEditProfile">Editar privacidade</button></div>':"")+
 '<div class="card gymUXFeedSwitch"><button class="'+(gymFeedMode==="following"?"is-on":"")+'" data-feed-mode="following">A seguir</button><button class="'+(gymFeedMode==="discover"?"is-on":"")+'" data-feed-mode="discover">Descobrir</button></div>'+
 (visible.length?visible.map(gymFeedCard).join(""):'<div class="card gymUXEmpty"><strong>Sem publicações nesta vista</strong><p class="muted">Encontra atletas ou publica a tua primeira conquista.</p></div>')+
 '<div class="card"><h3>Encontrar atletas</h3><input class="gymUXInput" id="gymFindPeople" placeholder="Procurar por nome ou @" value="'+esc(gymFeedSearch)+'">'+(people.length?people.slice(0,30).map(p=>'<div class="gymUXPeopleRow"><button type="button" class="gymUXAthleteLink" data-gym-athlete="'+esc(p.user_id)+'">'+gymCommunityAvatar(p.user_id,p.display_name)+'<span><strong>'+esc(p.display_name)+'</strong><small>@'+esc(p.username||"edgy")+'</small></span></button><button class="btn small '+(following.has(p.user_id)?"secondary":"")+'" data-follow="'+p.user_id+'">'+(following.has(p.user_id)?"A seguir ✓":"Seguir")+'</button></div>').join(""):'<p class="muted">Não há outros perfis públicos correspondentes.</p>')+'</div>';
};
function gymUXPostModal(){
 if(!gymOwnSocial()?.is_public){gymUXEditProfile();toast("Ativa o perfil público para publicares no Feed.");return}
 gymUXShow("Nova publicação","Partilha uma meta ou escreve uma mensagem.",
 '<form class="gymUXForm" data-ux-form="post"><div class="gymUXPostKinds"><label><input type="radio" name="kind" value="post" checked><span>✎ Publicação</span></label><label><input type="radio" name="kind" value="goal"><span>☆ Meta</span></label></div>'+
 '<label class="gymUXField"><span id="gymUXPostLabel">O que queres partilhar?</span><textarea name="text" class="gymUXInput" rows="4" minlength="1" maxlength="500" required placeholder="Escreve uma frase, uma conquista ou novidade…"></textarea></label>'+
 '<label class="gymUXField"><span>Detalhes adicionais (opcional)</span><textarea name="details" class="gymUXInput" rows="2" maxlength="450" placeholder="Mais contexto…"></textarea></label>'+gymUXActions("Publicar no Feed")+'</form>',true);
}
function gymUXAfterSave(){return load().then(()=>{render()})}
let gymUXProfileSaving=false;
async function gymUXProfileSave(form){
 if(gymUXProfileSaving||!user)return;
 const fields=new FormData(form);
 const name=String(fields.get("display_name")||"").trim();
 const username=String(fields.get("username")||"").trim().toLowerCase();
 const bio=String(fields.get("bio")||"").trim();
 const isPublic=fields.get("is_public")==="on";
 const status=form.querySelector("[data-gym-profile-status]");
 const button=form.querySelector('button[type="submit"]');
 const show=(message,error=false)=>{
  if(status){status.hidden=false;status.textContent=message;status.classList.toggle("is-error",error);status.classList.toggle("is-saving",!error)}
  else toast(message);
 };
 if(!name||name.length>22){show("O nome deve ter entre 1 e 22 caracteres.",true);return}
 if(!/^[a-z0-9_]{3,20}$/.test(username)){show("O @ deve ter 3 a 20 caracteres: letras, números ou _. Não são permitidos espaços, pontos ou hífenes.",true);return}
 if(bio.length>160){show("A descrição deve ter no máximo 160 caracteres.",true);return}
 gymUXProfileSaving=true;
 if(button){button.disabled=true;button.textContent="A guardar…"}
 show("A guardar o perfil EDGY…");
 try{
  const {data:saved,error}=await db.rpc("gym_update_my_profile",{
   p_display_name:name,
   p_username:username,
   p_bio:bio,
   p_is_public:isPublic
  });
  if(error)throw error;
  if(!saved?.saved)throw new Error("Não foi possível confirmar a gravação do perfil.");
  profile={...profile,display_name:name,username,bio};
  const own=gymSocialProfiles.find(p=>p.user_id===user.id);
  if(own)Object.assign(own,{display_name:name,username,is_public:isPublic});
  else gymSocialProfiles.push({user_id:user.id,display_name:name,username,is_public:isPublic,avatar_path:profile?.avatar_path||null});
  gymUXClose();
  render();
  toast("Perfil guardado com sucesso!");
  try{await load();render()}catch(refreshError){console.warn("Profile saved but refresh failed:",refreshError)}
 }catch(error){
  console.error("Gym profile update:",error);
  const message=error?.code==="23505"?"Esse identificador @ já está a ser utilizado. Escolhe outro.":
   error?.code==="23514"?"Os dados ultrapassam os limites permitidos pela EDGY.":
   error?.code==="PGRST202"?"Não foi possível aceder à atualização do perfil. Atualiza a aplicação e tenta novamente.":
   error?.message||"Não foi possível guardar. Verifica a ligação e tenta novamente.";
  show(message,true);
 }finally{
  gymUXProfileSaving=false;
  if(button?.isConnected){button.disabled=false;button.textContent="Guardar perfil"}
 }
}
async function gymUXUploadPhoto(file){
 if(!file)return;
 if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>12*1024*1024){toast("Escolhe JPG, PNG ou WEBP até 12 MB.");return}
 try{
  const cropped=typeof window.EDGY_editAvatar==="function"?await window.EDGY_editAvatar(file):file;
  if(!cropped)return;
  const newPath=user.id+"/"+(crypto.randomUUID?.()||String(Date.now()))+".jpg";
  const {error:u}=await db.storage.from("edgy-avatars").upload(newPath,cropped,{contentType:"image/jpeg",upsert:false});if(u)throw u;
  const {error:p}=await db.from("profiles").update({avatar_path:newPath}).eq("id",user.id);
  if(p){await db.storage.from("edgy-avatars").remove([newPath]);throw p}
  const old=profile?.avatar_path;
  await load();render();gymUXEditProfile();toast("Fotografia atualizada!");
  if(old&&old!==newPath&&old.startsWith(user.id+"/"))db.storage.from("edgy-avatars").remove([old]).catch(()=>{});
 }catch(error){console.error(error);toast(error.message||"Não foi possível guardar a fotografia")}
}
async function gymUXAddExercise(id){
 gymPrepareMotion("exercise",id);
 gymUXClose();
 action(async()=>{
  const {data:we,error:e}=await db.from("gym_workout_exercises").insert({workout_id:active.id,exercise_id:id,position:(active.gym_workout_exercises||[]).length}).select("id").single();
  if(e)throw e;
  const previous=previousFor(id)[0];
  const {error:s}=await db.from("gym_sets").insert({workout_exercise_id:we.id,position:0,weight:previous?.weight||0,reps:previous?.reps||0});
  if(s)throw s;
 });
}
document.addEventListener("click",event=>{
 const b=event.target.closest("button");if(!b)return;
 if(b.matches('[data-ux-close]')){event.preventDefault();gymUXClose();return}
 if(!user)return;
 // Capture existing prompt-based actions before the legacy handler can fire.
 if(b.dataset.saveTemplate){event.preventDefault();event.stopImmediatePropagation();gymUXTemplateModal(b.dataset.saveTemplate);return}
 if(["start","rename","new-ex","pick"].includes(b.id)){
  event.preventDefault();event.stopImmediatePropagation();
  if(b.id==="start")gymUXWorkoutDialog();
  if(b.id==="rename")gymUXWorkoutDialog("rename");
  if(b.id==="new-ex")gymUXCreateExercise();
  if(b.id==="pick")gymUXPickExercise();
  return;
 }
 if(b.dataset.uxSuggestion){event.preventDefault();document.querySelector('[data-ux-form="workout"] [name="name"]').value=b.dataset.uxSuggestion;return}
 if(b.dataset.uxFav){event.preventDefault();const favs=gymUXFavorites();favs.has(b.dataset.uxFav)?favs.delete(b.dataset.uxFav):favs.add(b.dataset.uxFav);gymUXStoreFav(favs);if(gymUXModalOpen)gymUXRefreshPicker();if(!gymUXModalOpen)render();return}
 if(b.dataset.uxAddEx){event.preventDefault();gymUXAddExercise(b.dataset.uxAddEx);return}
 if(b.dataset.uxSort){gymUXExSort=b.dataset.uxSort;render();return}
 if(b.id==="gymUXFeedPrivacy"){page="perfil";render();gymUXEditProfile();return}
 if(b.id==="gymUXEditProfile"){gymUXEditProfile();return}
 if(b.id==="gymUXFollowers"){gymUXFindUsers("Seguidores",gymUXSocialStats().followers);return}
 if(b.id==="gymUXFollowing"){gymUXFindUsers("A seguir",gymUXSocialStats().following);return}
 if(b.id==="gymUXNewPost"){gymUXPostModal();return}
},true);
document.addEventListener("submit",event=>{
 const form=event.target;
 if(form.id==="measure"){
  event.preventDefault();event.stopImmediatePropagation();
  if(!user)return;
  const data=new FormData(form),fields=gymMetricFields.map(f=>f[0]),row={user_id:user.id,recorded_at:data.get("recorded_at")};
  let filled=0;
  for(const field of fields){const str=String(data.get(field)||"").trim();if(!str)continue;const val=Number(str);if(!Number.isFinite(val)||val<=0){toast("As medidas têm de ser valores positivos.");return}row[field]=val;filled++}
  if(!filled){toast("Preenche pelo menos uma medida, como o peso.");return}
  action(async()=>{const {error}=await db.from("gym_measurements").insert(row);if(error)throw error;toast("Medição guardada!")});
  return;
 }
 if(!form.matches("[data-ux-form]"))return;
 event.preventDefault();event.stopImmediatePropagation();
 if(!user)return;
 const data=new FormData(form),type=form.dataset.uxForm;
 if(type==="workout"){
  const name=String(data.get("name")||"").trim();if(!name){toast("Escreve o nome do treino.");return}
  const kind=data.get("kind");gymUXClose();
  action(async()=>{const q=kind==="rename"?db.from("gym_workouts").update({name}).eq("id",active.id):db.from("gym_workouts").insert({name,user_id:user.id});const {error}=await q;if(error)throw error});
 }
 if(type==="exercise"){
  const name=String(data.get("name")||"").trim();if(!name)return;
  gymUXClose();action(async()=>{const {error}=await db.from("gym_exercises").insert({user_id:user.id,name,muscle:data.get("muscle"),equipment:data.get("equipment")});if(error)throw error;toast("Exercício criado!")});
 }
 if(type==="profile")gymUXProfileSave(form);
 if(type==="template")gymUXSaveTemplate(form);
 if(type==="post"){
  const kind=data.get("kind"),value=String(data.get("text")||"").trim(),extra=String(data.get("details")||"").trim();
  if(!value)return;
  const title=kind==="goal"?"Objetivo: "+value.slice(0,115):value.slice(0,130);
  const body=kind==="post"?(value+(extra?"\n\n"+extra:"")).slice(0,500):extra.slice(0,500);
  gymUXClose();
  action(async()=>{const {error}=await db.from("gym_feed_posts").insert({user_id:user.id,kind,title,body});if(error)throw error;toast("Publicação criada!")});
 }
},true);
document.addEventListener("change",event=>{
 const x=event.target;
 if(x.id==="gymUXPickerMuscle"){gymUXPickerMuscle=x.value;gymUXRefreshPicker()}
 if(x.id==="gymUXPickerEquipment"){gymUXPickerEquipment=x.value;gymUXRefreshPicker()}
 if(x.id==="gymUXExMuscle"){gymUXExMuscle=x.value;render();gymUXSetSelect("gymUXExMuscle",gymUXExMuscle);gymUXSetSelect("gymUXExEquipment",gymUXExEquipment)}
 if(x.id==="gymUXExEquipment"){gymUXExEquipment=x.value;render();gymUXSetSelect("gymUXExMuscle",gymUXExMuscle);gymUXSetSelect("gymUXExEquipment",gymUXExEquipment)}
 if(x.id==="gymUXPhotoFile")gymUXUploadPhoto(x.files?.[0]);
 if(x.name==="kind"&&x.closest('[data-ux-form="post"]')){
  const label=document.getElementById("gymUXPostLabel");
  if(label)label.textContent=x.value==="goal"?"Qual é a tua meta?":"O que queres partilhar?";
 }
});
document.addEventListener("input",event=>{
 const x=event.target;
 if(x.id==="gymUXPickerSearch"){gymUXPickerSearch=x.value;gymUXRefreshPicker()}
 if(x.id==="gymUXExSearch"){
  gymUXExSearch=x.value;
  const caret=x.selectionStart;render();
  const input=document.getElementById("gymUXExSearch");
  input?.focus();input?.setSelectionRange(caret,caret);
  gymUXSetSelect("gymUXExMuscle",gymUXExMuscle);gymUXSetSelect("gymUXExEquipment",gymUXExEquipment);
 }
});
document.addEventListener("keydown",event=>{
 if(event.key==="Escape"&&gymUXModalOpen){event.preventDefault();gymUXClose()}
});
document.getElementById("gymUXModal")?.addEventListener("click",event=>{if(event.target===event.currentTarget)gymUXClose()});

const gymUXOldRender=render;
render=function(){gymUXOldRender();if(page==="exercicios"&&!gymSelectedExercise){gymUXSetSelect("gymUXExMuscle",gymUXExMuscle);gymUXSetSelect("gymUXExEquipment",gymUXExEquipment)}};


/* gym-community.js */
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


/* gym-confirm.js */
/* EDGY Gym · branded confirmation dialogs */
"use strict";
let gymConfirmCallback=null;
function gymConfirmDialog(title,details,affirmative,fn,danger=false){
 gymConfirmCallback=fn;
 gymUXShow(title,details,'<div class="gymConfirmMark '+(danger?'danger':'')+'">'+(danger?'!':'✓')+'</div><div class="gymUXActions"><button type="button" class="btn secondary" data-ux-close>Cancelar</button><button type="button" class="btn '+(danger?'gymConfirmDanger':'')+'" id="gymConfirmGo">'+esc(affirmative)+'</button></div>');
}
document.addEventListener("click",event=>{
 const b=event.target.closest("button");if(!b||!user)return;
 if(b.id==="gymConfirmGo"){
  event.preventDefault();event.stopImmediatePropagation();
  const callback=gymConfirmCallback;gymConfirmCallback=null;gymUXClose();
  if(callback)callback();
  return;
 }
 const confirmAction=(title,message,button,callback,danger=false)=>{
  event.preventDefault();event.stopImmediatePropagation();
  gymConfirmDialog(title,message,button,callback,danger);
 };
 if((b.id==="cancelWorkout"||b.id==="cancelWorkoutBottom")&&active){
  const workoutId=active.id;
  confirmAction("Cancelar treino","Vais eliminar definitivamente este treino em curso, incluindo os exercícios, as séries e as cargas registadas. Não serão atribuídos XP e o treino não aparecerá no Histórico.","Eliminar treino",()=>{
   action(async()=>{
    const {error}=await db.from("gym_workouts").delete().eq("id",workoutId).eq("user_id",user.id);
    if(error)throw error;
    localStorage.removeItem("edgy-gym-rest-"+user.id+"-end");
    page="treino";
    toast("Treino cancelado.");
   });
  },true);
  return;
 }
 if(b.id==="finish"&&active){
  confirmAction("Terminar treino","Queres concluir esta sessão? As séries e cargas ficam guardadas no Histórico.","Terminar treino",()=>{
   action(async()=>{
    const workoutId=active.id;
    const {error}=await db.from("gym_workouts").update({finished_at:new Date().toISOString()}).eq("id",workoutId);
    if(error)throw error;
    const {data:reward,error:rewardError}=await db.from("gym_xp_awards").select("xp_awarded,base_xp,volume_xp,pr_xp").eq("workout_id",workoutId).maybeSingle();
    if(rewardError)console.warn("EDGY Gym XP:",rewardError.message);
    page="historico";
    toast("Treino concluído!"+(reward?.xp_awarded>0?" +"+reward.xp_awarded+" XP EDGY ✦":reward?" Sem XP nesta sessão.":""));
   });
  });return;
 }
 if(b.dataset.removeEx&&active){
  const id=b.dataset.removeEx;
  confirmAction("Remover exercício","As séries deste exercício serão eliminadas deste treino.","Remover exercício",()=>{
   action(async()=>{
    const {error}=await db.from("gym_workout_exercises").delete().eq("id",id);
    if(error)throw error;
   });
  },true);return;
 }
 if(b.dataset.deleteMeasure){
  const id=b.dataset.deleteMeasure;
  confirmAction("Eliminar medição","Esta medição será eliminada do teu histórico.","Eliminar medição",()=>{
   action(async()=>{
    const {error}=await db.from("gym_measurements").delete().eq("id",id);
    if(error)throw error;
   });
  },true);return;
 }
 if(b.dataset.deletePost){
  const id=b.dataset.deletePost;
  confirmAction("Eliminar publicação","Esta publicação, os gostos e todas as respostas serão eliminados.","Eliminar publicação",()=>{
   action(async()=>{
    const {error}=await db.from("gym_feed_posts").delete().eq("id",id);
    if(error)throw error;
   });
  },true);return;
 }
 if(b.dataset.gymDeleteComment){
  const id=b.dataset.gymDeleteComment;
  confirmAction("Eliminar resposta","Queres remover esta resposta da publicação?","Eliminar resposta",()=>{
   action(async()=>{
    const {error}=await db.from("gym_post_comments").delete().eq("id",id);
    if(error)throw error;
   });
  },true);return;
 }
 if(b.dataset.deleteTemplate){
  const id=b.dataset.deleteTemplate;
  const t=gymTemplates.find(x=>x.id===id);if(!t)return;
  confirmAction("Eliminar modelo","O modelo «"+t.name+"» será eliminado. Os treinos anteriores não serão afetados.","Eliminar modelo",()=>{
   action(async()=>{const {error}=await db.from("gym_templates").delete().eq("id",id);if(error)throw error});
  },true);return;
 }
 if(b.dataset.shareWorkout){
  const workout=gymDone().find(x=>x.id===b.dataset.shareWorkout);
  if(!workout||!gymOwnSocial()?.is_public){toast("Ativa o perfil público para partilhar.");return}
  const prs=gymPRData().events.get(workout.id)||[];
  const title=prs.length?"Novo recorde: "+prs[0].name:"Treino concluído: "+workout.name;
  const body=duration(workout)+" min · "+fmt(volume(workout))+" kg de volume · "+count(workout)+" séries."+(prs.length?" Recordes: "+prs.map(x=>x.name+" "+fmt(x.weight)+" kg × "+x.reps).join("; "):"");
  confirmAction("Partilhar treino",""+title+" · "+body,"Publicar no Feed",()=>{
   action(async()=>{const {error}=await db.from("gym_feed_posts").insert({user_id:user.id,workout_id:workout.id,kind:prs.length?"pr":"workout",title:title.slice(0,130),body:body.slice(0,500)});if(error)throw error;toast("Treino partilhado!")});
  });return;
 }
},true);


/* gym-polish.js */
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
function gymStartNotificationSync(){
 if(!user)return;
 if(gymRealtimeChannel){db.removeChannel?.(gymRealtimeChannel);gymRealtimeChannel=null}
 if(typeof db.channel==="function"){
  try{
   gymRealtimeChannel=db.channel("edgy-gym-alerts-"+user.id);
   for(const table of ["gym_post_likes","gym_post_comments","gym_follows"]){
    gymRealtimeChannel.on("postgres_changes",{event:"*",schema:"public",table},()=>{
     if(gymNoticeRefreshTimer)clearTimeout(gymNoticeRefreshTimer);
     gymNoticeRefreshTimer=setTimeout(gymFetchActivity,350);
    });
   }
   gymRealtimeChannel.subscribe(status=>{
    if(status==="CHANNEL_ERROR"||status==="TIMED_OUT")console.warn("EDGY Gym realtime:",status);
   });
  }catch(err){console.warn("EDGY Gym realtime:",err.message)}
 }
}
const gymPolishBaseStart=window.EDGY_GYM_START;
window.EDGY_GYM_START=async function(){
 await gymPolishBaseStart();
 if(user){await gymFetchActivity();gymStartNotificationSync()}
};
setInterval(()=>{
 if(user&&document.visibilityState!=="hidden")gymFetchActivity();
},45000);
document.addEventListener("visibilitychange",()=>{
 if(user&&document.visibilityState==="visible")gymFetchActivity();
});
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


/* gym-xp.js */
/* EDGY Gym: XP uses the single profile XP balance, awarded only by Supabase triggers. */
"use strict";
let gymXPAwards=[];
function gymXPForWorkout(workoutId){return gymXPAwards.find(a=>a.workout_id===workoutId)||null}
const gymXPOriginalLoad=load;
load=async function(){
 await gymXPOriginalLoad();
 if(!user){gymXPAwards=[];return}
 const {data,error}=await db.from("gym_xp_awards").select("workout_id,awarded_at,qualified,base_xp,volume_xp,pr_xp,xp_awarded,volume_kg,pr_count").order("awarded_at",{ascending:false}).limit(200);
 if(error){console.warn("EDGY Gym XP:",error.message);return}
 gymXPAwards=data||[];
};
const gymXPOriginalProfile=renderProfile;
renderProfile=function(){
 const content=gymXPOriginalProfile();
 if(!user)return content;
 const total=gymXPAwards.reduce((n,a)=>n+Number(a.xp_awarded||0),0);
 const earned=gymXPAwards.filter(a=>a.xp_awarded>0);
 const info='<div class="card gymXPRules"><h3>XP de treino</h3><p class="muted">Já ganhaste <strong>'+fmt(total)+' XP</strong> nos '+earned.length+' treinos recompensados. O XP soma-se ao teu nível EDGY.</p><details><summary>Como são calculados os pontos?</summary><p class="muted">20 XP por sessão válida, 5 XP por cada 1.000 kg de volume (máximo 30), 15 XP por cada novo recorde de carga (máximo 3). Máximo de 100 XP por treino, 120 XP e 2 treinos em 24 horas. As recompensas só se aplicam a treinos concluídos após a ativação deste sistema.</p></details></div>';
 const where='<div class="grid gymGrid4">';
 return content.includes(where)?content.replace(where,info+where):content+info;
};


/* gym-experience.js */
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
  display.classList.remove("gymPageEnter");
  void display.offsetWidth;
  display.classList.add("gymPageEnter");
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


/* gym-trends.js */
/* EDGY Gym charts — weekly summary and 12-week activity trajectory */
"use strict";
function gymMondayOf(input){
 const d=new Date(input.getFullYear(),input.getMonth(),input.getDate());
 d.setDate(d.getDate()-((d.getDay()+6)%7));
 return d;
}
function gymWeekDataset(){
 const today=new Date(),current=gymMondayOf(today);
 return Array.from({length:12},(_,i)=>{
  const start=new Date(current);start.setDate(start.getDate()-(11-i)*7);
  const end=new Date(start);end.setDate(end.getDate()+7);
  const sessions=gymDone().filter(w=>{
   const when=new Date(w.started_at);return when>=start&&when<end;
  });
  return {start,end,count:sessions.length,minutes:sessions.reduce((sum,w)=>sum+duration(w),0)};
 });
}
function gymWeeklyCurvePath(points){
 if(points.length===1)return "M "+points[0].x+" "+points[0].y;
 let path="M "+points[0].x.toFixed(2)+" "+points[0].y.toFixed(2);
 // Catmull-Rom to cubic Beziers, with bounded y coordinates for a controlled smooth curve.
 for(let i=0;i<points.length-1;i++){
  const p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(points.length-1,i+2)];
  let c1x=p1.x+(p2.x-p0.x)/6,c2x=p2.x-(p3.x-p1.x)/6;
  const low=Math.min(p1.y,p2.y),high=Math.max(p1.y,p2.y);
  let c1y=Math.max(low,Math.min(high,p1.y+(p2.y-p0.y)/6));
  let c2y=Math.max(low,Math.min(high,p2.y-(p3.y-p1.y)/6));
  path+=" C "+c1x.toFixed(2)+" "+c1y.toFixed(2)+" "+c2x.toFixed(2)+" "+c2y.toFixed(2)+" "+p2.x.toFixed(2)+" "+p2.y.toFixed(2);
 }
 return path;
}
function gymWeekCard(){
 const weeks=gymWeekDataset(),today=new Date();
 const monday=gymMondayOf(today),tomorrow=new Date(monday);tomorrow.setDate(tomorrow.getDate()+7);
 const days=Array.from({length:7},(_,i)=>{
  const start=new Date(monday);start.setDate(start.getDate()+i);
  const end=new Date(start);end.setDate(end.getDate()+1);
  const sessions=gymDone().filter(w=>new Date(w.started_at)>=start&&new Date(w.started_at)<end);
  return {day:["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"][i],count:sessions.length,minutes:sessions.reduce((n,w)=>n+duration(w),0),today:start.toDateString()===today.toDateString(),future:start>today};
 });
 const total=days.reduce((n,d)=>n+d.count,0),minutes=days.reduce((n,d)=>n+d.minutes,0),peak=Math.max(1,...days.map(d=>d.count));
 const bars=days.map((d,i)=>'<div class="gymCurrentDay '+(d.today?'is-today':'')+' '+(d.future?'is-future':'')+'" style="--bar-order:'+i+'" title="'+d.count+' treinos · '+d.minutes+' minutos"><div class="gymCurrentBarTrack"><span class="gymCurrentBar" style="--bar-height:'+(d.count?Math.max(12,Math.round(d.count/peak*100)):0)+'%"></span></div><b>'+d.day+'</b><small>'+d.count+'</small></div>').join("");
 const grid='<div class="gymCurrentChart" role="img" aria-label="Treinos na semana atual, de segunda a domingo: '+days.map(d=>d.day+' '+d.count).join(', ')+'">'+bars+'</div>';
 const current='<section class="card gymChartCard gymCurrentCard"><div class="gymChartHead"><div><span class="gymChartEyebrow">ESTA SEMANA</span><h3>Treinos da semana atual</h3><p>Segunda a domingo · '+monday.toLocaleDateString("pt-PT",{day:"numeric",month:"short"})+' – '+new Date(tomorrow.getTime()-86400000).toLocaleDateString("pt-PT",{day:"numeric",month:"short"})+'</p></div><div class="gymWeekSummary"><strong>'+total+'</strong><span>'+ (total===1?'treino':'treinos') +' · '+(minutes>=60?fmt(minutes/60)+' h':minutes+' min')+'</span></div></div>'+grid+'</section>';

 const width=720,top=20,bottom=196,left=27,right=699,high=Math.max(1,...weeks.map(w=>w.count));
 const points=weeks.map((w,i)=>({x:left+i*(right-left)/11,y:bottom-(w.count/high)*(bottom-top-18),...w}));
 const line=gymWeeklyCurvePath(points),area=line+' L '+right+' '+bottom+' L '+left+' '+bottom+' Z';
 const guides=[0,.5,1].map(f=>{const y=bottom-(bottom-top-18)*f;return '<line x1="'+left+'" x2="'+right+'" y1="'+y.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="#5e3c61" stroke-width=".8" stroke-dasharray="4 6" opacity=".6"/>';}).join("");
 const dots=points.map((p,i)=>'<g class="gymLineDot" style="--dot-order:'+i+'" tabindex="0"><title>'+p.count+' treinos · '+p.minutes+' minutos · semana de '+p.start.toLocaleDateString("pt-PT",{day:"numeric",month:"short"})+'</title><circle class="gymDotHalo" cx="'+p.x.toFixed(2)+'" cy="'+p.y.toFixed(2)+'" r="8" fill="#f81c8b" opacity="'+(i===11?'.18':'.09')+'"/><circle cx="'+p.x.toFixed(2)+'" cy="'+p.y.toFixed(2)+'" r="'+(i===11?5.2:3.4)+'" fill="'+(i===11?'#ff59ac':'#ffd2eb')+'" stroke="#3d2046" stroke-width="2"/></g>').join("");
 const labels=weeks.map((w,i)=>i%2===0||i===11?'<text x="'+points[i].x.toFixed(2)+'" y="223" text-anchor="middle" fill="#b49cbf" font-size="12">'+w.start.toLocaleDateString("pt-PT",{day:"2-digit",month:"short"})+'</text>':'').join("");
 const chart='<svg class="gymTrendSVG" viewBox="0 0 720 236" role="img" aria-label="Evolução de treinos concluídos por semana, últimas doze semanas"><defs><linearGradient id="gym-week-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#f20a87" stop-opacity=".76"/><stop offset="80%" stop-color="#aa277f" stop-opacity=".26"/><stop offset="100%" stop-color="#7b2a77" stop-opacity=".04"/></linearGradient><linearGradient id="gym-week-line" x1="0" x2="1"><stop offset="0%" stop-color="#b7309c"/><stop offset="100%" stop-color="#ff4fa3"/></linearGradient></defs>'+guides+'<path d="'+area+'" fill="url(#gym-week-area)" class="gymTrendArea"/><path d="'+line+'" class="gymTrendLine" stroke="url(#gym-week-line)" stroke-width="4" stroke-linecap="round" fill="none"/>'+dots+labels+'</svg>';
 const average=weeks.reduce((n,w)=>n+w.count,0)/12;
 const trend='<section class="card gymChartCard gymTrendCard"><div class="gymChartHead"><div><span class="gymChartEyebrow">EVOLUÇÃO</span><h3>Treinos por semana</h3><p>Últimas 12 semanas · cada ponto é uma semana</p></div><div class="gymTrendAverage"><strong>'+fmt(average)+'</strong><span>média / semana</span></div></div><div class="gymTrendCanvas">'+chart+'</div><div class="gymTrendLegend"><i></i> Treinos concluídos <span>·</span> '+weeks.reduce((n,w)=>n+w.count,0)+' treinos no período</div></section>';
 return current+trend;
}
const gymGraphsBaseProfileRender=renderProfile;
renderProfile=function(){
 const html=gymGraphsBaseProfileRender();
 const begin='<div class="card"><div class="row"><h3>Treinos por semana</h3>';
 const i=html.indexOf(begin);
 if(i<0)return html;
 const endMarker='Cada coluna representa uma semana, de segunda a domingo.</small></div>';
 const j=html.indexOf(endMarker,i);
 if(j<0)return html;
 return html.slice(0,i)+gymWeekCard()+html.slice(j+endMarker.length);
};


/* gym-performance.js */
/* EDGY Gym · lightweight set editor. Never refetch the app for a set edit. */
"use strict";
const gymSetSaveQueue=new Map();
const gymPendingAdds=new Set();
let gymSetLastFailure=null;
function gymFindSet(id){
 for(const we of active?.gym_workout_exercises||[]){
  const found=(we.gym_sets||[]).find(s=>s.id===id);
  if(found)return {record:found,exercise:we};
 }
 return null;
}
function gymSetSaveLabel(state){
 const el=document.getElementById("gymSetSaveStatus");
 if(!el)return;
 const states={saving:"A guardar…",saved:"✓ Guardado",error:"Falha ao guardar · tentar novamente"};
 el.textContent=states[state]||states.saved;
 el.dataset.saveState=state;
 el.setAttribute("role",state==="error"?"button":"status");
 if(state==="error")el.setAttribute("tabindex","0");
 else el.removeAttribute("tabindex");
}
function gymHasPendingSetEdits(){
 return [...gymSetSaveQueue.values()].some(q=>q.writing||Object.keys(q.pending).length>0);
}
function gymPaintSaveStatus(){
 if(gymSetLastFailure){gymSetSaveLabel("error");return}
 gymSetSaveLabel(gymHasPendingSetEdits()?"saving":"saved");
}
function gymScheduleSetSave(id,patch,delay=620){
 let q=gymSetSaveQueue.get(id);
 if(!q){q={pending:{},writing:null,timer:null,retries:0};gymSetSaveQueue.set(id,q)}
 Object.assign(q.pending,patch);
 gymSetLastFailure=null;
 if(q.timer)clearTimeout(q.timer);
 q.timer=setTimeout(()=>{q.timer=null;gymPersistSet(id).catch(()=>{})},delay);
 gymPaintSaveStatus();
}
async function gymPersistSet(id){
 const q=gymSetSaveQueue.get(id);
 if(!q)return;
 if(q.timer){clearTimeout(q.timer);q.timer=null}
 if(q.writing){await q.writing; if(Object.keys(q.pending).length)return gymPersistSet(id);return}
 q.writing=(async()=>{
  while(Object.keys(q.pending).length){
   const patch=q.pending;
   q.pending={};
   try{
    const {error}=await db.from("gym_sets").update(patch).eq("id",id);
    if(error)throw error;
    q.retries=0;
    gymSetLastFailure=null;
   }catch(err){
    q.pending={...patch,...q.pending};
    gymSetLastFailure=err;
    q.retries+=1;
    console.warn("EDGY Gym set save:",err);
    throw err;
   }
  }
 })();
 try{await q.writing}
 catch(err){
  if(q.retries<=2&&!q.timer){
   q.timer=setTimeout(()=>{q.timer=null;gymPersistSet(id).catch(()=>{})},1500*q.retries);
  }
  throw err;
 }finally{
  q.writing=null;
  if(!Object.keys(q.pending).length&&!q.timer)gymSetSaveQueue.delete(id);
  gymPaintSaveStatus();
 }
}
async function gymFlushSetWrites(){
 for(let attempt=0;attempt<2;attempt++){
  for(const q of gymSetSaveQueue.values())if(q.timer){clearTimeout(q.timer);q.timer=null}
  const ids=[...gymSetSaveQueue.keys()];
  const results=await Promise.allSettled(ids.map(id=>gymPersistSet(id)));
  if(results.every(r=>r.status==="fulfilled")&&!gymHasPendingSetEdits()){
   gymSetLastFailure=null;gymPaintSaveStatus();return;
  }
 }
 gymSetSaveLabel("error");
 throw gymSetLastFailure||new Error("Não foi possível guardar todas as séries. Verifica a ligação antes de terminares o treino.");
}
function gymUpdateWorkoutNumbers(){
 if(!active||page!=="treino")return;
 const nodes=document.querySelectorAll(".gymWorkoutStats .stat strong");
 if(nodes.length<3)return;
 nodes[1].innerHTML=fmt(volume(active))+" <em>kg</em>";
 nodes[2].textContent=String(count(active));
}
function gymSetItemUpdate(id,patch){
 const item=document.querySelector('[data-set-item="'+id+'"]');
 if(!item)return;
 const record=gymFindSet(id)?.record;
 if("completed" in patch){
  const state=item.querySelector(".gymSetState");
  if(state)state.textContent=patch.completed?"Concluída":"Por fazer";
  gymUpdateWorkoutNumbers();
 }
 if("rpe" in patch){
  const input=item.querySelector('[data-field="rpe"]');
  if(input&&document.activeElement!==input)input.value=patch.rpe??"";
 }
 if("to_failure" in patch||"completed" in patch){
  item.classList.remove("gymSetQuickFeedback");
  item.classList.add("gymSetQuickFeedback");
  setTimeout(()=>item.classList.remove("gymSetQuickFeedback"),390);
 }
 if(record&&("weight" in patch||"reps" in patch)&&record.completed)gymUpdateWorkoutNumbers();
}
function gymHandleSetChange(el,commit=false){
 if(!user||!active)return;
 const id=el.dataset.set,field=el.dataset.field,match=gymFindSet(id);
 if(!match||!["weight","reps","rpe","completed","to_failure"].includes(field))return;
 const record=match.record;
 let value;
 if(field==="completed"||field==="to_failure"){
  if(!commit)return;
  value=Boolean(el.checked);
 }else{
  const raw=String(el.value).trim().replace(",",".");
  if(raw===""){
   if(!commit)return;
   value=field==="rpe"?null:0;
   el.value=value===null?"":"0";
  }else{
   value=Number(raw);
   if(!Number.isFinite(value)||value<0||(field==="reps"&&!Number.isInteger(value))||(field==="rpe"&&(value<1||value>10))){
    if(commit){toast("Introduz um valor válido.");el.value=record[field]??""}
    return;
   }
  }
 }
 if(Object.is(record[field],value))return;
 const patch={[field]:value};
 if(field==="to_failure"&&value&&record.rpe==null)patch.rpe=10;
 Object.assign(record,patch);
 gymSetItemUpdate(id,patch);
 gymScheduleSetSave(id,patch,commit?130:700);
}
function gymFastStepper(btn){
 if(!user||!active)return;
 const id=btn.dataset.stepSet,field=btn.dataset.stepField;
 if(!["weight","reps"].includes(field))return;
 const match=gymFindSet(id);if(!match)return;
 const step=field==="weight"?2.5:1;
 const dir=Number(btn.dataset.stepDir)||1;
 const el=document.querySelector('input[data-set="'+id+'"][data-field="'+field+'"]');
 if(!el)return;
 const current=Number(String(el.value).replace(",","."))||0;
 const next=Math.max(0,Math.round((current+step*dir)*100)/100);
 el.value=String(next);
 el.classList.add("gymStepUpdated");
 setTimeout(()=>el.classList.remove("gymStepUpdated"),260);
 gymHandleSetChange(el,true);
}
function gymFastCycleSet(btn){
 const id=btn.dataset.cycleSet,match=gymFindSet(id);
 if(!match||!user)return;
 const record=match.record,types=["working","warmup","dropset"];
 const next=types[(types.indexOf(record.set_type)+1)%types.length];
 record.set_type=next;
 const item=btn.closest(".gymSetItem");
 const index=match.exercise.gym_sets.slice().sort((a,b)=>a.position-b.position).indexOf(record);
 btn.textContent=next==="warmup"?"W":next==="dropset"?"D":String(index+1);
 btn.classList.remove("gymSetType-working","gymSetType-warmup","gymSetType-dropset");
 btn.classList.add("gymSetType-"+next,"gymTypePressed");
 setTimeout(()=>btn.classList.remove("gymTypePressed"),340);
 if(item)item.dataset.setType=next;
 gymScheduleSetSave(id,{set_type:next},170);
}
async function gymFastAddSet(btn){
 if(!user||!active)return;
 const id=btn.dataset.addSet,exercise=active.gym_workout_exercises.find(we=>we.id===id);
 if(!exercise||gymPendingAdds.has(id))return;
 gymPendingAdds.add(id);
 btn.disabled=true;
 const label=btn.textContent;btn.textContent="A adicionar…";
 try{
  await gymFlushSetWrites();
  const sets=(exercise.gym_sets||[]).slice().sort((a,b)=>a.position-b.position);
  const last=sets[sets.length-1],previous=previousFor(exercise.exercise_id)[0];
  const payload={workout_exercise_id:id,position:sets.length,weight:last?.weight??previous?.weight??0,reps:last?.reps??previous?.reps??0};
  const {data:created,error}=await db.from("gym_sets").insert(payload).select("*").single();
  if(error)throw error;
  exercise.gym_sets.push(created);
  const list=btn.closest(".gymExerciseWorkoutCard")?.querySelector(".gymSetList");
  if(list){
   list.insertAdjacentHTML("beforeend",gymSetEditor(exercise,created,sets.length));
   const row=list.lastElementChild;
   row?.classList.add("gymJustChanged");
   row?.scrollIntoView?.({behavior:"smooth",block:"nearest"});
  }else render();
  // Partial DOM insert already animated the new row; do not replay it on a later page render.
  gymMotionNext=null;
  const labelCount=btn.closest(".gymExerciseWorkoutCard")?.querySelector(".gymExerciseHeading small");
  if(labelCount)labelCount.textContent=exercise.gym_sets.length+" séries";
 }catch(err){console.error(err);toast(err.message||"Não foi possível adicionar a série")}
 finally{gymPendingAdds.delete(id);btn.disabled=false;btn.textContent=label}
}
async function gymFastAddExercise(id){
 if(!user||!active||gymPendingAdds.has("exercise:"+id))return;
 gymPendingAdds.add("exercise:"+id);
 const workoutId=active.id;
 gymUXClose();
 try{
  await gymFlushSetWrites();
  const position=(active.gym_workout_exercises||[]).length;
  const {data:created,error}=await db.from("gym_workout_exercises").insert({workout_id:workoutId,exercise_id:id,position}).select("*").single();
  if(error)throw error;
  const prev=previousFor(id)[0];
  const {data:set,error:setError}=await db.from("gym_sets").insert({workout_exercise_id:created.id,position:0,weight:prev?.weight??0,reps:prev?.reps??0}).select("*").single();
  if(setError)throw setError;
  const exercise=exercises.find(e=>e.id===id);
  active.gym_workout_exercises.push({...created,gym_exercises:{name:exercise?.name||"Exercício",muscle:exercise?.muscle},gym_sets:[set]});
  gymPrepareMotion("exercise",id);
  render();
 }catch(err){
  console.error(err);
  toast(err.message||"Não foi possível adicionar o exercício");
  // Reconcile a possible partial insert without refetching the other app data.
  const {data,error}=await db.from("gym_workouts").select("*,gym_workout_exercises(*,gym_exercises(name,muscle),gym_sets(*))").eq("id",workoutId).maybeSingle();
  if(!error&&data&&active?.id===workoutId){active=data;history=history.map(w=>w.id===workoutId?data:w);render()}
 }finally{gymPendingAdds.delete("exercise:"+id)}
}
// Override only the hot-path exercise picker operation, preserving the rest of the app.
gymUXAddExercise=gymFastAddExercise;
document.addEventListener("click",event=>{
 const btn=event.target.closest("button");
 if(btn?.id==="gymSetSaveStatus"&&gymSetLastFailure)gymFlushSetWrites().catch(()=>toast("Sem ligação: as alterações continuam pendentes."));
});
document.addEventListener("visibilitychange",()=>{
 if(document.visibilityState==="hidden"&&gymHasPendingSetEdits())gymFlushSetWrites().catch(()=>{});
});


/* gym-live-community.js */
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
  // Logging sets must stay fast: only sync inbox data when the social UI is not visible.
  if(page!=="perfil"&&page!=="feed"&&!gymPublicProfileId){
   await gymFetchActivity();
   if(user?.id===id)gymUpdateHeader();
   return;
  }
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


/* gym-auth.js */
/* EDGY Gym — direct account creation on the shared identity */
"use strict";
let gymEntryMode="login",gymEntryBusy=false,gymPendingEmail="",gymEntryNotice="";
const gymSignupReturn="https://bpsbeast.github.io/edgy-gym-logger/";
function gymAuthMarkup(){
 const register=gymEntryMode==="register",verify=gymEntryMode==="verify";
 if(verify)return '<section class="gymAccess"><div class="gymAccessCard"><span class="gymAuthOverline">CONTA EDGY</span><h1>Confirma o teu email</h1><p class="muted">Enviámos instruções para <strong>'+esc(gymPendingEmail)+'</strong>. Confirma a conta através do email e regressa à Gym Logger para iniciar sessão.</p><p class="gymAuthHint">O mesmo login funciona nas duas aplicações EDGY.</p><p class="gymAuthMessage" role="status">'+esc(gymEntryNotice)+'</p><button type="button" class="btn full" data-gym-entry="login">Iniciar sessão</button><button type="button" class="gymEntryLink" id="gymResendConfirmation">Reenviar confirmação</button></div></section>';
 return '<section class="gymAccess"><div class="gymAccessCard"><span class="gymAuthOverline">EDGY · GYM LOGGER</span><h1>'+(register?'Criar conta':'Bem-vindo à EDGY')+'</h1><p class="muted">'+(register?'Começa a registar os teus treinos e evolui com a EDGY.':'Acompanha os teus treinos com a tua conta EDGY.')+'</p><div class="gymEntryTabs"><button type="button" data-gym-entry="login" class="'+(!register?'active':'')+'">Entrar</button><button type="button" data-gym-entry="register" class="'+(register?'active':'')+'">Criar conta</button></div><form id="'+(register?'gymRegister':'gymLogin')+'" class="gymAccessForm">'+(register?'<label>Nome</label><input class="input" name="nickname" maxlength="22" required autocomplete="nickname" placeholder="Como te devemos chamar?">':'')+'<label>Email</label><input class="input" type="email" name="email" required autocomplete="email" placeholder="teu@email.com"><label>Palavra-passe</label><input class="input" name="password" type="password" required minlength="'+(register?'8':'1')+'" autocomplete="'+(register?'new-password':'current-password')+'" placeholder="'+(register?'Mínimo 8 caracteres':'A tua palavra-passe')+'">'+(register?'<label>Confirmar palavra-passe</label><input class="input" type="password" name="confirm" autocomplete="new-password" minlength="8" required placeholder="Repete a palavra-passe"><small class="gymAuthHint">Usa letras e números, com 8 ou mais caracteres. Podes editar o teu @ no Perfil.</small>':'')+'<p class="gymAuthMessage" role="status">'+esc(gymEntryNotice)+'</p><button class="btn full" type="submit">'+(register?'Criar conta':'Entrar')+'</button></form><p class="gymAuthHint">Uma conta EDGY para a Gym Logger e a Game Hub. Manténs o mesmo perfil e XP.</p></div></section>';
}
function gymSwitchEntry(mode){
 if(user||!gymAuthReady)return;
 gymEntryMode=mode;gymEntryNotice="";screen.innerHTML=gymAuthMarkup();
}
function gymEntryError(message){
 gymEntryNotice=String(message||"Não foi possível continuar.");
 const el=screen.querySelector(".gymAuthMessage");
 if(el)el.textContent=gymEntryNotice;
}
async function gymAcceptIdentity(authResult){
 if(!authResult?.data?.session||!authResult?.data?.user)return false;
 user=authResult.data.user;gymAuthReady=true;gymEntryNotice="";
 await load();page="treino";render();
 return true;
}
document.addEventListener("click",async event=>{
 const btn=event.target.closest?.("[data-gym-entry],#gymResendConfirmation");
 if(!btn||user)return;
 if(btn.dataset.gymEntry){event.preventDefault();gymSwitchEntry(btn.dataset.gymEntry);return}
 if(btn.id==="gymResendConfirmation"&&gymPendingEmail&&!gymEntryBusy){
  event.preventDefault();gymEntryBusy=true;btn.disabled=true;
  try{
   const result=await db.auth.resend({type:"signup",email:gymPendingEmail,options:{emailRedirectTo:gymSignupReturn}});
   if(result.error)throw result.error;
   gymEntryError("Se a confirmação estiver pendente, receberás outro email.");
  }catch(err){gymEntryError(err.message)}
  finally{gymEntryBusy=false;btn.disabled=false}
 }
});
document.addEventListener("submit",async event=>{
 const form=event.target;
 if(!form||!["gymLogin","gymRegister"].includes(form.id)||gymEntryBusy||user)return;
 event.preventDefault();event.stopImmediatePropagation();
 gymEntryBusy=true;
 const button=form.querySelector('button[type="submit"]');
 if(button){button.disabled=true;button.textContent="A verificar…"}
 try{
  const fields=new FormData(form);
  const email=String(fields.get("email")||"").trim().toLowerCase();
  const password=String(fields.get("password")||"");
  if(form.id==="gymRegister"){
   const name=String(fields.get("nickname")||"").trim();
   if(!name||name.length>22)throw Error("O nome deve ter entre 1 e 22 caracteres.");
   if(password.length<8||!/[A-Za-z]/.test(password)||!/[0-9]/.test(password))throw Error("A palavra-passe precisa de pelo menos 8 caracteres, incluindo letras e números.");
   if(password!==String(fields.get("confirm")||""))throw Error("As palavras-passe não coincidem.");
   const result=await db.auth.signUp({email,password,options:{emailRedirectTo:gymSignupReturn,data:{display_name:name}}});
   if(result.error)throw result.error;
   if(!(await gymAcceptIdentity(result))){
    gymPendingEmail=email;gymEntryMode="verify";gymEntryNotice="";
    screen.innerHTML=gymAuthMarkup();
   }
  }else{
   const result=await db.auth.signInWithPassword({email,password});
   if(result.error)throw result.error;
   if(!(await gymAcceptIdentity(result)))throw Error("Confirma primeiro o teu email.");
  }
 }catch(err){
  console.warn("EDGY Gym account:",err.message);
  gymEntryError(err.message||"Não foi possível continuar.");
 }finally{
  gymEntryBusy=false;
  if(button?.isConnected){button.disabled=false;button.textContent=form.id==="gymRegister"?"Criar conta":"Entrar"}
 }
},true);


})();