/* Peep Horizons 0.13 — movimento local, temas e Bluetooth nativo. */
const horizonThemes=[
 {id:'graphite',name:'Grafite',description:'Preto mineral, prata e um toque de gelo.',colors:['#080a0e','#171b24','#d8e2ef','#8d9caf'],accent:'#d8e2ef',mode:'dark',surface:'#141820',ink:'#f0f3f7',muted:'#a7b2c2'},
 {id:'jade',name:'Jardim Noturno',description:'Verde profundo com luz de jade.',colors:['#071510','#122b21','#9cdbb6','#c7d4a1'],accent:'#9cdbb6',mode:'dark',surface:'#10251c',ink:'#edf8f1',muted:'#a5bcae'},
 {id:'amethyst',name:'Ametista',description:'Violeta fumê, lilás e superfícies silenciosas.',colors:['#100d1b','#282039','#c7b4f3','#efcfdf'],accent:'#c7b4f3',mode:'dark',surface:'#211b30',ink:'#f4effc',muted:'#b9aec8'},
 {id:'copper',name:'Cobre',description:'Terra escura e cobre aquecido pela luz.',colors:['#19100e','#32221d','#e4ac87','#c9c2ad'],accent:'#e4ac87',mode:'dark',surface:'#2b1d19',ink:'#fcf1e8',muted:'#c7afa0'},
 {id:'ocean',name:'Mar Profundo',description:'Azul noturno e detalhes em água-marinha.',colors:['#04131c','#0b2a38','#8cdde0','#e1ecf3'],accent:'#8cdde0',mode:'dark',surface:'#0b2431',ink:'#ecf8fc',muted:'#9dbac9'},
 {id:'rose',name:'Rosa Mineral',description:'Vinho profundo, rosa queimado e contraste macio.',colors:['#1b1019','#34212e','#e6abc2','#d5bcc4'],accent:'#e6abc2',mode:'dark',surface:'#2d1c28',ink:'#fceff5',muted:'#c9aebb'},
 {id:'paper',name:'Papel & Tinta',description:'Papel quente, tinta escura e verde sálvia.',colors:['#efebe3','#faf7f1','#28574f','#242b2a'],accent:'#28574f',mode:'light',surface:'#faf7f1',ink:'#242b2a',muted:'#59655f'}
];
for(const theme of horizonThemes)if(!themeCatalog.some(t=>t.id===theme.id))themeCatalog.push(theme);
const horizonScenes=[
 {id:'boreal',name:'Boreal',description:'Véus verdes sobre um céu profundo.',colors:['#042326','#157f79','#82cfba']},
 {id:'silk',name:'Seda',description:'Dobras de lavanda e luz violeta.',colors:['#170f2e','#7161ac','#d6a9d1']},
 {id:'solar',name:'Solar',description:'Luz âmbar atravessando tons de coral.',colors:['#25121c','#c64f55','#e8a569']},
 {id:'abyss',name:'Abissal',description:'Ondas azuis em um horizonte noturno.',colors:['#030a19','#164a80','#49a8ba']},
 {id:'dunes',name:'Dunas',description:'Camadas de areia em movimento lento.',colors:['#211b19','#7c6852','#c8ad83']},
 {id:'eclipse',name:'Eclipse',description:'Preto, prata e uma linha de luz.',colors:['#030405','#252b36','#7c8caa']}
];
livingIcons.bluetooth='<path d="m7 7 10 10-5 4V3l5 4L7 17"/>';
livingIcons.wind='<path d="M3 8h12a3 3 0 1 0-3-3M2 12h17a2 2 0 1 1-2 2M4 16h6a2 2 0 1 1-2 2"/>';
const horizonStage=document.createElement('div');horizonStage.className='peep-motion-stage';horizonStage.setAttribute('aria-hidden','true');horizonStage.innerHTML='<i class="motion-sheet sheet-a"></i><i class="motion-sheet sheet-b"></i>';document.body.prepend(horizonStage);
function horizonMotionAllowed(){return prefs.motion!==false&&prefs.performance!=='economy'&&!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches}
function horizonApply(){
 const theme=horizonThemes.find(t=>t.id===prefs.theme);document.body.classList.toggle('horizon-theme',!!theme);document.body.classList.toggle('horizon-light',theme?.mode==='light');
 if(theme){for(const [name,value]of Object.entries({base:theme.colors[0],surface:theme.surface,ink:theme.ink,muted:theme.muted}))document.body.style.setProperty('--h-'+name,value)}
 const selected=(horizonScenes.some(s=>s.id===prefs.motionWallpaper)||window.PeepCollections?.isMotionId(prefs.motionWallpaper))?prefs.motionWallpaper:'off';document.body.dataset.motionScene=selected;horizonStage.dataset.motion=selected;horizonStage.hidden=selected==='off';
 document.body.classList.toggle('horizon-pan',prefs.motionWallpaper==='landscape');document.body.classList.toggle('horizon-motion-reduced',!horizonMotionAllowed());
 document.body.classList.toggle('horizon-hidden',document.hidden);horizonStage.style.setProperty('--motion-duration',prefs.motionPace==='slow'?'90s':'55s');window.PeepCollections?.apply();save();
}
const horizonBaseApply=apply;apply=function(){horizonBaseApply();horizonApply()};
function horizonSwatches(colors){return colors.map(c=>'<i style="background:'+c+'"></i>').join('')}
function horizonSettingsHTML(){return '<section class="horizon-settings"><h3>Fundo em movimento</h3><p>Escolha uma composição fluida ou dê um movimento panorâmico à paisagem atual.</p><div class="horizon-scene-grid">'+[{id:'off',name:'Imagem estática',description:'Preserva a imagem escolhida.',colors:['#253b48','#637984','#b5b1a4']},{id:'landscape',name:'Paisagem viva',description:'Movimento suave na sua imagem.',colors:['#1d4d57','#467963','#b9c8b0']},...horizonScenes].map(s=>'<button class="horizon-scene" data-motion-choice="'+s.id+'" aria-pressed="'+((prefs.motionWallpaper||'off')===s.id)+'"><span class="horizon-scene-art" data-motion="'+s.id+'"><i></i></span><strong>'+s.name+'</strong><small>'+s.description+'</small></button>').join('')+'</div><label class="option">Ritmo do fundo<select id="horizon-motion-pace"><option value="slow">Contemplativo</option><option value="normal">Fluido</option></select></label><label class="option">Cenário na tela de espera<select id="horizon-idle-scene">'+horizonScenes.map(s=>'<option value="'+s.id+'">'+s.name+'</option>').join('')+'</select></label><label class="option">Alternar cenários no descanso<input id="horizon-idle-cycle" type="checkbox" '+(prefs.idleSceneCycle?'checked':'')+'></label><p class="inline-note">A troca acontece a cada 3 minutos. Movimento reduzido e modo econômico mantêm o fundo estático. As paisagens e os fundos do TMDB continuam no seletor de imagens.</p><button class="panel-button" id="horizon-idle-demo">Visualizar descanso</button></section>'}
function horizonBind(){
 document.querySelectorAll('[data-motion-choice]').forEach(b=>b.onclick=()=>{prefs.motionWallpaper=b.dataset.motionChoice;apply();document.querySelectorAll('[data-motion-choice]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));notify('Fundo: '+b.querySelector('strong').textContent)});
 const pace=$('#horizon-motion-pace');if(!pace)return;pace.value=prefs.motionPace||'slow';pace.onchange=e=>{prefs.motionPace=e.target.value;apply()};
 const scene=$('#horizon-idle-scene');scene.value=prefs.idleScene||'boreal';scene.onchange=e=>{prefs.idleScene=e.target.value;save();horizonIdleScene()};
 $('#horizon-idle-cycle').onchange=e=>{prefs.idleSceneCycle=e.target.checked;save()};$('#horizon-idle-demo').onclick=()=>{panel.close();enterLivingIdle()};
}
function horizonMotionPanel(){show('<p class="eyebrow">LUZ, COR E MOVIMENTO</p><h2>Paisagens vivas</h2>'+horizonSettingsHTML()+'<button id="horizon-static-scenes" class="text-button">Escolher paisagem ou fundo do TMDB</button>');horizonBind();$('#horizon-static-scenes').onclick=()=>{prefs.motionWallpaper='off';apply();panel.close();scenes()}}
const horizonBaseScenes=scenes;scenes=function(){horizonBaseScenes();const btn=document.createElement('button');btn.className='panel-button';btn.id='horizon-scenes-link';btn.textContent='Explorar fundos em movimento';btn.onclick=()=>{panel.close();horizonMotionPanel()};$('#panel-content').prepend(btn);if(prefs.motionWallpaper&&prefs.motionWallpaper!=='off'){const staticButton=document.createElement('button');staticButton.id='horizon-use-image';staticButton.className='text-button';staticButton.textContent='Usar a imagem selecionada, sem fundo animado';staticButton.onclick=()=>{prefs.motionWallpaper='off';apply();staticButton.remove();notify('Imagem estática ativada.')};btn.after(staticButton)}};$('#wallpaper').onclick=()=>scenes();
const horizonBasePicker=themePicker;themePicker=function(){horizonBasePicker();const intro=$('#panel-content h2+p');if(intro)intro.textContent=themeCatalog.length+' temas, do preto absoluto ao papel claro. Escolha o acabamento e a luz da sua tela.';document.querySelectorAll('.theme-option').forEach(option=>{const t=horizonThemes.find(x=>x.id===option.dataset.themeChoice);if(t){option.querySelector('.theme-preview').style.background=t.colors[0];option.querySelector('.preview-title').style.background=t.accent;option.querySelector('.theme-preview').style.boxShadow='inset -60px -20px 55px '+t.colors[1]}});$('#panel-content').insertAdjacentHTML('beforeend',horizonSettingsHTML());horizonBind()};$('#themes').onclick=()=>themePicker();
const horizonBaseAppearance=appearance;appearance=function(){horizonBaseAppearance();$('#panel-content').insertAdjacentHTML('beforeend',horizonSettingsHTML());horizonBind()};$('#glass-shortcut').onclick=()=>appearance();

// A small, explicit status entry. Never derives a connection from a bonded device.
let horizonBluetooth={state:'unavailable',devices:[],paired:[]};
const btButton=document.createElement('button');btButton.id='bluetooth-pill';btButton.className='icon-button';btButton.setAttribute('aria-label','Bluetooth: consultar conexões');btButton.title='Bluetooth';btButton.innerHTML=livingIcon('bluetooth')+'<i></i>';
$('.status').insertBefore(btButton,$('#settings'));btButton.onclick=()=>horizonBluetoothPanel();
function horizonReadBluetooth(){
 if(typeof PeepTV==='undefined'||typeof PeepTV.bluetoothStatus!=='function'){horizonBluetooth={state:'unavailable',devices:[],paired:[]};btButton.dataset.state='unavailable';if($('#horizon-bt-data'))horizonPaintBluetooth();return;}
 try{const snapshot=JSON.parse(PeepTV.bluetoothStatus());if(snapshot&&typeof snapshot.state==='string'){horizonBluetooth={...snapshot,devices:Array.isArray(snapshot.devices)?snapshot.devices:[],paired:Array.isArray(snapshot.paired)?snapshot.paired:[]}}}catch(error){horizonBluetooth={state:'error',devices:[],paired:[]}}
 const count=horizonBluetooth.devices.length;btButton.dataset.state=count?'connected':horizonBluetooth.state;btButton.setAttribute('aria-label','Bluetooth: '+(count?count+' dispositivo'+(count>1?'s':'')+' conectado'+(count>1?'s':''):horizonBluetooth.state==='off'?'desativado':horizonBluetooth.state==='permission'?'autorizar leitura':'consultar conexões'));
 if($('#horizon-bt-data'))horizonPaintBluetooth();
}
function horizonBluetoothMessage(){const state=horizonBluetooth.state;return state==='permission'?'Permita o acesso a dispositivos próximos para consultar o Bluetooth da TV.':state==='off'?'O Bluetooth da TV está desativado.':state==='unsupported'?'Esta TV não disponibiliza um adaptador Bluetooth.':state==='unavailable'?'A leitura está disponível no aplicativo atualizado da TV. O navegador não acessa os dispositivos Bluetooth da Konka.':state==='error'?'Não foi possível consultar o Bluetooth agora.':state==='loading'?'Consultando as conexões da TV…':horizonBluetooth.devices.length?'Dispositivos conectados agora.':'Nenhuma conexão detectada nos perfis disponíveis.'}
function horizonPaintBluetooth(){const container=$('#horizon-bt-data');if(!container)return;const d=horizonBluetooth;container.innerHTML='<p role="status">'+escapeHTML(horizonBluetoothMessage())+'</p>'+d.devices.map(x=>'<div class="horizon-bt-row">'+livingIcon('bluetooth')+'<span><b>'+escapeHTML(x.name||'Dispositivo Bluetooth')+'</b><small>'+escapeHTML(x.kind||'Dispositivo')+'</small></span><em>Conectado</em></div>').join('')+(d.paired.length?'<h3>Salvos na TV</h3>'+d.paired.map(x=>'<div class="horizon-bt-paired"><span>'+escapeHTML(x.name||'Dispositivo Bluetooth')+'</span><small>Pareado · conexão não confirmada</small></div>').join(''):'')+((d.state==='ready'||d.state==='loading')?'<p class="inline-note">Alguns controles e acessórios não expõem seu estado ao aplicativo. Se não aparecerem, confira em Controles e acessórios da TV. Pareado não significa conectado.</p>':'');const allow=$('#horizon-bt-allow');if(allow)allow.hidden=d.state!=='permission';}
function horizonBluetoothPanel(){horizonReadBluetooth();show('<p class="eyebrow">SUAS CONEXÕES</p><h2>Bluetooth</h2><div id="horizon-bt-data"></div><button id="horizon-bt-allow" class="panel-button">Permitir leitura do Bluetooth</button><button id="horizon-bt-settings" class="text-button">Abrir configurações da TV</button>');horizonPaintBluetooth();$('#horizon-bt-allow').onclick=()=>{if(typeof PeepTV!=='undefined'&&typeof PeepTV.requestBluetooth==='function')PeepTV.requestBluetooth()};$('#horizon-bt-settings').onclick=()=>{if(typeof PeepTV!=='undefined'&&typeof PeepTV.openBluetoothSettings==='function')PeepTV.openBluetoothSettings();else notify('Abra Configurações → Controles e acessórios na TV.')};}

// Recompose the idle surface, retaining its data IDs, controls and wake contract.
idle.classList.add('horizon-idle');
const galleryStage=document.createElement('div');galleryStage.className='horizon-gallery-stage';galleryStage.setAttribute('aria-hidden','true');galleryStage.innerHTML='<i class="motion-sheet sheet-a"></i><i class="motion-sheet sheet-b"></i><div class="gallery-horizon"></div>';idle.prepend(galleryStage);
const identity=idle.querySelector('.rich-identity');identity.innerHTML='<span class="horizon-idle-logo" aria-hidden="true"></span><span>Peep Connect</span>';
const greeting=idle.querySelector('.rich-greeting');greeting.textContent='CONTAGEM · MINAS GERAIS';
idle.querySelector('.rich-current .rich-location').insertAdjacentHTML('afterbegin','<span class="horizon-climate-title">Lá fora, agora</span>');
idle.querySelector('.rich-conditions .living-icon').outerHTML=livingIcon('wind');
const clockElement=$('#idle-clock');clockElement.setAttribute('aria-label','Horário local');
idle.querySelector('.rich-time-rule').insertAdjacentHTML('afterend','<div class="horizon-idle-caption"><span class="horizon-scene-number">01 / 06</span><span id="horizon-scene-name">Boreal</span><span class="horizon-live-line"></span></div>');
const forecastHeading=idle.querySelector('.rich-forecast-heading>span');forecastHeading.textContent='NOS PRÓXIMOS DIAS';
const footer=idle.querySelector('.rich-footer');footer.insertAdjacentHTML('beforeend','<span class="horizon-remote-hint">← → painéis <span>·</span> ↑ ↓ cenários <span>·</span> OK voltar</span>');
const footerExit=idle.querySelector('.rich-exit');footerExit.textContent='Voltar à TV';footerExit.insertAdjacentHTML('beforeend',livingIcon('arrow'));
let horizonLastSceneAt=Date.now();
function horizonIdleScene(){const index=Math.max(0,horizonScenes.findIndex(s=>s.id===prefs.idleScene)),scene=horizonScenes[index];galleryStage.dataset.motion=scene.id;richSetText('horizon-scene-name',scene.name);idle.querySelector('.horizon-scene-number').textContent=String(index+1).padStart(2,'0')+' / 06';idle.dataset.quiet=String(prefs.idleStyle==='quiet');}
function horizonNextScene(delta){const index=Math.max(0,horizonScenes.findIndex(s=>s.id===prefs.idleScene));prefs.idleScene=horizonScenes[(index+delta+horizonScenes.length)%horizonScenes.length].id;horizonLastSceneAt=Date.now();horizonIdleScene();save()}
function horizonPaintIdle(){
 horizonIdleScene();const hour=new Date().getHours(),clock=$('#idle-clock');clock.dateTime=new Date().toISOString();
 const text=clock.textContent;if(clock.dataset.lastValue!==text||clock.childElementCount!==3){clock.dataset.lastValue=text;const parts=text.split(':');clock.innerHTML='<span>'+escapeHTML(parts[0]||'')+'</span><i aria-hidden="true">:</i><span>'+escapeHTML(parts[1]||'')+'</span>'}
 greeting.textContent='CONTAGEM · MINAS GERAIS';
 const source=$('#rich-weather-age');if(source&&source.textContent.startsWith('Atualizado às'))source.textContent=source.textContent.replace('Atualizado às','Consultado às');
 if(livingIdleActive&&prefs.idleSceneCycle&&horizonMotionAllowed()&&Date.now()-horizonLastSceneAt>=180000)horizonNextScene(1);
}
const horizonBaseClock=paintLivingClock;paintLivingClock=function(){horizonBaseClock();horizonPaintIdle()};
const horizonBaseEnter=enterLivingIdle;enterLivingIdle=function(){horizonLastSceneAt=Date.now();horizonBaseEnter();horizonPaintIdle()};
// Use the established capture listener, replacing only up/down with scene browsing.
const horizonBaseInput=livingInput;for(const type of richInputTypes)window.removeEventListener(type,livingInput,true);
livingInput=function(event){if(livingIdleActive&&event.type==='keydown'&&['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();horizonNextScene(event.key==='ArrowUp'?-1:1);return}horizonBaseInput(event)};
for(const type of richInputTypes)window.addEventListener(type,livingInput,{capture:true,passive:false});
window.PeepIdle={get active(){return livingIdleActive},wake:wakeLivingIdle,show:enterLivingIdle};
document.addEventListener('visibilitychange',()=>{horizonApply();if(!document.hidden)horizonReadBluetooth()});
window.addEventListener('peep-bluetooth',()=>horizonReadBluetooth());
const horizonBaseLivingOptions=livingOptions;livingOptions=function(){return horizonBaseLivingOptions().replace('Use ← e → para alternar os painéis. OK ou Voltar retorna; o mouse interage com os controles da tela.','Use ← → para trocar o painel e ↑ ↓ para explorar os cenários. OK ou Voltar retorna à TV.');};
horizonApply();paintLivingClock();horizonReadBluetooth();
setInterval(()=>{if(document.hidden)return;horizonReadBluetooth()},15000);
