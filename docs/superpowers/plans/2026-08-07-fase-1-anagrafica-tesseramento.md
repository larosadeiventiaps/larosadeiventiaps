# Fase 1 — Anagrafica, consensi e tesseramento — Piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portare online l'anagrafica dei soggetti, il registro dei consensi e il tesseramento annuale con pagamento, tessera e ricevuta in PDF su SharePoint, backoffice per il direttivo e area riservata per le famiglie.

**Architecture:** API NestJS unica in Docker davanti a PostgreSQL 16, client React/Vite, file su SharePoint via Microsoft Graph. L'API è l'unico componente che tocca gli archivi; il pagamento sta dietro una porta applicativa con un solo adattatore iniziale; il webhook del gateway è ciò che rende attivo un tesseramento, non il ritorno del browser.

**Tech Stack:** NestJS 11 · Prisma 7 con `@prisma/adapter-pg` · PostgreSQL 16 · React 18 + Vite · Jest (unit + e2e su database vero) · Docker Compose · Microsoft Graph (mail e file) · Stripe come primo adattatore di pagamento.

## Global Constraints

- **Lingua**: identificatori del codice in inglese, testi utente e messaggi di errore in **italiano**. Accenti tipografici corretti (`à è é ì ò ù`), mai apostrofi finali.
- **Importi**: sempre `€ 25,00` nell'interfaccia — simbolo davanti, separatore migliaia `.`, decimali `,`. In database `Decimal(10,2)`. Mai `float`.
- **Moduli web**: etichetta **sopra** il campo, campo sotto. Il campo **Nome viene sempre prima di Cognome**.
- **Acronimi societari senza punti**: `Srl`, `Spa`, `SA`. Mai `S.r.l.`.
- **Prisma 7**: niente `url` dentro `datasource` nello schema; connessione via `@prisma/adapter-pg` + `prisma.config.ts`. `previewFeatures = ["multiSchema"]` è obsoleto e non va scritto.
- **Migrazioni**: in produzione solo `prisma migrate deploy`. `migrate dev` **mai** contro un database con dati.
- **Nessuno scarto silenzioso**: ogni input rifiutato, evento ignorato o caricamento fallito lascia una traccia leggibile (riga di stato, log `warn`, o record di eccezione). Un rifiuto muto è un difetto, non una scelta.
- **Nessuna prova su dati reali**: nessun test invia email a indirizzi veri né scrive nella libreria SharePoint di produzione.
- **Date**: in database `timestamptz`, sempre UTC. La conversione al fuso di Roma avviene solo nella resa.
- **Il repository di lavoro è `C:\Development\RosaDeiVentiPiattaforma`** (creato dal Task 1). La spec di riferimento è `docs/spec/2026-08-07-anagrafica-tesseramento-design.md` dentro quel repository, copiata dal Task 1.

---

### Task 1: Fondamenta — repository, Docker, Prisma, cancello e2e

**Files:**
- Create: `C:/Development/RosaDeiVentiPiattaforma/.gitignore`
- Create: `api/package.json`, `api/tsconfig.json`, `api/nest-cli.json`, `api/eslint.config.mjs`
- Create: `api/prisma/schema.prisma`, `api/prisma.config.ts`
- Create: `api/src/main.ts`, `api/src/app.module.ts`
- Create: `api/src/prisma/prisma.service.ts`, `api/src/prisma/prisma.module.ts`
- Create: `api/src/health/health.controller.ts`, `api/src/health/health.module.ts`
- Create: `api/test/jest-e2e.json`, `api/test/setup-test-db.js`, `api/test/health.e2e-spec.ts`
- Create: `docker/docker-compose.yml`, `docker/.env.example`, `api/Dockerfile`, `api/.dockerignore`
- Create: `docs/spec/2026-08-07-anagrafica-tesseramento-design.md` (copia della spec)

**Interfaces:**
- Consumes: niente (primo task).
- Produces: `PrismaService` (estende `PrismaClient`, esportato da `PrismaModule`); `GET /health` → `{ stato: 'ok' }`; comandi `npm run test:e2e`, `npm run typecheck`, `npm run lint`.

- [ ] **Step 1: Creare il repository e la struttura**

```bash
mkdir C:/Development/RosaDeiVentiPiattaforma
cd C:/Development/RosaDeiVentiPiattaforma
git init
mkdir api web docker docs docs/spec docs/plan
cp "C:/Development/LaRosadeiVenti/docs/superpowers/specs/2026-08-07-anagrafica-tesseramento-design.md" docs/spec/
cp "C:/Development/LaRosadeiVenti/docs/superpowers/plans/2026-08-07-fase-1-anagrafica-tesseramento.md" docs/plan/
```

`.gitignore` alla radice:

```
node_modules/
dist/
.env
docker/.env
*.log
coverage/
```

- [ ] **Step 2: Inizializzare l'API NestJS**

```bash
cd api
npm init -y
npm i @nestjs/common@^11 @nestjs/core@^11 @nestjs/platform-express@^11 reflect-metadata rxjs class-validator class-transformer
npm i @prisma/client@^7 @prisma/adapter-pg@^7 pg
npm i -D @nestjs/cli@^11 @nestjs/testing@^11 typescript ts-node ts-jest jest @types/jest @types/node supertest @types/supertest tsconfig-paths prisma@^7 eslint prettier
```

In `api/package.json`, sezione `scripts`:

```json
{
  "scripts": {
    "build": "nest build",
    "start:prod": "node dist/src/main.js",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "lint": "eslint \"{src,test}/**/*.ts\"",
    "test": "jest",
    "pretest:e2e": "node test/setup-test-db.js",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  }
}
```

- [ ] **Step 3: Configurare Prisma 7 con l'adattatore**

`api/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}
```

`api/prisma.config.ts`:

```ts
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
})
```

`api/src/prisma/prisma.service.ts`:

```ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL non impostata: l\'API non può partire senza database')
    super({ adapter: new PrismaPg({ connectionString: url }) })
  }
  async onModuleInit() { await this.$connect() }
  async onModuleDestroy() { await this.$disconnect() }
}
```

`api/src/prisma/prisma.module.ts`:

```ts
import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'

@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
```

- [ ] **Step 4: Scrivere il test e2e che fallisce**

`api/test/health.e2e-spec.ts`:

```ts
import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { AppModule } from '../src/app.module'

describe('health', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => { await app.close() })

  it('risponde ok quando il database è raggiungibile', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200)
    expect(res.body).toEqual({ stato: 'ok' })
  })
})
```

`api/test/jest-e2e.json`:

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "..",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "maxWorkers": 1
}
```

`api/test/setup-test-db.js` — crea il database di test e applica le migrazioni:

```js
const { execSync } = require('node:child_process')

const name = process.env.TEST_DB_NAME || 'rdv_test'
const admin = process.env.ADMIN_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres'
const url = admin.replace(/\/[^/]*$/, `/${name}`)

execSync(`psql "${admin}" -c "DROP DATABASE IF EXISTS ${name}"`, { stdio: 'inherit' })
execSync(`psql "${admin}" -c "CREATE DATABASE ${name}"`, { stdio: 'inherit' })
execSync('npx prisma migrate deploy', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: url } })
console.log(`database di test pronto: ${name}`)
```

- [ ] **Step 5: Eseguire il test e verificare che fallisca**

Run: `cd api && npm run test:e2e -- health`
Expected: FAIL — `Cannot find module '../src/app.module'`

- [ ] **Step 6: Implementare app, health e main**

`api/src/health/health.controller.ts`:

```ts
import { Controller, Get } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async stato() {
    await this.prisma.$queryRaw`SELECT 1`
    return { stato: 'ok' }
  }
}
```

`api/src/health/health.module.ts`:

```ts
import { Module } from '@nestjs/common'
import { HealthController } from './health.controller'

@Module({ controllers: [HealthController] })
export class HealthModule {}
```

`api/src/app.module.ts`:

```ts
import { Module } from '@nestjs/common'
import { PrismaModule } from './prisma/prisma.module'
import { HealthModule } from './health/health.module'

@Module({ imports: [PrismaModule, HealthModule] })
export class AppModule {}
```

`api/src/main.ts`:

```ts
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  await app.listen(3000, '0.0.0.0')
}
bootstrap()
```

⚠️ `setGlobalPrefix('api')` significa che il test e2e deve chiamare `/health`, non `/api/health`, perché il prefisso è impostato in `main.ts` e non in `AppModule`. Se un test futuro fallisce con 404 su una rotta esistente, è questa la ragione.

- [ ] **Step 7: Eseguire il test e verificare che passi**

Run: `cd api && npm run test:e2e -- health`
Expected: PASS

- [ ] **Step 8: Scrivere Dockerfile, .dockerignore e compose di sviluppo**

`api/.dockerignore` — ⚠️ senza questo file il `COPY . .` sovrascrive i `node_modules` Alpine con quelli Windows e il query engine di Prisma smette di funzionare:

```
node_modules
dist
npm-debug.log
```

`api/Dockerfile`:

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
EXPOSE 3000
CMD ["node", "dist/src/main.js"]
```

`docker/docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-rdv}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-rdv}
      POSTGRES_DB: ${POSTGRES_DB:-rdv}
    ports: ["5432:5432"]
    volumes: ["dbdata:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-rdv}"]
      interval: 5s
      retries: 10

  api:
    build: ../api
    environment:
      DATABASE_URL: ${DATABASE_URL}
    ports: ["3000:3000"]
    depends_on:
      db: { condition: service_healthy }

volumes:
  dbdata: {}
```

`docker/.env.example`:

```
POSTGRES_USER=rdv
POSTGRES_PASSWORD=cambiami
POSTGRES_DB=rdv
DATABASE_URL=postgresql://rdv:cambiami@db:5432/rdv
```

- [ ] **Step 9: Verificare che lo stack parta**

Run: `cd docker && cp .env.example .env && docker compose up -d --build && curl -s localhost:3000/health`
Expected: `{"stato":"ok"}`

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: fondamenta — NestJS, Prisma 7, Postgres, health, cancello e2e"
```

---

### Task 2: Anagrafica — soggetto, persona, organizzazione, nucleo, ruoli

**Files:**
- Modify: `api/prisma/schema.prisma`
- Create: `api/src/anagrafica/anagrafica.module.ts`, `anagrafica.service.ts`, `anagrafica.controller.ts`, `dto/crea-soggetto.dto.ts`
- Test: `api/test/anagrafica.e2e-spec.ts`

**Interfaces:**
- Consumes: `PrismaService` dal Task 1.
- Produces: `AnagraficaService.creaPersona(dati): Promise<{ soggettoId: string }>`, `AnagraficaService.creaOrganizzazione(dati): Promise<{ soggettoId: string }>`, `AnagraficaService.trovaPersona(criteri): Promise<Persona | null>`. Enum Prisma `TipoSoggetto { PERSONA, ORGANIZZAZIONE }` e `Ruolo { SOCIO, GENITORE, PARTECIPANTE, EDUCATORE, VOLONTARIO, FORNITORE, SPONSOR, DONATORE, DIRETTIVO }`.

- [ ] **Step 1: Scrivere il test che fallisce**

`api/test/anagrafica.e2e-spec.ts`:

```ts
import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'

describe('anagrafica', () => {
  let app: INestApplication
  let prisma: PrismaService

  beforeAll(async () => {
    const m = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = m.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)
  })

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE soggetto, nucleo RESTART IDENTITY CASCADE')
  })

  afterAll(async () => { await app.close() })

  it('crea una persona con un ruolo e la ritrova per codice fiscale', async () => {
    const creata = await request(app.getHttpServer())
      .post('/anagrafica/persone')
      .send({
        nome: 'Giulia', cognome: 'Neri',
        codiceFiscale: 'NREGLI04C54D612R',
        dataNascita: '2004-03-14',
        email: 'famiglia.neri@example.it',
        ruoli: ['PARTECIPANTE'],
      })
      .expect(201)

    expect(creata.body.soggettoId).toBeDefined()

    const trovata = await request(app.getHttpServer())
      .get('/anagrafica/persone?codiceFiscale=NREGLI04C54D612R')
      .expect(200)

    expect(trovata.body.nome).toBe('Giulia')
    expect(trovata.body.ruoli).toEqual(['PARTECIPANTE'])
  })

  it('una organizzazione non può essere creata come persona', async () => {
    await request(app.getHttpServer())
      .post('/anagrafica/persone')
      .send({ denominazione: 'BCC di Pontassieve', partitaIva: '01234567890' })
      .expect(400)
  })

  it('rifiuta un codice fiscale duplicato invece di creare un secondo soggetto', async () => {
    const corpo = { nome: 'Marco', cognome: 'Neri', codiceFiscale: 'NREMRC70A01D612X', dataNascita: '1970-01-01', ruoli: ['GENITORE'] }
    await request(app.getHttpServer()).post('/anagrafica/persone').send(corpo).expect(201)
    const secondo = await request(app.getHttpServer()).post('/anagrafica/persone').send(corpo).expect(409)
    expect(secondo.body.message).toMatch(/già presente/i)
  })
})
```

- [ ] **Step 2: Eseguire il test e verificare che fallisca**

Run: `cd api && npm run test:e2e -- anagrafica`
Expected: FAIL — la tabella `soggetto` non esiste.

- [ ] **Step 3: Scrivere lo schema**

Aggiungere a `api/prisma/schema.prisma`:

```prisma
enum TipoSoggetto { PERSONA ORGANIZZAZIONE }

enum Ruolo {
  SOCIO GENITORE PARTECIPANTE EDUCATORE VOLONTARIO
  FORNITORE SPONSOR DONATORE DIRETTIVO
}

model Soggetto {
  id             String          @id @default(uuid())
  tipo           TipoSoggetto
  denominazione  String?
  nome           String?
  cognome        String?
  codiceFiscale  String?         @unique @map("codice_fiscale")
  partitaIva     String?         @map("partita_iva")
  email          String?
  telefono       String?
  indirizzo      String?
  attivo         Boolean         @default(true)
  creatoIl       DateTime        @default(now()) @map("creato_il") @db.Timestamptz(3)
  persona        Persona?
  organizzazione Organizzazione?
  ruoli          SoggettoRuolo[]
  movimenti      Movimento[]

  @@map("soggetto")
}

model Persona {
  soggettoId   String    @id @map("soggetto_id")
  soggetto     Soggetto  @relation(fields: [soggettoId], references: [id], onDelete: Cascade)
  dataNascita  DateTime? @map("data_nascita") @db.Date
  luogoNascita String?   @map("luogo_nascita")
  nucleoId     String?   @map("nucleo_id")
  nucleo       Nucleo?   @relation(fields: [nucleoId], references: [id])

  @@map("persona")
}

model Organizzazione {
  soggettoId    String   @id @map("soggetto_id")
  soggetto      Soggetto @relation(fields: [soggettoId], references: [id], onDelete: Cascade)
  formaGiuridica String? @map("forma_giuridica")
  referente     String?
  note          String?

  @@map("organizzazione")
}

model Nucleo {
  id                 String    @id @default(uuid())
  cognomeRiferimento String    @map("cognome_riferimento")
  contattoPrincipale String?   @map("contatto_principale")
  indirizzo          String?
  note               String?
  persone            Persona[]

  @@map("nucleo")
}

model SoggettoRuolo {
  soggettoId String   @map("soggetto_id")
  soggetto   Soggetto @relation(fields: [soggettoId], references: [id], onDelete: Cascade)
  ruolo      Ruolo

  @@id([soggettoId, ruolo])
  @@map("soggetto_ruolo")
}
```

Generare la migrazione:

```bash
cd api
DATABASE_URL=postgresql://rdv:rdv@localhost:5432/rdv npx prisma migrate dev --name anagrafica
```

- [ ] **Step 4: Implementare servizio e controller**

`api/src/anagrafica/dto/crea-soggetto.dto.ts`:

```ts
import { IsArray, IsDateString, IsEmail, IsEnum, IsOptional, IsString, Length } from 'class-validator'
import { Ruolo } from '@prisma/client'

export class CreaPersonaDto {
  @IsString() @Length(1, 80) nome!: string
  @IsString() @Length(1, 80) cognome!: string
  @IsOptional() @IsString() @Length(16, 16) codiceFiscale?: string
  @IsOptional() @IsDateString() dataNascita?: string
  @IsOptional() @IsString() luogoNascita?: string
  @IsOptional() @IsEmail() email?: string
  @IsOptional() @IsString() telefono?: string
  @IsOptional() @IsString() indirizzo?: string
  @IsOptional() @IsString() nucleoId?: string
  @IsArray() @IsEnum(Ruolo, { each: true }) ruoli!: Ruolo[]
}
```

`api/src/anagrafica/anagrafica.service.ts`:

```ts
import { ConflictException, Injectable } from '@nestjs/common'
import { Prisma, TipoSoggetto } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreaPersonaDto } from './dto/crea-soggetto.dto'

@Injectable()
export class AnagraficaService {
  constructor(private readonly prisma: PrismaService) {}

  async creaPersona(dati: CreaPersonaDto) {
    try {
      const soggetto = await this.prisma.soggetto.create({
        data: {
          tipo: TipoSoggetto.PERSONA,
          nome: dati.nome,
          cognome: dati.cognome,
          codiceFiscale: dati.codiceFiscale?.toUpperCase(),
          email: dati.email,
          telefono: dati.telefono,
          indirizzo: dati.indirizzo,
          persona: {
            create: {
              dataNascita: dati.dataNascita ? new Date(dati.dataNascita) : null,
              luogoNascita: dati.luogoNascita,
              nucleoId: dati.nucleoId,
            },
          },
          ruoli: { create: dati.ruoli.map((ruolo) => ({ ruolo })) },
        },
      })
      return { soggettoId: soggetto.id }
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Una persona con questo codice fiscale è già presente in anagrafica')
      }
      throw e
    }
  }

  async trovaPersonaPerCodiceFiscale(codiceFiscale: string) {
    const soggetto = await this.prisma.soggetto.findUnique({
      where: { codiceFiscale: codiceFiscale.toUpperCase() },
      include: { persona: true, ruoli: true },
    })
    if (!soggetto || soggetto.tipo !== TipoSoggetto.PERSONA) return null
    return {
      soggettoId: soggetto.id,
      nome: soggetto.nome,
      cognome: soggetto.cognome,
      ruoli: soggetto.ruoli.map((r) => r.ruolo),
    }
  }
}
```

`api/src/anagrafica/anagrafica.controller.ts`:

```ts
import { Body, Controller, Get, NotFoundException, Post, Query } from '@nestjs/common'
import { AnagraficaService } from './anagrafica.service'
import { CreaPersonaDto } from './dto/crea-soggetto.dto'

@Controller('anagrafica')
export class AnagraficaController {
  constructor(private readonly anagrafica: AnagraficaService) {}

  @Post('persone')
  crea(@Body() dto: CreaPersonaDto) {
    return this.anagrafica.creaPersona(dto)
  }

  @Get('persone')
  async cerca(@Query('codiceFiscale') codiceFiscale: string) {
    const persona = await this.anagrafica.trovaPersonaPerCodiceFiscale(codiceFiscale)
    if (!persona) throw new NotFoundException('Nessuna persona con questo codice fiscale')
    return persona
  }
}
```

`api/src/anagrafica/anagrafica.module.ts` registra controller e service; aggiungere `AnagraficaModule` agli `imports` di `AppModule`.

⚠️ Il test «una organizzazione non può essere creata come persona» passa grazie a `forbidNonWhitelisted: true` nel `ValidationPipe` del Task 1: `denominazione` non esiste nel DTO, quindi la richiesta è respinta con 400. Non aggiungere quel campo al DTO delle persone.

- [ ] **Step 5: Eseguire i test**

Run: `cd api && npm run test:e2e -- anagrafica`
Expected: PASS (3 test)

- [ ] **Step 6: Scrivere il test dell'audit**

L'audit è previsto dalla spec §5 «su ogni scrittura». Nasce qui perché questo è il primo task che scrive dati di dominio: aggiungerlo dopo significherebbe ripassare su ogni servizio.

```ts
it('creare una persona lascia una riga di audit con chi, quando e cosa', async () => {
  const { body } = await request(app.getHttpServer()).post('/anagrafica/persone').send(datiDiGiulia).expect(201)
  const righe = await prisma.audit.findMany({ where: { entita: 'Soggetto', entitaId: body.soggettoId } })
  expect(righe).toHaveLength(1)
  expect(righe[0].azione).toBe('CREAZIONE')
  expect(righe[0].attore).toBe('anonimo')      // il modulo pubblico non ha ancora un utente
})
```

- [ ] **Step 7: Eseguire e verificare che fallisca**

Run: `cd api && npm run test:e2e -- anagrafica`
Expected: FAIL — `prisma.audit` non esiste.

- [ ] **Step 8: Schema e servizio di audit**

```prisma
model Audit {
  id       String   @id @default(uuid())
  attore   String
  azione   String
  entita   String
  entitaId String   @map("entita_id")
  dati     Json?
  quando   DateTime @default(now()) @db.Timestamptz(3)

  @@index([entita, entitaId])
  @@map("audit")
}
```

`api/src/audit/audit.service.ts`:

```ts
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  registra(p: { attore?: string; azione: string; entita: string; entitaId: string; dati?: unknown }) {
    return this.prisma.audit.create({
      data: { attore: p.attore ?? 'anonimo', azione: p.azione, entita: p.entita, entitaId: p.entitaId, dati: p.dati as Prisma.InputJsonValue },
    })
  }
}
```

⚠️ L'audit si scrive **dentro la stessa transazione** della modifica che descrive. Scritto fuori, una transazione annullata lascia una riga di audit che racconta un fatto mai avvenuto — ed è peggio di non avere audit, perché nessuno lo mette in dubbio. Ogni servizio dei task successivi che scrive dati chiama `AuditService.registra` con la stessa `tx`.

- [ ] **Step 9: Eseguire i test**

Run: `cd api && npm run test:e2e -- anagrafica`
Expected: PASS (4 test)

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat: anagrafica dei soggetti con persone, organizzazioni, nuclei, ruoli e audit"
```

---

### Task 3: Consensi storicizzati per canale

**Files:**
- Modify: `api/prisma/schema.prisma`
- Create: `api/src/consensi/consensi.module.ts`, `consensi.service.ts`, `consensi.controller.ts`
- Test: `api/test/consensi.e2e-spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `Persona` dal Task 2.
- Produces: `ConsensiService.registra(personaId, esiti: Record<Canale, boolean>, origine): Promise<void>`, `ConsensiService.vigentiPer(personaId): Promise<Record<Canale, boolean>>`, `ConsensiService.valeva(personaId, canale, data: Date): Promise<boolean>`. Enum `Canale { INTERNO, SITO, SOCIAL, STAMPA }`.

- [ ] **Step 1: Scrivere il test che fallisce**

`api/test/consensi.e2e-spec.ts` — i tre comportamenti che contano: il diniego per assenza, la storicizzazione, e il fatto che una revoca non cancella il passato.

```ts
it('un canale mai risposto vale come diniego, non come assenso', async () => {
  const { soggettoId } = await creaPersona()
  const vigenti = await consensi.vigentiPer(soggettoId)
  expect(vigenti).toEqual({ INTERNO: false, SITO: false, SOCIAL: false, STAMPA: false })
})

it('registrare di nuovo un canale chiude la riga precedente invece di sovrascriverla', async () => {
  const { soggettoId } = await creaPersona()
  await consensi.registra(soggettoId, { SITO: true }, 'MODULO_ONLINE')
  await consensi.registra(soggettoId, { SITO: false }, 'AREA_RISERVATA')

  const righe = await prisma.consenso.findMany({ where: { personaId: soggettoId, canale: 'SITO' }, orderBy: { validoDal: 'asc' } })
  expect(righe).toHaveLength(2)
  expect(righe[0].concesso).toBe(true)
  expect(righe[0].validoFinoA).not.toBeNull()
  expect(righe[1].concesso).toBe(false)
  expect(righe[1].validoFinoA).toBeNull()
})

it('sa cosa valeva a una data passata', async () => {
  const { soggettoId } = await creaPersona()
  await consensi.registra(soggettoId, { SITO: true }, 'MODULO_ONLINE')
  const primaDellaRevoca = new Date()
  await new Promise((r) => setTimeout(r, 10))
  await consensi.registra(soggettoId, { SITO: false }, 'AREA_RISERVATA')

  expect(await consensi.valeva(soggettoId, 'SITO', primaDellaRevoca)).toBe(true)
  expect(await consensi.valeva(soggettoId, 'SITO', new Date())).toBe(false)
})
```

- [ ] **Step 2: Eseguire e verificare il fallimento**

Run: `cd api && npm run test:e2e -- consensi`
Expected: FAIL — `prisma.consenso` non esiste.

- [ ] **Step 3: Schema**

```prisma
enum Canale { INTERNO SITO SOCIAL STAMPA }
enum OrigineConsenso { MODULO_ONLINE AREA_RISERVATA CARTACEO BACKOFFICE }

model Consenso {
  id          String          @id @default(uuid())
  personaId   String          @map("persona_id")
  canale      Canale
  concesso    Boolean
  origine     OrigineConsenso
  validoDal   DateTime        @default(now()) @map("valido_dal") @db.Timestamptz(3)
  validoFinoA DateTime?       @map("valido_fino_a") @db.Timestamptz(3)
  documentoId String?         @map("documento_id")

  @@index([personaId, canale, validoDal])
  @@map("consenso")
}
```

⚠️ **Nessun vincolo di unicità su `(personaId, canale)`**: le righe storiche devono poter coesistere. La riga vigente è quella con `validoFinoA` nullo, ed è responsabilità del servizio che ce ne sia al più una.

- [ ] **Step 4: Implementare il servizio**

```ts
@Injectable()
export class ConsensiService {
  constructor(private readonly prisma: PrismaService) {}

  private static readonly CANALI: Canale[] = ['INTERNO', 'SITO', 'SOCIAL', 'STAMPA']

  async registra(personaId: string, esiti: Partial<Record<Canale, boolean>>, origine: OrigineConsenso) {
    const adesso = new Date()
    await this.prisma.$transaction(async (tx) => {
      for (const [canale, concesso] of Object.entries(esiti) as [Canale, boolean][]) {
        await tx.consenso.updateMany({
          where: { personaId, canale, validoFinoA: null },
          data: { validoFinoA: adesso },
        })
        await tx.consenso.create({
          data: { personaId, canale, concesso, origine, validoDal: adesso },
        })
      }
    })
  }

  async vigentiPer(personaId: string): Promise<Record<Canale, boolean>> {
    const righe = await this.prisma.consenso.findMany({ where: { personaId, validoFinoA: null } })
    const esito = Object.fromEntries(ConsensiService.CANALI.map((c) => [c, false])) as Record<Canale, boolean>
    for (const r of righe) esito[r.canale] = r.concesso
    return esito
  }

  async valeva(personaId: string, canale: Canale, data: Date): Promise<boolean> {
    const riga = await this.prisma.consenso.findFirst({
      where: {
        personaId, canale,
        validoDal: { lte: data },
        OR: [{ validoFinoA: null }, { validoFinoA: { gt: data } }],
      },
      orderBy: { validoDal: 'desc' },
    })
    return riga?.concesso ?? false
  }
}
```

Il `?? false` di `valeva` e il riempimento con `false` di `vigentiPer` sono **la** regola: nessuna riga significa nessun consenso.

- [ ] **Step 5: Eseguire i test**

Run: `cd api && npm run test:e2e -- consensi`
Expected: PASS (3 test)

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: registro dei consensi per canale, storicizzato, con diniego per assenza"
```

---

### Task 4: Quote, categorie di movimento e movimento

**Files:**
- Modify: `api/prisma/schema.prisma`
- Create: `api/prisma/seed.ts`, `api/src/movimenti/movimenti.module.ts`, `movimenti.service.ts`
- Test: `api/test/movimenti.e2e-spec.ts`

**Interfaces:**
- Consumes: `Soggetto` dal Task 2, `AuditService` dal Task 2.
- Produces: `MovimentiService.registra({ soggettoId, importo, categoria, metodo, tesseramentoId?, riferimentoGateway? }): Promise<Movimento>`; `MovimentiService.totalePerCategoria(anno: number): Promise<Record<string, string>>` (importi come stringhe a due decimali, usato dall'export del Task 14). Enum `CategoriaMovimento` e `MetodoPagamento { ONLINE, BONIFICO, CONTANTI }`.

- [ ] **Step 1: Test che fallisce**

```ts
it('registra una quota associativa in entrata con importo a due decimali', async () => {
  const { soggettoId } = await creaPersona()
  const mov = await movimenti.registra({
    soggettoId, importo: '25.00', categoria: 'QUOTE_ASSOCIATIVE', metodo: 'BONIFICO',
  })
  expect(mov.importo.toFixed(2)).toBe('25.00')
})

it('una uscita si registra con importo negativo e resta negativa', async () => {
  const { soggettoId } = await creaOrganizzazione()
  const mov = await movimenti.registra({
    soggettoId, importo: '-480.00', categoria: 'ASSICURAZIONI', metodo: 'BONIFICO',
  })
  expect(mov.importo.toFixed(2)).toBe('-480.00')
})

it('il totale per categoria somma senza perdere centesimi', async () => {
  const { soggettoId } = await creaPersona()
  for (const i of ['0.10', '0.20', '25.00']) {
    await movimenti.registra({ soggettoId, importo: i, categoria: 'QUOTE_ASSOCIATIVE', metodo: 'CONTANTI' })
  }
  const totale = await movimenti.totalePerCategoria(2026)
  expect(totale.QUOTE_ASSOCIATIVE).toBe('25.30')
})
```

- [ ] **Step 2: Eseguire e verificare il fallimento**

Run: `cd api && npm run test:e2e -- movimenti`
Expected: FAIL — `prisma.movimento` non esiste.

- [ ] **Step 3: Schema**

```prisma
enum MetodoPagamento { ONLINE BONIFICO CONTANTI }

enum CategoriaMovimento {
  QUOTE_ASSOCIATIVE
  EROGAZIONI_LIBERALI
  CONTRIBUTI_ENTI_PUBBLICI
  CONTRIBUTI_5X1000
  SPONSORIZZAZIONI
  QUOTE_ATTIVITA
  COMPENSI_EDUCATORI
  ASSICURAZIONI
  UTENZE_E_SEDE
  MATERIALI_E_FORNITURE
  CONSULENZE_E_AMMINISTRAZIONE
  ONERI_BANCARI
  ALTRE_ENTRATE
  ALTRE_USCITE
}

model Quota {
  id      String  @id @default(uuid())
  anno    Int
  tipo    String
  importo Decimal @db.Decimal(10, 2)

  @@unique([anno, tipo])
  @@map("quota")
}

model Movimento {
  id             String             @id @default(uuid())
  data           DateTime           @default(now()) @db.Timestamptz(3)
  importo        Decimal            @db.Decimal(10, 2)
  soggettoId     String             @map("soggetto_id")
  soggetto       Soggetto           @relation(fields: [soggettoId], references: [id])
  categoria      CategoriaMovimento
  metodo         MetodoPagamento
  riferimentoGateway String?        @map("riferimento_gateway")
  tesseramentoId String?            @map("tesseramento_id")
  documentoId    String?            @map("documento_id")
  progettoId     String?            @map("progetto_id")
  note           String?

  @@index([categoria, data])
  @@map("movimento")
}
```

⚠️ `progettoId` è nullo e senza relazione: la tabella `progetto` nasce in fase 3. Sta qui perché aggiungerlo dopo su dati veri è una migrazione, e perché la rendicontazione dei bandi (fase 4) ne ha bisogno.

**L'elenco delle categorie va confermato con chi tiene il bilancio prima del rilascio** (decisione aperta 4 della spec): è la griglia su cui si somma il rendiconto per cassa. È un enum e non una tabella perché il codice del rendiconto deve poter fallire in compilazione se una voce sparisce; l'estensione con nuove voci resta una migrazione di una riga.

- [ ] **Step 4: Implementare il servizio**

```ts
@Injectable()
export class MovimentiService {
  constructor(private readonly prisma: PrismaService) {}

  registra(dati: {
    soggettoId: string
    importo: string
    categoria: CategoriaMovimento
    metodo: MetodoPagamento
    tesseramentoId?: string
    riferimentoGateway?: string
  }) {
    return this.prisma.movimento.create({ data: { ...dati, importo: new Prisma.Decimal(dati.importo) } })
  }

  async totalePerCategoria(anno: number): Promise<Record<string, string>> {
    const righe = await this.prisma.movimento.groupBy({
      by: ['categoria'],
      _sum: { importo: true },
      where: { data: { gte: new Date(Date.UTC(anno, 0, 1)), lt: new Date(Date.UTC(anno + 1, 0, 1)) } },
    })
    return Object.fromEntries(righe.map((r) => [r.categoria, (r._sum.importo ?? new Prisma.Decimal(0)).toFixed(2)]))
  }
}
```

⚠️ Gli importi entrano ed escono come **stringhe**, mai come `number`: un `Number('0.1') + Number('0.2')` vale `0.30000000000000004`, e su un rendiconto quel centesimo è un errore che nessuno sa spiegare.

- [ ] **Step 5: Seed delle quote**

`api/prisma/seed.ts` crea le quote dell'anno corrente. Gli importi sono **provvisori** finché il direttivo non decide (decisione aperta 2):

```ts
const anno = new Date().getFullYear()
for (const tipo of ['ORDINARIO', 'GENITORE', 'PARTECIPANTE', 'VOLONTARIO']) {
  await prisma.quota.upsert({
    where: { anno_tipo: { anno, tipo } },
    update: {},
    create: { anno, tipo, importo: new Prisma.Decimal('25.00') },
  })
}
```

- [ ] **Step 6: Eseguire i test**

Run: `cd api && npm run test:e2e -- movimenti`
Expected: PASS (3 test)

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: quote, categorie di rendiconto e movimento generalizzato"
```

---

### Task 5: Tesseramento — stati, riconoscimento, numero annuale atomico

**Files:**
- Modify: `api/prisma/schema.prisma`
- Create: `api/src/tesseramenti/tesseramenti.module.ts`, `tesseramenti.service.ts`, `numerazione.service.ts`, `tesseramenti.controller.ts`
- Test: `api/test/tesseramenti.e2e-spec.ts`, `api/test/numerazione.e2e-spec.ts`

**Interfaces:**
- Consumes: `AnagraficaService`, `ConsensiService`, `MovimentiService`.
- Produces: `TesseramentiService.apriDomanda(dati): Promise<{ tesseramentoId, nuovoSocio: boolean }>`, `TesseramentiService.attiva(tesseramentoId, metodo, riferimentoGateway?): Promise<Tesseramento>`, `NumerazioneService.prossimoNumero(anno: number): Promise<string>`.

- [ ] **Step 1: Il test che protegge il numero di tessera**

`api/test/numerazione.e2e-spec.ts` — è il test più importante del task: misura la concorrenza, non la descrive.

```ts
it('venti richieste simultanee producono venti numeri distinti', async () => {
  const numeri = await Promise.all(Array.from({ length: 20 }, () => numerazione.prossimoNumero(2026)))
  expect(new Set(numeri).size).toBe(20)
  expect(numeri).toContain('2026-0001')
  expect(numeri).toContain('2026-0020')
})

it('anni diversi hanno contatori indipendenti', async () => {
  expect(await numerazione.prossimoNumero(2026)).toBe('2026-0001')
  expect(await numerazione.prossimoNumero(2027)).toBe('2027-0001')
})
```

- [ ] **Step 2: Eseguire e verificare il fallimento**

Run: `cd api && npm run test:e2e -- numerazione`
Expected: FAIL — `NumerazioneService` non esiste.

- [ ] **Step 3: Schema e numerazione atomica**

```prisma
enum StatoTesseramento { IN_ATTESA ATTIVO SCADUTO ANNULLATO }

model Tesseramento {
  id            String            @id @default(uuid())
  personaId     String            @map("persona_id")
  anno          Int
  quotaId       String            @map("quota_id")
  stato         StatoTesseramento @default(IN_ATTESA)
  numeroTessera String?           @unique @map("numero_tessera")
  documentoId   String?           @map("documento_id")
  apertoIl      DateTime          @default(now()) @map("aperto_il") @db.Timestamptz(3)
  attivatoIl    DateTime?         @map("attivato_il") @db.Timestamptz(3)

  @@index([personaId, anno])
  @@map("tesseramento")
}

model ContatoreTessera {
  anno   Int @id
  ultimo Int @default(0)

  @@map("contatore_tessera")
}
```

Migrazione aggiuntiva a mano, per l'unicità parziale che Prisma non esprime — un annullato non deve bloccare un nuovo tentativo:

```sql
CREATE UNIQUE INDEX tesseramento_persona_anno_attivo
  ON tesseramento (persona_id, anno)
  WHERE stato <> 'ANNULLATO';
```

`numerazione.service.ts`:

```ts
@Injectable()
export class NumerazioneService {
  constructor(private readonly prisma: PrismaService) {}

  async prossimoNumero(anno: number): Promise<string> {
    const [riga] = await this.prisma.$queryRaw<{ ultimo: number }[]>`
      INSERT INTO contatore_tessera (anno, ultimo) VALUES (${anno}, 1)
      ON CONFLICT (anno) DO UPDATE SET ultimo = contatore_tessera.ultimo + 1
      RETURNING ultimo
    `
    return `${anno}-${String(riga.ultimo).padStart(4, '0')}`
  }
}
```

⚠️ **Una singola istruzione, non una lettura seguita da una scrittura.** `SELECT max+1` poi `INSERT` sotto due richieste simultanee assegna due volte lo stesso numero, e non solleva alcun errore: è la classe di difetto che il progetto Kuoyo ha già pagato quattro volte. `ON CONFLICT DO UPDATE ... RETURNING` prende il lucchetto di riga dentro il motore e non ha finestra.

- [ ] **Step 4: Eseguire il test di concorrenza**

Run: `cd api && npm run test:e2e -- numerazione`
Expected: PASS (2 test)

- [ ] **Step 5: Test del ciclo di vita del tesseramento**

```ts
it('la domanda nasce in attesa e senza numero di tessera', async () => {
  const { tesseramentoId } = await tesseramenti.apriDomanda(datiDiGiulia)
  const t = await prisma.tesseramento.findUnique({ where: { id: tesseramentoId } })
  expect(t.stato).toBe('IN_ATTESA')
  expect(t.numeroTessera).toBeNull()
})

it('una persona già in anagrafica è un rinnovo, non un secondo soggetto', async () => {
  await tesseramenti.apriDomanda({ ...datiDiGiulia, anno: 2025 })
  const seconda = await tesseramenti.apriDomanda({ ...datiDiGiulia, anno: 2026 })
  expect(seconda.nuovoSocio).toBe(false)
  expect(await prisma.soggetto.count()).toBe(1)
})

it('attivare assegna numero, data e movimento in entrata', async () => {
  const { tesseramentoId } = await tesseramenti.apriDomanda(datiDiGiulia)
  const t = await tesseramenti.attiva(tesseramentoId, 'BONIFICO')
  expect(t.stato).toBe('ATTIVO')
  expect(t.numeroTessera).toMatch(/^\d{4}-\d{4}$/)
  const mov = await prisma.movimento.findFirst({ where: { tesseramentoId } })
  expect(mov.categoria).toBe('QUOTE_ASSOCIATIVE')
  expect(mov.importo.toFixed(2)).toBe('25.00')
})

it('attivare due volte non emette un secondo numero né un secondo movimento', async () => {
  const { tesseramentoId } = await tesseramenti.apriDomanda(datiDiGiulia)
  const primo = await tesseramenti.attiva(tesseramentoId, 'BONIFICO')
  const secondo = await tesseramenti.attiva(tesseramentoId, 'BONIFICO')
  expect(secondo.numeroTessera).toBe(primo.numeroTessera)
  expect(await prisma.movimento.count({ where: { tesseramentoId } })).toBe(1)
})
```

L'ultimo test è quello che regge il webhook del Task 7: la riconsegna dello stesso evento non deve produrre una seconda tessera.

- [ ] **Step 6: Implementare il servizio**

```ts
async attiva(tesseramentoId: string, metodo: MetodoPagamento, riferimentoGateway?: string) {
  return this.prisma.$transaction(async (tx) => {
    const t = await tx.tesseramento.findUniqueOrThrow({ where: { id: tesseramentoId }, include: { } })
    if (t.stato === 'ATTIVO') return t          // idempotente per costruzione
    if (t.stato === 'ANNULLATO') {
      throw new ConflictException('Il tesseramento è stato annullato e non può essere attivato')
    }
    const numero = await this.numerazione.prossimoNumero(t.anno)
    const quota = await tx.quota.findUniqueOrThrow({ where: { id: t.quotaId } })
    await tx.movimento.create({
      data: {
        soggettoId: t.personaId, importo: quota.importo,
        categoria: 'QUOTE_ASSOCIATIVE', metodo, riferimentoGateway, tesseramentoId,
      },
    })
    return tx.tesseramento.update({
      where: { id: tesseramentoId },
      data: { stato: 'ATTIVO', numeroTessera: numero, attivatoIl: new Date() },
    })
  })
}
```

Il riconoscimento in `apriDomanda`: prima per `codiceFiscale`, poi — solo se il codice fiscale manca — per `nome + cognome + dataNascita`. Se nessuno dei due aggancia, è un nuovo soggetto.

- [ ] **Step 7: Eseguire i test**

Run: `cd api && npm run test:e2e -- tesseramenti`
Expected: PASS (4 test)

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: tesseramento con stati, riconoscimento del rinnovo e numero annuale atomico"
```

---

### Task 6: Porta dei pagamenti e adattatore Stripe

**Files:**
- Create: `api/src/pagamenti/porta-pagamenti.ts`, `stripe.adapter.ts`, `pagamenti.module.ts`, `finto.adapter.ts`
- Test: `api/test/pagamenti-porta.e2e-spec.ts`

**Interfaces:**
- Consumes: `TesseramentiService`.
- Produces: interfaccia `PortaPagamenti` con `apriSessione(input): Promise<{ url: string, riferimento: string }>`, `verificaFirma(corpoGrezzo: Buffer, firma: string): EventoPagamento`, `statoDi(riferimento: string): Promise<'PAGATO'|'IN_ATTESA'|'FALLITO'>`. Token di iniezione `PORTA_PAGAMENTI`.

- [ ] **Step 1: Definire la porta e il test sull'adattatore finto**

```ts
export interface EventoPagamento {
  idEvento: string
  tipo: 'PAGAMENTO_RIUSCITO' | 'PAGAMENTO_FALLITO'
  riferimento: string
  importo: string
}

export interface PortaPagamenti {
  apriSessione(i: { tesseramentoId: string; importo: string; email: string; descrizione: string }): Promise<{ url: string; riferimento: string }>
  verificaFirma(corpoGrezzo: Buffer, firma: string): EventoPagamento
  statoDi(riferimento: string): Promise<'PAGATO' | 'IN_ATTESA' | 'FALLITO'>
}

export const PORTA_PAGAMENTI = Symbol('PORTA_PAGAMENTI')
```

Test: una firma non valida deve **sollevare**, non restituire un evento vuoto.

```ts
it('una firma non valida viene rifiutata rumorosamente', () => {
  expect(() => porta.verificaFirma(Buffer.from('{}'), 'firma-sbagliata')).toThrow(/firma/i)
})
```

- [ ] **Step 2: Eseguire e verificare il fallimento**

Run: `cd api && npm run test:e2e -- pagamenti-porta`
Expected: FAIL — modulo non trovato.

- [ ] **Step 3: Implementare l'adattatore finto (usato dai test) e quello Stripe**

L'adattatore finto firma con HMAC-SHA256 su un segreto di test e riproduce la stessa forma di evento; l'adattatore Stripe usa `stripe.webhooks.constructEvent`. **Nessun test tocca la rete.**

```bash
cd api && npm i stripe
```

⚠️ La scelta del fornitore è ancora aperta (decisione 1 della spec). **Questo è il solo file da riscrivere** se il direttivo sceglie un altro gateway: `stripe.adapter.ts`. Nessun altro modulo importa `stripe`.

- [ ] **Step 4: Eseguire i test**

Run: `cd api && npm run test:e2e -- pagamenti-porta`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: porta dei pagamenti con adattatore Stripe e adattatore finto per i test"
```

---

### Task 7: Webhook idempotente e riconciliazione delle domande ferme

**Files:**
- Modify: `api/prisma/schema.prisma`
- Create: `api/src/pagamenti/webhook.controller.ts`, `riconciliazione.service.ts`
- Modify: `api/src/main.ts` (corpo grezzo sulla rotta del webhook)
- Test: `api/test/webhook.e2e-spec.ts`

**Interfaces:**
- Consumes: `PortaPagamenti`, `TesseramentiService.attiva`.
- Produces: `POST /pagamenti/webhook`; `RiconciliazioneService.riallinea(): Promise<{ verificate: number; attivate: number }>`.

- [ ] **Step 1: I quattro test sgradevoli**

```ts
it('un evento riuscito attiva il tesseramento', async () => { /* 200, stato ATTIVO */ })

it('lo stesso evento consegnato due volte produce una sola tessera', async () => {
  await inviaEvento(evento); await inviaEvento(evento)
  expect(await prisma.movimento.count({ where: { tesseramentoId } })).toBe(1)
  expect(await prisma.eventoGateway.count()).toBe(1)
})

it('una firma non valida risponde 400 e non tocca il tesseramento', async () => {
  await request(server).post('/pagamenti/webhook').set('firma', 'no').send(corpo).expect(400)
  expect((await prisma.tesseramento.findUnique({ where: { id } })).stato).toBe('IN_ATTESA')
})

it('un pagamento fallito lascia la domanda in attesa e lo registra', async () => {
  await inviaEvento({ ...evento, tipo: 'PAGAMENTO_FALLITO' })
  const t = await prisma.tesseramento.findUnique({ where: { id } })
  expect(t.stato).toBe('IN_ATTESA')
  const ev = await prisma.eventoGateway.findFirst()
  expect(ev.esito).toBe('IGNORATO_PAGAMENTO_FALLITO')   // non silenzioso
})
```

- [ ] **Step 2: Eseguire e verificare il fallimento**

Run: `cd api && npm run test:e2e -- webhook`
Expected: FAIL — rotta 404.

- [ ] **Step 3: Schema dell'evento**

```prisma
model EventoGateway {
  idEvento    String   @id @map("id_evento")
  tipo        String
  riferimento String
  payload     Json
  esito       String
  ricevutoIl  DateTime @default(now()) @map("ricevuto_il") @db.Timestamptz(3)

  @@map("evento_gateway")
}
```

L'idempotenza è la **chiave primaria**, non un controllo applicativo: due consegne simultanee dello stesso evento producono una violazione di unicità, che si cattura e si tratta come «già elaborato».

- [ ] **Step 4: Corpo grezzo per la verifica della firma**

In `main.ts`, prima di `useGlobalPipes`:

```ts
app.use('/api/pagamenti/webhook', express.raw({ type: 'application/json' }))
```

⚠️ La firma si verifica sui **byte esatti** ricevuti. Se il JSON viene analizzato e riserializzato prima della verifica, la firma non torna mai e il webhook fallisce in un modo che sembra un problema del fornitore.

- [ ] **Step 5: Implementare controller e riconciliazione**

Il controller: verifica firma → `create` dell'evento (in caso di `P2002` risponde 200 «già elaborato») → se il tipo è riuscito, chiama `attiva`. La riconciliazione interroga il gateway per i tesseramenti `IN_ATTESA` con `apertoIl` più vecchio di un'ora e attiva quelli risultati pagati.

- [ ] **Step 6: Eseguire i test**

Run: `cd api && npm run test:e2e -- webhook`
Expected: PASS (4 test)

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: webhook idempotente con firma verificata e riconciliazione delle domande ferme"
```

---

### Task 8: Documenti su SharePoint via Graph

**Files:**
- Modify: `api/prisma/schema.prisma`
- Create: `api/src/documenti/graph.client.ts`, `documenti.service.ts`, `documenti.module.ts`, `riconciliazione-documenti.service.ts`
- Test: `api/test/documenti.e2e-spec.ts`, `api/test/documenti-graph.integration-spec.ts`

**Interfaces:**
- Consumes: `PrismaService`.
- Produces: `DocumentiService.carica({ tipo, riferimento, nomeFile, contenuto: Buffer }): Promise<Documento>`, `DocumentiService.scarica(documentoId): Promise<Buffer>`, `RiconciliazioneDocumentiService.controlla(): Promise<{ mancanti: string[]; orfani: string[] }>`.

- [ ] **Step 1: Test sul comportamento che conta**

```ts
it('un caricamento fallito lascia il documento in stato FALLITO e non perde il contenuto', async () => {
  graph.simulaErrore(503)
  const doc = await documenti.carica({ tipo: 'TESSERA', riferimento: tId, nomeFile: 't.pdf', contenuto: pdf })
  expect(doc.stato).toBe('FALLITO')
  expect(doc.driveItemId).toBeNull()
})

it('rispetta il Retry-After di una limitazione invece di ritentare subito', async () => {
  graph.simulaLimitazione({ retryAfter: 2 })
  const inizio = Date.now()
  await documenti.carica({ ... })
  expect(Date.now() - inizio).toBeGreaterThanOrEqual(2000)
})

it('la chiave è l\'identificativo dell\'elemento, non il percorso', async () => {
  const doc = await documenti.carica({ ... })
  await graph.simulaSpostamento(doc.driveItemId, '/Archivio/2026/')
  const contenuto = await documenti.scarica(doc.id)   // deve funzionare lo stesso
  expect(contenuto.length).toBeGreaterThan(0)
})
```

- [ ] **Step 2: Eseguire e verificare il fallimento**

Run: `cd api && npm run test:e2e -- documenti`
Expected: FAIL — `DocumentiService` non esiste.

- [ ] **Step 3: Schema**

```prisma
enum TipoDocumento { TESSERA RICEVUTA CONSENSO ALLEGATO }
enum StatoDocumento { IN_ATTESA CARICATO FALLITO }

model Documento {
  id            String         @id @default(uuid())
  driveItemId   String?        @unique @map("drive_item_id")
  nomeFile      String         @map("nome_file")
  percorsoLeggibile String?    @map("percorso_leggibile")
  tipo          TipoDocumento
  riferimento   String
  stato         StatoDocumento @default(IN_ATTESA)
  ultimoErrore  String?        @map("ultimo_errore")
  creatoIl      DateTime       @default(now()) @map("creato_il") @db.Timestamptz(3)

  @@index([tipo, riferimento])
  @@map("documento")
}
```

`percorsoLeggibile` è **un'etichetta**, non una chiave: serve a chi legge il backoffice per sapere dove guardare, e può diventare falso appena qualcuno sposta il file. Nessuna query lo usa per trovare un documento.

- [ ] **Step 4: Implementare il client Graph e il servizio**

Client con credenziali applicative (`client_credentials`), `Sites.Selected` sul sito dell'associazione. Caricamento: `PUT /drives/{driveId}/items/{parentId}:/{nome}:/content` per file sotto 4 MB, sessione di caricamento oltre. Su `429`/`503` rispetta `Retry-After` fino a tre tentativi, poi segna `FALLITO`.

⚠️ Le prove contro Graph vero stanno in `*.integration-spec.ts` e girano **solo** con `GRAPH_LIBRERIA_COLLAUDO` valorizzata: mai contro la libreria di produzione.

- [ ] **Step 5: Riconciliazione**

`controlla()` elenca due anomalie: documenti con `driveItemId` che Graph non trova più, e elementi nella libreria senza una riga che li nomini. Restituisce entrambe le liste; non cancella nulla.

- [ ] **Step 6: Eseguire i test**

Run: `cd api && npm run test:e2e -- documenti`
Expected: PASS (3 test)

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: documenti su SharePoint con chiave driveItem, ritenta e riconciliazione"
```

---

### Task 9: Tessera e ricevuta in PDF

**Files:**
- Create: `api/src/documenti/pdf/tessera.pdf.ts`, `ricevuta.pdf.ts`
- Test: `api/test/pdf.e2e-spec.ts`

**Interfaces:**
- Consumes: `Tesseramento`, `Movimento`, `DocumentiService`.
- Produces: `generaTessera(t): Promise<Buffer>`, `generaRicevuta(m): Promise<Buffer>`.

- [ ] **Step 1: Test**

```ts
it('la tessera contiene numero, nome e anno sociale', async () => {
  const pdf = await generaTessera(tesseramentoCompleto)
  const testo = await estraiTesto(pdf)
  expect(testo).toContain('2026-0041')
  expect(testo).toContain('Giulia Neri')
  expect(testo).toContain('C.F. 94293690486')       // dati dell'associazione
})

it('la ricevuta mostra l\'importo nel formato italiano', async () => {
  const testo = await estraiTesto(await generaRicevuta(movimentoDa25))
  expect(testo).toContain('€ 25,00')
})

it('generare la tessera non richiede che il caricamento sia riuscito', async () => {
  graph.simulaErrore(503)
  const t = await tesseramenti.attiva(id, 'BONIFICO')
  expect(t.stato).toBe('ATTIVO')                     // il socio non è bloccato
})
```

- [ ] **Step 2: Eseguire e verificare il fallimento**

Run: `cd api && npm run test:e2e -- pdf`
Expected: FAIL

- [ ] **Step 3: Implementare**

```bash
cd api && npm i pdfkit && npm i -D @types/pdfkit pdf-parse
```

Formato **A4 verticale**. Dati istituzionali in piè di pagina: `La Rosa dei Venti APS · C.F. 94293690486 · RUNTS rep. 72949 · Via di Tizzano 191/G, 50012 Bagno a Ripoli (FI)`.

- [ ] **Step 4: Eseguire i test**

Run: `cd api && npm run test:e2e -- pdf`
Expected: PASS (3 test)

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: tessera e ricevuta in PDF A4, indipendenti dal caricamento"
```

---

### Task 10: Invio email via Graph, ripetibile

**Files:**
- Create: `api/src/email/email.service.ts`, `email.module.ts`, `template/tessera.html.ts`
- Test: `api/test/email.e2e-spec.ts`

**Interfaces:**
- Consumes: `DocumentiService` dal Task 8, `AuditService` dal Task 2.
- Produces: `EmailService.invia({ a, oggetto, html, allegati }): Promise<void>`; `EmailService.inviaTessera(tesseramentoId): Promise<void>`; `EmailService.rimanda(comunicazioneDestinatarioId): Promise<void>`; `ComunicazioniService.crea({ oggetto, testo, segmento }): Promise<Comunicazione>` e `ComunicazioniService.spedisci(comunicazioneId): Promise<{ inviate: number; fallite: number }>`, usati dal backoffice del Task 14 per le comunicazioni ai soci sui nuovi progetti (spec §2).

- [ ] **Step 1: Test**

```ts
it('un invio fallito lascia esito FALLITO e il motivo, e non solleva verso il chiamante', async () => {
  graph.simulaErrore(500)
  await email.inviaTessera(tesseramentoId)            // non deve lanciare
  const d = await prisma.comunicazioneDestinatario.findFirst()
  expect(d.esito).toBe('FALLITO')
  expect(d.errore).toMatch(/500/)
})

it('nessuna email di prova raggiunge un indirizzo esterno', async () => {
  process.env.EMAIL_DESTINATARIO_COLLAUDO = 'collaudo@example.invalid'
  await email.inviaTessera(tesseramentoId)
  expect(graph.ultimoDestinatario()).toBe('collaudo@example.invalid')
})
```

- [ ] **Step 2: Eseguire e verificare il fallimento**

Run: `cd api && npm run test:e2e -- email`
Expected: FAIL

- [ ] **Step 3: Schema delle comunicazioni**

Le due tabelle previste dalla spec §5. Reggono sia la mail di consegna della tessera sia le comunicazioni ai soci sui nuovi progetti: in entrambi i casi serve sapere **l'esito per singolo destinatario**, perché «la mail è partita» senza dire a chi non è arrivata è esattamente lo scarto silenzioso che il progetto vieta.

```prisma
enum EsitoInvio { IN_ATTESA INVIATO FALLITO }

model Comunicazione {
  id          String                      @id @default(uuid())
  oggetto     String
  testo       String
  segmento    String
  creataIl    DateTime                    @default(now()) @map("creata_il") @db.Timestamptz(3)
  inviataIl   DateTime?                   @map("inviata_il") @db.Timestamptz(3)
  destinatari ComunicazioneDestinatario[]

  @@map("comunicazione")
}

model ComunicazioneDestinatario {
  id              String        @id @default(uuid())
  comunicazioneId String        @map("comunicazione_id")
  comunicazione   Comunicazione @relation(fields: [comunicazioneId], references: [id], onDelete: Cascade)
  soggettoId      String        @map("soggetto_id")
  email           String
  esito           EsitoInvio    @default(IN_ATTESA)
  errore          String?
  inviatoIl       DateTime?     @map("inviato_il") @db.Timestamptz(3)

  @@index([comunicazioneId, esito])
  @@map("comunicazione_destinatario")
}
```

Anche la consegna della tessera crea una `Comunicazione` con un solo destinatario: così «rimanda la mail» dal backoffice (Task 14) è **una sola operazione** per entrambi i casi, invece di due strade che si comportano diversamente.

- [ ] **Step 4: Implementare**

Invio con `POST /users/info@larosadeiventiaps.org/sendMail` via Graph. Ogni destinatario si aggiorna singolarmente: `INVIATO` con `inviatoIl`, oppure `FALLITO` con il motivo in `errore`. `EmailService.inviaTessera` non solleva mai verso il chiamante — il tesseramento resta attivo e la mail si rimanda.

La guardia `EMAIL_DESTINATARIO_COLLAUDO`, quando valorizzata, **riscrive ogni destinatario**: è ciò che impedisce a una prova di raggiungere ottanta famiglie. Va applicata nel punto più basso — dentro `invia`, subito prima della chiamata a Graph — e non nei chiamanti, perché un chiamante nuovo se ne dimenticherebbe.

`ComunicazioniService.spedisci` scorre i destinatari `IN_ATTESA` e li invia uno per uno: un fallimento non interrompe il giro, e rilanciare `spedisci` riprende solo quelli non ancora riusciti.

- [ ] **Step 5: Eseguire i test**

Run: `cd api && npm run test:e2e -- email`
Expected: PASS (2 test)

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: email via Graph e comunicazioni ai soci con esito per destinatario"
```

---

### Task 11: Accesso senza password e ruoli

**Files:**
- Modify: `api/prisma/schema.prisma`
- Create: `api/src/auth/auth.service.ts`, `auth.controller.ts`, `ruoli.guard.ts`, `auth.module.ts`
- Test: `api/test/auth.e2e-spec.ts`

**Interfaces:**
- Produces: `POST /auth/richiedi-link`, `POST /auth/entra`, decoratore `@Ruoli(Ruolo.DIRETTIVO)`, `RuoliGuard`.

- [ ] **Step 1: Test**

```ts
it('il link vale una volta sola', async () => {
  const token = await richiediLink('famiglia.neri@example.it')
  await entra(token).expect(200)
  await entra(token).expect(401)
})

it('un link scaduto non entra', async () => { /* TTL 15 minuti, orologio spostato */ })

it('richiedere un link per un indirizzo sconosciuto risponde uguale a uno noto', async () => {
  const a = await request(server).post('/auth/richiedi-link').send({ email: 'nessuno@example.it' })
  const b = await request(server).post('/auth/richiedi-link').send({ email: 'famiglia.neri@example.it' })
  expect(a.status).toBe(b.status)
  expect(a.body).toEqual(b.body)
})

it('una famiglia non entra nel backoffice del direttivo', async () => {
  await request(server).get('/direttivo/soci').set('Authorization', `Bearer ${tokenFamiglia}`).expect(403)
})
```

Il terzo test è una difesa concreta: risposte diverse trasformerebbero il modulo di accesso in un elenco di chi è socio.

- [ ] **Step 2: Eseguire e verificare il fallimento**

Run: `cd api && npm run test:e2e -- auth`
Expected: FAIL

- [ ] **Step 3: Schema e implementazione**

```prisma
model LinkAccesso {
  id        String    @id @default(uuid())
  hashToken String    @unique @map("hash_token")
  soggettoId String   @map("soggetto_id")
  scadeIl   DateTime  @map("scade_il") @db.Timestamptz(3)
  usatoIl   DateTime? @map("usato_il") @db.Timestamptz(3)

  @@map("link_accesso")
}
```

Nel database va l'**impronta** del token, non il token: chi legge una copia del database non deve poter entrare come una famiglia. Consumo con `updateMany({ where: { hashToken, usatoIl: null, scadeIl: { gt: now } }, data: { usatoIl: now } })` e controllo che abbia aggiornato esattamente una riga — atomico, quindi due usi simultanei non passano entrambi.

- [ ] **Step 4: Eseguire i test**

Run: `cd api && npm run test:e2e -- auth`
Expected: PASS (4 test)

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: accesso senza password con link a uso singolo e guardia dei ruoli"
```

---

### Task 12: Web — modulo di tesseramento in quattro passi

**Files:**
- Create: `web/` (Vite + React + TypeScript), `web/src/pages/Tesseramento.tsx`, `web/src/components/Campo.tsx`, `web/src/lib/api.ts`, `web/src/lib/euro.ts`
- Test: `web/src/pages/Tesseramento.test.tsx`

**Interfaces:**
- Consumes: `POST /anagrafica/persone`, `POST /tesseramenti`, la sessione di pagamento del Task 6.
- Produces: componente `<Campo label ... />` riusato dai Task 13 e 14; `formattaEuro(valore: string): string`.

- [ ] **Step 1: Test**

```tsx
it('il campo Nome precede il campo Cognome nell\'ordine di tabulazione', () => {
  render(<Tesseramento />)
  const campi = screen.getAllByRole('textbox')
  expect(campi[0]).toHaveAccessibleName('Nome')
  expect(campi[1]).toHaveAccessibleName('Cognome')
})

it('i quattro canali di consenso partono tutti non selezionati', async () => {
  render(<Tesseramento passoIniziale={3} />)
  for (const canale of ['Uso interno', 'Sito dell\'associazione', 'Social network', 'Stampa e materiale promozionale']) {
    expect(screen.getByRole('checkbox', { name: new RegExp(canale, 'i') })).not.toBeChecked()
  }
})

it('i due consensi obbligatori bloccano il passaggio al pagamento finché non sono spuntati', async () => {
  render(<Tesseramento passoIniziale={3} />)
  expect(screen.getByRole('button', { name: /vai al pagamento/i })).toBeDisabled()
  await userEvent.click(screen.getByRole('checkbox', { name: /accetto lo statuto/i }))
  await userEvent.click(screen.getByRole('checkbox', { name: /informativa/i }))
  expect(screen.getByRole('button', { name: /vai al pagamento/i })).toBeEnabled()
})

it('formatta gli importi come € 25,00', () => {
  expect(formattaEuro('25')).toBe('€ 25,00')
  expect(formattaEuro('1234.5')).toBe('€ 1.234,50')
})
```

- [ ] **Step 2: Eseguire e verificare il fallimento**

Run: `cd web && npm test`
Expected: FAIL

- [ ] **Step 3: Implementare**

```bash
npm create vite@latest web -- --template react-ts
cd web && npm i && npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

`euro.ts`:

```ts
export const formattaEuro = (v: string) =>
  '€ ' + new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v))
```

`<Campo>` rende **etichetta sopra e campo sotto**, con `htmlFor`/`id` collegati. Ogni modulo del progetto usa questo componente: è ciò che rende la regola una proprietà del codice e non una raccomandazione.

- [ ] **Step 4: Eseguire i test**

Run: `cd web && npm test`
Expected: PASS (4 test)

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: modulo di tesseramento in quattro passi con consensi per canale"
```

---

### Task 13: Web — area riservata della famiglia

**Files:**
- Create: `web/src/pages/AreaFamiglia.tsx`
- Test: `web/src/pages/AreaFamiglia.test.tsx`

**Interfaces:**
- Consumes: `GET /famiglia/tessere`, `PATCH /famiglia/consensi`, `<Campo>` e `formattaEuro` dal Task 12.

- [ ] **Step 1: Scrivere i test che falliscono**

```tsx
const tessere = [
  { id: 't1', nome: 'Giulia Neri', anno: 2026, stato: 'ATTIVO', numeroTessera: '2026-0041', importo: '25.00' },
  { id: 't2', nome: 'Marco Neri', anno: 2026, stato: 'IN_ATTESA', numeroTessera: null, importo: '25.00' },
]

it('una tessera attiva si scarica, una in attesa si paga', () => {
  render(<AreaFamiglia tessere={tessere} consensi={{ INTERNO: true, SITO: true, SOCIAL: false, STAMPA: false }} />)
  expect(screen.getByRole('link', { name: /scarica la tessera/i })).toHaveAttribute('href', '/api/famiglia/tessere/t1/pdf')
  expect(screen.getByRole('button', { name: 'Paga € 25,00' })).toBeEnabled()
  expect(screen.queryByRole('link', { name: /scarica/i, hidden: false })).not.toHaveAttribute('href', '/api/famiglia/tessere/t2/pdf')
})

it('revocare un consenso lo invia all\'API e non lo cambia da solo nel browser', async () => {
  const patch = vi.fn().mockResolvedValue({ INTERNO: true, SITO: false, SOCIAL: false, STAMPA: false })
  render(<AreaFamiglia tessere={tessere} consensi={{ INTERNO: true, SITO: true, SOCIAL: false, STAMPA: false }} onCambiaConsensi={patch} />)

  await userEvent.click(screen.getByRole('checkbox', { name: /sito dell'associazione/i }))

  expect(patch).toHaveBeenCalledWith({ SITO: false })
  await waitFor(() => expect(screen.getByRole('checkbox', { name: /sito/i })).not.toBeChecked())
})

it('se l\'API rifiuta la revoca, la casella torna com\'era', async () => {
  const patch = vi.fn().mockRejectedValue(new Error('rete'))
  render(<AreaFamiglia tessere={tessere} consensi={{ INTERNO: true, SITO: true, SOCIAL: false, STAMPA: false }} onCambiaConsensi={patch} />)
  await userEvent.click(screen.getByRole('checkbox', { name: /sito/i }))
  await waitFor(() => expect(screen.getByRole('checkbox', { name: /sito/i })).toBeChecked())
  expect(screen.getByRole('alert')).toHaveTextContent(/non è stato possibile salvare/i)
})
```

Il terzo test è quello che conta davvero: una casella che si spunta da sola nel browser mentre il server non ha registrato niente fa credere a una famiglia di aver revocato un consenso che è ancora attivo.

- [ ] **Step 2: Eseguire e verificare il fallimento**

Run: `cd web && npm test -- AreaFamiglia`
Expected: FAIL — `Cannot find module './AreaFamiglia'`

- [ ] **Step 3: Implementare la pagina**

Struttura: intestazione con il cognome del nucleo e l'anno sociale; una scheda per persona con lo stato in una pastiglia colorata, e il pulsante che cambia secondo lo stato (`Scarica la tessera` se attivo, `Paga € 25,00` se in attesa); una scheda finale con i quattro consensi.

Lo stato dei consensi **si aggiorna solo dopo la risposta dell'API**: si tiene lo stato precedente, si chiama `onCambiaConsensi`, e solo alla risoluzione si applica il nuovo valore. In caso di errore si ripristina e si mostra un `role="alert"` con un messaggio che dice cosa fare («Non è stato possibile salvare la modifica. Riprova.»).

Gli importi passano da `formattaEuro` del Task 12; le etichette usano `<Campo>` dello stesso task.

- [ ] **Step 4: Eseguire i test**

Run: `cd web && npm test -- AreaFamiglia`
Expected: PASS (3 test)

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: area riservata della famiglia con tessere, pagamento e consensi"
```

---

### Task 14: Web — backoffice del direttivo

**Files:**
- Create: `web/src/pages/Direttivo.tsx`, `web/src/pages/DirettivoExport.tsx`
- Modify: `api/src/direttivo/direttivo.controller.ts`
- Test: `web/src/pages/Direttivo.test.tsx`, `api/test/direttivo.e2e-spec.ts`

**Interfaces:**
- Consumes: `RuoliGuard` dal Task 11, `MovimentiService.totalePerCategoria` dal Task 4.
- Produces: `GET /direttivo/soci`, `GET /direttivo/in-attesa`, `GET /direttivo/export?anno=`, `POST /direttivo/tesseramenti/:id/registra-pagamento`, `POST /direttivo/tesseramenti/:id/rimanda-email`.

- [ ] **Step 1: Scrivere i test API che falliscono**

`api/test/direttivo.e2e-spec.ts`:

```ts
it('l\'elenco delle domande in attesa dice da quanto tempo aspettano', async () => {
  const t = await apriDomandaFerma({ oreFa: 30 })
  const res = await request(server).get('/direttivo/in-attesa').set(authDirettivo).expect(200)
  expect(res.body[0].tesseramentoId).toBe(t.id)
  expect(res.body[0].oreDiAttesa).toBeGreaterThanOrEqual(30)
})

it('registrare un pagamento in contanti attiva ed emette la tessera', async () => {
  const t = await apriDomandaFerma({ oreFa: 1 })
  const res = await request(server)
    .post(`/direttivo/tesseramenti/${t.id}/registra-pagamento`)
    .set(authDirettivo).send({ metodo: 'CONTANTI' }).expect(200)
  expect(res.body.stato).toBe('ATTIVO')
  expect(res.body.numeroTessera).toMatch(/^\d{4}-\d{4}$/)
  const mov = await prisma.movimento.findFirst({ where: { tesseramentoId: t.id } })
  expect(mov.metodo).toBe('CONTANTI')
})

it('l\'export per il bilancio quadra col totale dei movimenti', async () => {
  await registraMovimenti(['25.00', '25.00', '-480.00'])
  const res = await request(server).get('/direttivo/export?anno=2026').set(authDirettivo).expect(200)
  const somma = Object.values(res.body.perCategoria).reduce((a, v) => a + Number(v), 0)
  expect(somma.toFixed(2)).toBe(res.body.totale)
  expect(res.body.totale).toBe('-430.00')
})

it('una famiglia non vede l\'elenco dei soci', async () => {
  await request(server).get('/direttivo/soci').set(authFamiglia).expect(403)
})
```

- [ ] **Step 2: Eseguire e verificare il fallimento**

Run: `cd api && npm run test:e2e -- direttivo`
Expected: FAIL — rotte 404.

- [ ] **Step 3: Implementare il controller**

Tutte le rotte sotto `@Ruoli(Ruolo.DIRETTIVO)` con `RuoliGuard` del Task 11 — il controllo sta sull'API, non sul fatto che la voce di menu non compaia.

- `GET /direttivo/soci` — elenco con nome, ruoli, quota, stato, e consensi vigenti del Task 3.
- `GET /direttivo/in-attesa` — tesseramenti `IN_ATTESA` con `oreDiAttesa` calcolato da `apertoIl`, ordinati dal più vecchio.
- `POST /direttivo/tesseramenti/:id/registra-pagamento` — richiama `TesseramentiService.attiva` del Task 5 con il metodo indicato: **la stessa strada del webhook**, non una seconda implementazione.
- `POST /direttivo/tesseramenti/:id/rimanda-email` — richiama `EmailService.rimanda` del Task 10.
- `GET /direttivo/export?anno=` — `MovimentiService.totalePerCategoria` più il totale come stringa a due decimali.

⚠️ Il totale si somma in `Decimal`, non in `number`. Il test lo verifica con `-430.00`: tre importi che in virgola mobile darebbero `-429.99999999999994`.

- [ ] **Step 4: Scrivere e far passare i test della pagina**

`web/src/pages/Direttivo.test.tsx`:

```tsx
it('mostra lo stato di ogni socio come pastiglia leggibile', () => {
  render(<Direttivo soci={[{ nome: 'Elena Bardi', stato: 'IN_ATTESA', quota: '25.00' }]} />)
  expect(screen.getByText('In attesa')).toBeInTheDocument()
  expect(screen.getByText('€ 25,00')).toBeInTheDocument()
})

it('le colonne numeriche sono allineate con cifre a larghezza fissa', () => {
  render(<Direttivo soci={[{ nome: 'Elena Bardi', stato: 'IN_ATTESA', quota: '25.00' }]} />)
  expect(screen.getByText('€ 25,00')).toHaveStyle({ fontVariantNumeric: 'tabular-nums' })
})
```

- [ ] **Step 5: Eseguire tutti i test**

Run: `cd api && npm run test:e2e -- direttivo && cd ../web && npm test -- Direttivo`
Expected: PASS (4 test API + 2 test web)

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: backoffice del direttivo con soci, domande ferme, incassi ed export"
```

---

### Task 15: Rilascio — compose di produzione, backup, runbook

**Files:**
- Create: `docker/docker-compose.prod.yml`, `docs/runbook-deploy.md`, `scripts/rdv-backup.sh`
- Modify: `docker/.env.example`

**Interfaces:**
- Consumes: tutto quanto sopra.
- Produces: la procedura di rilascio e di rollback.

- [ ] **Step 1: Scrivere `docker-compose.prod.yml`**

```yaml
services:
  db:
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:?POSTGRES_USER e obbligatoria}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD e obbligatoria}
      POSTGRES_DB: ${POSTGRES_DB:?POSTGRES_DB e obbligatoria}
    ports: !override []
    volumes: ["/srv/rosadeiventi/db:/var/lib/postgresql/data"]

  api:
    image: rosadeiventi/api:${API_TAG:-current}
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL:?DATABASE_URL e obbligatoria}
      GRAPH_TENANT_ID: ${GRAPH_TENANT_ID:?}
      GRAPH_CLIENT_ID: ${GRAPH_CLIENT_ID:?}
      GRAPH_CLIENT_SECRET: ${GRAPH_CLIENT_SECRET:?}
      STRIPE_SECRET: ${STRIPE_SECRET:-}
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET:-}
    ports: !override ["127.0.0.1:3000:3000"]

  migrate:
    profiles: ["tools"]
    image: rosadeiventi/api-migrate:${API_TAG:-current}
    build: { context: ../api, target: build }
    restart: "no"
    environment:
      DATABASE_URL: ${DATABASE_URL:?DATABASE_URL e obbligatoria}
    command: ["sh", "-c", "npx prisma migrate deploy && node dist/prisma/seed.js"]
```

⚠️ `ports: !override []` è ciò che toglie davvero la porta 5432: Compose **concatena** le liste `ports` fra i file, quindi una lista vuota senza `!override` non toglie nulla e il database di produzione resta raggiungibile da internet.

- [ ] **Step 2: Verificare che la variabile mancante fermi il deploy**

Run: `cd docker && DATABASE_URL= docker compose -f docker-compose.yml -f docker-compose.prod.yml config`
Expected: errore che nomina `DATABASE_URL`, **prima** di avviare qualsiasi container.

- [ ] **Step 3: Verificare che la porta del database non sia pubblicata**

Run: `docker compose -f docker-compose.yml -f docker-compose.prod.yml config | grep -A3 "db:" | grep -c "5432:5432"`
Expected: `0`

- [ ] **Step 4: Scrivere lo script di backup**

```bash
#!/usr/bin/env bash
set -euo pipefail
REPO=/opt/rosadeiventi
set -a; . "${REPO}/docker/.env"; set +a
DEST="/srv/rosadeiventi/backup/$(date +%F)"
mkdir -p "${DEST}"
docker compose -f ${REPO}/docker/docker-compose.yml -f ${REPO}/docker/docker-compose.prod.yml \
  exec -T db pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --format=custom > "${DEST}/rdv.dump"
touch "${DEST}/COMPLETO"
find /srv/rosadeiventi/backup -mindepth 1 -maxdepth 1 -type d -mtime +30 -exec rm -rf {} +
```

⚠️ `-mindepth 1` non è un dettaglio: senza, `find` valuta anche la cartella di partenza, che corrisponde a `-type d` e quasi sempre a `-mtime +30`, e la cancellerebbe **con dentro tutti i backup, compreso quello appena fatto**.

I file non sono nel backup: stanno su SharePoint (§10 della spec). Va scritto nel runbook, perché un ripristino del solo database lascia elementi orfani e la riconciliazione del Task 8 è ciò che li elenca.

- [ ] **Step 5: Provare il rollback davvero**

Rilasciare due tag, tornare al precedente cambiando `API_TAG`, verificare che `/health` risponda. Un rollback mai provato non è un rollback.

- [ ] **Step 6: Scrivere il runbook e committare**

```bash
git add -A && git commit -m "feat: rilascio di produzione, backup notturno e runbook con rollback provato"
```

---

## Prima del primo rilascio — non sono task di codice

Queste sono le decisioni aperte della spec (§12). Il codice le regge già come dati, ma **il rilascio non può avvenire senza**:

1. **Gateway scelto** e conto commerciante intestato all'associazione, firmato dalla Presidente.
2. **Importi delle quote** deliberati dal direttivo → contenuto della tabella `quota` (il seed usa € 25,00 come segnaposto).
3. **Chi entra nel backoffice** → assegnazione del ruolo `DIRETTIVO` in anagrafica.
4. **Elenco delle categorie confermato** con chi tiene il bilancio, prima di registrare la prima quota.
5. **Capienza dell'host misurata** (CPU, memoria, disco liberi; cosa ci gira già).
6. **Nomina a responsabile del trattamento** ex art. 28 GDPR firmata dalla Presidente.
7. **App Graph dedicata** registrata con `Sites.Selected` sul solo sito dell'associazione, consenso dato dal Global Admin `admin@larosadeiventiaps.org`.
