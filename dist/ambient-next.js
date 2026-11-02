/* Ambiente 0.16.2 — visual climate, real forecast ranges and source-aware markets. */
(()=>{
 'use strict';
 const root=$('#ambient-dashboard');if(!root)return;root.classList.add('amb-next');
 const oldHero=root.querySelector('.ambient-hero'),oldHeading=root.querySelector('.ambient-heading');
 const clock=$('#living-clock'),date=$('#living-date'),climate=$('#living-weather'),title=$('#ambient-title'),refresh=$('#refresh-markets');
 const header=document.createElement('div');header.className='amb-header';header.innerHTML='<div class="amb-heading"><p class="eyebrow">AMBIENTE · CONTAGEM, MG</p></div><div class="amb-clock"></div><div class="amb-refresh-control"><small id="amb-last-sync">Aguardando consulta</small></div>';
 header.querySelector('.amb-heading').append(title);title.textContent='O seu dia, em cores.';header.querySelector('.amb-heading').insertAdjacentHTML('beforeend','<p class="amb-subtitle">Lá fora, no mundo e no seu ritmo.</p>');header.querySelector('.amb-clock').append(clock,date);refresh.innerHTML='<span class="amb-refresh-icon"><svg class="living-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M5.5 8a7 7 0 0 1 12-3l2.5 3M4 16l2.5 3a7 7 0 0 0 12-3"/></svg></span><span>Atualizar</span>';header.querySelector('.amb-refresh-control').append(refresh);root.prepend(header);
 const main=document.createElement('div');main.className='amb-main-grid';main.innerHTML='<article class="amb-weather-card" aria-label="Clima e previsão para Contagem"><div class="amb-weather-heading"><span>CONTAGEM, MINAS GERAIS</span><span id="amb-weather-state" class="amb-state">Consultando</span></div><div class="amb-weather-now"></div><div id="amb-forecast" class="amb-forecast"></div><div class="amb-weather-source"><span id="amb-weather-source">Open-Meteo · aguardando referência</span><span id="amb-weather-fetch">Consulta pendente</span></div></article>';
 // Conditions take the visual space; source details stay in a compact audit strip.
 const sources=document.createElement('aside');sources.className='amb-source-card';sources.setAttribute('aria-label','Fontes e intervalos de atualização');
 sources.innerHTML='<div><span class="amb-source-label">FONTES & HORÁRIOS</span><p id="amb-source-summary">Verificando as fontes</p></div><div class="amb-source-intervals"><span>Clima <b>10 min</b></span><span>Cotações <b>5 min</b></span><span>TV <b>15 s</b></span></div><button id="amb-audit" class="amb-audit">Ver detalhes '+livingIcon('arrow')+'</button>';
 const conditions=document.createElement('aside');conditions.className='amb-conditions-card';conditions.setAttribute('aria-label','Umidade, vento e sensação térmica');
 conditions.innerHTML='<div class="amb-conditions-heading"><p class="eyebrow">A ATMOSFERA AGORA</p><h3>Sinta o dia.</h3></div><div class="amb-condition-grid"><div class="amb-humidity-tile"><span class="amb-metric-title">Umidade</span><div class="amb-humidity-dial"><svg viewBox="0 0 100 100" role="img" aria-label="Umidade indisponível" id="amb-humidity-gauge"><circle class="amb-gauge-track" cx="50" cy="50" r="41"/><circle class="amb-gauge-value" cx="50" cy="50" r="41" pathLength="100" stroke-dasharray="0 100"/></svg><strong id="amb-humidity">—</strong></div><small>Umidade relativa</small></div><div class="amb-wind-tile"><span class="amb-metric-title">Vento</span><div class="amb-wind-art" aria-hidden="true"><i></i><i></i><i></i></div><strong id="amb-wind">—</strong><small>km/h · modelo</small></div></div><div class="amb-feels-line"><span><svg class="living-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Zm3 3v10"/><circle cx="12" cy="18" r="1.6" fill="currentColor" stroke="none"/></svg><span>Sensação térmica<small id="amb-feels-note">Aguardando o modelo</small></span></span><strong id="amb-feels">—</strong></div>';
 main.append(conditions);header.after(main);main.querySelector('.amb-weather-now').append(climate);
 main.querySelector('.amb-weather-card').insertAdjacentHTML('afterbegin','<div class="amb-weather-atmosphere" aria-hidden="true"><i></i><i></i><i></i></div>');
 main.querySelector('#amb-forecast').insertAdjacentHTML('beforebegin','<div class="amb-forecast-heading"><span>PRÓXIMOS DIAS</span><small>Mínima e máxima previstas</small></div>');
 climate.innerHTML='<span id="amb-weather-art"><i class="amb-weather-halo" aria-hidden="true"></i><span class="amb-weather-glyph">'+richWeatherIcon(null)+'</span></span><span class="amb-main-temperature"><small class="amb-now-label">LÁ FORA, AGORA</small><b id="living-temperature">—°</b><small id="living-weather-description">Clima indisponível</small></span><span class="amb-weather-range" id="amb-weather-range">Hoje — / —</span>';
 climate.setAttribute('aria-label','Ver detalhes do clima em Contagem');climate.onclick=()=>weatherPanel();
 const markets=root.querySelector('.market-grid');markets.classList.add('amb-markets');main.after(markets);
 const marketHeading=document.createElement('div');marketHeading.className='amb-market-heading';marketHeading.innerHTML='<div><p class="eyebrow">O MUNDO EM MOVIMENTO</p><h3>Um olhar para o mercado.</h3></div><span>Referências externas · podem ter atraso</span>';markets.before(marketHeading);
 $('#market-status').after(sources);
 for(const id of ['usd','ibov','usdc']){const card=$('#market-'+id);card.insertAdjacentHTML('beforeend','<span class="amb-quote-meta"><b id="amb-'+id+'-state">Aguardando</b><span id="amb-'+id+'-reference">Sem referência</span><small id="amb-'+id+'-fetch">Sem consulta</small></span>');}
 const device=document.createElement('div');device.className='amb-device-strip';device.innerHTML='<span class="amb-device-identity"><i id="amb-tv-dot"></i><b>Sua Konka</b><small id="amb-tv-age">Sem leitura</small></span><button id="amb-tv-network">'+livingIcon('wifi')+'<span id="amb-tv-network-value">Rede sem leitura</span></button><button id="amb-tv-memory">'+livingIcon('memory')+'<span id="amb-tv-memory-value">RAM sem leitura</span></button><button id="amb-tv-bluetooth">'+livingIcon('bluetooth')+'<span id="amb-tv-bt-value">Bluetooth sem leitura</span></button>';
 $('#market-status').after(device);$('#amb-tv-network').onclick=()=>networkPanel();$('#amb-tv-memory').onclick=()=>systemPanel();$('#amb-tv-bluetooth').onclick=()=>horizonBluetoothPanel();
 oldHero.remove();oldHeading.remove();
 let marketError='',weatherBusy=false,refreshing=false,weatherAttempt=null,marketsAttempt=null,lastWeatherPaint='',lastFreshness=0;
 const nowSeconds=()=>Date.now()/1000;
 function epoch(value){return Number.isFinite(value)&&value>0?value:null}
 function timeText(at){return epoch(at)?new Date(at*1000).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'não informado'}
 function ageText(at){if(!epoch(at))return'sem horário';const seconds=Math.max(0,nowSeconds()-at);return seconds<60?'agora':seconds<3600?'há '+Math.floor(seconds/60)+' min':seconds<86400?'há '+Math.floor(seconds/3600)+' h':'há '+Math.floor(seconds/86400)+' dias'}
 function weatherSourceTime(){if(epoch(weather?.sourceAt))return weather.sourceAt;const t=weather?.current?.time;if(typeof t!=='string')return null;const parsed=Date.parse(t+(/(?:Z|[+-]\d{2}:\d{2})$/.test(t)?'':'-03:00'));return Number.isFinite(parsed)?parsed/1000:null}
 function weatherFetchTime(){return epoch(weather?.fetchedAt)||epoch(weather?.savedAt/1000)}
 function quoteState(item){
  if(!item?.ok)return{kind:'missing',text:'Indisponível'};
  if(!Number.isFinite(item.value)||item.value<=0||(item.brl!==undefined&&(!Number.isFinite(item.brl)||item.brl<=0))||['sourceAt','fetchedAt'].some(k=>epoch(item[k])&&item[k]>nowSeconds()+300))return{kind:'missing',text:'Dado inconsistente'};
  if(marketError||item.stale||item.lastFetchFailed||!epoch(item.fetchedAt)||nowSeconds()-item.fetchedAt>360)return{kind:'stale',text:'Último dado salvo'};
  if(epoch(item.sourceAt)&&nowSeconds()-item.sourceAt>1800)return{kind:'reference',text:'Referência anterior'};
  return{kind:'received',text:epoch(item.sourceAt)?'Referência recebida':'Consulta recente'};
 }
 function climateArt(code,night){
  if(!Number.isFinite(code))return '<svg class="amb-climate-art" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="32" fill="#d3e5f018" stroke="#cde6f2" stroke-width="3"/><path d="M45 60h30" stroke="#cde6f2" stroke-width="4" stroke-linecap="round"/></svg>';
  const clear=code===0,partly=code>0&&code<=2,rain=code>=51&&code<=67||code>=80&&code<=82,snow=code>=71&&code<=77||code>=85&&code<=86,storm=code>=95,fog=code===45||code===48;
  const defs='<defs><radialGradient id="amb-solar-fill" cx=".32" cy=".25" r=".8"><stop stop-color="#fff6c3"/><stop offset=".5" stop-color="#ffd179"/><stop offset="1" stop-color="#ec945d"/></radialGradient><linearGradient id="amb-cloud-fill" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#f4fcff"/><stop offset=".48" stop-color="#cde6f5"/><stop offset="1" stop-color="'+(night?'#8f97ce':'#88bad9')+'"/></linearGradient></defs>';
  const orb=night?'<path d="M82 25a29 29 0 1 0 15 44A30 30 0 0 1 82 25Z" fill="#e8dfff" stroke="#faf4ff" stroke-width="1.5"/>':'<circle cx="60" cy="53" r="34" fill="#ffd88414"/><circle cx="60" cy="53" r="26" fill="url(#amb-solar-fill)"/><circle cx="53" cy="46" r="18" fill="#fff1b31a"/>';
  const cloud='<path d="M28 85a18 18 0 0 1-1-36 26 26 0 0 1 49-6 21 21 0 1 1 13 42Z" fill="url(#amb-cloud-fill)" stroke="#e3f4ff" stroke-width="1.2"/><path d="M29 81h59" stroke="#6397b7" stroke-opacity=".24" stroke-width="3" stroke-linecap="round"/>';
  const drops=rain?'<g fill="#88ddff"><path d="m37 91-7 11a4 4 0 0 0 7 3l6-12Z"/><path d="m60 91-7 11a4 4 0 0 0 7 3l6-12Z"/><path d="m83 91-7 11a4 4 0 0 0 7 3l6-12Z"/></g>':snow?'<path d="M36 92v15m-6-12 12 9m-12 0 12-9m40-3v15m-6-12 12 9m-12 0 12-9" stroke="#d9edff" stroke-width="2.5"/>':storm?'<path d="m65 70-18 24h14l-7 21 28-30H67l9-15Z" fill="#ffda81"/>':fog?'<path d="M22 94h68M32 104h66" stroke="#c8dfec" stroke-width="4" stroke-linecap="round"/>':'';
  return '<svg class="amb-climate-art" viewBox="0 0 120 120" aria-hidden="true">'+defs+(clear?orb:partly?'<g transform="translate(34 -5) scale(.65)">'+orb+'</g>'+cloud:cloud)+drops+'</svg>';
 }
 function paintMarketTimes(){
  let valid=0,older=0;
  for(const id of ['usd','ibov','usdc']){const item=marketData?.items?.[id],state=quoteState(item);$('#market-'+id).dataset.freshness=state.kind;richSetText('amb-'+id+'-state',state.text);richSetText('amb-'+id+'-reference',item?.ok?(item.source+' · '+(epoch(item.sourceAt)?'fonte '+timeText(item.sourceAt):'horário da fonte não informado')):item?.error||'A fonte não respondeu');richSetText('amb-'+id+'-fetch',item?.ok?'Consultado '+timeText(item.fetchedAt)+' · '+ageText(item.fetchedAt):'Nenhum valor estimado');if(item?.ok){valid++;if(state.kind==='reference'||state.kind==='stale')older++}}
  const fetched=['usd','ibov','usdc'].map(k=>marketData?.items?.[k]?.fetchedAt).filter(epoch);const last=fetched.length?Math.max(...fetched):null;
  richSetText('amb-last-sync',last?'Cotações consultadas '+ageText(last):'Cotações sem consulta');richSetText('amb-source-summary',marketError?'A última consulta de cotações falhou':valid?valid+'/3 fontes disponíveis'+(older?' · '+older+' referências anteriores':''):'Aguardando fontes externas');
  richSetText('market-status',marketError?'Não foi possível renovar as cotações. Os valores salvos estão identificados nos cards.':valid+' de 3 fontes responderam. Consulte o horário de cada referência; consultar agora não torna a cotação instantânea.');
  for(const id of ['usd','ibov','usdc']){
   const card=$('#market-'+id),visual=card.querySelector('.market-visual'),item=marketData?.items?.[id];
   const count=id==='ibov'?(item?.history||[]).filter(p=>Number.isFinite(p?.value)).length:marketSeries[id].length;
   const available=!!item?.ok&&count>=2;visual.dataset.history=String(available);
   const chart=visual.querySelector('svg');chart.toggleAttribute('hidden',!available);
   const caption=visual.querySelector('small');
   if(id==='ibov')caption.textContent=available?count+' pregões · Yahoo Finance':'Histórico indisponível';
   else if(!available)caption.textContent=item?.ok?'A curva aparece após duas consultas':'Sem histórico disponível';
  }
 }
 function paintAmbientWeather(){
  const current=weather?.current,sourceAt=weatherSourceTime(),fetched=weatherFetchTime();
  const stale=weatherError||weather?.stale||!epoch(fetched)||nowSeconds()-fetched>660||!!(sourceAt&&nowSeconds()-sourceAt>7200);
  const future=sourceAt&&sourceAt>nowSeconds()+300,valid=Number.isFinite(current?.temperature_2m)&&!future;
  richSetText('amb-weather-state',!valid?'Indisponível':stale?'Últimos dados salvos':'Referência do modelo');$('#amb-weather-state').dataset.state=!valid?'missing':stale?'stale':'received';
  richSetText('living-temperature',valid?Math.round(current.temperature_2m)+'°':'—°');richSetText('living-weather-description',valid?weatherDescription(current.weather_code):'Clima indisponível');
  const humidity=valid&&Number.isFinite(current.relative_humidity_2m)&&current.relative_humidity_2m>=0&&current.relative_humidity_2m<=100?current.relative_humidity_2m:null;
  const wind=valid&&Number.isFinite(current.wind_speed_10m)&&current.wind_speed_10m>=0?current.wind_speed_10m:null;
  const feels=valid&&Number.isFinite(current.apparent_temperature)?current.apparent_temperature:null;
  richSetText('amb-feels',richWeatherNumber(feels,'°'));richSetText('amb-humidity',richWeatherNumber(humidity,'%'));richSetText('amb-wind',richWeatherNumber(wind));
  $('#amb-humidity-gauge .amb-gauge-value').setAttribute('stroke-dasharray',(humidity??0)+' 100');
  $('#amb-humidity-gauge').setAttribute('aria-label',humidity===null?'Umidade indisponível':'Umidade relativa: '+Math.round(humidity)+'%');
  conditions.dataset.wind=wind===null?'missing':wind===0?'still':'moving';conditions.dataset.available=String(valid);
  const difference=feels===null?null:Math.round(feels)-Math.round(current.temperature_2m);
  richSetText('amb-feels-note',difference===null?'Sem leitura de sensação':difference===0?'Próxima da temperatura':Math.abs(difference)+'° '+(difference>0?'acima':'abaixo')+' da temperatura');
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),todayIndex=weather?.daily?.time?.indexOf(today)??-1;
  richSetText('amb-weather-range',todayIndex>=0?'Hoje '+richWeatherNumber(weather.daily.temperature_2m_min?.[todayIndex],'°')+' / '+richWeatherNumber(weather.daily.temperature_2m_max?.[todayIndex],'°'):'Sem previsão para hoje');
  richSetText('amb-weather-source','Open-Meteo · modelo '+timeText(sourceAt));richSetText('amb-weather-fetch',(weather?.fetchedAt?'Consultado ':'Recebido pelo app ')+timeText(fetched)+(stale?' · dados anteriores':''));
  const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',hourCycle:'h23',hour:'numeric'}).format(new Date())),night=hour>=18||hour<6;
  const sign=JSON.stringify([current?.weather_code,weather?.daily,valid,night,today]);if(sign===lastWeatherPaint)return;lastWeatherPaint=sign;
  const code=valid?current.weather_code:null;
  main.querySelector('.amb-weather-card').dataset.sky=!Number.isFinite(code)?'unknown':night?'night':code>=51?'rain':code===0?'clear':'cloudy';
  $('#amb-weather-art .amb-weather-glyph').innerHTML=climateArt(code,night);
  const target=$('#amb-forecast');target.replaceChildren();
  const daily=weather?.daily,days=(daily?.time||[]).slice(0,3).map((day,index)=>({day,index,low:daily.temperature_2m_min?.[index],high:daily.temperature_2m_max?.[index]})).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d.day)&&Number.isFinite(Date.parse(d.day+'T12:00:00-03:00')));
  const hasRange=d=>Number.isFinite(d.low)&&Number.isFinite(d.high)&&d.high>=d.low;
  const ranges=days.filter(hasRange),floor=Math.min(...ranges.map(d=>d.low)),ceiling=Math.max(...ranges.map(d=>d.high)),span=ceiling-floor||1;
  for(const {day,index,low,high}of days){
   const label=day===today?'Hoje':Date.parse(day+'T00:00:00Z')-Date.parse(today+'T00:00:00Z')===86400000?'Amanhã':new Date(day+'T12:00:00-03:00').toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo',weekday:'short'}),validRange=hasRange({low,high});
   const el=document.createElement('span');el.className='amb-forecast-day';
   el.innerHTML='<span class="amb-day-heading"><b>'+escapeHTML(label)+'</b>'+richWeatherIcon(daily.weather_code?.[index])+'</span><span class="amb-day-temperatures"><small>'+richWeatherNumber(validRange?low:null,'°')+'</small><strong>'+richWeatherNumber(validRange?high:null,'°')+'</strong></span><span class="amb-temperature-range" role="img" aria-label="'+escapeHTML(validRange?label+': mínima '+Math.round(low)+'°, máxima '+Math.round(high)+'°':'Faixa de temperatura indisponível')+'">'+(validRange?'<b style="left:'+((low-floor)/span*100)+'%;width:'+((high-low)/span*100)+'%"></b>':'')+'</span>';
   target.append(el)
  }
  if(!days.length)target.innerHTML='<span class="amb-forecast-empty">Previsão diária indisponível</span>';
 }
 function paintDevices(){const d=liveTV,ok=d&&!tvError&&nowSeconds()-d.at<45;$('#amb-tv-dot').classList.toggle('connected',!!ok);richSetText('amb-tv-age',d?(ok?'Lido ':'Última leitura ')+timeText(d.at):'Sem leitura');richSetText('amb-tv-network-value',ok?(d.network?.transport||'Rede')+(Number.isFinite(d.network?.rssi)?' · '+d.network.rssi+' dBm':''):'Rede sem leitura atual');const total=d?.ram?.totalBytes,available=d?.ram?.availableBytes;richSetText('amb-tv-memory-value',ok&&total&&Number.isFinite(available)?Math.round((1-available/total)*100)+'% RAM · '+gib(available)+' GiB livres':'RAM sem leitura atual');paintBluetoothCount()}
 function paintBluetoothCount(){const d=horizonBluetooth,count=d.devices?.length||0,available=typeof PeepTV!=='undefined'&&typeof PeepTV.bluetoothStatus==='function';const label=!available?'Bluetooth · leitura na TV':d.state==='permission'?'Bluetooth · autorizar':d.state==='off'?'Bluetooth desativado':count?'Bluetooth · '+count+' conectado'+(count>1?'s':''):d.state==='ready'?'Bluetooth · nenhum detectado':'Bluetooth · consultando';richSetText('amb-tv-bt-value',label);richSetText('hub-bt-count',label);const badge=$('#bluetooth-pill .amb-bt-count');badge.hidden=!available||count===0;badge.textContent=String(count);$('#hub-bluetooth')?.setAttribute('aria-label',label);}
 const hubBT=document.createElement('button');hubBT.id='hub-bluetooth';hubBT.className='hub-bt-summary';hubBT.innerHTML=livingIcon('bluetooth')+'<span id="hub-bt-count">Bluetooth · leitura na TV</span>';hub.querySelector('.hub-heading').append(hubBT);hubBT.onclick=()=>horizonBluetoothPanel();btButton.insertAdjacentHTML('beforeend','<span class="amb-bt-count" hidden></span>');
 const baseBT=horizonReadBluetooth;horizonReadBluetooth=function(){baseBT();paintBluetoothCount()};
 const baseMarkets=paintMarkets;paintMarkets=function(){baseMarkets();paintMarketTimes()};
 loadMarkets=async function(force=false){if(marketsBusy)return;marketsBusy=true;marketsAttempt=nowSeconds();refresh.disabled=true;try{const data=await localJSON('/api/markets'+(force?'?force=1':''));if(!data||typeof data.items!=='object')throw Error('Resposta de cotações incompleta.');const previous=marketData?.items||{};for(const id of ['usd','ibov','usdc']){if(data.items[id]?.ok&&quoteState(data.items[id]).kind==='missing')data.items[id]={ok:false,error:'Valor ou horário inconsistente na fonte.'};if(!data.items[id]?.ok&&previous[id]?.ok)data.items[id]={...previous[id],stale:true,lastFetchFailed:true};else if(data.items[id]?.ok)data.items[id].lastFetchFailed=false;}marketData=data;marketError='';paintMarkets()}catch(error){marketError=error.message;paintMarketTimes()}finally{marketsBusy=false;if(!refreshing)refresh.disabled=false}};
 loadWeather=async function(force=false){
  if(weatherBusy||(!force&&weatherAttempt&&nowSeconds()-weatherAttempt<60))return;const fetched=weatherFetchTime();if(!force&&weather&&!weatherError&&fetched&&nowSeconds()-fetched<600)return;
  weatherBusy=true;weatherAttempt=nowSeconds();
  try{const data=await localJSON('/api/weather'+(force?'?force=1':''));if(!Number.isFinite(data.current?.temperature_2m)||!Array.isArray(data.daily?.time))throw Error('Clima incompleto');weather={...data,savedAt:Date.now()};weatherError=!!data.sourceError;displayWeather();try{localStorage.setItem('konka-weather',JSON.stringify(weather))}catch{}}
  catch(error){weatherError=true;if(weather)displayWeather()}finally{weatherBusy=false;lastWeatherPaint='';paintAmbientWeather();paintLivingClock()}
 };
 async function refreshAll(){if(refreshing||refresh.disabled)return;refreshing=true;refresh.disabled=true;refresh.setAttribute('aria-busy','true');try{await Promise.allSettled([loadMarkets(true),loadWeather(true),refreshTV()]);paintDevices()}finally{refreshing=false;refresh.disabled=false;refresh.setAttribute('aria-busy','false')}}
 refresh.onclick=refreshAll;
 function auditPanel(){show('<p class="eyebrow">ORIGEM E ATUALIZAÇÃO</p><h2>O horário faz parte do dado.</h2><p>Consultado é o momento em que o serviço recebeu a resposta. Fonte é o horário publicado pelo provedor. Um valor pode ser consultado agora e ainda representar uma referência anterior.</p><dl class="system-table"><dt>Clima · referência</dt><dd>'+escapeHTML(timeText(weatherSourceTime()))+'</dd><dt>Clima · consulta externa</dt><dd>'+escapeHTML(timeText(weatherFetchTime()))+'</dd><dt>Última tentativa de clima</dt><dd>'+escapeHTML(timeText(weatherAttempt))+'</dd><dt>Última tentativa de cotações</dt><dd>'+escapeHTML(timeText(marketsAttempt))+'</dd></dl><p>Clima: modelo Open-Meteo para coordenadas aproximadas de Contagem, consultado a cada 10 minutos. Cotações: consulta e cache de 5 minutos. O botão Atualizar agora tenta renovar as fontes; há um intervalo mínimo de 30 segundos entre renovações manuais.</p><p>AwesomeAPI: USD/BRL de compra. Yahoo Finance: Ibovespa e até cinco pregões. Coinbase: referência de USDC; não informa um horário próprio da cotação. Não há garantia de preço de negociação ou medição meteorológica no local.</p><p class="inline-note">Falhas mantêm o último dado identificado como salvo. A interface não confirma independentemente a exatidão dos provedores. RAM e rede são leituras da TV; o tráfego de rede não é um teste da velocidade contratada.</p>')}
 $('#amb-audit').onclick=auditPanel;
 const baseDetails=marketDetails;marketDetails=function(id){baseDetails(id);const item=marketData?.items?.[id];if(item?.ok)$('#panel-content').insertAdjacentHTML('beforeend','<dl class="system-table"><dt>Estado</dt><dd>'+escapeHTML(quoteState(item).text)+'</dd><dt>Horário da fonte</dt><dd>'+escapeHTML(epoch(item.sourceAt)?timeText(item.sourceAt):'Não informado pelo provedor')+'</dd><dt>Consulta externa</dt><dd>'+escapeHTML(timeText(item.fetchedAt))+'</dd></dl>')};
 const baseWeatherDisplay=displayWeather;displayWeather=function(){baseWeatherDisplay();paintAmbientWeather()};
 const baseSystemPaint=paintSystem;paintSystem=function(){baseSystemPaint();if(page==='ambient')paintDevices()};
 const baseRefreshTV=refreshTV;refreshTV=async function(){if(livingIdleActive)return;return baseRefreshTV()};
 const baseNavigate=navigate;navigate=function(next){baseNavigate(next);if(next==='ambient'){loadWeather();refreshTV();paintAmbientWeather();paintMarketTimes();paintDevices()}};document.querySelectorAll('[data-page]').forEach(button=>button.onclick=()=>navigate(button.dataset.page));
 const baseClock=paintLivingClock;paintLivingClock=function(){baseClock();if(page==='ambient'&&Date.now()-lastFreshness>10000){lastFreshness=Date.now();paintAmbientWeather();paintMarketTimes();paintDevices()}};
 setInterval(()=>{if(document.hidden)return;if(page==='ambient'&&!livingIdleActive)refreshTV();if(!weatherBusy&&(!weatherFetchTime()||nowSeconds()-weatherFetchTime()>=600))loadWeather()},15000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&page==='ambient'){loadWeather();loadMarkets();refreshTV()}});
 if(typeof IntersectionObserver==='function'){
  const visibility=new IntersectionObserver(entries=>{for(const entry of entries)entry.target.classList.toggle('amb-offscreen',!entry.isIntersecting)});
  visibility.observe(main.querySelector('.amb-weather-card'));visibility.observe(conditions);
 }
 window.PeepAmbient={refresh:refreshAll,audit:auditPanel,quoteState,timeText,weatherSourceTime};
 $('#help').textContent='Peep Connect · 0.14';
 paintAmbientWeather();paintMarketTimes();paintDevices();
})();
