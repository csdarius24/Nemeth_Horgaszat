# Prompt Log

Reprezentatív promptok, amelyek a projekt jelentős dokumentációs, teszt- és
CI-artefaktumait eredményezték. A cél a módszertan és a reprodukálhatóság
bemutatása. A promptok itt **összefoglalva** szerepelnek (nem szó szerinti, teljes
átirat), de hűen tükrözik a tényleges szándékot. Minden sorhoz tartozik emberi
validáció. Kapcsolódó: `ai-manifest.md`, `verification-log.md`.

> Megjegyzés: a promptok nem tartalmaztak titkot, `DATABASE_URL`-t vagy valós
> személyes adatot (lásd `ai-manifest.md` 4. szakasz).

## Áttekintő tábla

| # | Cél | Prompt összefoglaló | Generált artefaktum | Emberi validáció |
|---|---|---|---|---|
| P-01 | Repo audit | „Elemezd a teljes repót, és adj érettségi auditot: erősségek, gyengeségek, hiányzó deliverable-ök." | Audit-jelentés (erősségek/gyengeségek/becsült ráfordítás) | Áttekintve; a megállapításokat a kódhoz mérve elfogadva. |
| P-02 | Docs audit | „Hasonlítsd a `docs/` mappát egy szakmai szakdolgozati elváráshoz; COMPLETE / PARTIAL / MISSING checklista." | Dokumentáció-checklista státuszokkal | Ellenőrizve a tényleges fájlállapottal (üres fájlok azonosítva). |
| P-03 | Design docs | „Töltsd ki a `data-model.md`-t a `prisma/schema.prisma` alapján: ER diagram, enumok, entitások, cascade szabályok." | `docs/03_design/data-model.md` | Sémához vetve; cascade/SetNull/Restrict ellenőrizve. |
| P-04 | Design docs | „Töltsd ki az `api-design.md`-t a `src/app/api/**` route-okból: minden végpont, szerepkör, body, hibák, mellékhatások." | `docs/03_design/api-design.md` | Végpontonként összevetve a handlerekkel; `error`/`hiba` eltérés rögzítve. |
| P-05 | Security docs | „STRIDE fenyegetésmodell: eszközök, bizalmi határok, konkrét fenyegetések, mitigációk, reziduális kockázat; ismert hiányok kiemelve." | `docs/05_security_ops/threat-model.md` | Az állítások a kódból igazolva; ismert hiányok nem elrejtve. |
| P-06 | Security docs | „Privacy, deployment és runbook dokumentumok a tényleges sémához és üzemeltetéshez igazítva." | `privacy.md`, `deployment.md`, `runbook.md` | Tárolt adatok a sémából; env változók a kódból ellenőrizve. |
| P-07 | Quality docs | „Teszt-stratégia: tesztpiramis, unit/integration/e2e terv, AC1–AC7 lefedés, Vitest+Playwright, negatív tesztek, lefedettségi célok." | `docs/04_quality/testing-strategy.md` | Az AC-leképezés a `scope-contract.md`-hez igazítva. |
| P-08 | Quality docs | „Test report: mondd ki, hogy nincs még automata teszt; baseline + tervezett mátrix + nyomonkövethetőség." | `docs/04_quality/test-report.md` | A „nincs teszt" állítás ellenőrizve (nem volt runner). |
| P-09 | Unit test setup | „Állíts be Vitestet; adj legalább 10 valódi unit tesztet a tiszta logikára; ne legyen DB-függő, ne legyen fake teszt." | `vitest.config.ts`, `tests/unit/*`, `package.json` szkriptek | `npm run test` lefuttatva: 29/29 zöld. |
| P-10 | Tesztelhetőség | „Emeld ki a tiszta logikát (slug, rangsor, jelszó) tesztelhető modulokba, viselkedés-megőrzéssel, importok frissítésével." | `src/lib/utils/slug.ts`, `src/lib/roles.ts`, `src/lib/password.ts` | `npx tsc --noEmit` = 0; a hívók importjai frissítve. |
| P-11 | CI workflow | „Készíts GitHub Actions CI-t a realisztikus állapothoz: checkout, Node, `npm ci`, `prisma generate`, `tsc --noEmit`, `npm run test`; a lint NE legyen blokkoló, TODO-val." | `.github/workflows/ci.yml` | A lépéssorrend ellenőrizve; lint-kihagyás indokolva és dokumentálva. |
| P-12 | CI dokumentáció | „Frissítsd a test-report.md-t CI szakasszal: mit futtat a CI, lint mint ismert nem-blokkoló hiány, integration/e2e jövőbeli munka." | `test-report.md` 7. (CI) szakasz | Tartalom a `ci.yml`-hez igazítva. |
| P-13 | Lint vizsgálat | „A `npm run lint` piros — derítsd ki, az új teszt-setup okozza-e, vagy pre-existing." | Lint-elemzés (135+ hiba, mind meglévő kódban) | Igazolva: az új/módosított fájlokra futtatott ESLint exit 0. |
| P-14 | AI docs | „Töltsd ki a `07_ai` dokumentációt: manifeszt, prompt-log, verification-log; valós bizonyítékok, ne találj ki." | `ai-manifest.md`, `prompt-log.md`, `verification-log.md` | A bizonyítékok a tényleges futásokból és a git-történetből. |

## Megjegyzések a promptolási gyakorlathoz

- **Forrás-alapúság:** a generáló promptok kifejezetten a tényleges fájlokra
  (`schema.prisma`, `src/app/api/**`, `package.json`) hivatkoztak, hogy a kimenet
  ellenőrizhető és ne kitalált legyen.
- **Hiányok kezelése:** a promptok elvárták, hogy a bizonytalan részek `TODO`-ként
  jelenjenek meg, ne kitalált tényként.
- **Biztonsági korlát:** egyik prompt sem tartalmazott titkot vagy valós
  személyes adatot (lásd `ai-manifest.md` 4.).
- A fenti lista **reprezentatív**, nem teljes; a végleges, ellenőrzött eredmény a
  git commit-történetben rögzült (lásd `ai-manifest.md` 5. szakasz).
