#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { marked } = require('marked');
const hljs = require('highlight.js');

marked.use({
  renderer: {
    code({ text, lang }) {
      const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
      return `<pre><code class="hljs language-${language}">${hljs.highlight(text, { language }).value}</code></pre>`;
    }
  }
});

const readme = fs.readFileSync('README.md', 'utf-8');
const css = fs.readFileSync('styles.css', 'utf-8');

function splitSections(md) {
  const parts = md.split(/^## /m);
  const header = parts[0];
  const sections = parts.slice(1).map(part => {
    const nl = part.indexOf('\n');
    return { title: part.slice(0, nl).trim(), body: part.slice(nl + 1).trim() };
  });
  return { header, sections };
}

function sectionId(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
}

// Parse hero from markdown header block
function renderHero(headerMd) {
  const lines = headerMd.split('\n').filter(l => l.trim());
  const name = (lines.find(l => l.startsWith('# ')) || '').slice(2).trim();
  const tagline = (lines.find(l => l.startsWith('> ')) || '').slice(2).trim();
  const contactRaw = lines.find(l => !l.startsWith('#') && !l.startsWith('>')) || '';

  // Location text: everything before the first link
  const location = (contactRaw.split('[')[0] || '')
    .replace(/&nbsp;/g, ' ').replace(/·|⋅|·/g, '').trim()
    .replace(/\s+/g, ' ').replace(/\s*[·\-|]\s*$/, '').trim();

  // Individual contact links
  const linkMatches = [...contactRaw.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)];
  const links = linkMatches.map(([, text, href]) => {
    const ext = href.startsWith('http') ? ' target="_blank" rel="noopener"' : '';
    return `<a href="${href}"${ext} class="hero-link">${text}</a>`;
  }).join('');

  return `<section class="hero reveal" id="top">
    <div class="hero-aura" aria-hidden="true"></div>
    <div class="hero-inner">
      ${location ? `<p class="hero-location">${location}</p>` : ''}
      <h1>${name}</h1>
      ${tagline ? `<p class="hero-tagline">${marked.parseInline(tagline)}</p>` : ''}
      <div class="hero-links">${links}</div>
    </div>
  </section>`;
}

// Projects section: each entry separated by \n---\n → card
function renderProjects(bodyMd) {
  const projects = bodyMd.split(/\n---\n/).map(p => p.trim()).filter(Boolean);

  const cards = projects.map(projectMd => {
    const lines = projectMd.split('\n');
    const rawName = (lines[0].match(/^### (.+)$/) || [])[1] || '';
    const isOngoing = /\*\(Ongoing\)\*/i.test(rawName);
    const cleanName = rawName.replace(/\s*\*\(Ongoing\)\*/gi, '').trim();

    const linksLine = lines.find(l => l.startsWith('**Links:**')) || '';
    const toolsLine = lines.find(l => l.startsWith('**Tools:**')) || '';
    const linksIdx = lines.findIndex(l => l.startsWith('**Links:**'));
    const toolsIdx = lines.findIndex(l => l.startsWith('**Tools:**'));
    const lastMetaIdx = Math.max(0, linksIdx, toolsIdx);

    const desc = lines.slice(lastMetaIdx + 1).filter(l => l.trim()).join(' ');

    // Parse links individually (no raw | separator in output)
    const linksRaw = linksLine.replace(/^\*\*Links:\*\*\s*/, '');
    const linkItems = [...linksRaw.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)]
      .map(([, text, href]) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`)
      .join('');

    const tools = marked.parseInline(toolsLine.replace(/^\*\*Tools:\*\*\s*/, ''));

    const statusBadge = isOngoing ? '<span class="project-status">Ongoing</span>' : '';

    return `<article class="project-card reveal">
      <div class="project-body">
        <h3>${cleanName}${statusBadge}</h3>
        <p class="project-desc">${marked.parseInline(desc)}</p>
      </div>
      <div class="project-footer">
        <div class="project-tools">${tools}</div>
        <div class="project-links">${linkItems}</div>
      </div>
    </article>`;
  }).join('');

  return `<div class="projects-grid">${cards}</div>`;
}

const { header, sections } = splitSections(readme);

const nav = `<nav class="site-nav" role="navigation" aria-label="Main navigation">
  <a class="nav-brand" href="#top">AP</a>
  <div class="nav-links">
    ${sections.map(s => `<a href="#${sectionId(s.title)}">${s.title}</a>`).join('')}
  </div>
  <button class="dark-toggle" onclick="toggleDark()" aria-label="Toggle colour scheme">
    <span id="theme-icon" aria-hidden="true">Light</span>
  </button>
</nav>`;

const hero = renderHero(header);

const mainContent = sections.map(section => {
  const id = sectionId(section.title);
  const content = section.title === 'Projects'
    ? renderProjects(section.body)
    : marked.parse(section.body);
  return `<section id="${id}" class="reveal">
    <h2>${section.title}</h2>
    ${content}
  </section>`;
}).join('');

const TITLE = 'Atul Prakash — Software Engineer';
const DESC = 'I build things — mostly software. Sometimes for fun, often for people who’d rather not click more than once. Based in Assam, India.';
const URL = 'https://portfolio.wily.in';

const html = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${TITLE}</title>
  <meta name="description" content="${DESC}">
  <meta name="author" content="Atul Prakash">
  <meta property="og:title" content="${TITLE}">
  <meta property="og:description" content="${DESC}">
  <meta property="og:url" content="${URL}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${TITLE}">
  <meta name="twitter:description" content="${DESC}">
  <link rel="canonical" href="${URL}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
  <script>tailwind.config = { darkMode: 'class' }</script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>${css}</style>
</head>
<body>
  ${nav}
  <main>
    ${hero}
    ${mainContent}
  </main>
  <footer>
    <p>Built from <a href="https://github.com/prakash-atul/prakash-atul" target="_blank" rel="noopener">README.md</a> &nbsp;&middot;&nbsp; <a href="https://github.com/prakash-atul" target="_blank" rel="noopener">GitHub</a></p>
  </footer>
  <script>
    // Dark mode (class-based for Tailwind compatibility)
    function toggleDark() {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      document.getElementById('theme-icon').textContent = isDark ? 'Light' : 'Dark';
    }
    (function () {
      const saved = localStorage.getItem('theme') ?? 'dark';
      if (saved !== 'dark') document.documentElement.classList.remove('dark');
      document.addEventListener('DOMContentLoaded', function () {
        const isDark = document.documentElement.classList.contains('dark');
        document.getElementById('theme-icon').textContent = isDark ? 'Light' : 'Dark';
      });
    })();

    // Scroll-reveal via IntersectionObserver
    const revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          revealObserver.unobserve(e.target);
        }
      });
    }, { threshold: 0.07 });
    document.querySelectorAll('.reveal').forEach(function (el) { revealObserver.observe(el); });

    // Active nav link on scroll
    const navLinks = document.querySelectorAll('.nav-links a');
    window.addEventListener('scroll', function () {
      let cur = 'top';
      document.querySelectorAll('section[id]').forEach(function (s) {
        if (window.scrollY >= s.offsetTop - 130) cur = s.id;
      });
      navLinks.forEach(function (a) {
        a.classList.toggle('active', a.getAttribute('href') === '#' + cur);
      });
    }, { passive: true });
  </script>
</body>
</html>`;

fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/index.html', html, 'utf-8');
if (fs.existsSync('CNAME')) fs.copyFileSync('CNAME', 'dist/CNAME');

console.log('Built dist/index.html (' + Buffer.byteLength(html) + ' bytes)');
