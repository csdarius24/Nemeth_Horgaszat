# Acceptance Report — v1.0

Ez a dokumentum a `docs/01_product/scope-contract.md` 7 elfogadási kritériumát
(AC1–AC7) értékeli a v1.0 szakdolgozati kiadásnál. Az értékelés **őszinte**: a
funkciók kódszinten megvalósultak, de a végpont-szintű automatizált
(integration/e2e) lefedettség még hiányzik, ezért a kritériumok többsége
**PARTIAL** — implementálva, de még nem teljesen tesztlefedett.

**Státusz jelölés:** `PASS` = implementálva ÉS automatizált teszttel igazolt ·
`PARTIAL` = implementálva, kód-szintű/manuális bizonyítékkal, de automatizált
végpont-teszt nélkül · `TODO` = nincs még megvalósítva.

> **Megjegyzés a tézis-irányról (témavezetői reframing).** A projekt a
> témavezetői visszajelzés nyomán **halgazdálkodási műveleteket támogató MVP**-ként
> pozícionált (munkacím: „Halgazdálkodási műveleteket támogató webalkalmazás
> fejlesztése többtavas horgászatok számára"). Az alábbi AC1–AC7 a
> `scope-contract.md` eredeti elfogadási kritériumait értékeli. Az időközben
> megvalósított **takarmánykészlet (feed inventory)** modul a reframed scope
> része, de önálló AC nem tartozik hozzá; verifikációja az `I-09` integration
> teszttel **tervezett** (lásd `docs/04_quality/test-report.md`). Az
> **etetés↔takarmány automatikus összekötése** időközben **megvalósult**: a
> `POST .../toak/[toId]/etetes` `takarmanyId` megadásakor egy tranzakcióban
> létrehozza az `Etetes`-t, egy `FELHASZNALVA` `TakarmanyMozgas`-t, csökkenti a
> `Takarmany.keszlet`-et és naplóz; `takarmanyId` nélkül a viselkedés
> változatlan (visszafelé kompatibilis). A levonási alap­logika unit-tesztelt
> (`szamitTakarmanyFelhasznalas`); az endpoint-szintű (tranzakciós/atomicitási)
> integration teszt **tervezett**. A **halkeltetési modul** továbbra is
> **tervezett** (SZD2), nem része ennek a kiadásnak.

## Elfogadási kritériumok

| # | Kritérium | Státusz | Ellenőrzés módja | Bizonyíték | Hátralévő hiány |
|---|---|---|---|---|---|
| AC1 | Felhasználó létre tud hozni halászatot | PARTIAL | Kód-szintű review | `POST /api/halaszatok` halászatot + OWNER tagságot hoz létre tranzakcióban; `api-design.md`. A `slugify` unit-tesztelt. | Integration teszt (I-02): register→create→OWNER tagság. |
| AC2 | A halászathoz tavak rendelhetők | PARTIAL | Kód-szintű review | `POST/GET /api/halaszatok/[hid]/toak` (ADMIN létrehoz, STAFF listáz), `TO`/`TELELO` típus. | Integration teszt (I-03). |
| AC3 | A tavakhoz halfajok kezelhetők | PARTIAL | Kód-szintű review | `halfajok` CRUD: egyedi név (P2002→409), FK-védett törlés (P2003→409). | Integration teszt (I-04). |
| AC4 | Telepítés/kivét után az állomány automatikusan frissül | PARTIAL | Unit teszt + kód-szintű review | `telepites`/`kivetel`/`attelepites` `prisma.$transaction`-ben frissíti a `HalAllomany`-t; kivétnél készlet-ellenőrzés. **Bővült:** az etetés (`takarmanyId`-vel) most egy tranzakcióban vonja le a **takarmánykészletet** is (`Etetes`+`TakarmanyMozgas(FELHASZNALVA)`+`Takarmany.keszlet`); a levonási logika **unit-tesztelt** (`szamitTakarmanyFelhasznalas`, 8 teszt), és az engedélyező **production migráció alkalmazva** (`20260626100000_link_etetes_takarmany`, lásd `verification-log.md` V-13). | Integration teszt (I-05, I-06, I-10): állomány-/készlet-delta + edge case-ek (idegen takarmány → 404, nincs elég készlet → 422, atomicitás). |
| AC5 | A jogosultsági rendszer megakadályozza az illetéktelen hozzáférést | PARTIAL | Unit teszt + kód-szintű review | RBAC: `requireHalaszatRole` + rangsor; **unit-tesztelt** `meetsToRole`/`meetsHalaszatRole`/`canManageTarget` + **új** `canUpdateHibabejelentesStatus` (15 teszt). A korábbi `hibabejelentesek` auth-rés **rendezve** (auth + RBAC kikényszerítve). | Végpont-szintű negatív integration teszt (I-07: 401/403), beleértve a hibabejelentés-végpontokat. |
| AC6 | Az események naplózásra kerülnek | PARTIAL | Unit teszt + kód-szintű review | Minden művelet `NaploEsemeny`-t ír (telepítés/kivét/etetés/áttelepítés); `timeline`/`summary` visszaolvassa. **Bővült (Sprint 1):** a napló és a `TakarmanyMozgas` mostantól rögzíti a **cselekvő `felhasznaloId`-ját a sessionből**; a `timeline` és a takarmánymozgás-előzmény `rogzitoNev`-et ad vissza (ki rögzítette). A megjelenítő helper unit-tesztelt (`rogzitoMegjelenites`). | Integration teszt: napló + actor keletkezésének **végrehajtott** igazolása (a teszt megírva, de teszt-DB hiányában **nem futott**). **Caveat:** művelet-szerkesztés/érvénytelenítés **audit + verziózás** még nincs → teljes audit-előzmény `PARTIAL`. |
| AC7 | Több halászat adatai egymástól elkülönítve tárolódnak | PARTIAL | Kód-szintű review | Tenant-izoláció: `requireHalaszatRole` + `assertToBelongsToTenant` (idegen tó → 404). A `hibabejelentesek` végpontok izolációja **rendezve**: a listázás tenant-szűrt, a státuszváltás a bejelentés saját halászatára kötött (tenant-átlépés kizárva). | Integration teszt (I-08): idegen `[hid]`/`[toId]` → 403/404. |

## Megjegyzések a bizonyíték jellegéről

- **Automatizált bizonyíték** jelenleg a unit rétegben áll rendelkezésre (**46
  teszt, 6 fájl**, mind zöld — 2026-06-26), amely az AC5 jogosultsági logikáját
  (`roles.ts`, beleértve a `canUpdateHibabejelentesStatus`-t), az AC4
  takarmány-készletlevonási logikáját (`szamitTakarmanyFelhasznalas`) és a
  teszt-biztonsági production-guardot (`ellenorizNemProduction`) részben fedi. A
  többi kritérium és az **endpoint-szintű** viselkedés bizonyítéka **kód-szintű**
  (a forrás átolvasása) + a production migráció/build tényleges futása, **nem**
  automatizált végpont-teszt — az integration/e2e réteg tervezett.
- **Integrációs (DB-backed) workflow tesztek: megírva, de NEM futtatva.** Az első
  DB-backed workflow-tesztek elkészültek (takarmány-etetés workflow + jogosultság,
  `tests/integration/**`), de **dedikált teszt-adatbázis hiányában nem futottak le**
  (biztonságos skip, production-érintés nélkül — lásd `verification-log.md` V-14 és
  `test-report.md` 8.). **Ezért egyetlen AC sem kap emiatt `PASS`-t**: a tényleges,
  teszt-DB elleni zöld futtatás a feltétele az AC4/AC5/AC6/AC7 `PARTIAL → PASS`
  átállításának. Bizonyítékot kitalálni tilos.
- **Nincs dokumentált, megismételhető manuális tesztkör** sem rögzítve; ennek
  hiányában a kritériumok nem kapnak `PASS`-t. Egy strukturált manuális
  átfutás (a `ux-flows.md` szerint) átmeneti bizonyítékként rögzíthető — **TODO.**

## Readiness — kiadási készültség értékelése

### Jelenlegi készültség
A rendszer **funkcionálisan készen áll** az MVP-célokra, és **dokumentációs +
unit-teszt + CI alapja erős**. A legutóbbi (2026-06-26) tényleges bizonyíték: a
production DB-migráció (`20260626100000_link_etetes_takarmany`) **alkalmazva**, a
**42/42 unit teszt zöld**, a `tsc --noEmit` **exit 0**, és a `npm run build`
**sikeres** (lásd `verification-log.md` V-13 és `test-report.md` 5.). A kiadás
azonban **még nem teljes körűen verifikált**: az elfogadási kritériumok
automatizált, **végpont-szintű** igazolása (integration/e2e) hiányzik. Állapot:
**„demonstrálható MVP, verifikáció részleges".**

> **Versenyhelyzet (őszinte korlát):** a takarmány-készletlevonás egy
> tranzakcióban történik, de **nincs** sor-szintű zár / optimista verziózás, így
> párhuzamos etetések elméletileg túllevonhatnak (MySQL alapértelmezett
> izolációval). MVP-szinten elfogadott, SZD2-ben kezelendő.

### Blokkoló hiányok (beadás előtt rendezendő)
1. ~~**`hibabejelentesek` végpontok authorizációja**~~ — **megoldva (2026-06-26):**
   auth + RBAC kikényszerítve mindhárom végponton; a `felhasznaloId` sessionből,
   a státuszváltás a bejelentés saját halászatára kötött. Unit-teszt:
   `canUpdateHibabejelentesStatus`. (Részletek: `docs/05_security_ops/role-matrix.md` §2.5.)
2. **Integration tesztek futtatása** az AC1–AC7-re. *Részben előrehaladva
   (2026-06-26):* az első DB-backed workflow-tesztek **megírva** (takarmány-etetés
   + jogosultság), de **dedikált teszt-DB hiányában még nem futtatva** (biztonságos
   skip). A kritériumok automatizált, végpont-szintű **zöld futtatása** nélkül a
   `PASS` továbbra sem adható meg → AC4/AC5/AC6/AC7 marad `PARTIAL`. Hátralévő: egy
   izolált teszt-DB beállítása + `npm run test:integration` zöld futás, majd az
   eredmény rögzítése.
3. **Lint-adósság** — projektszintű lint piros; legalább CI-stratégia (változott
   fájlokra futó lint), hosszabb távon a hibák felszámolása.

### Ajánlott következő lépések a végleges beadás előtt
1. ~~A `hibabejelentesek` végpontok jogosultságolása (session-alapú szerző/tenant).~~
   ✅ **Kész (2026-06-26).**
2. Integration tesztek **futtatása** teszt-adatbázissal. *Az infrastruktúra és az
   első workflow-tesztek (takarmány-etetés + jogosultság) már megvannak
   (`tests/integration/**`, production-guarddal);* hátra van egy izolált teszt-DB
   beállítása + `npm run test:integration` zöld futás, majd a hiányzó esetek
   (I-01…I-08, hibabejelentés 401/403/404) kiegészítése és az AC-k átállítása
   `PASS`-ra a zöld eredmények alapján.
3. Legalább egy Playwright e2e a fő folyamatra (E-01) + a két negatív esetre.
4. `npm run test:coverage` futtatása, a lefedettségi érték rögzítése a
   `test-report.md`-ben.
5. `GET /api/health` health-check végpont hozzáadása.
6. A CI első zöld futásának linkje/screenshotja a `verification-log.md` V-04-hez.
7. `v1.0` git tag létrehozása a végleges állapotra.

> A fenti lépések elvégzése után az elfogadási tábla felülvizsgálandó, és a
> teljesült kritériumok `PARTIAL` → `PASS` átállítandók a tényleges bizonyíték
> hivatkozásával. Bizonyítékot kitalálni tilos; ami nincs, az `TODO` marad.
