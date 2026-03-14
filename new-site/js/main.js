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
  // Will be implemented when projects page is created
  const gridInCorso = document.getElementById('grid-in-corso');
  if (!gridInCorso) return;
}

async function loadGallery() {
  // Will be implemented when gallery page is created
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;
}
