/* PUBLIC DEMO ONLY. Illustrative values; never reads a token, account, or TV. */
(()=>{
 'use strict';
 const id='UC'+'D'.repeat(22),start=Date.now()/1000;
 try{localStorage.setItem('konka-glass-v1',JSON.stringify({theme:new URLSearchParams(location.search).get('theme')==='light'?'adl-day':'adl-absolute',navigation:'icons',favorites:['netflix','youtube','prime','disney','spotify'],idleMinutes:0,motion:false,performance:'balanced',wallpaperSource:'landscape'}))}catch{}
 const snapshot=()=>({connected:true,at:Date.now()/1000,source:'Demonstração fictícia',sampleId:1,model:'TV de demonstração',android:'14',ram:{totalBytes:1610612736,availableBytes:450000000},network:{transport:'Wi-Fi',rssi:-52,rxLinkMbps:433,txLinkMbps:433,frequencyMHz:5200,traffic:{downloadMbps:1.24,uploadMbps:.09}},storage:{availableBytes:4200000000},uptimeSeconds:5400});
 window.PeepTV={deviceMetrics:()=>JSON.stringify(snapshot()),installedApps:()=>JSON.stringify([['com.netflix.ninja','Netflix'],['com.google.android.youtube.tv','YouTube'],['com.amazon.amazonvideo.livingroom','Prime Video'],['com.disney.disneyplus','Disney+'],['com.spotify.tv.android','Spotify']].map(([packageName,name])=>({package:packageName,name}))),openDashboard:()=>alert('Esta é uma demonstração. Na Konka, o atalho abre seu Dashboard GestorPeep.'),launchApp:()=>alert('Os aplicativos só são abertos na TV.'),openSettings:()=>{},bluetoothStatus:()=>JSON.stringify({state:'unavailable',devices:[]})};
 const channel={id,title:'Canal demonstrativo',handle:'@demonstracao',subscribers:18720,views:1489000,videoCount:132,at:start,source:'Demonstração fictícia',createdAt:'2023-01-14T00:00:00Z',videos:[{id:'demo0000001',title:'Um experimento, muitas descobertas',views:14870,likes:823,comments:92,duration:'PT12M42S',published:'2026-10-28T13:00:00Z'},{id:'demo0000002',title:'A tecnologia sob um novo olhar',views:9020,likes:615,comments:48,duration:'PT8M5S',published:'2026-10-24T13:00:00Z'}]};
 try{localStorage.setItem('peep-channel-history:'+id,JSON.stringify([5,4,3,2,1].map((day,i)=>({at:start-day*86400,views:1489000-(5-i)*2100,subscribers:18720-(5-i)*18,videoCount:132-1}))))}catch{}
 window.fetch=async input=>{const url=new URL(typeof input==='string'?input:input.url,location.href);let data={};
 if(url.pathname==='/api/health')data={ok:true};
 else if(url.pathname==='/api/system')data=snapshot();
 else if(url.pathname==='/api/performance')data={at:Date.now()/1000,cpu:{usagePercent:28},memory:{Cached:120000000,SwapTotal:200000000,SwapFree:140000000},loadAverage:[.5,.4,.3]};
 else if(url.pathname==='/api/youtube/status')data={connected:true,configured:true,channelStatsVersion:2,active:id,accounts:[{id,title:'Canal demonstrativo',image:''}]};
 else if(url.pathname==='/api/youtube/channel')data=channel;
 else if(url.pathname==='/api/weather')data={fetchedAt:Date.now()/1000,current:{temperature_2m:24,weather_code:2,time:'2026-11-09T12:00',relative_humidity_2m:62,wind_speed_10m:8},daily:{time:['2026-11-09'],temperature_2m_min:[18],temperature_2m_max:[28],weather_code:[2]}};
 else if(url.pathname==='/api/catalog')data={results:[]};
 else if(url.pathname==='/api/markets')data={items:{}};
 else return new Response(JSON.stringify({error:'Esta integração não está disponível na demonstração.'}),{status:404,headers:{'Content-Type':'application/json'}});
 return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
 };
 document.addEventListener('click',event=>{if(event.target.closest('#pro-speed-test,#network,#network-pill,#speed-start')){event.preventDefault();event.stopImmediatePropagation();alert('Teste de internet disponível apenas no aplicativo real. Esta demo usa dados fictícios.')}},true);
 document.addEventListener('DOMContentLoaded',async()=>{
  // The real localJSON deliberately rejects remote origins; only this demo replaces it.
  localJSON=async path=>{const response=await window.fetch(path);const data=await response.json();if(!response.ok)throw Error(data.error);return data};
  loadWeather=async()=>{weather={...await localJSON('/api/weather'),savedAt:Date.now()};weatherError=false;displayWeather()};
  await loadWeather();await youtubeStatus(false);
  showServiceStatus('Demonstração','Dados fictícios · nenhuma conta ou TV é consultada.',true);
  document.querySelector('#refresh-services').onclick=()=>notify('Esta demonstração usa somente dados fictícios.');

  const name=document.querySelector('#profile');name.setAttribute('aria-label','Perfil demonstrativo');
  document.querySelector('#greeting').textContent='PRÉVIA · DADOS FICTÍCIOS';
  const target=new URLSearchParams(location.search).get('page');if(['channel','performance','ambient'].includes(target))navigate(target);
  document.querySelectorAll('a[href*="youtube.com/watch"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();alert('Vídeo ilustrativo da demonstração.')}));
 });
})();
