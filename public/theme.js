(() => {
 const key='adnd1e-theme',media=matchMedia('(prefers-color-scheme: dark)'),controls=[...document.querySelectorAll('select[data-theme-select]')];
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
