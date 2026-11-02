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
