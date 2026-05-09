#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { marked } = require('marked');
const hljs = require('highlight.js');

// Syntax highlighting for code blocks
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

// Split markdown into header block + named sections on ## headings
function splitSections(md) {
  const parts = md.split(/^## /m);
  const header = parts[0];
  const sections = parts.slice(1).map(part => {
    const nl = part.indexOf('\n');
    return {
      title: part.slice(0, nl).trim(),
      body: part.slice(nl + 1).trim()
    };
  });
  return { header, sections };
}

function sectionId(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
}

// Hero: extract H1, tagline blockquote, and contact line
function renderHero(headerMd) {
  const lines = headerMd.split('\n').filter(l => l.trim());
  const name = (lines.find(l => l.startsWith('# ')) || '').slice(2).trim();
  const tagline = (lines.find(l => l.startsWith('> ')) || '').slice(2).trim();
  const contact = lines.find(l => l.trim() && !l.startsWith('#') && !l.startsWith('>')) || '';

  return `<section class="hero" id="top">
    <h1>${name}</h1>
    ${tagline ? `<p class="tagline">${tagline}</p>` : ''}
    ${contact ? `<p class="contact">${marked.parseInline(contact)}</p>` : ''}
  </section>`;
}

// Projects: each project is separated by \n---\n and rendered as a card
function renderProjects(bodyMd) {
  const projects = bodyMd.split(/\n---\n/).map(p => p.trim()).filter(Boolean);

  const cards = projects.map(projectMd => {
    const lines = projectMd.split('\n');
    const rawName = (lines[0].match(/^### (.+)$/) || [])[1] || '';
    const name = marked.parseInline(rawName);

    const linksLine = lines.find(l => l.startsWith('**Links:**')) || '';
    const toolsLine = lines.find(l => l.startsWith('**Tools:**')) || '';
    const linksIdx = lines.findIndex(l => l.startsWith('**Links:**'));
    const toolsIdx = lines.findIndex(l => l.startsWith('**Tools:**'));
    const lastMetaIdx = Math.max(0, linksIdx, toolsIdx);

    const desc = lines.slice(lastMetaIdx + 1).filter(l => l.trim()).join(' ');
    const links = linksLine ? marked.parseInline(linksLine.replace(/^\*\*Links:\*\*\s*/, '')) : '';
    const tools = toolsLine ? marked.parseInline(toolsLine.replace(/^\*\*Tools:\*\*\s*/, '')) : '';

    return `<article class="project-card">
      <h3>${name}</h3>
      <div class="project-links">${links}</div>
      <p class="project-desc">${marked.parseInline(desc)}</p>
      <div class="project-tools">${tools}</div>
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
    <span aria-hidden="true" id="theme-icon">Light</span>
  </button>
</nav>`;

const hero = renderHero(header);

const mainContent = sections.map(section => {
  const id = sectionId(section.title);
  const content = section.title === 'Projects'
    ? renderProjects(section.body)
    : marked.parse(section.body);
  return `<section id="${id}">
    <h2>${section.title}</h2>
    ${content}
  </section>`;
}).join('');

const TITLE = 'Atul Prakash — Software Engineer';
const DESC = 'Software Engineer specializing in full-stack development, AI, and human-centered design. Based in Assam, India.';
const URL = 'https://portfolio.wily.in';

const html = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
  <style>${css}</style>
</head>
<body>
  ${nav}
  <main>
    ${hero}
    ${mainContent}
  </main>
  <footer>
    <p>Built from <a href="https://github.com/prakash-atul/prakash-atul" target="_blank" rel="noopener">README.md</a> &nbsp;·&nbsp; <a href="https://github.com/prakash-atul" target="_blank" rel="noopener">GitHub</a></p>
  </footer>
  <script>
    function toggleDark() {
      const html = document.documentElement;
      const next = html.dataset.theme === 'dark' ? 'light' : 'dark';
      html.dataset.theme = next;
      localStorage.setItem('theme', next);
      document.getElementById('theme-icon').textContent = next === 'dark' ? 'Light' : 'Dark';
    }

    (function () {
      const saved = localStorage.getItem('theme') || 'dark';
      document.documentElement.dataset.theme = saved;
      document.addEventListener('DOMContentLoaded', function () {
        document.getElementById('theme-icon').textContent = saved === 'dark' ? 'Light' : 'Dark';
      });
    })();

    // Highlight active nav link on scroll
    const navLinks = document.querySelectorAll('.nav-links a');
    window.addEventListener('scroll', function () {
      let current = 'top';
      document.querySelectorAll('section[id]').forEach(function (s) {
        if (window.scrollY >= s.offsetTop - 130) current = s.id;
      });
      navLinks.forEach(function (a) {
        a.classList.toggle('active', a.getAttribute('href') === '#' + current);
      });
    }, { passive: true });
  </script>
</body>
</html>`;

fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/index.html', html);
if (fs.existsSync('CNAME')) fs.copyFileSync('CNAME', 'dist/CNAME');

console.log('Built dist/index.html (' + Buffer.byteLength(html) + ' bytes)');
