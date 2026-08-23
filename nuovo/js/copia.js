/**
 * I pulsanti «copia» dell'IBAN e del codice fiscale.
 *
 * ⚠️ **Serve perché queste due cose si copiano dal telefono.** Un IBAN di
 * ventisette caratteri selezionato a dito, dentro una pagina che scorre, è
 * il punto in cui una donazione si perde: si sbaglia un carattere, il
 * bonifico torna indietro, e nessuno riprova.
 *
 * ⚠️ **Il valore copiato NON è quello scritto a schermo**: a schermo l'IBAN
 * ha gli spazi ogni quattro caratteri, perché così si legge; negli appunti
 * va senza, perché così lo vuole l'app della banca. I due valori stanno
 * separati apposta — quello da copiare è nell'attributo `data-copia`.
 *
 * ⛔ **Il pulsante dice se ha funzionato, e dice anche se non ha
 * funzionato.** `navigator.clipboard` fallisce senza connessione sicura
 * (http semplice) e su qualche browser vecchio: in quel caso si seleziona
 * il testo, così la persona copia a mano invece di credere di aver copiato
 * qualcosa che negli appunti non c'è mai arrivato.
 */
;(function () {
  'use strict'

  var ATTESA = 2200

  function selezionaVisibile(bottone) {
    // Il testo mostrato sta nell'elemento subito prima del pulsante.
    var mostrato = bottone.previousElementSibling
    if (!mostrato || !window.getSelection) return false
    var intervallo = document.createRange()
    intervallo.selectNodeContents(mostrato)
    var selezione = window.getSelection()
    selezione.removeAllRanges()
    selezione.addRange(intervallo)
    return true
  }

  function riscontro(bottone, testo) {
    var originale = bottone.dataset.testoOriginale || bottone.textContent
    bottone.dataset.testoOriginale = originale
    bottone.textContent = testo
    window.setTimeout(function () {
      bottone.textContent = originale
    }, ATTESA)
  }

  document.addEventListener('click', function (evento) {
    var bottone = evento.target.closest('[data-copia]')
    if (!bottone) return

    var valore = bottone.dataset.copia

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(valore).then(
        function () {
          riscontro(bottone, '✓ Copiato')
        },
        function () {
          riscontro(bottone, selezionaVisibile(bottone) ? 'Selezionato: copialo tu' : 'Non riesco a copiare')
        },
      )
      return
    }

    riscontro(bottone, selezionaVisibile(bottone) ? 'Selezionato: copialo tu' : 'Non riesco a copiare')
  })
})()
