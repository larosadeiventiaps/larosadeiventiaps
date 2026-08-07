# La Rosa dei Venti APS — Fase 1: anagrafica, consensi e tesseramento online

Specifica di design. Stato: **da approvare**. Data: 07/08/2026.

Questo documento copre il primo dei quattro sotto-progetti del sistema di gestione
dell'associazione. Gli altri tre (progetti/presenze, sito pubblico, app mobile) avranno
ciascuno la propria specifica e il proprio piano, e si appoggiano a quanto costruito qui.

---

## 1. Perché si parte da qui

Il perimetro richiesto dall'associazione contiene quattro sistemi che possono vivere
separati: gestione soci, gestione progetti, sito pubblico, app mobile a tre ambiti.
Specificarli insieme produce un documento che non regge alla prima riga di codice.

L'ordine scelto è: **anagrafica → progetti → sito → app**, e il motivo è che tesseramento,
iscrizioni ai progetti, donazioni e accesso all'app pescano tutti dalla stessa domanda —
chi è questa persona, è in regola, cosa ha acconsentito. Costruita quella, il resto costa
molto meno.

**L'app è l'ultimo pezzo, non il primo.** Costruirla prima che l'API sia stabile significa
riscriverla, e ogni correzione passa da una revisione di uno store. Nella fase 2 le presenze
e le foto si fanno da pagina web ottimizzata per telefono: gli educatori sono operativi in
settimane, e l'app quando arriva è una scorciatoia comoda su qualcosa che già funziona.

## 2. Perimetro

### Dentro

- Anagrafica delle persone, con i ruoli: socio, genitore, partecipante, educatore, volontario.
- Nuclei familiari, per collegare genitore e partecipante.
- Registro dei consensi, per persona e per canale.
- Campagna di tesseramento annuale con pagamento online.
- Ricevuta e tessera associativa in PDF, inviate via email.
- Backoffice del direttivo: elenco soci, stato quote, incassi, export per il bilancio.
- Comunicazioni ai soci sui nuovi progetti.
- Area riservata della famiglia: stato delle proprie tessere, pagamento del non versato,
  modifica dei consensi, download della tessera.

### Fuori, per adesso

Archivio progetti e documentazione; iscrizioni ai progetti e pagamento delle attività;
calendario e registro presenze; caricamento di foto e video; attestati e badge; app mobile;
accesso dei partecipanti (arriva con l'app, fase 4); pubblicazione del sito pubblico (fase 3).

## 3. Vincoli

| Vincolo | Origine | Conseguenza |
|---|---|---|
| Costo ricorrente ≈ € 0,00 per l'associazione | Bilancio: preventivo 2026 di € 18.000,00, cassa ~ € 9.000,00 | Infrastruttura sull'host BE Care, sostenuta come donazione |
| Consolidamento sui server BE Care | Obiettivo aziendale: ridurre Ergonet, Serverplan e Register a soli registrar | Niente hosting condiviso: API, database e sito sull'host Docker |
| Nessun gateway di pagamento oggi attivo | Oggi si incassa per bonifico e in contanti | Va aperto un conto commerciante intestato all'associazione |
| Liberatoria foto cartacea e indifferenziata | Prassi attuale | Il consenso va ricostruito come dato, per persona e per canale |
| I file devono restare usabili con Microsoft 365 | Richiesta dell'associazione: il direttivo e gli educatori lavorano da Teams e OneDrive | Documenti, foto e allegati su SharePoint, non su un volume del server |
| Un solo manutentore | Gionatan, volontario | Stack unico con gli altri progetti BE Care; niente tecnologie a sé |
| I partecipanti sono in buona parte autonomi col telefono | Verificato con l'associazione | L'ambito partecipante (fase 4) è giustificato e va progettato accessibile |

## 4. Architettura

Tutto gira sull'**host Docker di BE Care** (OVH, `lapstarbecare.nextum.it`), dietro il
reverse proxy nginx che già serve gli altri applicativi. Si riusa il modello di rilascio
già in esercizio per la piattaforma Kuoyo — `docs/runbook-deploy.md` del repository
`KuoyoPAK` — perché è collaudato e documentato, non perché sia comodo.

### I pezzi

- **`db`** — PostgreSQL 16, volume host `/srv/rosadeiventi/db`. Porta **non** pubblicata.
- **`api`** — NestJS in container, pubblicata solo su `127.0.0.1:3000`, servita dal proxy
  sotto `/api`. Contiene tutte le regole di dominio. Non produce HTML.
- **`web`** — client React/Vite: le pagine pubbliche di tesseramento, l'area riservata
  della famiglia e il backoffice del direttivo. Nessuna logica di dominio nel browser.
- **`documenti`** — libreria SharePoint dedicata sul sito `/sites/LaRosadeiVentiAps`, con
  struttura a cartelle per anno e per progetto: tessere, ricevute e, dalla fase 2, le foto.
  Ci si lavora anche da Teams, da OneDrive e da Esplora risorse, ed è la ragione della
  scelta.

Il codice vive in un repository nuovo, `RosaDeiVentiPiattaforma`, con la stessa forma di
`KuoyoPAK`: `api/`, `web/`, `docker/`. Il repository attuale `LaRosadeiVenti` conserva il
sito finché la fase 3 non lo porta dentro la piattaforma.

**La regola che tiene insieme tutto: l'API è l'unico componente che tocca gli archivi.**
Web, backoffice e domani l'app Flutter non parlano mai al database — usano gli stessi
endpoint con permessi diversi. È ciò che permette alla fase 4 di non riaprire nulla.

### Microsoft 365

- **Le email partono da `info@larosadeiventiaps.org` via Microsoft Graph**, non dal server:
  è ciò che evita la cartella spam.
- **I file stanno su SharePoint**, per scelta esplicita: devono essere utilizzabili con gli
  strumenti di Microsoft 365 che l'associazione già usa. Il sistema li scrive e li legge
  via Graph.
- **Accesso con privilegio minimo**: per l'API si registra un'applicazione dedicata con
  **`Sites.Selected`** concesso sul solo sito dell'associazione, non si riusa quella
  esistente che ha `Sites.FullControl.All` su tutto il tenant. Il consenso va dato dal
  Global Admin `admin@larosadeiventiaps.org`.

### Conseguenze della scelta, e come si governano

Tenere i file fuori dal database è ciò che l'associazione vuole, ma cambia tre proprietà
del sistema. Vanno progettate qui, non scoperte dopo.

**Un file lo può spostare o rinominare una persona.** È il senso stesso di tenerlo su
SharePoint. Perciò il database conserva **l'identificativo dell'elemento** (`driveItem id`),
non il percorso: l'identificativo sopravvive a rinomina e spostamento dentro la libreria.
Il percorso si conserva solo come etichetta leggibile, e non è mai la chiave.

**Le due metà non si salvano più insieme.** Il database lo salviamo noi, i file li conserva
Microsoft con versioni e cestino. Un ripristino del database a ieri non riavvolge
SharePoint: l'effetto sono file orfani, non righe che puntano al nulla — il verso meno
grave dei due. Una **riconciliazione notturna** elenca entrambe le anomalie: elementi citati
dal database e non più presenti, file presenti senza una riga che li nomini. Un collegamento
rotto lo deve scoprire un rapporto, non una famiglia.

**Graph può non rispondere.** Generazione del PDF e caricamento sono passi separati e
ripetibili: la tessera esiste comunque, il caricamento si ripete. Vale lo stesso principio
già adottato per le email — una funzione di contorno non blocca mai un socio. I caricamenti
rispettano il `Retry-After` in caso di limitazione, e i file oltre 4 MB usano una sessione
di caricamento.

**Cancellare significa cancellare davvero.** Alla revoca di un consenso o all'esercizio del
diritto alla cancellazione, versioni e cestino a due livelli vanno svuotati per quell'
elemento: su SharePoint un file eliminato resta recuperabile per novanta giorni, e questo
va gestito, non ignorato.

### Convenzioni ereditate dal modello Kuoyo, e perché

- Variabili obbligatorie dichiarate `${VAR:?messaggio}`: un deploy con la password vuota
  si ferma prima di avviare il container, invece di partire e sembrare sano.
- Porta del database tolta con `!override` nel file di produzione: Compose **concatena**
  le porte fra i file, non le sostituisce, e una lista vuota non toglie niente. Senza
  `!override` il database di produzione è raggiungibile da fuori.
- Immagine taggata con il commit rilasciato: il rollback è cambiare un tag. Con un tag
  mobile la versione precedente non sopravvive e non c'è niente a cui tornare.
- Container `migrate` separato che usa `prisma migrate deploy`, mai `migrate dev`:
  quest'ultimo confronta schema e database e può generare una migrazione — o azzerare il
  database — se vede una deriva. Su dati veri non è un errore recuperabile.

## 5. Modello dati

Un solo schema. Il volume dei dati non giustifica la separazione a schemi di PAK.

**Il principio: una persona è una sola riga, per sempre.** Il tesseramento è un fatto
annuale che le si attacca sopra, non una copia dell'anagrafica. Chi è socio da cinque anni
resta una persona con cinque tesseramenti: lo storico regge, i duplicati non nascono, e le
statistiche per il bilancio si calcolano senza incrociare fogli.

### Tabelle

**`nucleo`** — cognome di riferimento, contatto principale, indirizzo, note.

**`persona`** — nome, cognome, data di nascita, codice fiscale, email, telefono,
`nucleo_id` (facoltativo), stato (attiva / archiviata). I **ruoli** sono una relazione a
parte (`persona_ruolo`): una stessa persona può essere insieme genitore e volontaria, ed è
il caso normale in questa associazione.

**`consenso`** — `persona_id`, `canale` (interno · sito · social · stampa), `concesso`
(sì/no), `data`, `origine` (modulo online / cartaceo), riferimento al documento firmato.
**Una riga per canale, non una casella sull'anagrafica**: chi acconsente alle foto interne
ma non a quelle sul sito ha due righe con esiti diversi. Le modifiche non sovrascrivono:
si chiude la riga precedente e se ne apre una nuova, perché la domanda a cui il sistema
deve saper rispondere è *chi ha detto sì a cosa, e quando*.

**`quota`** — `anno`, `tipo` (ordinario / genitore / partecipante / volontario / …),
`importo`. Tabella, non costante: la struttura della quota è una decisione del direttivo
che può cambiare ogni anno, e non deve richiedere un rilascio.

**`tesseramento`** — `persona_id`, `anno`, `quota_id`, `stato`
(in_attesa · attivo · scaduto · annullato), `numero_tessera`, riferimento al documento
della tessera, date. Vincolo di unicità su `(persona_id, anno)` fra i tesseramenti non
annullati.

**`pagamento`** — `tesseramento_id`, importo, data, metodo (online / bonifico / contanti),
riferimento del gateway, riferimento al documento della ricevuta. Separato dal tesseramento
perché una quota può essere incassata fuori dal sito e va comunque registrata.

**`documento`** — `driveItem id` (la chiave), nome e percorso leggibile al momento del
caricamento, tipo (tessera / ricevuta / foto / allegato), riga a cui si riferisce, data,
stato del caricamento (in attesa / caricato / fallito). È l'unico punto in cui il sistema
sa dove vive un file: nessun'altra tabella conserva un percorso.

**`evento_gateway`** — id dell'evento del fornitore (**unico**), tipo, payload, esito
dell'elaborazione. È ciò che rende il webhook idempotente: i gateway consegnano più volte
lo stesso evento, ed è normale, non un guasto.

**`comunicazione`** e **`comunicazione_destinatario`** — oggetto, testo, segmento scelto,
data di invio, esito per singolo destinatario.

**`audit`** — chi, quando, cosa, su quale riga. Su ogni scrittura.

### Un dato che non entra

**Diagnosi e condizioni di salute dei partecipanti non stanno in questo database.** Sono
dati particolari ai sensi dell'art. 9 GDPR e il sistema non ne ha bisogno per funzionare.
Se in futuro servisse un'informazione operativa — per esempio un'esigenza alimentare per
le gite — si valuterà a parte, con le sue tutele e la sua base giuridica.

## 6. Il flusso del tesseramento

La domanda più delicata dell'intero sotto-progetto è: *a che punto una persona diventa
socio?* La risposta scelta è che **la domanda si registra subito e resta in attesa, e solo
la conferma che arriva dal gateway la rende attiva.** Nessuna tessera viene emessa prima
che i soldi siano arrivati.

1. **Modulo** sul sito: dati della persona, nucleo, consensi.
2. **Riconoscimento**: se la persona è già in anagrafica (per codice fiscale, o per
   nome+cognome+data di nascita) è un **rinnovo**, non un nuovo socio. È il passo che
   impedisce all'anagrafica di riempirsi di doppioni.
3. Creazione del tesseramento in stato **in_attesa** e apertura della sessione di pagamento
   sulla pagina ospitata dal fornitore.
4. **Webhook**: il gateway avvisa il *server*, non il browser. Il tesseramento passa ad
   **attivo**, viene assegnato il numero di tessera e registrato il pagamento.
5. **Consegna**: generazione di tessera e ricevuta in PDF e invio via email.

### Perché la conferma deve arrivare al server

È la differenza che evita il caso peggiore: la famiglia paga, chiude il telefono prima che
la pagina torni indietro, e nessuno registra l'incasso. Con il webhook la tessera parte
comunque. Il ritorno del browser serve solo a mostrare un esito all'utente, e non decide
nulla.

### Le domande rimaste in attesa non sono errori

Sono **la lista delle persone da richiamare**, visibile nel backoffice con il tempo
trascorso. Non si cancellano.

### Il numero di tessera

Progressivo **annuale** (`2026-041`). ⚠️ Un progressivo annuale sotto due inserimenti
simultanei genera due volte lo stesso numero se lo si calcola con un `max+1` letto
dall'applicazione, e lo fa **in silenzio**. Serve una sequenza atomica per anno lato
database. È una classe di difetto che il progetto Kuoyo ha già pagato: non va ripagata.

### Pagamenti fuori dal sito

Chi paga per bonifico o in contanti viene registrato dal backoffice: si crea il pagamento
con il metodo giusto e il tesseramento passa ad attivo per la stessa strada. Tessera e
ricevuta partono identiche. Il sistema non presume che l'unico canale sia quello online.

## 7. Accesso e ruoli

Genitori, soci ed educatori **non sono utenti del tenant Microsoft**, quindi serve un
accesso proprio.

**Accesso senza password, con link via email.** La persona inserisce l'indirizzo, riceve un
link a scadenza breve, entra. Niente password da scegliere, dimenticare o riusare — e
niente credenziali da custodire per noi, che è la parte che conta trattando dati di persone
fragili. Il link è a uso singolo e legato al dispositivo che l'ha chiesto.

**I partecipanti non hanno accesso in fase 1.** Il loro ambito nasce con l'app (fase 4) e
va progettato per l'accessibilità, non ereditato dall'area genitori.

**Il direttivo** usa lo stesso meccanismo, ristretto a un ruolo assegnato in anagrafica.
Chi entra nel backoffice è quindi un dato, non una configurazione: si aggiunge e si toglie
senza un rilascio.

I permessi si valutano **sempre lato API**: nascondere un pulsante nel browser non è un
controllo di accesso.

## 8. Pagamenti

Il fornitore va scelto (§12), ma la scelta non cambia l'architettura: il gateway sta dietro
un'interfaccia applicativa con un'unica implementazione iniziale. Quello che è **deciso**:

- **Pagina di pagamento ospitata dal fornitore.** L'associazione non tocca mai i dati della
  carta e la conformità PCI non ci riguarda. Non si costruisce un modulo carta nostro.
- **Il webhook è idempotente** e verificato in firma: un evento già elaborato non produce
  un secondo pagamento.
- **Riconciliazione attiva**: le domande ferme in attesa da più di un'ora vengono
  interrogate contro il gateway. Nessun incasso può sparire perché un webhook non è
  arrivato.
- Gli importi si mostrano sempre nel formato `€ 25,00`.

## 9. Consensi e foto

Il meccanismo che filtra le foto si costruisce nella fase 2, quando le foto arrivano. Ma
**i dati che lo alimentano si raccolgono adesso**, nel modulo di tesseramento: è il momento
in cui la famiglia è già lì e sta leggendo. Raccoglierli dopo significa rincorrere ottanta
persone.

Il contratto che la fase 1 deve garantire alla fase 2:

- Ogni persona ha un esito esplicito per ciascuno dei quattro canali. **L'assenza di
  risposta vale come diniego**, mai come assenso.
- La revoca è possibile dall'area riservata in qualunque momento, e ha effetto sulle foto
  già pubblicate, non solo su quelle future.
- Il consenso è **storicizzato**: si sa cosa valeva alla data in cui una foto è stata
  pubblicata.
- **Le foto non escono mai come collegamenti di SharePoint.** Il sito pubblico riceve i
  byte dall'API, che controlla i consensi a ogni richiesta. Un collegamento di condivisione,
  una volta creato, vive di vita propria e non sa nulla di chi ha revocato: sarebbe una
  fuga di dati con la data di scadenza sbagliata.

Basterà una persona senza consenso, fra quelle ritratte, per fermare una foto su quel
canale. Il sistema non chiederà a un educatore di ricordarsene.

## 10. Cosa succede quando qualcosa va storto

- **Il socio paga e la conferma non arriva.** Il gateway ripete il webhook per ore, e in
  più la riconciliazione di §8 interroga le domande ferme. Il backoffice mostra la lista.
- **La mail con la tessera non parte.** Generazione del PDF e invio sono passi separati e
  ripetibili: se Graph è irraggiungibile il tesseramento resta attivo e la mail si rimanda
  dal backoffice. Un problema di posta non blocca mai un socio.
- **Il server perde i dati.** Backup notturno del database, con marcatore di completamento
  e copie che escono dalla macchina: un backup che vive sullo stesso disco che sta
  proteggendo non è un backup.
- **I file no**: quelli li conserva Microsoft, con versioni e cestino. È il rovescio della
  scelta di tenerli su SharePoint, ed è accettato — ma significa che **un ripristino del
  database a una data precedente non riavvolge i file**. L'esito sono elementi orfani su
  SharePoint, non righe che puntano al nulla, e la riconciliazione notturna li elenca.
- **Qualcuno sposta o rinomina un file dalla libreria.** Non succede niente: il legame è
  l'identificativo dell'elemento, non il percorso. Se invece lo *cancella*, la
  riconciliazione lo segnala il mattino dopo e il documento si rigenera — tessere e
  ricevute sono riproducibili dal dato, le foto no.

## 11. Come si verifica che funzioni

- Le regole che **decidono** — riconoscimento di una persona già in anagrafica, transizioni
  di stato del tesseramento, assegnazione del numero, quali canali un consenso abilita —
  si collaudano con test automatici che girano senza toccare il gateway vero.
- Il percorso completo del pagamento si prova in **modalità di collaudo del fornitore**,
  con carte finte, prima di aprire alle famiglie.
- Il webhook si prova anche nei casi sgradevoli: evento duplicato, evento fuori ordine,
  firma non valida, pagamento fallito.
- Il legame con SharePoint si prova **spostando e rinominando davvero** un file nella
  libreria di collaudo: se il documento resta raggiungibile, la chiave è quella giusta.
  Si prova anche il caso in cui Graph risponde con una limitazione e quello in cui non
  risponde affatto — la tessera deve esistere lo stesso.
- **Nessuna prova viene fatta sui soci reali**, e nessuna email di prova raggiunge un
  indirizzo vero.

## 12. Decisioni aperte

Le prime tre sono del direttivo e **non bloccano la scrittura del piano**, perché il design
le tratta come dati o configurazione, non come struttura.

1. **Quale gateway.** Proposta: pagina di pagamento ospitata dal fornitore, con l'eventuale
   aggiunta in seguito di un canale molto diffuso fra le famiglie. Serve comunque l'apertura
   di un conto commerciante intestato all'associazione, firmata dalla Presidente.
2. **Importo e struttura della quota.** Unica per tutti, o distinta per tipo di socio? I
   partecipanti pagano la quota associativa oltre alle attività? Il modello regge entrambe
   le risposte: cambia il contenuto della tabella `quota`.
3. **Chi entra nel backoffice.** Tutto il direttivo o solo chi tiene i conti.

Le ultime due sono lavoro nostro, e vanno chiuse **prima del rilascio**.

4. **Capienza dell'host — rischio dichiarato, non risolto.** CPU, memoria e disco liberi
   sulla macchina OVH non sono stati misurati: non esistono credenziali di accesso al
   server nel vault. Nel frattempo sullo stesso host sta per atterrare la piattaforma
   Kuoyo, che non è leggera (1.314 ordini, 11.826 fasi, viste materializzate rinfrescate
   ogni 60 secondi). La Rosa dei Venti è minuscola al confronto — ottanta soci — ma va
   misurato prima del primo rilascio. Vale il precedente del server T440 di Kuoyo, che
   sembrava adeguato e aveva 4 CPU libere su 10.
5. **Nomina a responsabile del trattamento.** Portando i dati sui server BE Care, BE Care
   diventa responsabile del trattamento per conto dell'associazione. Su dati di persone con
   disabilità serve l'atto scritto previsto dall'art. 28 GDPR, firmato dalla Presidente.
   È più pulito dell'ambiguità attuale, ma va firmato prima di caricare il primo socio.

## 13. Nota di stato sul sito attuale

Verificato il 07/08/2026 sul sito vero: **il sito nuovo non è mai andato online.**
All'indirizzo dell'associazione risponde ancora WordPress (`wp-login.php` raggiungibile,
`progetti.html` e `data/projects.json` in 404), perché la cartella `new-site/` è esclusa dal
workflow di rilascio FTP. Non c'è quindi un sito da riagganciare ai dati: c'è un sito
costruito e mai pubblicato. La fase 3 diventa la sua pubblicazione **sull'infrastruttura
BE Care**, con Ergonet che smette di ospitare e Register che conserva solo il dominio.
