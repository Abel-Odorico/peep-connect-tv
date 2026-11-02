// Conta autorizada pelo Google; a chave de API fica somente no serviço local.
let youtubeState={configured:false,apiConfigured:false,connected:false},youtubeBusy=false,youtubeAccountBusy=false;
function youtubeMessage(message){$('#youtube-status').textContent=message;$('#youtube-empty').hidden=false}
function paintYouTubeAccount(){
 $('#youtube-connect').textContent=youtubeState.connected?'Gerenciar conta':'Escolher conta Google';
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
 show('<p class="eyebrow">CONEXÃO COM O GOOGLE</p><h2>Escolha sua conta do YouTube</h2><p>A conexão deve ser concluída no navegador do Mac que está conectado à TV. Abra http://127.0.0.1:8770 no Mac e use este mesmo botão após configurar o acesso abaixo.</p><p class="inline-note">O painel ainda não tem um cliente OAuth configurado. A chave de API consulta vídeos públicos, mas não identifica contas ou autoriza acesso às suas inscrições.</p><ol class="youtube-steps"><li>Abra o Google Cloud do projeto da sua chave e habilite <strong>YouTube Data API v3</strong>.</li><li>Configure o consentimento e seu usuário de teste, se necessário.</li><li>Crie um cliente OAuth do tipo <strong>Aplicativo para computador</strong>.</li><li>Salve o JSON baixado como <code>konka-glass/.private/google-client.json</code> no Mac.</li></ol><a class="panel-button" href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">Abrir credenciais no Google Cloud ↗</a><button id="youtube-check" class="text-button">Verificar configuração</button><p class="inline-note">A autorização solicita somente leitura do YouTube. Nenhuma senha deve ser informada ao painel.</p>');
 $('#youtube-check').onclick=async()=>{await youtubeStatus(false);if(youtubeState.configured)youtubeAccount();else notify('Cliente OAuth ainda não encontrado. Confira o JSON no Mac e reinicie o serviço se necessário.')};
}
async function youtubeAccount(){
 if(youtubeAccountBusy)return;
 youtubeAccountBusy=true;
 show('<p class="eyebrow">YOUTUBE · SUA CONTA</p><h2>Verificando conexão</h2><p id="youtube-account-loading" role="status">Consultando a configuração do Google no serviço local…</p>');
 try{
 const ok=await youtubeStatus(false);
 if(!panel.open||!$('#youtube-account-loading'))return;
 if(!ok){show('<h2>Serviço indisponível</h2><p>Não foi possível verificar a conta. Confira se o serviço está ativo no Mac e tente novamente.</p><button id="youtube-account-retry" class="panel-button">Tentar novamente</button>');$('#youtube-account-retry').onclick=youtubeAccount;return}

 if(!youtubeState.configured){youtubeSetup();return}
 if(typeof PeepTV!=='undefined'){
  show('<p class="eyebrow">YOUTUBE · CONECTAR PELO MAC</p><h2>Escolha sua conta no navegador</h2><p>No Mac que mantém a TV conectada, abra <strong>http://127.0.0.1:8770</strong> e selecione <strong>Escolher conta Google</strong> na seção YouTube.</p><p>A autorização é feita no Google. Depois, seus canais ficam disponíveis neste painel da TV.</p><button id="youtube-tv-check" class="panel-button">Já autorizei · verificar conexão</button><p id="youtube-tv-state" role="status">'+(youtubeState.connected?'Conta autorizada neste painel.':'Aguardando autorização no Mac.')+'</p><p class="inline-note">A conta do aplicativo YouTube da TV não é importada automaticamente.</p>');
  $('#youtube-tv-check').onclick=async()=>{const button=$('#youtube-tv-check');button.disabled=true;try{await youtubeStatus(false);if(youtubeState.connected){panel.close();await loadYouTube();notify('Conta conectada. Carregando seus canais.')}else $('#youtube-tv-state').textContent='Ainda não recebemos a autorização. Conclua a escolha da conta no navegador do Mac.'}finally{button.disabled=false}};
  return;
 }
 const account=youtubeState.account||'Conta autorizada';
 show('<p class="eyebrow">YOUTUBE · SUA CONTA</p><h2>'+(youtubeState.connected?escapeHTML(account):'Escolher conta Google')+'</h2><p>O Google mostrará as contas disponíveis nesse navegador. Escolha a que deseja usar no painel e autorize a leitura de suas inscrições.</p><a class="panel-button" href="/api/youtube/connect">'+(youtubeState.connected?'Trocar conta no Google ↗':'Identificar e escolher conta ↗')+'</a>'+(youtubeState.connected?'<button id="youtube-load" class="text-button">Atualizar meus canais</button><button id="youtube-disconnect" class="text-button">Desconectar deste painel</button>':'')+'<p class="inline-note">A conta escolhida no painel pode ser diferente da conta usada no aplicativo YouTube da TV. A seleção permanece salva neste Mac até você desconectar.</p>');
 if($('#youtube-load'))$('#youtube-load').onclick=()=>{panel.close();loadYouTube()};
 if($('#youtube-disconnect'))$('#youtube-disconnect').onclick=disconnectYouTube;
 }finally{youtubeAccountBusy=false}
}
async function disconnectYouTube(){
 try{const response=await fetch('/api/youtube/disconnect',{method:'POST',headers:{'X-Konka-Action':'disconnect'}});if(!response.ok)throw Error();$('#youtube-rail').replaceChildren();panel.close();await youtubeStatus();notify('Conta desconectada deste painel. A seleção pública continua disponível.')}catch{notify('Não foi possível desconectar. Verifique o serviço local.')}
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
