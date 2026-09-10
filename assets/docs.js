import { bindTheme } from './theme.js';

// The markdown files are the source of truth; this page is a wrapper so they
// read in the site's own type rather than GitHub's.
const DOCS = { hosting: 'hosting.md', approach: 'approach.md', roadmap: 'roadmap.md' };

const slug = new URLSearchParams(location.search).get('doc') || 'hosting';
const file = DOCS[slug] || DOCS.hosting;
const target = document.getElementById('doc');

fetch(file)
  .then((response) => {
    if (!response.ok) throw new Error('could not load ' + file);
    return response.text();
  })
  .then((markdown) => {
    target.innerHTML = window.marked.parse(markdown);
    document.title = (target.querySelector('h1')?.textContent || 'Visage') +
      ' — Visage';
  })
  .catch((err) => {
    target.replaceChildren();
    const message = document.createElement('p');
    message.textContent = err.message +
      '. The file is in the repository under docs/ if this page will not load it.';
    target.appendChild(message);
  });

bindTheme(() => {});
