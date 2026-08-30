/*
  Il pulsante «Dona ora» sempre a portata di pollice, e perché esiste.

  Chiesto dal titolare il 30/08/2026: «sul cellulare servirebbe un pulsante
  dona ora sempre presente in basso a sinistra». Da telefono la barra in alto
  si chiude nel menù a panino: «Dona ora», che sulla scrivania è un pulsante
  bianco sempre visibile, in mano sparisce dietro due tocchi.

  ⚠️ **In basso a SINISTRA**, non a destra: a destra c'è già «Torna su»
  (`js/torna-su.js`, `right: 1.25rem`). Due pastiglie sovrapposte sarebbero
  due comandi che si contendono lo stesso pollice.

  ⚠️ **Solo da telefono.** Sulla scrivania «Dona ora» sta gia' nella barra, in
  alto a destra, sempre visibile: un secondo pulsante fisso sarebbe la stessa
  cosa detta due volte, e coprirebbe il contenuto.

  ⛔ **Non compare su `sostienici.html`**: chi e' li' dentro sta gia' leggendo
  come donare, e il pulsante gli coprirebbe proprio i riquadri che deve usare.
  Un comando che porta dove sei gia' non e' un aiuto, e' un ingombro.

  ⚠️ **Si disegna da JavaScript e non nell'HTML delle dodici pagine**, per la
  stessa ragione scritta in `torna-su.js`: una cosa sola da mantenere, e
  nessun pulsante che resti li' inerte dove non deve esserci.
*/
(function () {
  'use strict';

  // La stessa soglia con cui la barra passa al menù a panino: sotto questa
  // larghezza «Dona ora» non è più visibile in alto, ed è lì che serve.
  var DA_TELEFONO = '(max-width: 900px)';

  // ⛔ Il confronto è sul nome del file, non su `location.href`: l'indirizzo
  //    porta con sé l'ancora (`#dona-ora`) e la stringa di ricerca, e un
  //    `indexOf` su tutto quanto darebbe vero anche arrivando da un link
  //    `.../progetti.html?da=sostienici`.
  var pagina = location.pathname.split('/').pop() || 'index.html';
  if (pagina === 'sostienici.html') return;

  var media = window.matchMedia(DA_TELEFONO);

  var link = document.createElement('a');
  link.className = 'dona-fisso';
  link.href = 'sostienici.html#dona-ora';
  // ⚠️ Il testo sta DENTRO il pulsante, non solo in `aria-label`: chi legge lo
  // schermo e chi lo guarda devono sentire e vedere la stessa cosa (WCAG
  // «Label in Name»). Il cuore è decorativo e resta fuori dal nome accessibile.
  link.innerHTML = '<span aria-hidden="true">❤️</span> Dona ora';
  link.setAttribute('aria-label', 'Dona ora: vai alla pagina Sostienici');

  function aggiorna() {
    link.hidden = !media.matches;
  }

  // `addEventListener` sulla media query: se si gira il telefono, o si
  // rimpicciolisce la finestra sulla scrivania, il pulsante compare e sparisce
  // da sé. ⚠️ `addListener` è la forma vecchia, tenuta per i browser che non
  // hanno ancora quella nuova: senza, su quelli il pulsante resterebbe fermo
  // allo stato del primo caricamento.
  if (media.addEventListener) media.addEventListener('change', aggiorna);
  else if (media.addListener) media.addListener(aggiorna);

  aggiorna();
  document.body.appendChild(link);
})();
