# Szerepkör- és jogosultsági mátrix (Role & Permission Matrix)

Ez a dokumentum a Németh Horgászat — **halgazdálkodási műveleteket támogató MVP** —
hozzáférési modelljét írja le: **ki láthat és módosíthat mit**. A mátrix a
tényleges kódból készült és ahhoz kötött:

- `src/lib/guards.ts` — `requireUser`, `requireHalaszatRole`, `requireToRole`,
  `requireToAccess`
- `src/lib/roles.ts` — rangsorok (`HALASZAT_ROLE_RANK`, `TO_ROLE_RANK`),
  `meetsHalaszatRole`, `meetsToRole`, `canManageTarget`
- `src/app/api/**` — a route handlerek által ténylegesen hívott guardok
- `prisma/schema.prisma` — `HalaszatTagsag` / `ToTagsag`, `HalaszatSzerepkor` / `Szerepkor` enumok

Kapcsolódó: a végpontonkénti minimum-szerepkört a
[`docs/03_design/api-design.md`](../03_design/api-design.md) végpont-összesítő
táblája is felsorolja; a fenyegetés-elemzés a
[`docs/05_security_ops/threat-model.md`](threat-model.md)-ben van.

> **Jelmagyarázat**
> - ✅ engedélyezett / implementált
> - ❌ tiltott
> - ⚠️ részleges / ismert hiányosság
> - 🟡 tervezett / nincs implementálva

---

## 1. Szerepkör-modell

### 1.1 Halászat-szintű (tenant) szerepkörök — **aktívan használt**

A `HalaszatTagsag.szerepkor` (`HalaszatSzerepkor` enum) adja az **elsődleges**
jogosultsági modellt. Minden `/api/halaszatok/[hid]/**` végpont a
`requireHalaszatRole(halaszatId, minRole)` guarddal véd, amely:
1. ellenőrzi a bejelentkezést (`getAuthUser`),
2. ellenőrzi, hogy a felhasználó **aktív tagja**-e az adott halászatnak,
3. ellenőrzi, hogy a szerepköre eléri-e a `minRole` küszöböt (rangsor szerint).

| Szerepkor | Rang (`HALASZAT_ROLE_RANK`) | Leírás |
|---|---|---|
| `OWNER` | 3 | Tulajdonos — teljes hozzáférés a halászaton belül; csak ő módosíthat szerepkört. |
| `ADMIN` | 2 | Adminisztrátor — törzsadat- és művelet-kezelés; korlátozott dolgozó-kezelés (csak STAFF). |
| `STAFF` | 1 | Dolgozó — olvasás és a napi műveletek egy része (etetés, takarmánymozgás, naptár). |

Rangsor: **STAFF (1) < ADMIN (2) < OWNER (3)**. A `minRole` küszöb kumulatív: egy
ADMIN-igényű művelethez az OWNER is jogosult.

### 1.2 Tó-szintű szerepkörök — **definiált, de NEM az elsődleges kikényszerítés**

A `ToTagsag.szerepkor` (`Szerepkor` enum) és a `requireToRole` / `requireToAccess`
guard **létezik** a sémában és a kódban, de **a jelenlegi API route-ok közül egyetlen
sem hívja** `requireToRole`-t (kódszinten ellenőrizve: nincs `requireToRole`/
`requireToAccess` hívás a `src/app/api/**` alatt). A tó-szintű hozzáférést a
gyakorlatban a **halászat-szintű** szerepkör + tenant-ellenőrzés
(`assertToBelongsToTenant`) szabályozza, nem a tó-tagság.

| Szerepkor | Rang (`TO_ROLE_RANK`) | Állapot |
|---|---|---|
| `OWNER` | 5 | Séma + guard definiálva; route-ok nem használják. ⚠️ |
| `ADMIN` | 4 | Séma + guard definiálva; route-ok nem használják. ⚠️ |
| `STAFF` | 3 | Séma + guard definiálva; route-ok nem használják. ⚠️ |
| `OR` | 2 | Séma-szintű enumérték (feltehetően »őr/halőr«); egyetlen route sem használja. ⚠️ |
| `ANGLER` | 1 | Séma + guard definiálva; route-ok nem használják. ⚠️ |

> **Fontos (őszinte állapot):** a tó-szintű RBAC **nincs ténylegesen
> kikényszerítve** az API-n. A `Szerepkor` enum, a `ToTagsag` modell és a
> `requireToRole`/`meetsToRole` logika unit-tesztelt, de a route-réteg a
> halászat-szintű szerepkört használja. Lásd „Ismert jogosultsági hiányosságok"
> és „SZD2 megerősítési terv".

### 1.3 Fiók-szintű (tagság nélküli) hozzáférés

Néhány művelet nem igényel halászat-tagságot, csak bejelentkezést
(`requireUser`):

| Művelet | Végpont | Bejelentkezett felhasználó | Megjegyzés |
|---|---|---|---|
| Új halászat létrehozása | `POST /api/halaszatok` | ✅ | A létrehozó automatikusan **OWNER** lesz (tranzakcióban). |
| Saját halászatok listázása | `GET /api/halaszatok` | ✅ | Csak a felhasználó **aktív** tagságai. |

Bejelentkezés nélkül mindkettő ❌ (`401`).

---

## 2. Jogosultsági mátrix (halászat-szintű szerepkörök)

A cellák a **ténylegesen kikényszerített** minimum-szerepkört tükrözik. A
„Guard / végpont" oszlop a kódbeli bizonyíték.

### 2.1 Általános / tenant

| Művelet | STAFF | ADMIN | OWNER | Guard / végpont |
|---|:--:|:--:|:--:|---|
| Halászat megtekintése | ✅ | ✅ | ✅ | `requireHalaszatRole(STAFF)` · `GET /api/halaszatok/[hid]` |
| Tagok kezelése (listázás + felvétel) | ❌ | ✅ | ✅ | `requireHalaszatRole(ADMIN)` · `GET/POST .../dolgozok` — **ADMIN csak STAFF-ot vehet fel** |
| Tag szerepkörének módosítása | ❌ | ⚠️ | ✅ | `requireHalaszatRole(ADMIN)` · `PATCH .../dolgozok/[tid]` — **szerepkört csak OWNER**; ADMIN csak STAFF cél **nevét** írhatja, szerepkörét nem; önmódosítás tiltott |
| Tag deaktiválása (soft-delete) | ❌ | ✅ | ✅ | `requireHalaszatRole(ADMIN)` · `DELETE .../dolgozok/[tid]` — ADMIN csak STAFF-ot, OWNER STAFF+ADMIN-t; OWNER célt senki; önmaga nem |

> A dolgozó-kezelés cél-szabályait a `canManageTarget(actorRole, targetRole)`
> tiszta függvény kódolja (OWNER célt senki; OWNER STAFF+ADMIN-t; ADMIN csak
> STAFF-ot), és unit-tesztelt.

### 2.2 Tavak és halállomány

| Művelet | STAFF | ADMIN | OWNER | Guard / végpont |
|---|:--:|:--:|:--:|---|
| Tavak listázása | ✅ | ✅ | ✅ | `requireHalaszatRole(STAFF)` · `GET .../toak` |
| Tó létrehozása | ❌ | ✅ | ✅ | `requireHalaszatRole(ADMIN)` · `POST .../toak` |
| Tó részleteinek megtekintése | ✅ | ✅ | ✅ | `requireHalaszatRole(STAFF)` + `assertToBelongsToTenant` · `GET .../toak/[toId]` |
| Halfaj létrehozása | ❌ | ✅ | ✅ | `requireHalaszatRole(ADMIN)` · `POST .../halfajok` |
| Halfaj szerkesztése / archiválása | ❌ | ✅ | ✅ | `requireHalaszatRole(ADMIN)` · `PATCH .../halfajok/[id]` |
| Halfaj törlése | ❌ | ✅ | ✅ | `requireHalaszatRole(ADMIN)` · `DELETE .../halfajok/[id]` — FK-kötés esetén `409` + inaktiválás-javaslat |
| Telepítés rögzítése | ❌ | ✅ | ✅ | `requireHalaszatRole(ADMIN)` · `POST .../toak/[toId]/telepites` |
| Kivét rögzítése | ❌ | ✅ | ✅ | `requireHalaszatRole(ADMIN)` · `POST .../toak/[toId]/kivetel` |
| Áttelepítés rögzítése | ❌ | ✅ | ✅ | `requireHalaszatRole(ADMIN)` + tenant-check **mindkét** tóra · `POST .../toak/[toId]/attelepites` |
| Etetés rögzítése | ✅ | ✅ | ✅ | `requireHalaszatRole(STAFF)` · `POST .../toak/[toId]/etetes` |
| Etetés takarmány-levonással | ✅ | ✅ | ✅ | `requireHalaszatRole(STAFF)` · `POST .../toak/[toId]/etetes` `takarmanyId`-vel — **azonos szerepkör** (STAFF); a takarmány ugyanahhoz a halászathoz kell tartozzon, és a készlet ≥ `mennyisegKg` (`422`, ha nincs elég) |

### 2.3 Takarmánykészlet (feed inventory)

| Művelet | STAFF | ADMIN | OWNER | Guard / végpont |
|---|:--:|:--:|:--:|---|
| Takarmányok listázása | ✅ | ✅ | ✅ | `requireHalaszatRole(STAFF)` · `GET .../takarmanyok` |
| Takarmány létrehozása | ❌ | ✅ | ✅ | `requireHalaszatRole(ADMIN)` · `POST .../takarmanyok` |
| Takarmány szerkesztése / archiválása | ❌ | ✅ | ✅ | `requireHalaszatRole(ADMIN)` · `PATCH .../takarmanyok/[id]` |
| Takarmány törlése | ❌ | ✅ | ✅ | `requireHalaszatRole(ADMIN)` · `DELETE .../takarmanyok/[id]` — FK-kötés esetén `409` + inaktiválás-javaslat |
| Takarmány-bevétel rögzítése | ✅ | ✅ | ✅ | `requireHalaszatRole(STAFF)` · `POST .../takarmanyok/[id]/mozgasok` (`tipus: BEVETEL`) |
| Takarmány-felhasználás rögzítése | ✅ | ✅ | ✅ | `requireHalaszatRole(STAFF)` · `POST .../takarmanyok/[id]/mozgasok` (`tipus: FELHASZNALVA`) |
| Takarmánymozgás-előzmény megtekintése | ✅ | ✅ | ✅ | `requireHalaszatRole(STAFF)` · `GET .../takarmanyok/[id]/mozgasok` |

### 2.4 Műveletek és riportok (döntéstámogatás)

| Művelet | STAFF | ADMIN | OWNER | Guard / végpont |
|---|:--:|:--:|:--:|---|
| Tó művelet-idővonal megtekintése | ✅ | ✅ | ✅ | `requireHalaszatRole(STAFF)` · `GET .../toak/[toId]/timeline` |
| Tó-összefoglaló megtekintése | ✅ | ✅ | ✅ | `requireHalaszatRole(STAFF)` · `GET .../toak/[toId]/summary` |
| Halászat-szintű dashboard / összesítő | ✅ | ✅ | ✅ | `requireHalaszatRole(STAFF)` · `GET .../osszesito` |
| Naptár megtekintése | ✅ | ✅ | ✅ | `requireHalaszatRole(STAFF)` · `GET .../naptar` |
| Naptárbejegyzés létrehozása / szerkesztése / törlése | ✅ | ✅ | ✅ | `requireHalaszatRole(STAFF)` · `POST/PATCH/DELETE .../naptar[/id]` |

> **Actor / nyomon követhetőség (Sprint 1, 2026-06-26).** A műveleti írások
> (telepítés/kivét/etetés/áttelepítés) és a takarmánymozgások mostantól rögzítik a
> **cselekvő `felhasznaloId`-ját a sessionből** (nem a kérés törzséből). A
> megtekintő végpontok az actort `rogzitoNev`-ként adják vissza: a **tó-idővonal**
> (`GET .../timeline`) és a **takarmánymozgás-előzmény** (`GET
> .../takarmanyok/[id]/mozgasok`) — bármely tag (STAFF+) látja, „ki rögzítette".
> A megjelenítés **olvasás**; magát az actort a szerver írja, a kliens nem
> állíthatja be. Még **nincs** művelet-szerkesztés/érvénytelenítés audit + verziózás.

### 2.5 Hibabejelentések (bug reports) — ✅ **auth + RBAC kikényszerítve**

A hibabejelentés-végpontok mostantól **bejelentkezést követelnek**, és a
szerző/tenant a **sessionből** származik (nem a kérés törzséből). A korábbi
„nincs guard" hiányosság lezárva.

| Művelet | STAFF | ADMIN | OWNER | Bejelentő | Guard / végpont |
|---|:--:|:--:|:--:|:--:|---|
| Hibabejelentés létrehozása | ✅ | ✅ | ✅ | ✅ | `requireUser` · `POST /api/hibabejelentesek` — a `felhasznaloId` a **sessionből**; ha `halaszatId` meg van adva, `requireHalaszatRole(STAFF)` kell rá; ha nincs, globális bejelentés `halaszatId: null` |
| Hibabejelentések listázása | ✅ | ✅ | ✅ | — | `requireHalaszatRole(STAFF)` · `GET /api/halaszatok/[hid]/hibabejelentesek` — csak az adott halászat bejelentései |
| Hibabejelentés lezárása / státusz-frissítése | ❌ | ✅ | ✅ | ⚠️ | `requireUser` + `requireHalaszatRole(ADMIN)` a bejelentés **saját** halászatára · `PATCH /api/hibabejelentesek/[id]` — globális (`halaszatId: null`) bejelentést **csak az eredeti bejelentő** módosíthat |

> A státusz-módosítás döntését a `canUpdateHibabejelentesStatus(...)` tiszta
> függvény kódolja (`src/lib/roles.ts`), és unit-tesztelt: halászathoz kötött
> bejelentésnél ADMIN/OWNER a saját halászatban (tenant-átlépés kizárva),
> globális bejelentésnél csak a bejelentő. A „Bejelentő" oszlop ⚠️-je azt jelzi,
> hogy a bejelentő önmagában **csak globális** bejelentést módosíthat; halászathoz
> kötöttnél a szerepkör dönt.

### 2.6 Jövőbeli / tervezett képességek

| Művelet | Állapot | Megjegyzés |
|---|:--:|---|
| Halkeltetési modul | 🟡 | Csak placeholder oldal; SZD2-re tervezett. |
| Szabály-alapú döntéstámogatás | 🟡 | Bővített, szabály-alapú javaslatok; nincs implementálva. |
| Etetés → takarmánykészlet automatikus levonása | ✅ | **Megvalósítva:** etetéskor (`takarmanyId` megadva) `FELHASZNALVA` mozgás + készletcsökkentés egy tranzakcióban; az `Etetes` és a `TakarmanyMozgas` FK-val kötött (`etetesId`/`toId`). `takarmanyId` nélkül a kézi mozgás marad. |

---

## 3. Tó-szintű hozzáférés a gyakorlatban

Mivel a route-ok nem hívják a `requireToRole`-t, a „tó-szintű" hozzáférés
ténylegesen így működik:

- **Tenant-tagság:** a felhasználónak aktív `HalaszatTagsag`-gal kell rendelkeznie
  az adott halászatban (`requireHalaszatRole`).
- **Tenant-izoláció:** a tó-hatókörű végpontok `assertToBelongsToTenant(toId,
  halaszatId)`-szal biztosítják, hogy a `[toId]` valóban a `[hid]` halászathoz
  tartozik; ha nem → `404`. Így egy halászat tagja nem éri el másik halászat tavát.
- **Nincs** tavankénti, felhasználónkénti finomhangolt jogosultság (pl. „X user
  csak az 1-es tóhoz fér"). Ez a `ToTagsag` modellben lehetséges lenne, de a
  route-réteg nem alkalmazza.

---

## 4. Ismert jogosultsági hiányosságok (Known authorization gaps)

> **Lezárva (2026-06-26):** az 1–3. pont megoldva a hibabejelentés-végpontok
> jogosultságolásával (lásd §2.5). A korábbi (sebezhető) állapot leírása alább
> áthúzva, a megoldás dőlten.

1. ~~**A hibabejelentés-végpontok nem rendelkeznek auth/RBAC védelemmel.**~~
   *Megoldva:* a `GET .../hibabejelentesek` `requireHalaszatRole(STAFF)`-ot, a
   `POST /api/hibabejelentesek` `requireUser`-t, a `PATCH .../[id]` `requireUser`
   + (halászathoz kötött bejelentésnél) `requireHalaszatRole(ADMIN)`-t hív.
2. ~~**`POST /api/hibabejelentesek` megbízik a kérés törzsében.**~~
   *Megoldva:* a `felhasznaloId` a **sessionből** származik; a body `felhasznaloId`
   mezőjét a handler figyelmen kívül hagyja. Ha `halaszatId` meg van adva, STAFF
   tagság szükséges hozzá; egyébként globális bejelentés `halaszatId: null`.
3. ~~**`PATCH /api/hibabejelentesek/[id]` szerepkör-ellenőrzés nélkül módosít
   státuszt.**~~ *Megoldva:* a handler előbb betölti a bejelentést (`404`, ha
   nincs), majd a bejelentés **saját** halászatában követel ADMIN/OWNER-t
   (tenant-átlépés kizárva); globális bejelentésnél csak az eredeti bejelentő
   módosíthat. A döntés a unit-tesztelt `canUpdateHibabejelentesStatus`-ban.
4. **A tó-szintű `ToTagsag` létezik, de nem az elsődleges kikényszerítési modell.**
   A `Szerepkor` enum (OWNER/ADMIN/STAFF/OR/ANGLER), a `ToTagsag` tábla és a
   `requireToRole`/`meetsToRole` logika a kódban van, de **egyetlen API route sem
   használja**. A jogosultság a gyakorlatban halászat-szintű. Ez nem közvetlen
   sebezhetőség, de **félreérthető kettős modell** — tisztázandó (lásd SZD2).

> Kapcsolódó STRIDE-kockázatok és reziduális kockázat: lásd
> [`threat-model.md`](threat-model.md) 5–7. szakasz (E — Elevation of Privilege,
> T — Tampering, I — Information Disclosure).

---

## 5. SZD2 megerősítési terv (Hardening plan)

1. ~~**A hibabejelentés-végpontok biztonságossá tétele.**~~ ✅ **Kész**
   (2026-06-26): listázás `requireHalaszatRole(STAFF)` + tenant-szűrés;
   létrehozás `requireUser` + sessionből származó `felhasznaloId` (és STAFF
   tagság, ha `halaszatId` adott); státuszváltás `requireUser` + a bejelentés
   saját halászatára `requireHalaszatRole(ADMIN)`, nem létező `id` → `404`,
   globálisnál csak a bejelentő. Unit-teszt: `canUpdateHibabejelentesStatus`.
2. **Döntés a tó-szintű RBAC sorsáról.** El kell dönteni, hogy a `ToTagsag` /
   `Szerepkor` (tó-szintű, 5 fokozatú) modell **marad** (és akkor a route-ok
   ténylegesen kikényszerítik, finomhangolt tavankénti hozzáféréssel), vagy
   **eltávolítandó** a félreértés elkerülésére. A döntést a `schema.prisma` és az
   `api-design.md` is kövesse.
3. **Integration tesztek a jogosulatlan és tenant-átlépő hozzáférésre.**
   - Negatív RBAC: bejelentkezés nélkül `401`; STAFF az ADMIN-only végpontokon
     `403` (I-07).
   - Tenant-izoláció: idegen `[hid]` → `403`, idegen `[toId]` egy adott `[hid]`
     alatt → `404` (I-08).
   - A hibabejelentés-végpontokra a **javított** (auth-os) viselkedést elváró
     teszt.
4. **AC5 / AC7 elmozdítása PARTIAL → PASS felé bizonyítékkal.** A
   [`docs/06_release/acceptance-report.md`](../06_release/acceptance-report.md)
   AC5 (jogosultsági rendszer megakadályozza az illetéktelen hozzáférést) és AC7
   (tenant-izoláció) kritériumai jelenleg **PARTIAL**; a fenti integration tesztek
   zöld eredménye után, a bizonyíték hivatkozásával átállíthatók **PASS**-ra.

> Bizonyítékot kitalálni tilos: amíg a teszt nincs meg és nem zöld, az érintett
> AC marad `PARTIAL`/`⚠️`.
