# Testing Strategy

Ez a dokumentum a Németh Horgászat rendszer tesztelési stratégiáját írja le. A
stratégia a tényleges kódbázishoz igazodik (`src/lib/**`, `src/app/api/**`,
`prisma/schema.prisma`) és a `docs/01_product/scope-contract.md` 7 elfogadási
kritériumához köti a teszteket. **Fontos:** ez a *terv*; a tesztek
implementálása még nem történt meg (lásd `test-report.md`).

## 1. Célok és alapelvek

- Minden elfogadási kritérium (AC1–AC7) legalább egy automata teszttel
  igazolható legyen.
- A biztonságkritikus viselkedés (RBAC, tenant-izoláció) **negatív** tesztekkel is
  fedett legyen, ne csak a „boldog úttal".
- A tesztek determinisztikusak és izoláltak legyenek (külön teszt-adatbázis,
  tesztenkénti tiszta állapot).
- A tesztpiramis alja széles (sok gyors unit teszt), a teteje keskeny (kevés,
  drága e2e teszt).

## 2. Tesztpiramis

```text
        /\
       /e2e\       Playwright — kevés, kritikus felhasználói folyamat
      /------\
     /  integ \    Vitest + teszt-DB — API route handlerek, tranzakciók
    /----------\
   /    unit     \ Vitest — tiszta logika: guards, auth, szam, slug
  /--------------\
```

| Réteg | Mit fed | Eszköz | Arány (cél) |
|---|---|---|---|
| Unit | Tiszta függvények, üzleti szabályok DB nélkül | Vitest | ~70% |
| Integration | API végpontok + Prisma + teszt-DB | Vitest | ~25% |
| E2E | Teljes folyamat böngészőből | Playwright | ~5% |

## 3. Eszközválasztás (ajánlás)

- **Vitest** — unit és integration réteg. Indok: natív TypeScript/ESM támogatás,
  gyors, Next.js/Vite-barát, `vi.mock` a `src/lib/prisma` mockolásához unit
  szinten. (Jelenleg nincs a `package.json`-ban; bevezetendő devDependency.)
- **Playwright** — e2e réteg. Indok: valódi böngésző, megbízható auto-waiting,
  egyszerű HTTP+UI tesztelés, beépített trace/screenshot bizonyíték CI-hoz.
- **Kiegészítők:** `@vitest/coverage-v8` (lefedettség), opcionálisan
  `vitest --ui` lokális fejlesztéshez.

> Megjegyzés: a tesztek bevezetése egy `test`/`test:e2e`/`coverage` szkript
> hozzáadását igényli a `package.json`-hoz; ez külön feladat (a jelen dokumentum
> nem módosít kódot).

## 4. Tervezett unit tesztek

A `src/lib/**` tiszta logikája DB nélkül tesztelhető:

| Modul | Tesztesetek |
|---|---|
| `src/lib/guards.ts` — `ROLE_RANK` / `HALASZAT_ROLE_RANK` | A rangsor helyes: STAFF<ADMIN<OWNER; `minRole` küszöb döntései (elég / nem elég jogosultság). |
| `src/lib/auth.ts` — `hashPassword`/`verifyPassword` | Hash nem egyenlő a plaintexttel; helyes jelszó `true`, rossz `false`; `createSessionToken` megfelelő hosszú, egyedi. |
| `src/lib/utils/szam.ts` — `szam()` | Számokká alakítás; érvénytelen bemenetnél az alapérték; nem-szám stringek kezelése. |
| `halaszatok/route.ts` — `slugify` (kiemelendő/tesztelhető) | Ékezet-eltávolítás, kisbetűsítés, ütközés-feloldó utótag logikája. |
| `dolgozok/[tid]/route.ts` — `canManageTarget` | OWNER-t senki; ADMIN csak STAFF-ot; OWNER STAFF+ADMIN-t. |

> Ahol a logika jelenleg handleren belül inline (pl. `slugify`, `canManageTarget`,
> jelszó-generátor), a unit-tesztelhetőség érdekében megfontolandó tiszta
> függvénybe kiemelni — ez a tesztstratégia egyik javaslata (nem kötelező a
> teszteléshez, de javítja az izolációt).

## 5. Tervezett integration tesztek

Valós (teszt-)adatbázis ellen, a route handlereket meghívva. Fókusz a
tranzakciós és tenant-logikán:

- **Auth:** `register` → `login` → `me` → `logout` életciklus; duplikált email
  (409); rossz jelszó (401); inaktív fiók (401).
- **Halászat:** létrehozás OWNER tagsággal (AC1); slug-egyediség.
- **Tó:** létrehozás ADMIN-ként, listázás STAFF-ként (AC2); `TELELO` típus.
- **Halfaj:** létrehozás/átnevezés/inaktiválás; egyedi név tenanton belül (P2002 →
  409); FK-védett törlés (P2003 → 409 + inaktiválás javaslat) (AC3).
- **Telepítés/Kivét:** állomány nő/csökken, napló keletkezik, kivétnél
  készlet-ellenőrzés (nincs elég → 400) (AC4, AC6).
- **Áttelepítés:** forrás csökken, cél nő (upsert), két naplóesemény, tenant-check
  mindkét tóra (AC4, AC6).
- **Takarmánykészlet:** takarmány létrehozás/átnevezés/inaktiválás; egyedi név
  tenanton belül (P2002 → 409); mozgás (bevétel/felhasználás) rögzítésekor a
  `keszlet` tranzakcióban frissül; felhasználás a készlet alá → 422; FK-védett
  törlés (mozgással → 409 + inaktiválás javaslat).
- **Összesítő/summary/timeline:** aggregált értékek és paraméter-korlátok
  (`days`, `take`, `events`) helyessége.

## 6. Tervezett e2e tesztek (Playwright)

Kevés, de teljes folyamat:

1. **Fő folyamat:** regisztráció → halászat létrehozása → tó hozzáadása → halfaj
   felvétele → telepítés → dashboard/összesítő mutatja az állományt (AC1–AC4, AC6).
2. **Jogosultság:** STAFF felhasználó nem ér el ADMIN-műveletet (pl. tó
   létrehozás) — a UI/ękérés elutasít (AC5).
3. **Tenant-izoláció:** „A" halászat tagja nem látja „B" halászat tavát/adatát
   (AC7).

## 7. Negatív tesztek

A negatív tesztek elsőrendűek a thesis védhetősége szempontjából:

- **Jogosulatlan hozzáférés:** bejelentkezés nélküli kérés védett végpontra → 401;
  STAFF az ADMIN-only végpontokra (telepítés, kivét, tó-/halfaj-/dolgozó-kezelés)
  → 403.
- **Érvénytelen bemenet:** hiányzó/rossz típusú mezők (üres név, nem pozitív
  darab, hibás dátum, jelszó < 8) → 400; duplikált egyedi mező → 409.
- **Tenant-izoláció megsértése:** idegen halászathoz tartozó `[hid]` → 403;
  idegen tóra mutató `[toId]` egy adott `[hid]` alatt → 404
  (`assertToBelongsToTenant`). Kivét/áttelepítés tenant-idegen tóra → elutasítás.
- **Üzleti szabály:** kivét több darabra, mint a készlet → 400; áttelepítés
  cél=forrás → 400.
- **Ismert hiányok regresszióként:** a `threat-model.md`-ben jelölt
  hibabejelentés-végpont auth-hiányra teszt írandó, amely a jövőbeli javítás után
  elvárja a 401/403-at (jelenleg dokumentáltan átmegy auth nélkül — a teszt a
  célállapotot rögzíti, TODO-val jelölve).

## 8. Teszt-adat stratégia

- **Külön teszt-adatbázis** (saját `DATABASE_URL`), sosem az éles/fejlesztői DB.
- **Séma:** `prisma migrate deploy` a teszt-DB-re a futtatás előtt.
- **Izoláció:** minden teszt(csoport) tiszta állapotból induljon — tranzakcióba
  csomagolt teszt és visszagörgetés, vagy a táblák ürítése (truncate) + minimál
  seed `beforeEach`-ben.
- **Factory/seed helperek:** programatikus létrehozás (`createUser`,
  `createHalaszat`, `addTag`, `createTo`, `createHalfaj`) a determinisztikus,
  olvasható tesztekért.
- **Adatok jellege:** kizárólag **szintetikus** adat; valós személyes adat nem
  kerül tesztbe (összhangban a `privacy.md` AI-/adatkezelési szabályával).
- **Auth a tesztekben:** integration szinten a session-süti megszerzése a
  `login` végponton át, vagy közvetlen `Session` rekord létrehozása + süti
  beállítása helperrel.

## 9. Lefedettségi célok

| Terület | Cél (sor/ág) |
|---|---|
| `src/lib/**` (tiszta logika) | ≥ 90% |
| `src/app/api/**` (route handlerek) | ≥ 70% |
| Projekt összesen | ≥ 75% |
| Biztonsági ágak (RBAC, tenant-check, készlet-ellenőrzés) | 100% a kulcs-elágazásokra |

A lefedettség `@vitest/coverage-v8`-cal mérendő, és CI-ban riportálandó (lásd
`test-report.md` TODO-k). A számszerű célok minimumok; a biztonsági elágazásoknál
a teljes ág-lefedettség fontosabb, mint a globális százalék.

## 10. CI integráció (terv)

- A teszteknek a CI pipeline részeként kell futniuk: `lint` → `typecheck` →
  unit + integration (teszt-DB szolgáltatással) → e2e (Playwright) → coverage
  riport. A pipeline a `docs/05_security_ops/deployment.md` build-lépéseire épül.
- A bizonyítékok (CI-log, coverage, Playwright trace/screenshot) a `test-report.md`
  megfelelő szakaszaiba kerüljenek, ahogy elérhetővé válnak.
