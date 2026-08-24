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

  // Il menu «Utilità» della barra
  avviaMenuUtilita();

  // Load stats on home page
  loadStats();
  // Fasce di numeri in cima a progetti/eventi/partner (ognuna esce subito
  // se il suo contenitore non è in pagina, come loadStats fa già sopra)
  loadProjectStats();
  loadEventStats();
  loadPartnerStats();
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
  // Load direttivo on mission page
  loadDirettivo();
  // Load documenti on documenti page
  loadDocumenti();
});

/**
 * Il menu «Utilità» della barra in alto.
 *
 * Col mouse basta il CSS (`:hover`), ma non basta mai da solo: su un telefono
 * `:hover` resta acceso dopo il tocco e il menu non si chiude più, e con la
 * tastiera ci si deve poter arrivare senza mouse. Qui si aggiunge il clic,
 * l'Escape e la chiusura quando si tocca fuori.
 *
 * ⚠️ Sotto i 768px il CSS mostra le tre voci sempre aperte, rientrate dentro
 * il menu a scomparsa: li' questo codice non serve, e la classe `aperto` che
 * mette non cambia niente.
 */
function avviaMenuUtilita() {
  const voce = document.querySelector('.voce-utilita');
  if (!voce) return;
  const bottone = voce.querySelector('.utilita-apri');
  if (!bottone) return;

  const apri = (aperto) => {
    voce.classList.toggle('aperto', aperto);
    bottone.setAttribute('aria-expanded', aperto ? 'true' : 'false');
  };

  bottone.addEventListener('click', (e) => {
    e.stopPropagation();
    apri(!voce.classList.contains('aperto'));
  });

  document.addEventListener('click', (e) => {
    if (!voce.contains(e.target)) apri(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && voce.classList.contains('aperto')) {
      apri(false);
      bottone.focus();
    }
  });
}

function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Mescola una COPIA dell'array con Fisher-Yates, usando `Math.random()`
 * vero, non seminato.
 *
 * ⚠️ È l'opposto apposta di `mescola()` in `hero.js`: lì il seme è il
 * giorno, perché due persone che si scambiano il link nella stessa
 * giornata devono vedere le stesse fotografie. Qui invece (elenco
 * partner) il committente vuole che l'ordine cambi a OGNI apertura della
 * pagina, per dare l'impressione di partner sempre nuovi — quindi niente
 * seme. Se un giorno qualcuno pensa che le due funzioni siano in
 * contraddizione e "corregge" quella sbagliata, il motivo è scritto qui.
 */
function mescolaCasuale(elenco) {
  const copia = elenco.slice();
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Rende una miniatura (scheda progetto/evento o foto della gallery) apribile
 * anche da tastiera — Invio/Spazio fanno la stessa cosa del clic — e le dà
 * un posto vero dove il fuoco può tornare quando l'ingranditore si chiude:
 * un <div> senza tabindex non può riprendere il fuoco, quindi senza questo
 * chi naviga da tastiera lo perderebbe e si ritroverebbe in cima alla
 * pagina invece che dov'era rimasto.
 */
function makeLightboxTrigger(el, label, onActivate) {
  el.setAttribute('tabindex', '0');
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', label);
  el.addEventListener('click', onActivate);
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate();
    }
  });
}

/**
 * Ingranditore (lightbox) condiviso da progetti, eventi e gallery (22/08/2026).
 *
 * ⛔ Uno solo per tutto il sito: prima la gallery aveva la sua copia interna
 * di questa stessa logica, duplicata rispetto a quella usata da progetti ed
 * eventi. Tenerne due voleva dire due comportamenti leggermente diversi per
 * lo stesso gesto — qui si è tenuta una sola implementazione e la gallery è
 * stata riportata a usarla.
 *
 * ⚠️ Si chiama UNA volta sola per pagina (è idempotente: le chiamate
 * successive restituiscono la stessa istanza via `lightbox._lightboxApi`).
 * Chi la usa aggiorna l'elenco corrente con `setItems()` a ogni filtro,
 * invece di richiamare questa funzione a ogni digitazione — altrimenti ogni
 * ricerca impilerebbe un nuovo ascoltatore sugli stessi tre pulsanti
 * (chiudi/prev/next) senza mai togliere quelli vecchi, e con più filtri di
 * fila un solo clic su "next" avrebbe fatto scorrere l'indice più volte.
 *
 * Ogni voce di `items` è: { image, alt, title, meta, description }.
 * `meta` e `description` sono opzionali (niente riga se mancano).
 */
function setupCardLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return null;
  if (lightbox._lightboxApi) return lightbox._lightboxApi;

  const lbImg = document.getElementById('lightbox-img');
  const lbCaption = document.getElementById('lightbox-caption');
  const btnClose = document.getElementById('lightbox-close');
  const btnPrev = document.getElementById('lightbox-prev');
  const btnNext = document.getElementById('lightbox-next');
  const focusOrder = [btnClose, btnPrev, btnNext];

  let items = [];
  let currentIndex = 0;
  let triggerEl = null;

  function update() {
    if (!items.length) return;
    const item = items[currentIndex];
    lbImg.src = conVersione(item.image);
    lbImg.alt = item.alt || item.title || '';
    const metaHtml = item.meta ? '<p class="lightbox-meta">' + escapeHTML(item.meta) + '</p>' : '';
    const descHtml = item.description ? '<p>' + escapeHTML(item.description) + '</p>' : '';
    lbCaption.innerHTML = '<h3>' + escapeHTML(item.title || '') + '</h3>' + metaHtml + descHtml;
    const showArrows = items.length > 1;
    btnPrev.style.display = showArrows ? '' : 'none';
    btnNext.style.display = showArrows ? '' : 'none';
  }

  // Il fuoco non deve restare intrappolato in mezzo alla pagina: mentre
  // l'ingranditore è aperto il resto (nav, contenuto, footer) esce dalla
  // lettura per chi usa uno screen reader, non solo dal giro del Tab.
  function setBackgroundHidden(hidden) {
    Array.from(document.body.children).forEach((el) => {
      if (el === lightbox || el.tagName === 'SCRIPT') return;
      if (hidden) el.setAttribute('aria-hidden', 'true');
      else el.removeAttribute('aria-hidden');
    });
  }

  function open(index, fromEl) {
    if (!items.length) return;
    currentIndex = ((index % items.length) + items.length) % items.length;
    triggerEl = fromEl || document.activeElement;
    update();
    lightbox.classList.add('active');
    setBackgroundHidden(true);
    btnClose.focus();
    document.addEventListener('keydown', onKeydown);
  }

  function close() {
    lightbox.classList.remove('active');
    setBackgroundHidden(false);
    document.removeEventListener('keydown', onKeydown);
    // Il fuoco torna a chi ha aperto l'ingranditore, non si perde in cima
    // alla pagina.
    if (triggerEl && typeof triggerEl.focus === 'function') triggerEl.focus();
    triggerEl = null;
  }

  function goPrev() { currentIndex = (currentIndex - 1 + items.length) % items.length; update(); }
  function goNext() { currentIndex = (currentIndex + 1) % items.length; update(); }

  function onKeydown(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowLeft') { goPrev(); return; }
    if (e.key === 'ArrowRight') { goNext(); return; }
    if (e.key === 'Tab') {
      // Trappola del fuoco fra i tre pulsanti: non c'è altro da
      // raggiungere dentro l'ingranditore.
      const pos = focusOrder.indexOf(document.activeElement);
      if (e.shiftKey) {
        if (pos <= 0) { e.preventDefault(); focusOrder[focusOrder.length - 1].focus(); }
      } else if (pos === -1 || pos === focusOrder.length - 1) {
        e.preventDefault();
        focusOrder[0].focus();
      }
    }
  }

  btnClose.addEventListener('click', close);
  btnPrev.addEventListener('click', goPrev);
  btnNext.addEventListener('click', goNext);
  // Si chiude anche cliccando fuori dall'immagine (sullo sfondo scuro).
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });

  // Trascinamento laterale sul telefono: solo se il gesto è più
  // orizzontale che verticale, per non litigare con uno scorrimento
  // verticale involontario.
  let touchStartX = null;
  let touchStartY = null;
  const SOGLIA_TRASCINAMENTO = 40;
  lightbox.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  }, { passive: true });
  lightbox.addEventListener('touchend', (e) => {
    if (touchStartX === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    touchStartX = null;
    touchStartY = null;
    if (Math.abs(dx) > SOGLIA_TRASCINAMENTO && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) goPrev(); else goNext();
    }
  }, { passive: true });

  const api = {
    setItems(newItems) { items = newItems || []; },
    open
  };
  lightbox._lightboxApi = api;
  return api;
}

/**
 * Disegna le schede `.stat-card` dentro `contenitore` e avvia il conteggio
 * animato (`animaNumeri`). Condiviso da `loadStats` (home) e dalle fasce
 * gemelle di progetti/eventi/partner, così il markup delle schede resta
 * uno solo invece di essere copiato quattro volte.
 */
function renderStatCards(grid, stats) {
  grid.innerHTML = stats.map(s => `
    <div class="stat-card">
      <span class="stat-icona" aria-hidden="true">${s.icona}</span>
      <span class="stat-number" data-valore="${s.number}">0</span>
      <span class="stat-label">${escapeHTML(s.label)}</span>
    </div>
  `).join('');

  animaNumeri(grid);
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
      { number: totProjects, label: 'Progetti realizzati', icona: '📋' },
      { number: totIncontri, label: 'Incontri organizzati', icona: '🗓️' },
      { number: Math.round(totOre), label: 'Ore di attività', icona: '⏱️' },
      { number: totPartecipanti, label: 'Partecipanti coinvolti', icona: '🧑‍🤝‍🧑' },
      { number: totVolontari, label: 'Volontari impiegati', icona: '🤝' },
      { number: totEducatori, label: 'Educatori coinvolti', icona: '🎓' },
      { number: totYears, label: 'Anni di attività', icona: '📅' },
      { number: new Set(projects.flatMap(p => [p.collaboratori, p.sponsor].filter(Boolean))).size, label: 'Partner e collaboratori', icona: '🏛️' }
    ];

    renderStatCards(grid, stats);
  } catch (e) {
    console.warn('Could not load stats:', e);
    const section = document.getElementById('stats-section');
    if (section) section.style.display = 'none';
  }
}

/**
 * Fascia numeri in cima a progetti.html. Stessi campi che il committente
 * ha indicato esserci nei dati (incontri, ore, partecipanti, educatori,
 * volontari) più il totale progetti: sei numeri, tutti calcolati da
 * `data/projects.json`, mai scritti a mano.
 */
async function loadProjectStats() {
  const grid = document.getElementById('progetti-stats-grid');
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

    const stats = [
      { number: totProjects, label: 'Progetti realizzati', icona: '📋' },
      { number: totIncontri, label: 'Incontri organizzati', icona: '🗓️' },
      { number: Math.round(totOre), label: 'Ore di attività', icona: '⏱️' },
      { number: totPartecipanti, label: 'Partecipanti coinvolti', icona: '🧑‍🤝‍🧑' },
      { number: totEducatori, label: 'Educatori coinvolti', icona: '🎓' },
      { number: totVolontari, label: 'Volontari coinvolti', icona: '🤝' }
    ];

    renderStatCards(grid, stats);
  } catch (e) {
    console.warn('Could not load project stats:', e);
  }
}

/**
 * Fascia numeri in cima a eventi.html.
 *
 * ⛔ Niente "eventi di quest'anno": nei dati reali sono tutti passati e
 * nessuno cade nell'anno corrente, quindi sarebbe uno zero vero ma
 * fuorviante in cima a una fascia che vuole raccontare il percorso.
 * Meglio tre numeri sinceri e tutti positivi (quello che i dati permettono
 * davvero di dire) che un quarto che scoraggia chi guarda.
 */
async function loadEventStats() {
  const grid = document.getElementById('eventi-stats-grid');
  if (!grid) return;
  try {
    const res = await fetch('data/events.json');
    const events = await res.json();
    const anni = new Set(events.map(e => new Date(e.startDate).getFullYear()));
    const luoghi = new Set(events.map(e => e.location).filter(Boolean));

    const stats = [
      { number: events.length, label: 'Eventi realizzati', icona: '🎉' },
      { number: anni.size, label: 'Anni di eventi', icona: '📅' },
      { number: luoghi.size, label: 'Luoghi coinvolti', icona: '📍' }
    ];

    renderStatCards(grid, stats);
  } catch (e) {
    console.warn('Could not load event stats:', e);
  }
}

/**
 * Fascia numeri in cima a partner.html: il totale e quanti per ciascun
 * tipo (`type` in `data/partners.json`), le stesse categorie del filtro
 * qui sotto.
 */
async function loadPartnerStats() {
  const grid = document.getElementById('partner-stats-grid');
  if (!grid) return;
  try {
    const res = await fetch('data/partners.json');
    const partners = await res.json();
    const perTipo = {};
    partners.forEach(p => { perTipo[p.type] = (perTipo[p.type] || 0) + 1; });

    const stats = [
      { number: partners.length, label: 'Partner totali', icona: '🤝' },
      { number: perTipo.associazione || 0, label: 'Associazioni', icona: '👥' },
      { number: perTipo.istituzionale || 0, label: 'Istituzioni', icona: '🏛️' },
      { number: perTipo.azienda || 0, label: 'Aziende', icona: '🏢' },
      { number: perTipo.cooperativa || 0, label: 'Cooperative', icona: '🌻' },
      { number: perTipo.scuola || 0, label: 'Scuole', icona: '🎓' }
    ];

    renderStatCards(grid, stats);
  } catch (e) {
    console.warn('Could not load partner stats:', e);
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
        <div class="card-image"><img src="${conVersione(p.image)}" alt="${escapeHTML(p.title)}" class="${classeImmagine(p.image)}"></div>
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
    const lightbox = setupCardLightbox();

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
          // Niente scheda resta cliccabile qui, ma senza svuotarla restano
          // schede vecchie con un data-lb-index ormai sbagliato: al filtro
          // successivo si sarebbero riattaccati ascoltatori di clic su
          // elementi nascosti, uno in più a ogni ricerca.
          grid.innerHTML = '';
        } else {
          section.style.display = 'block';
          const startIdx = allVisible.length;
          items.forEach(p => allVisible.push(p));
          grid.innerHTML = items.map((p, i) => `
            <article class="card" data-lb-index="${startIdx + i}">
              <div class="card-image" style="cursor:pointer"><img src="${conVersione(p.image)}" alt="${escapeHTML(p.title)}" loading="lazy" class="${classeImmagine(p.image)}"></div>
              <div class="card-body">
                <h3>${escapeHTML(p.title)}</h3>
                <p class="date">${formatDate(p.startDate)} — ${formatDate(p.endDate)}</p>
                <p>${escapeHTML(p.description)}</p>
              </div>
            </article>
          `).join('');
        }
      });

      // Lo scorrimento nell'ingranditore resta dentro le sole schede
      // mostrate qui — cioè quelle già passate dal filtro sopra.
      if (lightbox) {
        lightbox.setItems(allVisible.map(p => ({
          image: p.image,
          alt: p.title,
          title: p.title,
          meta: `${formatDate(p.startDate)} — ${formatDate(p.endDate)}`,
          description: p.description
        })));
        document.querySelectorAll('[data-lb-index] .card-image').forEach(el => {
          const idx = parseInt(el.closest('[data-lb-index]').dataset.lbIndex, 10);
          const img = el.querySelector('img');
          makeLightboxTrigger(el, 'Ingrandisci: ' + (img ? img.alt : ''), () => lightbox.open(idx, el));
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

/**
 * Riga di data/luogo(/orario) sotto una foto della gallery — usata sia
 * nella griglia sia nell'ingranditore, così le due non possono disallinearsi.
 *
 * ⚠️ Alcune foto non hanno più `date` o `location`: chi cura l'elenco ha
 * deciso che un'informazione che non si conosce non si scrive (niente
 * segnaposto, niente «Invalid Date»). Qui si compone SOLO con i pezzi che
 * ci sono davvero — se non ce n'è nessuno la riga sparisce del tutto,
 * invece di lasciare uno spazio vuoto o un trattino solitario.
 */
function formatGalleryMeta(photo) {
  const pieces = [];
  if (photo.date) {
    let dt = formatDate(photo.date);
    if (photo.ora) dt += ' · ' + photo.ora;
    pieces.push(dt);
  } else if (photo.ora) {
    // Orario senza una data: raro, ma se c'è si mostra comunque.
    pieces.push(photo.ora);
  }
  if (photo.location) pieces.push('📍 ' + photo.location);
  return pieces.join(' — ');
}

async function loadGallery() {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;

  try {
    const res = await fetch('data/gallery.json');
    const allPhotos = await res.json();

    const searchInput = document.getElementById('search-input');
    const dateFrom = document.getElementById('date-from');
    const dateTo = document.getElementById('date-to');
    const lightbox = setupCardLightbox();

    function renderGallery() {
      const query = searchInput.value.toLowerCase();
      const from = dateFrom.value ? new Date(dateFrom.value) : null;
      const to = dateTo.value ? new Date(dateTo.value) : null;

      const visiblePhotos = allPhotos.filter(p => {
        if (query && !p.title.toLowerCase().includes(query) && !(p.description || '').toLowerCase().includes(query)) return false;
        // Il filtro per data si applica SOLO alle foto che una data ce
        // l'hanno. Scelta esplicita (non un effetto collaterale): una foto
        // senza data resta SEMPRE visibile — non sappiamo se cade
        // nell'intervallo scelto, e farla sparire in silenzio sarebbe
        // l'errore peggiore, perché nessuno se ne accorgerebbe.
        if ((from || to) && p.date) {
          const pDate = new Date(p.date);
          if (from && pDate < from) return false;
          if (to && pDate > to) return false;
        }
        return true;
      });

      // L'ordine è quello di data/gallery.json, invariato: non c'è nessun
      // ordinamento per data qui, quindi una foto senza data non "salta"
      // da nessuna parte — resta dov'è stata messa da chi cura l'elenco.
      grid.innerHTML = visiblePhotos.map((p, i) => {
        const meta = formatGalleryMeta(p);
        return `
        <div class="gallery-item" data-index="${i}">
          <img src="${conVersione(p.image)}" alt="${escapeHTML(p.title)}" loading="lazy" class="${classeImmagine(p.image)}">
          <div class="gallery-item-info">
            <h3>${escapeHTML(p.title)}</h3>
            ${meta ? `<p class="date">${escapeHTML(meta)}</p>` : ''}
          </div>
        </div>
      `;
      }).join('');

      // Lo scorrimento nell'ingranditore resta dentro le sole foto mostrate
      // qui — cioè quelle già passate dal filtro sopra.
      if (lightbox) {
        lightbox.setItems(visiblePhotos.map(p => ({
          image: p.image,
          alt: p.title,
          title: p.title,
          meta: formatGalleryMeta(p),
          description: p.description
        })));
        grid.querySelectorAll('.gallery-item').forEach(item => {
          const idx = parseInt(item.dataset.index, 10);
          const img = item.querySelector('img');
          makeLightboxTrigger(item, 'Ingrandisci: ' + (img ? img.alt : ''), () => lightbox.open(idx, item));
        });
      }
    }

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
    const datiPartner = await res.json();
    // Mescolati SUBITO, prima di ogni filtro/render — non riordinando il
    // DOM dopo: così le schede nascono già nell'ordine giusto, e la
    // ricerca/il filtro per tipo (che usano Array.filter, che non cambia
    // l'ordine di ciò che passa) restano mescolati ma non perdono nessun
    // partner. Vedi `mescolaCasuale()` sul perché non è seminato come la
    // hero.
    const allPartners = mescolaCasuale(datiPartner);

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
          ? `<img src="${conVersione(p.logo)}" alt="${escapeHTML(p.name)}">`
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

function eventDateDisplay(e) {
  const startStr = formatDate(e.startDate);
  const endStr = formatDate(e.endDate);
  return (e.startDate === e.endDate || !e.endDate) ? startStr : `${startStr} — ${endStr}`;
}

function renderEventCard(e) {
  const dateDisplay = eventDateDisplay(e);
  const locationStr = e.location ? `<span>📍 ${escapeHTML(e.location)}</span>` : '';
  const linkHtml = e.link
    ? `<a href="${e.link}" class="partner-link" target="_blank" rel="noopener noreferrer">Maggiori info ↗</a>`
    : '';

  return `
    <article class="card">
      <div class="card-image" style="cursor:pointer"><img src="${conVersione(e.image)}" alt="${escapeHTML(e.title)}" loading="lazy"></div>
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

/**
 * ⚠️ 22/08/2026 — bug preesistente scoperto lavorando su questa pagina, non
 * introdotto qui: progetti.html ed eventi.html usavano GLI STESSI id
 * (`grid-futuro`, `grid-passato`, `section-futuro`, `section-passato`).
 * Siccome `loadProjects()` e `loadEvents()` girano entrambe su ogni
 * pagina (si fermano solo se non trovano il loro elemento "ancora"), su
 * progetti.html anche `loadEvents()` trovava questi id e in certi ordini
 * di caricamento sovrascriveva "Progetti Futuri/Passati" con le schede
 * degli eventi — una corsa fra due `fetch`, silenziosa, mai segnalata da
 * un errore. Qui gli id degli eventi sono stati resi unici
 * (`grid-eventi-…`, `section-eventi-…`) per togliere la collisione alla
 * radice: senza, non potevo garantire che lo scorrimento nell'ingranditore
 * restasse dentro le schede giuste.
 */
async function loadEvents() {
  const gridFuturo = document.getElementById('grid-eventi-futuro');
  if (!gridFuturo) return;

  try {
    const res = await fetch('data/events.json');
    const allEvents = await res.json();

    if (allEvents.length === 0) {
      document.querySelector('.project-section#section-eventi-futuro').innerHTML =
        '<div class="section"><p style="color:#999;text-align:center;">Nessun evento in programma. Torna a trovarci!</p></div>';
      const passatoSection = document.getElementById('section-eventi-passato');
      if (passatoSection) passatoSection.style.display = 'none';
      return;
    }

    const searchInput = document.getElementById('search-input');
    const dateFrom = document.getElementById('date-from');
    const dateTo = document.getElementById('date-to');
    const lightbox = setupCardLightbox();

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
        const grid = document.getElementById('grid-eventi-' + status);
        const section = document.getElementById('section-eventi-' + status);

        if (items.length === 0) {
          section.style.display = 'none';
          grid.innerHTML = '';
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

      // Lo scorrimento nell'ingranditore resta dentro le sole schede
      // mostrate qui — cioè quelle già passate dal filtro sopra.
      if (lightbox) {
        lightbox.setItems(allVisible.map(e => ({
          image: e.image,
          alt: e.title,
          title: e.title,
          meta: [eventDateDisplay(e), e.location ? '📍 ' + e.location : ''].filter(Boolean).join(' — '),
          description: e.description
        })));
        document.querySelectorAll('[data-lb-index] .card-image').forEach(el => {
          const idx = parseInt(el.closest('[data-lb-index]').dataset.lbIndex, 10);
          const img = el.querySelector('img');
          makeLightboxTrigger(el, 'Ingrandisci: ' + (img ? img.alt : ''), () => lightbox.open(idx, el));
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

/* ------------------------------------------------------------
   Direttivo (team) — "Chi siamo" / Mission page
   ------------------------------------------------------------ */

// Colori già in uso nel sito (vedi :root in css/style.css): niente palette nuova.
const TEAM_PALETTE = ['#E8630A', '#007bff', '#28a745', '#6c757d', '#F4A460'];

// Segnaposto disegnato: cerchio colorato + motivo a "rosa dei venti" (8 direzioni) + iniziali.
// Si usa SOLO finché in direttivo.json il campo "foto" è vuoto o il file indicato non si trova.
function compassRosePlaceholder(nome, colorHex) {
  const initials = (nome || '').split(/\s+/).filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
    <circle cx="60" cy="60" r="60" fill="${colorHex}"/>
    <g stroke="#ffffff" stroke-opacity="0.4" stroke-width="2" stroke-linecap="round">
      <line x1="60" y1="8" x2="60" y2="112"/>
      <line x1="8" y1="60" x2="112" y2="60"/>
      <line x1="24" y1="24" x2="96" y2="96"/>
      <line x1="96" y1="24" x2="24" y2="96"/>
    </g>
    <circle cx="60" cy="60" r="27" fill="#ffffff" fill-opacity="0.18"/>
    <text x="60" y="71" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="700" fill="#ffffff" text-anchor="middle">${initials}</text>
  </svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

async function loadDirettivo() {
  const grid = document.getElementById('team-grid');
  if (!grid) return;

  try {
    const res = await fetch('data/direttivo.json');
    const members = await res.json();

    if (!members || members.length === 0) {
      grid.innerHTML = '<p style="color:#999;">Elenco del direttivo in aggiornamento.</p>';
      return;
    }

    grid.innerHTML = members.map((m, i) => {
      const color = TEAM_PALETTE[i % TEAM_PALETTE.length];
      const initialSrc = m.foto ? m.foto : compassRosePlaceholder(m.nome, color);
      const cellulareHtml = m.cellulare
        ? `<p class="team-contact">📱 <a href="tel:${escapeHTML(m.cellulare.replace(/\s+/g, ''))}">${escapeHTML(m.cellulare)}</a></p>`
        : '';
      const emailHtml = m.email
        ? `<p class="team-contact">✉️ <a href="mailto:${escapeHTML(m.email)}">${escapeHTML(m.email)}</a></p>`
        : '';

      return `
        <div class="team-card">
          <img src="${initialSrc}" alt="${escapeHTML(m.nome)}" loading="lazy">
          <h3>${escapeHTML(m.nome)}</h3>
          <p class="team-role">${escapeHTML(m.ruolo || '')}</p>
          ${cellulareHtml}
          ${emailHtml}
        </div>
      `;
    }).join('');

    // Se il file indicato in "foto" non si trova (404, percorso sbagliato...),
    // si passa comunque al segnaposto invece di lasciare l'icona di immagine rotta.
    grid.querySelectorAll('.team-card img').forEach((img, i) => {
      if (!members[i].foto) return; // qui si mostra già il segnaposto
      const color = TEAM_PALETTE[i % TEAM_PALETTE.length];
      img.addEventListener('error', () => {
        img.src = compassRosePlaceholder(members[i].nome, color);
      }, { once: true });
    });
  } catch (e) {
    console.warn('Could not load direttivo:', e);
    const section = document.getElementById('direttivo');
    if (section) section.style.display = 'none';
  }
}

/* ------------------------------------------------------------
   Documenti dell'associazione
   ------------------------------------------------------------ */

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined || isNaN(bytes)) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function loadDocumenti() {
  const list = document.getElementById('documenti-list');
  if (!list) return;

  try {
    const res = await fetch('data/documenti.json');
    const docs = await res.json();

    if (!docs || docs.length === 0) {
      list.innerHTML = '<p style="color:#999;">Nessun documento disponibile al momento.</p>';
      return;
    }

    list.innerHTML = docs.map((d, i) => `
      <div class="document-item" id="doc-${i}">
        <div class="document-icon" aria-hidden="true">📄</div>
        <div class="document-body">
          <h3>${escapeHTML(d.titolo)}</h3>
          <p>${escapeHTML(d.descrizione || '')}</p>
          <div class="document-meta">
            ${d.anno ? `<span class="document-year">${escapeHTML(String(d.anno))}</span>` : ''}
            <span class="document-size" id="doc-size-${i}">Verifica del file in corso…</span>
          </div>
        </div>
        <a class="btn-solid document-download" id="doc-link-${i}" href="${d.file}" download>Scarica</a>
      </div>
    `).join('');

    // Ogni voce verifica DA SOLA se il file esiste davvero (richiesta HEAD) e ne legge il peso:
    // niente peso da scrivere a mano nel json, e nessun collegamento rotto se il file manca ancora.
    docs.forEach((d, i) => {
      const sizeEl = document.getElementById(`doc-size-${i}`);
      const linkEl = document.getElementById(`doc-link-${i}`);
      const itemEl = document.getElementById(`doc-${i}`);

      fetch(d.file, { method: 'HEAD' })
        .then(r => {
          if (!r.ok) throw new Error('File non trovato');
          const len = r.headers.get('Content-Length');
          if (len) {
            sizeEl.textContent = formatBytes(parseInt(len, 10));
          } else {
            sizeEl.style.display = 'none';
          }
        })
        .catch(() => {
          itemEl.classList.add('document-missing');
          sizeEl.textContent = 'File non ancora disponibile';
          sizeEl.classList.add('document-missing-badge');
          linkEl.removeAttribute('href');
          linkEl.removeAttribute('download');
          linkEl.classList.add('disabled');
          linkEl.setAttribute('aria-disabled', 'true');
          linkEl.textContent = 'Non disponibile';
        });
    });
  } catch (e) {
    console.warn('Could not load documenti:', e);
    list.innerHTML = '<p style="color:#999;">Impossibile caricare l\'elenco dei documenti.</p>';
  }
}

/**
 * Fa salire i numeri da zero al loro valore, la prima volta che entrano
 * nello schermo.
 *
 * ⚠️ **Partono quando si vedono, non al caricamento della pagina.** I numeri
 * stanno a metà pagina: farli correre subito significherebbe che chi scorre
 * fin lì trova l'animazione già finita, cioè nessuna animazione — e in
 * cambio si sarebbe pagato il lavoro del browser.
 *
 * ⚠️ **Si osserva una volta sola** (`unobserve` appena parte): un numero che
 * riparte da zero ogni volta che si scorre su e giù diventa un tic nervoso,
 * non un'animazione.
 *
 * ⛔ **Chi ha chiesto meno animazioni al proprio telefono vede subito il
 * numero finito.** Non è un dettaglio di cortesia: per certe persone il
 * movimento sullo schermo è un sintomo, non un effetto.
 */
function animaNumeri(contenitore) {
  const numeri = contenitore.querySelectorAll('.stat-number[data-valore]');
  const fermo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (fermo || typeof IntersectionObserver === 'undefined') {
    numeri.forEach(n => { n.textContent = Number(n.dataset.valore).toLocaleString('it-IT'); });
    return;
  }

  const DURATA = 1400;
  const osservatore = new IntersectionObserver((voci, oss) => {
    voci.forEach(voce => {
      if (!voce.isIntersecting) return;
      oss.unobserve(voce.target);
      const arrivo = Number(voce.target.dataset.valore) || 0;
      const partenza = performance.now();
      const passo = (ora) => {
        const avanzamento = Math.min((ora - partenza) / DURATA, 1);
        // Frenata dolce: veloce all'inizio, lenta alla fine. Un conteggio
        // lineare sembra un contatore rotto.
        const morbido = 1 - Math.pow(1 - avanzamento, 3);
        voce.target.textContent = Math.round(arrivo * morbido).toLocaleString('it-IT');
        if (avanzamento < 1) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    });
  }, { threshold: 0.35 });

  numeri.forEach(n => osservatore.observe(n));
}

/**
 * «locandina» quando l'immagine è un manifesto, stringa vuota quando è una
 * fotografia.
 *
 * ⚠️ Il riconoscimento è il prefisso `loc-` nel nome del file, la stessa
 * convenzione con cui locandine e fotografie sono state separate quando
 * sono state archiviate. ⛔ Non è una supposizione sul contenuto: è un
 * nome che diamo noi, e quindi si può fare affidamento.
 */
// ⛔ Il server di Ergonet serve le immagini da sé, ignorando `.htaccess`:
//    arrivano con `Cache-Control: max-age=10368000` (120 giorni) e non c'è
//    direttiva che possa cambiarlo da qui. Il 23/08/2026 sei loghi dei
//    partner sono stati sostituiti tenendo lo stesso nome di file, e chi
//    aveva aperto la pagina il giorno prima ha continuato a vedere quelli
//    vecchi per mesi: il file nuovo era online, ma il browser non lo
//    chiedeva più. L'unica leva che resta è l'indirizzo: `?v=...` è una
//    richiesta diversa, quindi una cache diversa.
//    Lo stesso vale per i fogli di stile e per gli script: anche loro escono
//    con 120 giorni. Per questo l'unico punto in cui la versione si scrive è
//    l'indirizzo nelle pagine `.html` — quelle SI' rispettano il `no-store`
//    di `.htaccess`, quindi arrivano sempre fresche e portano dentro la
//    versione nuova. Questo file la rilegge dal proprio tag <script>, così
//    non ci sono due valori da tenere allineati a mano.
//    ⚠️ SI CAMBIA quando si sostituisce un file tenendo lo stesso nome
//    (immagine, css o js). Un nome nuovo non ha il problema. Per cambiarla:
//    `python scripts/versiona-asset.py`
const VERSIONE_IMMAGINI = (function () {
  var tag = document.currentScript || document.querySelector('script[src*="js/main.js"]')
  var trovata = tag && /[?&]v=([^&]+)/.exec(tag.getAttribute('src') || '')
  return trovata ? trovata[1] : ''
})()

// Aggiunge la versione a un indirizzo di immagine che viene dai file di dati.
// Lascia stare i segnaposto generati in pagina (`data:`) e gli indirizzi
// assoluti verso altri siti, dove la cache non è cosa nostra.
function conVersione(percorso) {
  if (typeof percorso !== 'string' || !percorso) return percorso
  if (!VERSIONE_IMMAGINI) return percorso
  if (percorso.startsWith('data:') || /^https?:/i.test(percorso)) return percorso
  return percorso + (percorso.includes('?') ? '&' : '?') + 'v=' + VERSIONE_IMMAGINI
}

function classeImmagine(percorso) {
  return typeof percorso === 'string' && percorso.includes('/loc-') ? 'locandina' : ''
}
