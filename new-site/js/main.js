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
        <div class="card-image"><img src="${p.image}" alt="${p.title}"></div>
        <div class="card-body">
          <h3>${p.title}</h3>
          <p class="date">${formatDate(p.startDate)} — ${formatDate(p.endDate)}</p>
          <p>${p.description}</p>
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
              <div class="card-image"><img src="${p.image}" alt="${p.title}"></div>
              <div class="card-body">
                <h3>${p.title}</h3>
                <p class="date">${formatDate(p.startDate)} — ${formatDate(p.endDate)}</p>
                <p>${p.description}</p>
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
  // Will be implemented when gallery page is created
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;
}
