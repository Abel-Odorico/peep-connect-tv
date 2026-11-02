/* Prisma 0.14: alteração restrita ao descanso; mantém clima e controles existentes. */
(()=>{
 'use strict';
 if(typeof idle==='undefined'||typeof horizonPaintIdle!=='function')return;
 const palettes=[
  {id:'prisma',name:'Prisma',colors:['#6559ff','#e967c3','#49c9ff'],base:'#080e24'},
  {id:'coral',name:'Coral Solar',colors:['#ee5d75','#ffb363','#a06bff'],base:'#21101f'},
  {id:'laguna',name:'Laguna',colors:['#38c4df','#9bf4bc','#6c72ff'],base:'#041b28'},
  {id:'cosmos',name:'Cosmos',colors:['#8261ff','#fc76a8','#5a8eff'],base:'#100a29'},
  {id:'citrino',name:'Citrino',colors:['#c7ea70','#6dd9b5','#72b7ff'],base:'#101d20'},
  {id:'seda',name:'Seda Rosé',colors:['#d993c5','#b7a1ff','#ffcba5'],base:'#20132b'},
  {id:'aurora',name:'Aurora Viva',colors:['#55d6a4','#c5b0ff','#1da4f1'],base:'#071e29'},
  {id:'candy',name:'Candy',colors:['#ed68db','#ffab8e','#8e9fff'],base:'#21102d'},
  {id:'lava',name:'Lava Dourada',colors:['#ef6540','#ffc658','#dd469d'],base:'#241014'},
  {id:'polar',name:'Luz Polar',colors:['#b4e5ff','#bca2ff','#c6f8ea'],base:'#132130'}
 ];
 if(!palettes.some(p=>p.id===prefs.prismaPalette))prefs.prismaPalette='prisma';
 if(!['soft','vivid'].includes(prefs.prismaIntensity))prefs.prismaIntensity='vivid';
 if(!['slow','flow'].includes(prefs.prismaSpeed))prefs.prismaSpeed='slow';
 let signature='',lastCycle=Date.now(),lastInteraction=Date.now();
 idle.classList.add('prisma-idle');idle.setAttribute('aria-label','Descanso Prisma. Esquerda e direita alternam os painéis; cima e baixo mudam as cores. OK ou Voltar retorna à TV.');
 const stage=document.createElement('div');stage.className='prisma-stage';stage.setAttribute('aria-hidden','true');
 stage.innerHTML=`<svg class="prisma-art" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
 <defs>
  <linearGradient id="prisma-back" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="var(--p-c)"/><stop offset=".43" stop-color="var(--p-a)"/><stop offset="1" stop-color="var(--p-b)"/></linearGradient>
  <linearGradient id="prisma-fold" x1="0" y1="0" x2="1" y2=".8"><stop stop-color="var(--p-b)"/><stop offset=".34" stop-color="#fff2f7"/><stop offset=".49" stop-color="var(--p-a)"/><stop offset=".83" stop-color="var(--p-c)"/><stop offset="1" stop-color="#182255"/></linearGradient>
  <linearGradient id="prisma-front" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="var(--p-c)"/><stop offset=".4" stop-color="var(--p-a)"/><stop offset=".7" stop-color="var(--p-b)"/><stop offset="1" stop-color="var(--p-a)"/></linearGradient>
  <linearGradient id="prisma-edge" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".08"/><stop offset=".48" stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
 </defs>
 <g class="prisma-ribbon ribbon-far"><path d="M690-180C1370-130 1560 120 1400 398C1270 630 897 552 720 723C591 847 775 1066 1140 1100L1850 1100L1850-200Z" fill="url(#prisma-back)" opacity=".72"/><path d="M700-145C1330-100 1510 140 1376 388C1247 627 910 573 747 735" stroke="url(#prisma-edge)" stroke-width="1" fill="none"/></g>
 <g class="prisma-ribbon ribbon-middle"><path d="M1780-60C1260-110 1112 28 1153 224C1190 397 1434 447 1275 621C1115 796 752 568 575 725C480 809 598 958 880 1025L1206 1110C875 974 806 868 935 806C1118 719 1468 949 1664 681C1859 413 1350 248 1451 129C1508 62 1645 70 1810 126Z" fill="url(#prisma-fold)"/><path d="M1780-60C1260-110 1112 28 1153 224C1190 397 1434 447 1275 621C1115 796 752 568 575 725" stroke="url(#prisma-edge)" stroke-width="2" fill="none"/></g>
 <g class="prisma-ribbon ribbon-front"><path d="M1760 490C1390 336 1231 522 1295 688C1352 835 1184 882 948 832C715 783 617 887 674 1010L1720 1080Z" fill="url(#prisma-front)" opacity=".86"/><path d="M1760 490C1390 336 1231 522 1295 688C1352 835 1184 882 948 832C715 783 617 887 674 1010" fill="none" stroke="url(#prisma-edge)" stroke-width="1.3"/></g>
 </svg><span class="prisma-orb orb-one"></span><span class="prisma-orb orb-two"></span><div class="prisma-shade"></div>`;
 idle.prepend(stage);
 const homeStage=stage.cloneNode(true);homeStage.className='prisma-stage prisma-home-stage';
 let homeArt=homeStage.innerHTML;for(const name of ['prisma-back','prisma-fold','prisma-front','prisma-edge'])homeArt=homeArt.replaceAll(name,'home-'+name);homeStage.innerHTML=homeArt;horizonStage.append(homeStage);
 // Move each SVG ribbon into its own HTML compositor layer. Gradient IDs remain unique.
 for(const surface of [stage,homeStage]){
  const art=surface.querySelector('.prisma-art'),defs=art.querySelector('defs');
  for(const [index,ribbon]of [...art.querySelectorAll('.prisma-ribbon')].entries()){
   const layer=document.createElement('div');layer.className='prisma-layer layer-'+['far','middle','front'][index];
   const svg=art.cloneNode(false),localDefs=defs.cloneNode(true);svg.append(localDefs,ribbon);
   const suffix='-layer'+index;
   for(const def of localDefs.querySelectorAll('[id]')){const old=def.id;def.id=old+suffix;for(const node of svg.querySelectorAll('[fill],[stroke]'))for(const attr of ['fill','stroke'])if(node.getAttribute(attr)==='url(#'+old+')')node.setAttribute(attr,'url(#'+old+suffix+')')}
   layer.append(svg);surface.insertBefore(layer,art);
  }
  art.remove();
 }
 if(!horizonScenes.some(s=>s.id==='prisma-live'))horizonScenes.push({id:'prisma-live',name:'Prisma animado',description:'Fitas coloridas · mesma paleta do descanso.',colors:['#6559ff','#e967c3','#49c9ff']});
 function applyHomeWallpaper(){prefs.motionWallpaper='prisma-live';apply();if(panel.open)panel.close();navigate('home');notify('Papel de parede Prisma ativado.');}

 // Keep the approved logo and all the existing weather IDs/data flow.
 const shell=idle.querySelector('.rich-shell');shell.classList.add('prisma-shell');
 idle.querySelector('.rich-greeting').textContent='AGORA É TEMPO DE DESACELERAR';
 const caption=idle.querySelector('.horizon-idle-caption');caption.innerHTML='<span class="prisma-color-dots"><i></i><i></i><i></i></span><span id="prisma-palette-name">Prisma</span><span class="prisma-caption-rule"></span><small>LUZ EM MOVIMENTO</small><span id="horizon-scene-name" hidden></span><span class="horizon-scene-number" hidden></span>';
 const climateTitle=idle.querySelector('.horizon-climate-title');climateTitle.textContent='Contagem, MG';
 const weatherCurrent=idle.querySelector('.rich-current');weatherCurrent.classList.add('prisma-weather');
 const weatherRegion=document.createElement('div');weatherRegion.className='prisma-weather-dock';
 shell.insertBefore(weatherRegion,idle.querySelector('.rich-forecast'));weatherRegion.append(weatherCurrent,idle.querySelector('.rich-forecast'));
 const forecastLabel=idle.querySelector('.rich-forecast-heading>span');forecastLabel.textContent='NOS PRÓXIMOS DIAS';
 const header=idle.querySelector('.rich-header');header.insertAdjacentHTML('beforeend','<span class="prisma-header-tag"><i></i>PRISMA <small>0.16.3</small></span>');
 const footer=idle.querySelector('.rich-footer');footer.querySelector('.horizon-remote-hint').innerHTML='← → painéis <span>·</span> ↑ ↓ cores <span>·</span> OK voltar';
 const editButton=document.createElement('button');editButton.className='prisma-tune';editButton.dataset.idleAction='prisma-settings';editButton.setAttribute('aria-label','Personalizar tela de descanso');editButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/></svg>';idle.querySelector('.rich-top-actions').prepend(editButton);

 function applyPrisma(){
  const p=palettes.find(p=>p.id===prefs.prismaPalette)||palettes[0];
  idle.dataset.prisma=p.id;idle.dataset.intensity=prefs.prismaIntensity;idle.dataset.pace=prefs.prismaSpeed;
  idle.style.setProperty('--p-a',p.colors[0]);idle.style.setProperty('--p-b',p.colors[1]);idle.style.setProperty('--p-c',p.colors[2]);idle.style.setProperty('--p-base',p.base);
  idle.dataset.prismaMotion=String(horizonMotionAllowed());idle.dataset.prismaQuiet=String(prefs.idleStyle==='quiet');
  for(const [key,value]of Object.entries({'--p-a':p.colors[0],'--p-b':p.colors[1],'--p-c':p.colors[2],'--p-base':p.base}))homeStage.style.setProperty(key,value);
  richSetText('prisma-palette-name',p.name);idle.querySelector('.rich-greeting').textContent='AGORA É TEMPO DE DESACELERAR';
  if(climateTitle.textContent!=='Contagem, MG')climateTitle.textContent='Contagem, MG';window.PeepCollections?.paintIdle();
 }
 function cyclePrisma(delta){if(prefs.idleCollection&&window.PeepCollections){lastCycle=Date.now();lastInteraction=Date.now();PeepCollections.nextIdle(delta);save();return}prefs.idleCollection='';const index=Math.max(0,palettes.findIndex(p=>p.id===prefs.prismaPalette));prefs.prismaPalette=palettes[(index+delta+palettes.length)%palettes.length].id;lastCycle=Date.now();lastInteraction=Date.now();applyPrisma();save()}
 function paintTemperatureRange(){
  const daily=weather?.daily,target=idle.querySelector('#rich-forecast-days');if(!target)return;
  const newSignature=JSON.stringify([daily,prefs.idleView]);if(signature===newSignature&&(!target.querySelector('.rich-day')||target.querySelector('.prisma-temp-range')))return;signature=newSignature;
  const values=[...(daily?.temperature_2m_min||[]).slice(0,3),...(daily?.temperature_2m_max||[]).slice(0,3)].filter(Number.isFinite);
  const min=Math.min(...values),max=Math.max(...values),range=max-min;
  target.querySelectorAll('.rich-day').forEach((day,index)=>{
   const low=daily?.temperature_2m_min?.[index],high=daily?.temperature_2m_max?.[index];let line=day.querySelector('.prisma-temp-range');
   if(!line){line=document.createElement('span');line.className='prisma-temp-range';line.setAttribute('aria-hidden','true');line.innerHTML='<i></i>';day.querySelector('.rich-day-values').append(line)}
   const valid=Number.isFinite(low)&&Number.isFinite(high)&&range>=0;line.hidden=!valid;
   if(valid){const left=range?((low-min)/range*100):0,width=range?((high-low)/range*100):100;line.firstElementChild.style.left=left+'%';line.firstElementChild.style.width=Math.max(3,width)+'%'}
  });
 }
 function paintPrisma(){
  applyPrisma();paintTemperatureRange();
  if(livingIdleActive&&prefs.idleSceneCycle&&horizonMotionAllowed()&&Date.now()-lastCycle>=180000)cyclePrisma(1);
  idle.dataset.controlsVisible=String(Date.now()-lastInteraction<8000);
 }
 // Disable only the old standby palette rotation; home wallpaper/theme routines stay intact.
 const baseIdlePaint=horizonPaintIdle;horizonPaintIdle=function(){const cycle=prefs.idleSceneCycle;prefs.idleSceneCycle=false;try{baseIdlePaint()}finally{prefs.idleSceneCycle=cycle}paintPrisma()};
 const baseEnter=enterLivingIdle;enterLivingIdle=function(){lastCycle=Date.now();lastInteraction=Date.now();signature='';baseEnter();paintPrisma()};
 window.PeepIdle={get active(){return livingIdleActive},wake:wakeLivingIdle,show:enterLivingIdle};

 function prismaOptions(){return '<section class="prisma-settings"><p class="eyebrow">PRISMA · TELA DE DESCANSO</p><h3>Cor e movimento no seu ritmo</h3><p>Escolha a luz que vai preencher sua tela. Selecionar uma paleta ativa o descanso colorido.</p><div class="prisma-palette-grid">'+palettes.map(p=>'<button data-prisma-palette="'+p.id+'" aria-pressed="'+(prefs.prismaPalette===p.id)+'"><span style="--palette-a:'+p.colors[0]+';--palette-b:'+p.colors[1]+';--palette-c:'+p.colors[2]+'"></span><b>'+p.name+'</b></button>').join('')+'</div><label class="option">Presença das cores<select id="prisma-intensity"><option value="vivid">Vibrante</option><option value="soft">Suave</option></select></label><label class="option">Movimento<select id="prisma-speed"><option value="slow">Contemplativo</option><option value="flow">Mais fluido</option></select></label><label class="option">Alternar cores a cada 3 minutos<input id="prisma-cycle" type="checkbox" '+(prefs.idleSceneCycle?'checked':'')+'></label><button id="prisma-preview" class="panel-button">Visualizar descanso</button><button id="prisma-home-wallpaper" class="text-button">Usar Prisma como papel de parede</button><p class="inline-note">No descanso: ← → muda o painel, ↑ ↓ troca as cores. O modo econômico e movimento reduzido mantêm a composição estática.</p></section>'}
 function bindPrismaOptions(){
  document.querySelectorAll('[data-prisma-palette]').forEach(b=>b.onclick=()=>{prefs.idleCollection='';prefs.prismaPalette=b.dataset.prismaPalette;prefs.idleStyle='aurora';applyPrisma();save();document.querySelectorAll('[data-prisma-palette]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))});
  const intensity=$('#prisma-intensity'),speed=$('#prisma-speed');if(!intensity||!speed)return;
  intensity.value=prefs.prismaIntensity;speed.value=prefs.prismaSpeed;
  intensity.onchange=e=>{prefs.prismaIntensity=e.target.value;applyPrisma();save()};speed.onchange=e=>{prefs.prismaSpeed=e.target.value;applyPrisma();save()};
  $('#prisma-cycle').onchange=e=>{prefs.idleSceneCycle=e.target.checked;lastCycle=Date.now();save()};$('#prisma-preview').onclick=()=>{panel.close();enterLivingIdle()};$('#prisma-home-wallpaper').onclick=applyHomeWallpaper;
 }
 function openPrismaSettings(){wakeLivingIdle();show('<h2>Personalizar descanso</h2>'+prismaOptions());bindPrismaOptions()}
 editButton.onclick=openPrismaSettings;
 const baseRichAction=richIdleAction;richIdleAction=async function(action){if(action==='prisma-settings'){openPrismaSettings();return}return baseRichAction(action)};
 for(const type of richInputTypes)window.removeEventListener(type,livingInput,true);
 const baseInput=livingInput;livingInput=function(event){if(livingIdleActive){if(event.type==='keydown'||event.type==='pointermove'||event.type==='pointerdown'||event.type==='touchstart'){lastInteraction=Date.now();idle.dataset.controlsVisible='true'}if(event.type==='keydown'&&['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();cyclePrisma(event.key==='ArrowUp'?-1:1);return}}baseInput(event)};
 for(const type of richInputTypes)window.addEventListener(type,livingInput,{capture:true,passive:false});
 // Settings extension only: changes are scoped to standby preferences.
 for(const [name,original]of [['appearance',appearance],['themePicker',themePicker],['livingSettings',livingSettings]]){
  const extended=function(){original();$('#horizon-idle-scene')?.closest('label')?.remove();$('#horizon-idle-cycle')?.closest('label')?.remove();const legacyStyle=$('#living-idle-style');if(legacyStyle){legacyStyle.innerHTML='<option value="aurora">Prisma · cores e movimento</option><option value="quiet">Silêncio · fundo discreto</option>';legacyStyle.value=prefs.idleStyle==='quiet'?'quiet':'aurora'}$('#panel-content').insertAdjacentHTML('beforeend',prismaOptions());bindPrismaOptions()};
  if(name==='appearance')appearance=extended;else if(name==='themePicker')themePicker=extended;else livingSettings=extended;
 }
 $('#themes').onclick=()=>themePicker();$('#glass-shortcut').onclick=()=>appearance();
 const baseApply=apply;apply=function(){baseApply();applyPrisma()};document.addEventListener('visibilitychange',paintPrisma);
 // Public hooks for the standalone demo and focused interaction tests.
 window.PeepPrisma={openSettings:openPrismaSettings,homeWallpaper:applyHomeWallpaper,next:cyclePrisma,refresh:()=>{signature='';paintPrisma()}};
 horizonApply();paintPrisma();save();
})();
