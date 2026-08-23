/**
 * Moduli di candidatura (volontario / educatore) in sostienici.html.
 *
 * ⛔ QUESTO È IL PUNTO DELICATO. L'api che riceve queste candidature esiste
 * davvero (`POST /pubblico/candidature`) ma OGGI gira solo sul computer
 * del committente: non è raggiungibile da Internet. Finché è così, il
 * modulo NON deve fingere di aver inviato — sarebbe la bugia peggiore,
 * una persona che si è proposta e nessuno che lo sa. La strada che
 * funziona oggi è comporre un'email precompilata e aprire il programma di
 * posta di chi compila.
 *
 * ⭐ IL GIORNO CHE L'API SARÀ ONLINE, l'UNICO punto da cambiare è la
 * costante `API_CANDIDATURE` qui sotto: valorizzala con l'indirizzo vero
 * (es. "https://gestionale.larosadeiventiaps.org/pubblico/candidature").
 * Con la costante vuota si passa dritti per l'email (comportamento di
 * oggi); appena è valorizzata, `inviaCandidatura()` prova prima il
 * server e usa l'email SOLO come ripiego, se la richiesta fallisce
 * (rete assente, server spento). Nessun altro punto del file va toccato.
 */
;(function () {
  'use strict';

  // ⭐⭐ UNICO PUNTO DA CAMBIARE quando l'api sarà raggiungibile da Internet.
  var API_CANDIDATURE = '';

  var EMAIL_DESTINATARIO = 'info@larosadeiventiaps.org';

  var ETICHETTE_ERRORE = {
    obbligatorio: 'Questo campo è obbligatorio.',
    email: 'Scrivi un indirizzo email valido.',
    consenso: "Devi accettare l'informativa per continuare.",
    curriculum: 'Scegli il file del tuo curriculum.'
  };

  function emailValida(v) {
    // Controllo semplice, non una validazione RFC completa: basta scartare
    // i refusi più comuni prima di aprire il programma di posta.
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
        valido = campo.files && campo.files.length > 0;
        messaggio = ETICHETTE_ERRORE.curriculum;
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

  /**
   * Invia la candidatura. Oggi (`API_CANDIDATURE` vuota) apre solo il
   * programma di posta. Il giorno che la costante sarà valorizzata, prova
   * prima il server e ripiega sull'email solo se quella richiesta fallisce.
   */
  function inviaCandidatura(dati, tipo) {
    var mailtoUrl = costruisciMailto(dati, tipo);

    if (!API_CANDIDATURE) {
      window.location.href = mailtoUrl;
      return Promise.resolve({ viaEmail: true });
    }

    return fetch(API_CANDIDATURE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dati)
    }).then(function (res) {
      if (!res.ok) throw new Error('risposta ' + res.status);
      return { viaEmail: false };
    }).catch(function () {
      window.location.href = mailtoUrl;
      return { viaEmail: true };
    });
  }

  function mostraEsito(form, risultato) {
    var esitoEl = form.querySelector('.modulo-esito');
    if (!esitoEl) return;
    esitoEl.classList.remove('ok', 'errore');
    if (risultato.viaEmail) {
      esitoEl.textContent = '✉️ Si è aperto (o sta per aprirsi) il tuo programma di posta con l\'email già pronta verso ' + EMAIL_DESTINATARIO + '. Controlla che sia partita: è quel passaggio che ci fa arrivare davvero la tua candidatura.';
      esitoEl.classList.add('ok');
    } else {
      esitoEl.textContent = '✅ Candidatura inviata al nostro gestionale.';
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
      var bottone = form.querySelector('button[type="submit"]');
      if (bottone) bottone.disabled = true;

      inviaCandidatura(dati, tipo).then(function (risultato) {
        mostraEsito(form, risultato);
        if (bottone) bottone.disabled = false;
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.modulo-candidatura[data-tipo]').forEach(inizializza);
  });
})();
