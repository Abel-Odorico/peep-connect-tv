// Lista enxuta; detalhes e trailers somente ao abrir um título.
const catalogLists=new Map(),catalogTitles=new Map();
let catalogListRequest=null;
const catalogLabels={popular:'Em alta',recent:'Lançamentos recentes',upcoming:'Próximos 90 dias',top:'Mais bem avaliados'};
function catalogRemember(cache,key,data,limit){cache.delete(key);cache.set(key,{data,at:Date.now()});while(cache.size>limit)cache.delete(cache.keys().next().value)}
function catalogRead(cache,key,age){const entry=cache.get(key);return entry&&Date.now()-entry.at<age?entry.data:null}
function catalogDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value||'')?new Date(value+'T12:00:00').toLocaleDateString('pt-BR'):'Data não informada'}
function catalogRating(item){return item.votes>0&&Number.isFinite(item.rating)?item.rating.toLocaleString('pt-BR',{maximumFractionDigits:1})+'/10':'Ainda sem nota'}
async function loadCatalog(){
 const generation=++catalogGeneration,status=$('#catalog-status'),rail=$('#poster-rail');
 const kind=$('#catalog-type').value,provider=$('#catalog-provider').value,collection=$('#catalog-collection').value;
 const key=[kind,provider,collection].join(':');
 catalogListRequest?.abort();const controller=new AbortController();catalogListRequest=controller;
 const timeout=setTimeout(()=>controller.abort(),18000);
 rail.setAttribute('aria-busy','true');status.hidden=false;status.textContent='Buscando títulos…';
 $('#cinema-title').textContent=catalogLabels[collection]+' · '+(kind==='tv'?'Séries':'Filmes');
 $('#catalog-context').textContent=(collection==='upcoming'?(kind==='tv'?'Estreias de séries previstas para os próximos 90 dias. ':'Filmes previstos para os próximos 90 dias, com referência de lançamento no Brasil. '):collection==='recent'?'Títulos lançados nos últimos 90 dias. ':collection==='top'?'Notas do TMDB com pelo menos 300 avaliações. ':'Popularidade no TMDB. ')+(provider?'Filtro: assinatura '+providerNames[provider]+'. ':'')+'Datas e disponibilidade podem mudar.';
 try{
  let data=catalogRead(catalogLists,key,600000);
  if(!data){const response=await fetch('/api/catalog?'+new URLSearchParams({type:kind,provider,collection}),{cache:'no-store',signal:controller.signal});data=await response.json();if(!response.ok)throw Error(data.error||'Catálogo indisponível.');if(!Array.isArray(data.results))throw Error('Resposta de catálogo incompleta.');catalogRemember(catalogLists,key,data,8)}
  if(generation!==catalogGeneration)return;
  const fragment=document.createDocumentFragment();
  for(const item of data.results){
   const button=document.createElement('button');button.className='poster-card';button.setAttribute('aria-label','Ver detalhes de '+item.title);
   const cover=document.createElement('span');cover.className='poster-cover';
   if(item.poster?.startsWith('https://image.tmdb.org/t/p/')){const image=document.createElement('img');image.src=item.poster;image.alt='Pôster de '+item.title;image.loading='lazy';image.decoding='async';image.width=342;image.height=513;image.onerror=()=>{image.remove();cover.classList.add('no-image')};cover.append(image)}else cover.classList.add('no-image');
   const badge=document.createElement('span');badge.className='poster-badge';badge.textContent=collection==='upcoming'?catalogDate(item.date):kind==='tv'?'Série':'Filme';cover.append(badge);
   const title=document.createElement('strong');title.textContent=item.title;
   const meta=document.createElement('small');meta.textContent=(item.date?.slice(0,4)||'Sem data')+' · '+catalogRating(item);
   button.append(cover,title,meta);button.onclick=()=>catalogDetails(item);fragment.append(button);
  }
  rail.replaceChildren(fragment);status.hidden=data.results.length>0;
  if(!data.results.length)status.textContent='Nenhum título nesta seleção.'+(provider?' Experimente “Todos os serviços”, especialmente para estreias futuras.':'');
 }catch(error){if(generation!==catalogGeneration)return;rail.replaceChildren();status.hidden=false;status.textContent=error.name==='AbortError'?'A consulta demorou demais. Tente atualizar os dados.':error.message}
 finally{clearTimeout(timeout);if(generation===catalogGeneration){rail.setAttribute('aria-busy','false');catalogListRequest=null}}
}
async function catalogDetails(item){
 show('<p class="eyebrow">'+(item.type==='tv'?'SÉRIE':'FILME')+'</p><h2>'+escapeHTML(item.title)+'</h2><p id="catalog-detail-loading" role="status">Carregando sinopse, trailer e onde assistir…</p>');
 const marker=$('#catalog-detail-loading'),key=item.type+':'+item.id;
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),18000);
 const cancel=()=>controller.abort();panel.addEventListener('close',cancel,{once:true});
 try{
  let detail=catalogRead(catalogTitles,key,3600000);
  if(!detail){const response=await fetch('/api/catalog/details?'+new URLSearchParams({type:item.type,id:item.id}),{cache:'no-store',signal:controller.signal});detail=await response.json();if(!response.ok)throw Error(detail.error||'Detalhes indisponíveis.');catalogRemember(catalogTitles,key,detail,24)}
  if(marker.isConnected&&panel.open)paintCatalogDetails(detail);
 }catch(error){if(!marker.isConnected||!panel.open)return;marker.textContent=error.name==='AbortError'?'A consulta demorou demais.':'Não foi possível carregar os detalhes: '+error.message;const retry=document.createElement('button');retry.className='panel-button';retry.textContent='Tentar novamente';retry.onclick=()=>catalogDetails(item);marker.after(retry)}
 finally{clearTimeout(timeout);panel.removeEventListener('close',cancel)}
}
function paintCatalogDetails(d){
 const e=escapeHTML,kind=d.type==='tv'?'Série':'Filme';
 const meta=[kind,catalogDate(d.date),d.runtime?d.runtime+' min'+(d.type==='tv'?' / episódio':''):null,d.type==='tv'&&d.seasons?d.seasons+' temporada'+(d.seasons===1?'':'s'):null,d.type==='tv'&&d.episodes?d.episodes+' episódios':null].filter(Boolean);
 const status={Released:'Lançado','Post Production':'Pós-produção','In Production':'Em produção',Planned:'Planejado',Rumored:'Anunciado','Returning Series':'Em exibição',Ended:'Finalizada',Canceled:'Cancelada',Pilot:'Piloto'};
 const trailer=d.trailer&&/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/.test(d.trailer.url)?d.trailer:null;
 const trailerLabel=trailer?(trailer.type==='Teaser'?'Ver teaser':'Assistir ao trailer'):'Trailer indisponível';
 const groups=[['flatrate','Por assinatura'],['rent','Aluguel'],['buy','Compra']];
 const providers=groups.filter(([key])=>d.providers?.[key]?.length).map(([key,label])=>'<div class="watch-group"><h3>'+label+'</h3><div class="watch-providers">'+d.providers[key].map(p=>'<span>'+(p.logo?.startsWith('https://image.tmdb.org/t/p/')?'<img src="'+e(p.logo)+'" alt="" width="28" height="28" loading="lazy">':'')+e(p.name)+'</span>').join('')+'</div></div>').join('');
 show('<article class="catalog-detail">'+(d.backdrop?.startsWith('https://image.tmdb.org/t/p/')?'<img class="detail-backdrop" src="'+e(d.backdrop)+'" alt="" decoding="async">':'')+'<p class="eyebrow">'+e(kind)+' · TMDB</p><h2>'+e(d.title)+'</h2><div class="detail-meta">'+meta.map(v=>'<span>'+e(v)+'</span>').join('')+'<span>'+e(catalogRating(d))+'</span>'+(d.certification?'<span class="age-rating" title="Classificação indicativa no Brasil">'+e(d.certification)+'</span>':'')+'</div>'+(d.genres.length?'<p class="detail-genres">'+d.genres.map(e).join(' · ')+'</p>':'')+'<div class="detail-actions">'+(trailer?'<a class="panel-button trailer-button" href="'+e(trailer.url)+'" rel="noopener noreferrer">▶ '+trailerLabel+'</a>':'<span class="trailer-unavailable">'+trailerLabel+'</span>')+'<a class="detail-source" href="'+e(d.url)+'" rel="noopener noreferrer">Ver no TMDB ↗</a></div>'+(trailer?'<p class="detail-trailer-note">'+e((trailer.official?'Vídeo oficial informado pelo TMDB':'Vídeo vinculado no TMDB')+' · '+({pt:'Português',en:'Inglês'}[trailer.language]||'Idioma não informado'))+'</p>':'')+'<h3>Sinopse</h3><p>'+e(d.overview||'Sinopse indisponível em português.')+'</p>'+(d.cast.length?'<h3>Elenco</h3><p>'+d.cast.map(e).join(' · ')+'</p>':'')+(d.creators.length?'<p><b>'+(d.type==='tv'?'Criação':'Direção')+':</b> '+d.creators.map(e).join(', ')+'</p>':'')+'<p class="inline-note">'+e(status[d.status]||d.status||'Situação não informada')+'</p><h3>Onde assistir no Brasil</h3>'+(providers||'<p>Ainda sem disponibilidade informada para o Brasil.</p>')+'<p class="inline-note">Fonte: TMDB / JustWatch. Assinatura, aluguel e compra são modalidades diferentes. Confirme o título no serviço. Datas previstas podem mudar.</p></article>');
 const trailerLink=panel.querySelector('.trailer-button');if(trailerLink){trailerLink.target='_blank';if(typeof PeepTV!=='undefined'&&typeof PeepTV.openTrailer==='function'){trailerLink.onclick=event=>{event.preventDefault();PeepTV.openTrailer(trailer.url.split('v=')[1])}}trailerLink.focus()}
}
