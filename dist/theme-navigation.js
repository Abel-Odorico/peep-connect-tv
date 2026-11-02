/* D-pad navigation has a local row model; no spatial scan of the entire dialog. */
(()=>{
 'use strict';
 const controls='button,a[href],input:not([type=hidden]),select';
 const grids='.studio-theme-grid,.horizon-scene-grid,.prisma-palette-grid,.theme-pool,.collection-wallpaper-grid';
 function mount(dialog,host,{activeTab,chooseTab}){
  const tabs=[...host.querySelectorAll('[role=tab]')],panes=[...host.querySelectorAll('[role=tabpanel]')];
  const done=host.querySelector('#studio-done'),close=dialog.querySelector('.close');
  const remembered=new Map(),cache=new Map();let frame=0,lastRepeat=0,focused=null,focusedRow=null;
  const hint=host.querySelector('#studio-navigation-hint');
  function eligible(el){return !el.disabled&&!el.closest('[hidden],[inert]')&&el.getAttribute('aria-hidden')!=='true'}
  function columnCount(grid){
   const computed=getComputedStyle(grid).gridTemplateColumns;
   const count=computed&&!computed.includes('repeat')&&computed!=='none'?computed.split(/\s+/).length:innerWidth<=550?2:3;
   if(grid.matches('.collection-wallpaper-grid'))return (innerWidth<=550?1:count)*2;
   return count;
  }
  function rows(){
   const id=activeTab();if(cache.has(id))return cache.get(id);
   const pane=panes.find(p=>p.id==='studio-panel-'+id),result=[];
   function walk(node){
    if(node.nodeType!==1||node.hidden)return;
    if(node.matches(controls)){if(eligible(node))result.push([node]);return}
    if(node.matches(grids)){
     const items=[...node.querySelectorAll(controls)].filter(eligible),columns=columnCount(node);
     for(let i=0;i<items.length;i+=columns)result.push(items.slice(i,i+columns));return;
    }
    if(node.matches('.studio-pagination,.accent-options,.collection-wallpaper-actions')){
     const items=[...node.querySelectorAll(controls)].filter(eligible);if(items.length)result.push(items);return;
    }
    for(const child of node.children)walk(child);
   }
   if(pane)walk(pane);cache.set(id,result);return result;
  }
  function ensureVisible(el){
   cancelAnimationFrame(frame);
   const scroller=el.closest('[role=tabpanel]');if(!scroller)return;
   frame=requestAnimationFrame(()=>{
    if(!el.isConnected||document.activeElement!==el)return;
    const view=scroller.getBoundingClientRect(),box=el.getBoundingClientRect();
    if(box.top<view.top+9)scroller.scrollTop+=box.top-view.top-9;
    else if(box.bottom>view.bottom-9)scroller.scrollTop+=box.bottom-view.bottom+9;
   });
  }
  function focus(el){if(el){el.focus({preventScroll:true});ensureVisible(el)}}
  function landing(){
   const list=rows().flat(),previous=remembered.get(activeTab());
   return list.includes(previous)?previous:list.find(el=>el.matches('.studio-theme[aria-pressed=true],.horizon-scene[aria-pressed=true]'))||list[0]||done;
  }
  function describe(el){
   if(!hint)return;
   const message=el.matches('select')?'← → alterar opção · ↑ ↓ próximo ajuste · OK abrir lista':el.matches('input[type=range]')?'← → ajustar valor · ↑ ↓ próximo ajuste':el.matches('input[type=checkbox]')?'OK marcar ou desmarcar · setas navegar':el.matches('[role=tab]')?'← → abas · ↓ entrar nas opções · Voltar fechar':'Setas navegar · ↑ voltar às abas · OK escolher';if(hint.textContent!==message)hint.textContent=message;
  }
  function onFocus(event){
   const el=event.target;if(!el.matches(controls))return;
   focused?.classList.remove('theme-nav-current');focusedRow?.classList.remove('theme-nav-row');focusedRow=host.contains(el)?el.closest('label'):null;focusedRow?.classList.add('theme-nav-row');focused=el;el.classList.add('theme-nav-current');
   if(el.closest('[role=tabpanel]')){remembered.set(activeTab(),el);ensureVisible(el)}
   describe(el);
  }
  function refresh(){
   cache.clear();const current=document.activeElement;
   if(host.contains(current)&&(!eligible(current)))focus(landing());
  }
  function changeValue(el,key){
   if(el.matches('select')){
    const delta=key==='ArrowRight'?1:-1;let next=el.selectedIndex+delta;
    while(el.options[next]?.disabled)next+=delta;
    if(next<0||next>=el.options.length)return;
    el.selectedIndex=next;
   }else if(el.matches('input[type=range]')){
    const before=el.value;key==='ArrowRight'?el.stepUp():el.stepDown();if(before===el.value)return;
   }else return;
   el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function onKey(event){
   if(!tabs[0].isConnected||!dialog.classList.contains('theme-studio-dialog')||event.defaultPrevented)return;
   const key=event.key,el=document.activeElement;
   if(key==='Escape'){event.preventDefault();event.stopPropagation();dialog.close();return}
   if((key==='Enter'||key===' ')&&el.matches('input[type=checkbox]')){event.preventDefault();event.stopPropagation();el.click();return}
   if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(key))return;
   event.preventDefault();event.stopPropagation();
   const now=performance.now();if(event.repeat&&now-lastRepeat<85)return;lastRepeat=now;
   const tabIndex=tabs.indexOf(el);
   if(tabIndex>=0){
    if(key==='ArrowDown'){focus(landing());return}
    if(key==='ArrowUp')return;
    const index=key==='Home'?0:key==='End'?tabs.length-1:Math.max(0,Math.min(tabs.length-1,tabIndex+(key==='ArrowLeft'?-1:1)));
    chooseTab(tabs[index].dataset.studioTab,true);return;
   }
   if(el===close){focus(tabs.find(t=>t.dataset.studioTab===activeTab()));return}
   const model=rows();
   if(el===done){if(key==='ArrowUp')focus(remembered.get(activeTab())||model.at(-1)?.[0]);return}
   let rowIndex=-1,column=-1;
   for(let i=0;i<model.length;i++){const at=model[i].indexOf(el);if(at>=0){rowIndex=i;column=at;break}}
   if(rowIndex<0){focus(landing());return}
   if(['ArrowLeft','ArrowRight'].includes(key)&&el.matches('select,input[type=range]')){changeValue(el,key);return}
   if(key==='Home'||key==='End'){focus(model[rowIndex][key==='Home'?0:model[rowIndex].length-1]);return}
   if(key==='ArrowLeft'||key==='ArrowRight'){
    const next=Math.max(0,Math.min(model[rowIndex].length-1,column+(key==='ArrowLeft'?-1:1)));focus(model[rowIndex][next]);return;
   }
   const nextRow=rowIndex+(key==='ArrowUp'?-1:1);
   if(nextRow<0){focus(tabs.find(t=>t.dataset.studioTab===activeTab()));return}
   if(nextRow>=model.length){focus(done);return}
   focus(model[nextRow][Math.min(column,model[nextRow].length-1)]);
  }
  dialog.addEventListener('keydown',onKey);
  dialog.addEventListener('focusin',onFocus);
  host.addEventListener('click',refresh);host.addEventListener('change',refresh);window.addEventListener('resize',refresh);
  focus(tabs.find(t=>t.dataset.studioTab===activeTab()));
  return {refresh,rows,enter:()=>focus(landing()),destroy(){cancelAnimationFrame(frame);focused?.classList.remove('theme-nav-current');focusedRow?.classList.remove('theme-nav-row');dialog.removeEventListener('keydown',onKey);dialog.removeEventListener('focusin',onFocus);host.removeEventListener('click',refresh);host.removeEventListener('change',refresh);window.removeEventListener('resize',refresh);cache.clear()}};
 }
 window.PeepThemeNavigation={mount};
})();
