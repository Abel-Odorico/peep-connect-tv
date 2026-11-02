/* Internet capacity is a manual test. Traffic counters never stand in for it. */
(()=>{
 'use strict';
 const native=()=>!!window.PeepMetrics?.isNative;
 const source=()=>native()?'tv':'browser';
 const storageKey=()=>`peep-quality-${source()}-v1`;
 const valid=n=>Number.isFinite(n)&&n>=0;
 const format=(n,d=1)=>valid(n)?n.toLocaleString('pt-BR',{maximumFractionDigits:d}):'—';
 let saved=null,engine=null,loading=null,timeout=null,revision=0,running=false,mode='full';
 try{const value=JSON.parse(localStorage.getItem(storageKey())||'null');if(value?.source===source()&&valid(value.at)&&valid(value.latency)&&value.at<=Date.now()+60000)saved=value;if(saved?.mode==='full'&&!saved.bandwidthAt)saved.bandwidthAt=saved.at}catch{}
 function loadEngine(){
  if(window.PeepSpeedEngine)return Promise.resolve(window.PeepSpeedEngine);
  if(loading)return loading;
  loading=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='vendor/cloudflare-speedtest-1.15.0.js';script.onload=()=>resolve(window.PeepSpeedEngine);script.onerror=()=>{script.remove();loading=null;reject(Error('Não foi possível carregar o teste.'))};document.head.append(script)});
  return loading;
 }
 const fullMeasurements=[
  {type:'latency',numPackets:1},
  {type:'download',bytes:100000,count:1,bypassMinDuration:true},
  {type:'latency',numPackets:10},
  {type:'download',bytes:1000000,count:2},
  {type:'download',bytes:10000000,count:3},
  {type:'upload',bytes:100000,count:2,bypassMinDuration:true},
  {type:'upload',bytes:1000000,count:2},
  {type:'upload',bytes:5000000,count:2}
 ];
 function normalize(results){
  const s=results.getSummary(),down=results.getDownloadBandwidthPoints(),up=results.getUploadBandwidthPoints();
  const pings=results.getUnloadedLatencyPoints().filter(valid),downPings=results.getDownLoadedLatencyPoints().filter(valid),upPings=results.getUpLoadedLatencyPoints().filter(valid);
  const usable=points=>points.some(p=>valid(p.bps)&&p.bps>0&&p.duration>=100);
  return {source:source(),at:Date.now(),mode,downloadMbps:usable(down)&&s.download>0?s.download/1e6:null,uploadMbps:usable(up)&&s.upload>0?s.upload/1e6:null,latency:pings.length>=3&&valid(s.latency)?s.latency:null,jitter:pings.length>=3&&valid(s.jitter)?s.jitter:null,downLoadedLatency:downPings.length>=2&&valid(s.downLoadedLatency)?s.downLoadedLatency:null,upLoadedLatency:upPings.length>=2&&valid(s.upLoadedLatency)?s.upLoadedLatency:null,down:down.map(p=>p.bps/1e6).filter(valid).slice(-12),up:up.map(p=>p.bps/1e6).filter(valid).slice(-12),pings:pings.slice(-20)};
 }
 function line(id,values){const el=$('#'+id);if(!el)return;const max=Math.max(1,...values);el.setAttribute('points',values.length>1?values.map((n,i)=>`${8+i*424/(values.length-1)},${92-n/max*76}`).join(' '):'')}
 function paint(data=saved){
  for(const [id,key]of [['quality-down','downloadMbps'],['quality-up','uploadMbps'],['quality-ping','latency'],['quality-jitter','jitter'],['quality-loaded-down','downLoadedLatency'],['quality-loaded-up','upLoadedLatency']])if($('#'+id))$('#'+id).textContent=format(data?.[key]);
  line('quality-down-line',data?.down||[]);line('quality-up-line',data?.up||[]);
  line('quality-ping-line',data?.pings||[]);
  const date=at=>new Date(at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  const text=!saved?'Internet ainda não medida':`${saved.bandwidthAt?'Velocidade '+date(saved.bandwidthAt)+' · ':''}Latência ${date(saved.at)} · ${saved.source==='tv'?'na TV':'neste navegador'}`;
  if($('#quality-updated'))$('#quality-updated').textContent=running?'Medição em andamento…':text;
  if($('#hub-internet-time'))$('#hub-internet-time').textContent=text;
  if($('#hub-internet-ping'))$('#hub-internet-ping').textContent=valid(saved?.latency)?format(saved.latency)+' ms':'— ms';
  if($('#hub-internet-speed'))$('#hub-internet-speed').textContent=valid(saved?.downloadMbps)?'↓ '+format(saved.downloadMbps)+' Mb/s':'Velocidade: medir';
  if($('#pro-internet-result'))$('#pro-internet-result').textContent=valid(saved?.downloadMbps)?'Última velocidade · ↓ '+format(saved.downloadMbps)+' · ↑ '+format(saved.uploadMbps)+' Mb/s · latência '+format(saved.latency)+' ms':valid(saved?.latency)?'Latência testada · '+format(saved.latency)+' ms':'Internet: faça um teste para medir a velocidade';
  if($('#quality-latency-verdict'))$('#quality-latency-verdict').textContent=!valid(data?.latency)?'Aguardando medição':data.latency<=50?'Latência baixa':data.latency<=100?'Latência moderada':'Latência alta';
 }
 function buttons(){
  if($('#quality-start')){$('#quality-start').disabled=running;$('#quality-start').textContent=running?'Medindo…':'Testar internet'}
  if($('#quality-latency'))$('#quality-latency').disabled=running;
  if($('#quality-stop'))$('#quality-stop').hidden=!running;
 }
 function cancel(message='Teste interrompido. O último resultado completo foi mantido.'){
  revision++;running=false;clearTimeout(timeout);timeout=null;
  if(engine){engine.onFinish=()=>{};engine.onResultsChange=()=>{};engine.onError=()=>{};engine.pause();engine=null}
  document.body.classList.remove('network-testing');buttons();paint();
  if($('#quality-status'))$('#quality-status').textContent=message;
 }
 async function run(testMode='full'){
  if(running)return;
  if(!navigator.onLine){if($('#quality-status'))$('#quality-status').textContent='Sem conexão de rede neste aparelho.';return}
  mode=testMode;running=true;const current=++revision;buttons();document.body.classList.add('network-testing');
  if($('#quality-status'))$('#quality-status').textContent='Preparando o teste local…';
  timeout=setTimeout(()=>cancel('Tempo limite. A medição ficou incompleta; tente novamente.'),90000);
  try{
   const Engine=await loadEngine();if(current!==revision)return;
   engine=new Engine({autoStart:false,logAimApiUrl:null,logMeasurementApiUrl:null,includeCredentials:false,
    measurements:mode==='latency'?[{type:'latency',numPackets:1},{type:'latency',numPackets:10}]:fullMeasurements,
    estimatedServerTime:0,bandwidthFinishRequestDuration:1000,bandwidthAbortRequestDuration:10000,loadedLatencyThrottle:500,loadedLatencyMaxPoints:12,bandwidthMinRequestDuration:100,
    measureDownloadLoadedLatency:mode==='full',measureUploadLoadedLatency:mode==='full'});
   engine.onPhaseChange=({measurement})=>{if(current===revision&&$('#quality-status'))$('#quality-status').textContent=({latency:'Medindo latência e jitter…',download:'Medindo download e latência sob carga…',upload:'Medindo upload e latência sob carga…'})[measurement.type]||'Medindo…'};
   engine.onResultsChange=()=>{if(current===revision)paint(normalize(engine.results))};
   engine.onError=()=>{if(current===revision)cancel('O teste não respondeu corretamente. Confira a conexão ou tente novamente mais tarde.')};
   engine.onFinish=results=>{
    if(current!==revision)return;const data=normalize(results);
    if(!valid(data.latency)||mode==='full'&&(!valid(data.downloadMbps)||!valid(data.uploadMbps))){cancel('Medição incompleta. Nenhuma velocidade foi estimada. Tente novamente.');return}
    if(mode==='full')data.bandwidthAt=data.at;
    else if(saved?.downloadMbps!=null)for(const key of ['downloadMbps','uploadMbps','down','up','downLoadedLatency','upLoadedLatency'])data[key]=saved[key];
    if(mode==='latency'&&saved?.downloadMbps!=null)data.bandwidthAt=saved.bandwidthAt||saved.at;
    saved=data;try{localStorage.setItem(storageKey(),JSON.stringify(data))}catch{}
    running=false;clearTimeout(timeout);timeout=null;engine=null;document.body.classList.remove('network-testing');buttons();paint();
    if($('#quality-status'))$('#quality-status').textContent='Concluído · '+(mode==='full'?'transferência HTTP até a Cloudflare.':'somente latência; download e upload não foram testados.');
   };
   engine.play();
  }catch(error){if(current===revision)cancel(error.message||'Teste indisponível.')}
 }
 function panelHTML(){return `<p class="eyebrow">QUALIDADE DA CONEXÃO</p><h2>Internet, além do sinal.</h2><p class="quality-origin">Medição ${native()?'diretamente nesta Konka':'neste navegador · não mede a TV'} até a Cloudflare.</p><div class="quality-signal"><span>Sinal Wi-Fi <b id="quality-rssi">—</b></span><span>Enlace com o roteador <b id="quality-link">—</b></span></div><div class="quality-speed-grid"><div><span>↓ Download testado</span><strong id="quality-down">—</strong><small>Mb/s</small></div><div><span>↑ Upload testado</span><strong id="quality-up">—</strong><small>Mb/s</small></div></div><div class="quality-latency-grid"><div><span>Ping HTTP · latência</span><strong id="quality-ping">—</strong><small>ms</small></div><div><span>Jitter · variação</span><strong id="quality-jitter">—</strong><small>ms</small></div><div><span>Durante download</span><strong id="quality-loaded-down">—</strong><small>ms</small></div><div><span>Durante upload</span><strong id="quality-loaded-up">—</strong><small>ms</small></div></div><div class="quality-chart"><span id="quality-latency-verdict">Aguardando medição</span><svg viewBox="0 0 440 110" preserveAspectRatio="none" aria-label="Latência das amostras HTTP; escala automática"><path d="M8 20H432M8 56H432M8 92H432"/><polyline id="quality-ping-line"/></svg><small>Latência · amostras deste teste · escala automática</small></div><div class="quality-chart quality-bandwidth-chart"><svg viewBox="0 0 440 110" preserveAspectRatio="none" aria-label="Evolução das amostras de download e upload; cada curva tem escala própria"><polyline id="quality-down-line"/><polyline id="quality-up-line"/></svg><small>↓ download azul · ↑ upload lilás · escalas independentes</small></div><p id="quality-updated" class="quality-time"></p><p id="quality-status" role="status">Faça um teste para conhecer a capacidade desta conexão.</p><div class="quality-actions"><button id="quality-start" class="panel-button">Testar internet</button><button id="quality-latency" class="text-button">Só latência · teste leve</button><button id="quality-stop" class="text-button" hidden>Parar</button></div><p class="inline-note">Teste completo: até cerca de 45 MB de dados úteis e limite de 90 s. Não roda automaticamente. Mede este aparelho, o Wi-Fi e o caminho até o servidor; não confirma a velocidade contratada. Ping é latência HTTP, não ICMP; jitter é sua variação. Perda de pacotes não é medida. Sob carga, a latência só aparece com amostras suficientes.</p><button id="wifi-settings" class="text-button">Abrir configurações de rede</button>`}
 networkPanel=function(){
  show(panelHTML());panel.classList.add('quality-dialog');
  const snapshot=window.PeepMetrics?.latest,n=native()&&snapshot&&Date.now()/1000-snapshot.at<12?snapshot.network:null;
  $('#quality-rssi').textContent=valid(-n?.rssi)&&n?.rssi<0?n.rssi+' dBm':n?.transport==='Ethernet'?'Ethernet':'Não informado';
  $('#quality-link').textContent=valid(n?.rxLinkMbps)&&valid(n?.txLinkMbps)?n.rxLinkMbps+' / '+n.txLinkMbps+' Mb/s':'Não informado';
  $('#quality-start').onclick=()=>run('full');$('#quality-latency').onclick=()=>run('latency');$('#quality-stop').onclick=()=>cancel();
  $('#wifi-settings').onclick=()=>{if(native())PeepTV.openSettings('network');else notify('Na TV: Configurações → Rede e Internet.')};paint();buttons();
 };
 const previousShow=show;show=function(html){cancel();document.body.classList.add('runtime-modal');panel.classList.remove('quality-dialog');return previousShow(html)};
 panel.addEventListener('close',()=>{cancel();panel.classList.remove('quality-dialog');document.body.classList.remove('runtime-modal')});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)cancel('Teste interrompido ao sair do aplicativo.')});
 $('#network').onclick=networkPanel;$('#network-pill').onclick=networkPanel;
 if($('#pro-speed-test'))$('#pro-speed-test').onclick=networkPanel;
 $('#hub-traffic .hub-label').lastChild.textContent='Mb/s';
 const label=$('#hub-traffic .hub-label');for(const node of label.childNodes)if(node.nodeType===Node.TEXT_NODE&&node.textContent.trim())node.textContent='Uso atual da rede';
 $('#hub-traffic .hub-caption').textContent='Tráfego em uso · não é a velocidade da internet';
 $('.pro-kicker').textContent='REDE · USO ATUAL';
 $('.pro-network-top h2').textContent='Tráfego, não velocidade.';
 const summary=document.createElement('button');summary.id='hub-internet';summary.className='hub-internet';summary.innerHTML='<span>'+livingIcon('wifi')+'<b>Internet · último teste</b><small id="hub-internet-time"></small></span><strong id="hub-internet-speed">Velocidade: medir</strong><span id="hub-internet-ping">— ms</span><em>Testar conexão ↗</em>';hub.append(summary);summary.onclick=networkPanel;
 const pro=document.createElement('button');pro.id='pro-internet-result';pro.className='pro-internet-result';$('.pro-network-note').before(pro);pro.onclick=networkPanel;
 window.PeepNetwork={open:networkPanel,start:run,cancel,get last(){return saved},get running(){return running}};
 paint();
})();
