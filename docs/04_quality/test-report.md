# Test Report

Ez a dokumentum a Németh Horgászat rendszer tesztelési állapotát rögzíti. A
kapcsolódó terv: `docs/04_quality/testing-strategy.md`. Az elfogadási kritériumok
forrása: `docs/01_product/scope-contract.md` (AC1–AC7).

## 1. Állapot — összefoglaló

> **Unit szint zöld; integrációs infrastruktúra elkészült (de teszt-DB hiányában
> nem futtatva).** Jelenleg **52 unit teszt** fut **7 fájlban**, mind zöld (lásd 5.
> szakasz). Elkészült az **első DB-backed integrációs/workflow teszt-réteg** is
> (takarmány-etetés workflow + jogosultság), biztonságos teszt-DB kezeléssel és
> production-guarddal — ez **dedikált teszt-adatbázist igényel**, ezért jelenleg
> **biztonságosan kihagyva** fut (lásd 8. szakasz). Az **e2e** réteg továbbra is
> tervezett.

Frissítés dátuma: **2026-06-26** (korábbi baseline: 2026-06-17, 29 teszt). A unit
teszt-szám az új tiszta helperekkel bővült: **29 → 34** (hibabejelentés-státusz
jogosultság, `canUpdateHibabejelentesStatus`) **→ 42** (takarmány-készletlevonás,
`szamitTakarmanyFelhasznalas`). A magasabb rétegekhez a bizonyítékok (CI-log,
lefedettség, Playwright trace, endpoint-szintű integration) később illesztendők.

## 2. Jelenlegi baseline

| Tétel | Állapot |
|---|---|
| Teszt-keretrendszer | ✅ Vitest 3.2.6 (`vitest.config.ts`, node környezet) |
| Unit tesztek | ✅ **52 teszt, 7 fájl** (`tests/unit/`) — korábban 46/6 |
| Integration tesztek | ⚠️ **Infrastruktúra kész** (`tests/integration/`), de teszt-DB hiányában **nem futtatva** (biztonságos skip) — lásd 8. |
| E2E tesztek | ❌ Nincs (tervezett, Playwright) |
| Lefedettség mérés | ✅ Elérhető (`npm run test:coverage`, `@vitest/coverage-v8`) |
| CI tesztlépés | ❌ Nincs (nincs `.github/` pipeline — tervezett) |
| Statikus ellenőrzés | ⚠️ `tsc --noEmit` zöld; `npm run lint` **pre-existing hibák miatt piros** (lásd 6.1) |
| Production build | ✅ `npm run build` (Next.js) sikeres — 2026-06-26 |
| Production DB migráció | ✅ `20260626100000_link_etetes_takarmany` **alkalmazva** (`prisma migrate deploy`, 2026-06-26, `srv1695.hstgr.io`) — lásd `verification-log.md` V-13 |
| Kézi (manuális) ellenőrzés | ⚠️ Fejlesztés közben ad-hoc, nem dokumentált |

**Jelenleg rendelkezésre álló minőségi jelek:** Vitest unit tesztek, ESLint
(`eslint.config.mjs`), TypeScript szigorú típusozás (`tsconfig.json`, `tsc
--noEmit` zöld), és a séma-szintű megszorítások (egyedi kulcsok, FK-szabályok).

## 3. Tervezett tesztmátrix

| ID | Réteg | Terület | Eset (összefoglaló) | Eszköz | Állapot |
|---|---|---|---|---|---|
| U-01 | Unit | `roles` rangsor | RBAC küszöb döntések (`meetsToRole`/`meetsHalaszatRole`) | Vitest | ✅ Kész |
| U-02 | Unit | `password` | jelszó hash/verify, sha256, token generálás | Vitest | ✅ Kész |
| U-03 | Unit | `szam` | szám-parse + vessző + alapérték | Vitest | ✅ Kész |
| U-04 | Unit | `slugify` | ékezet/normalizálás/levágás | Vitest | ✅ Kész |
| U-05 | Unit | `canManageTarget` | dolgozó-kezelés szabályai | Vitest | ✅ Kész |
| U-06 | Unit | `canUpdateHibabejelentesStatus` | hibabejelentés-státusz jogosultság (tenant/ADMIN/bejelentő) | Vitest | ✅ Kész |
| U-07 | Unit | `szamitTakarmanyFelhasznalas` / `ketTizedes` | takarmány-készletlevonás: elég/nincs elég/érvénytelen, 2-tizedes kerekítés | Vitest | ✅ Kész |
| I-01 | Integration | Auth | register/login/me/logout + hibák | Vitest+DB | Tervezett |
| I-02 | Integration | Halászat | létrehozás + OWNER tagság | Vitest+DB | Tervezett |
| I-03 | Integration | Tó | létrehozás/listázás, típus | Vitest+DB | Tervezett |
| I-04 | Integration | Halfaj | CRUD + egyediség + FK-védelem | Vitest+DB | Tervezett |
| I-05 | Integration | Telepítés/Kivét | állomány-frissítés + napló + készlet-ellenőrzés | Vitest+DB | Tervezett |
| I-06 | Integration | Áttelepítés | forrás/cél + két napló + tenant-check | Vitest+DB | Tervezett |
| I-07 | Integration | RBAC negatív | 401/403 a védett végpontokon | Vitest+DB | Tervezett |
| I-08 | Integration | Tenant-izoláció | idegen `[hid]`/`[toId]` → 403/404 | Vitest+DB | Tervezett |
| I-09 | Integration | Takarmánykészlet | takarmány CRUD + mozgás → `keszlet` frissül + negatív-védelem (422) | Vitest+DB | Tervezett |
| I-10 | Integration | Etetés↔takarmány levonás | `takarmanyId` nélkül: csak `Etetes`+napló (készlet változatlan); `takarmanyId`-vel: `Etetes`+`TakarmanyMozgas(FELHASZNALVA)`+csökkentett `keszlet`+napló egy tranzakcióban; idegen halászat takarmánya → 404; nincs elég készlet → 422 (atomi rollback) | Vitest+DB | Tervezett |
| E-01 | E2E | Fő folyamat | regisztráció→halászat→tó→halfaj→telepítés→összesítő | Playwright | Tervezett |
| E-02 | E2E | Jogosultság | STAFF nem fér ADMIN-művelethez | Playwright | Tervezett |
| E-03 | E2E | Izoláció | „A" nem látja „B" adatát | Playwright | Tervezett |

## 4. Nyomonkövethetőség — elfogadási kritérium → tervezett teszt

A 7 elfogadási kritérium a `scope-contract.md`-ből, mindegyikhez tervezett tesztek:

| # | Elfogadási kritérium | Tervezett teszt(ek) | Állapot |
|---|---|---|---|
| AC1 | Felhasználó létre tud hozni halászatot | I-02, E-01 | Tervezett |
| AC2 | A halászathoz tavak rendelhetők | I-03, E-01 | Tervezett |
| AC3 | A tavakhoz halfajok kezelhetők | I-04, E-01 | Tervezett |
| AC4 | Telepítés/kivét után az állomány automatikusan frissül | I-05, I-06, E-01 | Tervezett |
| AC5 | A jogosultsági rendszer megakadályozza az illetéktelen hozzáférést | I-07, E-02 | Tervezett |
| AC6 | Az események naplózásra kerülnek | I-05, I-06 | Tervezett |
| AC7 | Több halászat adatai egymástól elkülönítve tárolódnak | I-08, E-03 | Tervezett |

Minden elfogadási kritériumhoz tartozik legalább egy tervezett automata teszt.
A megvalósításkor ide kerül az eredmény (✅/❌), a futás dátuma és a bizonyíték
hivatkozása.

## 5. Eredmények (unit réteg)

Legutóbbi tényleges futás — `npm run test` (Vitest 3.2.6, `environment: node`),
**2026-06-26**:

```text
 ✓ tests/unit/roles.test.ts             (15 tests)
 ✓ tests/unit/slug.test.ts              ( 6 tests)
 ✓ tests/unit/szam.test.ts              ( 6 tests)
 ✓ tests/unit/password.test.ts          ( 7 tests)
 ✓ tests/unit/takarmany-keszlet.test.ts ( 8 tests)
 ✓ tests/unit/test-db-guard.test.ts     ( 4 tests)
 ✓ tests/unit/rogzito.test.ts           ( 6 tests)

 Test Files  7 passed (7)
      Tests   52 passed (52)
```

- **Típusellenőrzés:** `npx tsc --noEmit` → **exit 0** (0 típushiba).
- **Production build:** `npm run build` (Next.js) → **sikeres** (2026-06-26).
- **Integrációs tesztek:** `npm run test:integration` → **5 teszt SKIPPED** (nincs
  teszt-DB) — biztonságos, production-érintés nélkül (lásd 8. szakasz).
- **Környezet:** Node (lokális), DB **nem szükséges** a unit réteghez (tiszta
  logika). Megjegyzés: a production DB-migráció külön, `prisma migrate deploy`-jal
  alkalmazva (lásd `verification-log.md` V-13).

> Korábbi baseline (2026-06-17): `Test Files 4 passed (4) / Tests 29 passed (29)`.
> A növekmény: +5 teszt (`canUpdateHibabejelentesStatus`, a `roles.test.ts`-ben),
> majd +8 teszt (`takarmany-keszlet.test.ts`).

### 5.1 Implementált teszt-fájlok és a tesztelt modulok

| Teszt-fájl | Tesztelt modul | Esetek |
|---|---|---|
| `tests/unit/szam.test.ts` | `src/lib/utils/szam.ts` | szám/vessző/alapérték/NaN |
| `tests/unit/slug.test.ts` | `src/lib/utils/slug.ts` (**kiemelt**) | ékezet, normalizálás, levágás, üres |
| `tests/unit/roles.test.ts` | `src/lib/roles.ts` (**kiemelt**) | rangsorok, `meets*Role`, `canManageTarget`, `canUpdateHibabejelentesStatus` |
| `tests/unit/password.test.ts` | `src/lib/password.ts` (**kiemelt**) | `sha256`, hash/verify, token |
| `tests/unit/takarmany-keszlet.test.ts` | `src/lib/takarmany/keszlet.ts` | készletlevonás: elég/nincs elég/érvénytelen, `ketTizedes` kerekítés |
| `tests/unit/test-db-guard.test.ts` | `tests/integration/helpers/testDb.ts` (`ellenorizNemProduction`) | production-guard: production host/DB → dob; biztonságos teszt-URL → átengedi |
| `tests/unit/rogzito.test.ts` | `src/lib/audit/rogzito.ts` (`rogzitoMegjelenites`) | actor-megjelenítés: név → email → null; trim; nincs actor → null |

### 5.2 Viselkedés-megőrző kiemelések (refaktor)

A tiszta logika unit-tesztelhetőségéért három apró, **viselkedést nem változtató**
kiemelés történt; az eredeti hívási pontok importtal használják ezeket:

- `slugify` → `src/lib/utils/slug.ts` (forrás: `app/api/halaszatok/route.ts`).
- Rangsor + `canManageTarget` → `src/lib/roles.ts` (forrás: `lib/guards.ts` és
  `app/api/halaszatok/[hid]/dolgozok/[tid]/route.ts`). A `guards.ts` mostantól a
  `meetsToRole`/`meetsHalaszatRole` helpereket hívja (azonos `<` küszöblogika).
- `hashPassword`/`verifyPassword`/`createSessionToken`/`sha256` →
  `src/lib/password.ts` (forrás: `lib/auth.ts`, amely re-exportál a kompatibilitásért).

A `tsc --noEmit` zöld, ami igazolja, hogy a kiemelések nem törték a típusokat.

### 5.3 Ismert korlátok (mit NEM fed a unit réteg)

- A `lib/auth.ts` `createSession`/`deleteSession`/`getAuthUser` függvényei
  **Next `cookies()`-hoz és Prisma-hoz** kötöttek → unit szinten nem tesztelhetők
  izoláltan; integration teszttel (I-01) fedendők.
- A `lib/guards.ts` `require*` és a `lib/tenant/*` függvények **Prisma-hívásokat**
  tartalmaznak; csak a kiemelt tiszta logikájuk (rangsor) van unit-tesztelve, a
  DB-s ágak integration szinten jönnek (I-07, I-08).
- Az API route handlerek (`src/app/api/**`) teljes viselkedése (státuszkódok,
  tranzakciók) integration/e2e réteget igényel — lásd 3. szakasz.

## 6. TODO — jövőbeli bizonyítékok

### 6.1 Ismert hiányosság — `npm run lint` jelenleg piros (pre-existing)

Az `npm run lint` **136 hibát** jelez, de ezek **mind a meglévő alkalmazáskódban**
vannak (pl. `src/lib/tenantDb.ts`, több route handler `any` típusa,
`components/app/AppShell.tsx` feltételes React hook-ok), **nem** az új teszt-setup
okozza. Bizonyíték: az új/módosított fájlokra futtatott ESLint **0 hibát** ad
(`npx eslint src/lib/roles.ts src/lib/password.ts src/lib/utils/slug.ts
src/lib/auth.ts src/lib/guards.ts ... tests/unit/*.ts` → exit 0). Ez elfogadott
ismert hiányosságként, de **később javítandó**, vagy a CI-ban átmenetileg külön
kezelendő (pl. csak a változott fájlokra futó lint, amíg a meglévő hibák
felszámolásra nem kerülnek).

### 6.2 Hátralévő tételek

- [x] Vitest bevezetése; `test` / `test:unit` / `test:coverage` szkriptek.
- [x] Első valós unit tesztek (29) a tiszta logikára.
- [x] Unit tesztek bővítése **42**-re (`canUpdateHibabejelentesStatus`,
      `szamitTakarmanyFelhasznalas`) — 2026-06-26.
- [x] Production DB-migráció (`20260626100000_link_etetes_takarmany`) alkalmazva +
      `npm run build` zöld — 2026-06-26 (lásd `verification-log.md` V-13).
- [ ] **Pre-existing lint hibák** felszámolása vagy CI-stratégia (6.1).
- [ ] Playwright + integration réteg (teszt-DB, seed/factory — `testing-strategy.md` 8.).
- [ ] **CI-log:** GitHub Actions (lint→typecheck→unit→integration→e2e).
- [ ] **Lefedettségi riport** csatolása (`npm run test:coverage`), célok igazolása.
- [ ] **Playwright bizonyíték:** trace + screenshot (E-01, E-02, E-03).
- [ ] A 3./4. táblázat integration+e2e sorainak valós állapotra frissítése; a
      `docs/06_release/acceptance-report.md` összekötése.

## 7. CI (GitHub Actions)

A folyamatos integráció a `.github/workflows/ci.yml`-ben van definiálva, és
**push** illetve **pull_request** eseményre fut.

**Jelenleg futó (blokkoló) lépések:**

1. `actions/checkout` — forrás kivétele.
2. `actions/setup-node` (Node 20, npm cache).
3. `npm ci` — reprodukálható függőségtelepítés.
4. `npx prisma generate` — Prisma kliens előállítása (a typecheckhez kell;
   nem csatlakozik adatbázishoz).
5. `npx tsc --noEmit` — típusellenőrzés.
6. `npm run test` — Vitest unit tesztek (52 teszt, 7 fájl).

A CI tehát **typecheck + unit teszt** szinten véd; valódi adatbázis nem
szükséges (a workflow csak egy placeholder `DATABASE_URL`-t állít be a Prisma
sémához).

**Ismert, nem-blokkoló hiányosság — lint:** az `npm run lint` szándékosan **nincs**
a CI blokkoló lépései között, mert a repóban pre-existing ESLint hibák vannak a
meglévő alkalmazáskódban (lásd 6.1). Ez **tudatos, dokumentált** döntés, nem
elrejtett hiba: a lint visszakapcsolandó blokkoló lépésként, amint a meglévő
lint-adósság rendezve van (vagy addig csak a változott fájlokra futtatva). A
workflow `TODO` kommentje ugyanezt rögzíti.

**Jövőbeli munka (a CI bővítése):** integration tesztek teszt-adatbázis
szolgáltatással (pl. MySQL service container), Playwright e2e lépés, lefedettségi
riport feltöltése, és — a lint-adósság felszámolása után — a lint blokkolóvá
tétele. Lásd a 6.2 hátralévő tételeket.

## 8. Integrációs tesztek — állapot (2026-06-26)

> **Implementálva, de teszt-DB hiányában NEM futtatva.** Az első DB-backed
> workflow-tesztek elkészültek; a futtatás dedikált, izolált teszt-adatbázist
> igényel. A production DB-t **nem** érintettük.

| Tétel | Állapot |
|---|---|
| Integrációs infrastruktúra | ✅ Kész (`tests/integration/`, `vitest.integration.config.ts`) |
| Production-guard (host/DB ellenőrzés) | ✅ Kész + **unit-tesztelt** (`tests/unit/test-db-guard.test.ts`) |
| Teszt-DB kezelő (csak `TEST_DATABASE_URL`/`DATABASE_URL_TEST`) | ✅ Kész (`tests/integration/helpers/testDb.ts`) |
| Workflow A — takarmány-etetés levonás (+ **actor** assert) | ✅ Megírva (`feed-workflow.test.ts`) — a `TakarmanyMozgas`/`NaploEsemeny` `felhasznaloId`-ját is ellenőrzi; futtatás: teszt-DB-vel |
| Backward-compat C — etetés takarmány nélkül | ✅ Megírva (`feed-workflow.test.ts`) |
| Workflow B — jogosultság/tenant-izoláció | ✅ Megírva (`authorization.test.ts`) |
| **Tényleges futtatás** | ⚠️ **SKIPPED** — nincs `TEST_DATABASE_URL` beállítva (5 teszt kihagyva, 0 DB-kapcsolat) |

**Reprodukálható futtatás (teszt-DB-vel):**

1. Hozz létre egy **üres, izolált** MySQL teszt-adatbázist (nem a production!).
2. `TEST_DATABASE_URL="mysql://user:pass@host:3306/nemeth_horgaszat_test"` (a
   production-guard elutasítja a `srv1695.hstgr.io` / `u625819054_horgaszat_v1`
   értékeket).
3. `TEST_DATABASE_URL=... npx prisma migrate deploy` (séma a teszt-DB-re; a Prisma
   CLI a `DATABASE_URL`-t használja a `migrate deploy`-hoz, ezért a teszt-DB
   futtatáshoz a megfelelő env-et kell beállítani).
4. `TEST_DATABASE_URL=... npm run test:integration`.

Az eredmény (zöld/piros), a futás dátuma és a használt DB **ide rögzítendő**,
amint egy biztonságos teszt-DB rendelkezésre áll. Bizonyítékot kitalálni tilos.

### 8.1 Bővített tervezett tesztmátrix-sorok

A 3. szakasz `I-10` (etetés↔takarmány levonás) és a jogosultsági `I-07`/`I-08`
sorok **megírva** vannak integrációs tesztként, de **futtatásuk teszt-DB-re vár**;
státuszuk addig `Megírva / nem futtatva`.
