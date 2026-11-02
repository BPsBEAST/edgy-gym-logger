/* Static fallback: make startup failures visible instead of leaving an empty screen. */
window.addEventListener("load",function(){
 setTimeout(function(){
  const screen=document.getElementById("screen");
  if(!screen)return;
  const pending=screen.textContent?.includes("A preparar a aplicação");
  if(!pending)return;
  const sdkReady=!!window.supabase?.createClient;
  screen.innerHTML='<section class="card hero" role="alert"><h1>Não foi possível abrir a aplicação</h1><p class="muted">'+(sdkReady?'O arranque foi interrompido. Confirma a ligação e tenta novamente.':'Não foi possível carregar a ligação ao Supabase. Verifica a ligação à internet e os bloqueadores de scripts.')+'</p><button type="button" class="btn" id="gymRetryStartup">Tentar novamente</button></section>';
  const button=document.getElementById("gymRetryStartup");if(button)button.addEventListener("click",()=>location.reload());
 },7000);
});
