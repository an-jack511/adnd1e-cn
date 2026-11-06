(() => {
 const paletteKey='adnd1e-palette',paletteControls=[...document.querySelectorAll('select[data-palette-select]')];
 /** @param {string} value */
 const applyPalette=value=>{const palette=['forest','ochre','scarlet'].includes(value)?value:'forest';document.documentElement.dataset.palette=palette;paletteControls.forEach(control=>/** @type {HTMLSelectElement} */(control).value=palette);};
 paletteControls.forEach(control=>control.addEventListener('change',()=>{const palette=/** @type {HTMLSelectElement} */(control).value;applyPalette(palette);try{localStorage.setItem(paletteKey,palette);}catch{}}));
 window.addEventListener('storage',event=>{if(event.key===paletteKey||event.key===null)applyPalette(event.key===null?'forest':event.newValue||'forest');});
 applyPalette(document.documentElement.dataset.palette||'forest');
 const key='adnd1e-theme' ,media=matchMedia('(prefers-color-scheme: dark)'),controls=[...document.querySelectorAll('select[data-theme-select]')];
 let preference=document.documentElement.dataset.themePreference||'system';
 /** @param {string} value */
 const apply=value=>{
  preference=['light','dark','system'].includes(value)?value:'system';
  document.documentElement.dataset.themePreference=preference;
  document.documentElement.dataset.theme=preference==='system'?(media.matches?'dark':'light'):preference;
  controls.forEach(control=>/** @type {HTMLSelectElement} */(control).value=preference);
 };
 controls.forEach(control=>control.addEventListener('change',()=>{apply(/** @type {HTMLSelectElement} */(control).value);try{localStorage.setItem(key,preference);}catch{}}));
 media.addEventListener('change',()=>{if(preference==='system')apply('system');});
 window.addEventListener('storage',event=>{if(event.key===key||event.key===null)apply(event.newValue||'system');});
 apply(preference);
})();
