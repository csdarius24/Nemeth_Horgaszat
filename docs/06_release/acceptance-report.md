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
| AC4 | Telepítés/kivét után az állomány automatikusan frissül | PARTIAL | Kód-szintű review | `telepites`/`kivetel`/`attelepites` `prisma.$transaction`-ben frissíti a `HalAllomany`-t; kivétnél készlet-ellenőrzés. | Integration teszt (I-05, I-06): állomány-delta + edge case-ek. |
| AC5 | A jogosultsági rendszer megakadályozza az illetéktelen hozzáférést | PARTIAL | Unit teszt + kód-szintű review | RBAC: `requireHalaszatRole` + rangsor; **unit-tesztelt** `meetsToRole`/`meetsHalaszatRole`/`canManageTarget` + **új** `canUpdateHibabejelentesStatus` (15 teszt). A korábbi `hibabejelentesek` auth-rés **rendezve** (auth + RBAC kikényszerítve). | Végpont-szintű negatív integration teszt (I-07: 401/403), beleértve a hibabejelentés-végpontokat. |
| AC6 | Az események naplózásra kerülnek | PARTIAL | Kód-szintű review | Minden művelet `NaploEsemeny`-t ír (telepítés/kivét/etetés/áttelepítés); `timeline`/`summary` visszaolvassa. | Integration teszt: napló-bejegyzés keletkezésének igazolása. **Caveat:** a napló nem rögzíti a cselekvő `felhasznaloId`-t (`threat-model.md` STRIDE-R). |
| AC7 | Több halászat adatai egymástól elkülönítve tárolódnak | PARTIAL | Kód-szintű review | Tenant-izoláció: `requireHalaszatRole` + `assertToBelongsToTenant` (idegen tó → 404). A `hibabejelentesek` végpontok izolációja **rendezve**: a listázás tenant-szűrt, a státuszváltás a bejelentés saját halászatára kötött (tenant-átlépés kizárva). | Integration teszt (I-08): idegen `[hid]`/`[toId]` → 403/404. |

## Megjegyzések a bizonyíték jellegéről

- **Automatizált bizonyíték** jelenleg a unit rétegben áll rendelkezésre (29
  teszt, mind zöld), amely az AC5 jogosultsági logikáját részben fedi
  (`roles.ts`). A többi kritérium bizonyítéka **kód-szintű** (a forrás
  átolvasása), nem automatizált végpont-teszt.
- **Nincs dokumentált, megismételhető manuális tesztkör** sem rögzítve; ennek
  hiányában a kritériumok nem kapnak `PASS`-t. Egy strukturált manuális
  átfutás (a `ux-flows.md` szerint) átmeneti bizonyítékként rögzíthető — **TODO.**

## Readiness — kiadási készültség értékelése

### Jelenlegi készültség
A rendszer **funkcionálisan készen áll** az MVP-célokra, és **dokumentációs +
unit-teszt + CI alapja erős**. A kiadás azonban **még nem teljes körűen
verifikált**: az elfogadási kritériumok automatizált, végpont-szintű igazolása
hiányzik. Állapot: **„demonstrálható MVP, verifikáció részleges".**

### Blokkoló hiányok (beadás előtt rendezendő)
1. ~~**`hibabejelentesek` végpontok authorizációja**~~ — **megoldva (2026-06-26):**
   auth + RBAC kikényszerítve mindhárom végponton; a `felhasznaloId` sessionből,
   a státuszváltás a bejelentés saját halászatára kötött. Unit-teszt:
   `canUpdateHibabejelentesStatus`. (Részletek: `docs/05_security_ops/role-matrix.md` §2.5.)
2. **Integration tesztek hiánya** az AC1–AC7-re — a kritériumok automatizált,
   végpont-szintű igazolása nélkül a `PASS` nem adható meg (az AC5/AC7 ezért marad
   `PARTIAL`, az auth-rés kódszintű rendezése ellenére).
3. **Lint-adósság** — projektszintű lint piros; legalább CI-stratégia (változott
   fájlokra futó lint), hosszabb távon a hibák felszámolása.

### Ajánlott következő lépések a végleges beadás előtt
1. ~~A `hibabejelentesek` végpontok jogosultságolása (session-alapú szerző/tenant).~~
   ✅ **Kész (2026-06-26).**
2. Integration tesztek bevezetése teszt-adatbázissal (I-01…I-08, ezen belül a
   hibabejelentés-végpontok 401/403/404 esetei), és az AC-k átállítása `PASS`-ra a
   zöld eredmények alapján.
3. Legalább egy Playwright e2e a fő folyamatra (E-01) + a két negatív esetre.
4. `npm run test:coverage` futtatása, a lefedettségi érték rögzítése a
   `test-report.md`-ben.
5. `GET /api/health` health-check végpont hozzáadása.
6. A CI első zöld futásának linkje/screenshotja a `verification-log.md` V-04-hez.
7. `v1.0` git tag létrehozása a végleges állapotra.

> A fenti lépések elvégzése után az elfogadási tábla felülvizsgálandó, és a
> teljesült kritériumok `PARTIAL` → `PASS` átállítandók a tényleges bizonyíték
> hivatkozásával. Bizonyítékot kitalálni tilos; ami nincs, az `TODO` marad.
