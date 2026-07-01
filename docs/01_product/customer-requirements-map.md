# Ügyfél-igény térkép (Customer Requirements Map)

## Mi ez a dokumentum?

Ez egy **ügyfél-igény leképező (mapping) dokumentum**, **nem** megvalósítási ígéret
és nem ütemterv-kötelezettség. Célja, hogy az ügyfél nagy funkciólistáját őszintén
összevesse a **jelenlegi kódbázis tényleges állapotával**, és a szakdolgozati
irányhoz (**„Halgazdálkodási műveleteket támogató webalkalmazás fejlesztése
többtavas horgászatok számára"**) illesztve kategorizálja: mi kész, mi részleges,
mi tervezett, mi jövőbeli, és mi az, amit a thesis MVP-ben **nem** ajánlott
megvalósítani.

A témavezetői irány: **ne csak menüpontokat adjunk hozzá**, hanem egy tiszta
halgazdálkodási művelet-MVP épüljön a következő pillérek köré: **halállomány,
műveleti napló, takarmánykészlet, RBAC, dashboard, validáció, nyomon
követhetőség**. Ez a térkép ezt a fókuszt szolgálja.

Kapcsolódó: [`scope-contract.md`](scope-contract.md), [`capability-map.md`](capability-map.md),
[`vision.md`](vision.md), [`../03_design/data-model.md`](../03_design/data-model.md),
[`../03_design/api-design.md`](../03_design/api-design.md),
[`../05_security_ops/role-matrix.md`](../05_security_ops/role-matrix.md).

## Státusz-jelmagyarázat

| Jel | Jelentés |
|---|---|
| ✅ | Implementálva (a kódban működik) |
| ⚠️ | Részben implementálva |
| 🟡 | Tervezett — SZD2 MVP |
| 🔵 | Jövőbeli munka (thesis MVP-n túl) |
| ❌ | Nem ajánlott / a thesis MVP-n kívül |

> **Őszinteségi elv.** Ami a kódban nincs, azt nem jelöljük késznek. Külön kiemelve:
> a **termék-AI, NDVI/műhold, halkeltetés (csak placeholder)**. **Actor / nyomon
> követhetőség (Sprint 1, 2026-06-26):** a `NaploEsemeny` és a `TakarmanyMozgas`
> mostantól **tárolja a cselekvő `felhasznaloId`-ját** (sessionből), a
> read-végpontok `rogzitoNev`-et adnak → az actor-igények **🟡 → ⚠️ részben
> implementálva**. A migráció (`20260626120000_actor_naplo_takarmanymozgas`)
> **teszt-DB → production** sorrendben **alkalmazva**, és a DB-backed integrációs
> tesztek a biztonságos teszt-DB-n **lefutottak** (lásd `../07_ai/verification-log.md`
> V-16). A **teljes audit-előzmény (szerkesztés/érvénytelenítés/verziózás)
> továbbra is tervezett**, nem minden CRUD kap actort, és a teljes **HTTP/cookie
> endpoint-szintű** teszt-lefedés (401-útvonal) még hiányzik.

---

## 1. Regisztráció és dashboard

| Ügyfél-igény | Állapot | Bizonyíték a repóban | Ajánlott kategória | Szükséges változás | Thesis-relevancia | Kockázat / megjegyzés |
|---|---|---|---|---|---|---|
| Regisztráció / bejelentkezés | ✅ | `src/app/api/auth/*` (bcrypt, `nh_session` HttpOnly cookie) | Kész | — | Magas | — |
| Fő dashboard bejelentkezés után | ✅ | `halaszatok/[hid]/page.tsx` + `HalaszatStatClient` + `GET .../osszesito` | Kész / P1 | Dashboard 2.0 bővítés | Magas | — |
| Kulcs-statisztikák | ✅ | `osszesito` (KPI-k, chartok) | Kész / P1 | trendek, riasztások | Magas | — |
| Össz halmennyiség | ✅ | `osszesito.halallomany.osszDarab` | Kész | — | Magas | — |
| Legutóbbi tevékenységek | ✅ | `timeline` / `summary`, `NaploEsemeny` | Kész | — | Magas | actor (ki) hiányzik |
| Etetési adatok | ✅ | etetés-aggregáció az `osszesito`-ban | Kész | — | Magas | — |
| Értesítések / riasztások | ⚠️ | csak takarmány low-stock **vizuális** jelzés (`TakarmanyokClient`) | P2 | szabály-alapú riasztó + dashboard warning | Közepes | nincs értesítő rendszer |
| AI javaslatok | ❌ | **nincs** termék-AI a kódban | Jövőbeli | — | Alacsony | ne jelöljük késznek |
| Másnapi tervek | 🟡 | nincs | P1/P4 | terv-entitás | Közepes | — |
| Ütemezett etetés | 🟡 | nincs (a naptár manuális) | P3 | ütemezés + naptár-integráció | Közepes | — |
| 7 napos időjárás | 🔵 | nincs | P4 / Jövőbeli | külső időjárás-API | Alacsony | 3rd-party függés |
| Páratartalom | 🔵 | nincs | Jövőbeli | szenzor/API | Alacsony | IoT-jellegű |
| NDVI / műhold nézet | 🔵 / ❌ | nincs | Jövőbeli | műhold-adat pipeline | Alacsony | nagy komplexitás, nem MVP |
| Térkép koordináták alapján | 🔵 | nincs (nincs koordináta-mező) | P4 | koordináta-mező + térkép | Alacsony-Közepes | — |

## 2. Tavak és telelő tavak

| Ügyfél-igény | Állapot | Bizonyíték a repóban | Ajánlott kategória | Szükséges változás | Thesis-relevancia | Kockázat / megjegyzés |
|---|---|---|---|---|---|---|
| Tavak létrehozása | ✅ | `POST .../toak` | Kész | — | Magas | — |
| Telelő tavak létrehozása | ✅ | `ToTipus = TELELO` | Kész | — | Magas | — |
| Halfaj hozzáadása tóhoz/telelőhöz | ✅ | `halfajok` + `HalAllomany`/`telepites` | Kész | — | Magas | — |
| Halállomány felvétele | ✅ | `POST .../telepites` | Kész | — | Magas | — |
| Aktuális készlet tavanként | ✅ | `GET .../toak/[toId]` (`allomanyok`) | Kész | — | Magas | — |
| Áthelyezés tó → tó | ✅ | `POST .../attelepites` | Kész | — | Magas | — |
| Áthelyezés tó → telelő | ✅ | `attelepites` (bármely `To` → `To`) | Kész | — | Magas | — |
| Áthelyezés telelő → tó | ✅ | `attelepites` | Kész | — | Magas | — |
| Kivétel | ✅ | `POST .../kivetel` | Kész | — | Magas | — |
| Eladás / kivétel indoka | ⚠️ | `Kivetel.ok` (szabad szöveg) | Kész / P1 | strukturált ok-lista (enum) opció | Közepes | jelenleg szabad szöveg |
| Készlet csökken kivét/eladás után | ✅ | `kivetel` tranzakció (`HalAllomany.darab`) | Kész | — | Magas | — |
| Tó-minőség statisztika | 🟡 | **nincs** vízminőség-modell | P2 | vízminőség modul | Közepes | — |
| Vízminőség alapú tó-minőség | 🟡 | nincs | P2 | — | Közepes | — |

## 3. Halfajok és halállomány

| Ügyfél-igény | Állapot | Bizonyíték a repóban | Ajánlott kategória | Szükséges változás | Thesis-relevancia | Kockázat / megjegyzés |
|---|---|---|---|---|---|---|
| Halfajok kézi definiálása | ✅ | `halfajok` CRUD | Kész | — | Magas | — |
| Tartott fajok megadása | ✅ | `Halfaj` halászatonként | Kész | — | Közepes | — |
| Mennyiség hozzáadása tavakhoz | ✅ | `telepites` / `HalAllomany` | Kész | — | Magas | — |
| Darabszám tárolása | ✅ | `HalAllomany.darab` | Kész | — | Magas | — |
| Tömeg tárolása | ⚠️ | `minTomegKg`/`maxTomegKg` (**tartomány**, nem pontos átlag/össz) | P1 | pontos átlag- és összsúly mezők | Közepes | jelenleg csak tömegtartomány |
| Darabszám számítása átlagsúlyból | 🟡 | nincs | P1 | származtatott mezők/logika | Közepes | — |
| Átlagsúly darab + összsúlyból | 🟡 | nincs | P1 | — | Közepes | — |
| Összsúly darab + átlagsúlyból | 🟡 | nincs | P1 | — | Közepes | — |

## 4. Műveletek és előzmény

| Ügyfél-igény | Állapot | Bizonyíték a repóban | Ajánlott kategória | Szükséges változás | Thesis-relevancia | Kockázat / megjegyzés |
|---|---|---|---|---|---|---|
| Minden művelet tárolása | ✅ | `NaploEsemeny` (telepítés/kivét/etetés/áttelepítés) | Kész | — | Magas | actor (ki) hiányzik |
| Műveletek szerkesztése | 🟡 | nincs edit-végpont a műveletekre | P1 | edit + audit-nyom | Közepes | adatintegritás-kockázat |
| Hibás művelet törlése / érvénytelenítése | 🟡 | nincs (a műveleteken nincs soft-delete) | P1 | „érvénytelenítve" jelző + napló | Közepes | soha ne néma-töröljön |
| Törölt/érvénytelenített műveletek mutatása | 🟡 | nincs | P1 | — | Közepes | — |
| Ki rögzítette az adatot | ⚠️ | **Sprint 1:** `NaploEsemeny.felhasznaloId` a sessionből; `timeline` → `rogzitoNev` | P1 | további nézeteken megjeleníteni (migráció ✅ alkalmazva) | **Magas** | témavezetői pillér: nyomon követhetőség |
| Ki végezte a műveletet | ⚠️ | **Sprint 1:** actor a telepítés/kivét/etetés/áttelepítés naplóján | P1 | megjelenítés bővítése (migráció ✅ alkalmazva) | **Magas** | — |
| Audit-napló minden adathoz | ⚠️ | `NaploEsemeny` a műveletekre, **most már actorral**; nem minden adat-CRUD-ra | P1 | edit/invalidate audit + verziózás | **Magas** | `threat-model.md` STRIDE-R (részben rendezve) |

## 5. Vízminőség-monitoring

| Ügyfél-igény | Állapot | Bizonyíték a repóban | Ajánlott kategória | Szükséges változás | Thesis-relevancia | Kockázat / megjegyzés |
|---|---|---|---|---|---|---|
| Vízminőség-statisztika tavanként | 🟡 | **nincs** modell | P2 | vízminőség-entitás + UI | Közepes | — |
| Vizuális tó-állapot | 🟡 | nincs | P2 | — | Közepes | — |
| Vízminőség-indikátorok | 🟡 | nincs | P2 | mérés-entitás | Közepes | — |
| Riasztás rossz értékekre | 🟡 | nincs | P2 | szabály-alapú riasztás | Közepes | — |
| Dashboard figyelmeztetés problémás tóra | 🟡 | nincs | P2 | dashboard-integráció | Közepes | — |

## 6. Halegészségügyi modul

| Ügyfél-igény | Állapot | Bizonyíték a repóban | Ajánlott kategória | Szükséges változás | Thesis-relevancia | Kockázat / megjegyzés |
|---|---|---|---|---|---|---|
| Külön halegészség menü | 🟡 | nincs | P2 / Jövőbeli | menü + modul | Alacsony-Közepes | — |
| Egészség számítása paraméterekből | 🟡 | nincs | P2 | health-score logika | Közepes | biológiai modell validáció kell |
| Vizuális egészségi állapot | 🟡 | nincs | P2 | — | Alacsony-Közepes | — |
| Statisztika / chart / health score | 🟡 | nincs | P2 | — | Közepes | — |
| Riasztások | 🟡 | nincs | P2 | — | Alacsony-Közepes | — |
| Kezelési javaslatok | ❌ | nincs | Jövőbeli | — | Alacsony | szakmai/orvosi felelősség |
| Ajánlott/rendelhető gyógyszer megjelenítése | ❌ | nincs | Jövőbeli / scope-on kívül | — | Alacsony | marketplace, felelősség |

## 7. Halászati napló / tókezelési napló

| Ügyfél-igény | Állapot | Bizonyíték a repóban | Ajánlott kategória | Szükséges változás | Thesis-relevancia | Kockázat / megjegyzés |
|---|---|---|---|---|---|---|
| Külön napló-menü | 🟡 | `timeline`/`NaploEsemeny` van, külön „napló-menü" nincs | P3 | napló-nézet | Közepes | — |
| Kötelező adminisztráció támogatása | ⚠️ | részben (auditnapló műveletekre) | P3 | eseménykör-bővítés | Közepes | — |
| Események automatikus gyűjtése | ⚠️ | `NaploEsemeny` automatikusan gyűlik a **műveletekre** | P3 | bővíteni vízminőség/mortalitás/hatchery eseményekre | Közepes | jelenleg csak 4 művelettípus |
| PDF-riport generálás | 🟡 | nincs | P3 | PDF-export réteg | Közepes | — |
| Gyors PDF-export | 🟡 | nincs | P3 | — | Közepes | — |
| Tartalmazza: telepítés/áthelyezés/kivét/eladás/etetés/vízminőség/mortalitás/hatchery | ⚠️ | telepítés/áthelyezés/kivét/etetés naplózva; vízminőség/mortalitás/hatchery **nincs** | P3 | eseménykör + a hiányzó modulok | Közepes | függ a P2/P4-től |

## 8. Halkeltetési modul

| Ügyfél-igény | Állapot | Bizonyíték a repóban | Ajánlott kategória | Szükséges változás | Thesis-relevancia | Kockázat / megjegyzés |
|---|---|---|---|---|---|---|
| Külön halkeltetés menü | ⚠️ | **csak placeholder oldal** (`halaszatok/[hid]/halkeltes`, „hamarosan") | 🟡 P4 / Jövőbeli | teljes modul | Alacsony-Közepes | ne jelöljük késznek |
| To-do lista, vezetett folyamat | 🟡 | nincs | P4 / Jövőbeli | folyamat-motor | Alacsony | — |
| Faj + keltetési szezon fajonként | 🟡 | nincs | P4 | entitások | Alacsony | — |
| Tenyészhal-szám, ivarok, súlyok | 🟡 | nincs | P4 / Jövőbeli | entitások | Alacsony | — |
| Ikra-/tejmennyiség | 🟡 | nincs | Jövőbeli | — | Alacsony | — |
| Egyedi tenyészhal-/chip-azonosító | 🔵 | nincs | Jövőbeli | egyed-nyilvántartás | Alacsony | nagy scope |
| Össz ivadék fajonként, kihelyezés tóba | 🟡 | nincs | P4 | — | Alacsony | — |
| Keltetési mortalitás | 🟡 | nincs | P4 | — | Alacsony | — |
| Grafikus keltetési haladás | 🔵 | nincs | Jövőbeli | — | Alacsony | — |

## 9. Takarmánytárolás (feed storage)

| Ügyfél-igény | Állapot | Bizonyíték a repóban | Ajánlott kategória | Szükséges változás | Thesis-relevancia | Kockázat / megjegyzés |
|---|---|---|---|---|---|---|
| Külön takarmány-menü | ✅ | `takarmanyok` menü + modul | Kész | — | Magas | — |
| Takarmánykészlet rögzítése | ✅ | `Takarmany.keszlet` | Kész | — | Magas | — |
| Készlet figyelése | ✅ | `TakarmanyokClient` + chartok | Kész | — | Magas | — |
| Meddig elég a takarmány (előrejelzés) | 🟡 | **nincs** előrejelzés | P1 | átlagfogyás-alapú „feed forecast" | **Magas** | témavezetői pillér: feed inventory |
| Takarmány hozzáadása | ✅ | `mozgasok` `BEVETEL` | Kész | — | Magas | — |
| Automatikus levonás etetés után | ✅ | `etetes` `takarmanyId`-vel → `FELHASZNALVA` | Kész | — | Magas | — |
| Ki adta hozzá a takarmányt | ⚠️ | **Sprint 1:** `TakarmanyMozgas.felhasznaloId` (bevétel) + `rogzitoNev` a mozgásnaplóban (UI-n is) | P1 | megjelenítés bővítése (migráció ✅ alkalmazva) | Közepes | — |
| Ki etetett | ⚠️ | **Sprint 1:** actor a `FELHASZNALVA` mozgáson és az etetés-naplón | P1 | megjelenítés bővítése (migráció ✅ alkalmazva) | Közepes | — |
| Mikor / mennyi takarmányt használtak | ✅ | `TakarmanyMozgas` (`datum`, `mennyiseg`, + `toId`/`etetesId` kötés) | Kész | — | Magas | „ki" hiányzik |

## 10. Felhasználók és szerepkörök

| Ügyfél-igény | Állapot | Bizonyíték a repóban | Ajánlott kategória | Szükséges változás | Thesis-relevancia | Kockázat / megjegyzés |
|---|---|---|---|---|---|---|
| Emberek hozzáadása | ✅ | `dolgozok` `POST` | Kész | — | Magas | — |
| Szerepkör-kiosztás | ✅ | `HalaszatTagsag.szerepkor` | Kész | — | Magas | — |
| Jogosultságkezelés | ✅ | `requireHalaszatRole`, `role-matrix.md` | Kész | — | Magas | — |
| Csak-etetés szerepkör | 🟡 | nincs szűk „etetés-only" szerepkör (STAFF etethet, de tágabb) | P1/P2 | új szerepkör vagy jog-granularitás | Közepes | — |
| Teljes hozzáférés szerepkör | ✅ | `OWNER` | Kész | — | Magas | — |
| Csapat-kezelés | ✅ | `dolgozok` CRUD | Kész | — | Magas | — |
| Felelős személy műveletenként | ⚠️ | **Sprint 1:** a művelet rögzítője (actor) eltárolva; külön „felelős-kijelölés" még nincs | P1 | felelős-kötés + megjelenítés | **Magas** | — |
| Ki rögzített minden adatot | ⚠️ | **Sprint 1:** a fő műveletekre igen (actor); nem minden adat-CRUD-ra | P1 | actor a törzsadat-CRUD-ra is | **Magas** | — |

## 11. Naptár és feladatkövetés

| Ügyfél-igény | Állapot | Bizonyíték a repóban | Ajánlott kategória | Szükséges változás | Thesis-relevancia | Kockázat / megjegyzés |
|---|---|---|---|---|---|---|
| Naptár menü | ✅ | `naptar` (`NaptarBejegyzes` CRUD) | Kész | — | Közepes | — |
| Ki, mit, mikor | ⚠️ | a **művelet-idővonalon** már van actor + időbélyeg (Sprint 1); a **naptár** viszont manuális, actor/auto nélkül | P3 | actor + auto-események a naptárba | Közepes | — |
| Keresés adott napra | ⚠️ | havi nézet + napi bejegyzések, nincs kereső | P3 | nap-kereső | Alacsony-Közepes | — |
| Előzmény tárolása a naptárban | ⚠️ | manuális bejegyzések | P3 | auto-esemény gyűjtés | Közepes | — |
| Egyedi események megnyitása | ✅ | `BejegyzesModal` | Kész | — | Alacsony | — |
| Admin módosíthat eseményt | ✅ | `naptar` `PATCH` (STAFF+) | Kész | — | Alacsony | — |
| Tartalmazza: etetés/vízminőség/áthelyezés/hatchery/bevét/mortalitás/dolgozói feladat | 🟡 | jelenleg csak manuális naptár, nincs auto-integráció | P3 | esemény-aggregáció a naptárba | Közepes | függ a P2/P4-től |

---

## Ajánlott SZD2 MVP roadmap

A fázisok a témavezetői pillérekhez igazodnak (halállomány, műveleti napló,
takarmánykészlet, RBAC, dashboard, validáció, nyomon követhetőség), és a már kész
alapokra építenek.

### 1. fázis — a művelet-MVP megerősítése
- **Dashboard 2.0** — trendek, low-stock és problémás-tó figyelmeztetések a
  meglévő `osszesito`-ra építve.
- **Actor / audit-napló megerősítése** — ✅ **Sprint 1 leszállítva (2026-06-26):**
  `felhasznaloId` a `NaploEsemeny`-en és a `TakarmanyMozgas`-on (sessionből),
  `rogzitoNev` a tó-idővonalon és a takarmánymozgás-előzményen. *Hátra:* a migráció
  alkalmazása a production DB-re + a művelet szerkesztés/érvénytelenítés audit.
- **Feed forecast** — „meddig elég a takarmány" az átlagos napi fogyásból.
- **Művelet-nyomon követhetőség** — művelet szerkesztése/érvénytelenítése audit-
  nyommal (néma törlés nélkül) + pontos súly-mezők (átlag/össz) a becslésekhez.

### 2. fázis — vízminőség és állapot
- **Vízminőség-modul** (mérés-entitás tavanként).
- **Szabály-alapú riasztások** (küszöbök → dashboard warning).
- **Tó-egészség / pond health score** a mérésekből.

### 3. fázis — napló és naptár
- **PDF halászati/tókezelési napló** (gyors export, a művelet-eseményekből).
- **Naptár/feladat integráció** — az automatikus események (etetés, áthelyezés,
  vízminőség, bevét, mortalitás) a naptárban, actor-ral.

### 4. fázis — térkép/időjárás és minimális keltetés
- **Térkép koordináták alapján + időjárás** (külső API-k).
- **Minimális halkeltetés-tervezés** VAGY tudatos **jövőbeli-munka** döntés
  (a teljes keltetési életciklus nem thesis-mag, hacsak nem ez lesz kiválasztva).

### Jövőbeli munka (thesis MVP-n túl)
- **NDVI / műhold** nézet.
- **Termék-AI asszisztens** (javaslatok, tervek).
- **Gyógyszer/kezelés marketplace** (rendelhető kezelések).
- **Részletes keltetési életciklus**, ha nem ez a thesis-mag.

---

## Amit NEM ajánlott azonnal megvalósítani

| Terület | Miért kockázatos a thesis MVP-hez |
|---|---|
| **NDVI / műhold nézet** | Külső adat-pipeline, jelentős komplexitás és költség; a művelet-MVP-hez nem ad értéket, elviszi a fókuszt a menürobbanás irányába. |
| **Gyógyszer / rendelhető kezelési javaslat** | Szakmai/állat-egészségügyi **felelősség**; lényegében marketplace-integráció — a thesis scope-ján kívül. |
| **Teljes AI asszisztens** | Nincs termék-AI alap; validáció és megbízhatóság nélkül félrevezető javaslatokat adhat; nagy scope, kevés thesis-hozzáadott érték most. |
| **Teljes keltetési életciklus** | Nagyon nagy adat- és folyamat-scope (tenyészhal, ikra/tej, chip-azonosító, mortalitás, haladás); a jelenlegi placeholderből komplett modul — csak akkor, ha ez a kiválasztott thesis-mag. |
| **IoT / szenzor-automatizálás** (páratartalom, automata vízmérés) | Hardver- és üzemeltetési függés, a `scope-contract.md` „Out of Scope"-ja; a szoftver-MVP nyomon-követhetőségi céljához nem szükséges. |

Ezek mind **🔵 jövőbeli** vagy **❌ nem ajánlott** kategóriák — dokumentáltan, hogy
az ügyfél lássa: nem elfelejtettük, hanem tudatosan halasztottuk őket.

---

## Ajánlott következő implementációs sprint

**Ajánlás: „Actor / audit-napló megerősítése" (1. fázis).**

**Miért ez a legjobb következő sprint:**

1. **Közvetlenül a témavezetői irányt szolgálja** — a *nyomon követhetőség* és a
   *műveleti napló* pillért erősíti, nem új menüpontot ad.
2. **Egyszerre sok ügyfél-igényt old fel** — a „ki rögzítette / ki végezte /
   felelős személy / ki adta a takarmányt / ki etetett" kérések a **4., 9., 10. és
   11. szekcióban** mind ugyanarra a hiányra futnak: a `NaploEsemeny` és a
   `TakarmanyMozgas` **nem tárol actort**. Egy mező + a meglévő session-user
   bekötése mindet előbbre viszi.
3. **Alacsony kockázat, meglévő alapokra épít** — a session már ismeri a
   felhasználót (`getAuthUser`), a műveletek már tranzakcióban naplóznak; „csak" az
   actor-t kell átvezetni. Nincs új külső függés.
4. **Feloldja a dokumentált biztonsági hiányt** — a `threat-model.md` STRIDE-R
   (letagadhatóság) reziduális kockázata pontosan ez; a sprint mérhető biztonsági
   javulást ad.
5. **Megágyaz a PDF-naplónak és a naptár-integrációnak** (3. fázis) — actor nélkül
   azok is féllábon állnának.

**Gyors-követő (fast-follow):** **Dashboard 2.0** — vizuálisan is demonstrálható,
és az actor-adatot azonnal meg tudja jeleníteni („ki csinálta" a legutóbbi
tevékenységeknél).

> Megjegyzés a validációról: az **integrációs/e2e** réteg infrastruktúrája
> elkészült, de **teszt-DB hiányában nem futott le** (biztonságos skip) — a sprint
> lezárásakor egy izolált teszt-DB elleni **valós futtatás** adná a hiányzó
> végrehajtott bizonyítékot (lásd `../04_quality/test-report.md` 8.).
