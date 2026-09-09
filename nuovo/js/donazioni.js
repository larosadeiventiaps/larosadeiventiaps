/**
 * Il modulo di donazione con carta, in sostienici.html.
 *
 * ⛔ **Il ripiego non e' l'email, ed e' la differenza principale con
 * `js/candidature.js`.** Una candidatura che non arriva al server si puo'
 * sempre mandare per posta, e lo fa da sola. Una donazione no — non si dona
 * per email: nessuno scrive un bonifico dentro un messaggio. Per questo, se
 * il gestionale non risponde, qui non si apre nessun programma di posta: il
 * modulo si nasconde e resta il testo del bonifico bancario, che sta gia' li'
 * accanto e arriva allo stesso conto. Un modulo che dice «grazie» (o anche
 * solo «inviato») senza che nessuno abbia incassato davvero e' la bugia
 * peggiore che questa pagina possa dire — e per questo il ringraziamento non
 * vive qui: vive in `grazie.html`, DOPO il pagamento vero su Stripe.
 *
 * ⭐ **Il modulo compare solo se il gestionale conferma che si puo' incassare
 * davvero.** All'apertura della pagina si chiama `GET /configurazione`
 * (rotta pubblica dal Task 13, che finora nessuno leggeva): solo con
 * `donazioniConCarta: true` il riquadro «Prossimamente» lascia il posto al
 * modulo. Se quella chiamata fallisce, va in timeout, o risponde `false`, il
 * riquadro «Prossimamente» resta esattamente com'era — MAI un pulsante che
 * porta a un errore del fornitore (chiavi di Stripe ancora di prova, o
 * gestionale irraggiungibile: per questa pagina sono la stessa cosa).
 *
 * ⚠️ **Un solo DTO, due rami, mai i due insieme.** Come il modulo lato
 * server (`CreaDonazioneDto`): una donazione «Persona» manda
 * nome/cognome/codiceFiscale, una «Azienda o ente» manda
 * denominazione/partitaIva, e il server rifiuta con 400 se arrivano i campi
 * dell'altro ramo — quindi da qui parte SOLO il ramo scelto.
 *
 * ⭐ **Questo file serve anche `grazie.html`.** Non un secondo file: la
 * pagina di ritorno da Stripe legge solo `?esito=ok|annullato` dall'indirizzo
 * (`verificaEsitoDonazione`, in fondo), un pezzo cosi' piccolo che un file a
 * parte avrebbe voluto dire duplicare la testata invece di condividerla.
 * ⛔ Il ringraziamento vive SOLO li', mai in questo modulo: vedi la funzione
 * `ripiegaSulBonifico` piu' sotto per il perche' un invio non e' un incasso.
 */
;(function () {
  'use strict';

  // Gli indirizzi vivono in js/gestionale.js. Se quel file non si e' caricato
  // le costanti restano vuote: il modulo non prova nemmeno ad accendersi, e
  // resta il riquadro «Prossimamente» di sempre.
  var API_CONFIGURAZIONE = window.GESTIONALE_API_PUBBLICA ? window.GESTIONALE_API_PUBBLICA + '/configurazione' : '';
  var API_DONAZIONI = window.GESTIONALE_API_PUBBLICA ? window.GESTIONALE_API_PUBBLICA + '/donazioni' : '';
  var TIMEOUT_MS = window.GESTIONALE_TIMEOUT_MS || 6000;

  /**
   * Gli stessi confini che il server applica (`DonazioniService`,
   * `IMPORTO_MINIMO`/`IMPORTO_MASSIMO`): qui servono per dirlo PRIMA, non
   * dopo un rifiuto. Non c'e' un pacchetto condiviso fra questo sito e
   * l'api: se quei valori cambiano lato server, vanno cambiati anche qui.
   */
  var IMPORTO_MINIMO = '5.00';
  var IMPORTO_MASSIMO = '5000.00';

  var ETICHETTE_ERRORE = {
    obbligatorio: 'Questo campo e\' obbligatorio.',
    email: 'Scrivi un indirizzo email valido.',
    codiceFiscale: 'Il codice fiscale deve avere 16 caratteri.',
    partitaIva: 'La partita IVA deve avere 11 cifre.',
    importo: 'Scrivi un importo fra ' + formattaEuro(IMPORTO_MINIMO) + ' e ' + formattaEuro(IMPORTO_MASSIMO) + '.'
  };

  /**
   * ⛔ Convenzione del titolare, in ogni ambito e ogni contesto: simbolo
   * davanti, separatore delle migliaia, due decimali — "€ 5.000,00", mai
   * "€ 5000,00". Trovato dal revisore: mancava il separatore delle migliaia,
   * e il messaggio d'errore sull'importo massimo contraddiceva il testo
   * statico accanto al campo ("massimo € 5.000,00"), che lo scrive giusto a
   * mano. `importo` arriva gia' a due decimali col punto (es. "5000.00"): qui
   * si aggiunge il separatore sulla parte intera, poi si passa alla virgola.
   */
  function formattaEuro(importo) {
    var parti = importo.split('.');
    var interi = parti[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return '€ ' + interi + ',' + parti[1];
  }

  function emailValida(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || '').trim());
  }

  /**
   * Un importo scritto a mano (virgola o punto, "10" o "10,50") nella forma
   * canonica a due decimali che il server si aspetta, o `null` se non e' un
   * numero leggibile. ⚠️ Il confronto coi confini si fa in CENTESIMI INTERI
   * (`centesimiDaStringa`), mai in virgola mobile: stessa ragione per cui lo
   * fa `DonazioniService.apri` lato server.
   */
  function normalizzaImporto(grezzo) {
    var pulito = (grezzo || '').toString().trim().replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(pulito)) return null;
    var numero = Number(pulito);
    if (!isFinite(numero) || numero <= 0) return null;
    return numero.toFixed(2);
  }

  function centesimiDaStringa(importo) {
    var parti = importo.split('.');
    return Number(parti[0]) * 100 + Number(parti[1]);
  }

  function importoNelConfine(importoADueDecimali) {
    var centesimi = centesimiDaStringa(importoADueDecimali);
    return centesimi >= centesimiDaStringa(IMPORTO_MINIMO) && centesimi <= centesimiDaStringa(IMPORTO_MASSIMO);
  }

  /**
   * `fetch` con un tetto di tempo — stessa forma di `js/dati-pubblici.js`
   * (`fetchConTimeout`), duplicata apposta: due file paralleli, stessa
   * piccola funzione, nessun accoppiamento fra l'ordine in cui si caricano.
   */
  function fetchConTimeout(url, opzioni) {
    if (typeof AbortController === 'undefined') return fetch(url, opzioni);
    var controllore = new AbortController();
    var scaduto = setTimeout(function () { controllore.abort(); }, TIMEOUT_MS);
    var unite = Object.assign({}, opzioni, { signal: controllore.signal });
    return fetch(url, unite).finally(function () { clearTimeout(scaduto); });
  }

  /* ---------------------------------------------------------------------
     L'interruttore: il modulo compare solo con donazioniConCarta === true.
     --------------------------------------------------------------------- */

  function mostraIlModulo() {
    var scheda = document.getElementById('carta-dona-online');
    var prossimamente = document.getElementById('dona-carta-prossimamente');
    var form = document.getElementById('modulo-donazione');
    if (!scheda || !prossimamente || !form) return;

    scheda.classList.remove('coming-soon-box');
    prossimamente.hidden = true;
    form.hidden = false;
  }

  function verificaInterruttore() {
    if (!API_CONFIGURAZIONE) return; // gestionale.js non caricato: resta «Prossimamente».

    fetchConTimeout(API_CONFIGURAZIONE)
      .then(function (res) {
        if (!res.ok) throw new Error('risposta ' + res.status);
        return res.json();
      })
      .then(function (config) {
        if (config && config.donazioniConCarta === true) mostraIlModulo();
        // `false`, o una risposta senza quel campo: si resta su «Prossimamente»,
        // senza avviso — non e' un guasto, e' lo stato normale finche' il
        // direttivo non ha chiavi Stripe vive (vedi il commento in cima al file).
      })
      .catch(function () {
        // Il gestionale non risponde: stesso comportamento del ramo sopra.
        // Nessun errore mostrato: il riquadro «Prossimamente» e' gia' la
        // risposta onesta, e non e' un guasto di questa pagina.
      });
  }

  /* ---------------------------------------------------------------------
     Il modulo: la scelta Persona/Azienda, la validazione, l'invio.
     --------------------------------------------------------------------- */

  function impostaErrore(campo, messaggio) {
    var erroreEl = document.getElementById(campo.id + '-errore');
    if (messaggio) {
      campo.setAttribute('aria-invalid', 'true');
      if (erroreEl) erroreEl.textContent = '⚠️ ' + messaggio;
    } else {
      campo.removeAttribute('aria-invalid');
      if (erroreEl) erroreEl.textContent = '';
    }
  }

  function tipoAttivo(form) {
    var bottone = form.querySelector('.dona-tipo-btn.attivo');
    return bottone ? bottone.dataset.tipoDonatore : 'PERSONA';
  }

  /**
   * Valida SOLO i campi del ramo scelto (`data-per`, quando c'e') piu' i
   * campi comuni (email, importo). I campi dell'altro ramo — nascosti, e
   * per questo non chiesti — restano senza errore: e' la stessa coerenza
   * che il DTO server impone con `ValidateIf`.
   */
  function valida(form) {
    var tipo = tipoAttivo(form);
    var primoNonValido = null;

    form.querySelectorAll('[data-obbligatorio]').forEach(function (campo) {
      if (campo.dataset.per && campo.dataset.per !== tipo) {
        impostaErrore(campo, ''); // il ramo non scelto non deve portarsi dietro un errore vecchio.
        return;
      }

      var valido, messaggio;

      if (campo.id === 'dona-email') {
        valido = emailValida(campo.value);
        messaggio = campo.value.trim() ? ETICHETTE_ERRORE.email : ETICHETTE_ERRORE.obbligatorio;
      } else if (campo.id === 'dona-importo') {
        var normalizzato = normalizzaImporto(campo.value);
        valido = !!normalizzato && importoNelConfine(normalizzato);
        messaggio = campo.value.trim() ? ETICHETTE_ERRORE.importo : ETICHETTE_ERRORE.obbligatorio;
      } else if (campo.id === 'dona-cf') {
        // Controllo leggero (16 caratteri): la validazione vera — cifra di
        // controllo compresa — la fa il server, che sa gia' rispondere con
        // un messaggio leggibile se e' sbagliata.
        valido = campo.value.trim().length === 16;
        messaggio = campo.value.trim() ? ETICHETTE_ERRORE.codiceFiscale : ETICHETTE_ERRORE.obbligatorio;
      } else if (campo.id === 'dona-piva') {
        valido = /^\d{11}$/.test(campo.value.trim());
        messaggio = campo.value.trim() ? ETICHETTE_ERRORE.partitaIva : ETICHETTE_ERRORE.obbligatorio;
      } else {
        valido = campo.value.trim().length > 0;
        messaggio = ETICHETTE_ERRORE.obbligatorio;
      }

      impostaErrore(campo, valido ? '' : messaggio);
      if (!valido && !primoNonValido) primoNonValido = campo;
    });

    return primoNonValido;
  }

  /** Il corpo di `POST /donazioni`: SOLO i campi del ramo scelto, mai l'altro. */
  function costruisciDto(form) {
    var tipo = tipoAttivo(form);
    var dto = {
      tipoDonatore: tipo,
      email: form.querySelector('#dona-email').value.trim(),
      importo: normalizzaImporto(form.querySelector('#dona-importo').value)
    };

    if (tipo === 'PERSONA') {
      dto.nome = form.querySelector('#dona-nome').value.trim();
      dto.cognome = form.querySelector('#dona-cognome').value.trim();
      dto.codiceFiscale = form.querySelector('#dona-cf').value.trim().toUpperCase();
    } else {
      dto.denominazione = form.querySelector('#dona-denominazione').value.trim();
      dto.partitaIva = form.querySelector('#dona-piva').value.trim();
    }

    return dto;
  }

  /** Il messaggio dell'api se c'e', altrimenti una frase che non finge di sapere. */
  function messaggioDalServer(testo) {
    try {
      var corpo = JSON.parse(testo);
      var m = corpo && corpo.message;
      if (Array.isArray(m)) return m.join(' ');
      if (typeof m === 'string' && m) return m;
    } catch (e) { /* non era JSON: si usa la frase generica */ }
    return 'Qualcosa nei dati non e\' stato accettato: ricontrolla i campi e riprova.';
  }

  function mostraErrore(form, messaggio) {
    var esitoEl = form.querySelector('#donazione-esito');
    if (!esitoEl) return;
    esitoEl.textContent = '⚠️ ' + messaggio;
    esitoEl.classList.remove('ok');
    esitoEl.classList.add('errore', 'visibile');
  }

  /**
   * ⛔ **Il ripiego onesto.** Chiamata solo quando il gestionale non
   * risponde affatto (rete assente, timeout, o un errore che non e' un
   * rifiuto dei dati) DOPO che il modulo era gia' comparso: si nasconde il
   * modulo intero e si mostra la frase accanto, che rimanda al bonifico —
   * MAI un mailto, MAI un «grazie» non guadagnato.
   */
  function ripiegaSulBonifico(form) {
    form.hidden = true;
    var fallback = document.getElementById('donazione-fallback');
    if (fallback) fallback.classList.add('visibile');
  }

  function inizializza(form) {
    var bottoniTipo = form.querySelectorAll('.dona-tipo-btn');
    var campiPersona = document.getElementById('dona-campi-persona');
    var campiAzienda = document.getElementById('dona-campi-azienda');

    bottoniTipo.forEach(function (bottone) {
      bottone.addEventListener('click', function () {
        bottoniTipo.forEach(function (b) {
          var attivo = b === bottone;
          b.classList.toggle('attivo', attivo);
          b.setAttribute('aria-pressed', attivo ? 'true' : 'false');
        });
        var tipo = bottone.dataset.tipoDonatore;
        campiPersona.hidden = tipo !== 'PERSONA';
        campiAzienda.hidden = tipo !== 'ORGANIZZAZIONE';
        // ⛔ Solo PULIZIA del ramo appena nascosto, MAI una validazione
        // piena qui: chiamare `valida(form)` accendeva «obbligatorio» sui
        // campi del ramo appena mostrato, MAI toccati — misurato dal vivo
        // il 09/09/2026 passando a «Azienda o ente» su un modulo vuoto.
        (tipo === 'PERSONA' ? campiAzienda : campiPersona)
          .querySelectorAll('[data-obbligatorio]')
          .forEach(function (campo) { impostaErrore(campo, ''); });
        var esitoEl = form.querySelector('#donazione-esito');
        if (esitoEl) esitoEl.classList.remove('visibile', 'ok', 'errore');
      });
    });

    form.addEventListener('submit', function (evento) {
      evento.preventDefault();

      var esitoEl = form.querySelector('#donazione-esito');
      if (esitoEl) esitoEl.classList.remove('visibile', 'ok', 'errore');

      var primoNonValido = valida(form);
      if (primoNonValido) {
        primoNonValido.focus();
        return;
      }

      var dto = costruisciDto(form);
      var bottone = form.querySelector('button[type="submit"]');
      if (bottone) bottone.disabled = true;

      fetchConTimeout(API_DONAZIONI, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto)
      }).then(function (res) {
        if (res.ok) {
          return res.json().then(function (corpo) {
            if (!corpo || typeof corpo.url !== 'string' || !corpo.url) {
              // Risposta 2xx ma senza un indirizzo dove andare: non e' un
              // caso previsto dal contratto, e non si puo' fingere che lo sia.
              throw new Error('risposta senza url');
            }
            window.location.href = corpo.url; // via da qui: Stripe, poi grazie.html.
          });
        }
        if (res.status === 429) {
          // Stessa scelta di js/candidature.js: un messaggio fisso e
          // leggibile, senza dipendere dalla frase esatta che il server
          // manda oggi (`MESSAGGIO_TROPPI_TENTATIVI` in donazioni.service.ts).
          mostraErrore(form, 'Troppi tentativi di donazione da questa connessione: riprova fra qualche minuto.');
          if (bottone) bottone.disabled = false;
          return;
        }
        if (res.status === 400) {
          // ⚠️ SOLO 400, non «ogni 4xx»: e' l'unico rifiuto dei dati che il
          // contratto dichiara (`CreaDonazioneDto`, i rami e i confini
          // dell'importo). Misurato contro il server vero il 09/09/2026 con
          // una chiave Stripe finta: una sessione che il gateway rifiuta
          // torna 401 col messaggio GREZZO del fornitore
          // ("Invalid API Key provided: ..."), che non e' un errore di
          // quello che il donatore ha scritto e non si ripara riscrivendo i
          // campi. Trattarlo come i 400 mostrerebbe a chi dona un messaggio
          // tecnico invitandolo a un tentativo che non puo' riuscire: e'
          // esattamente il caso per cui il modulo deve nascondersi (sotto).
          return res.text().then(function (testo) {
            mostraErrore(form, messaggioDalServer(testo));
            if (bottone) bottone.disabled = false;
          });
        }
        // Ogni altro codice (401/403/404/5xx compresi): non e' un rifiuto
        // dei dati che il contratto preveda, quindi non e' colpa di quello
        // che il donatore ha scritto. Stesso trattamento della rete
        // assente: vedi ripiegaSulBonifico.
        throw new Error('risposta ' + res.status);
      }).catch(function (errore) {
        // Se l'errore e' gia' stato mostrato sopra (400/429 gestiti nel
        // `.then`), questo `catch` non ci arriva: qui cadono solo la rete
        // assente, il timeout e i 5xx rilanciati apposta.
        if (bottone) bottone.disabled = false;
        ripiegaSulBonifico(form);
      });
    });
  }

  /* ---------------------------------------------------------------------
     grazie.html: legge SOLO ?esito=ok|annullato. Vedi il commento in cima
     al file sul perche' questa pagina, e non il modulo, dice «grazie».
     --------------------------------------------------------------------- */

  function verificaEsitoDonazione() {
    var contenitore = document.getElementById('pagina-esito');
    if (!contenitore) return; // non siamo su grazie.html

    var parametri = new URLSearchParams(window.location.search);
    var esito = parametri.get('esito');

    var icona = document.getElementById('pagina-esito-icona');
    var titolo = document.getElementById('pagina-esito-titolo');
    var testo = document.getElementById('pagina-esito-testo');
    var nota = document.getElementById('pagina-esito-nota');

    if (esito === 'ok') {
      document.title = 'Grazie! — La Rosa dei Venti APS';
      if (icona) icona.textContent = '✅';
      if (titolo) titolo.textContent = 'Grazie di cuore!';
      if (testo) testo.textContent = 'La tua donazione è arrivata. Ogni euro diventa un laboratorio, un\'uscita, un fine settimana per i nostri ragazzi.';
      if (nota) nota.hidden = false;
    } else if (esito === 'annullato') {
      document.title = 'Donazione annullata — La Rosa dei Venti APS';
      if (icona) icona.textContent = '↩️';
      if (titolo) titolo.textContent = 'Nessun addebito';
      if (testo) testo.textContent = 'Hai interrotto il pagamento: non ti è stato addebitato nulla. Se vuoi riprovare, il modulo è ancora lì dove l\'hai lasciato.';
      if (nota) nota.hidden = true;
    }
    // Nessun parametro riconosciuto: resta il testo di ripiego gia' scritto
    // in grazie.html, che non dichiara ne' un successo ne' un annullamento.
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('modulo-donazione');
    if (form) {
      inizializza(form);
      verificaInterruttore();
    }
    verificaEsitoDonazione();
  });
})();
