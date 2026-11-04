// Public channel figures: no OAuth, no private analytics, no background polling.
(()=>{
 const host=document.querySelector('#youtube-section');if(!host)return;
 const section=document.createElement('section');section.className='channel-stats';section.setAttribute('aria-labelledby','channel-stats-title');
 section.innerHTML='<div class="section-heading"><div><p class="eyebrow">OBSERVATÓRIO · YOUTUBE</p><h2 id="channel-stats-title">Por dentro do canal</h2><p class="youtube-subtitle">Números públicos, sem conectar sua conta Google.</p></div><button type="button" id="channel-login-help" class="youtube-connect">Ajuda com a conexão</button></div><form id="channel-stats-form"><label for="channel-input">@identificador ou link do canal</label><div class="channel-search"><input id="channel-input" type="text" maxlength="250" placeholder="youtube.com/@seucanal" autocomplete="off" spellcheck="false" required><button type="submit" class="youtube-connect">Consultar canal</button></div></form><p id="channel-stats-status" role="status">Consulta manual · cache de 15 minutos · nenhum canal selecionado.</p><div id="channel-stats-result"></div><aside class="channel-private"><strong>Alcance e audiência</strong><p>Impressões, CTR e espectadores únicos não são dados públicos. Visualizações não equivalem a pessoas alcançadas. Esta seção ainda não integra o YouTube Analytics; o login para inscrições também não libera esses relatórios.</p></aside>';
 host.append(section);
 const form=section.querySelector('form'),input=section.querySelector('input'),button=form.querySelector('button'),status=section.querySelector('[role=status]'),result=section.querySelector('#channel-stats-result');
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const number=value=>value==null?'Indisponível':Number(value).toLocaleString('pt-BR');
 const date=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?'Data não informada':d.toLocaleDateString('pt-BR')};
 try{input.value=localStorage.getItem('peep-channel-handle')||''}catch{}
 section.querySelector('#channel-login-help').onclick=()=>youtubeAccount();
 let busy=false,lastTitle='';
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;busy=true;button.disabled=true;section.setAttribute('aria-busy','true');
  status.textContent='Consultando o YouTube…';
  try{
   const data=await localJSON('/api/youtube/channel?channel='+encodeURIComponent(input.value.trim()),50000);
   if(!data.id||!Array.isArray(data.videos))throw Error('Reinicie o serviço no Mac para ativar as estatísticas de canais.');
   const videos=data.videos,max=Math.max(1,...videos.map(v=>Number(v.views)||0));
   result.innerHTML='<div class="channel-identity"><span class="channel-monogram" aria-hidden="true">'+esc(data.title.slice(0,1))+'</span><div><h3>'+esc(data.title)+'</h3><small>'+esc(data.handle||data.id)+'</small></div><span class="channel-public-badge">Dados públicos</span></div><div class="channel-kpis">'+[
    ['Inscritos',data.subscribersHidden?'Oculto pelo canal':number(data.subscribers),'Contagem pública arredondada pelo YouTube'],
    ['Visualizações',number(data.views),'Acumulado do canal · não é alcance único'],
    ['Vídeos públicos',number(data.videoCount),'Total informado pelo YouTube']
   ].map(([label,value,note])=>'<article><span>'+label+'</span><strong>'+value+'</strong><small>'+note+'</small></article>').join('')+'</div><div class="channel-chart-heading"><h3>Publicações recentes</h3><small>Até 8 vídeos · visualizações acumuladas por vídeo</small></div><p class="channel-chart-note">Comparação entre vídeos, não evolução no tempo. Datas de publicação e formatos diferentes afetam a comparação.</p><div class="channel-video-list">'+videos.map(v=>'<article class="channel-video-row"><img loading="lazy" alt="" src="https://i.ytimg.com/vi/'+esc(v.id)+'/mqdefault.jpg"><div><h4>'+esc(v.title)+'</h4><small>'+date(v.published)+'</small><div class="channel-bar" aria-hidden="true"><i style="width:'+Math.max(0,Math.min(100,(Number(v.views)||0)/max*100))+'%"></i></div><p><b>'+number(v.views)+'</b> visualizações <span>· '+number(v.likes)+' curtidas · '+number(v.comments)+' comentários</span></p></div></article>').join('')+'</div>';
   if(!videos.length){const p=document.createElement('p');p.textContent=data.partial?'Não foi possível consultar os vídeos. Os totais do canal estão disponíveis.':'Nenhum vídeo público retornado nesta consulta.';result.append(p)}
   lastTitle=data.title;
   status.textContent=(data.cached?'Dados em cache':'Consulta concluída')+' · '+data.source+' · consultado em '+new Date(data.at*1000).toLocaleString('pt-BR')+'. Nova consulta à fonte após 15 min, ao pressionar Consultar canal.'+(data.partial?' Consulta de vídeos incompleta.':'');
   try{localStorage.setItem('peep-channel-handle',input.value.trim())}catch{}
  }catch(error){status.textContent=(lastTitle?'Mantendo os dados anteriores de '+lastTitle+'. ':'')+(error.message==='Rota não encontrada.'?'Reinicie o serviço no Mac para ativar as estatísticas de canais.':error.message)}
  finally{busy=false;button.disabled=false;section.removeAttribute('aria-busy')}
 });
})();
