const landscapeCatalog=[
 {id:'mountain',name:'Montanhas',photo:'1464822759023-fed622ff2c3b'},
 {id:'dusk',name:'Lago alpino',photo:'1470770841072-f978cf4d019e'},
 {id:'forest',name:'Floresta',photo:'1448375240586-882707db888b'},
 {id:'coast',name:'Costa azul',photo:'1586417753102-f8a377ade182'},
 {id:'dunes',name:'Dunas douradas',photo:'1557995744-18c7f67f4307'},
 {id:'aurora',name:'Aurora e cascatas',photo:'1506408117482-b60ae52a2480'}
];
const landscapeURL=(scene,width)=>'https://images.unsplash.com/photo-'+scene.photo+'?auto=format&fit=crop&w='+width+'&q=75';
let cinemaImages=[],cinemaImageIndex=0,wallpaperRevision=0,wallpaperKey='',wallpaperCurrent='',wallpaperMessage='',wallpaperLastChange=0;
function wallpaperStatus(){const label=$('#cinema-wallpaper-status');if(label)label.textContent=wallpaperMessage||'O fundo usa imagens do TMDB, sem reproduzir vídeos.'}
async function setWallpaperImage(url,title,revision){
 const image=new Image();image.decoding='async';
 const loaded=await new Promise(resolve=>{image.onload=()=>resolve(true);image.onerror=()=>resolve(false);image.src=url});
 if(revision!==wallpaperRevision)return;
 if(loaded){wallpaperCurrent=url;$('.landscape').style.backgroundImage='url('+JSON.stringify(url)+')';wallpaperLastChange=Date.now();wallpaperMessage=title||'Paisagem aplicada.';document.body.dataset.wallpaper=prefs.wallpaperSource||'photo'}
 else wallpaperMessage='Não foi possível carregar a imagem. O fundo anterior foi mantido.';
 wallpaperStatus();
}
async function loadCinemaWallpapers(revision){
 wallpaperMessage='Buscando imagens de cinema…';wallpaperStatus();
 try{
  const kinds=prefs.cinemaKind==='movie'?['movie']:prefs.cinemaKind==='tv'?['tv']:['movie','tv'];
  const responses=await Promise.all(kinds.map(type=>localJSON('/api/catalog?'+new URLSearchParams({type,collection:'popular'}))));
  if(revision!==wallpaperRevision)return;
  const lists=responses.map(data=>(data.results||[]).filter(i=>i.backdrop?.startsWith('https://image.tmdb.org/t/p/w780/')).slice(0,6));
  cinemaImages=[];for(let i=0;i<6;i++)for(const list of lists)if(list[i])cinemaImages.push(list[i]);
  cinemaImageIndex=0;if(!cinemaImages.length)throw Error('O TMDB não retornou imagens nesta seleção.');
  await showCinemaWallpaper(revision);
 }catch(error){if(revision!==wallpaperRevision)return;wallpaperMessage=error.message+' O fundo anterior foi mantido.';wallpaperStatus()}
}
function showCinemaWallpaper(revision=wallpaperRevision){const item=cinemaImages[cinemaImageIndex];if(!item)return;return setWallpaperImage(item.backdrop.replace('/w780/','/w1280/'),item.title+' · '+(item.type==='tv'?'Série':'Filme')+' · TMDB',revision)}
function paintWallpaper(){
 const source=prefs.wallpaperSource||'legacy';document.body.dataset.wallpaper=source;
 const key=[source,prefs.cinemaKind,prefs.scene,prefs.customWallpaper?'custom':''].join(':');
 if(wallpaperCurrent&&source!=='legacy'&&!prefs.customWallpaper)$('.landscape').style.backgroundImage='url('+JSON.stringify(wallpaperCurrent)+')';
 if(key===wallpaperKey)return;wallpaperKey=key;const revision=++wallpaperRevision;
 if(source==='tmdb'){loadCinemaWallpapers(revision);return}
 if(prefs.customWallpaper){wallpaperCurrent='';return}
 if(source==='photo'){const scene=landscapeCatalog.find(s=>s.id===prefs.scene)||landscapeCatalog[0];setWallpaperImage(landscapeURL(scene,1600),scene.name,revision)}
}
const previousWallpaperApply=apply;apply=function(){previousWallpaperApply();paintWallpaper()};
const previousWallpapersPanel=scenes;
scenes=function(){
 previousWallpapersPanel();
 const picker=panel.querySelector('.scene-picker');picker.replaceChildren();
 for(const scene of landscapeCatalog){const button=document.createElement('button');button.className='landscape-choice';button.setAttribute('aria-pressed',String(prefs.wallpaperSource!=='tmdb'&&!prefs.customWallpaper&&prefs.scene===scene.id));const image=document.createElement('img');image.src=landscapeURL(scene,320);image.alt='';image.loading='lazy';image.width=160;image.height=90;const name=document.createElement('span');name.textContent=scene.name;button.append(image,name);button.onclick=()=>{prefs.wallpaperSource='photo';prefs.scene=scene.id;prefs.customWallpaper='';apply();scenes()};picker.append(button)}
 const cinema=document.createElement('section');cinema.className='cinema-wallpapers';cinema.innerHTML='<h3>Seu cinema como cenário</h3><p>Use imagens de filmes e séries do TMDB no fundo da TV.</p><label class="option">Seleção<select id="cinema-wallpaper-kind"><option value="all">Filmes e séries</option><option value="movie">Só filmes</option><option value="tv">Só séries</option></select></label><label class="option">Trocar a imagem<select id="cinema-wallpaper-rotation"><option value="0">Somente quando eu pedir</option><option value="300">A cada 5 minutos</option><option value="900">A cada 15 minutos</option></select></label><div class="detail-actions"><button id="cinema-wallpaper-enable" class="panel-button">Usar fundo de cinema</button><button id="cinema-wallpaper-next" class="text-button">Próxima imagem →</button></div><p id="cinema-wallpaper-status" class="inline-note" role="status"></p>';
 picker.after(cinema);$('#cinema-wallpaper-kind').value=prefs.cinemaKind||'all';$('#cinema-wallpaper-rotation').value=String(prefs.cinemaRotate||0);wallpaperStatus();
 $('#cinema-wallpaper-enable').onclick=()=>{prefs.wallpaperSource='tmdb';prefs.customWallpaper='';prefs.cinemaKind=$('#cinema-wallpaper-kind').value;wallpaperKey='';apply();$('#cinema-wallpaper-next').disabled=false;wallpaperStatus()};
 $('#cinema-wallpaper-kind').onchange=e=>{prefs.cinemaKind=e.target.value;if(prefs.wallpaperSource==='tmdb')apply();else save()};
 $('#cinema-wallpaper-rotation').onchange=e=>{prefs.cinemaRotate=+e.target.value;save()};
 $('#cinema-wallpaper-next').disabled=prefs.wallpaperSource!=='tmdb';
 $('#cinema-wallpaper-next').onclick=()=>{if(cinemaImages.length){cinemaImageIndex=(cinemaImageIndex+1)%cinemaImages.length;showCinemaWallpaper(++wallpaperRevision)}else{wallpaperKey='';apply()}};
 const input=$('#custom-wallpaper'),original=input.onchange;input.onchange=async e=>{await original(e);if(prefs.customWallpaper){prefs.wallpaperSource='photo';apply()}};
};
$('#wallpaper').onclick=()=>scenes();
setInterval(()=>{if(document.hidden||prefs.wallpaperSource!=='tmdb'||!prefs.cinemaRotate||Date.now()-wallpaperLastChange<prefs.cinemaRotate*1000||!cinemaImages.length)return;cinemaImageIndex=(cinemaImageIndex+1)%cinemaImages.length;showCinemaWallpaper(++wallpaperRevision)},30000);
paintWallpaper();
