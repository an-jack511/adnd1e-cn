(() => {
  const article = document.querySelector('.character-library') ? null : document.querySelector('.book-article, .chapter-reading, .library-entry');
  // Keep English as a subtitle without changing heading anchors or wording.
  for (const heading of document.querySelectorAll('main h1,main h2,main h3,main h4,main h5,main h6')) {
    // PHB spell names use emphasis followed by a school/reversal label. Preserve that layout.
    if (heading.closest('.ref2-workspace') || heading.querySelector('em,small,.heading-english,a,input,button')) continue;
    const text=heading.textContent.trim();
    const match=text.match(/^(.+?[\u3400-\u9fff].*?)\s+(?:·\s*)?([A-Z][^\u3400-\u9fff]+)$/);
    if (!match) continue;
    const english=document.createElement('small'); english.className='heading-english'; english.lang='en'; english.textContent=match[2];
    heading.replaceChildren(document.createTextNode(match[1]),english);
  }
  if(document.documentElement.classList.contains('library-embedded'))return;
  if (!article || article.closest('.reading-layout')) return;
  const headings = [...article.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(h => !h.closest('.book-page-nav,.book-continuations'));
  if (headings.length < 3) return;
  const wrapper = document.createElement('div'); wrapper.className = 'reading-layout';
  article.before(wrapper); wrapper.append(article);
  const aside = document.createElement('aside'); aside.className = 'reading-outline';
  const details = document.createElement('details'); details.open = matchMedia('(min-width: 1600px)').matches;
  const summary = document.createElement('summary'); summary.textContent = '本章目录'; details.append(summary);
  const search = document.createElement('input'); search.type = 'search'; search.placeholder = '查找章内标题'; search.setAttribute('aria-label', '查找章内标题'); details.append(search);
  const nav = document.createElement('nav'); nav.setAttribute('aria-label', '本章细目'); details.append(nav);
  const links = new Map(); let sequence = 0;
  for (const heading of headings) {
    if (!heading.id) { do { heading.id = `section-${++sequence}`; } while (document.querySelectorAll(`[id="${heading.id}"]`).length > 1); }
    const a = document.createElement('a'); a.href = `#${encodeURIComponent(heading.id)}`; a.textContent = [...heading.childNodes].map(node=>(node.textContent ?? '').trim()).filter(Boolean).join(' · '); a.title=a.textContent; a.dataset.search=a.textContent.toLocaleLowerCase(); const subtitle=heading.querySelector('small'); if(subtitle) a.textContent=[...heading.childNodes].filter(node=>node!==subtitle).map(node=>node.textContent).join('').trim(); a.dataset.level = heading.tagName.slice(1); nav.append(a); links.set(heading, a);
  }
  search.addEventListener('input', () => { const query = search.value.trim().toLocaleLowerCase(); for (const a of links.values()) a.hidden = !a.dataset.search.includes(query); });
  const visible = new Set();
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target);
    const current = headings.find(h => visible.has(h)); if (!current) return;
    for (const [heading, a] of links) heading === current ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current');
  }, { rootMargin: '0px 0px -65% 0px' });
  for (const heading of headings) observer.observe(heading);
  aside.append(details); wrapper.append(aside);
  if(location.hash) { try { document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView(); } catch {} }
})();
