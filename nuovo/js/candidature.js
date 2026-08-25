/**
 * Moduli di candidatura (volontario / educatore) in sostienici.html.
 *
 * ⭐ **Dal 25/08/2026 la candidatura arriva davvero nel gestionale.**
 * `POST /pubblico/candidature` su `rdv.nextum.it` la registra come
 * `Richiesta`, e il direttivo la trova nel proprio elenco. L'indirizzo sta in
 * `js/gestionale.js`, non qui: vedi il commento in cima a quel file.
 *
 * ⭐⭐ **Il curriculum parte davvero, adesso.** Prima non poteva: l'email
 * precompilata sa scrivere il testo ma non sa allegare un file, e il modulo
 * chiedeva al candidato di allegarlo a mano — un passaggio che una persona su
 * due dimentica. Per questo l'invio al server usa `FormData` e non JSON: il
 * campo `cv` è il file, non il suo nome. ⚠️ L'api accetta **solo PDF, .doc e
 * .docx fino a 5 MB** (`DIMENSIONE_MASSIMA_CV`), e un file diverso lo
 * rifiuta con 400: qui sotto lo si controlla PRIMA di partire, così chi
 * compila legge un motivo invece di un ripiego inspiegabile.
 *
 * ⛔ **L'email resta, come ripiego, e non è un dettaglio.** Se la rete non
 * c'è, se il gestionale è fermo, o se l'origine di questa pagina non è fra
 * quelle ammesse dall'api, la `fetch` fallisce nel browser: allora si apre il
 * programma di posta, come prima. Un modulo che dice «inviata» senza che
 * nessuno l'abbia ricevuta è la bugia peggiore che questa pagina possa dire.
 *
 * ⚠️ **Il caso che il ripiego non copre**: la richiesta parte, il server la
 * registra, e la risposta si perde per strada (o la scarta il browser perché
 * manca l'intestazione CORS). Allora si apre anche l'email, e la stessa
 * candidatura arriva due volte. Fra due copie e nessuna copia si è scelto
 * due copie — ma è il motivo per cui `ORIGINI_CONSENTITE` va tenuta giusta
 * sul server, non un dettaglio di configurazione.
 */
;(function () {
  'use strict';

  // L'indirizzo vive in js/gestionale.js. Se quel file non si è caricato la
  // costante resta vuota e si passa dall'email, cioè il comportamento che
  // questo modulo ha avuto fino al 25/08/2026.
  var API_CANDIDATURE = window.GESTIONALE_API_PUBBLICA
    ? window.GESTIONALE_API_PUBBLICA + '/candidature'
    : '';

  /** Gli stessi limiti che l'api applica: qui servono per dirlo prima, non dopo. */
  var CV_DIMENSIONE_MASSIMA = 5 * 1024 * 1024;
  var CV_ESTENSIONI = ['.pdf', '.doc', '.docx'];

  var EMAIL_DESTINATARIO = 'info@larosadeiventiaps.org';

  var ETICHETTE_ERRORE = {
    obbligatorio: 'Questo campo è obbligatorio.',
    email: 'Scrivi un indirizzo email valido.',
    consenso: "Devi accettare l'informativa per continuare.",
    curriculum: 'Scegli il file del tuo curriculum.',
    curriculumFormato: 'Il curriculum deve essere un PDF o un file Word (.pdf, .doc, .docx).',
    curriculumGrande: 'Il curriculum supera i 5 MB: mandane una versione più leggera.'
  };

  function emailValida(v) {
    // Controllo semplice, non una validazione RFC completa: basta scartare
    // i refusi più comuni prima di aprire il programma di posta.
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || '').trim());
  }

  function estensioneAmmessa(nome) {
    var minuscolo = (nome || '').toLowerCase();
    for (var i = 0; i < CV_ESTENSIONI.length; i++) {
      if (minuscolo.slice(-CV_ESTENSIONI[i].length) === CV_ESTENSIONI[i]) return true;
    }
    return false;
  }

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

  /**
   * Valida i campi con `data-obbligatorio` dentro `form`. Torna il primo
   * campo non valido (per portarci il fuoco), o `null` se va tutto bene.
   * Gli errori si scrivono accanto al campo (non in un avviso in cima),
   * con `aria-invalid`/`aria-describedby` già collegati nell'HTML.
   */
  function valida(form) {
    var primoNonValido = null;
    var campi = form.querySelectorAll('[data-obbligatorio]');

    campi.forEach(function (campo) {
      var valido, messaggio;

      if (campo.type === 'checkbox') {
        valido = campo.checked;
        messaggio = ETICHETTE_ERRORE.consenso;
      } else if (campo.type === 'file') {
        // ⚠️ Tre controlli distinti, tre messaggi distinti: «file non valido»
        // non dice se manca, se pesa troppo o se è del tipo sbagliato, e chi
        // legge riprova a caso.
        var file = campo.files && campo.files[0];
        if (!file) {
          valido = false;
          messaggio = ETICHETTE_ERRORE.curriculum;
        } else if (!estensioneAmmessa(file.name)) {
          valido = false;
          messaggio = ETICHETTE_ERRORE.curriculumFormato;
        } else if (file.size > CV_DIMENSIONE_MASSIMA) {
          valido = false;
          messaggio = ETICHETTE_ERRORE.curriculumGrande;
        } else {
          valido = true;
        }
      } else if (campo.type === 'email') {
        valido = emailValida(campo.value);
        messaggio = campo.value.trim() ? ETICHETTE_ERRORE.email : ETICHETTE_ERRORE.obbligatorio;
      } else {
        valido = campo.value.trim().length > 0;
        messaggio = ETICHETTE_ERRORE.obbligatorio;
      }

      impostaErrore(campo, valido ? '' : messaggio);
      if (!valido && !primoNonValido) primoNonValido = campo;
    });

    return primoNonValido;
  }

  function raccogliDati(form) {
    var dati = {};
    form.querySelectorAll('[name]').forEach(function (campo) {
      if (campo.type === 'checkbox') dati[campo.name] = campo.checked;
      else if (campo.type === 'file') dati[campo.name] = campo.files[0] ? campo.files[0].name : '';
      else dati[campo.name] = campo.value.trim();
    });
    return dati;
  }

  function costruisciMailto(dati, tipo) {
    var oggetto = tipo === 'educatore' ? 'Candidatura educatore' : 'Candidatura volontario';
    oggetto += dati.nome || dati.cognome ? ' — ' + [dati.nome, dati.cognome].filter(Boolean).join(' ') : '';

    var righe = [
      'Nome: ' + (dati.nome || ''),
      'Cognome: ' + (dati.cognome || ''),
      'Email: ' + (dati.email || ''),
      'Telefono: ' + (dati.telefono || ''),
      '',
      'Presentazione:',
      dati.presentazione || ''
    ];

    if (tipo === 'educatore') {
      righe.push('');
      righe.push('⚠️ RICORDATI DI ALLEGARE QUI IL CURRICULUM (' + (dati.curriculum || 'il file scelto') + ') prima di inviare — il modulo non può farlo da solo.');
    }

    righe.push('');
    righe.push('— Inviato dal modulo "' + (tipo === 'educatore' ? 'Diventa educatore' : 'Diventa volontario') + '" del sito larosadeiventiaps.org');

    var corpo = righe.join('\n');
    return 'mailto:' + EMAIL_DESTINATARIO
      + '?subject=' + encodeURIComponent(oggetto)
      + '&body=' + encodeURIComponent(corpo);
  }

  /** Il file scelto, se il modulo ne ha uno. È l'unica cosa che l'email non sa portare. */
  function fileCv(form) {
    var campo = form.querySelector('input[type="file"]');
    return campo && campo.files ? campo.files[0] : null;
  }

  /**
   * Il corpo della richiesta al gestionale: `FormData`, non JSON, perché
   * porta anche il file. I nomi dei campi sono quelli che l'api si aspetta
   * (`CreaCandidaturaDto`), e `ruolo` è la sola cosa che il modulo non chiede
   * a chi compila: la dice il modulo stesso, con `data-tipo`.
   */
  function corpoPerIlServer(dati, tipo, file) {
    var corpo = new FormData();
    // ⚠️ MAIUSCOLO: l'api ammette solo 'VOLONTARIO' e 'EDUCATORE'
    // (`RUOLI_CANDIDATURA`). In minuscolo risponde 400 «ruolo: valore non
    // valido» — sbagliato la prima volta, e visto solo perché la prova è
    // stata fatta contro il server vero invece che a mente.
    corpo.append('ruolo', tipo === 'educatore' ? 'EDUCATORE' : 'VOLONTARIO');
    corpo.append('nome', dati.nome || '');
    corpo.append('cognome', dati.cognome || '');
    corpo.append('email', dati.email || '');
    if (dati.telefono) corpo.append('telefono', dati.telefono);
    corpo.append('presentazione', dati.presentazione || '');
    corpo.append('consenso', dati.consenso ? 'true' : 'false');
    if (file) corpo.append('cv', file, file.name);
    return corpo;
  }

  /**
   * Prova prima il gestionale; l'email è il ripiego, non l'alternativa.
   *
   * ⚠️ **Un solo `catch` per tutto sarebbe sbagliato.** Un 400 («il file non
   * va bene») è colpa di ciò che è stato scritto e va detto a chi compila; un
   * 500 o una rete assente non sono colpa di nessuno e vanno ripiegati
   * sull'email. Trattandoli uguali si manderebbe una persona a riscrivere la
   * stessa candidatura per posta, con lo stesso file che il server rifiuta.
   */
  function inviaCandidatura(dati, tipo, file) {
    var mailtoUrl = costruisciMailto(dati, tipo);

    // ⛔ **Il volontario passa ancora dall'email, e non e' una svista.**
    // `POST /pubblico/candidature` pretende il CV **per qualunque ruolo**
    // (`richieste.service.ts`, e c'e' un test che lo fissa). Al volontario
    // questo sito il curriculum non lo chiede — «raccontaci due cose di te»
    // — quindi la richiesta tornerebbe 400 e chi ha compilato leggerebbe in
    // faccia «cv: nessun file allegato». Misurato sul sito vero il
    // 25/08/2026. Quando l'api rendera' il CV obbligatorio solo per
    // l'educatore, si toglie questa riga e basta.
    if (!file) {
      window.location.href = mailtoUrl;
      return Promise.resolve({ viaEmail: true });
    }

    if (!API_CANDIDATURE) {
      window.location.href = mailtoUrl;
      return Promise.resolve({ viaEmail: true });
    }

    return fetch(API_CANDIDATURE, {
      method: 'POST',
      // ⛔ Nessun `Content-Type` scritto a mano: con `FormData` lo mette il
      // browser, e ci aggiunge il `boundary`. Scrivendolo qui il confine
      // sparirebbe e il server non troverebbe nessun campo.
      body: corpoPerIlServer(dati, tipo, file)
    }).then(function (res) {
      if (res.ok) return { viaEmail: false };
      if (res.status === 429) {
        return { viaEmail: false, errore: 'Troppi invii da questo collegamento in poco tempo: riprova fra qualche minuto.' };
      }
      if (res.status >= 400 && res.status < 500) {
        return res.text().then(function (testo) {
          return { viaEmail: false, errore: messaggioDalServer(testo) };
        });
      }
      throw new Error('risposta ' + res.status);
    }).catch(function () {
      window.location.href = mailtoUrl;
      return { viaEmail: true };
    });
  }

  /** Il messaggio dell'api se c'è, altrimenti una frase che non finge di sapere. */
  function messaggioDalServer(testo) {
    try {
      var corpo = JSON.parse(testo);
      var m = corpo && corpo.message;
      if (Array.isArray(m)) return m.join(' ');
      if (typeof m === 'string' && m) return m;
    } catch (e) { /* non era JSON: si usa la frase generica */ }
    return 'Qualcosa nei dati non è stato accettato: ricontrolla i campi e riprova.';
  }

  function mostraEsito(form, risultato) {
    var esitoEl = form.querySelector('.modulo-esito');
    if (!esitoEl) return;
    esitoEl.classList.remove('ok', 'errore');

    if (risultato.errore) {
      esitoEl.textContent = '⚠️ ' + risultato.errore;
      esitoEl.classList.add('errore');
    } else if (risultato.viaEmail) {
      esitoEl.textContent = '✉️ Si è aperto (o sta per aprirsi) il tuo programma di posta con l\'email già pronta verso ' + EMAIL_DESTINATARIO + '. Controlla che sia partita: è quel passaggio che ci fa arrivare davvero la tua candidatura.';
      esitoEl.classList.add('ok');
    } else {
      esitoEl.textContent = '✅ Candidatura ricevuta: grazie. Ti risponderemo al più presto.';
      esitoEl.classList.add('ok');
    }
    esitoEl.classList.add('visibile');
  }

  function inizializza(form) {
    var tipo = form.dataset.tipo;

    form.addEventListener('submit', function (evento) {
      evento.preventDefault();

      var esitoEl = form.querySelector('.modulo-esito');
      if (esitoEl) esitoEl.classList.remove('visibile', 'ok', 'errore');

      var primoNonValido = valida(form);
      if (primoNonValido) {
        primoNonValido.focus();
        return;
      }

      var dati = raccogliDati(form);
      var file = fileCv(form);
      var bottone = form.querySelector('button[type="submit"]');
      if (bottone) bottone.disabled = true;

      inviaCandidatura(dati, tipo, file).then(function (risultato) {
        mostraEsito(form, risultato);
        if (bottone) bottone.disabled = false;
        // Il modulo si svuota solo quando la candidatura è arrivata davvero:
        // dopo un ripiego sull'email i dati servono ancora, perché il
        // programma di posta potrebbe non essersi aperto.
        if (!risultato.viaEmail && !risultato.errore) form.reset();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.modulo-candidatura[data-tipo]').forEach(inizializza);
  });
})();
