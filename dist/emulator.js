/* Emulator shell. It frames the real interface at 960 × 540 CSS px and drives it like a remote.
   Real data only when the local service answers; otherwise the labelled fictional demo. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const WIDTH=960,HEIGHT=540;
 const frame=$('emu-frame'),slot=$('emu-slot'),boot=$('emu-boot'),ring=$('emu-focus-ring');
 const narrow=matchMedia('(max-width:860px)');
 let fit=true,scale=1,source='checking',remoteDriven=false,frameTimer=0,lastFocus=null;

 const SOURCES={
  real:{title:'Dados reais',detail:'serviço local · interface em modo navegador',src:'index.html?tv=1',
   note:'Dados do serviço local. No navegador as métricas da TV chegam por ADB pelo computador, não pela ponte Android; apps instalados e desempenho só valem no aparelho.'},
  demo:{title:'Demonstração',detail:'dados fictícios · nenhuma TV ou conta consultada',src:'../demo/studio.html?tv=1',
   note:'Valores fictícios para avaliar layout e navegação. Abra este emulador pelo serviço local do computador para ver dados reais.'},
  none:{title:'Sem fonte',detail:'serviço local e demonstração indisponíveis',src:'',
   note:'Abra o emulador pelo serviço local (porta do Peep Connect no computador) ou por uma cópia que inclua a pasta demo.'}
 };

 /* ---------- scale ---------- */
 function layout(){
  const readout=slot.querySelector('.emu-readout'),chrome=9+22+20+12+(readout?readout.offsetHeight:0)+6;
  const availableWidth=slot.clientWidth-18-4;
  const availableHeight=narrow.matches?Infinity:slot.clientHeight-chrome;
  scale=fit?Math.max(.2,Math.min(availableWidth/WIDTH,availableHeight/HEIGHT,2)):1;
  document.documentElement.style.setProperty('--emu-scale',scale.toFixed(4));
  $('emu-scale').textContent=Math.round(scale*100)+'%';
  slot.classList.toggle('is-actual',!fit);
  paintRing();
 }
 new ResizeObserver(layout).observe(slot);
 narrow.addEventListener('change',layout);

 /* ---------- source ---------- */
 async function detect(){
  try{const response=await fetch('api/health',{cache:'no-store'});if(response.ok){const data=await response.json();if(data&&data.ok===true)return 'real'}}catch{}
  try{const response=await fetch('../demo/studio.html',{method:'HEAD',cache:'no-store'});if(response.ok)return 'demo'}catch{}
  return 'none';
 }
 function setSource(kind){
  source=kind;const info=SOURCES[kind],pill=$('emu-source');
  pill.dataset.state=kind;$('emu-source-title').textContent=info.title;$('emu-source-detail').textContent=info.detail;$('emu-note').textContent=info.note;
  if(!info.src){boot.classList.add('failed');boot.classList.remove('done');$('emu-boot-text').textContent='Nenhuma fonte respondeu. '+info.note;return}
  startBoot(kind==='demo'?'Carregando a demonstração…':'Conectando ao serviço local…');frame.src=info.src;
 }
 function startBoot(text){boot.classList.remove('done','failed');$('emu-boot-text').textContent=text;$('emu-led').classList.remove('on')}

 /* ---------- the framed document ---------- */
 const inner=()=>{try{const doc=frame.contentDocument;return doc&&doc.body?doc:null}catch{return null}};
 function describe(element,doc){
  if(!element||element===doc.body||element===doc.documentElement)return ['nenhum elemento',''];
  const label=(element.getAttribute('aria-label')||element.textContent||element.id||'').replace(/\s+/g,' ').trim().slice(0,70);
  const kind=element.tagName.toLowerCase()+(element.id?'#'+element.id:'');
  return [label||kind,label?kind:''];
 }
 function refresh(){
  cancelAnimationFrame(frameTimer);
  frameTimer=requestAnimationFrame(()=>{
   const doc=inner();if(!doc)return;
   const [name,kind]=describe(doc.activeElement,doc);$('emu-focus-name').textContent=name;$('emu-focus-kind').textContent=kind;
   const page=doc.querySelector('header .nav.active')?.dataset.page||'';
   for(const chip of document.querySelectorAll('.emu-chip'))chip.classList.toggle('current',chip.dataset.go===page);
   paintRing();
  });
 }
 /* The app draws its own focus. The overlay only appears when the on-screen remote moved the focus
    and the browser did not treat it as keyboard focus, so the position is never invisible. */
 function paintRing(){
  const doc=inner(),element=doc?.activeElement;
  let visible=false;
  if(remoteDriven&&element&&element!==doc.body&&element!==doc.documentElement){
   let native=false;try{native=element.matches(':focus-visible')}catch{}
   const rect=element.getBoundingClientRect();
   if(!native&&rect.width>0&&rect.bottom>0&&rect.top<HEIGHT&&rect.right>0&&rect.left<WIDTH){
    visible=true;
    ring.style.left=Math.max(0,rect.left*scale-3)+'px';ring.style.top=Math.max(0,rect.top*scale-3)+'px';
    ring.style.width=Math.min(WIDTH,rect.width)*scale+6+'px';ring.style.height=Math.min(HEIGHT,rect.height)*scale+6+'px';
   }
  }
  ring.hidden=!visible;
 }
 const KEY_BUTTON={ArrowUp:'ArrowUp',ArrowDown:'ArrowDown',ArrowLeft:'ArrowLeft',ArrowRight:'ArrowRight',Enter:'Enter',Escape:'Back'};
 function flash(key){
  const button=document.querySelector('.emu-key[data-key="'+key+'"]');
  if(button){button.classList.add('pressed');setTimeout(()=>button.classList.remove('pressed'),150)}
  for(const id of ['emu-ir','emu-led']){const light=$(id);light.classList.add(id==='emu-ir'?'on':'blink');setTimeout(()=>light.classList.remove(id==='emu-ir'?'on':'blink'),150)}
 }
 frame.addEventListener('load',()=>{
  const doc=inner();if(!doc||!frame.getAttribute('src'))return;
  doc.addEventListener('focusin',event=>{lastFocus=event.target;refresh()});
  doc.addEventListener('click',()=>setTimeout(refresh,60));
  doc.addEventListener('scroll',refresh,true);
  doc.addEventListener('pointerdown',()=>{remoteDriven=false;paintRing()},true);
  doc.addEventListener('keydown',event=>{if(event.isTrusted)remoteDriven=false;if(KEY_BUTTON[event.key])flash(KEY_BUTTON[event.key]);setTimeout(refresh,40)},true);
  setTimeout(()=>{boot.classList.add('done');$('emu-led').classList.add('on');try{frame.contentWindow.focus()}catch{}refresh()},450);
 });

 /* ---------- remote ---------- */
 // Using the remote must not cost the TV its focus: give it back before acting.
 function regain(doc){
  try{frame.contentWindow.focus()}catch{}
  const lost=!doc.activeElement||doc.activeElement===doc.body||doc.activeElement===doc.documentElement;
  if(lost&&lastFocus&&lastFocus.isConnected&&lastFocus.ownerDocument===doc&&lastFocus.getClientRects().length)lastFocus.focus({preventScroll:true});
 }
 function fire(key){
  const doc=inner();if(!doc)return;
  const target=doc.activeElement&&doc.activeElement!==doc.documentElement?doc.activeElement:doc.body;
  target.dispatchEvent(new frame.contentWindow.KeyboardEvent('keydown',{key,code:key,bubbles:true,cancelable:true}));
 }
 function send(key){
  const doc=inner();if(!doc)return;
  remoteDriven=true;regain(doc);
  if(key==='Enter'){
   const element=doc.activeElement;flash('Enter');
   if(element&&element!==doc.body&&element!==doc.documentElement)element.click();else fire('ArrowDown');
  }else if(key==='Back'||key==='Home'){
   flash(key);const dialog=doc.querySelector('dialog[open]');
   if(dialog)dialog.close();
   if(!dialog||key==='Home')fire('Escape');
  }else fire(key);
  setTimeout(refresh,60);
 }
 function go(page){
  const doc=inner();if(!doc)return;
  remoteDriven=true;flash('');
  const dialog=doc.querySelector('dialog[open]');if(dialog)dialog.close();
  const target=page==='themes'?doc.getElementById('themes'):doc.querySelector('[data-page="'+page+'"]');
  if(target){target.click();target.focus()}
  try{frame.contentWindow.focus()}catch{}
  setTimeout(refresh,80);
 }
 // Pointer presses on the remote keep the focus inside the TV; keyboard users can still tab to the keys.
 document.querySelector('.emu-remote').addEventListener('pointerdown',event=>{if(event.target.closest('button'))event.preventDefault()});
 for(const button of document.querySelectorAll('.emu-key'))button.addEventListener('click',()=>send(button.dataset.key));
 for(const chip of document.querySelectorAll('.emu-chip'))chip.addEventListener('click',()=>go(chip.dataset.go));
 // Arrow keys always drive the TV, even while the pointer last touched the emulator chrome.
 document.addEventListener('keydown',event=>{
  if(event.ctrlKey||event.metaKey||event.altKey)return;
  const onControl=event.target instanceof Element&&event.target.closest('button,a');
  if(event.key.startsWith('Arrow')){event.preventDefault();send(event.key)}
  else if(event.key==='Enter'&&!onControl){event.preventDefault();send('Enter')}
  else if(event.key==='Escape'&&!document.fullscreenElement){event.preventDefault();send('Back')}
 });

 /* ---------- chrome ---------- */
 $('emu-reload').addEventListener('click',()=>{
  if(!SOURCES[source]?.src){detect().then(setSource);return}
  startBoot('Recarregando…');try{frame.contentWindow.location.reload()}catch{frame.src=SOURCES[source].src}
 });
 $('emu-fit').addEventListener('click',()=>{fit=!fit;$('emu-fit').setAttribute('aria-pressed',String(fit));$('emu-fit-label').textContent=fit?'Ajustar':'1 : 1';layout()});
 $('emu-safe').addEventListener('click',()=>{const on=$('emu-safe-area').hidden;$('emu-safe-area').hidden=!on;$('emu-safe').setAttribute('aria-pressed',String(on))});
 $('emu-full').addEventListener('click',()=>{if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>{})});

 layout();
 detect().then(setSource);
 window.PeepEmulator={send,go,get source(){return source},get scale(){return scale}};
})();
