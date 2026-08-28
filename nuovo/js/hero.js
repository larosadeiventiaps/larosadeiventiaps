/**
 * Le fotografie della hero cambiano ogni giorno.
 *
 * ⚠️ **Non a caso a ogni visita, ma a caso UNA VOLTA AL GIORNO.** La
 * differenza conta: con un caso vero, ricaricare la pagina cambierebbe le
 * fotografie sotto gli occhi di chi sta guardando, e due persone che si
 * scambiano il collegamento vedrebbero cose diverse mentre ne parlano. Qui
 * il seme è il GIORNO: nell'arco della stessa giornata la scelta è sempre
 * quella, per tutti; il giorno dopo è un'altra.
 *
 * ⚠️ **Sono sempre sette**, perché il foglio di stile assegna a ciascuna il
 * suo ritardo (`nth-child(1)` … `nth-child(7)`) dentro un giro di 42
 * secondi. Cambiare il numero qui senza cambiare quello lì significa o una
 * fotografia che non compare mai, o un buco nero nel giro.
 *
 * ⛔ **La prima fotografia resta scritta nella pagina** e questo file la
 * sostituisce solo dopo: se il JavaScript non parte — rete lenta, un errore,
 * un browser vecchio — la hero resta una fotografia ferma invece di
 * diventare un rettangolo vuoto col titolo appeso in aria.
 */
;(function () {
  'use strict'

  var QUANTE = 7

  /**
   * Numeri pseudo-casuali ripetibili a partire da un seme (mulberry32).
   * Serve che la stessa giornata produca sempre la stessa sequenza: un
   * `Math.random()` qui darebbe una hero diversa a ogni ricarica.
   */
  function generatore(seme) {
    return function () {
      seme |= 0
      seme = (seme + 0x6d2b79f5) | 0
      var t = Math.imul(seme ^ (seme >>> 15), 1 | seme)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  /** Il numero del giorno, uguale per tutti nella stessa giornata. */
  function giorno() {
    var oggi = new Date()
    return Math.floor(Date.UTC(oggi.getFullYear(), oggi.getMonth(), oggi.getDate()) / 86400000)
  }

  /** Mescola una copia dell'elenco, senza toccare l'originale (Fisher-Yates). */
  function mescola(elenco, caso) {
    var copia = elenco.slice()
    for (var i = copia.length - 1; i > 0; i--) {
      var j = Math.floor(caso() * (i + 1))
      var t = copia[i]
      copia[i] = copia[j]
      copia[j] = t
    }
    return copia
  }

  function disegna(sfondo, scelte) {
    sfondo.innerHTML = ''
    scelte.forEach(function (foto) {
      var img = document.createElement('img')
      // La versione nell'indirizzo serve se una fotografia viene sostituita
      // tenendo lo stesso nome: il server la terrebbe in cache 120 giorni.
      // Vedi `VERSIONE_IMMAGINI` in main.js — se main.js non c'è, si usa
      // l'indirizzo nudo invece di rompere la hero.
      img.src = typeof conVersione === 'function' ? conVersione(foto.file) : foto.file
      // ⚠️ Vuoto e non descrittivo: le fotografie della hero sono decorazione
      //    dietro al titolo, e chi usa un lettore di schermo si sentirebbe
      //    leggere sette descrizioni prima di arrivare al nome
      //    dell'associazione. Il contenitore è già `aria-hidden`.
      img.alt = ''
      sfondo.appendChild(img)
    })
  }

  document.addEventListener('DOMContentLoaded', function () {
    var sfondo = document.querySelector('.hero-sfondo')
    if (!sfondo) return

    // ⚠️ 28/08/2026 — resta sul file, apposta: il gestionale non ha una
    // rotta pubblica che elenchi fotografie con didascalia, e queste sette
    // fotografie di sfondo non hanno un progetto/edizione a cui agganciarsi
    // per prendere in prestito una copertina. Vedi js/dati-pubblici.js, in
    // cima, per il perimetro di questa migrazione.
    fetch('data/hero.json')
      .then(function (r) {
        if (!r.ok) throw new Error('hero.json: ' + r.status)
        return r.json()
      })
      .then(function (elenco) {
        if (!Array.isArray(elenco) || elenco.length === 0) return
        // Se le fotografie disponibili sono meno di sette, si ripetono: meglio
        // una che torna che un posto vuoto nel giro.
        var mescolate = mescola(elenco, generatore(giorno()))
        var scelte = []
        for (var i = 0; i < QUANTE; i++) scelte.push(mescolate[i % mescolate.length])
        disegna(sfondo, scelte)
      })
      .catch(function (errore) {
        // ⛔ Non si tocca niente: restano le fotografie scritte nella pagina.
        //    Un errore qui non deve MAI lasciare la hero senza immagini.
        console.warn('Fotografie del giorno non caricate, resta quella fissa:', errore)
      })
  })
})()
