/* Os dados abaixo pertencem exclusivamente à demonstração; nenhuma API ou conta é acessada. */
const $=selector=>document.querySelector(selector);
const sampleIds=['UC'+'A'.repeat(22),'UC'+'B'.repeat(22)];
let youtubeState={connected:true,active:sampleIds[0],accounts:[{id:sampleIds[0],title:'Além do Alcance',image:''},{id:sampleIds[1],title:'Canal de exemplo',image:''}]};
let tick=0;
const videos=[
 {id:'demo0000001',title:'O que descobrimos ao observar a tecnologia de perto',views:14870,likes:823,comments:92,duration:'PT12M42S',published:'2026-10-28T13:00:00Z'},
 {id:'demo0000002',title:'Além do óbvio: uma nova forma de investigar',views:9020,likes:615,comments:48,duration:'PT8M5S',published:'2026-10-24T13:00:00Z'},
 {id:'demo0000003',title:'Um experimento, três perguntas e muitas possibilidades',views:6250,likes:402,comments:39,duration:'PT10M30S',published:'2026-10-18T13:00:00Z'},
 {id:'demo0000004',title:'O futuro que já começou: ideias em movimento',views:3400,likes:197,comments:21,duration:'PT5M51S',published:'2026-10-12T13:00:00Z'}
];
function navigate(next){document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===next))}
function describeControl(button,title){button.title=title}
function youtubeAccount(){alert('Esta é uma demonstração. Na TV, “Gerenciar canais” abre a conexão com sua conta Google.')}
function paintYouTubeAccount(){}
function loadYouTube(){}
async function localJSON(url){
 if(url==='/api/youtube/status')return youtubeState;
 if(url.startsWith('/api/youtube/channel')){
  const requested=new URL(url,location.href).searchParams.get('channel');
  const id=sampleIds.includes(requested)?requested:sampleIds[0],other=id===sampleIds[1];
  return {id,title:other?'Canal de exemplo':'Além do Alcance',handle:other?'@canalexemplo':'@alemdoalcance',createdAt:'2023-01-14T12:00:00Z',description:'Exemplo de descrição de canal: experiências, tecnologia e histórias vistas por novas perspectivas.',subscribers:other?5320+tick*5:18720+tick*9,subscribersHidden:false,views:other?302180+tick*310:1489000+tick*810,videoCount:other?86:132,at:Math.floor(Date.now()/1000)+tick*901,cached:false,source:'Dados ilustrativos',videos:other?videos.slice(0,2):videos};
 }
 throw Error('Dados indisponíveis nesta demonstração.');
}
const originalFetch=window.fetch;
window.fetch=async(url,options)=>{
 if(url==='/api/youtube/select'){
  const id=JSON.parse(options.body).id;
  if(!sampleIds.includes(id))return new Response(JSON.stringify({error:'Canal não encontrado na demonstração.'}),{status:404,headers:{'Content-Type':'application/json'}});
  youtubeState={...youtubeState,active:id};
  return new Response(JSON.stringify(youtubeState),{headers:{'Content-Type':'application/json'}});
 }
 return originalFetch(url,options);
};
/* Pontos iniciais fictícios para ilustrar a apresentação do gráfico. */
const now=Math.floor(Date.now()/1000);
for(const [index,id] of sampleIds.entries()){
 const initial=index?302180:1489000;
 try{const rows=[6,5,4,3,2,1].map((day,i)=>({at:now-day*86400,views:initial-[5900,4900,3500,2400,1100,300][i],subscribers:(index?5320:18720)-[45,34,25,18,10,3][i],videoCount:(index?86:132)-(i<2?2:i<4?1:0)}));localStorage.setItem('peep-channel-history:'+id,JSON.stringify(rows))}catch{}
}
document.addEventListener('DOMContentLoaded',()=>{
 document.querySelector('[data-page=channel]').click();
 $('#demo-theme').onclick=()=>document.body.classList.toggle('horizon-light');
 $('#themes').onclick=()=>document.body.classList.toggle('horizon-light');
 $('#channel-refresh').addEventListener('click',()=>{tick++},true);
 $('#main').addEventListener('click',event=>{if(event.target.closest('.channel-video-row')){event.preventDefault();alert('Os vídeos desta demonstração são ilustrativos. Na TV, cada card abre o vídeo correspondente no YouTube.')}});
});
