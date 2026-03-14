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

  // Load latest projects on home page
  loadLatestProjects();
  // Load projects on projects page
  loadProjects();
  // Load gallery on gallery page
  loadGallery();
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
            <article class="card">
              <div class="card-image"><img src="${p.image}" alt="${escapeHTML(p.title)}"></div>
              <div class="card-body">
                <h3>${escapeHTML(p.title)}</h3>
                <p class="date">${formatDate(p.startDate)} — ${formatDate(p.endDate)}</p>
                <p>${escapeHTML(p.description)}</p>
              </div>
            </article>
          `).join('');
        }
      });
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
            <p class="date">${formatDate(p.date)}</p>
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
      lbCaption.innerHTML = '<h3>' + escapeHTML(photo.title) + '</h3><p>' + escapeHTML(photo.description) + '</p>';
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
