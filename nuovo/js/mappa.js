/*
  La mappa di Google si carica **solo se qualcuno la chiede**.

  ⛔ Prima l'`<iframe>` stava nell'HTML e partiva da solo: chiunque aprisse
  «Contatti» mandava a Google il proprio indirizzo IP, prima di qualunque
  consenso e senza saperlo. È il caso classico su cui il Garante è intervenuto
  più volte, ed era **l'unica** cosa di questo sito che mandasse dati a terzi:
  non c'è nessun analytics, nessun pixel, nessun tracciatore.

  ⚠️ **Il riquadro si costruisce da JavaScript e non sta nell'HTML**, per la
  stessa ragione del pulsante «torna su»: un comando che senza JavaScript non
  funzionerebbe non deve nemmeno comparire. Senza JavaScript resta la scritta
  con l'indirizzo e il collegamento a OpenStreetMap, che non carica niente.

  ⚠️ **La scelta non si ricorda.** Sarebbe comodo, ma ricordarla vorrebbe dire
  scrivere qualcosa nel browser di chi visita per una preferenza che riguarda
  l'invio di dati a un terzo — cioè far pagare in tracciamento il prezzo di
  evitare il tracciamento. Un clic per volta costa poco.
*/
(function () {
  'use strict';

  var bottone = document.getElementById('mappa-carica');
  if (!bottone) return;

  bottone.addEventListener('click', function () {
    var riquadro = document.getElementById('mappa-consenso');
    if (!riquadro) return;

    var telaio = document.createElement('iframe');
    telaio.src =
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d23104.5!2d11.29!3d43.74' +
      '!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2' +
      '!1s0x132a53d4e0e7c4f5%3A0x4063460044010d0!2sBagno%20a%20Ripoli%2C%20FI!5e0!3m2!1sit!2sit!4v1710000000000';
    telaio.title = 'Mappa di Bagno a Ripoli su Google Maps';
    telaio.loading = 'lazy';
    // ⚠️ `no-referrer`: senza, Google riceverebbe anche l'indirizzo della
    // pagina da cui arriva la richiesta. Chi ha appena acconsentito alla mappa
    // non ha acconsentito a dire da dove la guarda.
    telaio.referrerPolicy = 'no-referrer';
    telaio.setAttribute('allowfullscreen', '');
    riquadro.replaceWith(telaio);
    // Il fuoco sulla mappa appena arriva: chi naviga da tastiera ha appena
    // premuto un pulsante che è sparito, e deve ritrovarsi da qualche parte.
    telaio.setAttribute('tabindex', '-1');
    telaio.focus({ preventScroll: true });
  });
})();
