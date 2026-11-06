document.addEventListener('click', async event => {
  const button = event.target instanceof Element ? event.target.closest('button[data-cite]') : null;
  if (!(button instanceof HTMLButtonElement)) return;
  const link = button.parentElement?.querySelector('a');
  if (!link) return;
  const citation = button.dataset.cite + '\n' + link.href;
  try {
    await navigator.clipboard.writeText(citation);
    button.textContent = '引用已复制';
    setTimeout(() => { button.textContent = '复制引用'; }, 1500);
  } catch {
    window.prompt('复制下方引用', citation);
  }
});
