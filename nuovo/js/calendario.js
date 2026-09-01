/* ============================================================
   Calendario — vista mese e vista settimana
   ============================================================

   DA DOVE VENGONO GLI APPUNTAMENTI
   Da `data/events.json` e `data/projects.json`, gli stessi file che
   riempiono le pagine Eventi e Progetti: qui non si duplica niente.

   ⚠️ Oggi quei file hanno solo una data di inizio e una di fine — nessun
   orario. Un progetto che va da settembre a giugno è una fascia lunga nove
   mesi, non trenta incontri del martedì alle 17. È il motivo per cui la
   vista settimana ha la griglia delle ore quasi sempre vuota e la fascia
   «tutto il giorno» piena: il calendario mostra quello che i dati sanno,
   senza inventare orari che nessuno ha scritto.

   QUANDO ARRIVERANNO GLI ORARI VERI (è previsto: ogni progetto avrà le sue
   date con gli orari) non si tocca niente qui dentro. Basta aggiungere alla
   voce del progetto — o dell'evento — un elenco `appuntamenti`:

     "appuntamenti": [
       { "data": "2026-09-15", "ora": "17:00", "fine": "18:30",
         "titolo": "Laboratorio di teatro", "luogo": "CRC Antella" }
     ]

   `titolo`, `ora`/`fine` e `luogo` sono facoltativi (senza titolo si usa
   quello del progetto; senza `ora` l'appuntamento è su tutto il giorno).
   ⛔ Se una voce ha `appuntamenti`, il calendario mostra QUELLI e non
   disegna più la fascia lunga da inizio a fine: le due cose insieme
   raddoppierebbero lo stesso progetto in ogni giorno del periodo.

   IL LUOGO (26/08/2026): `data/luoghi.json` è l'anagrafica dei luoghi, con
   indirizzo. Un progetto/evento punta a un luogo abituale col campo
   `luogoId`; un singolo appuntamento può avere il suo `luogoId` che
   sovrascrive quello del progetto per quel giorno. Dove non c'è ancora un
   `luogoId` si continua a mostrare il vecchio `location`/`luogo` in chiaro:
   nessun dato scompare solo perché non è ancora agganciato all'anagrafica.

   OGNI APPUNTAMENTO (mai i periodi) ha nella scheda un comando che scarica
   un file .ics per Outlook — vedi `generaICS()` più sotto.

   ⚠️ `data/projects.json` è rigenerato da un Excel dagli script in
   `scripts/`: se un giorno ci si mette `appuntamenti` a mano, una
   rigenerazione lo cancella. La strada buona è che li porti il gestionale.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const contenitore = document.getElementById('cal-contenitore')
  if (!contenitore) return
  avviaCalendario(contenitore)
})

const GIORNI_BREVI = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom']
const GIORNI_LUNGHI = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica']
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']

// Altezza di una fascia nella vista mese, e sua distanza dalla successiva.
// Stanno qui e non nel CSS perché il calcolo delle corsie le usa per dare
// l'altezza giusta alla settimana: due valori sfasati farebbero le fasce
// sovrapposte o una striscia vuota in fondo a ogni riga.
const ALTEZZA_FASCIA = 30
const PASSO_FASCIA = 34
// ⛔ Quanto si sta sotto il numero del giorno. Le fasce sono posizionate in
//    assoluto, e un elemento in assoluto parte dal bordo interno del
//    contenitore ignorandone il padding: senza questo scarto la prima fascia
//    finisce SOPRA il numero e il giorno non si legge più.
const SCARTO_NUMERO = 34

// ------------------------------------------------------------
// Date: si lavora sempre in ora locale
// ------------------------------------------------------------
// ⛔ `new Date('2026-09-15')` legge la stringa come UTC: a Firenze diventa
//    il 15 alle 02:00, e per chi sta a ovest di Greenwich diventa il 14. Un
//    calendario che sposta gli appuntamenti di un giorno in mezzo mondo non
//    è un dettaglio, quindi le date dei dati si spezzano a mano.
function dataDa(testo) {
  if (!testo || typeof testo !== 'string') return null
  const pezzi = testo.slice(0, 10).split('-')
  if (pezzi.length !== 3) return null
  const d = new Date(Number(pezzi[0]), Number(pezzi[1]) - 1, Number(pezzi[2]))
  return isNaN(d.getTime()) ? null : d
}

function aMezzanotte(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function sommaGiorni(d, quanti) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + quanti)
}

// Lunedì della settimana in cui cade la data (la settimana italiana comincia
// di lunedì, non di domenica come nei calendari americani).
function lunediDi(d) {
  const giorno = (d.getDay() + 6) % 7
  return sommaGiorni(d, -giorno)
}

function stessoGiorno(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function giorniDiDifferenza(da, a) {
  // Si passa per i giorni interi, non per i millisecondi: l'ora legale
  // toglie o aggiunge un'ora a due notti l'anno e un conto in millisecondi
  // sbaglia proprio in quelle settimane.
  const uno = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate())
  const due = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  return Math.round((due - uno) / 86400000)
}

function minutiDa(ora) {
  if (!ora || typeof ora !== 'string') return null
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(ora.trim())
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

function daMinuti(minuti) {
  const h = Math.floor(minuti / 60)
  const m = minuti % 60
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m
}

function dataEstesa(d) {
  return GIORNI_LUNGHI[(d.getDay() + 6) % 7] + ' ' + d.getDate() + ' ' + MESI[d.getMonth()] + ' ' + d.getFullYear()
}

function testoSicuro(s) {
  const div = document.createElement('div')
  div.textContent = s == null ? '' : String(s)
  return div.innerHTML
}

// ------------------------------------------------------------
// Lettura dei dati
// ------------------------------------------------------------
// Anagrafica dei luoghi (`data/luoghi.json`), tenuta qui e non dentro allo
// stato del calendario: serve anche alla scheda e al generatore del .ics,
// che vivono fuori da `avviaCalendario`.
let LUOGHI = {}

/*
  ⛔⛔ **Il calendario legge dal GESTIONALE, non dai file** (01/09/2026).
  Fino a oggi questa funzione chiamava `leggiFile('data/projects.json')` e
  `leggiFile('data/events.json')` direttamente, saltando `dati-pubblici.js`:
  il resto del sito era passato all'api il 28/08, il calendario **no**, e
  nessuno se n'è accorto perché i file di copia ci sono e rispondono. Il
  titolare ha messo trentasette incontri nel gestionale e sul calendario è
  rimasta la fascia tratteggiata letta dal file — senza un errore, senza una
  riga di log, con la pagina che sembrava funzionare.
  ⚠️ `caricaProgetti`/`caricaEventi` hanno già il ripiego sui file dentro di
  loro (vedi `caricaConRipiego`): qui non serve rifarlo, e rifarlo vorrebbe
  dire due regole diverse per la stessa domanda.
  ⚠️ `data/luoghi.json` resta un file: l'anagrafica dei luoghi non ha una
  rotta pubblica, e `luogoId` continua ad arrivare dalla copia.
*/
async function leggiVoci() {
  const daiDatiPubblici = typeof window.caricaProgetti === 'function' && typeof window.caricaEventi === 'function'
  const [eventi, progetti, luoghi] = await Promise.all([
    daiDatiPubblici ? window.caricaEventi() : leggiFile('data/events.json'),
    daiDatiPubblici ? window.caricaProgetti() : leggiFile('data/projects.json'),
    leggiFile('data/luoghi.json')
  ])
  LUOGHI = {}
  luoghi.forEach(l => { if (l && l.id) LUOGHI[l.id] = l })
  const voci = []
  eventi.forEach(e => aggiungiVoce(voci, e, 'evento'))
  progetti.forEach(p => aggiungiVoce(voci, p, 'progetto'))
  return voci
}

// Il luogo vero di una voce: prima l'anagrafica (via `luogoId`), poi il
// vecchio testo libero (`luogo`/`location`) per non far sparire niente di
// quello che c'è già scritto in giro. Restituisce null se non c'è nessuno
// dei due.
function risolviLuogo(voce) {
  const luogo = voce.luogoId ? LUOGHI[voce.luogoId] : null
  if (luogo) {
    const cittaPezzi = [luogo.cap, luogo.comune].filter(Boolean).join(' ')
    const cittaConProvincia = luogo.provincia && cittaPezzi ? cittaPezzi + ' (' + luogo.provincia + ')' : cittaPezzi
    const indirizzo = [luogo.indirizzo, cittaConProvincia].filter(Boolean).join(', ')
    return { nome: luogo.nome, indirizzo: indirizzo, mappa: luogo.mappa || null }
  }
  if (voce.luogo) return { nome: voce.luogo, indirizzo: '', mappa: null }
  return null
}

// Il testo unico «nome, indirizzo» per il campo LOCATION del .ics.
function luogoInUnaRiga(voce) {
  const risolto = risolviLuogo(voce)
  if (!risolto) return ''
  return [risolto.nome, risolto.indirizzo].filter(Boolean).join(', ')
}

async function leggiFile(percorso) {
  try {
    const risposta = await fetch(percorso)
    if (!risposta.ok) throw new Error(risposta.status + ' ' + risposta.statusText)
    const dati = await risposta.json()
    return Array.isArray(dati) ? dati : []
  } catch (errore) {
    console.error('Calendario: non riesco a leggere', percorso, errore)
    return []
  }
}

function aggiungiVoce(voci, dato, tipo) {
  const titolo = dato.title || dato.titolo
  if (!titolo) return

  // Se ci sono gli appuntamenti con l'orario, sono loro il calendario: la
  // fascia lunga da inizio a fine ripeterebbe lo stesso progetto in ogni
  // giorno del periodo, coprendo gli incontri veri.
  const appuntamenti = Array.isArray(dato.appuntamenti) ? dato.appuntamenti : []
  if (appuntamenti.length) {
    appuntamenti.forEach(a => {
      const giorno = dataDa(a.data)
      if (!giorno) return
      const inizioMinuti = minutiDa(a.ora)
      const fineMinuti = minutiDa(a.fine)
      voci.push({
        tipo: tipo,
        titolo: a.titolo || titolo,
        titoloGenitore: titolo,
        progetto: a.titolo ? titolo : '',
        inizio: giorno,
        fine: giorno,
        conOrario: inizioMinuti != null,
        inizioMinuti: inizioMinuti,
        fineMinuti: fineMinuti != null ? fineMinuti : (inizioMinuti != null ? inizioMinuti + 60 : null),
        luogo: a.luogo || dato.location || '',
        luogoId: a.luogoId || dato.luogoId || null,
        link: dato.link || '',
        descrizione: dato.description || '',
        // ⛔ Un vero appuntamento (giorno preciso, con o senza ora): SOLO
        // questi hanno il comando di scarico .ics — mai la fascia lunga del
        // progetto qui sotto. Vedi punto 1 del rapporto in cima al file.
        periodo: false,
        appuntamentoVero: true
      })
    })
    return
  }

  const inizio = dataDa(dato.startDate)
  if (!inizio) return
  const fine = dataDa(dato.endDate) || inizio
  voci.push({
    tipo: tipo,
    titolo: titolo,
    titoloGenitore: titolo,
    progetto: '',
    inizio: inizio,
    fine: fine < inizio ? inizio : fine,
    conOrario: false,
    inizioMinuti: null,
    fineMinuti: null,
    luogo: dato.location || '',
    luogoId: dato.luogoId || null,
    link: dato.link || '',
    descrizione: dato.description || '',
    // Fascia lunga = periodo, non un appuntamento: niente .ics, e nella
    // vista mese/settimana prende lo stile semitrasparente tratteggiato,
    // ma solo per i progetti — un evento con solo inizio/fine resta come
    // prima, perché di norma è già un giorno preciso (vedi rapporto).
    periodo: tipo === 'progetto',
    appuntamentoVero: false
  })
}

// ------------------------------------------------------------
// Corsie: due fasce che si accavallano non devono finire una sopra l'altra
// ------------------------------------------------------------
function assegnaCorsie(segmenti) {
  const corsie = []
  segmenti
    .slice()
    .sort((a, b) => (a.colonna - b.colonna) || (b.larghezza - a.larghezza))
    .forEach(seg => {
      let corsia = 0
      while (corsie[corsia] && corsie[corsia].some(altro =>
        seg.colonna < altro.colonna + altro.larghezza && altro.colonna < seg.colonna + seg.larghezza)) {
        corsia++
      }
      if (!corsie[corsia]) corsie[corsia] = []
      corsie[corsia].push(seg)
      seg.corsia = corsia
    })
  return corsie.length
}

// Ritaglia una voce sulla settimana che comincia da `lunedi`: restituisce da
// quale colonna parte, quante ne occupa, e se prosegue prima o dopo (le
// frecce ‹ › che dicono «continua»).
function segmentoNellaSettimana(voce, lunedi) {
  const domenica = sommaGiorni(lunedi, 6)
  if (voce.fine < lunedi || voce.inizio > domenica) return null
  const colonna = Math.max(0, giorniDiDifferenza(lunedi, voce.inizio))
  const ultima = Math.min(6, giorniDiDifferenza(lunedi, voce.fine))
  return {
    voce: voce,
    colonna: colonna,
    larghezza: ultima - colonna + 1,
    continuaPrima: voce.inizio < lunedi,
    continuaDopo: voce.fine > domenica
  }
}

// ------------------------------------------------------------
// Il calendario
// ------------------------------------------------------------
function avviaCalendario(contenitore) {
  const oggi = aMezzanotte(new Date())
  const stato = {
    vista: 'mese',
    ancora: oggi,          // un giorno qualsiasi dentro il periodo mostrato
    oggi: oggi,
    voci: [],
    filtri: { progetto: true, evento: true }
  }

  const periodo = document.getElementById('cal-periodo')
  const avviso = document.getElementById('cal-avviso')

  document.querySelectorAll('[data-vai]').forEach(b => {
    b.addEventListener('click', () => {
      const passo = b.dataset.vai === 'prec' ? -1 : 1
      stato.ancora = stato.vista === 'mese'
        ? new Date(stato.ancora.getFullYear(), stato.ancora.getMonth() + passo, 1)
        : sommaGiorni(stato.ancora, passo * 7)
      disegna()
    })
  })

  const bottoneOggi = document.querySelector('.cal-oggi')
  if (bottoneOggi) bottoneOggi.addEventListener('click', () => { stato.ancora = stato.oggi; disegna() })

  document.querySelectorAll('[data-vista]').forEach(b => {
    b.addEventListener('click', () => {
      stato.vista = b.dataset.vista
      document.querySelectorAll('[data-vista]').forEach(altro => {
        const acceso = altro === b
        altro.classList.toggle('attiva', acceso)
        altro.setAttribute('aria-pressed', acceso ? 'true' : 'false')
      })
      disegna()
    })
  })

  document.querySelectorAll('[data-filtro]').forEach(c => {
    c.addEventListener('change', () => {
      stato.filtri[c.dataset.filtro] = c.checked
      disegna()
    })
  })

  leggiVoci().then(voci => {
    stato.voci = voci
    disegna()
  })

  function vociVisibili() {
    return stato.voci.filter(v => stato.filtri[v.tipo])
  }

  function estremiPeriodo() {
    if (stato.vista === 'settimana') {
      const lunedi = lunediDi(stato.ancora)
      return { da: lunedi, a: sommaGiorni(lunedi, 6) }
    }
    const primo = new Date(stato.ancora.getFullYear(), stato.ancora.getMonth(), 1)
    return { da: primo, a: new Date(stato.ancora.getFullYear(), stato.ancora.getMonth() + 1, 0) }
  }

  function disegna() {
    const estremi = estremiPeriodo()
    if (periodo) {
      periodo.textContent = stato.vista === 'mese'
        ? MESI[stato.ancora.getMonth()].charAt(0).toUpperCase() + MESI[stato.ancora.getMonth()].slice(1) + ' ' + stato.ancora.getFullYear()
        : estremi.da.getDate() + ' ' + MESI[estremi.da.getMonth()] + ' – ' + estremi.a.getDate() + ' ' + MESI[estremi.a.getMonth()] + ' ' + estremi.a.getFullYear()
    }

    const visibili = vociVisibili()
    contenitore.innerHTML = stato.vista === 'mese'
      ? disegnaMese(stato, visibili)
      : disegnaSettimana(stato, visibili)

    collegaSchede(contenitore)
    mostraAvviso(visibili, estremi)
  }

  // Quando il periodo è vuoto non basta lasciare il calendario bianco: chi
  // guarda non sa se è vuoto davvero o se il sito è rotto. Si dice che è
  // vuoto e si offre il periodo più vicino che ha qualcosa.
  function mostraAvviso(visibili, estremi) {
    if (!avviso) return
    const dentro = visibili.filter(v => v.fine >= estremi.da && v.inizio <= estremi.a)
    if (dentro.length) { avviso.hidden = true; avviso.innerHTML = ''; return }

    const vicina = piuVicina(visibili, estremi)
    avviso.hidden = false
    if (!vicina) {
      avviso.innerHTML = 'Non c\'è ancora niente in calendario.'
      return
    }
    const etichetta = MESI[vicina.getMonth()] + ' ' + vicina.getFullYear()
    avviso.innerHTML = 'In questo periodo non c\'è niente. ' +
      '<button type="button" class="cal-salta">Vai a ' + testoSicuro(etichetta) + ' →</button>'
    avviso.querySelector('.cal-salta').addEventListener('click', () => {
      stato.ancora = vicina
      disegna()
    })
  }

  function piuVicina(visibili, estremi) {
    let scelta = null
    let distanza = Infinity
    visibili.forEach(v => {
      const d = v.inizio > estremi.a
        ? giorniDiDifferenza(estremi.a, v.inizio)
        : (v.fine < estremi.da ? giorniDiDifferenza(v.fine, estremi.da) : 0)
      if (d < distanza) { distanza = d; scelta = v.inizio > estremi.a ? v.inizio : v.fine }
    })
    return scelta
  }
}

// ------------------------------------------------------------
// Vista mese
// ------------------------------------------------------------
function disegnaMese(stato, voci) {
  SCHEDE.length = 0  // si ridisegna da capo: gli indici vecchi non servono più
  const primo = new Date(stato.ancora.getFullYear(), stato.ancora.getMonth(), 1)
  const ultimo = new Date(stato.ancora.getFullYear(), stato.ancora.getMonth() + 1, 0)
  const mese = stato.ancora.getMonth()

  let html = '<div class="cal-mese">'
  html += '<div class="cal-testata" aria-hidden="true">' +
    GIORNI_BREVI.map(g => '<div>' + g + '</div>').join('') + '</div>'

  for (let lunedi = lunediDi(primo); lunedi <= ultimo; lunedi = sommaGiorni(lunedi, 7)) {
    const segmenti = []
    voci.forEach(v => {
      const seg = segmentoNellaSettimana(v, lunedi)
      if (seg) segmenti.push(seg)
    })
    const corsie = assegnaCorsie(segmenti)
    const altezza = SCARTO_NUMERO + Math.max(1, corsie) * PASSO_FASCIA + 8

    html += '<div class="cal-riga">'
    html += '<div class="cal-giorni">'
    for (let i = 0; i < 7; i++) {
      const giorno = sommaGiorni(lunedi, i)
      const classi = ['cal-giorno']
      if (giorno.getMonth() !== mese) classi.push('fuori-mese')
      if (stessoGiorno(giorno, stato.oggi)) classi.push('oggi')
      if (i >= 5) classi.push('festivo')
      html += '<div class="' + classi.join(' ') + '"><span class="cal-numero">' + giorno.getDate() + '</span></div>'
    }
    html += '</div>'

    html += '<div class="cal-fasce" style="height:' + altezza + 'px">'
    segmenti.forEach(seg => { html += fascia(seg, SCARTO_NUMERO) })
    html += '</div></div>'
  }

  return html + '</div>'
}

function fascia(seg, scarto) {
  const v = seg.voce
  const sinistra = (seg.colonna / 7) * 100
  const larghezza = (seg.larghezza / 7) * 100
  const stile = 'left:calc(' + sinistra + '% + 4px);' +
    'width:calc(' + larghezza + '% - 8px);' +
    'top:' + ((scarto || 0) + seg.corsia * PASSO_FASCIA) + 'px;' +
    'height:' + ALTEZZA_FASCIA + 'px'
  const orario = v.conOrario && v.inizioMinuti != null ? daMinuti(v.inizioMinuti) + ' ' : ''
  const classi = 'cal-fascia tipo-' + v.tipo + (v.periodo ? ' periodo' : '')
  return '<button type="button" class="' + classi + '" style="' + stile + '" ' +
    'data-scheda="' + testoSicuro(indiceScheda(v)) + '">' +
    (seg.continuaPrima ? '<span class="cal-continua" aria-hidden="true">‹</span>' : '') +
    '<span class="cal-fascia-testo">' + testoSicuro(orario + v.titolo) + '</span>' +
    (seg.continuaDopo ? '<span class="cal-continua" aria-hidden="true">›</span>' : '') +
    '</button>'
}

// ------------------------------------------------------------
// Vista settimana
// ------------------------------------------------------------
const ORA_PRIMA = 8
const ORA_ULTIMA = 22
const ALTEZZA_ORA = 56

function disegnaSettimana(stato, voci) {
  SCHEDE.length = 0  // si ridisegna da capo: gli indici vecchi non servono più
  const lunedi = lunediDi(stato.ancora)
  const conOrario = []
  const tuttoIlGiorno = []

  voci.forEach(v => {
    const seg = segmentoNellaSettimana(v, lunedi)
    if (!seg) return
    if (v.conOrario && v.inizioMinuti != null) conOrario.push(seg)
    else tuttoIlGiorno.push(seg)
  })

  const corsie = assegnaCorsie(tuttoIlGiorno)
  const altezzaBanda = Math.max(1, corsie) * PASSO_FASCIA + 8

  let html = '<div class="cal-settimana">'

  // testata coi giorni
  html += '<div class="cal-testata-settimana"><div class="cal-angolo"></div>'
  for (let i = 0; i < 7; i++) {
    const giorno = sommaGiorni(lunedi, i)
    const classi = ['cal-giorno-testata']
    if (stessoGiorno(giorno, stato.oggi)) classi.push('oggi')
    if (i >= 5) classi.push('festivo')
    html += '<div class="' + classi.join(' ') + '">' +
      '<span class="cal-giorno-nome">' + GIORNI_BREVI[i] + '</span>' +
      '<span class="cal-giorno-numero">' + giorno.getDate() + '</span></div>'
  }
  html += '</div>'

  // fascia «tutto il giorno»: qui finisce tutto quello che dura più giorni o
  // che non ha un orario — cioè, oggi, quasi tutto.
  html += '<div class="cal-banda">'
  html += '<div class="cal-banda-etichetta">tutto<br>il giorno</div>'
  html += '<div class="cal-banda-fasce" style="height:' + altezzaBanda + 'px">'
  tuttoIlGiorno.forEach(seg => { html += fascia(seg) })
  if (!tuttoIlGiorno.length) html += '<p class="cal-banda-vuota">Niente in questi giorni.</p>'
  html += '</div></div>'

  // griglia delle ore
  html += '<div class="cal-orario">'
  html += '<div class="cal-ore">'
  for (let ora = ORA_PRIMA; ora <= ORA_ULTIMA; ora++) {
    html += '<div class="cal-ora" style="height:' + ALTEZZA_ORA + 'px"><span>' + (ora < 10 ? '0' : '') + ora + ':00</span></div>'
  }
  html += '</div>'
  html += '<div class="cal-colonne">'
  for (let i = 0; i < 7; i++) {
    const giorno = sommaGiorni(lunedi, i)
    const classi = ['cal-colonna']
    if (stessoGiorno(giorno, stato.oggi)) classi.push('oggi')
    if (i >= 5) classi.push('festivo')
    html += '<div class="' + classi.join(' ') + '" style="height:' + ((ORA_ULTIMA - ORA_PRIMA + 1) * ALTEZZA_ORA) + 'px">'
    for (let ora = ORA_PRIMA; ora <= ORA_ULTIMA; ora++) {
      html += '<div class="cal-riga-ora" style="height:' + ALTEZZA_ORA + 'px"></div>'
    }
    // Due incontri alla stessa ora si dividono la colonna invece di
    // coprirsi: sovrapposti si vedrebbe solo quello disegnato per ultimo, e
    // l'altro sparirebbe senza lasciare segno.
    const delGiorno = conOrario.filter(seg => seg.colonna === i)
    const quante = affianca(delGiorno)
    delGiorno.forEach(seg => { html += appuntamento(seg, quante) })
    html += '</div>'
  }
  html += '</div></div>'

  if (!conOrario.length) {
    html += '<p class="cal-nota-ore">⚠️ Nessun appuntamento con l\'orario in questa settimana: ' +
      'i progetti e gli eventi hanno per ora solo la data di inizio e di fine, ' +
      'e stanno nella fascia qui sopra.</p>'
  }

  return html + '</div>'
}

// Assegna a ogni appuntamento del giorno una colonnina, in modo che due che
// si accavallano nel tempo non finiscano nello stesso posto. Restituisce
// quante colonnine servono per quel giorno.
function affianca(segmenti) {
  const corsie = []
  segmenti
    .sort((a, b) => (a.voce.inizioMinuti - b.voce.inizioMinuti))
    .forEach(seg => {
      const inizio = seg.voce.inizioMinuti
      const fine = seg.voce.fineMinuti != null ? seg.voce.fineMinuti : inizio + 60
      let corsia = 0
      while (corsie[corsia] && corsie[corsia].some(altro => {
        const altroInizio = altro.voce.inizioMinuti
        const altroFine = altro.voce.fineMinuti != null ? altro.voce.fineMinuti : altroInizio + 60
        return inizio < altroFine && altroInizio < fine
      })) {
        corsia++
      }
      if (!corsie[corsia]) corsie[corsia] = []
      corsie[corsia].push(seg)
      seg.corsia = corsia
    })
  return Math.max(1, corsie.length)
}

function appuntamento(seg, quante) {
  const v = seg.voce
  const inizio = Math.max(v.inizioMinuti, ORA_PRIMA * 60)
  const fine = Math.min(v.fineMinuti || (v.inizioMinuti + 60), (ORA_ULTIMA + 1) * 60)
  const cima = ((inizio - ORA_PRIMA * 60) / 60) * ALTEZZA_ORA
  const altezza = Math.max(24, ((fine - inizio) / 60) * ALTEZZA_ORA)
  const colonne = quante || 1
  const larghezza = 100 / colonne
  const sinistra = (seg.corsia || 0) * larghezza
  return '<button type="button" class="cal-appuntamento tipo-' + v.tipo + '" ' +
    'style="top:' + cima + 'px;height:' + altezza + 'px;' +
    'left:calc(' + sinistra + '% + 3px);width:calc(' + larghezza + '% - 6px)" ' +
    'data-scheda="' + testoSicuro(indiceScheda(v)) + '">' +
    '<span class="cal-appuntamento-ora">' + daMinuti(v.inizioMinuti) + '</span> ' +
    '<span class="cal-appuntamento-titolo">' + testoSicuro(v.titolo) + '</span>' +
    '</button>'
}

// ------------------------------------------------------------
// La scheda che si apre cliccando
// ------------------------------------------------------------
// Le voci si passano per indice invece che scrivere tutti i campi negli
// attributi: i titoli e le descrizioni contengono virgolette e apostrofi, e
// prima o poi uno di quelli rompe l'HTML.
const SCHEDE = []
function indiceScheda(voce) {
  SCHEDE.push(voce)
  return SCHEDE.length - 1
}

function collegaSchede(contenitore) {
  contenitore.querySelectorAll('[data-scheda]').forEach(b => {
    b.addEventListener('click', () => apriScheda(SCHEDE[Number(b.dataset.scheda)]))
  })
}

function apriScheda(voce) {
  if (!voce) return
  chiudiScheda()

  const luogoRisolto = risolviLuogo(voce)
  const dove = luogoRisolto
    ? '<p class="cal-scheda-dove">📍 ' + testoSicuro(luogoRisolto.nome) +
      (luogoRisolto.indirizzo ? '<br><span class="cal-scheda-indirizzo">' + testoSicuro(luogoRisolto.indirizzo) + '</span>' : '') +
      (luogoRisolto.mappa ? ' · <a href="' + testoSicuro(luogoRisolto.mappa) + '" target="_blank" rel="noopener noreferrer">mappa ↗</a>' : '') +
      '</p>'
    : ''

  const fondo = document.createElement('div')
  fondo.className = 'cal-velo'
  fondo.innerHTML =
    '<div class="cal-scheda" role="dialog" aria-modal="true" aria-labelledby="cal-scheda-titolo">' +
      '<button type="button" class="cal-scheda-chiudi" aria-label="Chiudi">×</button>' +
      '<span class="cal-scheda-tipo tipo-' + voce.tipo + '">' + (voce.tipo === 'evento' ? 'Evento' : 'Progetto') + '</span>' +
      '<h2 id="cal-scheda-titolo">' + testoSicuro(voce.titolo) + '</h2>' +
      (voce.progetto ? '<p class="cal-scheda-progetto">' + testoSicuro(voce.progetto) + '</p>' : '') +
      '<p class="cal-scheda-quando">' + testoSicuro(quando(voce)) + '</p>' +
      dove +
      (voce.descrizione ? '<p class="cal-scheda-testo">' + testoSicuro(voce.descrizione) + '</p>' : '') +
      (voce.link ? '<p><a href="' + testoSicuro(voce.link) + '" target="_blank" rel="noopener noreferrer">Vai al sito ↗</a></p>' : '') +
      // ⛔ Solo gli appuntamenti veri hanno il comando di scarico: un periodo
      // lungo mesi non ha un giorno e un'ora da mettere su un calendario.
      (voce.appuntamentoVero
        ? '<p><button type="button" class="cal-scheda-ics">📅 Scarica l\'appuntamento (Outlook / calendario)</button></p>'
        : '') +
    '</div>'

  document.body.appendChild(fondo)
  fondo.querySelector('.cal-scheda-chiudi').focus()
  fondo.querySelector('.cal-scheda-chiudi').addEventListener('click', chiudiScheda)
  fondo.addEventListener('click', e => { if (e.target === fondo) chiudiScheda() })
  document.addEventListener('keydown', chiudiConEsc)
  const bottoneIcs = fondo.querySelector('.cal-scheda-ics')
  if (bottoneIcs) bottoneIcs.addEventListener('click', () => scaricaICS(voce))
}

function chiudiConEsc(e) {
  if (e.key === 'Escape') chiudiScheda()
}

function chiudiScheda() {
  const aperta = document.querySelector('.cal-velo')
  if (aperta) aperta.remove()
  document.removeEventListener('keydown', chiudiConEsc)
}

function quando(voce) {
  if (voce.conOrario && voce.inizioMinuti != null) {
    const fine = voce.fineMinuti != null ? '–' + daMinuti(voce.fineMinuti) : ''
    return dataEstesa(voce.inizio) + ', ' + daMinuti(voce.inizioMinuti) + fine
  }
  if (stessoGiorno(voce.inizio, voce.fine)) return dataEstesa(voce.inizio)
  return 'Dal ' + dataEstesa(voce.inizio) + ' al ' + dataEstesa(voce.fine)
}

// ------------------------------------------------------------
// Lo scarico su Outlook/calendario (.ics) — SOLO per gli appuntamenti veri
// ------------------------------------------------------------
// Tutto in JavaScript nel browser, con un Blob e un link «download»: niente
// libreria esterna, niente chiamata di rete. La RFC di riferimento è la
// 5545. Il blocco VTIMEZONE per l'Italia sta qui sotto, statico: le due
// regole (ora legale dall'ultima domenica di marzo, solare dall'ultima di
// ottobre) non cambiano da un anno all'altro.
const VTIMEZONE_EUROPA_ROMA = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Rome',
  'X-LIC-LOCATION:Europe/Rome',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE'
]

function pad2(n) { return (n < 10 ? '0' : '') + n }

// AAAAMMGG, dalla data locale (mai UTC: vedi la nota su `dataDa` in cima).
function formattaSoloData(d) {
  return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate())
}

// AAAAMMGGTHHMMSS in ora locale italiana, per un DTSTART/DTEND con TZID:
// niente conversioni, sono già le cifre dell'orologio da scrivere così come
// sono — è il TZID a dire a chi legge che quel numero è fuso orario Europa.
function formattaLocale(giorno, minuti) {
  const h = Math.floor(minuti / 60)
  const m = minuti % 60
  return formattaSoloData(giorno) + 'T' + pad2(h) + pad2(m) + '00'
}

// AAAAMMGGTHHMMSSZ in UTC, per DTSTAMP (quando è stato generato il file).
function formattaUTC(d) {
  return d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate()) +
    'T' + pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) + pad2(d.getUTCSeconds()) + 'Z'
}

// Slug stabile per UID e nome del file: via gli accenti, via tutto quello
// che non è lettera/cifra, un trattino solo dove c'erano spazi o punteggi.
function slugifica(testo) {
  return String(testo || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Le virgole, i punti e virgola e le barre rovesce si proteggono, gli a
// capo diventano «\n» letterale: è quello che chiede la RFC 5545 per i
// campi di testo (SUMMARY, DESCRIPTION, LOCATION).
function escapeICS(testo) {
  return String(testo == null ? '' : testo)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\n|\r/g, '\\n')
}

// Piega una riga a 75 OTTETTI (non caratteri: un accento in UTF-8 pesa 2
// byte), come chiede la RFC 5545 — senza spezzare un carattere a metà.
// Ogni riga di continuazione comincia con uno spazio, che è lui stesso un
// ottetto e va contato nel limite della riga successiva.
function pieghaRiga(riga) {
  const bytes = new TextEncoder().encode(riga)
  if (bytes.length <= 75) return riga
  const decoder = new TextDecoder('utf-8')
  const pezzi = []
  let inizio = 0
  let primoPezzo = true
  while (inizio < bytes.length) {
    const massimo = primoPezzo ? 75 : 74
    let fine = Math.min(inizio + massimo, bytes.length)
    while (fine > inizio && (bytes[fine] & 0xC0) === 0x80) fine--
    pezzi.push(decoder.decode(bytes.slice(inizio, fine)))
    inizio = fine
    primoPezzo = false
  }
  return pezzi.join('\r\n ')
}

// L'indirizzo della pagina del progetto/evento sul sito (progetti.html o
// eventi.html), risolto rispetto a dove sta girando il calendario adesso:
// così il link nel .ics è giusto sia in locale sia in produzione, senza
// scrivere un dominio a mano che un giorno potrebbe cambiare.
function linkPaginaVoce(voce) {
  const pagina = voce.tipo === 'evento' ? 'eventi.html' : 'progetti.html'
  try {
    return new URL(pagina, window.location.href).href
  } catch (e) {
    return pagina
  }
}

function uidICS(voce) {
  const base = slugifica(voce.titoloGenitore || voce.titolo)
  const giorno = formattaSoloData(voce.inizio)
  const orario = voce.conOrario && voce.inizioMinuti != null
    ? pad2(Math.floor(voce.inizioMinuti / 60)) + pad2(voce.inizioMinuti % 60)
    : 'giorno'
  return base + '-' + giorno + '-' + orario + '@larosadeiventiaps.org'
}

// Data col trattino SOLO per il nome del file (leggibile): dentro al .ics
// resta AAAAMMGG senza trattini, come chiede la RFC 5545.
function dataConTrattini(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
}

function nomeFileICS(voce) {
  return slugifica(voce.titolo) + '-' + dataConTrattini(voce.inizio) + '.ics'
}

// Il file .ics vero e proprio, come testo. Un solo VEVENT.
function generaICS(voce) {
  const usaOrario = voce.conOrario && voce.inizioMinuti != null
  const righe = []
  righe.push('BEGIN:VCALENDAR')
  righe.push('VERSION:2.0')
  righe.push('PRODID:-//La Rosa dei Venti APS//Calendario//IT')
  righe.push('CALSCALE:GREGORIAN')
  if (usaOrario) righe.push.apply(righe, VTIMEZONE_EUROPA_ROMA)
  righe.push('BEGIN:VEVENT')
  righe.push(pieghaRiga('UID:' + uidICS(voce)))
  righe.push(pieghaRiga('DTSTAMP:' + formattaUTC(new Date())))
  if (usaOrario) {
    const fineMinuti = voce.fineMinuti != null ? voce.fineMinuti : voce.inizioMinuti + 60
    righe.push(pieghaRiga('DTSTART;TZID=Europe/Rome:' + formattaLocale(voce.inizio, voce.inizioMinuti)))
    righe.push(pieghaRiga('DTEND;TZID=Europe/Rome:' + formattaLocale(voce.inizio, fineMinuti)))
  } else {
    righe.push('DTSTART;VALUE=DATE:' + formattaSoloData(voce.inizio))
    righe.push('DTEND;VALUE=DATE:' + formattaSoloData(sommaGiorni(voce.inizio, 1)))
  }
  righe.push(pieghaRiga('SUMMARY:' + escapeICS(voce.titolo)))
  const descrizioneCompleta = [voce.descrizione, 'Pagina del progetto: ' + linkPaginaVoce(voce)]
    .filter(Boolean).join('\n\n')
  if (descrizioneCompleta) righe.push(pieghaRiga('DESCRIPTION:' + escapeICS(descrizioneCompleta)))
  const luogoTesto = luogoInUnaRiga(voce)
  if (luogoTesto) righe.push(pieghaRiga('LOCATION:' + escapeICS(luogoTesto)))
  righe.push('END:VEVENT')
  righe.push('END:VCALENDAR')
  return righe.join('\r\n') + '\r\n'
}

function scaricaICS(voce) {
  const testo = generaICS(voce)
  const blob = new Blob([testo], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeFileICS(voce)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ------------------------------------------------------------
// La legenda: due colori (tipo) e due stili (appuntamento vs periodo). I
// due colori sono già scritti in calendario.html; qui si aggiunge solo la
// voce che spiega il tratteggio, per non toccare l'HTML da questo file.
// ------------------------------------------------------------
function espandiLegenda() {
  const legenda = document.querySelector('.cal-legenda')
  if (!legenda || legenda.querySelector('.periodo')) return
  const voce = document.createElement('span')
  voce.innerHTML = '<i class="cal-pallino periodo" aria-hidden="true"></i> ' +
    'Tratteggio semitrasparente: periodo di un progetto senza ancora le date dei singoli incontri ' +
    '(i colori pieni sono appuntamenti con giorno e ora già fissati, e si possono scaricare su Outlook)'
  const nota = legenda.lastElementChild
  if (nota) legenda.insertBefore(voce, nota)
  else legenda.appendChild(voce)
}
document.addEventListener('DOMContentLoaded', espandiLegenda)
