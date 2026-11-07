/* Performance Studio: separate RF signal, negotiated link and sampled traffic. */
(()=>{
 const root=$('#performance-dashboard');root.classList.add('perf-pro');
 const network=root.querySelectorAll('.perf-gauge')[2],legacy=document.createElement('div');legacy.className='perf-network-legacy';while(network.firstChild)legacy.append(network.firstChild);network.append(legacy);network.classList.add('perf-network-hero');root.querySelector('.perf-gauge-grid').prepend(network);
 network.insertAdjacentHTML('afterbegin','<div class="pro-network-top"><div><span class="pro-kicker">REDE · TRÁFEGO DA TV</span><h2>O que está passando agora.</h2></div><span id="pro-live" class="pro-live">Aguardando leitura</span></div><div class="pro-rates"><div><span><i></i>Download</span><strong id="pro-down">—</strong><small class="pro-unit">Mb/s</small></div><div><span><i></i>Upload</span><strong id="pro-up">—</strong><small class="pro-unit">Mb/s</small></div><select id="pro-unit" aria-label="Unidade do tráfego"><option value="bits">Mb/s</option><option value="bytes">MB/s</option></select></div><div id="pro-network-plot" class="pro-network-plot" tabindex="0" role="group" aria-label="Histórico de tráfego. Use esquerda e direita para inspecionar as leituras."><div class="pro-y-axis"><span id="pro-scale-max">—</span><span id="pro-scale-mid">—</span><span>0</span></div><svg viewBox="0 0 640 170" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="pro-download-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#77cfff" stop-opacity=".22"/><stop offset="1" stop-color="#77cfff" stop-opacity="0"/></linearGradient><linearGradient id="pro-upload-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d5a2ff" stop-opacity=".16"/><stop offset="1" stop-color="#d5a2ff" stop-opacity="0"/></linearGradient></defs><path class="pro-grid" d="M0 12H640M0 85H640M0 158H640"/><path id="pro-down-area" fill="url(#pro-download-fill)"/><path id="pro-up-area" fill="url(#pro-upload-fill)"/><path id="pro-down-line"/><path id="pro-up-line"/><path id="pro-crosshair"/><circle id="pro-down-dot" r="3.7"/><circle id="pro-up-dot" r="3.7"/></svg><span id="pro-plot-empty">O histórico começa após duas leituras reais.</span><output id="pro-tooltip" hidden></output></div><div class="pro-x-axis"><span id="pro-start">Sem amostras</span><span id="pro-window">Histórico desta sessão · escala automática</span><span id="pro-end">Agora</span></div><div class="pro-link-strip"><span>'+livingIcon('wifi')+'<b id="pro-rssi">— dBm</b><small id="pro-quality">Sinal Wi-Fi</small></span><span><b id="pro-link">—</b><small>Enlace Rx / Tx · Mb/s</small></span><span><b id="pro-band">—</b><small>Frequência</small></span></div><p class="pro-network-note">Sinal, enlace com o roteador e uso da rede são medidas diferentes. Este gráfico não é um teste de internet.</p>');
 const summary=document.createElement('dl');
 summary.className='pro-consumption';
 for(const [id,label] of [['received','Recebido'],['sent','Enviado'],['peak','Pico de download']]){
  const group=document.createElement('div');
  const term=document.createElement('dt');
  const value=document.createElement('dd');
  term.textContent=label;
  value.id='pro-'+id;
  value.textContent='—';
  group.append(term,value);
  summary.append(group);
 }
 const coverage=document.createElement('p');
 coverage.className='pro-coverage';
 root.querySelector('.pro-x-axis').after(summary,coverage);
 function updateConsumption(){
  let received=0,sent=0,seconds=0;
  for(const row of samples){
   if(!Number.isFinite(row.seconds)||row.seconds<=0)continue;
   received+=row.down*row.seconds/8;
   sent+=row.up*row.seconds/8;
   seconds+=row.seconds;
  }
  richSetText('pro-received',seconds?number(received)+' MB':'—');
  richSetText('pro-sent',seconds?number(sent)+' MB':'—');
  richSetText('pro-peak',samples.length?number(Math.max(...samples.map(row=>row.down))/unit())+(unit()===8?' MB/s':' Mb/s'):'—');
  coverage.textContent=seconds?'Volume nos intervalos medidos · '+number(seconds,1)+' s de cobertura':'Aguardando intervalos medidos para calcular o volume.';
 }
 $('#pro-unit').value=prefs.networkUnit==='bytes'?'bytes':'bits';
 const header=root.querySelector('.perf-header');header.querySelector('h1').textContent='Cada detalhe, em movimento.';header.querySelector('p:not(.eyebrow)').textContent='Rede, memória e processamento com contexto e histórico.';
 header.querySelector('div:last-child').insertAdjacentHTML('beforeend','<button id="pro-speed-test">Teste de internet</button>');
 $('#pro-speed-test').onclick=()=>{networkPanel();const note=panel.querySelector('.inline-note');if(note)note.textContent=PeepMetrics.isNative?'Este teste gera tráfego e mede a conexão deste aplicativo na TV. O gráfico de Performance mostra apenas o uso corrente da rede.':'Este teste mede a internet deste navegador no Mac. As leituras de Performance pertencem à TV.';};
 const memory=root.querySelector('.perf-gauge:not(.perf-network-hero)');memory.insertAdjacentHTML('beforeend','<div class="pro-app-memory"><span>Peep · processo principal</span><b id="pro-app-pss">Leitura no app da TV</b><small>PSS do processo; o renderizador WebView pode usar memória adicional.</small></div>');
 const samples=[];let inspection=-1,signature='',lastSnapshot=null;
 const number=(n,d=2)=>Number.isFinite(n)?n>0&&n<.001?'<0,001':n.toLocaleString('pt-BR',{maximumFractionDigits:n>0&&n<.01?Math.max(3,d):d,minimumFractionDigits:n>0&&n<.01?3:0}):'—';
 const unit=()=>$('#pro-unit').value==='bytes'?8:1;
 function stamp(at){return new Date(at*1000).toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',second:'2-digit'})}
 function upper(value){const raw=Math.max(.02,value),power=10**Math.floor(Math.log10(raw)),base=raw/power;return (base<=1?1:base<=2?2:base<=5?5:10)*power}
 function path(points){return points.map((p,i)=>i===0?'M'+p.join(','):'C'+[points[i-1][0]+(p[0]-points[i-1][0])*.35,points[i-1][1],p[0]-(p[0]-points[i-1][0])*.35,p[1],...p].join(',')).join(' ')}
 function draw(){updateConsumption();const factor=unit(),label=factor===8?'MB/s':'Mb/s';root.querySelectorAll('.pro-unit').forEach(el=>el.textContent=label);const max=upper(Math.max(0,...samples.map(s=>Math.max(s.down,s.up)))/factor),first=samples[0],last=samples.at(-1);richSetText('pro-scale-max',number(max));richSetText('pro-scale-mid',number(max/2));const duration=last&&first?last.at-first.at:0;const coords=key=>samples.map((s,i)=>[duration?((s.at-first.at)/duration)*640:320,158-Math.min(1,s[key]/factor/max)*146]);const down=coords('down'),up=coords('up');for(const [key,points]of [['down',down],['up',up]]){const d=points.length>1?path(points):'';$('#pro-'+key+'-line').setAttribute('d',d);$('#pro-'+key+'-area').setAttribute('d',d?d+'L640 158H0Z':'')};$('#pro-plot-empty').hidden=samples.length>=2;richSetText('pro-start',first?stamp(first.at):'Sem amostras');richSetText('pro-end',last?stamp(last.at):'Agora');richSetText('pro-window',samples.length?Math.round(duration)+' s · '+samples.length+' amostras reais':'Histórico desta sessão · escala automática');
  const idx=inspection>=0?Math.min(samples.length-1,inspection):samples.length-1,point=samples[idx],tip=$('#pro-tooltip');tip.hidden=inspection<0||!point;for(const [key,points]of [['down',down],['up',up]]){const dot=$('#pro-'+key+'-dot'),p=points[idx];dot.style.display=p?'':'none';if(p){dot.setAttribute('cx',p[0]);dot.setAttribute('cy',p[1])}}if(point&&inspection>=0){$('#pro-crosshair').setAttribute('d','M'+down[idx][0]+' 6V160');tip.textContent=stamp(point.at)+' · ↓ '+number(point.down/factor)+' · ↑ '+number(point.up/factor)+' '+label;tip.style.left=Math.max(15,Math.min(65,down[idx][0]/640*100))+'%'}else $('#pro-crosshair').setAttribute('d','');
 }
 function paint(){const d=PeepMetrics.latest,lastAge=d?Date.now()/1000-d.at:Infinity,valid=d?.connected&&!tvError&&lastAge<12,n=d?.network||{},traffic=valid?n.traffic:null,interval=PeepMetrics.isNative?2:5;
  $('#pro-live').dataset.active=String(!!valid);richSetText('pro-live',valid?(PeepMetrics.isNative?'Local':'ADB')+' · '+interval+' s':'Sem leitura atual');richSetText('pro-down',number(traffic?.downloadMbps/unit()));richSetText('pro-up',number(traffic?.uploadMbps/unit()));
  if(valid&&traffic&&Number.isFinite(traffic.downloadMbps)&&Number.isFinite(traffic.uploadMbps)&&d.at!==lastSnapshot){lastSnapshot=d.at;samples.push({at:d.at,seconds:traffic.intervalSeconds,down:Math.max(0,traffic.downloadMbps),up:Math.max(0,traffic.uploadMbps)});if(samples.length>90)samples.shift()}
  const rssi=valid&&Number.isFinite(n.rssi)?n.rssi:null;richSetText('pro-rssi',rssi===null?'— dBm':rssi+' dBm');richSetText('pro-quality',!valid?'Sem sinal atual':n.transport==='Ethernet'?'Conexão por cabo':rssi===null?'Sinal não informado':rssi>=-55?'Excelente':rssi>=-67?'Bom':rssi>=-75?'Regular':'Fraco');richSetText('pro-link',valid&&Number.isFinite(n.rxLinkMbps)&&Number.isFinite(n.txLinkMbps)?n.rxLinkMbps+' / '+n.txLinkMbps:'Não informado');richSetText('pro-band',valid&&Number.isFinite(n.frequencyMHz)?(n.frequencyMHz/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})+' GHz':'—');
  richSetText('pro-app-pss',Number.isFinite(d?.appMemory?.pssKiB)?number(d.appMemory.pssKiB/1024,1)+' MiB PSS':'Leitura no app da TV');root.querySelector('.perf-footnote').textContent='Rede e RAM: '+interval+' s. CPU: 15 s por ADB. Histórico de rede limitado a 90 pontos. Tráfego total do dispositivo; não representa a velocidade contratada. Nenhum aplicativo é encerrado.';
  const sign=JSON.stringify([lastSnapshot,inspection,$('#pro-unit').value]);if(sign!==signature){signature=sign;draw()}
 }
 const plot=$('#pro-network-plot');plot.onpointermove=e=>{if(!samples.length)return;const ratio=(e.clientX-plot.getBoundingClientRect().left)/plot.clientWidth;const next=Math.max(0,Math.min(samples.length-1,Math.round(ratio*(samples.length-1))));if(next===inspection)return;inspection=next;signature='';draw()};plot.onpointerleave=()=>{inspection=-1;signature='';draw()};plot.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Escape'].includes(e.key))return;e.preventDefault();e.stopPropagation();inspection=e.key==='Escape'?-1:Math.max(0,Math.min(samples.length-1,(inspection<0?samples.length-1:inspection)+(e.key==='ArrowLeft'?-1:1)));signature='';draw()};$('#pro-unit').onchange=()=>{prefs.networkUnit=$('#pro-unit').value;save();signature='';paint()};
 window.addEventListener('peep-metrics-stale',paint);const base=PeepPerformance.paint;PeepPerformance.paint=()=>{base();paint()};
 const previousNavigate=navigate;navigate=function(next){previousNavigate(next);if(next==='performance')paint()};document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>navigate(b.dataset.page));PeepRuntime.job('performance-age',5000,paint,()=>page==='performance'&&!livingIdleActive);window.PeepPerformance.pro={samples,paint};
})();
