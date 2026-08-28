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
  // Tabella "Con il sostegno di" in fondo a partner.html
  loadPartnerSponsorship();
  // Load events on events page and homepage
  loadEvents();
  loadUpcomingEvents();
  // Load direttivo on mission page
  loadDirettivo();
  // Load documenti on documenti page
  loadDocumenti();
  // I numeri dentro le frasi (home, sostienici): scritti dal codice, mai a mano.
  numeriDaiDati();
});

/**
 * Il punto ogni tre cifre: 1372 → «1.372».
 *
 * ⛔ **Non si usa `toLocaleString('it-IT')`, e non è una questione di gusto.**
 * Misurato il 24/08/2026 su un Chrome vero: `(1372).toLocaleString('it-IT')`
 * restituisce **«1372»**, senza separatore — quella build ha i dati di
 * localizzazione ridotti, e `Intl` non ha di che raggruppare. Non solleva
 * niente, non avvisa: restituisce semplicemente un numero scritto male, e la
 * fascia delle statistiche lo mostrava così da sempre a chiunque avesse un
 * browser fatto in quel modo.
 *
 * Quattro righe di codice non dipendono da nessuna libreria di sistema e danno
 * la stessa risposta ovunque. Per un separatore delle migliaia, `Intl` è una
 * dipendenza che può mancare in silenzio.
 */
function formattaNumero(n) {
  const intero = Math.round(Number(n) || 0);
  const segno = intero < 0 ? '-' : '';
  return segno + String(Math.abs(intero)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * I numeri scritti dentro le frasi delle pagine — non le fasce di statistiche,
 * ma il testo corrente: «63 progetti, 1.412 partecipanti, 1.163 ore».
 *
 * ⛔ **Erano scritti a mano nell'HTML, ed erano diventati falsi.** Venivano dai
 * totali di un foglio Excel di mesi prima; nel frattempo sei righe erano state
 * spostate fra gli eventi e le edizioni raggruppate per progetto. Il 24/08/2026
 * l'home diceva «63 progetti» quando erano 28, e «1.412 partecipanti» quando
 * erano 1.372. Nessun errore, nessun segno: solo tre numeri sbagliati nella
 * prima frase che legge chi arriva — e la prima frase è quella su cui si decide
 * se un'associazione è seria.
 *
 * La difesa non è ricordarsi di aggiornarli: è non scriverli. Qui si marca il
 * punto con `data-numero` e il valore lo mette il codice, dagli stessi file da
 * cui vengono le fasce di statistiche.
 *
 * ⚠️ Se i dati non si caricano, il segnaposto «…» resta com'è: una frase con i
 * puntini si vede ed è vera («non lo so»), un `0` sarebbe una bugia scritta
 * bene.
 */
async function numeriDaiDati() {
  const punti = document.querySelectorAll('[data-numero]');
  if (!punti.length) return;

  try {
    // ⭐ 28/08/2026 — dal gestionale (con la copia come ripiego): vedi
    // js/dati-pubblici.js, dove questi due punti sono diventati uno.
    const [progetti, partner] = await Promise.all([
      caricaProgetti(),
      caricaPartner()
    ]);

    const somma = (campo) => progetti.reduce((s, p) => s + (p[campo] || 0), 0);
    const quanti = new Set(progetti.map(p => p.title)).size;
    const conta = (n, uno, molti) => formattaNumero(n) + ' ' + (n === 1 ? uno : molti);

    const valori = {
      progetti: conta(quanti, 'progetto', 'progetti'),
      edizioni: conta(progetti.length, 'edizione', 'edizioni'),
      partecipanti: conta(somma('partecipanti'), 'partecipante', 'partecipanti'),
      // La stessa cifra senza la parola: serve dove la frase la porta già
      // («sono stati 1.372, in 28 progetti»).
      'partecipanti-solo': formattaNumero(somma('partecipanti')),
      ore: conta(Math.round(somma('ore')), 'ora', 'ore'),
      incontri: conta(somma('incontri'), 'incontro', 'incontri'),
      partner: conta(partner.length, 'realtà', 'realtà')
    };

    punti.forEach(el => {
      const chiave = el.dataset.numero;
      if (valori[chiave] !== undefined) el.textContent = valori[chiave];
    });
  } catch (e) {
    console.warn('Numeri nei testi non caricati:', e);
  }
}

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
  // ⛔ **Il numero nasce GIUSTO, non a zero** (28/08/2026). Prima queste caselle
  //    nascevano con «0» e `animaNumeri` le portava al valore vero contando su
  //    `requestAnimationFrame`. Ma rAF **non gira in una scheda in secondo
  //    piano**: misurato dal vivo su `partner.html`, con la scheda nascosta la
  //    fascia diceva «0 Partner totali» accanto a 32 schede visibili, e ci
  //    restava. Succede a chiunque apra il sito in una scheda che non guarda
  //    subito — un caso normalissimo, non un caso limite.
  //
  //    ⚠️ È lo stesso principio già scritto per `data-numero` e per il saldo di
  //    cassa del gestionale: **uno zero è una bugia scritta bene**, peggio di un
  //    dato assente, perché si legge con fiducia. L'animazione è un ornamento e
  //    resta un ornamento: se non parte, il numero è comunque quello vero.
  grid.innerHTML = stats.map(s => `
    <div class="stat-card">
      <span class="stat-icona" aria-hidden="true">${s.icona}</span>
      <span class="stat-number" data-valore="${s.number}">${formattaNumero(s.number)}</span>
      <span class="stat-label">${escapeHTML(s.label)}</span>
    </div>
  `).join('');

  animaNumeri(grid);
}

async function loadStats() {
  const grid = document.getElementById('stats-grid');
  if (!grid) return;
  try {
    // ⚠️ Anche i partner, dallo stesso elenco della pagina Partner. Prima si
    //    contavano i nomi che comparivano nei campi `sponsor`/`collaboratori`
    //    dei progetti: 31, mentre la pagina Partner ne mostrava 33 e
    //    «Sostienici» diceva 33. Tre numeri per la stessa cosa, tutti veri
    //    ciascuno a modo suo, e chi li leggeva di fila non poteva che
    //    concludere che uno dei tre fosse sbagliato.
    const [projects, partner] = await Promise.all([
      caricaProgetti(),
      caricaPartner()
    ]);
    // ⛔ **`projects.length` sono le EDIZIONI, non i progetti.** Le 57 righe
    //    del file sono 28 progetti, ciascuno con le sue edizioni annuali:
    //    fino al 24/08/2026 la home diceva «57 progetti realizzati», cioè
    //    contava cinque volte «Giochiamo con l'inglese». Il numero era il
    //    doppio del vero in prima pagina, e nessuno poteva accorgersene
    //    guardandolo — sembrava semplicemente un bel numero.
    const totProgetti = new Set(projects.map(p => p.title)).size;
    const totEdizioni = projects.length;
    const totIncontri = projects.reduce((s, p) => s + (p.incontri || 0), 0);
    const totOre = projects.reduce((s, p) => s + (p.ore || 0), 0);
    const totPartecipanti = projects.reduce((s, p) => s + (p.partecipanti || 0), 0);
    const totEducatori = projects.reduce((s, p) => s + (p.educatori || 0), 0);
    const totVolontari = projects.reduce((s, p) => s + (p.volontari || 0), 0);
    const years = new Set(projects.map(p => new Date(p.startDate).getFullYear()));
    const totYears = years.size;

    const stats = [
      { number: totProgetti, label: 'Progetti', icona: '📋' },
      // Le edizioni sono la cosa che racconta la continuità — «lo facciamo da
      // cinque anni» — e vanno dette, ma accanto ai progetti, non al posto
      // loro: sono due numeri diversi e uno solo dei due è «quanti progetti».
      { number: totEdizioni, label: 'Edizioni realizzate', icona: '🔁' },
      { number: totIncontri, label: 'Incontri organizzati', icona: '🗓️' },
      { number: Math.round(totOre), label: 'Ore di attività', icona: '⏱️' },
      { number: totPartecipanti, label: 'Partecipanti coinvolti', icona: '🧑‍🤝‍🧑' },
      { number: totVolontari, label: 'Volontari impiegati', icona: '🤝' },
      { number: totEducatori, label: 'Educatori coinvolti', icona: '🎓' },
      { number: totYears, label: 'Anni di attività', icona: '📅' },
      { number: partner.length, label: 'Partner del territorio', icona: '🏛️' }
    ];

    renderStatCards(grid, stats);
  } catch (e) {
    console.warn('Could not load stats:', e);
    const section = document.getElementById('stats-section');
    if (section) section.style.display = 'none';
  }
}

/**
 * Fascia numeri in cima a progetti.html.
 *
 * ⚠️ `data/projects.json` è per EDIZIONE (57 righe = 28 progetti in 57
 * anni scolastici diversi): "progetti" ed "edizioni" sono due conteggi
 * diversi, e il committente ha chiesto di vederli come due voci separate,
 * non confuse in una sola. Il resto (incontri/ore/partecipanti/…) sono
 * somme sulle edizioni, che restano un solo numero perché non hanno questa
 * ambiguità.
 */
async function loadProjectStats() {
  const grid = document.getElementById('progetti-stats-grid');
  if (!grid) return;
  try {
    const edizioni = await caricaProgetti();
    const totProgetti = new Set(edizioni.map(e => e.title)).size;
    const totEdizioni = edizioni.length;
    const totIncontri = edizioni.reduce((s, p) => s + (p.incontri || 0), 0);
    const totOre = edizioni.reduce((s, p) => s + (p.ore || 0), 0);
    const totPartecipanti = edizioni.reduce((s, p) => s + (p.partecipanti || 0), 0);
    const totEducatori = edizioni.reduce((s, p) => s + (p.educatori || 0), 0);
    const totVolontari = edizioni.reduce((s, p) => s + (p.volontari || 0), 0);

    const stats = [
      { number: totProgetti, label: 'Progetti', icona: '📋' },
      { number: totEdizioni, label: 'Edizioni realizzate', icona: '🔁' },
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
 * ⚠️ 25/08/2026 — `data/events.json` è per EDIZIONE come `projects.json`:
 * 7 righe sono 5 eventi ("Prim'Olio" compare tre volte). Stessa medicina
 * della fascia progetti: "Eventi" ed "Edizioni realizzate" sono due
 * conteggi diversi. Tenerne uno solo ("Eventi realizzati: 7") avrebbe
 * detto un numero diverso da quante schede si vedono sotto una volta
 * raggruppate — lo stesso guasto che i pulsanti di stato non devono fare.
 *
 * ⛔ Niente "eventi di quest'anno": nei dati reali sono tutti passati e
 * nessuno cade nell'anno corrente, quindi sarebbe uno zero vero ma
 * fuorviante in cima a una fascia che vuole raccontare il percorso.
 */
async function loadEventStats() {
  const grid = document.getElementById('eventi-stats-grid');
  if (!grid) return;
  try {
    const edizioni = await caricaEventi();
    const totEventi = new Set(edizioni.map(e => e.title)).size;
    const totEdizioni = edizioni.length;
    const anni = new Set(edizioni.map(e => new Date(e.startDate).getFullYear()));
    const luoghi = new Set(edizioni.map(e => e.location).filter(Boolean));

    const stats = [
      { number: totEventi, label: 'Eventi', icona: '🎉' },
      { number: totEdizioni, label: 'Edizioni realizzate', icona: '🔁' },
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
    const partners = await caricaPartner();
    const perTipo = {};
    // ⚠️ **Un partner può non avere categoria** (`tipo: null` dal gestionale:
    // `pubblicatoSulSito` si accende prima che qualcuno scelga la categoria).
    // Non lo si nasconde: resta nel totale e nell'elenco senza filtro — il
    // filtro lo prevede già (`p.type !== type` solo se un filtro è scelto) e
    // l'etichetta ripiega su stringa vuota. ⇒ Il totale può quindi essere
    // maggiore della somma delle cinque categorie, ed è la lettura giusta:
    // dice che qualcuno è online senza categoria, invece di farlo sparire.
    let senzaCategoria = 0;
    partners.forEach(p => {
      if (!p.type) { senzaCategoria++; return; }
      perTipo[p.type] = (perTipo[p.type] || 0) + 1;
    });
    if (senzaCategoria) {
      console.info('[partner] ' + senzaCategoria + ' senza categoria: compaiono nel totale e senza filtro, non nelle cinque schede.');
    }

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
    const projects = await caricaProgetti();
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

/**
 * Raggruppa EDIZIONI (di `data/projects.json` O di `data/events.json` — è
 * la stessa idea: righe ripetute per anno sotto lo stesso `title`) per
 * titolo: 57 righe di progetti diventano 28 progetti, 7 righe di eventi
 * diventano 5 eventi (decisione del committente, 24-25/08/2026 — «una
 * scheda per progetto/evento, non una per edizione»).
 *
 * ⛔ Condivisa da progetti.html ed eventi.html (vedi `avviaListaAStati` più
 * sotto): raggruppare-per-titolo è UNA regola sola, non due copie che
 * possono divergere alla prima modifica.
 *
 * Ogni gruppo porta solo quello che progetti ED eventi hanno in comune —
 * l'elenco delle edizioni, quante sono, la fascia di anni, l'edizione più
 * recente e lo stato calcolato dalle date. I campi che non condividono
 * (numeri sommati e sponsor per i progetti; luogo e link per gli eventi)
 * li aggiunge chi chiama, dopo.
 */
function raggruppaPerTitolo(edizioni) {
  const perTitolo = new Map();
  edizioni.forEach(e => {
    if (!perTitolo.has(e.title)) perTitolo.set(e.title, []);
    perTitolo.get(e.title).push(e);
  });

  return Array.from(perTitolo.values()).map(eds => {
    // L'edizione più recente rappresenta il gruppo in copertina e nel testo
    // (immagine + descrizione, e per gli eventi anche luogo/link): è la
    // versione più aggiornata di come lo raccontiamo, non necessariamente
    // la prima mai fatta.
    const piuRecente = eds.slice().sort((a, b) => new Date(b.startDate) - new Date(a.startDate))[0];

    return {
      title: piuRecente.title,
      edizioni: eds,
      numEdizioni: eds.length,
      fasciaAnni: fasciaAnniGruppo(eds),
      piuRecente,
      stato: statoGruppo(eds)
    };
  });
}

function sommaCampoEdizioni(edizioni, campo) {
  return edizioni.reduce((s, e) => s + (e[campo] || 0), 0);
}

// "2019" se il gruppo è nato e finito nello stesso anno solare,
// "2019–2023" se ha attraversato più anni — su tutte le sue edizioni, non
// solo sulla prima o sull'ultima.
function fasciaAnniGruppo(edizioni) {
  const anni = edizioni.flatMap(e => [new Date(e.startDate).getFullYear(), new Date(e.endDate || e.startDate).getFullYear()]);
  const min = Math.min(...anni);
  const max = Math.max(...anni);
  return min === max ? String(min) : `${min}–${max}`;
}

/**
 * Stato di UNA edizione, calcolato dalle date — ⛔ MAI dal campo `status`
 * del file: è scritto a mano e resta fermo (dice "in corso" per edizioni
 * finite a giugno; oggi, 24/08/2026, calcolando dalle date gli "in corso"
 * veri sono zero).
 *
 * ⚠️ Il confronto con `fine` usa la fine della giornata (23:59:59), non la
 * mezzanotte: un'edizione che finisce "oggi" deve restare "in corso" nelle
 * ore in cui accade davvero, non risultare già passata dallo scoccare della
 * mezzanotte UTC del suo `endDate`.
 */
function statoEdizione(e, oggi) {
  const inizio = new Date(e.startDate);
  const fine = new Date(e.endDate || e.startDate);
  fine.setHours(23, 59, 59, 999);
  if (oggi < inizio) return 'futuro';
  if (oggi > fine) return 'passato';
  return 'in_corso';
}

/**
 * Stato del GRUPPO (progetto o evento raggruppato), dalle sue edizioni.
 *
 * ⚠️ L'ordine dei tre controlli è quello dell'urgenza dell'informazione, non
 * un ordine qualsiasi: se anche una sola edizione è in corso ORA, è la cosa
 * più importante da dire e vince su tutto il resto — si controlla per
 * prima. Se nessuna è in corso ma almeno una deve ancora cominciare, il
 * gruppo è "futuro": c'è ancora qualcosa da aspettare, e questa
 * informazione conta più del fatto che altre edizioni siano già finite.
 * Solo se non resta nessuna delle due condizioni il gruppo è "passato" —
 * la più debole delle tre, quindi l'unica messa per ultima.
 */
function statoGruppo(edizioni) {
  const oggi = new Date();
  const stati = edizioni.map(e => statoEdizione(e, oggi));
  if (stati.includes('in_corso')) return 'in_corso';
  if (stati.includes('futuro')) return 'futuro';
  return 'passato';
}

/**
 * «Il filtro per data mostra i progetti che hanno UNA EDIZIONE in quel
 * periodo» — parole del committente, valide allo stesso modo per gli
 * eventi. Si guarda edizione per edizione: il gruppo passa se ALMENO UNA
 * delle sue edizioni tocca l'intervallo scelto, anche se le altre sono
 * fuori (es. "dal 2025-01-01" tiene un laboratorio che va da settembre a
 * giugno, perché l'edizione lo tocca).
 *
 * ⚠️ Una volta che il gruppo passa il filtro, la scheda mostra comunque
 * TUTTE le sue edizioni — numeri sommati compresi: il filtro decide CHI
 * entra in elenco, non quali edizioni contare nella scheda.
 */
function gruppoNelPeriodo(gruppo, from, to) {
  if (!from && !to) return true;
  return gruppo.edizioni.some(e => {
    const inizio = new Date(e.startDate);
    const fine = new Date(e.endDate || e.startDate);
    if (from && fine < from) return false;
    if (to && inizio > to) return false;
    return true;
  });
}

// "45" se è un numero intero di ore, "45,5" con la virgola italiana se no.
function formattaOre(ore) {
  return Number.isInteger(ore) ? String(ore) : ore.toFixed(1).replace('.', ',');
}

/**
 * Badge "N edizioni" sulla scheda raggruppata — progetti ED eventi.
 *
 * ⚠️ "1 edizione" scritta sulla scheda sembrerebbe un errore (un dato che
 * non dice niente): si mostra SOLO quando il gruppo è tornato più volte,
 * che è l'informazione vera da dare.
 */
function renderBadgeEdizioni(numEdizioni) {
  return numEdizioni > 1 ? `<span class="edizioni-badge">${numEdizioni} edizioni</span>` : '';
}

/**
 * Riga di numeri sulla scheda progetto (incontri/ore/partecipanti/
 * educatori/volontari). ⚠️ Gli eventi NON hanno questi campi — niente
 * gettone vuoto: questa funzione la chiama solo renderProjectCard.
 *
 * ⚠️ Non tutti i progetti hanno tutti questi campi: un totale a zero non
 * vuol dire "zero volontari", vuol dire "questo progetto i volontari non
 * li conta" — si scrive solo quello che il progetto ha DAVVERO, altrimenti
 * ogni scheda si riempie di righe che dicono "0" senza dire niente.
 */
function renderNumeriProgetto(numeri) {
  // ⚠️ Il singolare non è un vezzo: sulle schede vere capita spesso
  //    («1 volontario», «1 incontro»), e «1 volontari» è il genere di
  //    sciatteria che chi legge nota subito e attribuisce a tutto il sito.
  //    ⛔ Le ore fanno eccezione e restano fuori da questa regola: possono
  //    valere 1,5 — «1,5 ora» sarebbe sbagliato quanto «1 ore».
  const conta = (n, uno, molti) => `${n} ${n === 1 ? uno : molti}`;
  const voci = [
    numeri.incontri > 0 ? `🗓️ ${conta(numeri.incontri, 'incontro', 'incontri')}` : '',
    numeri.ore > 0 ? `⏱️ ${formattaOre(numeri.ore)} ore` : '',
    numeri.partecipanti > 0 ? `🧑‍🤝‍🧑 ${conta(numeri.partecipanti, 'partecipante', 'partecipanti')}` : '',
    numeri.educatori > 0 ? `🎓 ${conta(numeri.educatori, 'educatore', 'educatori')}` : '',
    numeri.volontari > 0 ? `🤝 ${conta(numeri.volontari, 'volontario', 'volontari')}` : ''
  ].filter(Boolean);
  if (!voci.length) return '';
  return `<div class="progetto-numeri">${voci.map(v => `<span>${escapeHTML(v)}</span>`).join('')}</div>`;
}

function renderProjectCard(progetto, index) {
  const sponsorHtml = progetto.sponsor.length
    ? `<p class="progetto-sponsor">🤝 Sostenuto da ${escapeHTML(progetto.sponsor.join(', '))}</p>`
    : '';

  return `
    <article class="card" data-lb-index="${index}">
      <div class="card-image" style="cursor:pointer"><img src="${conVersione(progetto.immagine)}" alt="${escapeHTML(progetto.title)}" loading="lazy" class="${classeImmagine(progetto.immagine)}"></div>
      <div class="card-body">
        <h3>${escapeHTML(progetto.title)}</h3>
        <div class="progetto-card-meta">
          <span>${escapeHTML(progetto.fasciaAnni)}</span>
          ${renderBadgeEdizioni(progetto.numEdizioni)}
        </div>
        <p>${escapeHTML(progetto.descrizione)}</p>
        ${renderNumeriProgetto(progetto.numeri)}
        ${sponsorHtml}
      </div>
    </article>
  `;
}

/**
 * Scheda di un EVENTO raggruppato (eventi.html) — gemella di
 * `renderProjectCard`, ma con i campi che gli eventi hanno davvero: luogo
 * e collegamento, non incontri/ore/partecipanti (gli eventi non li hanno,
 * niente gettone vuoto al loro posto). Diversa da `renderEventCard()` più
 * sotto, che resta quella per UNA singola edizione (usata dalla home per
 * "Prossimi eventi").
 */
function renderEventGroupCard(evento, index) {
  const rappresentativa = evento.piuRecente;
  const locationHtml = rappresentativa.location
    ? `<p class="evento-luogo">📍 ${escapeHTML(rappresentativa.location)}</p>`
    : '';
  const linkHtml = rappresentativa.link
    ? `<a href="${rappresentativa.link}" class="partner-link" target="_blank" rel="noopener noreferrer">Maggiori info ↗</a>`
    : '';

  return `
    <article class="card" data-lb-index="${index}">
      <div class="card-image" style="cursor:pointer"><img src="${conVersione(rappresentativa.image)}" alt="${escapeHTML(evento.title)}" loading="lazy" class="${classeImmagine(rappresentativa.image)}"></div>
      <div class="card-body">
        <h3>${escapeHTML(evento.title)}</h3>
        <div class="progetto-card-meta">
          <span>${escapeHTML(evento.fasciaAnni)}</span>
          ${renderBadgeEdizioni(evento.numEdizioni)}
        </div>
        <p>${escapeHTML(rappresentativa.description)}</p>
        ${locationHtml}
        ${linkHtml}
      </div>
    </article>
  `;
}

const CLASSE_STATO = { in_corso: 'in-corso', futuro: 'futuro', passato: 'passato' };

/**
 * Frase per l'elenco vuoto (progetti O eventi) — mai "0 risultati" e basta:
 * spiega perché, e se esistono altri stati con qualcosa dentro offre un
 * modo per arrivarci con un clic. Altrimenti chi legge può pensare che
 * l'associazione sia ferma o che il sito sia rotto.
 *
 * `frasi` ed `etichette` sono {in_corso, futuro, passato} già declinati da
 * chi chiama ("progetto"/"progetti" oppure "evento"/"eventi").
 */
function messaggioElencoVuoto(stato, conteggi, frasi, etichette) {
  const altri = ['passato', 'futuro', 'in_corso'].filter(s => s !== stato && conteggi[s] > 0);
  let msg = frasi[stato] || 'Nessun risultato.';
  if (altri.length) {
    const link = altri
      .map(s => `<button type="button" class="link-vuoto" data-vai-stato="${s}">${etichette[s]} (${conteggi[s]})</button>`)
      .join(' o ');
    msg += ` Intanto guarda i ${link}.`;
  }
  return msg;
}

/**
 * Motore comune ai tre pulsanti di stato (in corso/futuri/passati) di
 * progetti.html ed eventi.html: raggruppa le edizioni per titolo, filtra
 * per ricerca testuale e per data, smista nei tre stati, aggiorna i
 * conteggi sui pulsanti e disegna la scheda giusta per ogni gruppo
 * visibile.
 *
 * ⛔ Le REGOLE (raggruppamento, stato dalle date, filtro per data, frase
 * per l'elenco vuoto) sono UNA sola implementazione qui dentro, non due
 * copie — una per pagina — che divergerebbero alla prima modifica. È
 * esattamente il guasto che questo file ha già pagato una volta: vedi il
 * commento sugli id duplicati fra progetti.html ed eventi.html più sotto.
 *
 * `config`:
 *  - carica: `caricaProgetti` o `caricaEventi` (js/dati-pubblici.js) — la
 *    funzione che dà l'elenco delle edizioni, dal gestionale con la copia
 *    locale come ripiego. Non più un indirizzo di file: da qui la funzione
 *    condivisa non sa nemmeno se sta leggendo il gestionale o la copia.
 *  - nome: 'progetti' | 'eventi', solo per il messaggio in console se qualcosa va storto
 *  - idGrid/idToggle/idTitolo/idVuoto: gli id degli elementi in pagina
 *    (search/data-da/data-a restano 'search-input'/'date-from'/'date-to',
 *    gli stessi ovunque nel sito)
 *  - statoIniziale: FORZA il pulsante premuto all'apertura. Se non lo si
 *    indica — ed è il caso normale — la lista si apre da sola sul primo
 *    stato che ha qualcosa dentro: in corso, poi futuri, poi passati.
 *  - frasi/etichette/titoli: testo dichiarato da chi chiama, già declinato
 *  - arricchisciGruppi(gruppi): opzionale, aggiunge ai gruppi i campi che
 *    progetti/eventi NON hanno in comune (numeri+sponsor per i progetti)
 *  - renderScheda(gruppo, indice): l'HTML della scheda
 *  - vociLightbox(gruppo): { image, alt, title, meta, description }
 */
async function avviaListaAStati(config) {
  const grid = document.getElementById(config.idGrid);
  if (!grid) return;

  try {
    const edizioni = await config.carica();
    const arricchisci = config.arricchisciGruppi || (g => g);
    const gruppi = arricchisci(raggruppaPerTitolo(edizioni));

    const searchInput = document.getElementById('search-input');
    const dateFrom = document.getElementById('date-from');
    const dateTo = document.getElementById('date-to');
    const toggle = document.getElementById(config.idToggle);
    const titolo = document.getElementById(config.idTitolo);
    const vuoto = document.getElementById(config.idVuoto);
    const lightbox = setupCardLightbox();

    // ⚠️ Si apre su "in corso": è la prima cosa che chi arriva sul sito vuole
    // sapere. Ma se non c'è niente in corso NON si mostra un elenco vuoto —
    // si scende a "futuri", e se sono vuoti anche quelli a "passati"
    // (chiesto dal titolare il 24/08/2026, quando "in corso" era zero su
    // entrambe le pagine e la prima cosa che si vedeva era un buco).
    //
    // ⛔ La scelta si fa UNA VOLTA SOLA, alla prima apertura, e non a ogni
    //    render: se no chi cerca "olio" e poi cancella la ricerca si
    //    ritroverebbe su una linguetta diversa da quella che aveva scelto,
    //    e chi clicca "In corso" apposta — per verificare che non ci sia
    //    niente — verrebbe rispedito altrove senza capire perché.
    let statoAttivo = config.statoIniziale || 'in_corso';
    let statoDaScegliere = !config.statoIniziale;

    /**
     * Il primo stato non vuoto, nell'ordine in cui interessa a chi guarda:
     * quello che c'è adesso, poi quello che sta per arrivare, e solo alla
     * fine quello che è già stato. Se sono vuoti tutti e tre resta "in
     * corso", così il messaggio spiega la cosa giusta (il sito non ha
     * ancora niente) invece di aprirsi su un archivio vuoto.
     */
    function primoStatoPieno(conteggi) {
      return ['in_corso', 'futuro', 'passato'].find(s => conteggi[s] > 0) || 'in_corso';
    }

    function render() {
      const query = searchInput.value.toLowerCase();
      const from = dateFrom.value ? new Date(dateFrom.value) : null;
      const to = dateTo.value ? new Date(dateTo.value) : null;

      const filtrati = gruppi.filter(g => {
        if (query) {
          const inTitolo = g.title.toLowerCase().includes(query);
          const inEdizioni = g.edizioni.some(e => (e.description || '').toLowerCase().includes(query));
          if (!inTitolo && !inEdizioni) return false;
        }
        if ((from || to) && !gruppoNelPeriodo(g, from, to)) return false;
        return true;
      });

      const conteggi = { in_corso: 0, futuro: 0, passato: 0 };
      const perStato = { in_corso: [], futuro: [], passato: [] };
      filtrati.forEach(g => { conteggi[g.stato]++; perStato[g.stato].push(g); });

      // Solo alla prima apertura, e prima di disegnare qualunque cosa: i
      // conteggi si sanno soltanto qui, dopo aver raggruppato e filtrato.
      if (statoDaScegliere) {
        statoAttivo = primoStatoPieno(conteggi);
        statoDaScegliere = false;
      }

      // I numeri sui pulsanti sono quelli DOPO ricerca e date correnti: un
      // pulsante che promette 12 e ne apre 3 è peggio che non dire niente.
      toggle.querySelectorAll('.stato-btn').forEach(btn => {
        const s = btn.dataset.stato;
        const attivo = s === statoAttivo;
        btn.querySelector('.stato-conteggio').textContent = conteggi[s];
        btn.classList.toggle('attivo', attivo);
        btn.setAttribute('aria-pressed', attivo ? 'true' : 'false');
      });

      const visibili = perStato[statoAttivo];
      titolo.textContent = config.titoli[statoAttivo];
      titolo.className = 'project-section-title ' + CLASSE_STATO[statoAttivo];

      if (visibili.length === 0) {
        vuoto.innerHTML = messaggioElencoVuoto(statoAttivo, conteggi, config.frasi, config.etichette);
        vuoto.hidden = false;
        grid.innerHTML = '';
      } else {
        vuoto.hidden = true;
        grid.innerHTML = visibili.map((g, i) => config.renderScheda(g, i)).join('');
      }

      // Lo scorrimento nell'ingranditore resta dentro le sole schede
      // mostrate qui — cioè lo stato attualmente selezionato, già filtrato.
      if (lightbox) {
        lightbox.setItems(visibili.map(config.vociLightbox));
        grid.querySelectorAll('[data-lb-index] .card-image').forEach(el => {
          const idx = parseInt(el.closest('[data-lb-index]').dataset.lbIndex, 10);
          const img = el.querySelector('img');
          makeLightboxTrigger(el, 'Ingrandisci: ' + (img ? img.alt : ''), () => lightbox.open(idx, el));
        });
      }
    }

    toggle.addEventListener('click', (e) => {
      const btn = e.target.closest('.stato-btn');
      if (!btn) return;
      statoAttivo = btn.dataset.stato;
      render();
    });

    // I link dentro il messaggio "elenco vuoto" nascono e muoiono col
    // messaggio stesso (`innerHTML` li ricrea ogni volta): si ascolta sul
    // contenitore fisso, non su di loro — altrimenti ogni render ne
    // impilerebbe uno nuovo.
    vuoto.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-vai-stato]');
      if (!btn) return;
      statoAttivo = btn.dataset.vaiStato;
      render();
    });

    searchInput.addEventListener('input', render);
    dateFrom.addEventListener('change', render);
    dateTo.addEventListener('change', render);
    render();
  } catch (e) {
    console.warn('Could not load ' + config.nome + ':', e);
  }
}

function loadProjects() {
  return avviaListaAStati({
    carica: caricaProgetti,
    nome: 'progetti',
    idGrid: 'progetti-grid',
    idToggle: 'stato-toggle',
    idTitolo: 'progetti-elenco-titolo',
    idVuoto: 'progetti-vuoto',
    frasi: {
      in_corso: 'Nessun progetto è in corso proprio in questo momento.',
      futuro: 'Non ci sono ancora nuovi progetti in programma.',
      passato: 'Nessun progetto passato corrisponde alla ricerca.'
    },
    etichette: { in_corso: 'in corso', futuro: 'futuri', passato: 'passati' },
    titoli: { in_corso: 'Progetti in corso', futuro: 'Progetti futuri', passato: 'Progetti passati' },
    // I progetti portano numeri sommati e sponsor, che i gruppi generici
    // di raggruppaPerTitolo non hanno: si aggiungono qui, non dentro la
    // funzione condivisa con gli eventi.
    arricchisciGruppi: (gruppi) => gruppi.map(g => ({
      ...g,
      immagine: g.piuRecente.image,
      descrizione: g.piuRecente.description,
      // Uno sponsor che ha sostenuto più edizioni dello stesso progetto va
      // scritto una volta sola sulla scheda, non ripetuto.
      sponsor: Array.from(new Set(g.edizioni.flatMap(e => e.sponsor || []))),
      numeri: {
        incontri: sommaCampoEdizioni(g.edizioni, 'incontri'),
        ore: sommaCampoEdizioni(g.edizioni, 'ore'),
        partecipanti: sommaCampoEdizioni(g.edizioni, 'partecipanti'),
        educatori: sommaCampoEdizioni(g.edizioni, 'educatori'),
        volontari: sommaCampoEdizioni(g.edizioni, 'volontari')
      }
    })),
    renderScheda: renderProjectCard,
    vociLightbox: (p) => ({
      image: p.immagine,
      alt: p.title,
      title: p.title,
      meta: p.fasciaAnni + (p.numEdizioni > 1 ? ` — ${p.numEdizioni} edizioni` : ''),
      description: p.descrizione
    })
  });
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

// ⚠️ 28/08/2026 — QUESTA resta sul file, apposta. Il gestionale filtra le foto
// sui consensi (`GET /pubblico/media/:id`), ma quella rotta dà i BYTE di UNA
// foto già nota per identificativo: non esiste ancora un elenco pubblico che
// dia didascalia/data/luogo/progetto per ogni foto, cioè quello che questa
// pagina mostra davvero. Fabbricare una galleria da soli identificativi,
// senza didascalia, sarebbe una pagina peggiore di quella di oggi — vedi il
// commento in cima a js/dati-pubblici.js sul perimetro di questa migrazione.
async function loadGallery() {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;

  try {
    const res = await fetch('data/gallery.json');
    const allPhotos = await res.json();

    const searchInput = document.getElementById('search-input');
    const dateFrom = document.getElementById('date-from');
    const dateTo = document.getElementById('date-to');
    const contenitoreFiltri = document.getElementById('gallery-filtri');
    const vuoto = document.getElementById('gallery-vuoto');
    const lightbox = setupCardLightbox();

    // `null` = «tutte»: è lo stato di partenza e resta distinto da
    // `progetto === null`, che invece vuol dire «le foto senza progetto».
    let progettoScelto = null;

    /**
     * I pulsanti nascono dai dati, non da un elenco scritto a mano.
     *
     * Ogni pulsante porta la MINIATURA della prima foto di quel progetto: è
     * la parte «identificativa» chiesta dal committente. Una fila di
     * pastiglie tutte uguali col nome dentro si legge una per una; con
     * l'immagine davanti si riconosce quella che si cerca senza leggere —
     * ed è così che funziona il ricordo di una fotografia.
     *
     * ⚠️ L'ordine è per numero di foto, non alfabetico: chi arriva vuole
     * prima quello di cui c'è di più da vedere. «Altre attività» resta in
     * fondo comunque, perché non è un progetto.
     */
    function disegnaFiltri() {
      const perProgetto = new Map();
      allPhotos.forEach(f => {
        const chiave = f.progetto || null;
        if (!perProgetto.has(chiave)) perProgetto.set(chiave, []);
        perProgetto.get(chiave).push(f);
      });

      const conProgetto = [...perProgetto.entries()]
        .filter(([chiave]) => chiave !== null)
        .sort((a, b) => b[1].length - a[1].length);
      const senzaProgetto = perProgetto.get(null) || [];

      const voci = [
        { chiave: null, nome: 'Tutte', foto: allPhotos },
        ...conProgetto.map(([nome, foto]) => ({ chiave: nome, nome, foto })),
      ];
      if (senzaProgetto.length) {
        voci.push({ chiave: '__altre__', nome: 'Altre attività', foto: senzaProgetto });
      }

      contenitoreFiltri.innerHTML = voci.map(v => {
        const attivo = v.chiave === progettoScelto;
        // La miniatura è la prima foto del gruppo. Per «Tutte» non ce n'è
        // una che rappresenti l'insieme: meglio nessuna immagine che una
        // scelta a caso che sembrerebbe voler dire qualcosa.
        const miniatura = v.chiave === null
          ? ''
          : `<img class="gallery-filtro-foto" src="${conVersione(v.foto[0].image)}" alt="" loading="lazy">`;
        return `
          <button type="button" class="gallery-filtro${attivo ? ' attivo' : ''}"
                  data-progetto="${escapeHTML(v.chiave === null ? '' : v.chiave)}" title="${escapeHTML(v.nome)}"
                  aria-pressed="${attivo ? 'true' : 'false'}">
            ${miniatura}
            <span class="gallery-filtro-nome">${escapeHTML(v.nome)}</span>
            <span class="gallery-filtro-quante">${v.foto.length}</span>
          </button>`;
      }).join('');
    }

    function passaIlProgetto(f) {
      if (progettoScelto === null) return true;
      if (progettoScelto === '__altre__') return !f.progetto;
      return f.progetto === progettoScelto;
    }

    function renderGallery() {
      const query = searchInput.value.toLowerCase();
      const from = dateFrom.value ? new Date(dateFrom.value) : null;
      const to = dateTo.value ? new Date(dateTo.value) : null;

      const visiblePhotos = allPhotos.filter(p => {
        if (!passaIlProgetto(p)) return false;
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
      contenitoreFiltri.querySelectorAll('.gallery-filtro').forEach(b => {
        const chiave = b.dataset.progetto === '' ? null : b.dataset.progetto;
        const attivo = chiave === progettoScelto;
        b.classList.toggle('attivo', attivo);
        b.setAttribute('aria-pressed', attivo ? 'true' : 'false');
      });

      // ⛔ Un elenco vuoto non si lascia bianco: con un filtro per progetto
      //    E una ricerca insieme è facile arrivarci, e chi ci arriva deve
      //    capire che è stato lui a restringere troppo, non che il sito è
      //    rotto.
      vuoto.hidden = visiblePhotos.length > 0;
      if (!visiblePhotos.length) {
        vuoto.textContent = 'Nessuna fotografia con questi filtri. Prova a togliere la ricerca o le date, oppure scegli «Tutte».';
      }

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

    // I pulsanti si ridisegnano una volta sola: le miniature non cambiano
    // col filtro, e ricrearli a ogni render farebbe ricaricare le immagini.
    contenitoreFiltri.addEventListener('click', (e) => {
      const b = e.target.closest('.gallery-filtro');
      if (!b) return;
      progettoScelto = b.dataset.progetto === '' ? null : b.dataset.progetto;
      renderGallery();
    });

    searchInput.addEventListener('input', renderGallery);
    dateFrom.addEventListener('change', renderGallery);
    dateTo.addEventListener('change', renderGallery);
    disegnaFiltri();
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
    const datiPartner = await caricaPartner();
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

/**
 * Tabella «Con il sostegno di», in fondo a partner.html: per chi deve
 * chiedere un contributo nuovo, poter dire "l'anno scorso col vostro
 * sostegno abbiamo fatto questo".
 *
 * ⚠️ Lo sponsor sta nell'EDIZIONE, non nel progetto: un progetto con più
 * edizioni può aver avuto sponsor diversi anno per anno. Qui si sommano
 * SOLO i numeri delle edizioni che quello sponsor ha davvero sostenuto —
 * non quelli dell'intero progetto raggruppato — altrimenti gli si
 * attribuirebbero incontri e ore che non ha finanziato.
 *
 * ⚠️ Solo una parte dei progetti ha uno sponsor dichiarato nei dati: la
 * nota sopra la tabella lo dice con un numero calcolato qui, non scritto a
 * mano, così resta vero anche quando i dati cambiano.
 */
async function loadPartnerSponsorship() {
  const corpo = document.getElementById('tabella-sponsor-corpo');
  if (!corpo) return;

  try {
    const [edizioni, partnersData] = await Promise.all([
      caricaProgetti(),
      caricaPartner()
    ]);
    const nomiPartner = new Set(partnersData.map(p => p.name));

    const perSponsor = new Map();
    edizioni.forEach(e => {
      (e.sponsor || []).forEach(nome => {
        if (!perSponsor.has(nome)) perSponsor.set(nome, []);
        perSponsor.get(nome).push(e);
      });
    });

    const totProgetti = new Set(edizioni.map(e => e.title)).size;
    const progettiConSponsor = new Set(edizioni.filter(e => e.sponsor && e.sponsor.length).map(e => e.title));

    const nota = document.getElementById('sostegno-sponsor-nota');
    if (nota) {
      nota.textContent = `${progettiConSponsor.size} progetti su ${totProgetti} hanno uno sponsor dichiarato nei dati: i numeri qui sotto raccontano solo quelli, non l'intera attività dell'associazione.`;
    }

    if (perSponsor.size === 0) {
      const scroll = corpo.closest('.tabella-scroll');
      if (scroll) scroll.outerHTML = '<p class="sostegno-sponsor-vuoto">Nessuno sponsor è ancora collegato a un progetto nei dati.</p>';
      return;
    }

    const righe = Array.from(perSponsor.entries()).map(([nome, eds]) => ({
      nome,
      trovato: nomiPartner.has(nome),
      numProgetti: new Set(eds.map(e => e.title)).size,
      incontri: sommaCampoEdizioni(eds, 'incontri'),
      ore: sommaCampoEdizioni(eds, 'ore'),
      partecipanti: sommaCampoEdizioni(eds, 'partecipanti')
    })).sort((a, b) => b.numProgetti - a.numProgetti || a.nome.localeCompare(b.nome, 'it'));

    corpo.innerHTML = righe.map(r => `
      <tr>
        <th scope="row">${escapeHTML(r.nome)}</th>
        <td>${r.numProgetti}</td>
        <td>${r.incontri || '—'}</td>
        <td>${r.ore ? formattaOre(r.ore) : '—'}</td>
        <td>${r.partecipanti || '—'}</td>
      </tr>
    `).join('');

    // ⚠️ Un nome in "sponsor" che non combacia con nessun "name" in
    // partners.json non darebbe nessun errore visibile: la riga uscirebbe
    // comunque in tabella, ma senza logo/scheda associata altrove sul
    // sito. Si segnala qui, così il guasto non resta silenzioso.
    const orfani = righe.filter(r => !r.trovato).map(r => r.nome);
    if (orfani.length) {
      console.warn('Sponsor senza corrispondenza in data/partners.json:', orfani);
    }
  } catch (e) {
    console.warn('Could not load partner sponsorship table:', e);
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
 * un errore. Gli id degli eventi sono stati resi unici (`grid-eventi-…`)
 * per togliere la collisione alla radice.
 *
 * ⚠️ 25/08/2026 — eventi.html è passata alla stessa griglia raggruppata di
 * progetti.html (`avviaListaAStati`, vedi sopra): 7 edizioni in
 * `data/events.json` diventano 5 eventi ("Prim'Olio" compare tre volte).
 * Con id per-pagina distinti (`eventi-grid` qui, `progetti-grid` là) la
 * collisione del 22/08 non può ripresentarsi: il motore condiviso non ha
 * niente da confondere.
 */
function loadEvents() {
  return avviaListaAStati({
    carica: caricaEventi,
    nome: 'eventi',
    idGrid: 'eventi-grid',
    idToggle: 'eventi-stato-toggle',
    idTitolo: 'eventi-elenco-titolo',
    idVuoto: 'eventi-vuoto',
    frasi: {
      in_corso: 'Nessun evento è in corso proprio in questo momento.',
      futuro: 'Non ci sono ancora nuovi eventi in programma.',
      passato: 'Nessun evento passato corrisponde alla ricerca.'
    },
    etichette: { in_corso: 'in corso', futuro: 'futuri', passato: 'passati' },
    titoli: { in_corso: 'Eventi in corso', futuro: 'Prossimi eventi', passato: 'Eventi passati' },
    renderScheda: renderEventGroupCard,
    // ⚠️ Gli eventi non hanno incontri/ore/partecipanti: la meta
    // dell'ingranditore porta fascia anni + edizioni (come i progetti) e,
    // se c'è, il luogo dell'edizione più recente — non un numero inventato.
    vociLightbox: (ev) => ({
      image: ev.piuRecente.image,
      alt: ev.title,
      title: ev.title,
      meta: [
        ev.fasciaAnni + (ev.numEdizioni > 1 ? ` — ${ev.numEdizioni} edizioni` : ''),
        ev.piuRecente.location ? '📍 ' + ev.piuRecente.location : ''
      ].filter(Boolean).join(' — '),
      description: ev.piuRecente.description
    })
  });
}

async function loadUpcomingEvents() {
  const grid = document.getElementById('upcoming-events-grid');
  if (!grid) return;

  try {
    const allEvents = await caricaEventi();
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

// ⚠️ 28/08/2026 — resta sul file: il gestionale non ha ancora una rotta
// pubblica per il direttivo (persone, contatti). Vedi js/dati-pubblici.js.
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

// ⚠️ 28/08/2026 — resta sul file: il gestionale non ha ancora una rotta
// pubblica per i documenti dell'associazione. Vedi js/dati-pubblici.js.
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
    numeri.forEach(n => { n.textContent = formattaNumero(n.dataset.valore); });
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
        voce.target.textContent = formattaNumero(arrivo * morbido);
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
