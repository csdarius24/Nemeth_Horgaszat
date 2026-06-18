# Németh Horgászat

Több-bérlős (multi-tenant) halgazdasági és horgászati nyilvántartó rendszer.

## Projekt célja

A rendszer célja magyarországi halgazdaságok és horgásztavak digitális nyilvántartásának támogatása.

A platform lehetővé teszi:

- halászatok kezelését
- tavak kezelését
- telelő tavak kezelését
- halfajok nyilvántartását
- halállomány követését
- telepítések kezelését
- kivételek rögzítését
- etetések naplózását
- eseménynapló vezetését
- szerepkör alapú jogosultságkezelést

## Technológiai stack

Frontend:
- Next.js
- React
- TypeScript

Backend:
- Next.js API Routes

Adatbázis:
- MySQL
- Prisma ORM

Authentikáció:
- Session alapú authentikáció
- HttpOnly cookie
- bcrypt jelszóhash

## Fő funkciók

### Halászat kezelés

Minden halászat önálló tenantként működik.

### Tó kezelés

- normál tavak
- telelő tavak

### Halállomány kezelés

- halfajonkénti nyilvántartás
- darabszám
- tömegtartomány

### Telepítés

Új halállomány rögzítése.

### Kivétel

Halállomány csökkentése.

### Etetés

Etetési események nyilvántartása.

### Naplózás

Minden esemény auditálható módon naplózásra kerül.

## Jogosultsági rendszer

Halászat szint:

- OWNER
- ADMIN
- STAFF

Tó szint:

- OWNER
- ADMIN
- STAFF
- OR
- ANGLER

## Fejlesztői környezet

### Előfeltételek

- Node.js (LTS ajánlott)
- Elérhető MySQL adatbázis

### 1. Telepítés

```bash
npm install
```

### 2. Környezeti változók beállítása

A projekt egy `.env` fájlból olvassa a konfigurációt. A repó tartalmaz egy
`.env.example` sablont — másold le `.env` néven, és töltsd ki a saját értékeiddel:

```bash
cp .env.example .env
```

A `.env` **gitignore-olt**, így valódi titok soha nem kerül a repóba. A szükséges
változók:

| Változó | Leírás |
|---|---|
| `DATABASE_URL` | MySQL kapcsolati string, pl. `mysql://user:password@localhost:3306/nemeth_horgaszat` |
| `NODE_ENV` | `development` vagy `production` |

### 3. Prisma kliens generálása

```bash
npx prisma generate
```

### 4. Adatbázis migráció

```bash
npx prisma migrate deploy
```

### 5. Fejlesztői szerver

```bash
npm run dev
```

Az alkalmazás ezután a `http://localhost:3000` címen érhető el.

## Tesztelés

Unit tesztek futtatása (Vitest):

```bash
npm run test
```

További szkriptek: `npm run test:unit`, `npm run test:watch`, `npm run test:coverage`.
A tesztelési stratégia és a jelenlegi állapot: [docs/04_quality](docs/04_quality).

## CI

A folyamatos integráció GitHub Actions-szel fut
([.github/workflows/ci.yml](.github/workflows/ci.yml)), **push** és
**pull_request** eseményre. A pipeline lépései: `npm ci` → `npx prisma generate`
→ `npx tsc --noEmit` → `npm run test`. (A lint jelenleg tudatosan nem-blokkoló —
részletek: [docs/04_quality/test-report.md](docs/04_quality/test-report.md).)

## Dokumentáció

A részletes szakdolgozati dokumentáció a `docs/` mappában, témakörönként:

- [docs/01_product](docs/01_product) — termékvízió, scope, capability map, UX flow-k
- [docs/02_architecture](docs/02_architecture) — kontextus/konténer/komponens diagramok, ADR-ek
- [docs/03_design](docs/03_design) — adatmodell és API-design
- [docs/04_quality](docs/04_quality) — tesztstratégia és test report
- [docs/05_security_ops](docs/05_security_ops) — threat model, privacy, deployment, runbook
- [docs/06_release](docs/06_release) — release notes, acceptance report
- [docs/07_ai](docs/07_ai) — AI manifeszt, prompt-log, verification-log


Fejlesztő:
Csóka Dániel Dárius

2026