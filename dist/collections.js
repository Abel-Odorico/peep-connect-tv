/* Three original environments: a theme, a still and a layered motion companion. */
(()=>{
 'use strict';
 const packs=[
  {id:'obsidiana',name:'Obsidiana',description:'Pedra azul, curvas precisas e ouro sobre a água.',extravagant:false,colors:['#06101E','#0A4D5C','#C9A961','#B85C4E'],accent:'#C9A961',mode:'dark',surface:'#101E2C',ink:'#FAF8F5',muted:'#B6C3D0'},
  {id:'solsticio',name:'Solstício',description:'Um portal solar monumental em terracota, vinho e dourado.',extravagant:true,colors:['#180D16','#6B2E3E','#E7BE77','#B85C4E'],accent:'#E7BE77',mode:'dark',surface:'#291820',ink:'#FFF7EC',muted:'#D9BFB2'},
  {id:'atlantida',name:'Atlântida',description:'Ondas esculturais em petróleo com contornos de luz dourada.',extravagant:true,colors:['#03151F','#0A4D5C','#D6BF88','#B85C4E'],accent:'#D6BF88',mode:'dark',surface:'#092E39',ink:'#F3FAF8',muted:'#A9CFD0'}
 ].map(t=>({...t,wallpaper:'assets/collections/'+t.id+'.png',collection:true}));
 for(const pack of packs)if(!horizonThemes.some(t=>t.id===pack.id))horizonThemes.push(pack);
 // Show the new collection on the first page without changing the default theme.
 themeCatalog.splice(1,0,...packs.filter(p=>!themeCatalog.some(t=>t.id===p.id)));
 const get=id=>packs.find(p=>p.id===id);
 const getMotion=id=>get(String(id||'').replace(/^collection-/,''));
 const isMotionId=id=>String(id||'').startsWith('collection-')&&!!getMotion(id);
 const home=document.createElement('div');home.className='collection-stage collection-home-stage';home.hidden=true;home.setAttribute('aria-hidden','true');horizonStage.append(home);
 const rest=document.createElement('div');rest.className='collection-stage collection-idle-stage';rest.hidden=true;rest.setAttribute('aria-hidden','true');idle.prepend(rest);
 function configure(surface,pack){
  if(surface.dataset.collection===pack?.id)return;
  surface.replaceChildren();surface.dataset.collection=pack?.id||'';
  if(!pack)return;
  surface.style.setProperty('--collection-image','url("'+pack.wallpaper+'")');
  surface.style.setProperty('--collection-base',pack.colors[0]);surface.style.setProperty('--collection-gold',pack.accent);
  surface.innerHTML='<div class="collection-photo"></div><div class="collection-lens"></div><div class="collection-shade"></div>';
 }
 function applyHome(){
  const pack=isMotionId(prefs.motionWallpaper)?getMotion(prefs.motionWallpaper):null;
  home.hidden=!pack;configure(home,pack);
  home.dataset.moving=String(horizonMotionAllowed()&&prefs.dynamicTempo!=='parado');
  document.body.dataset.collectionTheme=get(prefs.theme)?.id||'';
  if(get(prefs.theme))document.body.style.setProperty('--collection-base',get(prefs.theme).colors[0]);
  window.PeepCollectionMotion?.sync();
 }
 function paintIdle(){
  const pack=get(prefs.idleCollection),show=!!pack&&prefs.idleStyle!=='quiet';
  rest.hidden=!show;configure(rest,show?pack:null);idle.dataset.collection=show?pack.id:'';
  rest.dataset.moving=String(horizonMotionAllowed()&&prefs.dynamicTempo!=='parado');
  if(show){
   for(const [key,value]of Object.entries({'--p-a':pack.colors[1],'--p-b':pack.accent,'--p-c':pack.colors[3],'--p-base':pack.colors[0]}))idle.style.setProperty(key,value);
   richSetText('prisma-palette-name',pack.name);
  }
  window.PeepCollectionMotion?.sync();
  const tag=idle.querySelector('.prisma-header-tag');if(tag)for(const node of tag.childNodes)if(node.nodeType===Node.TEXT_NODE&&node.textContent.trim())node.textContent=show?pack.name.toUpperCase()+' ':'PRISMA ';
 }
 function nextIdle(delta){const index=Math.max(0,packs.findIndex(p=>p.id===prefs.idleCollection));prefs.idleCollection=packs[(index+delta+packs.length)%packs.length].id;paintIdle()}
 function configureBackdrop(id,mode){
  const pack=get(id);if(!pack)return;
  prefs.collectionWallpaper=id;prefs.wallpaperSource='collection';prefs.customWallpaper='';prefs.themeSceneMode=mode;
  prefs.motionWallpaper=mode==='static'?'off':'collection-'+id;
 }
 function selectBackdrop(id,mode){
  if(!get(id))return;
  configureBackdrop(id,mode);
  // An explicit request for an animated wallpaper resumes app-level motion.
  // The operating system's reduced-motion preference still takes precedence.
  if(mode==='animated'){prefs.motion=true;prefs.performance='balanced';if(prefs.dynamicTempo==='parado')prefs.dynamicTempo='vivo'}
  apply();syncControls(panel);notify(get(id).name+' · '+(mode==='static'?'papel estático':'papel animado')+' aplicado.');
 }
 function themeSelected(id){
  if(!get(id))return;
  configureBackdrop(id,prefs.themeSceneMode==='static'?'static':'animated');prefs.idleCollection=id;
 }
 function syncControls(host){
  host.querySelectorAll('[data-collection-background]').forEach(button=>button.setAttribute('aria-pressed',String(prefs.collectionWallpaper===button.dataset.collectionBackground&&(prefs.motionWallpaper==='off'?'static':'animated')===button.dataset.collectionMode&&prefs.wallpaperSource==='collection')));
  const mode=host.querySelector('#collection-theme-mode');if(mode){mode.value=prefs.themeSceneMode==='static'?'static':'animated';mode.disabled=!get(prefs.theme)}
  const choice=host.querySelector('#collection-idle-choice');if(choice)choice.value=get(prefs.idleCollection)?.id||'';
  const status=host.querySelector('#collection-active-name');if(status)status.textContent=get(prefs.theme)?'Cenário combinado: '+get(prefs.theme).name:'Selecione Obsidiana, Solstício ou Atlântida';
 }
 function settings(host){
  const style=host.querySelector('#studio-panel-style'),background=host.querySelector('#studio-panel-background'),standby=host.querySelector('#studio-panel-standby');
  if(style){const line=document.createElement('label');line.className='collection-mode-option';line.innerHTML='<span><b id="collection-active-name"></b><small>Aplicar cores, cenário e descanso como uma coleção.</small></span><select id="collection-theme-mode" aria-label="Cenário do tema"><option value="animated">Cenário animado</option><option value="static">Papel estático</option></select>';style.append(line);line.querySelector('select').onchange=event=>{if(get(prefs.theme))selectBackdrop(prefs.theme,event.target.value)}}
  if(background){const section=document.createElement('section');section.className='collection-picks';section.innerHTML='<div class="collection-section-heading"><p class="eyebrow">CENÁRIOS EXCLUSIVOS</p><h3>Três mundos. Duas formas de entrar.</h3><p>Use a arte original ou sua composição animada. Cada cenário combina com o tema de mesmo nome.</p></div><div class="collection-wallpaper-grid">'+packs.map(p=>'<article><img src="'+p.wallpaper+'" loading="lazy" decoding="async" width="320" height="180" alt="Cenário '+p.name+'"><div><b>'+p.name+'</b><span>'+p.description+'</span></div><div class="collection-wallpaper-actions"><button data-collection-background="'+p.id+'" data-collection-mode="static">Estático</button><button data-collection-background="'+p.id+'" data-collection-mode="animated">Animado</button></div></article>').join('')+'</div>';background.prepend(section);section.querySelectorAll('button').forEach(b=>b.onclick=()=>selectBackdrop(b.dataset.collectionBackground,b.dataset.collectionMode))}
  if(standby){const line=document.createElement('label');line.className='collection-mode-option';line.innerHTML='<span><b>Cenário do descanso</b><small>Usar um dos cenários da coleção ou as paletas Prisma.</small></span><select id="collection-idle-choice"><option value="">Paletas Prisma</option>'+packs.map(p=>'<option value="'+p.id+'">'+p.name+'</option>').join('')+'</select>';standby.prepend(line);line.querySelector('select').onchange=e=>{prefs.idleCollection=e.target.value;if(e.target.value)prefs.idleStyle='aurora';PeepPrisma.refresh();save();syncControls(host)}}
  syncControls(host);
 }
 window.PeepCollections={packs,get,isMotionId,themeSelected,selectBackdrop,apply:applyHome,paintIdle,nextIdle,settings,syncControls};
 apply();paintIdle();
})();
