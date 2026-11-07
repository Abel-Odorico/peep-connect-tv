// Conta autorizada pelo Google; a chave de API fica somente no serviço local.
let youtubeState={configured:false,apiConfigured:false,connected:false},youtubeBusy=false,youtubeAccountBusy=false;
function youtubeMessage(message){$('#youtube-status').textContent=message;$('#youtube-empty').hidden=false}
function paintYouTubeAccount(){
 $('#youtube-connect').textContent=youtubeState.connected?'Gerenciar canais':'Conectar pelo celular';
 $('#youtube-title').textContent=youtubeState.connected?'Dos seus canais':'Populares no Brasil';
 $('#youtube-account').textContent=youtubeState.connected?(youtubeState.account||'Conta autorizada no Google'):'Nenhuma conta autorizada neste painel · seleção pública do YouTube';
 $('.youtube-credit').textContent=youtubeState.connected?'Vídeos recentes de suas inscrições; recomendações completas no YouTube.':'Seleção pública por popularidade no Brasil. Não usa histórico nem preferências da sua conta.';
}
async function youtubeStatus(load=true){
 try{youtubeState=await localJSON('/api/youtube/status');paintYouTubeAccount();
  if(load&&(youtubeState.connected||youtubeState.apiConfigured))await loadYouTube();
  else if(!youtubeState.connected&&!youtubeState.apiConfigured)youtubeMessage('Configure a chave da API ou conecte sua conta para carregar vídeos.');
  return true;
 }catch(e){youtubeMessage(localMode?'O serviço em execução ainda não possui a integração do YouTube. Reinicie server.py no Terminal e recarregue a página.':'Abra a versão conectada no Mac para carregar os vídeos.');$('#youtube-account').textContent='Serviço do YouTube indisponível · nenhuma conta identificada';return false;}
}
function youtubeSetup(){
 const serviceNote=youtubeState.deviceFlowVersion>=2?'':'<p class="inline-note"><strong>Reinicie o serviço no Mac para ativar esta versão do login por QR code.</strong></p>';
 show(serviceNote+'<p class="eyebrow">GOOGLE · CONEXÃO PELO CELULAR</p><h2>Falta ativar o login por QR code.</h2><p>A TV ficará nesta tela. A escolha da conta e a autorização serão feitas no seu celular.</p><p class="inline-note">A chave de vídeos públicos já é separada deste acesso. Falta configurar uma vez o cliente OAuth específico para TV.</p><ol class="youtube-steps"><li>No Mac, abra <strong>console.cloud.google.com/apis/credentials</strong>.</li><li>Crie um cliente OAuth do tipo <strong>TVs e dispositivos de entrada limitada</strong>.</li><li>Salve o JSON em <code>konka-glass/.private/google-tv-client.json</code>.</li><li>Habilite YouTube Data API v3 e inclua sua conta como usuário de teste, se o projeto estiver em teste.</li></ol><button id="youtube-check" class="panel-button">Verificar configuração</button><p id="youtube-setup-status" role="status">Nenhum QR de autorização foi gerado ainda.</p>');
 $('#youtube-check').onclick=async()=>{await youtubeStatus(false);if(youtubeState.deviceConfigured)youtubeDevicePanel();else $('#youtube-setup-status').textContent='Cliente OAuth para TV ainda não encontrado. Salve o arquivo no Mac e verifique novamente.'};
}
async function youtubeAccount(){
 if(youtubeAccountBusy)return;
 youtubeAccountBusy=true;
 show('<p class="eyebrow">YOUTUBE · SUA CONTA</p><h2>Verificando conexão</h2><p id="youtube-account-loading" role="status">Consultando a configuração do Google no serviço local…</p>');
 try{
 const ok=await youtubeStatus(false);
 if(!panel.open||!$('#youtube-account-loading'))return;
 if(!ok){show('<h2>Serviço indisponível</h2><p>Não foi possível verificar a conta. Confira se o serviço está ativo no Mac e tente novamente.</p><button id="youtube-account-retry" class="panel-button">Tentar novamente</button>');$('#youtube-account-retry').onclick=youtubeAccount;return}

 if(youtubeState.deviceConfigured){youtubeDevicePanel();return}
 if(!youtubeState.configured||typeof PeepTV!=='undefined'){youtubeSetup();return}
 const account=youtubeState.account||'Conta autorizada';
 show('<p class="eyebrow">YOUTUBE · SUA CONTA</p><h2>'+(youtubeState.connected?escapeHTML(account):'Escolher conta Google')+'</h2><p>O Google mostrará as contas disponíveis nesse navegador. Escolha a que deseja usar no painel e autorize a leitura de suas inscrições.</p><a class="panel-button" href="/api/youtube/connect">'+(youtubeState.connected?'Trocar conta no Google ↗':'Identificar e escolher conta ↗')+'</a>'+(youtubeState.connected?'<button id="youtube-load" class="text-button">Atualizar meus canais</button><button id="youtube-disconnect" class="text-button">Desconectar deste painel</button>':'')+'<p class="inline-note">A conta escolhida no painel pode ser diferente da conta usada no aplicativo YouTube da TV. A seleção permanece salva neste Mac até você desconectar.</p>');
 if($('#youtube-load'))$('#youtube-load').onclick=()=>{panel.close();loadYouTube()};
 if($('#youtube-disconnect'))$('#youtube-disconnect').onclick=disconnectYouTube;
 }finally{youtubeAccountBusy=false}
}
async function disconnectYouTube(){
 try{const response=await fetch('/api/youtube/disconnect',{method:'POST',headers:{'X-Konka-Action':'disconnect'}});if(!response.ok)throw Error();$('#youtube-rail').replaceChildren();panel.close();await youtubeStatus();notify('Conta desconectada deste painel. A seleção pública continua disponível.')}catch{notify('Não foi possível desconectar. Verifique o serviço local.')}
}
async function selectYouTubeChannel(id){
 try{const response=await fetch('/api/youtube/select',{method:'POST',headers:{'Content-Type':'application/json','X-Konka-Action':'youtube-select'},body:JSON.stringify({id})});const data=await response.json();if(!response.ok)throw Error(data.error||'Canal indisponível.');youtubeState=data;$('#youtube-rail').replaceChildren();paintYouTubeAccount();youtubeDevicePanel();await loadYouTube()}catch(error){notify(error.message||'Não foi possível trocar de canal.')}
}
async function loadYouTube(){
 if(youtubeBusy)return;
 youtubeBusy=true;$('#youtube-refresh').disabled=true;$('#youtube-refresh').textContent='Carregando…';
 youtubeMessage(youtubeState.connected?'Buscando vídeos dos seus canais…':'Buscando vídeos populares no Brasil…');
 try{
  const data=await localJSON('/api/youtube/feed',75000);
  const personal=data.mode==='subscriptions'||data.personalized===true;
  $('#youtube-title').textContent=personal?'Dos seus canais':'Populares no Brasil';
  $('#youtube-account').textContent=personal?(data.account+' · '+data.channelCount+' canais consultados'):'Seleção pública do YouTube · Brasil · nenhuma conta usada';
  if(personal)youtubeState.account=data.account;
  const rail=$('#youtube-rail');rail.replaceChildren();
  for(const item of data.results||[]){
   if(!/^[A-Za-z0-9_-]{11}$/.test(item.id))continue;
   const link=document.createElement('a');link.className='video-card';link.href='https://www.youtube.com/watch?v='+item.id;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label',item.title+' · '+item.channel+' · abrir no YouTube');
   const image=document.createElement('img');image.src='https://i.ytimg.com/vi/'+item.id+'/mqdefault.jpg';image.width=320;image.height=180;image.loading='lazy';image.decoding='async';image.alt='';
   const title=document.createElement('strong');title.textContent=item.title;
   const channel=document.createElement('small');channel.textContent=item.channel;
   link.append(image,title,channel);rail.append(link);
  }
  $('#youtube-empty').hidden=rail.children.length>0;
  if(!rail.children.length)youtubeMessage(personal?'Nenhum vídeo disponível nas inscrições consultadas.':'A consulta não retornou vídeos públicos. Tente atualizar.');
  const at=new Date(data.at*1000).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  $('.youtube-credit').textContent=(personal?'Vídeos recentes de até 12 canais inscritos.'+(data.limited?' Seleção parcial dos canais.':'')+(data.partial?' Alguns canais não responderam.':''):'Vídeos públicos por popularidade no Brasil; não são recomendações personalizadas.')+' Consulta '+at+' · cache de até 15 minutos.';
 }catch(e){youtubeMessage(e.message);if($('#youtube-rail').children.length)$('#youtube-account').textContent+=' · última consulta salva';}
 finally{youtubeBusy=false;$('#youtube-refresh').disabled=false;$('#youtube-refresh').textContent='Atualizar vídeos';}
}
const youtubeRefresh=document.createElement('button');youtubeRefresh.id='youtube-refresh';youtubeRefresh.className='text-button';youtubeRefresh.textContent='Atualizar vídeos';youtubeRefresh.onclick=()=>youtubeStatus();
$('#youtube-section .section-heading').append(youtubeRefresh);
$('#youtube-connect').onclick=youtubeAccount;
// Só identifica contas autorizadas ao app. Cookies de outros sites não são consultados.
youtubeStatus();

// Device authorization stays inside this panel; only the phone opens Google.
let youtubeDeviceStop=null;
function stopYouTubeDevice(){youtubeDeviceStop?.();youtubeDeviceStop=null}
panel.addEventListener('close',stopYouTubeDevice);
window.addEventListener('peep-panel-replace',stopYouTubeDevice);
async function youtubeDevicePost(action,body={},signal){
 const response=await fetch('/api/youtube/device/'+action,{method:'POST',headers:{'Content-Type':'application/json','X-Konka-Action':'youtube-device'},body:JSON.stringify(body),signal});
 const data=await response.json();if(!response.ok)throw Error(data.error||'Não foi possível consultar a conexão.');return data;
}
function youtubeDevicePanel(){
 const accounts=Array.isArray(youtubeState.accounts)?youtubeState.accounts:[];
 const rows=accounts.map(item=>'<button class="youtube-account-choice" data-account="'+escapeHTML(item.id)+'" aria-pressed="'+(item.id===youtubeState.active)+'">'+(item.image?'<img src="'+escapeHTML(item.image)+'" alt="">':'<span class="youtube-account-avatar">▶</span>')+'<span>'+escapeHTML(item.title)+'</span><small>'+(item.id===youtubeState.active?'Em uso':'Trocar para este canal')+'</small></button>').join('');
 show('<p class="eyebrow">YOUTUBE · CONECTAR PELO CELULAR</p><h2>Seus canais na TV</h2><p>Entre com a conta Google que administra o canal desejado. Se o Google apresentar uma lista de canais, selecione o canal certo. Cada autorização fica salva separadamente neste Mac.</p>'+(rows?'<div class="youtube-account-list">'+rows+'</div>':'<p class="inline-note">Nenhum canal autorizado ainda.</p>')+'<div id="youtube-device-stage"><button id="youtube-device-start" class="panel-button">'+(accounts.length?'Conectar outro canal':'Gerar QR code e código')+'</button></div><p class="inline-note">O aviso “Google não verificou este app” é esperado enquanto o projeto estiver em testes. Reconhecendo este app, toque em “Continuar” no celular e confirme a permissão de leitura. A conta do aplicativo YouTube da TV é independente.</p>'+(youtubeState.connected?'<button id="youtube-disconnect" class="text-button">Desconectar canal em uso</button>':''));
 $('#youtube-device-start').onclick=startYouTubeDevice;document.querySelectorAll('.youtube-account-choice').forEach(button=>button.onclick=()=>selectYouTubeChannel(button.dataset.account));if($('#youtube-disconnect'))$('#youtube-disconnect').onclick=disconnectYouTube;
}
async function startYouTubeDevice(){
 const host=$('#youtube-device-stage');if(!host)return;stopYouTubeDevice();
 let closed=false,timer=0,session=null,expires=0,interval=5;const controller=new AbortController();
 const status=message=>{const node=$('#youtube-device-status');if(node)node.textContent=message};
 const cleanup=()=>{closed=true;clearTimeout(timer);controller.abort();document.removeEventListener('visibilitychange',visible);if(session)youtubeDevicePost('cancel',{id:session.id}).catch(()=>{});session=null};
 youtubeDeviceStop=cleanup;
 host.innerHTML='<p id="youtube-device-status" role="status">Solicitando um código ao Google…</p>';
 function schedule(){clearTimeout(timer);if(!closed&&!document.hidden)timer=setTimeout(poll,interval*1000)}
 function visible(){if(document.hidden){clearTimeout(timer)}else schedule()}
 function terminal(message){clearTimeout(timer);session=null;host.innerHTML='<p role="status">'+escapeHTML(message)+'</p><button id="youtube-device-retry" class="panel-button">Gerar novo código</button>';$('#youtube-device-retry').onclick=startYouTubeDevice}
 async function poll(){
  if(closed||!session||document.hidden)return;
  if(Date.now()>=expires){const id=session.id;youtubeDevicePost('cancel',{id}).catch(()=>{});terminal('Este código expirou. Gere outro para continuar.');return}
  try{
   const data=await youtubeDevicePost('poll',{id:session.id},controller.signal);if(closed)return;
   if(data.status==='connected'){session=null;stopYouTubeDevice();host.innerHTML='<h3>Canal conectado</h3><p role="status">'+escapeHTML(data.account||'Autorização recebida')+' · seus vídeos estão sendo carregados.</p><button id="youtube-device-done" class="panel-button">Ver canais conectados</button>';$('#youtube-device-done').onclick=youtubeDevicePanel;await youtubeStatus();return}
   if(data.status!=='pending'){terminal(data.status==='denied'?'Você recusou a autorização no Google.':data.status==='expired'?'O código expirou. Gere um novo.':'O Google não concluiu a autorização. Confira o cliente OAuth e as permissões.');return}
   interval=Math.max(5,Number(data.interval)||5);status('Aguardando autorização · código válido por mais '+Math.max(1,Math.ceil((expires-Date.now())/60000))+' min');schedule();
  }catch(error){if(closed)return;status('Conexão interrompida. Tentaremos novamente enquanto o código estiver válido.');interval=Math.min(30,interval+5);schedule()}
 }
 document.addEventListener('visibilitychange',visible);
 try{
  const data=await youtubeDevicePost('start',{},controller.signal);if(closed)return;session=data;interval=Math.max(5,Number(data.interval)||5);expires=Date.now()+data.expiresIn*1000;
  const url=new URL(data.verificationUrl);if(url.protocol!=='https:'||!['google.com','www.google.com','accounts.google.com'].includes(url.hostname))throw Error('Endereço de autorização inválido.');
  host.innerHTML='<div class="youtube-device-grid"><div id="youtube-device-qr" aria-label="QR code para abrir o Google no celular"></div><div><span class="eyebrow">NO CELULAR</span><p>1. Aponte a câmera para o QR code.</p><p>2. No Google, informe este código:</p><strong id="youtube-device-code"></strong><p>3. Toque em “Continuar” no aviso de app em teste, escolha o canal correto (por exemplo, Além do Alcance) e autorize a leitura.</p><small id="youtube-device-url"></small></div></div><p id="youtube-device-status" role="status">Aguardando autorização no celular…</p><button id="youtube-device-cancel" class="text-button">Cancelar</button>';
  $('#youtube-device-code').textContent=data.userCode;$('#youtube-device-url').textContent=data.verificationUrl;$('#youtube-device-cancel').onclick=()=>panel.close();
  try{const svg=await PeepQR.svg(data.verificationUrl);if(!closed&&$('#youtube-device-qr'))$('#youtube-device-qr').innerHTML=svg}catch{if(!closed)$('#youtube-device-qr').textContent='Abra no celular o endereço ao lado.'}
  schedule();
 }catch(error){if(!closed)terminal(error.message)}
}
