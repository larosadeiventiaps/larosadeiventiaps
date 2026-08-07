# La Rosa dei Venti APS — Fase 1: anagrafica, consensi e tesseramento online

Specifica di design. Stato: **da approvare**. Data: 07/08/2026.

Questo documento copre il primo dei sei sotto-progetti del sistema di gestione
dell'associazione. Gli altri avranno ciascuno la propria specifica e il proprio piano, e si
appoggiano a quanto costruito qui.

1. **Anagrafica, consensi e tesseramento** ← questo documento
2. **Amministrazione** — incassi extra (donazioni, sponsorizzazioni), spese, fornitori,
   educatori (CV, contratti, costi), importazione dei movimenti BCC e quadratura, rendiconto
3. **Progetti** — archivio, iscrizioni, calendario, presenze, media
4. **Bandi e sponsor** — ricerca finanziamenti, anagrafiche degli enti eroganti,
   rendicontazione per progetto (richiede 2 e 3)
5. **Sito pubblico** — pubblicazione, donazioni online, 5x1000, gallery, archivio progetti
6. **App mobile** — educatori, genitori, partecipanti

---

## 1. Perché si parte da qui

Il perimetro richiesto dall'associazione contiene quattro sistemi che possono vivere
separati: gestione soci, gestione progetti, sito pubblico, app mobile a tre ambiti.
Specificarli insieme produce un documento che non regge alla prima riga di codice.

L'anagrafica viene per prima perché tesseramento, iscrizioni ai progetti, donazioni,
rendiconto e accesso all'app pescano tutti dalla stessa domanda — chi è questa controparte,
è in regola, cosa ha acconsentito. Costruita quella, il resto costa molto meno.

L'amministrazione viene subito dopo perché non dipende da nient'altro, e perché è ciò che
produce il rendiconto. Bandi e sponsor vengono invece **dopo i progetti**, non prima: un
finanziatore vuole vedere i costi imputati a un progetto, e senza progetti la
rendicontazione non ha a cosa attaccarsi.

**L'app è l'ultimo pezzo, non il primo.** Costruirla prima che l'API sia stabile significa
riscriverla, e ogni correzione passa da una revisione di uno store. Nella fase 2 le presenze
e le foto si fanno da pagina web ottimizzata per telefono: gli educatori sono operativi in
settimane, e l'app quando arriva è una scorciatoia comoda su qualcosa che già funziona.

## 2. Perimetro

### Dentro

- Anagrafica dei **soggetti** — persone fisiche e organizzazioni — con i ruoli: socio,
  genitore, partecipante, educatore, volontario, e in prospettiva fornitore, sponsor,
  donatore.
- Nuclei familiari, per collegare genitore e partecipante.
- Registro dei consensi, per persona e per canale.
- Campagna di tesseramento annuale con pagamento online.
- Ricevuta e tessera associativa in PDF, inviate via email.
- Backoffice del direttivo: elenco soci, stato quote, incassi, export per il bilancio.
- Comunicazioni ai soci sui nuovi progetti.
- Area riservata della famiglia: stato delle proprie tessere, pagamento del non versato,
  modifica dei consensi, download della tessera.

### Fuori, per adesso

Incassi extra e spese, fornitori, contratti e costi degli educatori, importazione dei
movimenti bancari, rendiconto (fase 2); archivio progetti, iscrizioni, calendario, presenze,
foto e video, attestati e badge (fase 3); bandi, sponsor e rendicontazione (fase 4);
pubblicazione del sito e donazioni online (fase 5); app mobile e accesso dei partecipanti
(fase 6).

### Ciò che la fase 1 deve comunque anticipare

Due scelte del modello dati **non sono rinviabili**, perché ritrovarle dopo significa una
migrazione con dati veri dentro: la controparte economica generalizzata (`soggetto`) e il
movimento generalizzato (`movimento`). Sono descritte in §5. La fase 1 ne usa una piccola
parte — solo la quota associativa — ma le tabelle nascono nella forma definitiva.

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

### La controparte è un soggetto, non una persona

Il tesseramento riguarda persone fisiche. Tutto il resto del denaro che attraversa
l'associazione no: gli sponsor sono banche, aziende e fondazioni; i fornitori sono aziende;
un educatore può fatturare come ditta individuale; un ente erogatore è un comune o una
fondazione bancaria. Se l'anagrafica nasce come "tabella delle persone", donazioni e
fornitori diventano una seconda tabella e da quel momento *chi è la controparte* si chiede
in due posti — con due grafie dello stesso nome e nessun modo di sommare quanto ha dato la
stessa banca fra sponsorizzazione e contributo.

Quindi la radice è il **soggetto**, e la persona ne è una specializzazione.

### Tabelle

**`soggetto`** — `tipo` (persona fisica / organizzazione), denominazione oppure nome e
cognome, codice fiscale, partita IVA, email, telefono, indirizzo, stato (attivo /
archiviato). È la controparte di ogni movimento di denaro.

**`persona`** — estensione 1:1 di `soggetto` per le persone fisiche: data e luogo di
nascita, `nucleo_id` (facoltativo). Tesseramenti e consensi si attaccano **qui**, non al
soggetto: riguardano persone, e attaccarli alla radice permetterebbe di tesserare una banca.

**`organizzazione`** — estensione 1:1 per aziende, banche, fondazioni ed enti: forma
giuridica, referente, note.

**`nucleo`** — cognome di riferimento, contatto principale, indirizzo, note.

**`soggetto_ruolo`** — i ruoli sono una relazione, non una colonna: la stessa persona è
spesso insieme genitore e volontaria, e la stessa azienda può essere fornitore e sponsor.
Elenco chiuso, esteso una fase alla volta.

**`consenso`** — `persona_id`, `canale` (interno · sito · social · stampa), `concesso`
(sì/no), `data`, `origine` (modulo online / cartaceo), riferimento al documento firmato.
**Una riga per canale, non una casella sull'anagrafica**: chi acconsente alle foto interne
ma non a quelle sul sito ha due righe con esiti diversi. Le modifiche non sovrascrivono:
si chiude la riga precedente e se ne apre una nuova, perché la domanda a cui il sistema
deve saper rispondere è *chi ha detto sì a cosa, e quando*.

**`quota`** — `anno`, `importo`, con **una sola riga per anno**: la quota associativa è unica
per tutti (deciso dal direttivo il 07/08/2026). Tabella e non costante perché l'importo cambia
di anno in anno senza dover rilasciare una versione.

Le **eccezioni** — quota ridotta o azzerata per una singola persona — non sono un secondo tipo
di quota: sono un `importoApplicato` facoltativo sul tesseramento, con la motivazione accanto.
La differenza conta: con i tipi di quota si perde la traccia del fatto che quella persona ha
pagato meno del dovuto e perché; con l'eccezione esplicita il rendiconto mostra la quota
ordinaria e, separatamente, quanto l'associazione ha rinunciato a incassare.

Le **quote dei progetti** — per progetto oppure mensili — sono un'altra cosa e nascono nella
fase 3: non danno lo status di socio e non vanno sommate a questa. Nel modello sono movimenti
di categoria `QUOTE_ATTIVITA` legati a un'iscrizione, non a un tesseramento.

**`tesseramento`** — `persona_id`, `anno`, `quota_id`, `stato`
(in_attesa · attivo · scaduto · annullato), `numero_tessera`, riferimento al documento
della tessera, date. Vincolo di unicità su `(persona_id, anno)` fra i tesseramenti non
annullati.

**`movimento`** — la tabella che in un progetto meno attento si chiamerebbe `pagamento` e
poi verrebbe duplicata cinque volte. Una quota associativa, una donazione, una
sponsorizzazione, un premio assicurativo e il compenso di un educatore **hanno la stessa
forma**: data, importo con segno, `soggetto_id` della controparte, categoria, metodo
(online / bonifico / contanti), riferimento del gateway, riferimento al documento
giustificativo, e — facoltativo — il fatto che l'ha generato (`tesseramento_id` in fase 1;
iscrizione, contratto o bando nelle fasi successive) e il progetto a cui è imputato.

La fase 1 crea movimenti di un solo tipo, la quota. Ma nasce già così, perché una donazione
registrata in una tabella diversa non entra nello stesso rendiconto senza un'unione scritta
a mano, e quell'unione è il posto dove i conti smettono di quadrare.

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

### Le categorie del movimento guardano al rendiconto

L'associazione è iscritta al RUNTS e il suo bilancio è un **rendiconto per cassa**. Se
l'elenco delle categorie di `movimento` è costruito per **sommare direttamente nelle voci
di quel rendiconto**, il bilancio lo produce il sistema invece di ricostruirlo ogni anno in
un foglio a parte. Se invece le categorie nascono per comodità di chi le digita, il
rendiconto resterà per sempre un lavoro manuale a valle.

È una scelta da fare quando si scrive l'elenco — cioè nel piano della fase 1, perché la
quota associativa è già una voce di quel rendiconto — e va confermata con chi tiene il
bilancio. L'elenco è dato, non codice: si estende senza un rilascio.

### Cosa aggiunge la fase 2, e perché non serve toccare quanto sopra

Movimenti bancari importati dall'estratto BCC (tabella propria, con la chiave anti-duplicato
di §12), proposte di aggancio fra riga di banca e movimento, contratti e costi degli
educatori, e i ruoli fornitore e sponsor su `soggetto_ruolo`. Nessuna di queste tocca la
forma di `soggetto`, `movimento` o `documento`: è la verifica che le fondamenta siano quelle
giuste.

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
   **attivo**, viene assegnato il numero di tessera e registrato il movimento in entrata.
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

Chi paga per bonifico o in contanti viene registrato dal backoffice: si registra il
movimento con il metodo giusto e il tesseramento passa ad attivo per la stessa strada. Tessera e
ricevuta partono identiche. Il sistema non presume che l'unico canale sia quello online.

## 7. Accesso e ruoli

Ci sono **due platee con due esigenze opposte**, e per questo due strade d'accesso.

**Le famiglie: accesso senza password, con link via email.** Genitori, soci ed educatori non
sono utenti del tenant Microsoft. La persona inserisce l'indirizzo, riceve un link a scadenza
breve, entra. Niente password da scegliere, dimenticare o riusare — e niente credenziali da
custodire per noi, che è la parte che conta trattando dati di persone fragili. Il link è a uso
singolo e legato al dispositivo che l'ha chiesto.

**Il backoffice: account Microsoft dell'associazione** (deciso dal direttivo il 07/08/2026).
Vi accedono soltanto alcuni membri del direttivo, quelli che hanno una casella
`@larosadeiventiaps.org`. L'autenticazione passa da Entra ID: password, secondo fattore,
revoca e blocco li governa il tenant, non il nostro sistema — che è esattamente ciò che si
vuole per chi vede l'anagrafica completa di ottanta famiglie.

Chi entra resta comunque **un dato e non una configurazione**: l'accesso richiede sia un
account del tenant sia il ruolo `DIRETTIVO` assegnato in anagrafica. Togliere il ruolo basta a
chiudere la porta senza toccare Microsoft; togliere l'account la chiude anche se il ruolo
resta. Due condizioni, entrambe necessarie.

**I partecipanti non hanno accesso in fase 1.** Il loro ambito nasce con l'app (fase 6) e va
progettato per l'accessibilità, non ereditato dall'area genitori.

I permessi si valutano **sempre lato API**, per entrambe le strade.

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

## 12. Decisioni — chiuse il 07/08/2026

1. **Gateway: Stripe.** Pagina di pagamento ospitata dal fornitore. L'associazione non tocca
   mai i dati della carta e la conformità PCI non ci riguarda. Resta da aprire il conto
   commerciante intestato all'associazione, con la firma della Presidente.
2. **Quota: unica per tutti, con eccezioni.** Una quota associativa annuale fissa; le
   eccezioni si registrano sul singolo tesseramento con la motivazione (§5). Le quote dei
   progetti — per progetto o mensili — sono cosa distinta e arrivano in fase 3.
3. **Backoffice: alcuni membri del direttivo, con account Microsoft** dell'associazione.
   Autenticazione via Entra ID più ruolo `DIRETTIVO` in anagrafica: due condizioni, entrambe
   necessarie (§7).
4. **Categorie di movimento: proposta consegnata** — ventisei voci, ciascuna agganciata a una
   voce del rendiconto per cassa, in
   `Amministrazione\Sistema di gestione\Categorie di movimento - proposta.xlsx`. Va integrata
   e confermata da chi tiene il bilancio **prima di registrare la prima quota**:
   ricategorizzare movimenti già rendicontati è lavoro manuale. L'aggancio alle voci del
   rendiconto è l'unica parte che non ho potuto verificare da solo e va controllata sul
   modello in uso.
5. **Capienza dell'host: nessun problema**, confermato dal titolare dell'infrastruttura.
6. **Nomina a responsabile del trattamento: documento redatto**, in
   `Amministrazione\Sistema di gestione\Nomina a Responsabile del trattamento - BE Care Srl.docx`
   (otto pagine, con Allegato A sulle misure tecniche e organizzative e Allegato B sui
   sub-responsabili). Va firmato dalla Presidente e dall'amministratore di BE Care **prima di
   caricare il primo socio**. È una bozza operativa, non un parere legale: va fatta leggere a
   chi assiste l'associazione prima della firma.

## 13. Appendice — lezioni già pagate sull'import BCC

Non servono alla fase 1, ma vanno registrate adesso perché la fase 2 non le ripaghi. La
stessa banca è già stata affrontata due volte: nel gestionale del Tennis Antella e
nell'archivio banca di BE Care (repository `archivio-banca`). Entrambi i progetti hanno
sbagliato le stesse cose.

- **L'identità di un movimento** è l'impronta di data contabile, data valuta, importo **a
  due decimali** e descrizione, **più un contatore di occorrenza per file d'origine**.
  Senza il contatore, due export che si sovrappongono trasformano la stessa riga in un
  duplicato fantasma; con la scala del decimale sbagliata `1E+3` non aggancia `1000.00` e
  l'anti-duplicato non aggancia niente.
- **Si importano solo giornate complete.** Il giorno in corso e i movimenti non
  contabilizzati restano fuori: entrando, fanno slittare i contatori del giro successivo.
- **Niente scarti silenziosi.** Ogni riga non interpretabile, file mancante o quadratura
  fallita finisce in un elenco di eccezioni. Nell'archivio banca le revisioni hanno trovato
  quattro violazioni di questa regola in altrettanti task: è il difetto che si ripresenta.
- **L'export BCC è un `.xls` OLE2 vero** (BIFF): le librerie moderne non lo leggono. Il
  portale offre anche EXCEL, CBI e XML, e vanno confrontati prima di scegliere.
- **La riga di banca non decide da sola a cosa si riferisce.** L'aggancio fra un bonifico e
  la quota che l'ha generato si **propone** e si conferma: un aggancio automatico sbagliato
  sporca il rendiconto senza fare rumore, ed è la classe di difetto peggiore perché il
  sistema riferisce un successo.
- **L'estratto conto è la verità su quanto c'è, il sistema è la verità sul perché.** La
  quadratura confronta le due e segnala le differenze; non fa vincere né l'uno né l'altro.

## 14. Nota di stato sul sito attuale

Verificato il 07/08/2026 sul sito vero: **il sito nuovo non è mai andato online.**
All'indirizzo dell'associazione risponde ancora WordPress (`wp-login.php` raggiungibile,
`progetti.html` e `data/projects.json` in 404), perché la cartella `new-site/` è esclusa dal
workflow di rilascio FTP. Non c'è quindi un sito da riagganciare ai dati: c'è un sito
costruito e mai pubblicato. La fase 3 diventa la sua pubblicazione **sull'infrastruttura
BE Care**, con Ergonet che smette di ospitare e Register che conserva solo il dominio.
