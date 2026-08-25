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
 */
;(function () {
  'use strict';

  /** La radice del gestionale: `/` è la domanda di tesseramento, `/accesso` è l'ingresso. */
  window.GESTIONALE_BASE = 'https://rdv.nextum.it';

  /** Le rotte aperte a chi non ha una sessione (`@Pubblico` nell'api). */
  window.GESTIONALE_API_PUBBLICA = window.GESTIONALE_BASE + '/api/pubblico';
})();
