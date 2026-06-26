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

### Riport és napló (döntéstámogatás)
- Tó-összefoglaló (`summary`), idővonal (`timeline`), halászat-szintű összesítő
  (`osszesito`) aggregációkkal és paraméter-korlátokkal.
- Auditnapló (`NaploEsemeny`) minden fontos műveletnél.

### Kiegészítő modulok
- Naptár (havi bejegyzések), hibabejelentés státuszkövetéssel, beépített
  számológép segédeszköz.

## Minőségi bizonyíték

| Tétel | Állapot | Hivatkozás |
|---|---|---|
| Unit tesztek | ✅ **29/29 zöld** (Vitest) | `docs/04_quality/test-report.md` 5. |
| Típusellenőrzés | ✅ **`npx tsc --noEmit` exit 0** | `verification-log.md` V-02 |
| CI workflow | ✅ Létezik (typecheck + unit teszt, push/PR) | `.github/workflows/ci.yml` |
| Biztonsági dokumentáció | ✅ STRIDE threat-model, privacy, runbook, deployment | `docs/05_security_ops/` |
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
- az **etetés ↔ takarmánykészlet automatikus összekötése** (etetéskor automatikus
  készletlevonás; jelenleg a takarmánymozgás kézi rögzítésű),
- bővített döntéstámogatás (trendek, lehalászás-tervezés).

## Kapcsolódó kiadási commitok (main)

| Commit | Tartalom |
|---|---|
| `c0548a2` | Design dokumentáció (data-model, api-design) |
| `781d0a9` | Security & operations dokumentáció |
| `3bc23bb` | Quality dokumentáció (testing strategy, test report) |
| `be5269d` | Unit teszt-infrastruktúra (Vitest, 29 teszt) |
| `72c10a2` | CI workflow (GitHub Actions) |
| `8727284` | AI engineering dokumentáció |

> Megjegyzés: a kiadáshoz ajánlott egy `v1.0` git tag létrehozása a végleges
> beadáskor (jelenleg még nincs tag — **TODO**).
