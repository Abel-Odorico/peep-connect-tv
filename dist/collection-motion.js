/* Local material animation: fixed camera, one shared GPU surface, no image edits. */
(()=>{
 'use strict';
 const vertex=`attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
 const fragment=`precision mediump float;
 uniform sampler2D image;uniform float time;uniform float scene;uniform vec2 crop;varying vec2 uv;
 float waves(vec2 p,float t){return sin(p.x*75.+p.y*115.-t*2.)*.55+sin(p.x*131.-p.y*85.+t*1.4)*.3+sin(p.y*210.+t*2.8)*.15;}
 void main(){
 vec2 p=vec2(uv.x,1.-uv.y);p=(p-.5)*crop+.5;vec2 q=p;float t=time;
 float water=0.;float sun=0.;float strength=.002;
 if(scene<.5){
  // Architecture and shoreline remain anchored; depth increases toward the viewer.
  float shore=mix(.735,.82,smoothstep(.35,1.,p.x));
  water=smoothstep(shore,shore+.065,p.y);strength=.0038;
 }else if(scene<1.5){
  // Elliptical mask inside the solar disc, separate from the rigid portal.
  vec2 solar=(p-vec2(.73,.405))*vec2(1.777,1.);
  sun=1.-smoothstep(.205,.245,length(solar));
  q+=sun*vec2(sin(p.y*58.+t*.45),cos(p.x*64.-t*.6))*.0028;
  // The lake is bounded by the foreground dune and the right bank.
  float top=.752+max(0.,p.x-.66)*.26;
  float bottom=.77+smoothstep(.4,.7,p.x)*.145;
  water=smoothstep(.40,.57,p.x)*(1.-smoothstep(.91,.96,p.x))*smoothstep(top,top+.025,p.y)*(1.-smoothstep(bottom-.025,bottom,p.y));
  strength=.0035;
 }else{
  // Water flows within the sculptural crests, leaving the dark distant rock stable.
  float foreground=smoothstep(.46,.75,p.y);
  float crest=smoothstep(.48,.64,p.x);
  water=max(foreground,crest);strength=.0008;
  q+=water*vec2(sin(p.y*13.-t*.7)*.006+sin(p.x*19.+p.y*14.-t*.6)*.003,cos(p.x*12.-t*.4)*.003);
 }
 float w=waves(p,t),cross=waves(p.yx+vec2(.17,.4),t*.73);
 q+=water*vec2(w*strength,cross*strength*.36);
 vec3 color=texture2D(image,clamp(q,vec2(.002),vec2(.998))).rgb;
 float light=dot(color,vec3(.299,.587,.114));
 // Travelling highlights belong to water, not a separate floating outline.
 color*=1.+water*(.07*sin(p.y*172.+w*2.-t*2.4)+.035*cos(p.x*89.+t));
 if(scene>1.5){
  float foam=smoothstep(.43,.83,light)*water;
  color+=vec3(.08,.12,.12)*foam*pow(.5+.5*sin(p.x*100.+p.y*57.-t*2.1),4.);
 }else if(scene>.5){
  float cell=sin(p.x*90.+sin(p.y*63.+t*.35)*2.+t*.55)*sin(p.y*84.-t*.42);
  color+=sun*vec3(.12,.062,.014)*(cell*.45+.35+.15*sin(t*.7));
 }else{
  float gold=smoothstep(.02,.18,color.r-color.b);
  color+=water*gold*vec3(.1,.065,.016)*(.5+.5*sin(p.y*245.-t*2.+w));
 }
 gl_FragColor=vec4(color,1.);
 }`;
 let canvas,gl,program,texture,active=null,packId='',imageSize=[1672,941],ready=false,lost=false;
 let raf=0,timer=0,last=0,clock=0,generation=0,frames=0,failed=false;
 const uniforms={};
 function stop(){cancelAnimationFrame(raf);clearTimeout(timer);raf=timer=0;last=0;}
 function permitted(){const b=document.body;return active&&!active.hidden&&active.dataset.moving==='true'&&!document.hidden&&!lost&&!b.matches('.runtime-modal,.network-testing,.horizon-hidden,.horizon-motion-reduced,[data-performance=economy],[data-motion=off],[data-dynamic-tempo=parado]')&&!matchMedia('(prefers-reduced-motion: reduce)').matches;}
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);throw Error('Material shader unavailable')}return s;}
 function init(){
  if(gl)return true;if(failed||!window.WebGLRenderingContext)return false;
  canvas=document.createElement('canvas');canvas.className='collection-material';canvas.setAttribute('aria-hidden','true');
  try{
   gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'low-power'});if(!gl)throw Error('WebGL unavailable');
   const v=shader(gl.VERTEX_SHADER,vertex),f=shader(gl.FRAGMENT_SHADER,fragment);program=gl.createProgram();gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Material program unavailable');
   gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
   for(const n of ['time','scene','crop'])uniforms[n]=gl.getUniformLocation(program,n);
   texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);for(const n of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,n,gl.CLAMP_TO_EDGE);for(const n of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,n,gl.LINEAR);
   canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;ready=false;stop();canvas.hidden=true;});
   canvas.addEventListener('webglcontextrestored',()=>{gl=null;lost=false;packId='';canvas.remove();sync();});
   return true;
  }catch{failed=true;gl?.getExtension('WEBGL_lose_context')?.loseContext();gl=null;return false;}
 }
 function resize(){if(!gl||!active)return;const r=active.getBoundingClientRect();if(!r.width||!r.height)return;const scale=Math.min(1,960/r.width,540/r.height);canvas.width=Math.round(r.width*scale);canvas.height=Math.round(r.height*scale);gl.viewport(0,0,canvas.width,canvas.height);const aspect=r.width/r.height,source=imageSize[0]/imageSize[1];gl.uniform2f(uniforms.crop,Math.min(1,aspect/source),Math.min(1,source/aspect));}
 function draw(stamp){raf=0;if(!ready||!permitted()){stop();return;}const tempo=document.body.dataset.dynamicTempo==='suave'?.6:1;clock+=last?Math.min((stamp-last)/1000,.1)*tempo:0;last=stamp;gl.uniform1f(uniforms.time,clock);gl.drawArrays(gl.TRIANGLES,0,6);frames++;timer=setTimeout(()=>{timer=0;raf=requestAnimationFrame(draw)},30);}
 function sync(){
  const idle=document.body.classList.contains('living-idle-active');
  const target=document.querySelector(idle?'.collection-idle-stage':'.collection-home-stage');
  if(target!==active){stop();active=target;if(canvas&&active)active.insertBefore(canvas,active.querySelector('.collection-lens'));}
  if(!permitted()){stop();return;}if(!init())return;
  if(canvas.parentNode!==active)active.insertBefore(canvas,active.querySelector('.collection-lens'));
  const id=active.dataset.collection;
  if(id!==packId){
   packId=id;ready=false;canvas.hidden=true;stop();const request=++generation;const img=new Image();
   img.onload=()=>{if(request!==generation||lost)return;try{gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);imageSize=[img.naturalWidth,img.naturalHeight];gl.uniform1f(uniforms.scene,['obsidiana','solsticio','atlantida'].indexOf(id));clock=0;ready=true;canvas.hidden=false;resize();sync();}catch{ready=false;canvas.hidden=true;}};
   img.onerror=()=>{if(request===generation){ready=false;canvas.hidden=true}};img.src='assets/collections/'+id+'.png';return;
  }
  if(ready&&!raf&&!timer){resize();raf=requestAnimationFrame(draw);}
 }
 const observer=new MutationObserver(sync);
 observer.observe(document.body,{attributes:true,attributeFilter:['class','data-performance','data-motion','data-dynamic-tempo']});
 document.addEventListener('visibilitychange',sync);window.addEventListener('resize',()=>{resize();sync()});
 const media=matchMedia('(prefers-reduced-motion: reduce)');media.addEventListener?.('change',sync);
 window.PeepCollectionMotion={sync,inspect:()=>({scene:packId,running:!!(raf||timer),ready,frames,width:canvas?.width||0,height:canvas?.height||0,failed,lost})};
})();
