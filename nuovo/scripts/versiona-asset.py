# -*- coding: utf-8 -*-
"""Cambia la versione degli asset (?v=...) in tutte le pagine del sito.

⛔ Perché ESISTE. Il server che sta davanti a Ergonet consegna da sé i file
statici e ignora `.htaccess`: immagini, fogli di stile e script escono con
`Cache-Control: max-age=10368000` (120 giorni), qualunque direttiva si
scriva. Le pagine `.html` invece rispettano il `no-store`. Quindi:
sostituire un file tenendo lo stesso nome non si vede — il file nuovo è
online, ma il browser di chi era passato prima non lo chiede più. È il
motivo per cui il 23/08/2026 sei loghi dei partner sono rimasti quelli
vecchi. L'unica leva è l'indirizzo: `?v=...` è una richiesta diversa.

QUANDO SI LANCIA: dopo aver sostituito un'immagine, un css o un js tenendo
lo stesso nome di file. Se il nome è nuovo non serve.

    python scripts/versiona-asset.py            # versione = la data di oggi
    python scripts/versiona-asset.py 20260901   # versione scelta a mano

Va lanciato dalla cartella `nuovo/`. La versione delle immagini non è
scritta da nessuna parte: `js/main.js` la rilegge dal proprio tag <script>.
"""
import glob
import io
import re
import sys
from datetime import date

versione = sys.argv[1] if len(sys.argv) > 1 else date.today().strftime('%Y%m%d')
if not re.fullmatch(r'[A-Za-z0-9._-]+', versione):
    sys.exit('Versione non valida: usare solo lettere, cifre, punto, trattino.')

pagine = sorted(glob.glob('*.html'))
if not pagine:
    sys.exit('Nessuna pagina .html qui: lanciare lo script dalla cartella nuovo/.')

toccate = 0
for pagina in pagine:
    testo = io.open(pagina, encoding='utf-8').read()
    nuovo = re.sub(
        r'(href|src)="((?:css|js)/[^"?]+\.(?:css|js))(\?v=[^"]*)?"',
        lambda m: '%s="%s?v=%s"' % (m.group(1), m.group(2), versione),
        testo)
    if nuovo != testo:
        io.open(pagina, 'w', encoding='utf-8', newline='').write(nuovo)
        toccate += 1
        print('  aggiornata', pagina)

print('Versione %s su %d pagine di %d.' % (versione, toccate, len(pagine)))
if toccate:
    print('Adesso: git commit e push — il rilascio su Ergonet parte da solo.')
