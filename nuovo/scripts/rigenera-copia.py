# -*- coding: utf-8 -*-
"""Riscrive `data/*.json` del sito da quello che il gestionale pubblica OGGI.

⭐ **Questi file non sono più la fonte: sono la copia di sicurezza.** Da quando
il sito legge il gestionale (28/08/2026), servono solo quando il gestionale non
risponde. Ma una copia che invecchia è peggio di nessuna copia: al primo guasto
il sito mostrerebbe con sicurezza dei dati sbagliati — i cinque progetti
spostati fra gli eventi, il nome vecchio della Società della Salute, i partner
senza logo.

⛔ **Non è il vecchio `sync-projects.py`**, che è chiuso a chiave: quello
rigenerava dall'Excel e cancellava in silenzio il lavoro fatto a mano. Questo
copia dal gestionale, che è la fonte, e si può rilanciare quando si vuole.

⚠️ **Fino al 14/09/2026 questo script viveva in una cartella temporanea** di
una sessione di lavoro, fuori dal repository: il giorno che serviva
aggiornarlo (per `collaboratori`) è stato ritrovato per caso. Da oggi sta qui,
accanto agli altri script, e si lancia dalla cartella `nuovo/`:

    python scripts/rigenera-copia.py            # PROVA: dice cosa farebbe
    python scripts/rigenera-copia.py --scrivi   # scrive davvero i tre file

⛔ **Quando un dato cambia di posto, cambia in TUTTI i posti che lo leggono**:
l'adattatore del sito (`js/dati-pubblici.js`) e questo script leggono la
stessa api e devono scrivere gli stessi campi. Il 28/08 gli sponsor sono stati
corretti nell'uno e dimenticati nell'altro, e la copia diceva «zero sponsor»
mentre l'api ne dava 25. Non si vedeva: si sarebbe visto il giorno del guasto.
"""
import io, json, os, sys, urllib.request
from datetime import date

API = 'https://rdv.nextum.it/api/pubblico'
# ⚠️ Relativo allo script, non alla cartella da cui lo si lancia: così vale
#    da qualunque posto e da qualunque copia del repository.
DEST = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
SCRIVI = '--scrivi' in sys.argv

def g(p):
    return json.load(urllib.request.urlopen(API + p, timeout=30))

def stato(dal, al):
    """Le stesse tre parole che usa il sito, calcolate come le calcola lui."""
    oggi = date.today().isoformat()
    if al and al < oggi: return 'passato'
    if dal and dal > oggi: return 'futuro'
    return 'in_corso'

def elenco_nomi(valore):
    """Array com'è; stringa con le virgole (il vecchio file) spezzata in nomi.
    Stessa regola di `elencoNomi` in `js/main.js`: virgola e punto e virgola,
    mai il punto («Coop. Sociale» è un nome, non due)."""
    if isinstance(valore, list):
        return [v for v in valore if v]
    if isinstance(valore, str):
        return [s.strip() for s in valore.replace(';', ',').split(',') if s.strip()]
    return []

# --- partner ---------------------------------------------------------------
partner = [{'name': p['nome'], 'type': p['tipo'], 'description': p['descrizione'] or '',
            'logo': p['logoUrl'], 'url': p['sito']} for p in g('/partner')]

# --- eventi ----------------------------------------------------------------
eventi = [{'title': e['titolo'], 'startDate': e['dataInizio'], 'endDate': e['dataFine'],
           'location': e['luogo'] or e['comune'] or '', 'description': e['descrizione'] or '',
           'image': e['copertinaUrl'], 'status': stato(e['dataInizio'], e['dataFine']),
           **({'link': e['urlEsterno']} if e['urlEsterno'] else {})} for e in g('/eventi')]

# --- progetti: una riga per EDIZIONE, come il file ha sempre avuto ----------
progetti = []
api_senza_collaboratori = 0
for riga in g('/progetti'):
    d = g('/progetti/' + riga['slug'])
    img = d.get('copertinaUrl')
    # ⭐ I collaboratori stanno sul PROGETTO (14/09/2026), non sull'edizione
    #    come gli sponsor: si copiano su ogni riga, e il sito li riunisce.
    # ⛔ Chiave ASSENTE e `[]` sono due cose diverse: `[]` è l'api che dice
    #    «nessuno», e ha ragione lei; la chiave assente è un'api più vecchia
    #    di questo script, e allora si tiene quello che il file sapeva (vedi
    #    DA_CONSERVARE), invece di svuotare trenta righe senza dirlo.
    ha_collaboratori = 'collaboratori' in d
    if not ha_collaboratori:
        api_senza_collaboratori += 1
    for ed in (d.get('edizioni') or []):
        n = ed.get('numeri') or {}
        voce = {
            'title': d['titolo'], 'image': img,
            'startDate': ed['dal'], 'endDate': ed['al'],
            'status': stato(ed['dal'], ed['al']),
            'incontri': n.get('incontri', 0), 'ore': n.get('ore', 0),
            'partecipanti': n.get('partecipanti', 0),
            # ⚠️ Qui si scrive 0 e non si omette la chiave: il file è una
            # fotografia, e `renderNumeriProgetto` nasconde comunque le righe a
            # zero. Omettere avrebbe reso il file diverso dall'API senza motivo.
            'educatori': n.get('educatori', 0), 'volontari': n.get('volontari', 0),
            'professionisti': n.get('professionisti', 0),
            # ⚠️ Dall'EDIZIONE, non dal progetto. Qui c'era
            # `d.get('partner')` — l'unico partner del progetto intero — ed è
            # lo stesso errore che sul sito teneva vuota la tabella «Con il
            # sostegno di»: l'ho corretto nell'adattatore e me lo sono
            # ritrovato qui, in un file scritto due ore dopo.
            'sponsor': ed.get('sponsor') or [],
            'description': d.get('descrizionePubblica') or '',
        }
        if ha_collaboratori:
            voce['collaboratori'] = elenco_nomi(d.get('collaboratori'))
        progetti.append(voce)

# ⛔⛔ **I campi che il gestionale NON conosce, e che vanno CONSERVATI.**
# Il 28/08/2026 la prima versione di questo script li ha buttati via, e il
# titolare se n'è accorto guardando il sito: «il calendario ha perso gli
# appuntamenti con le edizioni». Tredici appuntamenti veri, spariti.
# ⚠️ `luogoId` e `location` servono al calendario per il luogo;
# `appuntamenti` sono i singoli incontri con l'orario scritti a mano prima che
# il gestionale li avesse. `collaboratori` resta qui SOLO per l'api che non
# li manda ancora: appena la chiave arriva, vince l'api (anche se vuota).
# ⇒ **Un avvertimento dentro un file non ferma chi sta lavorando su un altro
#   file**: qui la protezione è nel codice che rigenera, il solo posto dove serve.
DA_CONSERVARE = ('appuntamenti', 'collaboratori', 'location', 'luogoId')


def fondi(nuove, vecchie):
    """Riporta nelle righe nuove i campi che solo il file vecchio conosce."""
    per_chiave = {(r.get('title'), r.get('startDate')): r for r in vecchie}
    for r in nuove:
        v = per_chiave.get((r.get('title'), r.get('startDate')))
        if not v:
            continue
        for c in DA_CONSERVARE:
            # ⚠️ Solo dove il nuovo TACE (chiave assente): dove il gestionale
            #    sa, ha ragione lui — anche quando dice «nessuno».
            if c not in r and v.get(c):
                r[c] = v[c]
    return nuove


for nome, dati in (('partners.json', partner), ('events.json', eventi), ('projects.json', progetti)):
    p = os.path.join(DEST, nome)
    vecchie = json.load(io.open(p, encoding='utf-8'))
    dati = fondi(dati, vecchie)
    tenuti = sum(1 for r in dati for c in DA_CONSERVARE if r.get(c))
    print('%-16s %3d voci -> %3d  (campi conservati: %d)' % (nome, len(vecchie), len(dati), tenuti))
    if nome == 'projects.json':
        con_coll = sum(1 for r in dati if r.get('collaboratori'))
        print('%-16s %3d edizioni con collaboratori' % ('', con_coll))
        if api_senza_collaboratori:
            num_progetti = len({r['title'] for r in progetti})
            print('  ATTENZIONE: %d progetti su %d senza la chiave `collaboratori` nell\'api: '
                  'tenuto il valore del file.' % (api_senza_collaboratori, num_progetti))
    if SCRIVI:
        io.open(p, 'w', encoding='utf-8').write(json.dumps(dati, ensure_ascii=False, indent=2))

print('\nPROVA: nessuna scrittura. Rilancia con --scrivi' if not SCRIVI else '\nscritti')
