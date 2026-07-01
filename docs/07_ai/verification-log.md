# Verification Log

Ez a napló rögzíti, hogyan ellenőriztük az AI által generált kimeneteket és
állításokat. Minden bejegyzés: **AI állítás/kimenet → kockázat, ha téves →
ellenőrzési módszer → eredmény → bizonyíték**. A cél, hogy az AI-támogatás
felügyelt és igazolt legyen, ne vakon elfogadott. Kapcsolódó: `ai-manifest.md`,
`prompt-log.md`.

> Bizonyíték-elv: csak tényleges, reprodukálható bizonyítékot rögzítünk. Ahol a
> bizonyíték még nem áll rendelkezésre, `TODO` jelzi — nem találunk ki eredményt.

---

## V-01 — Unit tesztek zöldek

- **AI kimenet:** 29 unit teszt (Vitest) a tiszta logikára.
- **Kockázat, ha téves:** hibás teszt vagy hamis „zöld" → téves minőségi jelzés.
- **Ellenőrzés:** `npm run test` lokális futtatása.
- **Eredmény:** ✅ **29/29 passed** (4 fájl: roles, slug, szam, password), ~1.7s.
- **Bizonyíték:** Vitest kimenet: `Test Files 4 passed (4) / Tests 29 passed (29)`.
  (CI-ban is fut, lásd V-04.)

## V-02 — Típusellenőrzés tiszta

- **AI kimenet:** viselkedés-megőrző kiemelések (`roles.ts`, `password.ts`,
  `slug.ts`) + frissített importok.
- **Kockázat, ha téves:** törött típusok / nem forduló kód a refaktor után.
- **Ellenőrzés:** `npx tsc --noEmit` a teljes projekten.
- **Eredmény:** ✅ **exit 0** (0 típushiba).
- **Bizonyíték:** a parancs kilépési kódja 0; a `guards.ts` és a route-ok továbbra
  is fordulnak az új importokkal.

## V-03 — A kiemelések viselkedés-megőrzők

- **AI claim:** a `slugify`, a rangsor-logika és a jelszó-helperek kiemelése nem
  változtatja a viselkedést.
- **Kockázat, ha téves:** megváltozott auth/slug viselkedés → biztonsági vagy
  funkcionális regresszió.
- **Ellenőrzés:** a kiemelt kód karakterre azonos az eredetivel; az új unit
  tesztek a kiemelt logikát fedik; `tsc` + tesztek zöldek; git diff áttekintve.
- **Eredmény:** ✅ A `<` küszöblogika `meets*Role`-ként ekvivalens; az `auth.ts`
  re-exportál a kompatibilitásért.
- **Bizonyíték:** git diff (`be5269d`), V-01, V-02.

## V-04 — CI workflow hozzáadva és helyes lépéssorrend

- **AI kimenet:** `.github/workflows/ci.yml` (push + pull_request).
- **Kockázat, ha téves:** a CI nem fut, vagy rossz sorrend (pl. `prisma generate`
  a typecheck után) → piros vagy hamis-zöld pipeline.
- **Ellenőrzés:** a workflow lépéssorrendjének átolvasása (checkout → Node →
  `npm ci` → `prisma generate` → `tsc --noEmit` → `npm run test`); commit a main-re.
- **Eredmény:** ✅ Hozzáadva (`72c10a2`). A `prisma generate` a typecheck ELŐTT
  fut, így a `@prisma/client` típusok elérhetők.
- **Bizonyíték:** `.github/workflows/ci.yml`; git commit `72c10a2`.
- **TODO:** az első GitHub Actions futás zöld eredményének linkje/screenshotja
  (a repó Actions fülén ellenőrizendő push után).

## V-05 — Lint ismert hiányosság, NEM elrejtve

- **AI claim:** a `npm run lint` pirosa pre-existing, nem az új teszt-setup okozza.
- **Kockázat, ha téves:** ha az új kód okozná, azt elrejtenénk → félrevezető
  minőségi kép.
- **Ellenőrzés:** ESLint futtatása **csak** az új/módosított fájlokra, külön a
  teljes futástól.
- **Eredmény:** ✅ Az új/módosított fájlokra `npx eslint ...` → **exit 0**; a teljes
  `npm run lint` hibái mind meglévő fájlokban (`tenantDb.ts`, `AppShell.tsx`,
  route-ok `any`-jei).
- **Bizonyíték:** `docs/04_quality/test-report.md` 6.1 szakasz; a workflow `TODO`
  kommentje. A lint tudatosan nem-blokkoló a CI-ban.

## V-06 — Data-model a tényleges sémából

- **AI kimenet:** `data-model.md` ER diagrammal, enumokkal, cascade szabályokkal.
- **Kockázat, ha téves:** kitalált mezők/relációk → félrevezető tervdokumentáció.
- **Ellenőrzés:** entitásonkénti összevetés a `prisma/schema.prisma`-val.
- **Eredmény:** ✅ A 13 modell, az 5 enum és az `onDelete` szabályok (Cascade/
  Restrict/SetNull) a sémával egyeznek; a `To.halaszatId` nullable legacy-jelleg
  külön jelölve.
- **Bizonyíték:** `docs/03_design/data-model.md` vs. `prisma/schema.prisma`;
  commit `c0548a2`.

## V-07 — API-design a tényleges route-okból

- **AI kimenet:** `api-design.md` minden végponttal, szerepkörrel, hibákkal.
- **Kockázat, ha téves:** nem létező végpont vagy rossz jogosultság → hibás
  szerződés.
- **Ellenőrzés:** a `src/app/api/**` handlerek egyenkénti átolvasása.
- **Eredmény:** ✅ A dokumentált végpontok léteznek; a szerepkör-követelmények a
  `requireHalaszatRole(...)` hívásokból származnak.
- **Bizonyíték:** `docs/03_design/api-design.md` vs. `src/app/api/**`; commit
  `c0548a2`.

## V-08 — Biztonsági hiányok kifejezetten dokumentálva (nem „elmagyarázva")

- **AI claim:** a kódban valós biztonsági hiányok vannak (login rate limiting
  hiánya, `error`/`hiba` inkonzisztencia, hibabejelentés-végpontok auth-hiánya,
  production query-logging).
- **Kockázat, ha téves:** kitalált vagy elrejtett hiányosság → hamis biztonsági
  kép.
- **Ellenőrzés:** a forrás megtekintése — `src/lib/prisma.ts` (`log: ["query"]`),
  a `hibabejelentesek` route-ok (nincs guard), `auth/login` (nincs rate limit).
- **Eredmény:** ✅ A hiányok valósak és kódból igazoltak; a dokumentáció
  kifejezetten rögzíti őket, nem magyarázza el.
- **Bizonyíték:** `docs/05_security_ops/threat-model.md` (6–7. szakasz);
  `docs/03_design/api-design.md` (hibabejelentés szakasz).

## V-09 — A „nincs automata teszt" baseline állítás igaz volt

- **AI claim (a teszt-setup előtt):** a projektben nincs automata teszt.
- **Kockázat, ha téves:** a baseline hamis → félrevezető kiindulópont.
- **Ellenőrzés:** a `package.json` szkriptjei és a repo `*.test.ts`/`*.spec.ts`
  fájljai.
- **Eredmény:** ✅ A teszt-infrastruktúra előtt nem volt runner és nem volt
  tesztfájl; ezt később a Vitest bevezetése változtatta meg.
- **Bizonyíték:** `test-report.md` korábbi baseline; git előzmény a `be5269d`
  commit előtt.

## V-10 — Tesztek nem igényelnek production adatbázist

- **AI claim:** a unit tesztek DB nélkül futnak.
- **Kockázat, ha téves:** rejtett DB-függés → nem reprodukálható CI, vagy valós
  adat bevonása.
- **Ellenőrzés:** a tesztek importjai csak tiszta modulokat húznak be (`szam`,
  `slug`, `roles`, `password`); a `vitest.config.ts` `environment: node`, nincs
  DB-setup; lokálisan DATABASE_URL nélkül is zöld.
- **Eredmény:** ✅ Nincs DB-hozzáférés a unit rétegben.
- **Bizonyíték:** `tests/unit/*`, `vitest.config.ts`; V-01.

## V-11 — Coverage szkript elérhető

- **AI kimenet:** `test:coverage` szkript + `@vitest/coverage-v8` függőség.
- **Kockázat, ha téves:** a lefedettség nem mérhető → nem igazolható minőségi cél.
- **Ellenőrzés:** a `package.json` szkript és a devDependency megléte.
- **Eredmény:** ✅ `npm run test:coverage` definiálva; a provider telepítve.
- **Bizonyíték:** `package.json` (`scripts`, `devDependencies`).
- **TODO:** tényleges lefedettségi százalék rögzítése és a célokhoz mérése
  (`testing-strategy.md` 9.) — futtatandó és csatolandó.

## V-12 — Prompt/AI-adatkezelés: nincs titok kiszivárogtatva

- **AI claim:** a promptok nem tartalmaztak titkot, `DATABASE_URL`-t vagy valós
  személyes adatot.
- **Kockázat, ha téves:** adatszivárgás AI-eszközön keresztül.
- **Ellenőrzés:** a generáló promptok a forráskód szerkezetére hivatkoztak; a
  `.env*` gitignore-olt; a tesztek szintetikus adatot használnak.
- **Eredmény:** ✅ Nem került titok/PII AI-eszközbe; a szabály dokumentált.
- **Bizonyíték:** `ai-manifest.md` 4. szakasz; `privacy.md` 5. szakasz;
  `.gitignore` (`.env*`).

## V-13 — Etetés↔takarmány migráció production-be telepítve + build/teszt zöld

- **Dátum:** 2026-06-26.
- **AI kimenet:** az etetés↔takarmánykészlet összekötés (séma + migráció +
  endpoint + UI + unit tesztek); a `20260626100000_link_etetes_takarmany`
  migráció.
- **Kockázat, ha téves:** nem alkalmazott vagy hibás migráció → futásidejű DB-hiba
  productionben; törött build → sikertelen deploy; hamis „zöld" tesztjelzés.
- **Ellenőrzés (pontos parancsok, tényleges futás):**
  - `npx prisma migrate status` →
    `Database "u625819054_horgaszat_v1" at "srv1695.hstgr.io:3306"`,
    **pending migration:** `20260626100000_link_etetes_takarmany`.
  - `npx prisma migrate deploy` → a `20260626100000_link_etetes_takarmany`
    migráció **sikeresen alkalmazva** a production adatbázisra.
  - `npx prisma generate` → **siker** (Prisma kliens előállítva).
  - `npm run test` → **5 test file passed / 42 test passed**.
  - `npx tsc --noEmit` → **exit 0** (0 típushiba).
  - `npm run build` → **Next.js production build sikeres** (route-manifest
    generálva, beleértve a `ƒ /api/halaszatok/[hid]/toak/[toId]/etetes` végpontot).
- **Eredmény:** ✅ A production migráció alkalmazva; a unit + typecheck + build
  bizonyíték zöld. A `szamitTakarmanyFelhasznalas` készletlevonási logika
  unit-tesztelt (`tests/unit/takarmany-keszlet.test.ts`).
- **Bizonyíték:** a fenti parancskimenetek; `docs/04_quality/test-report.md` 5.
  szakasz; commit `4163f2f`.
- **Hatókör-korlát (őszinte):** ez **unit + build + migráció** szintű bizonyíték.
  **Endpoint-szintű integration teszt** az etetés-tranzakcióra (atomicitás,
  `404`/`422`, visszafelé kompatibilis ág) **továbbra is tervezett** — lásd
  `testing-strategy.md`. A párhuzamos etetések elleni **versenyhelyzet-védelem
  (row-lock / optimista verziózás) nincs** implementálva. **CI-futás linkje
  nincs ellenőrizve** ehhez a változáshoz (lásd V-04 TODO).

## V-14 — Integrációs teszt-infrastruktúra + biztonságos kihagyás (nincs production-érintés)

- **Dátum:** 2026-06-26.
- **AI kimenet:** DB-backed integrációs/workflow tesztek (takarmány-etetés
  workflow + jogosultság), külön vitest-configgal, production-guarddal és
  teszt-DB kezelővel; production-guard unit-teszt.
- **Kockázat, ha téves:** integrációs teszt véletlenül a **production** DB ellen
  fut → adatmódosítás/-szennyezés; vagy hamis „zöld" integráció.
- **Ellenőrzés (pontos parancsok, tényleges futás):**
  - `TEST_DATABASE_URL` és `DATABASE_URL_TEST` a futtatáskor **üres** (ellenőrizve)
    → nincs teszt-DB.
  - `npx tsc --noEmit` → **exit 0**.
  - `npm run test` (csak unit, `tests/unit/**`) → **6 fájl / 46 teszt passed**
    (korábbi 42 + 4 production-guard teszt). **Nem** futott integrációs teszt.
  - `npm run test:integration` → **2 fájl / 5 teszt SKIPPED**; a kimenet kiírja a
    kihagyás okát; a futás **0 ms teszt-idő, nincs DB-kapcsolat** — a production DB
    **nem** lett megérintve.
  - `npm run build` → **„Compiled successfully", static pages generálva**.
- **Eredmény:** ✅ Az infrastruktúra implementálva és **biztonságosan kihagyva**
  (nincs teszt-DB), production-érintés nélkül. A unit + guard + build bizonyíték
  zöld.
- **Bizonyíték:** a fenti parancskimenetek; `tests/integration/**`,
  `vitest.integration.config.ts`, `tests/integration/helpers/testDb.ts`;
  `docs/04_quality/test-report.md` 8. szakasz.
- **Hatókör-korlát (őszinte):** az integrációs tesztek **NEM futottak le valós
  adatbázis ellen** (nem volt biztonságos teszt-DB beállítva), ezért **nem
  szolgálnak végrehajtott PASS-bizonyítékként** egyetlen elfogadási kritériumhoz
  sem. A teljes endpoint-szintű (HTTP/cookie → 401) lefedés továbbra is tervezett.

## V-15 — Actor / audit-napló megerősítés (Sprint 1): séma + route-ok + build/teszt

- **Dátum:** 2026-06-26.
- **AI kimenet:** `felhasznaloId` (actor) a `NaploEsemeny`-en és a
  `TakarmanyMozgas`-on; a művelet-route-ok (telepítés/kivét/etetés/áttelepítés +
  takarmánymozgás) sessionből írják; `rogzitoNev` a `timeline` és a
  mozgásnapló-válaszban; `rogzitoMegjelenites` tiszta helper; migráció
  `20260626120000_actor_naplo_takarmanymozgas`.
- **Kockázat, ha téves:** hamisított actor (ha a kérés törzséből venné);
  törött build/típusok; production DB véletlen módosítása.
- **Ellenőrzés (pontos parancsok, tényleges futás):**
  - Kódszintű: az actor a `auth.user.azonosito`-ból (session), **nem** a
    `body`-ból — minden érintett `create` hívásban.
  - `npx prisma generate` → **siker** (nincs DB-kapcsolat).
  - `npx tsc --noEmit` → **exit 0**.
  - `npm run test` → **7 fájl / 52 teszt passed** (46 + 6 `rogzitoMegjelenites`).
  - `npm run test:integration` → **5 teszt SKIPPED** (nincs teszt-DB); a
    feed-workflow teszt actor-assertekkel bővült, de **teszt-DB hiányában nem
    futott** — 0 DB-kapcsolat, production **nem** érintve.
  - `npm run build` → **„Compiled successfully", static pages generálva**.
- **Eredmény:** ✅ Actor rögzítés kódszinten kész, unit + build + generate zöld.
- **Bizonyíték:** a fenti parancskimenetek; `prisma/schema.prisma`,
  `prisma/migrations/20260626120000_actor_naplo_takarmanymozgas/migration.sql`,
  az 5 érintett route; `docs/04_quality/test-report.md` 5/8. szakasz.
- **Hatókör-korlát (őszinte):** a **migráció NINCS alkalmazva** a production DB-re
  (nem futott `migrate deploy`/`migrate dev` — a `.env` a productionre mutathat).
  Az actor-mező addig üres marad éles adaton. A **művelet-szerkesztés/
  érvénytelenítés + verziózott előzmény** **nincs** (következő sprint). Az
  endpoint-szintű integrációs actor-igazolás **teszt-DB-re vár**.

## V-16 — Actor Sprint 1 lezárva: migráció (test → prod) + integrációs futtatás

- **Dátum:** 2026-06-26.
- **AI/fejlesztői kimenet:** az actor-tracking (Sprint 1) implementálva, migrálva,
  tesztelve, pusholva (commit `4f341d9`). Az actor a `NaploEsemeny`-en és a
  `TakarmanyMozgas`-on tárolódik a sessionből; lefedi a telepítés/kivét/
  áttelepítés/etetés + automatikus takarmány-levonás + kézi takarmánymozgás
  műveleteket; a `timeline` és a mozgásnapló `rogzitoNev`-et ad vissza; a
  takarmánymozgás-UI mutatja a rögzítőt.
- **Kockázat, ha téves:** nem alkalmazott/hibás migráció productionben; hamis
  „integráció zöld"; production-adat véletlen módosítása.

- **Bizonyíték-provenancia (ebben az asszisztens-munkamenetben géppel rögzítve):**
  - `npm run test` → **7 fájl / 52 teszt passed** (46 + 6 `rogzitoMegjelenites`).
  - `npx tsc --noEmit` → **exit 0**.
  - `npm run build` → **„Compiled successfully", static pages generálva**.
  - `npx prisma generate` → **siker** (nincs DB-kapcsolat).
  - `npm run test:integration` **teszt-DB nélkül** → **5 teszt SKIPPED**, 0
    DB-kapcsolat (biztonságos alapállapot).

- **Fejlesztő által végrehajtott lépések (a biztonságos teszt-DB / production
  ellen; a verbatim konzolkimenet itt nincs elmentve, csak a lépés + kimenetel):**
  - `npx prisma migrate status` → a `20260626120000_actor_naplo_takarmanymozgas`
    migráció függőben.
  - `npx prisma migrate deploy` a **biztonságos teszt-DB**-re → alkalmazva.
  - `TEST_DATABASE_URL=... npm run test:integration` a **teszt-DB** ellen → az
    5-teszt integrációs suite (feed-workflow **actor-assertekkel** + authorization)
    **sikeresen lefutott**; a production-guard elutasítja a productionre mutató
    URL-t.
  - `npx prisma migrate deploy` a **production** DB-re (`srv1695.hstgr.io`) →
    alkalmazva.

- **Eredmény:** ✅ Az actor-tracking kódszinten kész, unit + build + generate
  géppel zöld; a migráció **teszt-DB → production** sorrendben alkalmazva; az
  integrációs tesztek a biztonságos teszt-DB-n **lefutottak** (fejlesztői futtatás).
- **Bizonyíték:** a fenti kimenetek; commit `4f341d9`; `test-report.md` 5/8;
  `prisma/migrations/20260626120000_actor_naplo_takarmanymozgas/`.
- **Hatókör-korlát (őszinte):** **nincs** teljes audit/verziózás; a művelet
  **szerkesztés/érvénytelenítés előzménye NINCS** implementálva. **Nem** minden
  CRUD-művelet kap actort (a törzsadat-CRUD-ok — halfaj/tó/takarmány létrehozás —
  még nem). Az integráció **domain/Prisma-szintű**; teljes **HTTP/cookie
  endpoint-lefedés (401-útvonal) nem** futott.

---

## Összegzés

| ID | Tárgy | Eredmény |
|---|---|---|
| V-01 | Unit tesztek | ✅ 29/29 |
| V-02 | Typecheck | ✅ exit 0 |
| V-03 | Viselkedés-megőrzés | ✅ |
| V-04 | CI workflow | ✅ (futás-link: TODO) |
| V-05 | Lint known-gap | ✅ nem elrejtve |
| V-06 | Data-model a sémából | ✅ |
| V-07 | API-design a route-okból | ✅ |
| V-08 | Biztonsági hiányok dokumentálva | ✅ |
| V-09 | „Nincs teszt" baseline | ✅ igaz volt |
| V-10 | Nincs DB-függés | ✅ |
| V-11 | Coverage szkript | ✅ (érték: TODO) |
| V-12 | Nincs titok AI-ben | ✅ |
| V-13 | Etetés↔takarmány migráció + build/teszt (2026-06-26) | ✅ unit+build+migráció (integration: tervezett) |
| V-14 | Integrációs infra + biztonságos kihagyás (2026-06-26) | ✅ implementálva, **nem futtatva** (nincs teszt-DB), production-érintés nélkül |
| V-15 | Actor / audit-napló Sprint 1 — kód (2026-06-26) | ✅ kódszinten kész (52 teszt, build zöld); a migráció-alkalmazás/integráció V-16-ban |
| V-16 | Actor Sprint 1 lezárva (2026-06-26) | ✅ migráció **teszt-DB → production** alkalmazva; integrációs tesztek a teszt-DB-n **lefutottak** (fejlesztői futtatás); edit/invalidate audit **hátra** |

A nyitott bizonyítékok (V-04 CI-futás link, V-11 lefedettségi érték, V-13/V-14
integrációs tesztek **valós teszt-DB elleni futtatása**) `TODO`-ként/tervezettként
jelölve; ezek a megfelelő futások után pótolhatók.
