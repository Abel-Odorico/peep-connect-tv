/* 0.15 — conteúdo em foco, personalização por abas e movimento explícito. */
(()=>{
 'use strict';
 const root=document.body;
 if(!['suave','vivo','parado'].includes(prefs.dynamicTempo))prefs.dynamicTempo='vivo';
 root.classList.add('studio015');
 function motionState(){root.dataset.dynamicTempo=prefs.dynamicTempo;root.dataset.motionRunning=String(prefs.motion!==false&&prefs.performance!=='economy'&&prefs.dynamicTempo!=='parado');}
 const oldApply=apply;apply=function(){oldApply();motionState()};motionState();
 function setMotion(value){prefs.dynamicTempo=value;if(value!=='parado'){prefs.motion=true;prefs.performance='balanced';if(!prefs.motionWallpaper||prefs.motionWallpaper==='off')prefs.motionWallpaper='landscape'}apply();notify(value==='parado'?'Movimento pausado.':'Fundo '+(value==='vivo'?'vivo':'suave')+' ativado.')}

 const appearanceBase=appearance;let themeNavigation=null;
 function studioThemes(start='style'){
  themeNavigation?.destroy();themeNavigation=null;panel.classList.add('theme-studio-dialog');appearanceBase();
  const host=$('#panel-content'),nodes=[...host.children],prisma=host.querySelector('.prisma-settings'),backgrounds=host.querySelector('.horizon-settings'),automation=host.querySelector('.living-options');
  host.replaceChildren();panel.classList.add('theme-studio-dialog');
  host.innerHTML='<div class="studio-dialog-heading"><p class="eyebrow">PERSONALIZE SUA TV</p><h2>Temas e aparência</h2></div><div class="studio-tabs" role="tablist" aria-label="Personalização">'+[['style','Estilo'],['background','Fundos'],['standby','Descanso'],['rotation','Automação'],['glass','Vidro']].map(([id,label])=>'<button role="tab" id="studio-tab-'+id+'" aria-controls="studio-panel-'+id+'" data-studio-tab="'+id+'">'+label+'</button>').join('')+'</div><div class="studio-tab-body">'+['style','background','standby','rotation','glass'].map(id=>'<section role="tabpanel" id="studio-panel-'+id+'" aria-labelledby="studio-tab-'+id+'" hidden></section>').join('')+'</div><div class="studio-dialog-footer"><span id="studio-navigation-hint" aria-live="polite">← → abas · ↓ entrar nas opções · OK escolher</span><button id="studio-done">Concluir</button></div>';
  const style=$('#studio-panel-style');style.innerHTML='<p class="studio-pane-lead">Cor, contraste e personalidade. O fundo pode ser escolhido em uma aba própria.</p><div class="studio-theme-grid"></div>';
  for(const t of themeCatalog){const button=document.createElement('button');button.className='studio-theme';button.dataset.themeChoice=t.id;button.setAttribute('aria-pressed',String(prefs.theme===t.id));button.innerHTML='<span class="studio-theme-art" style="--preview-base:'+t.colors[0]+';--preview-accent:'+t.accent+';--preview-secondary:'+t.colors[1]+'"><i></i><b></b><em></em></span><strong>'+escapeHTML(t.name)+'</strong><span class="studio-theme-colors">'+t.colors.slice(0,4).map(c=>'<i style="background:'+c+'"></i>').join('')+'</span>';button.onclick=()=>{selectTheme(t.id);window.PeepCollections?.syncControls(host);style.querySelectorAll('[data-theme-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)))};if(t.wallpaper){button.classList.add('collection-theme-choice');button.querySelector('.studio-theme-art').style.backgroundImage='url('+t.wallpaper+')';const caption=document.createElement('small');caption.className='collection-theme-caption';caption.textContent=t.extravagant?'EXTRAVAGANTE':'EDIÇÃO ESSENCIAL';button.append(caption)}style.querySelector('.studio-theme-grid').append(button)}
  function paginate(container,size){const items=[...container.children];let offset=Math.floor(Math.max(0,items.findIndex(i=>i.getAttribute('aria-pressed')==='true'))/size);if(items.length<=size)return;const controls=document.createElement('div');controls.className='studio-pagination';controls.innerHTML='<button aria-label="Página anterior">←</button><span></span><button aria-label="Próxima página">→</button>';container.after(controls);const buttons=controls.querySelectorAll('button');function paint(){items.forEach((el,i)=>{el.hidden=Math.floor(i/size)!==offset});controls.querySelector('span').textContent=(offset+1)+' / '+Math.ceil(items.length/size);buttons[0].disabled=offset===0;buttons[1].disabled=(offset+1)*size>=items.length}buttons[0].onclick=()=>{offset--;paint()};buttons[1].onclick=()=>{offset++;paint()};paint()}
  paginate(style.querySelector('.studio-theme-grid'),6);
  const bg=$('#studio-panel-background');if(backgrounds)bg.append(backgrounds);
  bg.querySelector('#horizon-motion-pace')?.closest('label')?.remove();bg.querySelector('#horizon-idle-demo')?.remove();
  const motion=document.createElement('div');motion.className='studio-motion-controls';motion.innerHTML='<span><b>Movimento do fundo</b><small id="studio-motion-state"></small></span><select id="studio-tempo" aria-label="Ritmo do fundo"><option value="suave">Suave · 28 segundos</option><option value="vivo">Vivo · 12 segundos</option><option value="parado">Pausado</option></select>';bg.prepend(motion);$('#studio-tempo').value=prefs.dynamicTempo;
  function motionCaption(){const active=prefs.motion!==false&&prefs.performance!=='economy'&&prefs.dynamicTempo!=='parado';$('#studio-motion-state').textContent=active?'Animação ligada':'Pausado · escolha Suave ou Vivo para ativar'}motionCaption();$('#studio-tempo').onchange=e=>{setMotion(e.target.value);motionCaption()};
  bg.querySelectorAll('[data-motion-choice]').forEach(b=>{const previous=b.onclick;b.onclick=()=>{previous();if(!['off'].includes(b.dataset.motionChoice))setMotion(prefs.dynamicTempo==='parado'?'vivo':prefs.dynamicTempo);motionCaption()}});
  const bgGrid=bg.querySelector('.horizon-scene-grid');if(bgGrid)paginate(bgGrid,6);
  const images=document.createElement('button');images.className='panel-button';images.textContent='Paisagens e imagens de cinema';images.onclick=()=>{panel.close();scenes()};bg.append(images);
  if(prisma){$('#studio-panel-standby').append(prisma);const palettes=prisma.querySelector('.prisma-palette-grid');if(palettes)paginate(palettes,6)}
  if(automation){$('#studio-panel-rotation').append(automation);automation.querySelector('#living-idle-style')?.closest('label')?.remove();automation.querySelector('#living-idle-preview')?.remove()}
  const glass=$('#studio-panel-glass');for(const node of nodes){if([prisma,backgrounds,automation].includes(node))continue;if(node.matches('.theme-picker-launch,.brand-import-option'))continue;if(node.matches('h2,p.eyebrow'))continue;glass.append(node)}
  glass.querySelectorAll('#change-scene,#theme-glass,.theme-picker-launch').forEach(b=>b.remove());
  const tabs=[...host.querySelectorAll('[data-studio-tab]')],panes=[...host.querySelectorAll('[role=tabpanel]')];
  let active=null;
  function choose(id,focus=false){
   if(active!==id){const old=panes.find(p=>p.id==='studio-panel-'+active);if(old)old.hidden=true;
    active=id;panes.find(p=>p.id==='studio-panel-'+id).hidden=false;
    for(const tab of tabs){const selected=tab.dataset.studioTab===id;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1}
   }
   if(focus)tabs.find(t=>t.dataset.studioTab===id).focus({preventScroll:true});
  }
  tabs.forEach(button=>button.onclick=()=>choose(button.dataset.studioTab,true));
  window.PeepCollections?.settings(host);$('#studio-done').onclick=()=>panel.close();choose(start);
  themeNavigation=PeepThemeNavigation.mount(panel,host,{activeTab:()=>active,chooseTab:choose});
 }
 function releaseThemeNavigation(){themeNavigation?.destroy();themeNavigation=null;panel.classList.remove('theme-studio-dialog')}
 panel.addEventListener('close',releaseThemeNavigation);window.addEventListener('peep-panel-replace',releaseThemeNavigation);
 themePicker=()=>studioThemes('style');appearance=()=>studioThemes('glass');livingSettings=()=>studioThemes('rotation');$('#themes').onclick=themePicker;$('#glass-shortcut').onclick=appearance;
 if(window.PeepPrisma){const old=window.PeepPrisma.openSettings;window.PeepPrisma.openSettings=()=>{wakeLivingIdle();studioThemes('standby')};const tune=idle.querySelector('.prisma-tune');if(tune)tune.onclick=window.PeepPrisma.openSettings;const oldAction=richIdleAction;richIdleAction=async action=>action==='prisma-settings'?window.PeepPrisma.openSettings():oldAction(action)}

 // Apps first, context next, film discovery, then the compact device strip.
 const main=$('main'),apps=$('.app-section'),dashboard=$('.dashboard'),cinema=$('#cinema'),youtube=$('#youtube-section');
 const context=document.createElement('section');context.id='app-context';context.className='app-context';context.setAttribute('aria-label','Conteúdo do aplicativo em foco');
 context.innerHTML='<div class="app-context-heading"><div><p class="eyebrow" id="app-context-source">DESCUBRA</p><h2 id="app-context-title">Para o seu próximo play.</h2></div><button id="app-context-open">Abrir aplicativo '+livingIcon('arrow')+'</button></div><p id="app-context-status" role="status">Passe por um aplicativo para explorar o conteúdo.</p><div id="app-context-rail" class="app-context-rail"></div><div class="app-context-credit" id="app-context-credit"></div>';
 apps.after(context);if(cinema)context.after(cinema);if(youtube&&cinema)cinema.after(youtube);if(dashboard){(youtube||cinema||context).after(dashboard);dashboard.append($('#service-banner'));}
 const cache=new Map();let selectedApp=null,generation=0,timer=null,request=null;
 function remember(id,data){cache.delete(id);cache.set(id,{data,at:Date.now()});while(cache.size>8)cache.delete(cache.keys().next().value)}
 function validThumb(url){return typeof url==='string'&&(/^https:\/\/image\.tmdb\.org\/t\/p\//.test(url)||/^https:\/\/i\.ytimg\.com\/vi\/[\w-]+\//.test(url))}
 async function loadContext(app,revision){
  if(!app||revision!==generation)return;request?.abort();const controller=new AbortController();request=controller;const timeout=setTimeout(()=>controller.abort(),20000);context.style.setProperty('--context-accent',app.color);$('#app-context-title').textContent='Explore '+app.name;$('#app-context-open').onclick=()=>openApp(app);$('#app-context-source').textContent='EM FOCO · '+app.name.toUpperCase();$('#app-context-status').hidden=false;$('#app-context-status').textContent='Buscando conteúdo de '+app.name+'…';$('#app-context-rail').setAttribute('aria-busy','true');$('#app-context-rail').replaceChildren();
  try{let data=cache.get(app.id);data=data&&Date.now()-data.at<600000?data.data:null;if(!data){const provider={netflix:'8',prime:'119',disney:'337',globoplay:'307',max:'1899',appletv:'350'}[app.id];
   if(app.id==='youtube'){const response=await fetch('/api/youtube/feed',{signal:controller.signal,cache:'no-store'}),feed=await response.json();if(!response.ok)throw Error(feed.error||'YouTube indisponível.');data={kind:'video',results:feed.results||[],label:feed.personalized?'Vídeos recentes das suas inscrições':'Populares no Brasil · seleção pública'};}
   else if(provider){const lists=await Promise.all(['movie','tv'].map(async type=>{const response=await fetch('/api/catalog?'+new URLSearchParams({type,provider,collection:'popular'}),{signal:controller.signal,cache:'no-store'}),feed=await response.json();if(!response.ok)throw Error(feed.error||'Catálogo indisponível.');return (feed.results||[]).slice(0,6)}));const results=[];for(let i=0;i<6;i++)for(const list of lists)if(list[i])results.push(list[i]);data={kind:'catalog',results:results.slice(0,8)};}
   else data={kind:'unavailable',results:[],label:'Abra '+app.name+' para explorar seu conteúdo. Esta integração ainda não tem acesso à biblioteca desse app.'};
   remember(app.id,data)}if(revision!==generation)return;
   $('#app-context-credit').textContent=data.kind==='catalog'?'Disponibilidade no Brasil · TMDB / JustWatch · não usa a conta do aplicativo.':data.label||'';
   $('#app-context-status').hidden=!!data.results.length;$('#app-context-status').textContent=data.results.length?'':data.label||'Sem conteúdo disponível nesta integração.';
   const fragment=document.createDocumentFragment();for(const item of data.results.slice(0,8)){const b=document.createElement('button');b.className='app-content-card';b.setAttribute('aria-label','Ver '+item.title);const art=document.createElement('span');art.className='app-content-art';const url=data.kind==='video'?item.thumbnail:item.backdrop||item.poster;if(validThumb(url)){const image=document.createElement('img');image.src=url;image.alt='';image.loading='lazy';image.decoding='async';image.width=342;image.height=193;image.onerror=()=>image.remove();art.append(image)}const title=document.createElement('strong'),meta=document.createElement('small');title.textContent=item.title;meta.textContent=data.kind==='video'?item.channel:(item.type==='tv'?'Série':'Filme')+' · '+(item.date?.slice(0,4)||'Sem data')+(Number.isFinite(item.rating)?' · ★ '+item.rating.toFixed(1):'');b.append(art,title,meta);b.onclick=()=>{if(data.kind==='video'&&/^[\w-]{11}$/.test(item.id)){if(typeof PeepTV!=='undefined'&&typeof PeepTV.openTrailer==='function')PeepTV.openTrailer(item.id);else window.open('https://www.youtube.com/watch?v='+item.id,'_blank','noopener')}else catalogDetails(item)};fragment.append(b)}$('#app-context-rail').replaceChildren(fragment);
  }catch(error){if(revision!==generation)return;$('#app-context-status').hidden=false;$('#app-context-status').textContent=error.name==='AbortError'?'A fonte demorou a responder. Passe pelo app novamente para tentar.':error.message;$('#app-context-credit').textContent='Nenhuma recomendação foi inventada.'}finally{clearTimeout(timeout);if(revision===generation)$('#app-context-rail').setAttribute('aria-busy','false')}
 }
 function selectApp(app){if(!app||selectedApp?.id===app.id)return;selectedApp=app;clearTimeout(timer);request?.abort();const revision=++generation;timer=setTimeout(()=>loadContext(app,revision),280)}
 const previousSelected=updateSelected;updateSelected=function(app){previousSelected(app);if(page==='home'||page==='apps')selectApp(app)};
 document.addEventListener('pointerover',event=>{const card=event.target.closest?.('.app-card');if(card)selectApp(catalog.find(app=>app.id===card.dataset.id))});document.addEventListener('focusin',event=>{const card=event.target.closest?.('.app-card');if(card)selectApp(catalog.find(app=>app.id===card.dataset.id))});
 const previousNavigate=navigate;navigate=function(next){previousNavigate(next);if(next==='home'||next==='apps'){const first=$('.app-card');if(first)selectApp(catalog.find(app=>app.id===first.dataset.id))}else{clearTimeout(timer);request?.abort();++generation;selectedApp=null}};document.querySelectorAll('[data-page]').forEach(button=>button.onclick=()=>navigate(button.dataset.page));
 const first=$('.app-card');if(first)selectApp(catalog.find(app=>app.id===first.dataset.id));
 $('#help').textContent='Peep Connect · 0.18.3';window.PeepStudio={themes:studioThemes,setMotion,selectApp,get themeNavigation(){return themeNavigation}};
})();
