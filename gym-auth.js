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
