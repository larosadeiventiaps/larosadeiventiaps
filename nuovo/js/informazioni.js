/**
 * Il modulo «Scrivici» di contatti.html.
 *
 * ⛔ **Che cosa c'era prima, e perché era peggio di niente.** Il modulo
 * puntava a `https://formspree.io/f/YOUR_FORM_ID`: un segnaposto mai
 * sostituito, rimasto dal modello da cui il sito è nato. Chi lo compilava
 * veniva portato su una pagina d'errore di un servizio terzo, e il messaggio
 * non arrivava a nessuno. Nessun errore da questa parte, nessuna traccia:
 * l'associazione non poteva nemmeno sapere quante persone avevano scritto.
 *
 * ⭐ Dal 25/08/2026 il messaggio va a `POST /pubblico/informazioni` sul
 * gestionale, che lo registra come `Richiesta` e lo fa comparire nell'elenco
 * del direttivo. L'indirizzo sta in `js/gestionale.js`.
 *
 * ⛔ **Il ripiego è l'email precompilata**, come nei moduli di candidatura:
 * se il gestionale non risponde si apre il programma di posta col messaggio
 * già scritto. Un modulo che dice «inviato» e non ha inviato niente è il
 * difetto da cui questa pagina viene.
 */
;(function () {
  'use strict';

  var API_INFORMAZIONI = window.GESTIONALE_API_PUBBLICA
    ? window.GESTIONALE_API_PUBBLICA + '/informazioni'
    : '';

  var EMAIL_DESTINATARIO = 'info@larosadeiventiaps.org';

  var ETICHETTE_ERRORE = {
    obbligatorio: 'Questo campo è obbligatorio.',
    email: 'Scrivi un indirizzo email valido.',
    consenso: "Devi accettare l'informativa per continuare."
  };

  function emailValida(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || '').trim());
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

  function valida(form) {
    var primoNonValido = null;

    form.querySelectorAll('[data-obbligatorio]').forEach(function (campo) {
      var valido, messaggio;

      if (campo.type === 'checkbox') {
        valido = campo.checked;
        messaggio = ETICHETTE_ERRORE.consenso;
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
      else dati[campo.name] = campo.value.trim();
    });
    return dati;
  }

  function costruisciMailto(dati) {
    var righe = [
      'Nome: ' + (dati.nome || ''),
      'Email: ' + (dati.email || ''),
      'Telefono: ' + (dati.telefono || ''),
      '',
      dati.messaggio || '',
      '',
      '— Inviato dal modulo «Scrivici» del sito larosadeiventiaps.org'
    ];
    return 'mailto:' + EMAIL_DESTINATARIO
      + '?subject=' + encodeURIComponent('Richiesta di informazioni dal sito')
      + '&body=' + encodeURIComponent(righe.join('\n'));
  }

  /**
   * ⚠️ Qui il corpo è JSON, non `FormData` come nelle candidature: non c'è
   * nessun file da portare, e `consenso` deve arrivare come **booleano vero**
   * — l'api lo valida con `@IsBoolean()` e la stringa `"true"` di un
   * `FormData` non passerebbe.
   */
  function invia(dati) {
    var mailtoUrl = costruisciMailto(dati);

    if (!API_INFORMAZIONI) {
      window.location.href = mailtoUrl;
      return Promise.resolve({ viaEmail: true });
    }

    var corpo = {
      nome: dati.nome || '',
      email: dati.email || '',
      messaggio: dati.messaggio || '',
      consenso: dati.consenso === true
    };
    if (dati.telefono) corpo.telefono = dati.telefono;

    return fetch(API_INFORMAZIONI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo)
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

  function messaggioDalServer(testo) {
    try {
      var corpo = JSON.parse(testo);
      var m = corpo && corpo.message;
      if (Array.isArray(m)) return m.join(' ');
      if (typeof m === 'string' && m) return m;
    } catch (e) { /* non era JSON */ }
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
      esitoEl.textContent = '✉️ Si è aperto (o sta per aprirsi) il tuo programma di posta con il messaggio già pronto verso ' + EMAIL_DESTINATARIO + '. Controlla che sia partito: è quel passaggio che ce lo fa arrivare.';
      esitoEl.classList.add('ok');
    } else {
      esitoEl.textContent = '✅ Messaggio ricevuto: grazie. Ti risponderemo al più presto.';
      esitoEl.classList.add('ok');
    }
    esitoEl.classList.add('visibile');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('modulo-informazioni');
    if (!form) return;

    form.addEventListener('submit', function (evento) {
      evento.preventDefault();

      var esitoEl = form.querySelector('.modulo-esito');
      if (esitoEl) esitoEl.classList.remove('visibile', 'ok', 'errore');

      var primoNonValido = valida(form);
      if (primoNonValido) {
        primoNonValido.focus();
        return;
      }

      var bottone = form.querySelector('button[type="submit"]');
      if (bottone) bottone.disabled = true;

      invia(raccogliDati(form)).then(function (risultato) {
        mostraEsito(form, risultato);
        if (bottone) bottone.disabled = false;
        if (!risultato.viaEmail && !risultato.errore) form.reset();
      });
    });
  });
})();
