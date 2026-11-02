/* One telemetry clock. Jobs never overlap and stop while the document is hidden. */
(()=>{
 'use strict';
 const jobs=new Map(), visibility=new WeakMap();let timer=null;
 const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
  for(const entry of entries)visibility.set(entry.target,entry.isIntersecting);
 },{rootMargin:'80px'}):null;
 function visible(element){
  if(!element||element.hidden)return false;
  if(!visibility.has(element)){visibility.set(element,true);observer?.observe(element)}
  return visibility.get(element)!==false;
 }
 function schedule(){clearTimeout(timer);if(!document.hidden)timer=setTimeout(run,1000)}
 function run(){
  if(document.hidden)return;
  const now=performance.now();
  for(const job of jobs.values()){
   if(job.busy||now<job.next||!job.active())continue;
   job.next=now+job.period;job.busy=true;
   Promise.resolve().then(job.callback).catch(error=>console.warn('Peep job:',job.name,error.message)).finally(()=>{job.busy=false});
  }
  schedule();
 }
 document.addEventListener('visibilitychange',()=>{
  document.body?.classList.toggle('runtime-hidden',document.hidden);
  schedule();
 });
 window.PeepRuntime={
  visible,
  job(name,period,callback,active=()=>true){jobs.set(name,{name,period,callback,active,next:performance.now()+period,busy:false});schedule()},
  get jobs(){return [...jobs.values()].map(({name,period,busy})=>({name,period,busy}))}
 };
})();
