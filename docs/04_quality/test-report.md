# Test Report

Ez a dokumentum a Németh Horgászat rendszer tesztelési állapotát rögzíti. A
kapcsolódó terv: `docs/04_quality/testing-strategy.md`. Az elfogadási kritériumok
forrása: `docs/01_product/scope-contract.md` (AC1–AC7).

## 1. Állapot — összefoglaló

> **Az automata tesztek jelenleg NINCSENEK implementálva.** A `package.json` nem
> tartalmaz teszt-runnert (a szkriptek: `dev`, `build`, `start`, `lint`), és nincs
> teszt-keretrendszer (sem Vitest, sem Playwright) a függőségek között. Nincs
> `*.test.ts` / `*.spec.ts` fájl, nincs CI által futtatott tesztlépés.

Ez a dokumentum ezért **baseline + terv**: rögzíti a jelenlegi kiindulási
állapotot, és tervezett tesztmátrixot ad, amelyhez a bizonyítékok (eredmények,
lefedettség, CI-log) később illesztendők.

## 2. Jelenlegi baseline

| Tétel | Állapot |
|---|---|
| Teszt-keretrendszer | ❌ Nincs (Vitest/Playwright bevezetendő) |
| Unit tesztek | ❌ Nincs |
| Integration tesztek | ❌ Nincs |
| E2E tesztek | ❌ Nincs |
| Lefedettség mérés | ❌ Nincs |
| CI tesztlépés | ❌ Nincs (nincs `.github/` pipeline) |
| Statikus ellenőrzés | ⚠️ `npm run lint` (ESLint) elérhető; `tsc` típusellenőrzés a build során |
| Kézi (manuális) ellenőrzés | ⚠️ Fejlesztés közben ad-hoc, nem dokumentált |

**Jelenleg rendelkezésre álló minőségi jelek:** ESLint (`eslint.config.mjs`),
TypeScript szigorú típusozás (`tsconfig.json`), és a séma-szintű megszorítások
(egyedi kulcsok, FK-szabályok), amelyek futásidőben érvényesülnek. Ezek nem
helyettesítik az automata teszteket, de csökkentik a hibafelületet.

## 3. Tervezett tesztmátrix

| ID | Réteg | Terület | Eset (összefoglaló) | Eszköz | Állapot |
|---|---|---|---|---|---|
| U-01 | Unit | `guards` rangsor | RBAC küszöb döntések (STAFF/ADMIN/OWNER) | Vitest | Tervezett |
| U-02 | Unit | `auth` | jelszó hash/verify, token generálás | Vitest | Tervezett |
| U-03 | Unit | `szam` | szám-parse + alapérték | Vitest | Tervezett |
| U-04 | Unit | `slugify` | ékezet/ütközés-feloldás | Vitest | Tervezett |
| U-05 | Unit | `canManageTarget` | dolgozó-kezelés szabályai | Vitest | Tervezett |
| I-01 | Integration | Auth | register/login/me/logout + hibák | Vitest+DB | Tervezett |
| I-02 | Integration | Halászat | létrehozás + OWNER tagság | Vitest+DB | Tervezett |
| I-03 | Integration | Tó | létrehozás/listázás, típus | Vitest+DB | Tervezett |
| I-04 | Integration | Halfaj | CRUD + egyediség + FK-védelem | Vitest+DB | Tervezett |
| I-05 | Integration | Telepítés/Kivét | állomány-frissítés + napló + készlet-ellenőrzés | Vitest+DB | Tervezett |
| I-06 | Integration | Áttelepítés | forrás/cél + két napló + tenant-check | Vitest+DB | Tervezett |
| I-07 | Integration | RBAC negatív | 401/403 a védett végpontokon | Vitest+DB | Tervezett |
| I-08 | Integration | Tenant-izoláció | idegen `[hid]`/`[toId]` → 403/404 | Vitest+DB | Tervezett |
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

## 5. Eredmények

> Nincs rögzíthető eredmény, amíg a tesztek nem készülnek el. A tesztek
> bevezetése után ide kerül: futtatás dátuma, környezet (Node/DB verzió), összes
> teszt / sikeres / bukott, lefedettségi százalék, és a fenti mátrix/táblázat
> kitöltése tényleges állapottal.

## 6. TODO — jövőbeli bizonyítékok

- [ ] Vitest + Playwright bevezetése; `test`, `test:e2e`, `coverage` szkriptek a
      `package.json`-ba.
- [ ] Teszt-adatbázis és seed/factory helperek beállítása (lásd
      `testing-strategy.md` 8. szakasz).
- [ ] **CI-log:** GitHub Actions futás linkje a tesztlépéssel (lint→typecheck→
      unit/integration→e2e).
- [ ] **Lefedettségi riport:** `@vitest/coverage-v8` kimenet csatolása; a célok
      (`testing-strategy.md` 9.) teljesülésének igazolása.
- [ ] **Playwright bizonyíték:** trace + screenshot a fő folyamatról (E-01) és a
      negatív esetekről (E-02, E-03).
- [ ] A 3. és 4. táblázat frissítése valós állapotra; a `docs/06_release/
      acceptance-report.md` összekötése ezekkel az eredményekkel.
