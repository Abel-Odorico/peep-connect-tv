const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../dist');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function fixture(){
 const at=Date.now()/1000;
 return {connected:true,at,source:'Android nativo',sampleId:1,model:'Test TV',android:'14',ram:{totalBytes:1610612736,availableBytes:350000000},network:{interface:'wifi',transport:'Wi-Fi',rssi:-50,rxLinkMbps:433,txLinkMbps:433,frequencyMHz:5200,traffic:{downloadMbps:.0004,uploadMbps:0}},storage:{availableBytes:4000000000},uptimeSeconds:3600};
}
async function open(){
 let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const files=[...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(m=>m[1]);
 html=html.replace(/<script src="[^"]+" defer><\/script>/g,'').replace(/<link[^>]*stylesheet[^>]*>/g,'');
 html=html.replace('</body>','<script>'+files.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n').replaceAll('</script','<\\/script')+'</script></body>');
 const errors=[];const console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(html,{url:'http://127.0.0.1:8770/?tv=1',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:console,beforeParse(w){
  w.Response=Response;w.AbortSignal=AbortSignal;w.AbortController=AbortController;
  w.matchMedia=()=>({matches:false});w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
  w.setInterval=()=>1;
  w.PeepTV={deviceMetrics:()=>JSON.stringify(fixture())};
  w.fetch=async input=>{
   const url=new URL(input,'http://127.0.0.1:8770');let data={};
   if(url.pathname==='/api/health')data={ok:true};
   if(url.pathname==='/api/catalog')data={results:[{id:101,title:'Example title',type:url.searchParams.get('type')||'movie',date:'2026-01-01',rating:8,votes:100,poster:null,backdrop:null}]};
   if(url.pathname==='/api/youtube/status')data={configured:false,connected:false};
   if(url.pathname==='/api/weather')data={fetchedAt:Date.now()/1000,current:{temperature_2m:22,weather_code:2,time:'2026-11-02T00:00'},daily:{time:['2026-11-02'],temperature_2m_min:[18],temperature_2m_max:[28],weather_code:[2]}};
   if(url.pathname==='/api/system')data=fixture();
   if(url.pathname==='/api/markets')data={items:{}};
   if(url.pathname==='/api/performance')data={at:Date.now()/1000,cpu:{usagePercent:20},memory:{},loadAverage:[1,1,1]};
   return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
  };
 }});await delay(30);return {dom,w:dom.window,d:dom.window.document,errors};
}
test('theme keyboard activates exactly one tab without global spatial navigation',async()=>{
 const {dom,w,d,errors}=await open();try{
  w.PeepStudio.themes('style');assert.equal(d.querySelectorAll('[role=tab]').length,5);
  assert.equal(d.querySelectorAll('.studio-theme:not([hidden])').length,6);
  const first=d.querySelector('[data-studio-tab=style]');first.focus();
  first.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
  assert.equal(d.activeElement.dataset.studioTab,'background');assert.equal(d.querySelector('[role=tab][aria-selected=true]').dataset.studioTab,'background');
  assert.equal(d.querySelectorAll('[role=tabpanel]:not([hidden])').length,1);
  assert.equal(d.body.classList.contains('runtime-modal'),true);
  d.querySelector('#studio-tempo').value='vivo';d.querySelector('#studio-tempo').dispatchEvent(new w.Event('change'));
  assert.equal(d.body.dataset.motionRunning,'true');
  d.querySelector('#panel').close();assert.equal(d.body.classList.contains('runtime-modal'),false);
  assert.deepEqual(errors,[]);
 }finally{dom.window.close()}
});
test('tiny real traffic and zero do not freeze Performance; Prisma gradients stay unique',async()=>{
 const {dom,w,d,errors}=await open();try{
  d.querySelector('[data-page=performance]').click();await delay(20);
  assert.doesNotThrow(()=>w.PeepPerformance.paint());
  assert.equal(d.querySelector('#pro-down').textContent,'<0,001');
  assert.equal(d.querySelector('#pro-up').textContent,'0');
  assert.equal(d.querySelectorAll('.prisma-layer').length,6);
  const gradients=[...d.querySelectorAll('.prisma-layer linearGradient')].map(e=>e.id);
  assert.equal(new Set(gradients).size,gradients.length);
  assert.deepEqual(errors,[]);
 }finally{dom.window.close()}
});
test('Internet tests preserve device origin, convert bits, cancel and retain complete result',async()=>{
 const {dom,w,d,errors}=await open();try{
  let instance;
  const results={getSummary:()=>({download:80000000,upload:40000000,latency:18,jitter:2,downLoadedLatency:44,upLoadedLatency:31}),getDownloadBandwidthPoints:()=>[{bps:80000000,duration:500}],getUploadBandwidthPoints:()=>[{bps:40000000,duration:500}],getUnloadedLatencyPoints:()=>[17,18,19],getDownLoadedLatencyPoints:()=>[40,48],getUpLoadedLatencyPoints:()=>[30,32]};
  w.PeepSpeedEngine=class {constructor(config){this.config=config;this.results=results;instance=this}play(){}pause(){this.paused=true}};
  w.PeepNetwork.open();assert.equal(d.querySelector('#quality-down').textContent,'—');
  await w.PeepNetwork.start();assert.equal(instance.config.logAimApiUrl,null);assert.equal(instance.config.logMeasurementApiUrl,null);
  assert.equal(instance.config.autoStart,false);assert.equal(w.PeepNetwork.running,true);instance.onResultsChange();assert.equal(d.querySelector('#hub-internet-speed').textContent,'Velocidade: medir');
  instance.onFinish(results);assert.equal(w.PeepNetwork.last.downloadMbps,80);assert.equal(w.PeepNetwork.last.source,'tv');assert.equal(d.querySelector('#quality-ping').textContent,'18');
  const savedAt=w.PeepNetwork.last.at;
  await w.PeepNetwork.start();const pending=instance;w.PeepNetwork.cancel();pending.onFinish(results);
  assert.equal(pending.paused,true);assert.equal(w.PeepNetwork.running,false);assert.equal(w.PeepNetwork.last.at,savedAt);
  await w.PeepNetwork.start('latency');assert.ok(instance.config.measurements.every(m=>m.type==='latency'));instance.onFinish(results);assert.equal(w.PeepNetwork.last.downloadMbps,80);assert.equal(w.PeepNetwork.last.bandwidthAt,savedAt);await w.PeepNetwork.start();const empty={...results,getDownloadBandwidthPoints:()=>[],getUploadBandwidthPoints:()=>[],getDownLoadedLatencyPoints:()=>[],getUpLoadedLatencyPoints:()=>[]};instance.onResultsChange=instance.onResultsChange;instance.onFinish(empty);assert.equal(w.PeepNetwork.last.bandwidthAt,savedAt);assert.ok(d.querySelector('#quality-status').textContent.includes('incompleta'));await w.PeepNetwork.start();d.querySelector('#panel').close();assert.equal(w.PeepNetwork.running,false);
  assert.deepEqual(errors,[]);
 }finally{dom.window.close()}
});
