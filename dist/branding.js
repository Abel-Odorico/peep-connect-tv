// Lettering do kit original, com fundo removido; originais preservados na pasta do kit.
const peepBrandAssets={dark:null,light:null};
let peepLogoURL=null,peepLogoMode=null;
const peepBrandDB=new Promise((resolve,reject)=>{const request=indexedDB.open('peep-connect-brand',1);request.onupgradeneeded=()=>request.result.createObjectStore('logos');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(Error('Não foi possível abrir o armazenamento da marca.'))});
peepBrandDB.catch(()=>{});
async function readPeepLogos(){try{const db=await peepBrandDB;await Promise.all(['dark','light'].map(mode=>new Promise(resolve=>{const r=db.transaction('logos').objectStore('logos').get('lettering-v2-'+mode);r.onsuccess=()=>{peepBrandAssets[mode]=r.result||null;resolve()};r.onerror=()=>resolve()})));paintPeepLogo()}catch{}}
function paintPeepLogo(){
 const mode=['adl-day','paper'].includes(document.body.dataset.theme)?'light':'dark';
 const art=$('.peep-brand-art');if(!art)return;
 const blob=peepBrandAssets[mode]||peepBrandAssets.dark||peepBrandAssets.light;
 const identity=blob||mode;
 if(peepLogoMode===identity)return;
 if(peepLogoURL){URL.revokeObjectURL(peepLogoURL);peepLogoURL=null}
 peepLogoMode=blob||mode;
 const image=document.createElement('img');image.alt='';image.width=192;image.height=48;image.decoding='async';
 image.onload=()=>{if(image.isConnected)$('.peep-brand').classList.add('has-original-logo')};
 image.onerror=()=>{$('.peep-brand').classList.remove('has-original-logo');art.replaceChildren()};
 if(blob){peepLogoURL=URL.createObjectURL(blob);image.src=peepLogoURL}else image.src='assets/peep-connect-lettering-alpha.png?v=2';
 art.classList.toggle('original-lettering',!blob);art.dataset.logoMode=mode;
 if(!blob){const lettering=image.cloneNode();lettering.className='peep-lettering-contrast';lettering.setAttribute('aria-hidden','true');art.replaceChildren(image,lettering)}else art.replaceChildren(image);
}
async function pngBlob(bytes){const sig=[137,80,78,71,13,10,26,10];if(bytes.length<24||sig.some((v,i)=>bytes[i]!==v))throw Error('O arquivo selecionado não é um PNG válido.');const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);if(view.getUint32(16)>10000||view.getUint32(20)>10000)throw Error('A imagem excede o tamanho permitido.');return new Blob([bytes],{type:'image/png'})}
async function peepZIP(buffer){
 const view=new DataView(buffer),bytes=new Uint8Array(buffer);let eocd=-1;
 for(let at=bytes.length-22;at>=Math.max(0,bytes.length-65557);at--)if(view.getUint32(at,true)===0x06054b50){eocd=at;break}
 if(eocd<0)throw Error('Não foi possível ler este ZIP. Use o kit Peep Connect ou um PNG extraído.');
 const count=view.getUint16(eocd+10,true);let offset=view.getUint32(eocd+16,true);const result={};
 for(let i=0;i<count;i++){
  if(offset+46>bytes.length||view.getUint32(offset,true)!==0x02014b50)throw Error('O ZIP está incompleto.');
  const method=view.getUint16(offset+10,true),size=view.getUint32(offset+20,true),rawSize=view.getUint32(offset+24,true),nameLength=view.getUint16(offset+28,true),extraLength=view.getUint16(offset+30,true),commentLength=view.getUint16(offset+32,true),local=view.getUint32(offset+42,true);
  const name=new TextDecoder().decode(bytes.subarray(offset+46,offset+46+nameLength));
  const mode=/transparente_texto_claro-3840x960\.png$/i.test(name)?'dark':/fundo_branco-3840x960\.png$/i.test(name)?'light':null;
  offset+=46+nameLength+extraLength+commentLength;
  if(!mode)continue;
  if(size>12000000||rawSize>12000000||local+30>bytes.length||view.getUint32(local,true)!==0x04034b50)throw Error('O logo no ZIP excede os limites ou está incompleto.');
  const dataStart=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true);
  if(dataStart+size>bytes.length)throw Error('O logo está incompleto.');
  let payload=bytes.subarray(dataStart,dataStart+size);
  if(method===8){const stream=new Blob([payload]).stream().pipeThrough(new DecompressionStream('deflate-raw'));const reader=stream.getReader();const chunks=[];let total=0;try{for(;;){const part=await reader.read();if(part.done)break;total+=part.value.length;if(total>12000000){await reader.cancel();throw Error('A imagem descompactada excede o limite.')}chunks.push(part.value)}}finally{reader.releaseLock()}payload=new Uint8Array(await new Blob(chunks).arrayBuffer())}
  else if(method!==0)throw Error('Compressão não suportada. Escolha um PNG já extraído do kit.');
  if(payload.length!==rawSize)throw Error('O tamanho da imagem no ZIP não confere.');
  result[mode]=await pngBlob(payload);
 }
 if(!Object.keys(result).length)throw Error('Não encontrei os logos 3840×960 neste ZIP. Selecione um PNG do kit.');return result;
}
async function importPeepBrand(file,mode){
 if(!file||file.size>25000000)throw Error('Escolha um PNG ou o ZIP do kit, com até 25 MB.');
 const buffer=await file.arrayBuffer();const logos=/\.zip$/i.test(file.name)?await peepZIP(buffer):{[mode]:await pngBlob(new Uint8Array(buffer))};
 const db=await peepBrandDB;await new Promise((resolve,reject)=>{const tx=db.transaction('logos','readwrite');for(const [key,blob]of Object.entries(logos))tx.objectStore('logos').put(blob,'lettering-v2-'+key);tx.oncomplete=resolve;tx.onerror=()=>reject(Error('Não foi possível salvar o logo neste navegador.'))});
 Object.assign(peepBrandAssets,logos);peepLogoMode=null;paintPeepLogo();return Object.keys(logos).length;
}
function peepBrandPanel(){
 show('<p class="eyebrow">SUA TV · SUA MARCA</p><h2>Peep Connect</h2><p>O lettering metálico do kit é usado com fundo transparente nos temas claros e escuros. Você também pode escolher outra versão do seu kit.</p><label class="option">Versão para PNG avulso<select id="peep-logo-mode"><option value="dark">Temas escuros · texto claro</option><option value="light">Tema claro · PNG transparente</option></select></label><label class="option peep-upload">Logo ou kit de marca<input id="peep-logo-file" type="file" accept="image/png,.zip,application/zip"></label><p id="peep-logo-status" class="inline-note" role="status">'+(peepBrandAssets.dark||peepBrandAssets.light?'Logo original salvo neste navegador.':'Lettering do kit aplicado como imagem transparente; não é uma fonte substituta.')+'</p>');
 $('#peep-logo-mode').value=['adl-day','paper'].includes(document.body.dataset.theme)?'light':'dark';
 $('#peep-logo-file').onchange=async e=>{const input=e.target,file=input.files[0];if(!file)return;input.disabled=true;const status=$('#peep-logo-status');status.textContent='Carregando o logo original…';try{const count=await importPeepBrand(file,$('#peep-logo-mode').value);status.textContent=count===2?'Logos claro e escuro aplicados e salvos.':'Logo aplicado e salvo neste navegador.';notify('Marca Peep Connect atualizada.')}catch(error){status.textContent=error.message}finally{if(input.isConnected)input.disabled=false}};
}
const previousBrandApply=apply;apply=function(){previousBrandApply();paintPeepLogo()};
const previousBrandAppearance=appearance;appearance=function(){previousBrandAppearance();const b=document.createElement('button');b.className='panel-button';b.textContent='Marca e logo · Peep Connect';b.onclick=peepBrandPanel;$('#panel-content').append(b)};
$('#glass-shortcut').onclick=()=>appearance();paintPeepLogo();readPeepLogos();
