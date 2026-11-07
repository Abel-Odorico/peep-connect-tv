/* Canal: dados públicos da API; tendências somente entre consultas realmente observadas. */
(()=>{
 'use strict';
 const nav=document.createElement('button');
 nav.className='nav';nav.dataset.page='channel';
 nav.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="m10 9 5 3-5 3z"/></svg><span class="nav-label">Canal</span>';
 $('#themes').before(nav);describeControl(nav,'Canal do YouTube','Estatísticas e publicações do canal');
 const section=document.createElement('section');section.id='channel-dashboard';section.className='channel-dashboard';section.hidden=true;section.setAttribute('aria-label','Estatísticas do canal do YouTube');
 section.innerHTML=`<div class="channel-hero"><div><p class="eyebrow">YOUTUBE · SEU ESTÚDIO</p><h1>Seu canal, em perspectiva.</h1><p>Uma leitura clara do que o YouTube informa sobre seu canal.</p></div><div class="channel-actions"><button id="channel-manage" type="button">Gerenciar canais</button><button id="channel-refresh" type="button">Atualizar ↻</button></div></div>
 <div class="channel-identity"><span class="channel-avatar" id="channel-avatar" aria-hidden="true">▶</span><div><span class="channel-tag">CANAL SELECIONADO</span><h2 id="channel-title">Aguardando conexão</h2><p id="channel-handle">Escolha um canal ou conecte sua conta</p></div><select id="channel-accounts" aria-label="Trocar canal conectado" hidden></select></div>
 <p id="channel-stats-status" role="status">Consultando os canais autorizados…</p>
 <div id="channel-stats-result" hidden><div class="channel-kpis"><article class="channel-kpi subscribers"><span>Inscritos</span><strong id="channel-subs">—</strong><small id="channel-subs-note">Total público</small></article><article class="channel-kpi views"><span>Visualizações do canal</span><strong id="channel-views">—</strong><small id="channel-views-note">Total acumulado · não é alcance</small></article><article class="channel-kpi uploads"><span>Vídeos publicados</span><strong id="channel-videos">—</strong><small id="channel-videos-note">Total público</small></article></div>
 <div class="channel-insights"><article class="channel-history"><div class="channel-card-head"><div><p class="eyebrow">TRAJETÓRIA OBSERVADA</p><h3>O canal ao longo do tempo</h3></div><span id="channel-history-count">0 amostras</span></div><svg viewBox="0 0 600 175" preserveAspectRatio="none" role="img" aria-label="Evolução observada das visualizações do canal"><defs><linearGradient id="channel-trend-fill" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#73e3e4" stop-opacity=".42"/><stop offset="1" stop-color="#73e3e4" stop-opacity="0"/></linearGradient></defs><path class="channel-grid-line" d="M12 30H588M12 85H588M12 142H588"/><path id="channel-history-fill" fill="url(#channel-trend-fill)"/><polyline id="channel-history-line" fill="none"/><circle id="channel-history-last" r="5"/></svg><div class="channel-history-axis"><span id="channel-history-start">—</span><span id="channel-history-end">—</span></div><p id="channel-history-note">A primeira consulta cria o ponto inicial. Os próximos formam a tendência.</p></article>
 <article class="channel-ranking"><div class="channel-card-head"><div><p class="eyebrow">VÍDEOS RECENTES</p><h3>Mais vistos nesta seleção</h3></div><span>Até 8 envios</span></div><div id="channel-ranking-list"></div><p>Comparação das visualizações acumuladas dos últimos vídeos consultados. Não é ranking de alcance nem de toda a história do canal.</p></article></div>
 <div class="channel-recent-head"><div><p class="eyebrow">PUBLICAÇÕES</p><h3>Vídeos mais recentes</h3></div><span id="channel-source">Fonte: YouTube Data API v3</span></div><div id="channel-video-list" class="channel-video-list"></div></div>
 <details class="channel-public-search"><summary>Consultar outro canal público</summary><form id="channel-stats-form"><label for="channel-input">@identificador ou link do canal</label><div class="channel-search"><input id="channel-input" type="text" maxlength="250" placeholder="youtube.com/@seucanal" autocomplete="off" spellcheck="false" required><button type="submit">Consultar</button></div></form><p>Este acesso mostra apenas números públicos e não troca a conta Google conectada.</p></details>
 <aside class="channel-private"><strong>Sobre o alcance</strong><p>Espectadores únicos, impressões, CTR e dados de audiência exigem o YouTube Analytics e uma autorização adicional. Visualizações públicas não representam pessoas alcançadas. As tendências acima começam na primeira consulta feita neste dispositivo.</p></aside>`;
 $('#main').append(section);
 const el=id=>section.querySelector('#'+id),esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const number=value=>value==null||!Number.isFinite(Number(value))?'—':Number(value).toLocaleString('pt-BR');
 const when=value=>new Date(value).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
 const state={data:null,key:'',loading:false,requestedAt:0,revision:0};
 function samples(id){try{const rows=JSON.parse(localStorage.getItem('peep-channel-history:'+id)||'[]');return Array.isArray(rows)?rows.filter(x=>x&&Number.isFinite(x.at)&&Number.isFinite(x.views)).slice(-20):[]}catch{return []}}
 function sample(data){const rows=samples(data.id),last=rows.at(-1);if(Number.isFinite(data.views)&&Number.isFinite(data.at)&&(!last||data.at>last.at)){rows.push({at:data.at,views:data.views,subscribers:data.subscribersHidden?null:data.subscribers,videoCount:data.videoCount});try{localStorage.setItem('peep-channel-history:'+data.id,JSON.stringify(rows.slice(-20)))}catch{}}return rows.slice(-20)}
 function trend(data){const rows=sample(data),svg=section.querySelector('.channel-history svg'),line=el('channel-history-line'),fill=el('channel-history-fill'),dot=el('channel-history-last');
  const previous=rows.length>1?rows[rows.length-2]:null;
  for(const [key,id,label] of [['views','views','visualizações'],['subscribers','subs','inscritos'],['videoCount','videos','vídeos']]){
   const value=data[key];
   const prior=previous?.[key];
   const note=el('channel-'+id+'-note');
   if(key==='subscribers'&&data.subscribersHidden){note.textContent='Contagem privada';continue}
   if(!Number.isFinite(value)||!Number.isFinite(prior)){note.textContent='Sem comparação disponível';continue}
   const delta=value-prior;
   note.textContent=(delta>0?'+':'')+number(delta)+' '+label+' desde '+new Date(previous.at*1000).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  }
  el('channel-history-count').textContent=rows.length+' amostra'+(rows.length===1?'':'s');
  if(!rows.length){line.setAttribute('points','');fill.setAttribute('d','');dot.setAttribute('visibility','hidden');return}
  const min=Math.min(...rows.map(r=>r.views)),max=Math.max(...rows.map(r=>r.views)),spread=Math.max(1,max-min),points=rows.map(r=>[rows.length===1?300:12+(r.at-rows[0].at)*576/(rows.at(-1).at-rows[0].at||1),142-(r.views-min)/spread*112]);
  line.setAttribute('points',points.map(p=>p.join(',')).join(' '));fill.setAttribute('d',rows.length>1?'M12 142L'+points.map(p=>p.join(' ')).join('L')+'L588 142Z':'');dot.setAttribute('cx',points.at(-1)[0]);dot.setAttribute('cy',points.at(-1)[1]);dot.setAttribute('visibility','visible');
  svg.setAttribute('aria-label','Visualizações acumuladas em '+rows.length+' consultas observadas; de '+number(rows[0].views)+' a '+number(rows.at(-1).views));
  el('channel-history-start').textContent=when(rows[0].at*1000);el('channel-history-end').textContent=when(rows.at(-1).at*1000);
  const first=rows[0],last=rows.at(-1);el('channel-history-note').textContent=rows.length<2?'Primeira amostra registrada. Uma nova consulta à fonte após 15 minutos permitirá comparar os totais.':`Variação observada desde ${when(first.at*1000)}: ${last.views-first.views>=0?'+':''}${number(last.views-first.views)} visualizações${Number.isFinite(last.subscribers)&&Number.isFinite(first.subscribers)?' · '+(last.subscribers-first.subscribers>=0?'+':'')+number(last.subscribers-first.subscribers)+' inscritos':''}. Amostras salvas somente neste dispositivo; o YouTube pode revisar contagens.`;
 }
 function paint(data){state.data=data;state.key=data.id;const account=(youtubeState.accounts||[]).find(a=>a.id===data.id);
  el('channel-title').textContent=data.title||'Canal do YouTube';el('channel-handle').textContent=data.handle||data.id;
  const avatar=el('channel-avatar');avatar.textContent=(data.title||'C').slice(0,1);if(account?.image&&/^https:\/\/yt3\.(ggpht|googleusercontent)\.com\//.test(account.image)){const img=document.createElement('img');img.src=account.image;img.alt='';avatar.replaceChildren(img)}
  el('channel-subs').textContent=data.subscribersHidden?'Ocultos':number(data.subscribers);el('channel-views').textContent=number(data.views);el('channel-videos').textContent=number(data.videoCount);
  trend(data);const videos=(data.videos||[]).filter(v=>/^[\w-]{11}$/.test(v.id)),top=[...videos].sort((a,b)=>(Number(b.views)||0)-(Number(a.views)||0)).slice(0,4),max=Math.max(1,...top.map(v=>Number(v.views)||0));
  el('channel-ranking-list').innerHTML=top.length?top.map((v,i)=>`<div class="channel-rank"><span>${String(i+1).padStart(2,'0')}</span><div><strong>${esc(v.title)}</strong><i><b style="width:${Math.max(1,Math.min(100,(Number(v.views)||0)/max*100))}%"></b></i></div><em>${number(v.views)}</em></div>`).join(''):'<p>Nenhum vídeo público recente retornado.</p>';
  el('channel-video-list').innerHTML=videos.length?videos.map(v=>`<a class="channel-video-row" href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener noreferrer" aria-label="Abrir ${esc(v.title)} no YouTube"><img loading="lazy" alt="" src="https://i.ytimg.com/vi/${v.id}/mqdefault.jpg"><span><strong>${esc(v.title)}</strong><small>${v.published?when(v.published):'Data não informada'} · ${number(v.views)} visualizações</small><span class="channel-video-metrics">${number(v.likes)} curtidas · ${number(v.comments)} comentários</span></span></a>`).join(''):'<p>O YouTube não retornou vídeos públicos recentes para este canal.</p>';
  el('channel-source').textContent=(data.cached?'Cache · ':'')+'Consultado '+new Date(data.at*1000).toLocaleString('pt-BR')+' · '+data.source+(data.partial?' · vídeos incompletos':'');
  el('channel-stats-status').textContent=(data.cached?'Leitura em cache':'Leitura atualizada')+' · fonte: YouTube Data API v3 · '+new Date(data.at*1000).toLocaleString('pt-BR')+'. Atualização da fonte a cada 15 minutos.';
  el('channel-stats-result').hidden=false;
 }
 async function load(id,force=false){if(!id||state.loading)return;if(!force&&state.key===id&&Date.now()-state.requestedAt<900000)return;
  const revision=++state.revision;state.loading=true;el('channel-refresh').disabled=true;el('channel-stats-status').textContent='Consultando dados públicos no YouTube…';
  try{const data=await localJSON('/api/youtube/channel?channel='+encodeURIComponent(id),45000);if(revision!==state.revision||!data.id||!Array.isArray(data.videos))throw Error('O serviço do canal não retornou dados completos.');paint(data);state.requestedAt=Date.now()}
  catch(error){el('channel-stats-status').textContent=(state.data?'Mantendo os últimos dados visíveis. ':'')+error.message}
  finally{state.loading=false;el('channel-refresh').disabled=false}
 }
 async function refresh(){try{const status=await localJSON('/api/youtube/status');youtubeState=status;const accounts=(status.accounts||[]).filter(a=>/^UC[\w-]{22}$/.test(a.id));const select=el('channel-accounts');select.replaceChildren();for(const a of accounts){const option=document.createElement('option');option.value=a.id;option.textContent=a.title;select.append(option)}select.hidden=accounts.length<2;
   if(status.connected&&status.active){select.value=status.active;await load(status.active)}else if(state.data){el('channel-stats-status').textContent='Conta desconectada · mostrando consulta anterior.'}else{el('channel-stats-status').textContent='Nenhum canal conectado. Use “Gerenciar canais” ou consulte outro canal público abaixo.'}
  }catch(error){el('channel-stats-status').textContent=error.message}}
 el('channel-refresh').onclick=()=>state.key?load(state.key,true):refresh();el('channel-manage').onclick=()=>youtubeAccount();
 el('channel-accounts').onchange=async event=>{const id=event.target.value;try{const response=await fetch('/api/youtube/select',{method:'POST',headers:{'Content-Type':'application/json','X-Konka-Action':'youtube-select'},body:JSON.stringify({id})});const data=await response.json();if(!response.ok)throw Error(data.error||'Não foi possível trocar de canal.');youtubeState=data;state.requestedAt=0;await load(id,true);paintYouTubeAccount();loadYouTube()}catch(error){el('channel-stats-status').textContent=error.message}};
 el('channel-stats-form').onsubmit=event=>{event.preventDefault();const value=el('channel-input').value.trim();if(value)load(value,true)};
 const baseNavigate=navigate;navigate=function(next){baseNavigate(next);document.body.classList.toggle('channel-view',next==='channel');section.hidden=next!=='channel';if(next==='channel')refresh()};
 document.querySelectorAll('[data-page]').forEach(button=>button.onclick=()=>navigate(button.dataset.page));
 if(location.hash==='#channel-dashboard')navigate('channel');
})();
