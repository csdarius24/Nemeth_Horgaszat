# Testing Strategy

Ez a dokumentum a Németh Horgászat rendszer tesztelési stratégiáját írja le. A
stratégia a tényleges kódbázishoz igazodik (`src/lib/**`, `src/app/api/**`,
`prisma/schema.prisma`) és a `docs/01_product/scope-contract.md` 7 elfogadási
kritériumához köti a teszteket. **Fontos:** ez a *terv*; a tesztek
implementálása még nem történt meg (lásd `test-report.md`).

## 1. Célok és alapelvek

- Minden elfogadási kritérium (AC1–AC7) legalább egy automata teszttel
  igazolható legyen.
- A biztonságkritikus viselkedés (RBAC, tenant-izoláció) **negatív** tesztekkel is
  fedett legyen, ne csak a „boldog úttal".
- A tesztek determinisztikusak és izoláltak legyenek (külön teszt-adatbázis,
  tesztenkénti tiszta állapot).
- A tesztpiramis alja széles (sok gyors unit teszt), a teteje keskeny (kevés,
  drága e2e teszt).

## 2. Tesztpiramis

```text
        /\
       /e2e\       Playwright — kevés, kritikus felhasználói folyamat
      /------\
     /  integ \    Vitest + teszt-DB — API route handlerek, tranzakciók
    /----------\
   /    unit     \ Vitest — tiszta logika: guards, auth, szam, slug
  /--------------\
```

| Réteg | Mit fed | Eszköz | Arány (cél) |
|---|---|---|---|
| Unit | Tiszta függvények, üzleti szabályok DB nélkül | Vitest | ~70% |
| Integration | API végpontok + Prisma + teszt-DB | Vitest | ~25% |
| E2E | Teljes folyamat böngészőből | Playwright | ~5% |

## 3. Eszközválasztás (ajánlás)

- **Vitest** — unit és integration réteg. Indok: natív TypeScript/ESM támogatás,
  gyors, Next.js/Vite-barát, `vi.mock` a `src/lib/prisma` mockolásához unit
  szinten. (Jelenleg nincs a `package.json`-ban; bevezetendő devDependency.)
- **Playwright** — e2e réteg. Indok: valódi böngésző, megbízható auto-waiting,
  egyszerű HTTP+UI tesztelés, beépített trace/screenshot bizonyíték CI-hoz.
- **Kiegészítők:** `@vitest/coverage-v8` (lefedettség), opcionálisan
  `vitest --ui` lokális fejlesztéshez.

> Megjegyzés: a tesztek bevezetése egy `test`/`test:e2e`/`coverage` szkript
> hozzáadását igényli a `package.json`-hoz; ez külön feladat (a jelen dokumentum
> nem módosít kódot).

## 4. Tervezett unit tesztek

A `src/lib/**` tiszta logikája DB nélkül tesztelhető:

| Modul | Tesztesetek |
|---|---|
| `src/lib/guards.ts` — `ROLE_RANK` / `HALASZAT_ROLE_RANK` | A rangsor helyes: STAFF<ADMIN<OWNER; `minRole` küszöb döntései (elég / nem elég jogosultság). |
| `src/lib/auth.ts` — `hashPassword`/`verifyPassword` | Hash nem egyenlő a plaintexttel; helyes jelszó `true`, rossz `false`; `createSessionToken` megfelelő hosszú, egyedi. |
| `src/lib/utils/szam.ts` — `szam()` | Számokká alakítás; érvénytelen bemenetnél az alapérték; nem-szám stringek kezelése. |
| `halaszatok/route.ts` — `slugify` (kiemelendő/tesztelhető) | Ékezet-eltávolítás, kisbetűsítés, ütközés-feloldó utótag logikája. |
| `dolgozok/[tid]/route.ts` — `canManageTarget` | OWNER-t senki; ADMIN csak STAFF-ot; OWNER STAFF+ADMIN-t. |
| `src/lib/roles.ts` — `canUpdateHibabejelentesStatus` ✅ **implementálva** | Halászathoz kötött bejelentés: ADMIN/OWNER igen, STAFF/nem-tag nem (tenant-átlépés kizárva); globális bejelentés: csak a bejelentő. (`tests/unit/roles.test.ts`) |
| `src/lib/takarmany/keszlet.ts` — `szamitTakarmanyFelhasznalas` / `ketTizedes` ✅ **implementálva** | Készletlevonás etetéskor: elegendő készlet → új készlet; pontos kimerítés (0 marad); float-drift kerekítés; nincs elég készlet → `nincs_eleg_keszlet`; nulla/negatív/nem-véges → `ervenytelen_mennyiseg`. (`tests/unit/takarmany-keszlet.test.ts`) |
| `src/lib/audit/rogzito.ts` — `rogzitoMegjelenites` ✅ **implementálva** | Actor-megjelenítés a naplóhoz/mozgáshoz: név → email → null; trim; nincs actor → null. (`tests/unit/rogzito.test.ts`) |

> Ahol a logika jelenleg handleren belül inline (pl. `slugify`, `canManageTarget`,
> jelszó-generátor), a unit-tesztelhetőség érdekében megfontolandó tiszta
> függvénybe kiemelni — ez a tesztstratégia egyik javaslata (nem kötelező a
> teszteléshez, de javítja az izolációt).

## 5. Tervezett integration tesztek

Valós (teszt-)adatbázis ellen, a route handlereket meghívva. Fókusz a
tranzakciós és tenant-logikán:

- **Auth:** `register` → `login` → `me` → `logout` életciklus; duplikált email
  (409); rossz jelszó (401); inaktív fiók (401).
- **Halászat:** létrehozás OWNER tagsággal (AC1); slug-egyediség.
- **Tó:** létrehozás ADMIN-ként, listázás STAFF-ként (AC2); `TELELO` típus.
- **Halfaj:** létrehozás/átnevezés/inaktiválás; egyedi név tenanton belül (P2002 →
  409); FK-védett törlés (P2003 → 409 + inaktiválás javaslat) (AC3).
- **Telepítés/Kivét:** állomány nő/csökken, napló keletkezik, kivétnél
  készlet-ellenőrzés (nincs elég → 400) (AC4, AC6).
- **Áttelepítés:** forrás csökken, cél nő (upsert), két naplóesemény, tenant-check
  mindkét tóra (AC4, AC6).
- **Takarmánykészlet:** takarmány létrehozás/átnevezés/inaktiválás; egyedi név
  tenanton belül (P2002 → 409); mozgás (bevétel/felhasználás) rögzítésekor a
  `keszlet` tranzakcióban frissül; felhasználás a készlet alá → 422; FK-védett
  törlés (mozgással → 409 + inaktiválás javaslat).
- **Etetés + automatikus készletlevonás (tervezett integration):** `POST
  .../toak/[toId]/etetes` `takarmanyId` nélkül → csak `Etetes` + `NaploEsemeny`,
  készlet változatlan (visszafelé kompatibilitás); `takarmanyId`-vel → `Etetes` +
  `TakarmanyMozgas(FELHASZNALVA)` + csökkentett `keszlet` + `NaploEsemeny` egy
  tranzakcióban; idegen halászat takarmányára → `404`; nincs elég készlet → `422`
  és **nincs** részleges készletmódosítás (atomicitás). A tiszta levonási logika
  (`szamitTakarmanyFelhasznalas`) már unit-tesztelt; az endpoint-szintű
  (tranzakciós/atomicitási) ellenőrzés **tervezett** integration coverage.
- **Összesítő/summary/timeline:** aggregált értékek és paraméter-korlátok
  (`days`, `take`, `events`) helyessége.

## 6. Tervezett e2e tesztek (Playwright)

Kevés, de teljes folyamat:

1. **Fő folyamat:** regisztráció → halászat létrehozása → tó hozzáadása → halfaj
   felvétele → telepítés → dashboard/összesítő mutatja az állományt (AC1–AC4, AC6).
2. **Jogosultság:** STAFF felhasználó nem ér el ADMIN-műveletet (pl. tó
   létrehozás) — a UI/ękérés elutasít (AC5).
3. **Tenant-izoláció:** „A" halászat tagja nem látja „B" halászat tavát/adatát
   (AC7).

## 7. Negatív tesztek

A negatív tesztek elsőrendűek a thesis védhetősége szempontjából:

- **Jogosulatlan hozzáférés:** bejelentkezés nélküli kérés védett végpontra → 401;
  STAFF az ADMIN-only végpontokra (telepítés, kivét, tó-/halfaj-/dolgozó-kezelés)
  → 403.
- **Érvénytelen bemenet:** hiányzó/rossz típusú mezők (üres név, nem pozitív
  darab, hibás dátum, jelszó < 8) → 400; duplikált egyedi mező → 409.
- **Tenant-izoláció megsértése:** idegen halászathoz tartozó `[hid]` → 403;
  idegen tóra mutató `[toId]` egy adott `[hid]` alatt → 404
  (`assertToBelongsToTenant`). Kivét/áttelepítés tenant-idegen tóra → elutasítás.
- **Üzleti szabály:** kivét több darabra, mint a készlet → 400; áttelepítés
  cél=forrás → 400.
- **Hibabejelentés-végpontok jogosultsága (auth-rés rendezve):** a három végpont
  auth + RBAC kikényszerítést kapott (lásd `threat-model.md` 6/3 és
  `role-matrix.md` §2.5). Integration teszttel igazolandó: `GET .../hibabejelentesek`
  bejelentkezés nélkül `401`, nem-tagként `403`; `POST /api/hibabejelentesek` a
  `felhasznaloId`-t sessionből veszi (body-beli érték hatástalan) és idegen
  `halaszatId`-re `403`; `PATCH /api/hibabejelentesek/[id]` nem létező id → `404`,
  STAFF/idegen-tenant → `403`, nem létező jogosultság globálisra (nem bejelentő) →
  `403`. A tiszta döntéslogika (`canUpdateHibabejelentesStatus`) már unit-tesztelt.

## 8. Teszt-adat stratégia

- **Külön teszt-adatbázis** (dedikált `TEST_DATABASE_URL` / `DATABASE_URL_TEST`,
  **sosem** a `DATABASE_URL`/éles DB — lásd 8.A production-guard).
- **Séma:** `prisma migrate deploy` a teszt-DB-re a futtatás előtt.
- **Izoláció:** minden teszt(csoport) tiszta állapotból induljon — tranzakcióba
  csomagolt teszt és visszagörgetés, vagy a táblák ürítése (truncate) + minimál
  seed `beforeEach`-ben.
- **Factory/seed helperek:** programatikus létrehozás (`createUser`,
  `createHalaszat`, `addTag`, `createTo`, `createHalfaj`) a determinisztikus,
  olvasható tesztekért.
- **Adatok jellege:** kizárólag **szintetikus** adat; valós személyes adat nem
  kerül tesztbe (összhangban a `privacy.md` AI-/adatkezelési szabályával).
- **Auth a tesztekben:** integration szinten a session-süti megszerzése a
  `login` végponton át, vagy közvetlen `Session` rekord létrehozása + süti
  beállítása helperrel.

## 8.A Integrációs teszt-infrastruktúra — biztonságos teszt-DB kezelés (implementálva)

> **Implementálva (2026-06-26), de teszt-DB hiányában nem futtatva.** Az első
> DB-backed workflow-tesztek és a hozzájuk tartozó biztonsági infrastruktúra
> elkészült. A futtatás **dedikált, izolált teszt-adatbázist igényel**
> (`TEST_DATABASE_URL` vagy `DATABASE_URL_TEST`).

**Biztonsági szabályok (kódból kikényszerítve — `tests/integration/helpers/testDb.ts`):**

- Az integrációs tesztek **kizárólag** a `TEST_DATABASE_URL` / `DATABASE_URL_TEST`
  változót használják. A `DATABASE_URL`-t (`.env`, production) a teszt-réteg
  **soha nem** olvassa be.
- **Production-guard:** ha a teszt-URL a productionre utal (`srv1695.hstgr.io`
  hosztot vagy `u625819054_horgaszat_v1` DB-nevet tartalmaz), a futás **azonnal
  leáll** hibával. Ezt **unit-teszt** is fedi (`tests/unit/test-db-guard.test.ts`).
- Ha nincs teszt-DB beállítva, az integrációs blokk **biztonságosan kihagyásra
  kerül** (`describe.skipIf`), nem fut production ellen, és **nem nyit
  DB-kapcsolatot**.

**Konfiguráció és parancsok:**

- `npm run test` — **csak** a `tests/unit/**` (a default `vitest.config.ts` ide
  szűkítve) → soha nem nyúl DB-hez, így production-biztos.
- `npm run test:integration` — külön config (`vitest.integration.config.ts`),
  `tests/integration/**`; teszt-DB hiányában skip.
- `npm run test:all` — unit + integration (az integráció önmagát kihagyja/guardolja).

**Adat- és takarítási elv:** minden rekord egyedi prefixszel jön létre
(`itest_<timestamp>_<rand>`), fix ID-t nem feltételezünk, és a futás végén a
létrehozott gyökerek (Halaszat, Felhasznalo) törlődnek (kaszkád + explicit), így
nem támaszkodunk meglévő production/dev rekordra.

**Lefedett workflow-tesztek (futtatás teszt-DB-vel):**

- **A) Takarmány-etetés workflow** (`tests/integration/feed-workflow.test.ts`):
  szintetikus halászat/user/tagság/tó/takarmány → bevétel → etetés `takarmanyId`-vel
  → `Takarmany.keszlet` csökken → `TakarmanyMozgas(FELHASZNALVA)` jön létre az
  `Etetes`-hez/tóhoz kötve → `NaploEsemeny(ETETES)` keletkezik. A készletszámítás
  a **valódi** `szamitTakarmanyFelhasznalas` helperrel.
- **C) Visszafelé kompatibilitás:** etetés `takarmanyId` nélkül → `Etetes` + napló,
  a takarmány készlete **változatlan**, nincs `FELHASZNALVA` mozgás.
- **B) Jogosultsági workflow** (`tests/integration/authorization.test.ts`):
  tenant-izoláció (idegen halászat tagja → elutasítva) és szerepkör-kapuzás (STAFF
  nem végezhet ADMIN-műveletet; inaktivált tagság elutasítva) a **valódi**
  `meetsHalaszatRole` logikával — a `requireHalaszatRole` guard auth UTÁNI,
  DB-függő döntésének hű mása.

**Hatókör-korlát (őszinte):** ezek **Prisma/domain-szintű** integrációs tesztek a
valódi sémát, tranzakciókat és üzleti helpereket gyakorolják. A teljes
**endpoint-szintű (HTTP route handler + Next cookie/session → 401)** lefedés
a **következő lépés** (Next request-kontextus vagy futó szerver szükséges hozzá).

## 9. Lefedettségi célok

| Terület | Cél (sor/ág) |
|---|---|
| `src/lib/**` (tiszta logika) | ≥ 90% |
| `src/app/api/**` (route handlerek) | ≥ 70% |
| Projekt összesen | ≥ 75% |
| Biztonsági ágak (RBAC, tenant-check, készlet-ellenőrzés) | 100% a kulcs-elágazásokra |

A lefedettség `@vitest/coverage-v8`-cal mérendő, és CI-ban riportálandó (lásd
`test-report.md` TODO-k). A számszerű célok minimumok; a biztonsági elágazásoknál
a teljes ág-lefedettség fontosabb, mint a globális százalék.

## 10. CI integráció (terv)

- A teszteknek a CI pipeline részeként kell futniuk: `lint` → `typecheck` →
  unit + integration (teszt-DB szolgáltatással) → e2e (Playwright) → coverage
  riport. A pipeline a `docs/05_security_ops/deployment.md` build-lépéseire épül.
- A bizonyítékok (CI-log, coverage, Playwright trace/screenshot) a `test-report.md`
  megfelelő szakaszaiba kerüljenek, ahogy elérhetővé válnak.
