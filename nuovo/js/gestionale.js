/**
 * Gli indirizzi del gestionale, in un punto solo.
 *
 * ⭐ **Perché un file per due stringhe.** Dal 25/08/2026 il gestionale
 * dell'associazione è online su `rdv.nextum.it`, e da qui il sito manda
 * davvero due cose: la candidatura di un volontario o di un educatore
 * (col curriculum allegato) e la richiesta di informazioni. Se l'indirizzo
 * fosse scritto dentro i due file che lo usano, il giorno che cambia — un
 * dominio proprio, `gestionale.larosadeiventiaps.org` — se ne troverebbe uno
 * e si dimenticherebbe l'altro. E il modulo dimenticato non darebbe errore:
 * ripiegherebbe in silenzio sull'email, come faceva prima.
 *
 * ⛔ **Il gestionale è su un altro dominio**: perché il browser accetti le
 * risposte, l'api deve elencare l'origine di questo sito in
 * `ORIGINI_CONSENTITE` (vedi `api/src/origini-consentite.ts` nel repository
 * della piattaforma). ⚠️ **Fra le origini ammesse c'è solo `https://`**: da
 * una pagina aperta in `http://` i moduli ripiegano sull'email. È il motivo
 * per cui `.htaccess` porta chi arriva in chiaro sulla versione sicura.
 *
 * ⚠️ Se questo file non si carica, `js/candidature.js` e `js/informazioni.js`
 * non si rompono: tornano a comporre l'email precompilata, che è la strada
 * che ha sempre funzionato. Perdono il collegamento, non la funzione.
 *
 * ⭐⭐ **28/08/2026 — qui vive anche l'interruttore di lettura.** Da questa
 * data `js/dati-pubblici.js` fa leggere a progetti/eventi/partner il
 * gestionale invece dei soli file `data/*.json` (che restano la copia di
 * sicurezza — vedi quel file per come e quando si torna alla copia). I due
 * valori sotto sono le uniche leve per governare QUELLA lettura, tenute
 * accanto agli indirizzi per lo stesso motivo per cui gli indirizzi sono
 * qui: un giorno da cambiare, un solo posto dove cercarlo.
 */
;(function () {
  'use strict';

  /** La radice del gestionale: `/` è la domanda di tesseramento, `/accesso` è l'ingresso. */
  window.GESTIONALE_BASE = 'https://rdv.nextum.it';

  /** Le rotte aperte a chi non ha una sessione (`@Pubblico` nell'api). */
  window.GESTIONALE_API_PUBBLICA = window.GESTIONALE_BASE + '/api/pubblico';

  /**
   * ⚠️ **L'interruttore per tornare ai file senza rilasciare codice nuovo.**
   * `'api'` (il normale, da oggi): progetti/eventi/partner provano il
   * gestionale e ripiegano sulla copia solo se serve — vedi
   * `js/dati-pubblici.js`. `'file'`: salta la rete e legge SEMPRE e SOLO
   * `data/*.json`, come faceva il sito prima del 28/08/2026 — utile se il
   * gestionale ha un problema che questo file non sa riconoscere da solo, o
   * durante una manutenzione annunciata: si cambia questa riga sola, si
   * ripubblicano gli asset, non serve toccare `js/dati-pubblici.js`.
   */
  window.GESTIONALE_FONTE_DATI = 'api';

  /**
   * ⚠️ Quanto aspettare il gestionale prima di ripiegare sulla copia
   * (millisecondi). Senza un tetto, un gestionale che risponde lentissimo
   * lascerebbe la pagina bianca per un tempo indefinito invece di mostrare
   * subito la copia con l'avviso — il caso "3. api lentissima" del collaudo.
   */
  window.GESTIONALE_TIMEOUT_MS = 6000;
})();
