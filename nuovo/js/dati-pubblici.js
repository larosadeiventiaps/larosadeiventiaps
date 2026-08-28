/**
 * Progetti, eventi e partner: dal gestionale, coi file come copia di sicurezza.
 *
 * ⭐⭐ **28/08/2026 — la Fase 5/6 del piano di collegamento al gestionale.**
 * Fino a ieri `js/main.js` leggeva `data/projects.json`, `data/events.json` e
 * `data/partners.json` direttamente, in 11 punti diversi. Da oggi quei punti
 * chiamano `caricaProgetti()`, `caricaEventi()`, `caricaPartner()` — definite
 * qui, UNA volta sola — che provano il gestionale (`rdv.nextum.it`) e
 * ripiegano sulla copia locale solo quando serve davvero. `js/main.js` non sa
 * più cosa sia un `fetch`: sa solo che gli arriva un elenco nella forma che
 * già conosceva (un array per EDIZIONE, come `data/projects.json` è sempre
 * stato) — la traduzione dalla forma del gestionale (un progetto con dentro
 * le sue edizioni) a quella del sito è tutta qui dentro, e in un posto solo:
 * spargerla nei punti che consumano i dati avrebbe voluto dire due traduzioni
 * diverse il giorno che una delle due cambia.
 *
 * ⛔⛔ **Che cosa succede quando il gestionale non dà niente da mostrare.**
 * Questa è la domanda più delicata di tutto il file, e la risposta non è
 * ovvia: un `[]` legittimo (il committente lo ricorda giusto: "non c'è
 * niente di pubblicato" NON è un guasto) e una richiesta che fallisce
 * finiscono nello STESSO posto — la copia locale, con l'avviso.
 *
 * Il motivo non è tecnico, è di continuità. Oggi (28/08/2026) il gestionale
 * risponde `[]` su TUTTO — nessun progetto è ancora stato marcato
 * "pubblicato" nel backoffice, nessuna edizione, nessun evento — perché la
 * migrazione dei contenuti storici nel gestionale è un lavoro a parte, non
 * ancora fatto. Se `[]` facesse mostrare un elenco vuoto, il sito pubblico
 * dell'associazione perderebbe TUTTI i suoi progetti ed eventi nel momento
 * stesso in cui questo codice va online — non per un guasto, ma per una
 * differenza fra "il gestionale non ha niente" e "il gestionale non ha
 * ancora niente perché non gliel'ha detto nessuno". Il browser non sa
 * distinguere le due cose (non c'è un campo che dica "la migrazione è
 * finita"), e la Fase 6 di questo lavoro è scritta a chiare lettere: "oggi
 * il sito non può svuotarsi". Fra i due errori possibili — mostrare la copia
 * quando servirebbe davvero un "non c'è ancora niente", o svuotare una
 * pagina pubblica che una famiglia sta guardando adesso — si è scelto il
 * primo, perché il secondo si vede subito e si vede male.
 *
 * ⚠️ Per questo `[]` non si tratta come un ERRORE (niente banner rosso, niente
 * `console.warn` allarmato: è una risposta legittima, e lo dice il commento
 * su `caricaConRipiego`) — si tratta solo come "niente di utile da mostrare
 * ORA", che per questa pagina pubblica equivale a "mostra la copia". Il
 * giorno in cui la migrazione sarà fatta e il gestionale avrà davvero
 * qualcosa di pubblicato, questa stessa regola farà apparire i dati veri da
 * sola — un progetto pubblicato smette di essere `[]`, e la copia lascia il
 * posto al dato vivo senza che nessuno debba toccare questo file.
 *
 * ⭐ **L'interruttore per tornare ai file** vive in `js/gestionale.js`
 * (`GESTIONALE_FONTE_DATI`), apposta accanto agli indirizzi: si cambia lì,
 * non qui.
 *
 * ⛔ **Fuori da questo file**: `data/gallery.json`, `data/hero.json`,
 * `data/direttivo.json`, `data/documenti.json` restano come sono, letti
 * solo dal file. Non per una dimenticanza: nessuna rotta pubblica del
 * gestionale oggi restituisce un elenco di fotografie con didascalia/data/
 * luogo (la sola rotta foto, `GET /pubblico/media/:id`, dà i BYTE di UNA
 * foto quando se ne conosce già l'identificativo — è quella che questo file
 * usa per le copertine dei progetti, vedi `urlMedia`), né un elenco del
 * direttivo o dei documenti. Fabbricare una galleria da identificativi nudi
 * e senza didascalia sarebbe una pagina peggiore di quella di oggi, non
 * migliore: si resta sulla copia finché una rotta vera non esiste.
 */
;(function () {
  'use strict';

  /** Nessun `js/gestionale.js` caricato prima di questo file: si legge sempre e solo la copia. */
  var BASE_API = window.GESTIONALE_API_PUBBLICA || '';
  var TIMEOUT_MS = window.GESTIONALE_TIMEOUT_MS || 6000;

  /**
   * `fetch` con un tetto di tempo. Senza, un gestionale che risponde
   * lentissimo lascerebbe la pagina in attesa a tempo indeterminato invece
   * di ripiegare sulla copia — il caso "api lentissima" del collaudo.
   */
  function fetchConTimeout(url, opzioni) {
    if (typeof AbortController === 'undefined') return fetch(url, opzioni);
    var controllore = new AbortController();
    var scaduto = setTimeout(function () { controllore.abort(); }, TIMEOUT_MS);
    var unite = Object.assign({}, opzioni, { signal: controllore.signal });
    return fetch(url, unite).finally(function () { clearTimeout(scaduto); });
  }

  function risposteJsonOk(res) {
    if (!res.ok) throw new Error('risposta ' + res.status + ' da ' + res.url);
    return res.json();
  }

  /** L'indirizzo dei byte di una foto già filtrata sui consensi (`Canale.SITO`). */
  function urlMedia(id) {
    return BASE_API + '/media/' + encodeURIComponent(id);
  }

  /**
   * Un rettangolo con un'icona, per le schede senza una foto scelta dal
   * gestionale (nessuna copertina, o un evento — la rotta eventi non porta
   * ancora un'immagine). ⛔ Non è una supposizione grafica nuova: stessa
   * idea del segnaposto "rosa dei venti" già in `main.js`
   * (`compassRosePlaceholder`) per il direttivo, qui semplificata perché
   * queste schede sono rettangolari, non tonde. Un `data:` non passa da
   * `conVersione` (lo salta apposta) e non ha bisogno di nessuna cache.
   */
  function segnapostoScheda(iconaEmoji) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">'
      + '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
      + '<stop offset="0" stop-color="#E8630A"/><stop offset="1" stop-color="#F4A460"/>'
      + '</linearGradient></defs>'
      + '<rect width="320" height="200" fill="url(#g)"/>'
      + '<text x="160" y="116" font-size="64" text-anchor="middle" dominant-baseline="middle">' + iconaEmoji + '</text>'
      + '</svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }
  var SEGNAPOSTO_PROGETTO = segnapostoScheda('📋');
  var SEGNAPOSTO_EVENTO = segnapostoScheda('🎉');

  /**
   * Stato di UN'edizione dalle sue date — **copia intenzionale** di
   * `statoEdizione` in `js/main.js`, non un richiamo a quella funzione.
   * Sono nove righe, e importarle legherebbe questo file all'ordine di
   * caricamento degli script (dovrebbe girare dopo `main.js`, mentre oggi
   * gira apposta prima, insieme a `gestionale.js`): stessa scelta già presa
   * in `eventi.service.ts` per `svuotabile`, duplicata invece che condivisa
   * fra due moduli paralleli. Se la regola cambia in un posto, va cambiata
   * anche qui — ma è un rischio piccolo per nove righe, contro un
   * accoppiamento fra file che oggi non c'è.
   */
  function statoDaDate(inizioStr, fineStr) {
    var oggi = new Date();
    var inizio = new Date(inizioStr);
    var fine = new Date(fineStr || inizioStr);
    fine.setHours(23, 59, 59, 999);
    if (oggi < inizio) return 'futuro';
    if (oggi > fine) return 'passato';
    return 'in_corso';
  }

  /* ---------------------------------------------------------------------
     Il caricatore comune: prova il gestionale, ripiega sulla copia.
     --------------------------------------------------------------------- */

  /** Una promessa per chiave, non una per chiamata: più funzioni di main.js chiedono
   *  la stessa sezione (progetti compare in 6 punti) e devono condividere UNA
   *  sola richiesta di rete, non ripeterla a ogni chiamata. */
  var cache = {};

  /** Il banner compare una volta sola per pagina, alla prima sezione che ripiega. */
  var avvisoMostrato = false;

  /**
   * ⛔ **Non disegna più niente in pagina** (28/08/2026). Fino a stamattina
   * questa funzione infilava in cima una fascia «questa pagina mostra
   * un'istantanea salvata». Il titolare: «in alcune pagine c'è una barra in
   * cima di avvertimento, toglila».
   *
   * ⚠️ Aveva ragione anche nei fatti, non solo nei gusti: **oggi il ripiego
   * non è un guasto, è la normalità**. Il gestionale risponde `[]` su tutto
   * finché non esce la versione nuova, quindi la fascia compariva su
   * praticamente ogni pagina — e un avviso che c'è sempre non avvisa di
   * niente: insegna solo a non leggerlo.
   *
   * ⚠️ Il segnale NON è sparito, è cambiato di posto: resta il `console.warn`
   * del guasto vero, qui sotto, e questa riga in console dice comunque quando
   * si sta guardando la copia. Chi deve diagnosticare lo vede; chi visita il
   * sito no.
   *
   * ⇒ Se un giorno servisse di nuovo dirlo in pagina, il posto è questo, ma la
   *   condizione dev'essere «il gestionale è GUASTO», non «sto usando la
   *   copia»: sono due cose diverse, e mescolarle è ciò che ha reso la fascia
   *   inutile.
   */
  function mostraAvviso() {
    if (avvisoMostrato) return;
    avvisoMostrato = true;
    console.info('[dati-pubblici] in uso la copia locale (data/*.json).');
  }

  /**
   * `chiave`: nome della sezione, per la cache condivisa.
   * `urlFile`: `data/*.json`, la copia.
   * `caricaDaApi`: funzione che prova il gestionale e torna un array già
   *   nella forma del sito, o solleva un'eccezione se il gestionale non ha
   *   risposto in modo utilizzabile.
   *
   * Ripiega sulla copia in TRE casi, trattati allo stesso modo per chi
   * guarda la pagina (vedi il commento in cima al file sul perché): un
   * guasto tecnico, l'interruttore su `'file'`, e un elenco legittimo ma
   * vuoto. Solo il primo si segnala con `console.warn`: gli altri due non
   * sono un problema di questo codice, e dirlo come se lo fosse
   * confonderebbe chi legge la console per davvero.
   */
  function caricaConRipiego(chiave, urlFile, caricaDaApi) {
    if (cache[chiave]) return cache[chiave];

    function daFile(motivo, dettaglio) {
      if (motivo === 'guasto') console.warn('[' + chiave + '] gestionale non raggiungibile, uso la copia locale:', dettaglio);
      mostraAvviso();
      return fetch(urlFile).then(risposteJsonOk);
    }

    var promessa;
    if (window.GESTIONALE_FONTE_DATI === 'file' || !BASE_API) {
      promessa = daFile('fonte-file');
    } else {
      promessa = caricaDaApi()
        .then(function (dati) {
          if (Array.isArray(dati) && dati.length > 0) return dati;
          // Vuoto ma senza errori: vedi il commento in cima al file.
          return daFile('vuoto');
        })
        .catch(function (errore) {
          return daFile('guasto', errore);
        });
    }

    cache[chiave] = promessa;
    return promessa;
  }

  /* ---------------------------------------------------------------------
     Progetti: l'api dà il progetto con dentro le sue edizioni; il sito
     lavora per edizione (una riga per anno, come data/projects.json).
     --------------------------------------------------------------------- */

  /**
   * `GET /pubblico/progetti` elenca i progetti pubblicati SENZA le edizioni
   * (solo i numeri aggregati) — le edizioni arrivano una per una da
   * `GET /pubblico/progetti/:slug`. Da qui il giro in due passi: prima
   * l'elenco (per avere gli `slug`), poi un dettaglio per progetto, in
   * parallelo. Con la ventina di progetti che l'associazione porta avanti è
   * un costo accettabile; se un domani diventassero centinaia meriterebbe
   * una rotta che desse già tutto in un colpo solo — non è questa la sede
   * per anticiparla.
   *
   * ⚠️ Il dettaglio di UN progetto che fallisce non deve far sparire tutti
   * gli altri: si scarta quel progetto solo, con un avviso in console, non
   * si rifiuta l'intera promessa.
   */
  function progettiDaApi() {
    return fetchConTimeout(BASE_API + '/progetti').then(risposteJsonOk).then(function (elenco) {
      if (!Array.isArray(elenco) || elenco.length === 0) return [];

      return Promise.all(elenco.map(function (riga) {
        return fetchConTimeout(BASE_API + '/progetti/' + encodeURIComponent(riga.slug))
          .then(risposteJsonOk)
          .catch(function (errore) {
            console.warn('[progetti] dettaglio non caricato per "' + riga.slug + '":', errore);
            return null;
          });
      })).then(function (dettagli) {
        var edizioni = [];
        dettagli.forEach(function (dettaglio) {
          if (!dettaglio || !Array.isArray(dettaglio.edizioni)) return;
          /*
            ⚠️ **Tre strade, in quest'ordine, e l'ordine è il contratto.**
            `copertinaMediaId` è l'immagine caricata nel gestionale e vince
            sempre; `copertinaUrl` è il percorso a un file che questo sito già
            serve — il ripiego con cui oggi vivono 29 progetti su 33; il
            segnaposto è l'ultima spiaggia.
            ⛔ Fino al 28/08/2026 qui c'erano solo la prima e la terza, e
            siccome nel gestionale **nessun progetto aveva una copertina**, il
            sito mostrava trentatré segnaposti identici. Il titolare, guardando
            la pagina: «non vedo le immagini dei progetti, come mai?».
          */
          var immagine = dettaglio.copertinaMediaId
            ? urlMedia(dettaglio.copertinaMediaId)
            : (dettaglio.copertinaUrl || SEGNAPOSTO_PROGETTO);
          dettaglio.edizioni.forEach(function (ed) {
            edizioni.push({
              title: dettaglio.titolo,
              image: immagine,
              startDate: ed.dal,
              endDate: ed.al,
              status: statoDaDate(ed.dal, ed.al),
              incontri: (ed.numeri && ed.numeri.incontri) || 0,
              ore: (ed.numeri && ed.numeri.ore) || 0,
              partecipanti: (ed.numeri && ed.numeri.partecipanti) || 0,
              description: dettaglio.descrizionePubblica || '',
              // ⚠️ Un solo partner per progetto nel gestionale (denominazione,
              // mai una persona): il sito porta `sponsor` come elenco, qui è
              // un elenco di zero o un elemento, mai di più.
              sponsor: dettaglio.partner ? [dettaglio.partner] : []
              // ⛔ Nessun `educatori`/`volontari`/`professionisti`/`collaboratori`:
              // il gestionale non li conta ancora per il canale pubblico. Le
              // schede che li leggono trattano un campo assente come zero e
              // non mostrano quella riga — vedi `renderNumeriProgetto` in
              // main.js: non è un dato mancante mostrato male, è un dato che
              // oggi non si può dire.
            });
          });
        });
        return edizioni;
      });
    });
  }

  /* ---------------------------------------------------------------------
     Eventi: GET /pubblico/eventi dà già un elenco piatto, un evento per riga.
     --------------------------------------------------------------------- */

  /**
   * ⚠️ La rotta pubblica degli eventi non porta un'immagine (`RigaEventoPubblico`
   * non ha un campo foto): ogni evento arriva col segnaposto. Il giorno in
   * cui il gestionale darà anche una copertina per evento, questa riga sola
   * cambia.
   */
  function eventiDaApi() {
    return fetchConTimeout(BASE_API + '/eventi').then(risposteJsonOk).then(function (righe) {
      if (!Array.isArray(righe)) return [];
      return righe.map(function (r) {
        return {
          title: r.titolo,
          // ⚠️ Come per i progetti: la copertina se c'è, il segnaposto se no.
          // `Evento.copertinaUrl` è arrivato il 28/08/2026 proprio perché senza
          // di lui accendere gli eventi avrebbe tolto le foto alla pagina.
          image: r.copertinaUrl || SEGNAPOSTO_EVENTO,
          startDate: r.dataInizio,
          endDate: r.dataFine,
          status: statoDaDate(r.dataInizio, r.dataFine),
          location: r.luogo || r.comune || '',
          description: r.descrizione || '',
          link: r.urlEsterno || null
        };
      });
    });
  }

  /* ---------------------------------------------------------------------
     Partner: rotta nuova, scritta da un altro agente in parallelo a questo
     lavoro. Contratto concordato: GET /pubblico/partner →
     [{ nome, tipo, descrizione, sito, logoUrl|null }].
     --------------------------------------------------------------------- */

  /**
   * ⚠️ Se questa rotta non risponde ancora (404, o la fetch fallisce e
   * basta) `caricaConRipiego` la tratta come un guasto qualunque: ripiega
   * sulla copia, avvisa, non rompe la pagina. Il codice qui sotto è scritto
   * sul CONTRATTO dichiarato, non contro una risposta vista dal vivo.
   */
  function partnerDaApi() {
    return fetchConTimeout(BASE_API + '/partner').then(risposteJsonOk).then(function (righe) {
      if (!Array.isArray(righe)) return [];
      return righe.map(function (r) {
        return {
          name: r.nome,
          type: r.tipo,
          description: r.descrizione || '',
          logo: r.logoUrl || null,
          url: r.sito || null
        };
      });
    });
  }

  /* ---------------------------------------------------------------------
     Le tre funzioni che js/main.js chiama davvero.
     --------------------------------------------------------------------- */

  window.caricaProgetti = function () { return caricaConRipiego('progetti', 'data/projects.json', progettiDaApi); };
  window.caricaEventi = function () { return caricaConRipiego('eventi', 'data/events.json', eventiDaApi); };
  window.caricaPartner = function () { return caricaConRipiego('partner', 'data/partners.json', partnerDaApi); };
})();
