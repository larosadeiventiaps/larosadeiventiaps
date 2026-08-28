/*
  Il pulsante «torna su», e perché esiste.

  Chiesto dal titolare il 28/08/2026: «essendo una pagina molto lunga
  servirebbe un pulsante torna su sempre a portata di mano». La pagina
  Sostienici è la più lunga del sito — sei riquadri, quattro gradini, IBAN,
  Teaming, 5x1000, enti e due moduli — e per tornare in cima si rotellava.

  ⚠️ **Compare dopo poco più di mezza schermata**, non subito: un pulsante
  fisso già in cima coprirebbe il contenuto senza servire a niente — in cima ci
  si è già. Ma la prima stesura aspettava DUE schermate intere, e il titolare
  (28/08/2026): «il tasto torna su si vede solo se si scrolla tantissimo in
  giù». Su Sostienici, alta 5.976 px, voleva dire non vederlo per il primo
  quinto della pagina.

  ⚠️ **Si disegna da JavaScript e non nell'HTML delle dodici pagine**, per una
  ragione pratica: un comando che senza JavaScript non funzionerebbe non deve
  nemmeno comparire. Un pulsante che non risponde è peggio di un pulsante che
  non c'è.
*/
(function () {
  'use strict';

  // ⚠️ Frazione dell'altezza dello schermo, non un numero fisso di pixel: su un
  // telefono alto 640 px e su un monitor da 1.200 «mezza schermata» è la stessa
  // quantità di lettura, mentre «400 px» sarebbe metà pagina sul primo e un
  // dito sul secondo.
  var SOGLIA = function () { return window.innerHeight * 0.6; };

  var bottone = document.createElement('button');
  bottone.type = 'button';
  bottone.className = 'torna-su';
  // ⚠️ Il testo è dentro il pulsante, non solo in `aria-label`: chi legge lo
  // schermo e chi lo guarda devono sentire e vedere la stessa cosa (WCAG
  // «Label in Name»), e a voce «torna su» funziona.
  bottone.innerHTML = '<span aria-hidden="true">↑</span> Torna su';
  bottone.setAttribute('aria-label', 'Torna su, in cima alla pagina');
  bottone.hidden = true;

  bottone.addEventListener('click', function () {
    // ⚠️ Rispetta chi ha chiesto meno animazioni: uno scorrimento lungo e
    // fluido su una pagina di due metri è esattamente ciò che dà fastidio a
    // chi soffre di cinetosi.
    var fermo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: fermo ? 'auto' : 'smooth' });
    // ⚠️ Riporta anche il FUOCO in cima, non solo la pagina: senza, chi naviga
    // da tastiera torna visivamente su e poi, premendo Tab, riparte da dove
    // era rimasto — cioè in fondo. Lo scorrimento sposta gli occhi, non il
    // punto in cui si sta.
    var primo = document.querySelector('.navbar a, header a, main');
    if (primo) {
      primo.setAttribute('tabindex', '-1');
      primo.focus({ preventScroll: true });
    }
  });

  document.body.appendChild(bottone);

  function aggiorna() {
    var mostra = window.scrollY > SOGLIA();
    if (mostra === bottone.hidden) bottone.hidden = !mostra;
  }

  // ⛔ **Niente `requestAnimationFrame` qui, e la ragione è stata misurata**
  // (28/08/2026). La prima stesura raccoglieva gli eventi di scorrimento in un
  // `requestAnimationFrame` per non misurare troppe volte al secondo. Ma rAF
  // **non gira in una scheda in secondo piano**: provato: scesi 4.706 px su una
  // pagina di 5.976, il pulsante restava nascosto perché la funzione che lo
  // mostra non veniva mai chiamata.
  //
  // ⚠️ È lo stesso inciampo delle fasce dei numeri, corretto oggi in
  // `main.js`, e la lezione è la stessa: **un ornamento non può reggere una
  // cosa che deve funzionare.** Qui il risparmio era teorico — si legge
  // `scrollY` e basta, senza forzare il calcolo dell'impaginazione — mentre il
  // difetto era reale.
  window.addEventListener('scroll', aggiorna, { passive: true });
  aggiorna();
})();
