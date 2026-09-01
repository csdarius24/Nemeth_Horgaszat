# Release Notes — v1.0 (Thesis Release)

**Projekt:** Németh Horgászat — több-bérlős (multi-tenant), **halgazdálkodási
műveleteket támogató** webalkalmazás többtavas horgászatok számára
**Szakdolgozati munkacím:** „Halgazdálkodási műveleteket támogató webalkalmazás
fejlesztése többtavas horgászatok számára"
**Verzió:** v1.0 (szakdolgozati kiadás)
**Dátum:** 2026-06-17
**Fejlesztő:** Csóka Dániel Dárius

Ez a kiadás a szakdolgozati MVP-t rögzíti: a `docs/01_product/scope-contract.md`
MVP-célkitűzései funkcionálisan elkészültek, és kiépült az első minőségbiztosítási
és üzemeltetési alapréteg (tesztek, CI, biztonsági és AI-dokumentáció). A kiadás
ismert korlátai átláthatóan dokumentáltak (lásd lentebb és a
`docs/06_release/acceptance-report.md`-t).

## Kiszállított funkciók (domén szerint)

### Felhasználókezelés és authentikáció
- Regisztráció, bejelentkezés, kijelentkezés, aktuális felhasználó lekérdezése.
- Session alapú auth: `nh_session` HttpOnly süti, DB-ben SHA-256 token-hash,
  bcrypt (cost 12) jelszó-hash, 30 napos élettartam.

### Halászat (tenant) kezelés
- Halászat létrehozása (a létrehozó automatikusan OWNER), listázás, alapadatok.
- Egyedi `slug` generálás ütközés-feloldással.

### Dolgozó- és jogosultságkezelés
- Tagság- és szerepkörkezelés halászat szinten (OWNER / ADMIN / STAFF).
- Dolgozó felvétele (ideiglenes jelszóval), szerepkör- és név-módosítás, soft-delete.
- Rangsoros RBAC: STAFF < ADMIN < OWNER; célkezelési szabályok (`canManageTarget`).

### Tó- és halállomány-kezelés
- Tavak létrehozása/listázása, normál és telelő (`TELELO`) típus.
- Halfajok létrehozása, átnevezése, archiválása (tenantonként egyedi név).
- Halállomány nyilvántartás darabszámmal és tömegtartománnyal.

### Műveletek (tranzakciós)
- **Telepítés:** állomány növelése + telepítési rekord + naplóesemény.
- **Kivét:** készlet-ellenőrzéssel állomány csökkentése + napló.
- **Etetés:** etetési esemény rögzítése + napló.
- **Áttelepítés:** forrás→cél mozgatás, mindkét tóra tenant-ellenőrzéssel, két
  naplóeseménnyel.

### Takarmánykészlet (feed inventory)
- Takarmányfajták nyilvántartása (név, egység, szín), aktuális készlettel.
- Készletmozgások rögzítése: **bevétel** (+) / **felhasználás** (−); a
  `Takarmany.keszlet` tranzakcióban frissül, negatívba nem mehet.
- Készlet- és megoszlás-diagramok, mozgásnapló a felületen.
- **Etetés ↔ takarmánykészlet automatikus összekötése (új):** etetéskor
  (`takarmanyId` megadva) egy tranzakcióban létrejön az `Etetes`, egy
  `FELHASZNALVA` `TakarmanyMozgas` (tóhoz/etetéshez FK-val kötve), csökken a
  `Takarmany.keszlet`, és naplóbejegyzés készül; `takarmanyId` nélkül a régi
  viselkedés marad (készlet változatlan). Engedélyező migráció:
  `20260626100000_link_etetes_takarmany` (productionben **alkalmazva**).

### Riport és napló (döntéstámogatás)
- Tó-összefoglaló (`summary`), idővonal (`timeline`), halászat-szintű összesítő
  (`osszesito`) aggregációkkal és paraméter-korlátokkal.
- Auditnapló (`NaploEsemeny`) minden fontos műveletnél.

### Actor / nyomon követhetőség (Sprint 1)
- A `NaploEsemeny` és a `TakarmanyMozgas` mostantól rögzíti a **cselekvő
  `felhasznaloId`-ját** (a **sessionből**, nem a kérés törzséből) a
  telepítés / kivét / áttelepítés / etetés + automatikus takarmány-levonás +
  kézi takarmánymozgás műveleteknél.
- A tó-idővonal és a takarmánymozgás-előzmény `rogzitoNev`-et ad vissza; a
  takarmánymozgás-UI mutatja a rögzítőt.
- Migráció: `20260626120000_actor_naplo_takarmanymozgas` — **teszt-DB → production**
  sorrendben alkalmazva.
- **Még nincs:** művelet-szerkesztés/érvénytelenítés audit + verziózás; nem minden
  CRUD kap actort.

### Halászati napló 2.0 (2026-06-27)
- Központi napló-oldal (`/halaszatok/[hid]/naplo`): keresés, típus- és
  vízegység-szűrő, napi/heti/havi gyorsszűrők; minden bejegyzésen típus-badge,
  cím, időpont, **„Rögzítette"**, vízegység/faj, mennyiség, részletek,
  „Érvényes" jelölés.
- **Dokumentum-export:** napi/heti/havi **nyomtatóbarát HTML** riport
  (fejléc, időszak, generálta, szűrők, típusonkénti + mennyiségi összegzések,
  eseménytábla) — a böngésző „Nyomtatás → PDF mentés" útvonalán PDF-be menthető.
  **Közvetlen bináris PDF tervezett.**
- Naplózott műveletek: telepítés, kivét, áttelepítés, etetés, **takarmány-bevétel
  és -felhasználás** (kézi és etetéskori automatikus levonás is).
- Séma: `EsemenyTipus` bővítés (15 érték; a nem-implementált modulok típusai
  előkészítettek, esemény nem keletkezik hozzájuk), `cim`/`reszletekJson`/
  `kapcsolodo*`/`ervenyes` mezők, `halaszatId` tenant-kötés, és **audit-döntés:**
  a tó törlése többé nem törli a naplót (SetNull). Migráció:
  `20260627120000_halaszati_naplo_2` — **még nincs alkalmazva**.

### Napló-bejegyzés javítása és érvénytelenítése (2026-06-27)
- **Fizikai törlés nincs** — a hivatalos napló sorai nem tűnhetnek el. Hibás
  rögzítés esetén **ADMIN/OWNER érvénytelenítheti** a bejegyzést **kötelező
  indokkal**; rögzül, hogy ki, mikor és miért. Az érvénytelen sor áthúzva
  megmarad, és **kimarad az összegzésekből** (a naplóban és az exportban is
  látszik, külön feltüntetett darabszámmal). A művelet **visszaállítható**.
- A bejegyzés **szövege** (cím, leírás) javítható; rögzül a `szerkesztveAt` és a
  szerkesztő. A **mennyiségi mezők nem** módosíthatók, mert a tényleges műveleti
  rekordot tükrözik.
- Új szűrő: „Csak érvényes". Új végpont: `PATCH .../naplo/[id]`.
- **Korlát:** az érvénytelenítés a *naplóbejegyzést* érvényteleníti, a
  hal-/takarmánykészletet **nem** vezeti vissza — ahhoz kompenzáló műveletet kell
  rögzíteni. Az automatikus visszavezetés és a mező-szintű verziózás **tervezett**.
- Migráció: `20260627140000_naplo_ervenytelenites` — **még nincs alkalmazva**.

### Halkeltetés MVP — kézi keltetési ciklus (2026-06-28)
- A placeholder oldal helyén **működő halkeltetési modul**: keltetési ciklusok
  létrehozása, listája, részletei és státusza (`TERVEZET`/`FOLYAMATBAN`/`LEZARVA`).
- Ciklus fejadatok: faj, dátum, oltás időpontja, hőmérséklet; **ikrás (nőstény)**
  és **tejes (hím)** halsorok chip-azonosítóval, tömeggel, ikra-kg / tej-ml,
  jelöléssel, megjegyzéssel; sorok hozzáadása/törlése.
- **Oltási adagszámítás konfigurálható protokollból** (mg/kg, ml/kg + ráhagyás
  szorzó): előadag/döntőadag/ml soronként, összegzés ivaronként, „Oltandó
  (×ráhagyás)" tartalék. A protokoll értékei a ciklusra **snapshotolódnak**, így
  utólagos protokoll-módosítás nem írja át a rögzített adagokat. **Nincs beégetett
  biológiai szabály.** A számító logika unit-tesztelt.
- A ciklus létrehozása **naplóesemény**t is ír (`HALKELTES`, tóhoz nem kötve,
  actorral).
- **Kézi rögzítés first:** az „Excel import" gomb **letiltva** („előkészítve").
  Új séma: `HalkeltetesCiklus` / `HalkeltetesHal` / `HalkeltetesProtokoll`.
  Migráció: `20260628090000_halkeltetes_mvp` — **még nincs alkalmazva**.
- **Tervezett:** Excel-import (Sprint 2), dokumentum-export (Sprint 3),
  ivadék-kihelyezés + automatikus állománynövelés (P4), keltetési mortalitás.

### Kiegészítő modulok
- Naptár (havi bejegyzések), hibabejelentés státuszkövetéssel, beépített
  számológép segédeszköz.

## Minőségi bizonyíték

| Tétel | Állapot | Hivatkozás |
|---|---|---|
| Unit tesztek | ✅ **52/52 zöld** (Vitest, 7 fájl — 2026-06-26; korábban 42) | `docs/04_quality/test-report.md` 5. |
| Integrációs tesztek | ✅ **Lefutottak a biztonságos teszt-DB-n** (feed-workflow + actor + jogosultság); teszt-DB nélkül biztonságos skip | `verification-log.md` V-16, `test-report.md` 8. |
| Típusellenőrzés | ✅ **`npx tsc --noEmit` exit 0** | `verification-log.md` V-02, V-13, V-16 |
| Production build | ✅ **`npm run build` sikeres** (Next.js, 2026-06-26) | `verification-log.md` V-13, V-16 |
| Production DB-migráció | ✅ **`20260626100000_link_etetes_takarmany`** + **`20260626120000_actor_naplo_takarmanymozgas`** alkalmazva (`prisma migrate deploy`, `srv1695.hstgr.io`) | `verification-log.md` V-13, V-16 |
| CI workflow | ✅ Létezik (typecheck + unit teszt, push/PR) | `.github/workflows/ci.yml` |
| Biztonsági dokumentáció | ✅ STRIDE threat-model, privacy, runbook, deployment, role-matrix | `docs/05_security_ops/` |
| AI verifikációs dokumentáció | ✅ Manifeszt, prompt-log, verification-log | `docs/07_ai/` |
| Design dokumentáció | ✅ Data-model + API-design a tényleges kódból | `docs/03_design/` |

## Ismert korlátok

- **Lint-adósság:** az `npm run lint` projektszinten piros, **pre-existing**
  hibák miatt a meglévő alkalmazáskódban (nem az új teszt-/CI-setupból). A lint
  ezért a CI-ban tudatosan **nem-blokkoló**. Részletek: `test-report.md` 6.1.
- **Integration / e2e tesztek:** még nincsenek implementálva; jelenleg csak unit
  réteg fut. Az elfogadási kritériumok automatizált, végpont-szintű lefedése
  hátralévő munka (lásd `acceptance-report.md`).
- **Lefedettségi százalék:** a `npm run test:coverage` elérhető, de a tényleges
  lefedettségi érték még nincs rögzítve. **TODO.**
- **Health-check végpont:** dedikált `GET /api/health` jelenleg **nincs**;
  helyettesítő ellenőrzés a `runbook.md`-ben. **TODO.**
- **Hibabejelentés-végpontok authorizációja:** a `hibabejelentesek` végpontok
  jelenleg auth/RBAC guard nélkül futnak — biztonsági rés, dokumentálva a
  `threat-model.md` 6/3-ban és az `api-design.md`-ben. Rendezendő.
- **CI első zöld futás linkje:** a GitHub Actions futás eredménylinkje még nincs
  csatolva. **TODO.**

## Nem célok (a v1.0 nem tartalmazza)

A `scope-contract.md` „Out of Scope" / „Non Goals" szakasza szerint a jelenlegi
verzió nem tartalmaz:

- online fizetést,
- mobil alkalmazást,
- IoT (vízminőség-) szenzor integrációt,
- automatikus vízminőség mérést,
- komplex gépi tanulás alapú / automatizált biológiai előrejelzést.

**Tervezett (SZD2, jelen kiadásban nincs megvalósítva):**

- **halkeltetési modul** (jelenleg csak placeholder oldal),
- bővített döntéstámogatás (trendek, lehalászás-tervezés),
- **endpoint-szintű integration/e2e tesztek** (az AC1–AC7 automatizált, végpont-
  szintű igazolása), valamint a takarmány-készletlevonás **versenyhelyzet-védelme**
  (sor-szintű zár / optimista verziózás).

> Megjegyzés: az **etetés ↔ takarmánykészlet automatikus összekötése** időközben
> **elkészült** és bekerült ebbe a kiadásba (lásd „Takarmánykészlet" fent).

## Kapcsolódó kiadási commitok (main)

| Commit | Tartalom |
|---|---|
| `c0548a2` | Design dokumentáció (data-model, api-design) |
| `781d0a9` | Security & operations dokumentáció |
| `3bc23bb` | Quality dokumentáció (testing strategy, test report) |
| `be5269d` | Unit teszt-infrastruktúra (Vitest, 29 teszt) |
| `72c10a2` | CI workflow (GitHub Actions) |
| `8727284` | AI engineering dokumentáció |
| `4163f2f` | Etetés↔takarmány automatikus levonás + migráció + bug report auth (unit tesztek: 42) |

> Megjegyzés: a kiadáshoz ajánlott egy `v1.0` git tag létrehozása a végleges
> beadáskor (jelenleg még nincs tag — **TODO**).
