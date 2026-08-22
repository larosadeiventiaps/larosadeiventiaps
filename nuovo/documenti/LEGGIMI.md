# Cartella documenti

Qui vanno i file veri (PDF) dei documenti dell'associazione: statuto, atto
costitutivo, bilanci, rendiconti, informativa privacy...

La pagina `documenti.html` li legge dalla lista in `data/documenti.json` e
mostra, per ognuno, il titolo, la descrizione, l'anno e il peso del file.
**Il peso non si scrive a mano**: la pagina lo calcola da sola interrogando
il file quando la pagina si apre. Se il file indicato non c'è ancora, la
voce lo dice chiaramente ("File non ancora disponibile") invece di offrire
un collegamento che si rompe.

## Come aggiungere un documento vero

1. Copia il PDF in questa cartella, con un nome semplice e senza spazi
   (es. `statuto.pdf`, `bilancio-2025.pdf`).
2. Apri `data/documenti.json` e:
   - se la voce esiste già (es. "Statuto dell'associazione"), controlla che
     il campo `"file"` punti esattamente al nome del file appena copiato
     (es. `"documenti/statuto.pdf"`) — se il nome coincide con quello già
     scritto non c'è nemmeno bisogno di toccare il json;
   - se è un documento nuovo (es. il bilancio di un altro anno), aggiungi
     una voce copiando questo schema:

   ```json
   {
     "titolo": "Bilancio 2025",
     "descrizione": "Il rendiconto economico e finanziario dell'associazione per l'anno 2025.",
     "anno": "2025",
     "file": "documenti/bilancio-2025.pdf"
   }
   ```

   Campi:
   - `titolo` — il nome che vede chi visita il sito.
   - `descrizione` — che cos'è, in una riga.
   - `anno` — facoltativo: se non lo sai lascialo `""` e non comparirà
     l'etichetta dell'anno sulla scheda. **Non inventare un anno.**
   - `file` — il percorso relativo del PDF dentro questa cartella.

## Bilanci e rendiconti di più anni

Non serve nessuna funzione speciale: per ogni anno aggiungi una voce in
più nel json (stesso `titolo` con l'anno diverso, o titoli tipo "Bilancio
2024", "Bilancio 2025"...), con il proprio `file` e il proprio `anno`.
Ogni voce diventa una riga a sé nella pagina.

## Se un file manca ancora

Non serve fare niente: finché il PDF indicato in `"file"` non esiste in
questa cartella, la pagina lo segnala da sola ("File non ancora
disponibile") e il pulsante di scarico resta disattivato. Appena il file
viene copiato qui, alla prima apertura della pagina il documento diventa
scaricabile e ne compare anche il peso reale.
