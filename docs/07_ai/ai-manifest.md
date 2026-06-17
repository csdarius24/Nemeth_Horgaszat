# AI Manifest

Ez a dokumentum átláthatóan rögzíti, hogy a Németh Horgászat projekt fejlesztése
során milyen AI-eszközök kerültek felhasználásra, hol segítettek, és hogyan
történt az emberi felülvizsgálat és felelősségvállalás. A cél az **akadémiai
integritás** és a reprodukálhatóság: az AI támogató eszköz volt, nem önálló
szerző.

## 1. Felhasznált AI-eszközök

| Eszköz | Szerep |
|---|---|
| **ChatGPT** (OpenAI) | Ötletelés, magyarázatok, kód- és dokumentációs vázlatok, hibakeresési tanácsok. |
| **Claude Code** (Anthropic) | Kódbázis-elemzés, dokumentáció-generálás a tényleges forrásból, teszt-infrastruktúra és CI beállítása, kód-átvilágítás (review). |

Megjegyzés: az eszközök verziói és a használat időszaka a fejlesztés folyamán
változhattak; a konkrét, reprodukálható lépések a `prompt-log.md`-ben és a
`verification-log.md`-ben követhetők, a tényleges eredmény pedig a git
commit-történetben (lásd 5. szakasz).

## 2. Hol segített az AI

Az AI az alábbi területeken nyújtott támogatást. Minden esetben a kimenetet ember
vizsgálta felül és hagyta jóvá (lásd 3. szakasz).

- **Dokumentáció:** a `docs/**` szakaszok kitöltése (product, architecture,
  design, quality, security_ops, és jelen AI-dokumentáció). A design- és
  security-dokumentumok a **tényleges** sémából (`prisma/schema.prisma`) és az API
  route-okból (`src/app/api/**`) készültek, nem feltételezésből.
- **Architektúra-átvizsgálás:** a meglévő felépítés (Next.js App Router, Prisma,
  MySQL, session auth, multi-tenant) elemzése, érettségi audit, erősségek és
  hiányosságok azonosítása.
- **Teszt-tervezés:** tesztpiramis, unit/integration/e2e bontás, az elfogadási
  kritériumokhoz (AC1–AC7) kötött lefedettség (`testing-strategy.md`).
- **Teszt-generálás:** az első valós unit tesztek (29 teszt, Vitest) a tiszta
  logikára, valamint a tesztelhetőséget szolgáló, viselkedés-megőrző kiemelések
  (`src/lib/roles.ts`, `src/lib/password.ts`, `src/lib/utils/slug.ts`).
- **CI beállítás:** GitHub Actions workflow (`.github/workflows/ci.yml`) —
  typecheck + unit teszt; a lint tudatosan, dokumentáltan nem-blokkoló.
- **Kód-átvizsgálás (review):** biztonsági és minőségi észrevételek (pl. login
  rate limiting hiánya, `error`/`hiba` kulcs-inkonzisztencia, hibabejelentés-
  végpontok auth-hiánya, production query-logging) — ezek **kifejezetten
  dokumentálva** lettek, nem „elmagyarázva".

## 3. Emberi felelősség és validáció

- A projekt szerzője és **felelőse**: Csóka Dániel Dárius. Az AI kimenetért a
  végső felelősség az emberé; minden AI-javaslat emberi jóváhagyással került be.
- **Validációs elvek:**
  - Kód- és dokumentációváltozás csak ellenőrzés után került commitba.
  - A teszteket és a típusellenőrzést minden releváns változás után lefuttattuk
    (`npm run test`, `npx tsc --noEmit`) — az eredmények a `verification-log.md`-ben.
  - A dokumentációban szereplő tényállításokat a forráskódhoz mértük; ahol a
    viselkedés nem volt egyértelmű, `TODO` jelöli, nem kitalált tény.
  - A hiányosságokat (pl. pre-existing lint hibák) **nem rejtettük el**, hanem
    ismert hiányosságként dokumentáltuk.
- Az AI nem kapott önálló jogot adat módosítására vagy külső publikálásra emberi
  jóváhagyás nélkül.

## 4. Mit TILOS AI-eszköznek átadni

Összhangban a `docs/05_security_ops/privacy.md` 5. szakaszával, **tilos** valós
titkot vagy személyes adatot AI-eszközbe juttatni. Konkrétan nem kerülhet AI
promptba vagy AI-szolgáltatáshoz:

- **titkok / kulcsok** (bármilyen API kulcs, jelszó, token),
- a **`DATABASE_URL`** és bármely adatbázis-hitelesítő adat,
- **valós felhasználói adat** (e-mail, név, vagy más személyes adat),
- **production logok személyes adattal (PII)**, éles adatbázis-kivonatok (dump).

Megengedett: a forráskód, a séma szerkezete, és **anonimizált/szintetikus**
példaadat. Ha valós adaton kell hibát reprodukálni, azt előbb anonimizálni kell.

## 5. Nyomonkövethetőség (git)

Az AI-támogatott munka tényleges eredménye a git commit-történetben követhető. A
releváns commitok (a `main` ágon):

| Commit | Tartalom |
|---|---|
| `7aa8dda` | docs: product scope és capability dokumentáció |
| `c0548a2` | docs: design dokumentáció (data-model, api-design) |
| `781d0a9` | docs: security & operations dokumentáció |
| `3bc23bb` | docs: quality dokumentáció (testing strategy, test report) |
| `be5269d` | test: első unit teszt-infrastruktúra (Vitest, 29 teszt) |
| `72c10a2` | ci: GitHub Actions workflow (typecheck + unit teszt) |

Ez a manifeszt a `07_ai` dokumentáció része; a hozzá tartozó részletek a
`prompt-log.md`-ben (reprezentatív promptok) és a `verification-log.md`-ben
(ellenőrzések és bizonyítékok) találhatók.
