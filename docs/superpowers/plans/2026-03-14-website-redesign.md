# La Rosa dei Venti APS - Website Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static HTML/CSS/JS website in a `new-site/` directory, isolated from the current WordPress site, ready to be swapped in when approved.

**Architecture:** Multi-page static site with shared CSS and JS. Projects and gallery content loaded from JSON files via fetch(). No frameworks or build tools. All files under `new-site/` to avoid disrupting the live WordPress site.

**Tech Stack:** HTML5, CSS3 (Grid, Flexbox), vanilla JavaScript (ES6+), Formspree for contact form.

**Spec:** `docs/superpowers/specs/2026-03-14-website-redesign-design.md`

---

## File Structure

All new files go under `new-site/`:

```
new-site/
├── index.html
├── mission.html
├── progetti.html
├── gallery.html
├── contatti.html
├── 404.html
├── .htaccess
├── css/
│   └── style.css
├── js/
│   └── main.js
├── data/
│   ├── projects.json
│   └── gallery.json
├── images/
│   ├── projects/       (placeholder images)
│   └── gallery/        (placeholder images)
```

---

## Chunk 1: Foundation (CSS + Navbar + Footer + Home)

### Task 1: Create directory structure and placeholder data

**Files:**
- Create: `new-site/data/projects.json`
- Create: `new-site/data/gallery.json`
- Create: `new-site/images/projects/.gitkeep`
- Create: `new-site/images/gallery/.gitkeep`

- [ ] **Step 1: Create directories**

```bash
mkdir -p new-site/css new-site/js new-site/data new-site/images/projects new-site/images/gallery
```

- [ ] **Step 2: Create projects.json with sample data**

Create `new-site/data/projects.json`:
```json
[
  {
    "title": "Progetto Esempio In Corso",
    "description": "Descrizione del progetto attualmente in corso.",
    "image": "images/projects/placeholder.svg",
    "startDate": "2026-01-15",
    "endDate": "2026-06-30",
    "status": "in_corso"
  },
  {
    "title": "Progetto Esempio Futuro",
    "description": "Un progetto che partirà nei prossimi mesi.",
    "image": "images/projects/placeholder.svg",
    "startDate": "2026-07-01",
    "endDate": "2026-12-31",
    "status": "futuro"
  },
  {
    "title": "Progetto Esempio Passato",
    "description": "Un progetto già completato con successo.",
    "image": "images/projects/placeholder.svg",
    "startDate": "2025-03-01",
    "endDate": "2025-09-30",
    "status": "passato"
  }
]
```

- [ ] **Step 3: Create gallery.json with sample data**

Create `new-site/data/gallery.json`:
```json
[
  {
    "title": "Foto Esempio 1",
    "description": "Una foto di esempio per la gallery.",
    "image": "images/gallery/placeholder.svg",
    "date": "2026-02-10"
  },
  {
    "title": "Foto Esempio 2",
    "description": "Un'altra foto di esempio.",
    "image": "images/gallery/placeholder.svg",
    "date": "2026-01-20"
  }
]
```

- [ ] **Step 4: Create SVG placeholder image**

Create `new-site/images/projects/placeholder.svg` and copy it to `new-site/images/gallery/placeholder.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect fill="#FFF3E8" width="400" height="300"/>
  <text x="200" y="150" text-anchor="middle" fill="#E8630A" font-family="sans-serif" font-size="18">Immagine</text>
</svg>
```

- [ ] **Step 5: Create .gitkeep files**

```bash
touch new-site/images/projects/.gitkeep new-site/images/gallery/.gitkeep
```

- [ ] **Step 6: Commit**

```bash
git add new-site/
git commit -m "feat: add new-site directory structure and placeholder data"
```

---

### Task 2: Create the CSS stylesheet

**Files:**
- Create: `new-site/css/style.css`

The entire design system in one stylesheet: CSS reset, variables, navbar, footer, hero, cards, filter bar, grid, lightbox, responsive breakpoints.

- [ ] **Step 1: Write style.css**

Create `new-site/css/style.css` with the full stylesheet containing:
- CSS custom properties for all design tokens (--primary: #E8630A, --primary-light: #FFF3E8, --gradient, --accent-green, --accent-blue, --accent-gray, --dark: #333, --radius-card: 8px, --radius-input: 4px)
- CSS reset (box-sizing, margin, padding)
- Body: system font stack, color #333, background #fff
- `.navbar`: fixed top, z-index 1000, background var(--primary), flexbox row, padding 0 2rem, height 64px
- `.navbar-logo`: flex row, align center, gap 0.5rem, color white, text-decoration none, font-weight bold
- `.navbar-menu`: flex row, gap 1.5rem, list-style none
- `.navbar-menu a`: color white, text-decoration none, padding 0.5rem 0, border-bottom 2px solid transparent
- `.navbar-menu a.active, a:hover`: border-bottom-color white
- `.hamburger`: display none (shown on mobile)
- `.footer`: background var(--dark), color white, padding 2rem, text-align center
- `.footer-social a`: color white, margin 0 0.5rem
- `.hero`: min-height 60vh, background var(--gradient), display flex, flex-direction column, align-items center, justify-content center, color white, text-align center, padding 2rem, margin-top 64px
- `.hero h1`: font-size 2.5rem, margin-bottom 0.5rem
- `.hero p`: font-size 1.2rem, opacity 0.9
- `.btn-primary`: background white, color var(--primary), padding 0.75rem 2rem, border-radius var(--radius-card), font-weight bold, text-decoration none, display inline-block, margin-top 1rem
- `.btn-primary:hover`: transform scale(1.05)
- `main`: margin-top 64px (accounts for fixed navbar)
- `.section`: padding 3rem 2rem, max-width 1200px, margin 0 auto
- `.section-title`: font-size 1.8rem, margin-bottom 1.5rem
- `.cards-grid`: display grid, grid-template-columns repeat(3, 1fr), gap 1.5rem
- `.card`: background white, border-radius var(--radius-card), overflow hidden, box-shadow 0 2px 8px rgba(0,0,0,0.1), transition transform 0.2s
- `.card:hover`: transform translateY(-4px)
- `.card-image`: width 100%, height 200px, object-fit cover
- `.card-image img`: width 100%, height 100%, object-fit cover
- `.card-body`: padding 1rem
- `.card-body h3`: margin-bottom 0.5rem
- `.card-body .date`: font-size 0.85rem, color #999
- `.feature-cards`: display grid, grid-template-columns repeat(3, 1fr), gap 1.5rem, padding 3rem 2rem, max-width 1200px, margin 0 auto
- `.feature-card`: background var(--primary-light), border-radius var(--radius-card), padding 2rem, text-align center, text-decoration none, color #333
- `.feature-card .icon`: font-size 2.5rem, margin-bottom 1rem
- `.filter-bar`: background #fafafa, border-bottom 1px solid #eee, padding 1rem 2rem, display flex, gap 1rem, align-items center, position sticky, top 64px, z-index 100
- `.filter-bar input`: padding 0.5rem 1rem, border 1px solid #ddd, border-radius var(--radius-input), font-size 0.9rem
- `.filter-bar input[type="text"]`: flex 1
- `.project-section`: padding 2rem, max-width 1200px, margin 0 auto
- `.project-section-title`: font-size 1.4rem, padding-left 1rem, border-left 4px solid, margin-bottom 1.5rem
- `.project-section-title.in-corso`: border-color var(--accent-green), color var(--accent-green)
- `.project-section-title.futuro`: border-color var(--accent-blue), color var(--accent-blue)
- `.project-section-title.passato`: border-color var(--accent-gray), color var(--accent-gray)
- `.gallery-grid`: display grid, grid-template-columns repeat(auto-fill, minmax(280px, 1fr)), gap 1.5rem, padding 2rem, max-width 1200px, margin 0 auto
- `.gallery-item`: cursor pointer, border-radius var(--radius-card), overflow hidden, box-shadow 0 2px 8px rgba(0,0,0,0.1)
- `.gallery-item img`: width 100%, height 220px, object-fit cover, transition transform 0.3s
- `.gallery-item:hover img`: transform scale(1.05)
- `.gallery-item-info`: padding 0.75rem
- `.lightbox`: display none, position fixed, top 0, left 0, width 100%, height 100%, background rgba(0,0,0,0.9), z-index 2000, align-items center, justify-content center, flex-direction column
- `.lightbox.active`: display flex
- `.lightbox img`: max-width 90%, max-height 80vh, border-radius var(--radius-card)
- `.lightbox-close, .lightbox-prev, .lightbox-next`: position absolute, color white, font-size 2rem, cursor pointer, background none, border none, padding 1rem
- `.lightbox-close`: top 1rem, right 1rem
- `.lightbox-prev`: left 1rem, top 50%
- `.lightbox-next`: right 1rem, top 50%
- `.lightbox-caption`: color white, text-align center, padding 1rem, max-width 600px
- `.contact-grid`: display grid, grid-template-columns 1fr 1fr, gap 2rem, max-width 1200px, margin 0 auto, padding 2rem
- `.contact-info h3`: color var(--primary), margin-bottom 1rem
- `.contact-info p`: margin-bottom 0.5rem
- `.contact-form input, .contact-form textarea`: width 100%, padding 0.75rem, border 1px solid #ddd, border-radius var(--radius-input), margin-bottom 1rem, font-family inherit
- `.contact-form textarea`: min-height 150px, resize vertical
- `.contact-form button`: background var(--primary), color white, padding 0.75rem 2rem, border none, border-radius var(--radius-input), cursor pointer, font-size 1rem
- `.contact-form button:hover`: background #d4570a
- `.map-container`: width 100%, max-width 1200px, margin 0 auto, padding 0 2rem 2rem
- `.map-container iframe`: width 100%, height 400px, border none, border-radius var(--radius-card)
- `.team-grid`: display grid, grid-template-columns repeat(auto-fill, minmax(200px, 1fr)), gap 1.5rem
- `.team-card`: text-align center, padding 1.5rem
- `.team-card img`: width 120px, height 120px, border-radius 50%, object-fit cover, margin-bottom 1rem
- `.values-grid`: display grid, grid-template-columns repeat(3, 1fr), gap 1.5rem
- `.value-card`: background var(--primary-light), border-radius var(--radius-card), padding 1.5rem, text-align center
- `.value-card .icon`: font-size 2rem, margin-bottom 0.5rem, color var(--primary)
- Media query @media (max-width: 768px): `.cards-grid, .feature-cards, .values-grid` to 2 columns, `.contact-grid` to 1 column, `.filter-bar` flex-wrap wrap, `.hero h1` font-size 1.8rem
- Media query @media (max-width: 480px): `.cards-grid, .feature-cards, .values-grid` to 1 column, `.navbar-menu` display none, `.navbar-menu.active` display flex, flex-direction column, position absolute, top 64px, left 0, right 0, background var(--primary), padding 1rem, `.hamburger` display block, color white, font-size 1.5rem, background none, border none, cursor pointer

- [ ] **Step 2: Commit**

```bash
git add new-site/css/style.css
git commit -m "feat: add complete stylesheet with design system"
```

---

### Task 3: Create Home page (index.html)

**Files:**
- Create: `new-site/index.html`

- [ ] **Step 1: Write index.html**

Create `new-site/index.html` with:
- DOCTYPE, html lang="it"
- `<head>`: charset UTF-8, viewport meta, title "La Rosa dei Venti APS", meta description, Open Graph tags (og:title, og:description, og:type website), link to `css/style.css`
- `<nav class="navbar">`: logo (text "🌹 La Rosa dei Venti APS" linking to index.html), `<ul class="navbar-menu">` with 5 `<li><a>` items (Home active, Mission, Progetti, Gallery, Contatti), `<button class="hamburger">☰</button>`
- `<section class="hero">`: `<h1>La Rosa dei Venti APS</h1>`, `<p>Associazione di Promozione Sociale</p>`, `<a href="progetti.html" class="btn-primary">Scopri i progetti</a>`
- `<section class="feature-cards">`: 3 `.feature-card` each linking to mission.html, progetti.html, gallery.html with icon div (🎯, 📋, 📸), h3, and p
- `<div id="latest-projects" class="section">`: `<h2 class="section-title">Ultimi Progetti</h2>`, `<div class="cards-grid" id="latest-projects-grid"></div>` (populated by JS)
- `<footer class="footer">`: address, email, social SVG icons (Facebook, Instagram), copyright
- `<script src="js/main.js"></script>`

- [ ] **Step 2: Verify in browser**

```bash
cd new-site && python -m http.server 8080
```
Open http://localhost:8080 — verify navbar, hero, feature cards, footer render correctly.

- [ ] **Step 3: Commit**

```bash
git add new-site/index.html
git commit -m "feat: add home page with hero, feature cards, and footer"
```

---

### Task 4: Create main.js with hamburger menu and latest projects

**Files:**
- Create: `new-site/js/main.js`

- [ ] **Step 1: Write main.js with hamburger menu toggle**

Create `new-site/js/main.js`:
```javascript
document.addEventListener('DOMContentLoaded', () => {
  // Hamburger menu toggle
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.navbar-menu');
  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });
    // Close menu when clicking a link
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => navMenu.classList.remove('active'));
    });
  }
});
```

- [ ] **Step 2: Add latest projects loader function**

Append to `new-site/js/main.js`:
```javascript
// Load latest projects on home page
async function loadLatestProjects() {
  const grid = document.getElementById('latest-projects-grid');
  if (!grid) return;
  try {
    const res = await fetch('data/projects.json');
    const projects = await res.json();
    const inCorso = projects.filter(p => p.status === 'in_corso').slice(0, 3);
    if (inCorso.length === 0) {
      document.getElementById('latest-projects').style.display = 'none';
      return;
    }
    grid.innerHTML = inCorso.map(p => `
      <div class="card">
        <div class="card-image"><img src="${p.image}" alt="${p.title}"></div>
        <div class="card-body">
          <h3>${p.title}</h3>
          <p class="date">${formatDate(p.startDate)} — ${formatDate(p.endDate)}</p>
          <p>${p.description}</p>
        </div>
      </div>
    `).join('');
  } catch (e) {
    console.warn('Could not load projects:', e);
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}

loadLatestProjects();
```

- [ ] **Step 3: Verify in browser**

Open http://localhost:8080 — verify hamburger works on narrow viewport and latest projects load.

- [ ] **Step 4: Commit**

```bash
git add new-site/js/main.js
git commit -m "feat: add main.js with hamburger menu and latest projects"
```

---

## Chunk 2: Mission + Progetti + Gallery pages

### Task 5: Create Mission page

**Files:**
- Create: `new-site/mission.html`

- [ ] **Step 1: Write mission.html**

Create `new-site/mission.html` with:
- Same `<head>` structure as index.html, title "Mission — La Rosa dei Venti APS"
- Same navbar (Mission link has class `active`)
- `<main>`:
  - `<section class="section">`: `<h2 class="section-title">La Nostra Mission</h2>`, 2-3 paragraphs of placeholder text about the association
  - `<section class="section">`: `<h2 class="section-title">I Nostri Valori</h2>`, `<div class="values-grid">` with 3 `.value-card` items (Inclusione, Territorio, Cultura — each with `.icon` div, h3, p)
  - `<section class="section">`: `<h2 class="section-title">Il Nostro Team</h2>`, `<div class="team-grid">` with 3 `.team-card` items (placeholder photo via SVG data URI, name, role)
- Same footer
- `<script src="js/main.js"></script>`

- [ ] **Step 2: Verify in browser**

Open http://localhost:8080/mission.html — verify all sections render.

- [ ] **Step 3: Commit**

```bash
git add new-site/mission.html
git commit -m "feat: add mission page with values and team sections"
```

---

### Task 6: Create Progetti page

**Files:**
- Create: `new-site/progetti.html`
- Modify: `new-site/js/main.js` (add project loading and filtering)

- [ ] **Step 1: Write progetti.html**

Create `new-site/progetti.html` with:
- Same `<head>`, title "Progetti — La Rosa dei Venti APS"
- Same navbar (Progetti link has class `active`)
- `<main>`:
  - `<div class="filter-bar">`: `<input type="text" id="search-input" placeholder="🔍 Cerca progetti...">`, `<input type="date" id="date-from" title="Da">`, `<input type="date" id="date-to" title="A">`
  - `<div id="section-in-corso" class="project-section">`: `<h2 class="project-section-title in-corso">Progetti in Corso</h2>`, `<div class="cards-grid" id="grid-in-corso"></div>`
  - `<div id="section-futuro" class="project-section">`: `<h2 class="project-section-title futuro">Progetti Futuri</h2>`, `<div class="cards-grid" id="grid-futuro"></div>`
  - `<div id="section-passato" class="project-section">`: `<h2 class="project-section-title passato">Progetti Passati</h2>`, `<div class="cards-grid" id="grid-passato"></div>`
- Same footer
- `<script src="js/main.js"></script>`

- [ ] **Step 2: Add project loading and filtering to main.js**

Append to `new-site/js/main.js`:
```javascript
// Projects page
async function loadProjects() {
  const gridInCorso = document.getElementById('grid-in-corso');
  if (!gridInCorso) return; // Not on projects page

  const res = await fetch('data/projects.json');
  const allProjects = await res.json();

  const searchInput = document.getElementById('search-input');
  const dateFrom = document.getElementById('date-from');
  const dateTo = document.getElementById('date-to');

  function renderProjects() {
    const query = searchInput.value.toLowerCase();
    const from = dateFrom.value ? new Date(dateFrom.value) : null;
    const to = dateTo.value ? new Date(dateTo.value) : null;

    const filtered = allProjects.filter(p => {
      // Text filter
      if (query && !p.title.toLowerCase().includes(query) && !p.description.toLowerCase().includes(query)) return false;
      // Date overlap filter
      if (from || to) {
        const pStart = new Date(p.startDate);
        const pEnd = new Date(p.endDate);
        if (from && pEnd < from) return false;
        if (to && pStart > to) return false;
      }
      return true;
    });

    ['in_corso', 'futuro', 'passato'].forEach(status => {
      const items = filtered.filter(p => p.status === status);
      const gridId = 'grid-' + status.replace('_', '-');
      const sectionId = 'section-' + status.replace('_', '-');
      const grid = document.getElementById(gridId);
      const section = document.getElementById(sectionId);

      if (items.length === 0) {
        section.style.display = 'none';
      } else {
        section.style.display = 'block';
        grid.innerHTML = items.map(p => `
          <div class="card">
            <div class="card-image"><img src="${p.image}" alt="${p.title}"></div>
            <div class="card-body">
              <h3>${p.title}</h3>
              <p class="date">${formatDate(p.startDate)} — ${formatDate(p.endDate)}</p>
              <p>${p.description}</p>
            </div>
          </div>
        `).join('');
      }
    });
  }

  searchInput.addEventListener('input', renderProjects);
  dateFrom.addEventListener('change', renderProjects);
  dateTo.addEventListener('change', renderProjects);
  renderProjects();
}

loadProjects();
```

- [ ] **Step 3: Verify in browser**

Open http://localhost:8080/progetti.html — verify 3 sections render with sample data, search filter works, date filter works, empty sections hide.

- [ ] **Step 4: Commit**

```bash
git add new-site/progetti.html new-site/js/main.js
git commit -m "feat: add projects page with filtering by text and date"
```

---

### Task 7: Create Gallery page with lightbox

**Files:**
- Create: `new-site/gallery.html`
- Modify: `new-site/js/main.js` (add gallery loading, filtering, lightbox)

- [ ] **Step 1: Write gallery.html**

Create `new-site/gallery.html` with:
- Same `<head>`, title "Gallery — La Rosa dei Venti APS"
- Same navbar (Gallery link has class `active`)
- `<main>`:
  - `<div class="filter-bar">`: same inputs as progetti (search, date-from, date-to)
  - `<div class="gallery-grid" id="gallery-grid"></div>`
- Lightbox markup:
  - `<div class="lightbox" id="lightbox">`: `<button class="lightbox-close" id="lightbox-close">✕</button>`, `<button class="lightbox-prev" id="lightbox-prev">❮</button>`, `<img id="lightbox-img" src="" alt="">`, `<button class="lightbox-next" id="lightbox-next">❯</button>`, `<div class="lightbox-caption" id="lightbox-caption"></div>`
- Same footer
- `<script src="js/main.js"></script>`

- [ ] **Step 2: Add gallery loading, filtering, and lightbox to main.js**

Append to `new-site/js/main.js`:
```javascript
// Gallery page
async function loadGallery() {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;

  const res = await fetch('data/gallery.json');
  const allPhotos = await res.json();
  let currentIndex = 0;
  let visiblePhotos = [];

  const searchInput = document.getElementById('search-input');
  const dateFrom = document.getElementById('date-from');
  const dateTo = document.getElementById('date-to');

  function renderGallery() {
    const query = searchInput.value.toLowerCase();
    const from = dateFrom.value ? new Date(dateFrom.value) : null;
    const to = dateTo.value ? new Date(dateTo.value) : null;

    visiblePhotos = allPhotos.filter(p => {
      if (query && !p.title.toLowerCase().includes(query) && !p.description.toLowerCase().includes(query)) return false;
      if (from || to) {
        const pDate = new Date(p.date);
        if (from && pDate < from) return false;
        if (to && pDate > to) return false;
      }
      return true;
    });

    grid.innerHTML = visiblePhotos.map((p, i) => `
      <div class="gallery-item" data-index="${i}">
        <img src="${p.image}" alt="${p.title}">
        <div class="gallery-item-info">
          <h3>${p.title}</h3>
          <p class="date">${formatDate(p.date)}</p>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.gallery-item').forEach(item => {
      item.addEventListener('click', () => openLightbox(parseInt(item.dataset.index)));
    });
  }

  // Lightbox
  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightbox-img');
  const lbCaption = document.getElementById('lightbox-caption');

  function openLightbox(index) {
    currentIndex = index;
    updateLightbox();
    lightbox.classList.add('active');
  }

  function updateLightbox() {
    const photo = visiblePhotos[currentIndex];
    lbImg.src = photo.image;
    lbImg.alt = photo.title;
    lbCaption.innerHTML = `<h3>${photo.title}</h3><p>${photo.description}</p>`;
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
  }

  document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
  document.getElementById('lightbox-prev').addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + visiblePhotos.length) % visiblePhotos.length;
    updateLightbox();
  });
  document.getElementById('lightbox-next').addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % visiblePhotos.length;
    updateLightbox();
  });

  // Keyboard support
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') { currentIndex = (currentIndex - 1 + visiblePhotos.length) % visiblePhotos.length; updateLightbox(); }
    if (e.key === 'ArrowRight') { currentIndex = (currentIndex + 1) % visiblePhotos.length; updateLightbox(); }
  });

  // Click outside image to close
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  searchInput.addEventListener('input', renderGallery);
  dateFrom.addEventListener('change', renderGallery);
  dateTo.addEventListener('change', renderGallery);
  renderGallery();
}

loadGallery();
```

- [ ] **Step 3: Verify in browser**

Open http://localhost:8080/gallery.html — verify grid renders, filters work, lightbox opens/closes, prev/next and keyboard work.

- [ ] **Step 4: Commit**

```bash
git add new-site/gallery.html new-site/js/main.js
git commit -m "feat: add gallery page with lightbox and filtering"
```

---

## Chunk 3: Contatti + 404 + .htaccess + Deploy config

### Task 8: Create Contatti page

**Files:**
- Create: `new-site/contatti.html`

- [ ] **Step 1: Write contatti.html**

Create `new-site/contatti.html` with:
- Same `<head>`, title "Contatti — La Rosa dei Venti APS"
- Same navbar (Contatti link has class `active`)
- `<main>`:
  - `<h2 class="section-title" style="max-width:1200px;margin:2rem auto;padding:0 2rem">Contattaci</h2>`
  - `<div class="contact-grid">`:
    - Left `<div class="contact-info">`: h3 "Informazioni", paragraphs with address, phone, email (as `<a href="mailto:...">`), social links section with inline SVG icons for Facebook and Instagram
    - Right `<div class="contact-form">`: `<form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">` with `<input name="name" placeholder="Nome" required>`, `<input type="email" name="email" placeholder="Email" required>`, `<textarea name="message" placeholder="Il tuo messaggio..." required></textarea>`, `<button type="submit">Invia messaggio</button>`
  - `<div class="map-container">`: `<iframe>` with Google Maps embed (placeholder coordinates, user will replace)
- Same footer
- `<script src="js/main.js"></script>`

- [ ] **Step 2: Verify in browser**

Open http://localhost:8080/contatti.html — verify two-column layout, form renders, map shows.

- [ ] **Step 3: Commit**

```bash
git add new-site/contatti.html
git commit -m "feat: add contacts page with form and map"
```

---

### Task 9: Create 404 page and .htaccess

**Files:**
- Create: `new-site/404.html`
- Create: `new-site/.htaccess`

- [ ] **Step 1: Write 404.html**

Create `new-site/404.html` — simple page with navbar, message "Pagina non trovata", link back to home.

- [ ] **Step 2: Write .htaccess**

Create `new-site/.htaccess`:
```apache
# Error pages
ErrorDocument 404 /404.html

# Disable directory listing
Options -Indexes

# Enable gzip compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml
</IfModule>

# Browser caching
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 month"
  ExpiresByType image/webp "access plus 1 year"
</IfModule>
```

- [ ] **Step 3: Commit**

```bash
git add new-site/404.html new-site/.htaccess
git commit -m "feat: add 404 page and static-site htaccess"
```

---

### Task 10: Update deploy workflow exclusions

**Files:**
- Modify: `.github/workflows/deploy-ftp.yml`

- [ ] **Step 1: Update exclude list**

Add to the exclude section in `.github/workflows/deploy-ftp.yml`:
```yaml
          exclude: |
            **/.git*
            **/.git*/**
            .github/**
            .claude/**
            .superpowers/**
            docs/**
            new-site/**
            README.md
```

Note: `new-site/**` is excluded from deploy for now — the new site won't go live until it's moved to root and WordPress files are removed.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy-ftp.yml
git commit -m "chore: update deploy exclusions for new-site and docs"
```

---

### Task 11: Final verification

- [ ] **Step 1: Start local server and test all pages**

```bash
cd new-site && python -m http.server 8080
```

Verify:
- Home: hero, feature cards, latest projects, footer
- Mission: about text, values cards, team cards
- Progetti: filter bar works, 3 sections render, text search works, date filter works, empty sections hide
- Gallery: grid renders, filters work, lightbox opens, prev/next/keyboard/close work
- Contatti: two-column layout, form present, map shows
- 404: shows error page
- All pages: navbar links work, active page highlighted, hamburger works on mobile viewport
- Responsive: test at 768px and 480px widths

- [ ] **Step 2: Final commit and push**

```bash
git add -A
git commit -m "feat: complete new-site static website (isolated from live WordPress)"
git push
```
