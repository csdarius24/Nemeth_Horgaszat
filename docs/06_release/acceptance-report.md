# Acceptance Report — v1.0

Ez a dokumentum a `docs/01_product/scope-contract.md` 7 elfogadási kritériumát
(AC1–AC7) értékeli a v1.0 szakdolgozati kiadásnál. Az értékelés **őszinte**: a
funkciók kódszinten megvalósultak, de a végpont-szintű automatizált
(integration/e2e) lefedettség még hiányzik, ezért a kritériumok többsége
**PARTIAL** — implementálva, de még nem teljesen tesztlefedett.

**Státusz jelölés:** `PASS` = implementálva ÉS automatizált teszttel igazolt ·
`PARTIAL` = implementálva, kód-szintű/manuális bizonyítékkal, de automatizált
végpont-teszt nélkül · `TODO` = nincs még megvalósítva.

## Elfogadási kritériumok

| # | Kritérium | Státusz | Ellenőrzés módja | Bizonyíték | Hátralévő hiány |
|---|---|---|---|---|---|
| AC1 | Felhasználó létre tud hozni halászatot | PARTIAL | Kód-szintű review | `POST /api/halaszatok` halászatot + OWNER tagságot hoz létre tranzakcióban; `api-design.md`. A `slugify` unit-tesztelt. | Integration teszt (I-02): register→create→OWNER tagság. |
| AC2 | A halászathoz tavak rendelhetők | PARTIAL | Kód-szintű review | `POST/GET /api/halaszatok/[hid]/toak` (ADMIN létrehoz, STAFF listáz), `TO`/`TELELO` típus. | Integration teszt (I-03). |
| AC3 | A tavakhoz halfajok kezelhetők | PARTIAL | Kód-szintű review | `halfajok` CRUD: egyedi név (P2002→409), FK-védett törlés (P2003→409). | Integration teszt (I-04). |
| AC4 | Telepítés/kivét után az állomány automatikusan frissül | PARTIAL | Kód-szintű review | `telepites`/`kivetel`/`attelepites` `prisma.$transaction`-ben frissíti a `HalAllomany`-t; kivétnél készlet-ellenőrzés. | Integration teszt (I-05, I-06): állomány-delta + edge case-ek. |
| AC5 | A jogosultsági rendszer megakadályozza az illetéktelen hozzáférést | PARTIAL | Unit teszt + kód-szintű review | RBAC: `requireHalaszatRole` + rangsor; **unit-tesztelt** `meetsToRole`/`meetsHalaszatRole`/`canManageTarget` (10 teszt). | Végpont-szintű negatív integration teszt (I-07: 401/403). **Caveat:** a `hibabejelentesek` végpontok jelenleg auth nélkül futnak — rendezendő (lásd lent). |
| AC6 | Az események naplózásra kerülnek | PARTIAL | Kód-szintű review | Minden művelet `NaploEsemeny`-t ír (telepítés/kivét/etetés/áttelepítés); `timeline`/`summary` visszaolvassa. | Integration teszt: napló-bejegyzés keletkezésének igazolása. **Caveat:** a napló nem rögzíti a cselekvő `felhasznaloId`-t (`threat-model.md` STRIDE-R). |
| AC7 | Több halászat adatai egymástól elkülönítve tárolódnak | PARTIAL | Kód-szintű review | Tenant-izoláció: `requireHalaszatRole` + `assertToBelongsToTenant` (idegen tó → 404). | Integration teszt (I-08): idegen `[hid]`/`[toId]` → 403/404. **Caveat:** a `hibabejelentesek` végpontok izolációja hiányos. |

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
1. **`hibabejelentesek` végpontok authorizációja** — auth/RBAC guard nélkül
   futnak; tenant-izolációs és jogosultsági rés (AC5, AC7 caveat). *Biztonsági
   blokkoló.*
2. **Integration tesztek hiánya** az AC1–AC7-re — a kritériumok automatizált
   igazolása nélkül a `PASS` nem adható meg.
3. **Lint-adósság** — projektszintű lint piros; legalább CI-stratégia (változott
   fájlokra futó lint), hosszabb távon a hibák felszámolása.

### Ajánlott következő lépések a végleges beadás előtt
1. A `hibabejelentesek` végpontok jogosultságolása (session-alapú szerző/tenant).
2. Integration tesztek bevezetése teszt-adatbázissal (I-01…I-08), és az AC-k
   átállítása `PASS`-ra a zöld eredmények alapján.
3. Legalább egy Playwright e2e a fő folyamatra (E-01) + a két negatív esetre.
4. `npm run test:coverage` futtatása, a lefedettségi érték rögzítése a
   `test-report.md`-ben.
5. `GET /api/health` health-check végpont hozzáadása.
6. A CI első zöld futásának linkje/screenshotja a `verification-log.md` V-04-hez.
7. `v1.0` git tag létrehozása a végleges állapotra.

> A fenti lépések elvégzése után az elfogadási tábla felülvizsgálandó, és a
> teljesült kritériumok `PARTIAL` → `PASS` átállítandók a tényleges bizonyíték
> hivatkozásával. Bizonyítékot kitalálni tilos; ami nincs, az `TODO` marad.
