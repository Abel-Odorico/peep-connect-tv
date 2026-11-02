/* Descanso 0.12: informações reais do clima existente; interação sem sair da tela. */
const richIdleViews=['overview','forecast','essential'];
let richIdleIndex=Math.max(0,richIdleViews.indexOf(prefs.idleView)),richWeatherSignature='',richClickGuard=0,richLastPointerAt=0,richRefreshBusy=false;
function richWeatherIcon(code,night=false){
 const sun='<g class="rich-sun"><circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4.2 4.2l2.1 2.1m11.4 11.4 2.1 2.1m0-15.6-2.1 2.1M6.3 17.7l-2.1 2.1"/></g>';
 const moon='<path class="rich-moon" d="M19 15A8 8 0 0 1 9 4a8 8 0 1 0 10 11Z"/>';
 const cloud='<path class="rich-cloud" d="M6 18a4 4 0 0 1-.5-8A6 6 0 0 1 17 8a5 5 0 1 1 1 10Z"/>';
 const rain='<g class="rich-rain"><path d="m7 20-1 3m6-3-1 3m6-3-1 3"/></g>';
 const snow='<path class="rich-snow" d="M7 20v3m-1.5-1.5h3M17 20v3m-1.5-1.5h3"/>';
 const fog='<path class="rich-fog" d="M3 19h16M6 22h15"/>';
 const thunder='<path class="rich-thunder" d="m13 14-4 6h4l-2 4 7-7h-5l2-3"/>';
 const valid=Number.isFinite(code);
 const kind=!valid?'unknown':code===0?'clear':code<=2?'partly':code===3?'cloudy':code<=48?'fog':code<=67?'rain':code<=77?'snow':code<=82?'rain':code<=86?'snow':'storm';
 return '<svg class="rich-weather-icon '+kind+'" viewBox="0 0 24 26" aria-hidden="true">'+(!valid?'<circle cx="12" cy="12" r="7"/><path d="M8 12h8"/>':kind==='clear'?(night?moon:sun):kind==='partly'?'<g transform="translate(-2 -3) scale(.8)">'+(night?moon:sun)+'</g>'+cloud:cloud+(kind==='rain'?rain:kind==='snow'?snow:kind==='storm'?thunder:kind==='fog'?fog:''))+'</svg>';
}
function richWeatherNumber(value,suffix=''){return Number.isFinite(value)?Math.round(value)+suffix:'—'}
function richSetText(id,value){const target=$('#'+id);if(target&&target.textContent!==String(value))target.textContent=String(value)}
idle.classList.add('idle-rich');idle.setAttribute('aria-label','Descanso de tela. Use esquerda e direita para alternar. OK ou Voltar retorna.');
idle.innerHTML='<div class="idle-light light-one"></div><div class="idle-light light-two"></div><div class="idle-light light-three"></div><div class="idle-orbit orbit-one"></div><div class="idle-orbit orbit-two"></div><svg class="rich-ribbons" viewBox="0 0 1200 500" preserveAspectRatio="none" aria-hidden="true"><path d="M-80 380C180 50 370 470 650 180S1040 90 1280 230"/><path d="M-100 450C190 180 430 390 720 180S1100 260 1300 40"/></svg><div class="idle-stars" aria-hidden="true">'+Array.from({length:18},(_,i)=>'<i style="--x:'+((i*37+11)%100)+'%;--y:'+((i*23+7)%100)+'%;--delay:'+(i%7)+'s"></i>').join('')+'</div><div class="rich-shell"><header class="rich-header"><span class="rich-identity"><i></i>PEEP CONNECT<small>SEU TEMPO, COM MAIS CALMA</small></span><div class="rich-top-actions"><button data-idle-action="refresh" aria-label="Atualizar previsão do tempo">'+livingIcon('weather')+'</button><button data-idle-action="exit" aria-label="Voltar à TV">'+livingIcon('arrow')+'</button></div></header><div class="rich-main"><section class="rich-time"><p class="rich-greeting" id="rich-greeting">Uma pausa no seu ritmo.</p><time id="idle-clock"></time><p id="idle-date"></p><span id="idle-weather"></span><span class="rich-time-rule"></span></section><section class="rich-current" aria-label="Clima em Contagem"><div class="rich-location"><span class="rich-location-dot"></span>CONTAGEM, MG<small id="rich-weather-age">Aguardando previsão</small></div><div class="rich-current-main"><span id="rich-current-icon">'+richWeatherIcon(null)+'</span><div><strong id="rich-temperature">—°</strong><span id="rich-description">Clima indisponível</span></div></div><div class="rich-feels"><span id="rich-feels">Sensação —</span><span id="rich-range">Hoje — / —</span></div><div class="rich-conditions"><span><i class="rich-drop" aria-hidden="true"></i><b id="rich-humidity">—</b><small>Umidade</small></span><span>'+livingIcon('traffic')+'<b id="rich-wind">—</b><small>Vento</small></span><span>'+livingIcon('weather')+'<b id="rich-maximum">—</b><small>Máxima de hoje</small></span></div></section></div><section class="rich-forecast" aria-label="Previsão dos próximos dias"><div class="rich-forecast-heading"><span>UM OLHAR PARA OS PRÓXIMOS DIAS</span><small>Previsão · Open-Meteo</small></div><div id="rich-forecast-days" class="rich-forecast-days"></div></section><footer class="rich-footer"><div class="rich-pages" role="group" aria-label="Painel da tela de espera"><button data-idle-action="overview" aria-label="Visão geral"><i></i><span>Visão geral</span></button><button data-idle-action="forecast" aria-label="Previsão do tempo"><i></i><span>Previsão</span></button><button data-idle-action="essential" aria-label="Relógio essencial"><i></i><span>Essencial</span></button></div><span class="rich-key-hint">← → Alternar <b>OK</b> Voltar à TV</span><button class="rich-exit" data-idle-action="exit">Voltar à TV '+livingIcon('arrow')+'</button></footer></div>';
function richPaintView(){idle.dataset.view=richIdleViews[richIdleIndex];idle.querySelectorAll('.rich-pages button').forEach((button,i)=>{button.setAttribute('aria-pressed',String(i===richIdleIndex))});prefs.idleView=richIdleViews[richIdleIndex];save()}
function richPaintWeather(){
 const hour=new Date().getHours();idle.dataset.sky=hour>=18||hour<6?'night':'day';
 richSetText('rich-greeting',hour>=18?'A noite pode esperar.':hour<6?'Um instante de tranquilidade.':hour<12?'O dia começa no seu ritmo.':'Um tempo para respirar.');
 const signature=JSON.stringify([weather?.savedAt,weather?.current,weather?.daily,weatherError,idle.dataset.sky]);if(signature===richWeatherSignature)return;richWeatherSignature=signature;
 const current=weather?.current,daily=weather?.daily;
 $('#rich-current-icon').innerHTML=richWeatherIcon(current?.weather_code,idle.dataset.sky==='night');
 richSetText('rich-temperature',richWeatherNumber(current?.temperature_2m,'°'));richSetText('rich-description',current?(Number.isFinite(current.weather_code)?weatherDescription(current.weather_code):'Condição não informada'):'Clima indisponível');
 richSetText('rich-feels','Sensação '+richWeatherNumber(current?.apparent_temperature,'°'));richSetText('rich-humidity',richWeatherNumber(current?.relative_humidity_2m,'%'));richSetText('rich-wind',richWeatherNumber(current?.wind_speed_10m,' km/h'));richSetText('rich-maximum',richWeatherNumber(daily?.temperature_2m_max?.[0],'°'));
 richSetText('rich-range','Hoje '+richWeatherNumber(daily?.temperature_2m_min?.[0],'°')+' / '+richWeatherNumber(daily?.temperature_2m_max?.[0],'°'));
 const savedAt=weather?.savedAt;if(current){const age=Number.isFinite(savedAt)?new Date(savedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'sem horário';richSetText('rich-weather-age',(weatherError?'Últimos dados · ':'Atualizado às ')+age)}else richSetText('rich-weather-age','Previsão indisponível · tente atualizar');
 const target=$('#rich-forecast-days');target.replaceChildren();
 if(!Array.isArray(daily?.time)||!daily.time.length){target.innerHTML='<p class="rich-no-forecast">A previsão aparecerá quando o serviço de clima estiver disponível.</p>';return}
 daily.time.slice(0,3).forEach((day,i)=>{const article=document.createElement('article');article.className='rich-day';const label=i===0?'Hoje':i===1?'Amanhã':new Intl.DateTimeFormat('pt-BR',{weekday:'long'}).format(new Date(day+'T12:00:00'));article.innerHTML='<div class="rich-day-name"><b>'+escapeHTML(label)+'</b><span>'+escapeHTML(new Date(day+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}))+'</span></div>'+richWeatherIcon(daily.weather_code?.[i])+'<div class="rich-day-values"><strong>'+richWeatherNumber(daily.temperature_2m_max?.[i],'°')+'<small>'+richWeatherNumber(daily.temperature_2m_min?.[i],'°')+'</small></strong><span>'+escapeHTML(Number.isFinite(daily.weather_code?.[i])?weatherDescription(daily.weather_code[i]):'Sem previsão')+'</span></div>';target.append(article)});
}
const richBaseClock=paintLivingClock;paintLivingClock=function(){richBaseClock();richPaintWeather()};
const richBaseEnter=enterLivingIdle;enterLivingIdle=function(){richBaseEnter();if(livingIdleActive){richPaintView();richPaintWeather();idle.style.setProperty('--idle-pointer-x','0px');idle.style.setProperty('--idle-pointer-y','0px')}};
const richBaseWake=wakeLivingIdle;wakeLivingIdle=function(){richClickGuard=Date.now()+350;richBaseWake()};
async function richIdleAction(action){
 if(action==='exit'){wakeLivingIdle();return}
 if(richIdleViews.includes(action)){richIdleIndex=richIdleViews.indexOf(action);richPaintView();return}
 if(action==='refresh'&&!richRefreshBusy){richRefreshBusy=true;const button=idle.querySelector('[data-idle-action=refresh]');button.disabled=true;button.setAttribute('aria-busy','true');richSetText('rich-weather-age','Atualizando previsão…');try{await loadWeather(true)}finally{richRefreshBusy=false;button.disabled=false;button.removeAttribute('aria-busy');richWeatherSignature='';paintLivingClock()}}
}
idle.querySelectorAll('[data-idle-action]').forEach(button=>button.onclick=()=>richIdleAction(button.dataset.idleAction));
const richInputTypes=['keydown','pointerdown','pointermove','wheel','touchstart'];for(const type of richInputTypes)window.removeEventListener(type,livingInput,true);
const richBaseInput=livingInput;
livingInput=function(event){
 if(!livingIdleActive){richBaseInput(event);return}
 const control=event.target?.closest?.('[data-idle-action]');
 if(event.type==='pointermove'){if(prefs.motion===false||prefs.performance==='economy'||window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)return;if(Date.now()-richLastPointerAt<50)return;richLastPointerAt=Date.now();idle.style.setProperty('--idle-pointer-x',Math.max(-7,Math.min(7,(event.clientX/innerWidth-.5)*14))+'px');idle.style.setProperty('--idle-pointer-y',Math.max(-5,Math.min(5,(event.clientY/innerHeight-.5)*10))+'px');return}
 if(event.type==='keydown'){
  if(event.key==='Tab')return;
  event.preventDefault();event.stopImmediatePropagation();
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){const delta=event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:1;richIdleIndex=(richIdleIndex+delta+richIdleViews.length)%richIdleViews.length;richPaintView();return}
  if((event.key==='Enter'||event.key===' ')&&control){richIdleAction(control.dataset.idleAction);return}
  wakeLivingIdle();return;
 }
 if(control&&(event.type==='pointerdown'||event.type==='touchstart'))return;
 if(event.type==='wheel'){event.preventDefault();event.stopImmediatePropagation();return}
 event.preventDefault();event.stopImmediatePropagation();wakeLivingIdle();
};
for(const type of richInputTypes)window.addEventListener(type,livingInput,{capture:true,passive:false});
window.addEventListener('click',event=>{if(Date.now()<richClickGuard){event.preventDefault();event.stopImmediatePropagation()}},{capture:true});
window.PeepIdle={get active(){return livingIdleActive},wake:wakeLivingIdle,show:enterLivingIdle};
const richExistingOptions=livingOptions;livingOptions=function(){return richExistingOptions().replace('Qualquer botão ou movimento do mouse retorna.','Use ← e → para alternar os painéis. OK ou Voltar retorna; o mouse interage com os controles da tela.');};
richPaintView();paintLivingClock();
