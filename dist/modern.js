// Navegação, superfícies e controles de custo visual, sem dependências extras.
const uiIcons={
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
 apps:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 ambient:'<path d="M11 20A8 8 0 0 1 9.8 4.1C15.5 3 17 2.5 19 2c1 2 1 5 1 7a8 8 0 0 1-9 11Z"/><path d="M2 22c0-6 6-12 12-14"/>',
 themes:'<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2a10 10 0 1 0 0 20h1.8a2 2 0 0 0 1.4-3.4l-.3-.3a1 1 0 0 1 .7-1.7H17a5 5 0 0 0 5-5A10 10 0 0 0 12 2Z"/>',
 layout:'<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16m4-10h4m-4 4h4"/>'
};
function uiIcon(name){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+uiIcons[name]+'</svg>'}
function describeControl(button,label,description){
 button.classList.add('has-tip');button.setAttribute('aria-label',label);
 const id=(button.id||'nav-'+button.dataset.page)+'-tip';
 const tip=document.createElement('span');tip.className='control-tip';tip.id=id;tip.setAttribute('role','tooltip');tip.textContent=description;
 button.setAttribute('aria-describedby',id);button.append(tip);
}
document.querySelectorAll('header nav button').forEach(button=>{
 const key=button.dataset.page||'themes',label=button.textContent;
 button.innerHTML=uiIcon(key)+'<span class="nav-label">'+escapeHTML(label)+'</span>';
 describeControl(button,key==='themes'?'Escolher tema':label,{home:'Início · favoritos e seu painel',apps:'Aplicativos · sua biblioteca',ambient:'Ambiente · clima, cotações e ferramentas',themes:'Tema · cores e aparência da sua tela'}[key]);
});
const styleToggle=document.createElement('button');styleToggle.id='nav-style';styleToggle.className='icon-button';styleToggle.innerHTML=uiIcon('layout');
$('.status').insertBefore(styleToggle,$('#settings'));
describeControl(styleToggle,'Exibir navegação por ícones','Alternar entre textos e ícones');
describeControl($('#settings'),'Configurações','Configurações · rede, sistema e aparência');
describeControl($('#profile'),'Perfil Abel','Seu perfil e preferências');
describeControl($('#network-pill'),'Rede e Wi-Fi','Rede e Wi-Fi · sinal e tráfego da Konka');
styleToggle.onclick=()=>{prefs.navigation=prefs.navigation==='icons'?'text':'icons';apply();notify(prefs.navigation==='icons'?'Ícones ativos. Passe o mouse ou use o controle para ver a descrição.':'Navegação com textos ativa.')};
const modernApply=apply;
apply=function(){modernApply();document.body.dataset.navigation=prefs.navigation==='icons'?'icons':'text';document.body.dataset.performance=prefs.performance==='economy'?'economy':'balanced';
 const t=themeCatalog.find(t=>t.id===prefs.theme)||themeCatalog[0];$('#themes .nav-label').textContent='Tema';$('#themes').setAttribute('aria-label','Escolher tema. Atual: '+t.name);$('#themes-tip').textContent='Tema · atual: '+t.name;
 styleToggle.setAttribute('aria-pressed',String(prefs.navigation==='icons'));styleToggle.setAttribute('aria-label',prefs.navigation==='icons'?'Exibir navegação por textos':'Exibir navegação por ícones');
 if(prefs.performance==='economy')document.documentElement.style.setProperty('--blur','0px');save();
};
// O aplicador de temas original atualizava o texto do botão inteiro. Mantém ícone e tooltip.
const modernAppearance=appearance;
appearance=function(){modernAppearance();const options=document.createElement('div');options.className='interface-options';options.innerHTML='<h3>Interface e desempenho</h3><label class="option">Navegação<select id="navigation-choice" aria-label="Navegação"><option value="text">Textos</option><option value="icons">Ícones com descrições</option></select></label><label class="option">Acabamento<select id="performance-choice" aria-label="Acabamento"><option value="balanced">Equilibrado · vidro ajustável</option><option value="economy">Econômico · sem desfoque e movimento</option></select></label><p class="inline-note">O modo econômico reduz efeitos. A memória exibida nos painéis é o uso total do Android TV.</p>';$('#panel-content').append(options);
 $('#navigation-choice').value=prefs.navigation||'text';$('#performance-choice').value=prefs.performance||'balanced';$('#navigation-choice').onchange=e=>{prefs.navigation=e.target.value;apply()};$('#performance-choice').onchange=e=>{prefs.performance=e.target.value;apply()};
};
$('#glass-shortcut').onclick=()=>appearance();apply();
