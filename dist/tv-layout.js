// A TV pode ter 960×540 pixels CSS sobre um painel Full HD/4K.
const peepTVMode=typeof PeepTV!=='undefined'||new URLSearchParams(location.search).get('tv')==='1';
if(peepTVMode){
 document.documentElement.classList.add('tv-mode');
 function fitTVHeading(){const h=document.querySelector('#heading');h?.querySelectorAll('br').forEach(br=>br.replaceWith(document.createTextNode(' ')));document.body.dataset.view=page;}
 const previousTVNavigate=navigate;navigate=function(next){previousTVNavigate(next);fitTVHeading()};
 fitTVHeading();
 // O foco do controle mantém o elemento inteiro dentro da área visível.
 let focusFrame=0;document.addEventListener('focusin',event=>{cancelAnimationFrame(focusFrame);if(event.target.closest('.theme-studio-dialog'))return;if(event.target.matches('button,a,input,select'))focusFrame=requestAnimationFrame(()=>{if(event.target.isConnected&&event.target===document.activeElement)event.target.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'})})});
}
const systemTitle=document.querySelector('.system-top>strong');
if(systemTitle){const icon=document.createElement('span');icon.className='memory-icon';icon.setAttribute('aria-hidden','true');icon.innerHTML='<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10v4m5-4v4m5-4v4M7 3v3m5-3v3m5-3v3M7 18v3m5-3v3m5-3v3"/></svg>';systemTitle.prepend(icon)}
document.querySelector('.ram-ring')?.classList.add('memory-percentage');
