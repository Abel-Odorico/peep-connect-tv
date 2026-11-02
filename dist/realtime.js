/* Device counters every 2 s on TV; explicit 5 s ADB fallback in the browser. */
(()=>{
 let latest=null,busy=false,lastNative=0,lastFallback=0;
 const native=()=>typeof PeepTV!=='undefined'&&typeof PeepTV.deviceMetrics==='function';
 function accept(data){if(!data?.connected||!Number.isFinite(data.at))return;if(latest?.at===data.at)return;latest=data;liveTV={...liveTV,...data};tvError='';paintSystem();if(native()){$('#hub-state').textContent=data.network.transport+' · atualização local de 2 s';$('#home-network-detail').textContent='Android · tráfego total da TV'}window.dispatchEvent(new CustomEvent('peep-metrics',{detail:data}))}
 function sampleNative(){if(Date.now()-lastNative<1200)return;lastNative=Date.now();try{const data=JSON.parse(PeepTV.deviceMetrics());if(data.connected)accept(data)}catch{}}
 async function tick(force=false){if(document.hidden||livingIdleActive||(panel.open&&panel.classList.contains('theme-studio-dialog'))||(!force&&(!['home','performance'].includes(page)||(page==='home'&&!PeepRuntime.visible(hub)))))return;if(native()){sampleNative();return}if(busy||(!force&&Date.now()-lastFallback<4800))return;lastFallback=Date.now();busy=true;try{const data=await localJSON('/api/system');data.source='ADB · Mac';data.sampleIntervalSeconds=5;accept(data)}catch(error){if(latest&&Date.now()/1000-latest.at>15)window.dispatchEvent(new CustomEvent('peep-metrics-stale'))}finally{busy=false}}
 refreshTV=async function(){return tick(true)};
 window.PeepMetrics={get latest(){return latest||liveTV},get isNative(){return native()},refresh:tick};
 PeepRuntime.job('telemetry',2000,tick,()=>!livingIdleActive&&['home','performance'].includes(page)&&(page==='performance'||PeepRuntime.visible(hub)));document.addEventListener('visibilitychange',()=>{if(!document.hidden){lastNative=0;lastFallback=0;tick()}});tick();
})();
