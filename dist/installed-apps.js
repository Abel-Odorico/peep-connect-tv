// Android supplies launchable packages and their actual icons.
const nativeAppIds={
 'com.netflix.ninja':'netflix','com.google.android.youtube.tv':'youtube',
 'com.amazon.amazonvideo.livingroom':'prime','com.disney.disneyplus':'disney',
 'com.globo.globoplay':'globoplay','com.spotify.tv.android':'spotify',
 'org.jellyfin.androidtv':'jellyfin','com.wbd.stream':'max',
 'com.apple.atve.androidtv.appletv':'appletv'
};
let lastInstalledRefresh=0;
function refreshInstalledApps(){
 if(typeof PeepTV==='undefined'||typeof PeepTV.installedApps!=='function'||Date.now()-lastInstalledRefresh<60000)return;
 lastInstalledRefresh=Date.now();
 let installed;
 try{installed=JSON.parse(PeepTV.installedApps())}catch{return}
 if(!Array.isArray(installed))return;
 const originals=new Map(catalog.map(app=>[app.id,app]));
 const result=[];
 for(const entry of installed){
  if(!entry||typeof entry.package!=='string'||!/^([\w]+\.)+[\w]+$/.test(entry.package))continue;
  const id=nativeAppIds[entry.package]||entry.package;
  const known=originals.get(id);
  const name=typeof entry.name==='string'&&entry.name.trim()?entry.name.trim().slice(0,80):entry.package;
  const icon=typeof entry.icon==='string'&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(entry.icon)&&entry.icon.length<600000?entry.icon:'';
  result.push({id,packageName:entry.package,name,description:known?.description||'Aplicativo instalado nesta TV.',color:known?.color||'#84c8d8',nativeIcon:!!icon&&!known?.officialArtwork,nativeBanner:!!entry.banner&&!known?.officialArtwork,officialArtwork:!!known?.officialArtwork,wordmark:!!known?.wordmark,artBackground:known?.artBackground,fallbackIcon:icon,logo:known?.officialArtwork?known.logo:icon?'<span class="app-artwork"><img class="native-app-icon" src="'+icon+'" alt="" decoding="async"></span>':known?.logo||'<span class="native-app-placeholder">▣</span>'});
 }
 if(!result.length)return;
 result.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
 catalog.splice(0,catalog.length,...result);
 prefs.favorites=prefs.favorites.filter(id=>result.some(app=>app.id===id));
 if(!prefs.favorites.length)prefs.favorites=result.slice(0,6).map(app=>app.id);
 save();render();
}
if(typeof PeepTV!=='undefined'){
 setTimeout(refreshInstalledApps,0);
 window.addEventListener('peep-apps-refresh',refreshInstalledApps);
}
