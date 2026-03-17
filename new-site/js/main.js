document.addEventListener('DOMContentLoaded', () => {
  // Hamburger menu toggle
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.navbar-menu');
  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => navMenu.classList.remove('active'));
    });
  }

  // Load stats on home page
  loadStats();
  // Load latest projects on home page
  loadLatestProjects();
  // Load projects on projects page
  loadProjects();
  // Load gallery on gallery page
  loadGallery();
  // Load partners on partner page
  loadPartners();
  // Load events on events page and homepage
  loadEvents();
  loadUpcomingEvents();
});

function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}

function setupCardLightbox(items) {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox || items.length === 0) return;

  const lbImg = document.getElementById('lightbox-img');
  const lbCaption = document.getElementById('lightbox-caption');
  let currentIndex = 0;

  function open(index) {
    currentIndex = index;
    update();
    lightbox.classList.add('active');
  }

  function update() {
    const item = items[currentIndex];
    lbImg.src = item.image;
    lbImg.alt = item.title;
    lbCaption.innerHTML = '<h3>' + escapeHTML(item.title) + '</h3><p>' + escapeHTML(item.description || '') + '</p>';
  }

  function close() { lightbox.classList.remove('active'); }

  document.getElementById('lightbox-close').addEventListener('click', close);
  document.getElementById('lightbox-prev').addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + items.length) % items.length;
    update();
  });
  document.getElementById('lightbox-next').addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % items.length;
    update();
  });
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') { currentIndex = (currentIndex - 1 + items.length) % items.length; update(); }
    if (e.key === 'ArrowRight') { currentIndex = (currentIndex + 1) % items.length; update(); }
  });
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });

  return open;
}

async function loadStats() {
  const grid = document.getElementById('stats-grid');
  if (!grid) return;
  try {
    const res = await fetch('data/projects.json');
    const projects = await res.json();
    const totProjects = projects.length;
    const totIncontri = projects.reduce((s, p) => s + (p.incontri || 0), 0);
    const totOre = projects.reduce((s, p) => s + (p.ore || 0), 0);
    const totPartecipanti = projects.reduce((s, p) => s + (p.partecipanti || 0), 0);
    const totEducatori = projects.reduce((s, p) => s + (p.educatori || 0), 0);
    const totVolontari = projects.reduce((s, p) => s + (p.volontari || 0), 0);
    const years = new Set(projects.map(p => new Date(p.startDate).getFullYear()));
    const totYears = years.size;

    const stats = [
      { number: totProjects, label: 'Progetti realizzati' },
      { number: totIncontri, label: 'Incontri organizzati' },
      { number: Math.round(totOre), label: 'Ore di attività' },
      { number: totPartecipanti, label: 'Partecipanti coinvolti' },
      { number: totVolontari, label: 'Volontari impiegati' },
      { number: totEducatori, label: 'Educatori coinvolti' },
      { number: totYears, label: 'Anni di attività' },
      { number: new Set(projects.flatMap(p => [p.collaboratori, p.sponsor].filter(Boolean))).size, label: 'Partner e collaboratori' }
    ];

    grid.innerHTML = stats.map(s => `
      <div class="stat-card">
        <span class="stat-number">${s.number}</span>
        <span class="stat-label">${escapeHTML(s.label)}</span>
      </div>
    `).join('');
  } catch (e) {
    console.warn('Could not load stats:', e);
    const section = document.getElementById('stats-section');
    if (section) section.style.display = 'none';
  }
}

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
      <article class="card">
        <div class="card-image"><img src="${p.image}" alt="${escapeHTML(p.title)}"></div>
        <div class="card-body">
          <h3>${escapeHTML(p.title)}</h3>
          <p class="date">${formatDate(p.startDate)} — ${formatDate(p.endDate)}</p>
          <p>${escapeHTML(p.description)}</p>
        </div>
      </article>
    `).join('');
  } catch (e) {
    console.warn('Could not load projects:', e);
    document.getElementById('latest-projects').style.display = 'none';
  }
}

async function loadProjects() {
  const gridInCorso = document.getElementById('grid-in-corso');
  if (!gridInCorso) return;

  try {
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
        if (query && !p.title.toLowerCase().includes(query) && !p.description.toLowerCase().includes(query)) return false;
        if (from || to) {
          const pStart = new Date(p.startDate);
          const pEnd = new Date(p.endDate);
          if (from && pEnd < from) return false;
          if (to && pStart > to) return false;
        }
        return true;
      });

      const allVisible = [];
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
          const startIdx = allVisible.length;
          items.forEach(p => allVisible.push(p));
          grid.innerHTML = items.map((p, i) => `
            <article class="card" data-lb-index="${startIdx + i}">
              <div class="card-image" style="cursor:pointer"><img src="${p.image}" alt="${escapeHTML(p.title)}"></div>
              <div class="card-body">
                <h3>${escapeHTML(p.title)}</h3>
                <p class="date">${formatDate(p.startDate)} — ${formatDate(p.endDate)}</p>
                <p>${escapeHTML(p.description)}</p>
              </div>
            </article>
          `).join('');
        }
      });

      const openLb = setupCardLightbox(allVisible);
      if (openLb) {
        document.querySelectorAll('[data-lb-index] .card-image').forEach(el => {
          el.addEventListener('click', () => openLb(parseInt(el.closest('[data-lb-index]').dataset.lbIndex)));
        });
      }
    }

    searchInput.addEventListener('input', renderProjects);
    dateFrom.addEventListener('change', renderProjects);
    dateTo.addEventListener('change', renderProjects);
    renderProjects();
  } catch (e) {
    console.warn('Could not load projects:', e);
  }
}

async function loadGallery() {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;

  try {
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
          <img src="${p.image}" alt="${escapeHTML(p.title)}">
          <div class="gallery-item-info">
            <h3>${escapeHTML(p.title)}</h3>
            <p class="date">${formatDate(p.date)}${p.location ? ' — ' + escapeHTML(p.location) : ''}</p>
          </div>
        </div>
      `).join('');

      grid.querySelectorAll('.gallery-item').forEach(item => {
        item.addEventListener('click', () => openLightbox(parseInt(item.dataset.index)));
      });
    }

    const lightbox = document.getElementById('lightbox');
    const lbImg = document.getElementById('lightbox-img');
    const lbCaption = document.getElementById('lightbox-caption');

    function openLightbox(index) {
      currentIndex = index;
      updateLightbox();
      lightbox.classList.add('active');
    }

    function updateLightbox() {
      if (visiblePhotos.length === 0) return;
      const photo = visiblePhotos[currentIndex];
      lbImg.src = photo.image;
      lbImg.alt = photo.title;
      const locHtml = photo.location ? '<p style="color:#ccc;font-size:0.9rem;">📍 ' + escapeHTML(photo.location) + '</p>' : '';
      lbCaption.innerHTML = '<h3>' + escapeHTML(photo.title) + '</h3>' + locHtml + '<p>' + escapeHTML(photo.description) + '</p>';
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

    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('active')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') { currentIndex = (currentIndex - 1 + visiblePhotos.length) % visiblePhotos.length; updateLightbox(); }
      if (e.key === 'ArrowRight') { currentIndex = (currentIndex + 1) % visiblePhotos.length; updateLightbox(); }
    });

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    searchInput.addEventListener('input', renderGallery);
    dateFrom.addEventListener('change', renderGallery);
    dateTo.addEventListener('change', renderGallery);
    renderGallery();
  } catch (e) {
    console.warn('Could not load gallery:', e);
  }
}

const TYPE_LABELS = {
  istituzionale: 'Istituzione',
  associazione: 'Associazione',
  cooperativa: 'Cooperativa',
  scuola: 'Scuola',
  azienda: 'Azienda'
};

async function loadPartners() {
  const grid = document.getElementById('partners-grid');
  if (!grid) return;

  try {
    const res = await fetch('data/partners.json');
    const allPartners = await res.json();

    const searchInput = document.getElementById('partner-search');
    const typeFilter = document.getElementById('partner-type-filter');

    function renderPartners() {
      const query = searchInput.value.toLowerCase();
      const type = typeFilter.value;

      const filtered = allPartners.filter(p => {
        if (query && !p.name.toLowerCase().includes(query) && !(p.description || '').toLowerCase().includes(query)) return false;
        if (type && p.type !== type) return false;
        return true;
      });

      grid.innerHTML = filtered.map(p => {
        const initials = p.name.split(/\s+/).map(w => w[0]).join('').substring(0, 2).toUpperCase();
        const logoHtml = p.logo
          ? `<img src="${p.logo}" alt="${escapeHTML(p.name)}">`
          : `<div class="partner-placeholder">${escapeHTML(initials)}</div>`;
        const linkHtml = p.url
          ? `<a href="${p.url}" class="partner-link" target="_blank" rel="noopener noreferrer">Visita il sito ↗</a>`
          : '';
        const typeLabel = TYPE_LABELS[p.type] || p.type || '';

        return `
          <div class="partner-card">
            <div class="partner-card-logo">${logoHtml}</div>
            <div class="partner-card-body">
              <h3>${escapeHTML(p.name)}</h3>
              ${typeLabel ? `<span class="partner-type">${escapeHTML(typeLabel)}</span>` : ''}
              <p>${escapeHTML(p.description || '')}</p>
              ${linkHtml}
            </div>
          </div>
        `;
      }).join('');

      if (filtered.length === 0) {
        grid.innerHTML = '<p style="color:#999;text-align:center;grid-column:1/-1;">Nessun partner trovato.</p>';
      }
    }

    searchInput.addEventListener('input', renderPartners);
    typeFilter.addEventListener('change', renderPartners);
    renderPartners();
  } catch (e) {
    console.warn('Could not load partners:', e);
  }
}

function renderEventCard(e) {
  const startStr = formatDate(e.startDate);
  const endStr = formatDate(e.endDate);
  const dateDisplay = (e.startDate === e.endDate || !e.endDate) ? startStr : `${startStr} — ${endStr}`;
  const locationStr = e.location ? `<span>📍 ${escapeHTML(e.location)}</span>` : '';
  const linkHtml = e.link
    ? `<a href="${e.link}" class="partner-link" target="_blank" rel="noopener noreferrer">Maggiori info ↗</a>`
    : '';

  return `
    <article class="card">
      <div class="card-image" style="cursor:pointer"><img src="${e.image}" alt="${escapeHTML(e.title)}"></div>
      <div class="card-body">
        <h3>${escapeHTML(e.title)}</h3>
        <div class="event-meta">
          <span>📅 ${dateDisplay}</span>
          ${locationStr}
        </div>
        <p>${escapeHTML(e.description)}</p>
        ${linkHtml}
      </div>
    </article>
  `;
}

async function loadEvents() {
  const gridFuturo = document.getElementById('grid-futuro');
  if (!gridFuturo) return;

  try {
    const res = await fetch('data/events.json');
    const allEvents = await res.json();

    if (allEvents.length === 0) {
      document.querySelector('.project-section#section-futuro').innerHTML =
        '<div class="section"><p style="color:#999;text-align:center;">Nessun evento in programma. Torna a trovarci!</p></div>';
      const passatoSection = document.getElementById('section-passato');
      if (passatoSection) passatoSection.style.display = 'none';
      return;
    }

    const searchInput = document.getElementById('search-input');
    const dateFrom = document.getElementById('date-from');
    const dateTo = document.getElementById('date-to');

    function renderEvents() {
      const query = searchInput.value.toLowerCase();
      const from = dateFrom.value ? new Date(dateFrom.value) : null;
      const to = dateTo.value ? new Date(dateTo.value) : null;

      const filtered = allEvents.filter(e => {
        if (query && !e.title.toLowerCase().includes(query) && !(e.description || '').toLowerCase().includes(query)) return false;
        if (from || to) {
          const eStart = new Date(e.startDate);
          const eEnd = new Date(e.endDate || e.startDate);
          if (from && eEnd < from) return false;
          if (to && eStart > to) return false;
        }
        return true;
      });

      const allVisible = [];
      ['futuro', 'passato'].forEach(status => {
        const items = filtered.filter(e => e.status === status);
        const grid = document.getElementById('grid-' + status);
        const section = document.getElementById('section-' + status);

        if (items.length === 0) {
          section.style.display = 'none';
        } else {
          section.style.display = 'block';
          const startIdx = allVisible.length;
          items.forEach(e => allVisible.push(e));
          grid.innerHTML = items.map((e, i) => {
            const card = renderEventCard(e);
            return card.replace('<article class="card">', `<article class="card" data-lb-index="${startIdx + i}">`);
          }).join('');
        }
      });

      const openLb = setupCardLightbox(allVisible);
      if (openLb) {
        document.querySelectorAll('[data-lb-index] .card-image').forEach(el => {
          el.addEventListener('click', () => openLb(parseInt(el.closest('[data-lb-index]').dataset.lbIndex)));
        });
      }
    }

    searchInput.addEventListener('input', renderEvents);
    dateFrom.addEventListener('change', renderEvents);
    dateTo.addEventListener('change', renderEvents);
    renderEvents();
  } catch (e) {
    console.warn('Could not load events:', e);
  }
}

async function loadUpcomingEvents() {
  const grid = document.getElementById('upcoming-events-grid');
  if (!grid) return;

  try {
    const res = await fetch('data/events.json');
    const allEvents = await res.json();
    const upcoming = allEvents.filter(e => e.status === 'futuro').slice(0, 3);

    if (upcoming.length === 0) {
      document.getElementById('upcoming-events').style.display = 'none';
      return;
    }

    grid.innerHTML = upcoming.map(renderEventCard).join('');
  } catch (e) {
    console.warn('Could not load upcoming events:', e);
    const section = document.getElementById('upcoming-events');
    if (section) section.style.display = 'none';
  }
}
