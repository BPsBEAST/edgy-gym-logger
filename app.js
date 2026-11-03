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
function nav(){
 const container=document.querySelector('#nav');
 if(!container)return;
 // Keep menu nodes mounted. Rebuilding them on every render causes visible flicker on mobile.
 const keys=Object.keys(navIcons);
 const buttons=[...container.querySelectorAll('button[data-page]')];
 if(buttons.length!==keys.length||buttons.some((b,i)=>b.dataset.page!==keys[i])){
  container.innerHTML=Object.entries(navIcons).map(([key,paths])=>{
   const svg='<svg class="navIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths+'</svg>';
   return '<button type="button" data-page="'+key+'" class="'+(key==='treino'?'navHome ':'')+'">'+(key==='treino'?'<span class="navHomeGlyph">'+svg+'</span>':svg)+'<span>'+({feed:'Feed',historico:'Histórico',treino:'Treino',exercicios:'Exercícios',perfil:'Perfil'}[key])+'</span></button>'
  }).join('');
 }
 for(const button of container.querySelectorAll('button[data-page],.gymSideNav [data-page]')){
  const selected=button.dataset.page===page;
  button.classList.toggle('active',selected);
  if(selected)button.setAttribute('aria-current','page');
  else button.removeAttribute('aria-current');
 }
 for(const button of document.querySelectorAll('.gymSideNav [data-page]')){
  const selected=button.dataset.page===page;
  button.classList.toggle('active',selected);
  if(selected)button.setAttribute('aria-current','page');
  else button.removeAttribute('aria-current');
 }
}
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
   '<div class="gymSetTop"><div class="gymSetIdentity"><button type="button" class="gymSetType gymSetType-'+esc(s.set_type)+'" data-cycle-set="'+s.id+'" title="Alternar tipo de série: normal, aquecimento, dropset" aria-label="Alterar tipo de série">'+kind+'</button><span class="gymSetOrdinal">Série '+(i+1)+'</span><span class="gymPrevLabel">Anterior: <strong>'+previous+'</strong></span></div><div class="gymSetEndActions"><span class="gymSetState">'+(s.completed?'Concluída':'Por fazer')+'</span><button type="button" class="gymDeleteSetBtn" data-delete-set="'+s.id+'" aria-label="Eliminar série '+(i+1)+'" title="Eliminar só esta série"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M10 3h4M7 7l1 14h8l1-14M10 11v6M14 11v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div></div>'+
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
  '<div class="gymWorkoutStats"><div class="stat gymWorkoutDuration"><strong id="gymWorkoutElapsed" aria-label="Duração atual do treino">'+gymWorkoutElapsedValue(active.started_at)+'</strong><small><span class="gymWorkoutDurationDot"></span> Tempo de treino</small></div><div class="stat"><strong>'+fmt(volume(active))+' <em>kg</em></strong><small>Volume</small></div><div class="stat"><strong>'+count(active)+'</strong><small>Séries feitas</small></div></div></div>'+
  cards+'<div class="gymWorkoutFooterActions"><button type="button" class="btn secondary full gymAddExerciseButton" id="pick">＋ Adicionar exercício</button><div class="gymWorkoutFinishRow"><button type="button" class="btn full gymFinishWorkoutButton" id="finish">Terminar treino</button><button type="button" class="gymCancelWorkoutButton" id="cancelWorkoutBottom">Cancelar treino</button></div></div><div id="picker"></div>';
}
function renderHistory(){const done=history.filter(w=>w.finished_at);return '<h1>Histórico</h1><p class="muted">As tuas sessões e cargas guardadas.</p>'+(done.length?done.map(w=>workoutCard(w)).join(''):'<div class="card">Ainda não tens treinos concluídos.</div>')}
function renderExercises(){const groups=['Todos',...new Set(exercises.map(e=>e.muscle))];const list=exercises.filter(e=>(filter==='Todos'||e.muscle===filter)&&e.name.toLowerCase().includes(search.toLowerCase()));return '<h1>Exercícios</h1><input class="input" id="search" value="'+esc(search)+'" placeholder="Pesquisar exercício…"><div class="filters">'+groups.map(g=>'<button class="btn small '+(filter===g?'':'secondary')+'" data-filter="'+esc(g)+'">'+esc(g)+'</button>').join('')+'</div><button class="btn secondary full" id="new-ex">＋ Criar exercício</button><div class="card">'+list.map(e=>'<div class="item"><strong>'+esc(e.name)+'</strong><div class="muted" style="font-size:12px">'+esc(e.muscle)+' · '+esc(e.equipment)+'</div></div>').join('')+'</div>'}
function renderProfile(){const done=history.filter(w=>w.finished_at),tot=done.reduce((a,w)=>a+volume(w),0);const weeks=Array.from({length:8},(_,i)=>{const end=Date.now()-(7-i)*604800000,start=end-604800000;return done.filter(w=>+new Date(w.started_at)>=start&&+new Date(w.started_at)<end).length});const max=Math.max(1,...weeks);return '<div class="card hero"><h1>'+esc(profile?.display_name||user.email?.split('@')[0])+'</h1><p class="muted">@'+esc(profile?.username||'edgy')+'</p><p class="muted">'+esc(user.email)+'</p></div><div class="grid"><div class="stat"><strong>'+done.length+'</strong><small>Treinos</small></div><div class="stat"><strong>'+fmt(tot)+'</strong><small>kg volume</small></div><div class="stat"><strong>'+done.reduce((a,w)=>a+duration(w),0)+'</strong><small>Minutos</small></div></div><div class="card"><h3>Treinos por semana</h3><div class="chart">'+weeks.map((v,i)=>'<div class="barslot"><div class="bar" style="height:'+Math.max(3,v/max*100)+'%"></div><small>S'+(i+1)+'</small></div>').join('')+'</div></div><div class="card"><h3>Medidas corporais</h3><form id="measure" class="stack"><input class="input" type="date" name="recorded_at" value="'+new Date().toLocaleDateString('en-CA')+'" required>'+[['body_weight','Peso (kg)'],['waist','Cintura (cm)'],['chest','Peito (cm)'],['shoulders','Ombros (cm)'],['arm','Braço (cm)'],['thigh','Coxa (cm)']].map(([key,label])=>'<label class="muted">'+label+'<input class="input" name="'+key+'" type="number" min="0" step="0.1" placeholder="—"></label>').join('')+'<button class="btn">Guardar medição</button></form>'+measurements.map(m=>'<div class="item"><strong>'+esc(m.recorded_at)+'</strong><div class="muted">'+[['body_weight','Peso','kg'],['waist','Cintura','cm'],['chest','Peito','cm'],['shoulders','Ombros','cm'],['arm','Braço','cm'],['thigh','Coxa','cm']].filter(x=>m[x[0]]!=null).map(x=>x[1]+': '+fmt(m[x[0]])+' '+x[2]).join(' · ')+'</div></div>').join('')+'</div><button class="btn ghost full" id="logout">Terminar sessão</button>'}
function renderFeed(){return '<h1>Feed</h1><p class="muted">A comunidade EDGY Gym.</p><div class="card hero"><h3>Em preparação</h3><p class="muted">Em breve: seguir atletas, publicar PRs e conquistas. Os teus treinos e medidas não serão partilhados automaticamente.</p></div><h2>A tua atividade</h2>'+history.filter(w=>w.finished_at).slice(0,5).map(workoutCard).join('')}
async function action(fn){try{if(typeof gymHasPendingSetEdits==='function'&&gymHasPendingSetEdits())await gymFlushSetWrites();await fn();await load();render()}catch(e){console.error(e);toast(e.message||'Ocorreu um erro')}}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.page){if(!user||!gymAuthReady)return;if(page===b.dataset.page){document.querySelector('.app')?.scrollTo?.({top:0,behavior:'smooth'});return}page=b.dataset.page;render();return}if(!user)return;
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
