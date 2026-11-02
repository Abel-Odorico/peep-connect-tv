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
async function open(initialPrefs){
 let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const files=[...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(m=>m[1]);
 html=html.replace(/<script src="[^"]+" defer><\/script>/g,'').replace(/<link[^>]*stylesheet[^>]*>/g,'');
 html=html.replace('</body>','<script>'+files.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n').replaceAll('</script','<\\/script')+'</script></body>');
 const errors=[];const console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(html,{url:'http://127.0.0.1:8770/?tv=1',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:console,beforeParse(w){
  if(initialPrefs){w.localStorage.setItem('konka-glass-v1',JSON.stringify(initialPrefs));w.Image=class{set src(value){this._src=value;w.setTimeout(()=>this.onload?.(),0)}get src(){return this._src}}}
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
test('three collection themes select paired still/motion art and retain existing theme contracts',async()=>{
 const {dom,w,d,errors}=await open();try{
  assert.equal(w.PeepCollections.packs.length,3);
  assert.equal(w.PeepCollections.packs.filter(p=>p.extravagant).length,2);
  w.PeepStudio.themes('style');
  for(const id of ['obsidiana','solsticio','atlantida']){
   const card=d.querySelector('[data-theme-choice='+id+']');assert.equal(card.hidden,false,'New themes must be on the first page');card.click();
   assert.equal(d.body.dataset.theme,id);assert.equal(d.body.dataset.collectionTheme,id);
   const stage=d.querySelector('.collection-home-stage');assert.equal(stage.hidden,false);assert.equal(stage.dataset.collection,id);
   assert.ok(stage.style.getPropertyValue('--collection-image').includes(id+'.png'));
   assert.equal(d.querySelector('#collection-theme-mode').disabled,false);
   const mode=d.querySelector('#collection-theme-mode');mode.value='static';mode.dispatchEvent(new w.Event('change'));
   assert.equal(stage.hidden,true);assert.equal(d.body.dataset.motionScene,'off');
   mode.value='animated';mode.dispatchEvent(new w.Event('change'));assert.equal(stage.hidden,false);
  }
  const bg=d.querySelector('[data-studio-tab=background]');bg.click();
  assert.equal(d.querySelectorAll('[data-collection-background]').length,6);
  d.querySelector('[data-collection-background=solsticio][data-collection-mode=static]').click();
  assert.equal(d.querySelector('.collection-home-stage').hidden,true);
  d.querySelector('[data-collection-background=solsticio][data-collection-mode=animated]').click();
  assert.equal(d.querySelector('.collection-home-stage').dataset.collection,'solsticio');
  d.querySelector('#studio-tempo').value='parado';d.querySelector('#studio-tempo').dispatchEvent(new w.Event('change'));
  assert.equal(d.querySelector('.collection-home-stage').dataset.moving,'false');d.querySelector('[data-collection-background=solsticio][data-collection-mode=animated]').click();assert.equal(d.querySelector('.collection-home-stage').dataset.moving,'true');
  d.querySelector('[data-studio-tab=standby]').click();const choice=d.querySelector('#collection-idle-choice');choice.value='atlantida';choice.dispatchEvent(new w.Event('change'));
  assert.equal(d.querySelector('.collection-idle-stage').dataset.collection,'atlantida');
  assert.equal(d.querySelector('#prisma-palette-name').textContent,'Atlântida');w.PeepPrisma.next(1);assert.equal(d.querySelector('.collection-idle-stage').dataset.collection,'obsidiana');
  d.querySelector('[data-prisma-palette=candy]').click();assert.equal(d.querySelector('.collection-idle-stage').hidden,true,'Choosing a Prisma palette must release the collection backdrop');
  assert.deepEqual(errors,[]);
 }finally{dom.window.close()}
});

test('a saved static collection loads again after a fresh startup',async()=>{
 const {dom,d,errors}=await open({theme:'solsticio',collectionWallpaper:'solsticio',wallpaperSource:'collection',motionWallpaper:'off',themeSceneMode:'static'});try{
  await delay(35);assert.ok(d.querySelector('.landscape').style.backgroundImage.includes('collections/solsticio.png'));
  assert.equal(d.querySelector('.collection-home-stage').hidden,true);
  assert.deepEqual(errors,[]);
 }finally{dom.window.close()}
});
function press(w,d,key){d.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}))}
test('D-pad enters cards, follows grid columns and restores focus and scroll per tab',async()=>{
 const {dom,w,d,errors}=await open();try{
  w.PeepStudio.themes('style');assert.equal(d.activeElement.dataset.studioTab,'style');
  const nav=w.PeepStudio.themeNavigation,first=nav.rows();assert.equal(nav.rows(),first,'Row cache should be reused between keys');
  press(w,d,'ArrowDown');assert.equal(d.activeElement.dataset.themeChoice,'crystal');
  press(w,d,'ArrowRight');assert.equal(d.activeElement.dataset.themeChoice,'obsidiana');
  press(w,d,'ArrowDown');assert.equal(d.activeElement.dataset.themeChoice,'adl-night');
  press(w,d,'ArrowUp');assert.equal(d.activeElement.dataset.themeChoice,'obsidiana');
  const scroller=d.querySelector('#studio-panel-style');scroller.scrollTop=120;
  press(w,d,'ArrowUp');assert.equal(d.activeElement.dataset.studioTab,'style');
  press(w,d,'ArrowRight');assert.equal(d.activeElement.dataset.studioTab,'background');
  press(w,d,'ArrowLeft');assert.equal(scroller.scrollTop,120);
  press(w,d,'ArrowDown');assert.equal(d.activeElement.dataset.themeChoice,'obsidiana');
  assert.deepEqual(errors,[]);
 }finally{dom.window.close()}
});
test('D-pad leaves selects, sliders and checkboxes without getting trapped or scanning the full dialog',async()=>{
 const {dom,w,d,errors}=await open();try{
  w.PeepStudio.themes('background');
  w.HTMLElement.prototype.getClientRects=()=>{throw Error('Global spatial navigation must not run inside themes')};
  const select=d.querySelector('#studio-tempo');select.focus();select.value='suave';
  press(w,d,'ArrowRight');assert.equal(select.value,'vivo');assert.equal(d.body.dataset.dynamicTempo,'vivo');
  press(w,d,'ArrowDown');assert.notEqual(d.activeElement,select,'Down must leave a native select');
  d.querySelector('[data-studio-tab=glass]').click();const range=d.querySelector('[data-setting=glass]');range.focus();const value=Number(range.value);
  press(w,d,'ArrowRight');assert.equal(Number(range.value),value+1);
  press(w,d,'ArrowDown');assert.notEqual(d.activeElement,range,'Down must leave a native range input');
  d.querySelector('[data-studio-tab=rotation]').click();const boxes=[...d.querySelectorAll('[data-living-theme]')];boxes[0].focus();
  press(w,d,'ArrowRight');assert.equal(d.activeElement,boxes[1]);const checked=boxes[1].checked;
  press(w,d,'Enter');assert.equal(boxes[1].checked,!checked,'OK must toggle a checkbox');
  press(w,d,'ArrowDown');assert.notEqual(d.activeElement,boxes[1]);
  assert.deepEqual(errors,[]);
 }finally{dom.window.close()}
});
test('all five theme panes have a route to the footer and tabs; pagination never strands focus',async()=>{
 const {dom,w,d,errors}=await open();try{
  for(const tab of ['style','background','standby','rotation','glass']){
   w.PeepStudio.themes(tab);const rows=w.PeepStudio.themeNavigation.rows();assert.ok(rows.length>0,tab);
   rows[0][0].focus();press(w,d,'ArrowUp');assert.equal(d.activeElement.dataset.studioTab,tab);
   rows.at(-1)[0].focus();press(w,d,'ArrowDown');assert.equal(d.activeElement.id,'studio-done');
   press(w,d,'ArrowUp');assert.ok(rows.flat().includes(d.activeElement));
   d.querySelector('#panel').close();assert.equal(w.PeepStudio.themeNavigation,null);
  }
  w.PeepStudio.themes('style');const next=d.querySelector('#studio-panel-style .studio-pagination button:last-child');next.focus();next.click();next.click();
  assert.equal(next.disabled,true);assert.ok(d.activeElement.matches('.studio-theme'));assert.equal(d.activeElement.closest('[hidden]'),null);
  press(w,d,'Escape');assert.equal(d.querySelector('#panel').open,false);
  assert.deepEqual(errors,[]);
 }finally{dom.window.close()}
});

test('replacing the theme dialog contents releases its local navigation',async()=>{
 const {dom,w,d,errors}=await open();try{
  w.PeepStudio.themes('glass');const brand=[...d.querySelectorAll('#studio-panel-glass button')].find(b=>b.textContent.includes('Marca e logo'));
  assert.ok(brand);brand.click();assert.equal(w.PeepStudio.themeNavigation,null);assert.equal(d.querySelector('#panel').classList.contains('theme-studio-dialog'),false);
  assert.ok(d.querySelector('#panel').open);assert.deepEqual(errors,[]);
 }finally{dom.window.close()}
});

test('theme navigation pauses native telemetry work and resumes it after closing',async()=>{
 const {dom,w,d,errors}=await open();try{
  let calls=0;w.PeepTV.deviceMetrics=()=>{calls++;return JSON.stringify(fixture())};
  w.PeepStudio.themes('style');await delay(1250);await w.PeepMetrics.refresh(true);assert.equal(calls,0);
  d.querySelector('#panel').close();await w.PeepMetrics.refresh(true);assert.equal(calls,1);
  assert.deepEqual(errors,[]);
 }finally{dom.window.close()}
});

test('Ambient weather displays measured conditions and temperature ranges without inventing missing data',async()=>{
 const {dom,w,d,errors}=await open();try{
  const at=Date.now()/1000;
  const weather={sourceAt:at,fetchedAt:at,current:{temperature_2m:0,apparent_temperature:-2,relative_humidity_2m:65,wind_speed_10m:0,weather_code:3},daily:{time:['2026-11-02','2026-11-03','2026-11-04'],temperature_2m_min:[-5,0,2],temperature_2m_max:[3,7,9],weather_code:[3,2,0]}};
  w.eval('weather='+JSON.stringify(weather)+';weatherError=false;displayWeather()');
  assert.equal(d.querySelector('#amb-humidity').textContent,'65%');assert.equal(d.querySelector('.amb-gauge-value').getAttribute('stroke-dasharray'),'65 100');
  assert.equal(d.querySelector('#amb-wind').textContent,'0');assert.equal(d.querySelector('.amb-conditions-card').dataset.wind,'still');
  assert.equal(d.querySelector('#amb-feels').textContent,'-2°');assert.equal(d.querySelector('#amb-feels-note').textContent,'2° abaixo da temperatura');
  assert.equal(d.querySelectorAll('.amb-temperature-range>b').length,3);assert.match(d.querySelector('.amb-temperature-range').getAttribute('aria-label'),/mínima -5°, máxima 3°/);
  const last=d.querySelectorAll('.amb-temperature-range>b')[2];assert.ok(Math.abs(parseFloat(last.style.left)-50)<.01);assert.ok(Math.abs(parseFloat(last.style.width)-50)<.01);
  weather.current.relative_humidity_2m=110;weather.current.wind_speed_10m=-1;weather.current.apparent_temperature=null;weather.daily.temperature_2m_max[1]=null;
  w.eval('weather='+JSON.stringify(weather)+';displayWeather()');
  assert.equal(d.querySelector('#amb-humidity').textContent,'—');assert.equal(d.querySelector('.amb-gauge-value').getAttribute('stroke-dasharray'),'0 100');assert.match(d.querySelector('#amb-humidity-gauge').getAttribute('aria-label'),/indisponível/);
  assert.equal(d.querySelector('#amb-wind').textContent,'—');assert.equal(d.querySelector('#amb-feels').textContent,'—');
  assert.equal(d.querySelectorAll('.amb-temperature-range>b').length,2);assert.ok(!d.querySelector('#amb-forecast').innerHTML.includes('NaN'));
  weather.sourceAt=at+3600;w.eval('weather='+JSON.stringify(weather)+';displayWeather()');assert.equal(d.querySelector('#amb-weather-state').textContent,'Indisponível');assert.equal(d.querySelector('#amb-humidity').textContent,'—');
  assert.deepEqual(errors,[]);
 }finally{dom.window.close()}
});
test('Ambient market charts show only provider history or distinct samples from this session',async()=>{
 const {dom,w,d,errors}=await open();try{
  const at=Date.now()/1000,common={ok:true,sourceAt:at,fetchedAt:at,value:5.1,change:1,source:'Test source'};
  const data={items:{usd:{...common},usdc:{...common,value:1,brl:5.1},ibov:{...common,value:120000,history:[{value:118000},{value:119000},{value:120000}]}}};
  w.eval('marketData='+JSON.stringify(data)+';paintMarkets()');
  assert.equal(d.querySelector('#market-usd .market-visual').dataset.history,'false');assert.ok(d.querySelector('#market-usd .market-visual svg').hasAttribute('hidden'));
  assert.equal(d.querySelector('#market-ibov .market-visual').dataset.history,'true');assert.match(d.querySelector('#market-ibov .market-visual small').textContent,/3 pregões/);assert.ok(d.querySelector('#ibov-line').getAttribute('points'));
  w.eval('paintMarkets()');assert.equal(d.querySelector('#market-usd .market-visual').dataset.history,'false','Repeating a response is not another sample');
  data.items.usd.sourceAt+=60;data.items.usd.value=5.2;w.eval('marketData='+JSON.stringify(data)+';paintMarkets()');
  assert.equal(d.querySelector('#market-usd .market-visual').dataset.history,'true');assert.ok(!d.querySelector('#market-usd .market-visual svg').hasAttribute('hidden'));
  assert.match(d.querySelector('#market-usd .amb-chart-range').textContent,/Mín 5,1000 BRLMáx 5,2000 BRL/);
  assert.match(d.querySelector('#market-ibov .amb-chart-range').textContent,/118\.000 pts/);
  data.items.usd={ok:false,error:'Fonte indisponível'};w.eval('marketData='+JSON.stringify(data)+';paintMarkets()');assert.equal(d.querySelector('#market-usd .market-visual').dataset.history,'false');assert.equal(d.querySelector('#usd-price').textContent,'—');assert.equal(d.querySelector('#amb-usd-state').textContent,'Indisponível');
  assert.ok(d.querySelector('#market-usd .amb-chart-range').hidden);assert.equal(d.querySelector('#market-usd .amb-chart-range').textContent,'');
  assert.deepEqual(errors,[]);
 }finally{dom.window.close()}
});
test('Ambient refresh keeps its loading state until all sources finish and blocks duplicate requests',async()=>{
 const {dom,w,d,errors}=await open();try{
  let release,calls=0;const base=w.fetch;w.fetch=async input=>{if(String(input).startsWith('/api/weather?force=1')){calls++;return new Promise(resolve=>release=()=>resolve(new Response(JSON.stringify({fetchedAt:Date.now()/1000,current:{temperature_2m:22,weather_code:2},daily:{time:['2026-11-02']}}),{headers:{'Content-Type':'application/json'}})))}return base(input)};
  const pending=w.PeepAmbient.refresh();await delay(10);const button=d.querySelector('#refresh-markets');assert.equal(button.disabled,true);assert.equal(button.getAttribute('aria-busy'),'true');
  await w.PeepAmbient.refresh();assert.equal(calls,1);release();await pending;assert.equal(button.disabled,false);assert.equal(button.getAttribute('aria-busy'),'false');assert.deepEqual(errors,[]);
 }finally{dom.window.close()}
});
test('Google account action opens setup when OAuth is missing and TV handoff when configured',async()=>{
 const {dom,w,d,errors}=await open();try{
  await w.youtubeAccount();assert.ok(d.querySelector('#youtube-check'));assert.match(d.querySelector('dialog').textContent,/cliente OAuth/);
  const fetch=w.fetch;w.fetch=async input=>String(input).includes('/api/youtube/status')?new Response(JSON.stringify({configured:true,connected:false,apiConfigured:true}),{headers:{'Content-Type':'application/json'}}):fetch(input);
  await w.youtubeAccount();assert.ok(d.querySelector('#youtube-tv-check'));assert.equal(d.querySelector('a[href="/api/youtube/connect"]'),null,'TV must not attempt embedded OAuth');
  await d.querySelector('#youtube-tv-check').onclick();assert.match(d.querySelector('#youtube-tv-state').textContent,/Ainda não recebemos/);assert.equal(d.querySelector('#youtube-tv-check').disabled,false);
  assert.deepEqual(errors,[]);
 }finally{dom.window.close()}
});
test('Collection motion gracefully preserves original artwork when GPU is unavailable',async()=>{
 const {dom,w,d,errors}=await open();try{
  for(const id of ['obsidiana','solsticio','atlantida']){
   w.PeepCollections.selectBackdrop(id,'animated');
   assert.equal(d.querySelector('.collection-home-stage').dataset.collection,id);
   assert.ok(d.querySelector('.collection-home-stage .collection-photo'));
   assert.equal(d.querySelectorAll('.collection-current,.collection-contours').length,0,'No sliding duplicate of the artwork');
  }
  assert.equal(w.PeepCollectionMotion.inspect().running,false);assert.equal(d.querySelectorAll('.collection-material').length,0);
  assert.deepEqual(errors,[]);
 }finally{dom.window.close()}
});
