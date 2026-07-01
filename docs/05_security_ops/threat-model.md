# Threat Model

Ez a dokumentum a Németh Horgászat rendszer fenyegetésmodellje **STRIDE**
módszertan szerint. A megállapítások a kódbázis tényleges állapotán alapulnak
(`src/lib/auth.ts`, `src/lib/guards.ts`, `src/lib/tenant/*`, `src/app/api/**`,
`prisma/schema.prisma`). A cél a thesis-szintű, védhető biztonsági áttekintés:
mit védünk, hol vannak a határok, milyen konkrét fenyegetések állnak fenn, ezekre
milyen védelem van, és mi a maradék (reziduális) kockázat.

## 1. Rendszer áttekintés és scope

- **Architektúra:** Next.js (App Router) monolit — frontend + API Routes egy
  kódbázisban, Prisma ORM, MySQL adatbázis (lásd `docs/02_architecture/`).
- **Authentikáció:** session alapú, `nh_session` HttpOnly süti (`src/lib/auth.ts`).
- **Multi-tenant:** minden adat egy `Halaszat` (tenant) alá tartozik; a
  jogosultságot halászat-szintű szerepkör adja (`HalaszatTagsag`).
- **Scope-on belül:** alkalmazás auth/RBAC, tenant-izoláció, adatkezelés, API
  bemenetkezelés, üzemeltetési titokkezelés.
- **Scope-on kívül:** a hosting szolgáltató (Hostinger/MySQL) fizikai és hálózati
  biztonsága, a böngésző és az operációs rendszer biztonsága.

## 2. Eszközök (Assets)

| # | Eszköz | Érzékenység | Megjegyzés |
|---|---|---|---|
| A1 | Felhasználói hitelesítő adatok (jelszó-hash) | Magas | `Felhasznalo.jelszoHash`, bcrypt (cost 12). |
| A2 | Session tokenek | Magas | Nyers token a sütiben; DB-ben csak SHA-256 hash (`Session.tokenHash`). |
| A3 | Személyes adatok | Közepes | `email`, `nev`; lásd `privacy.md`. |
| A4 | Tenant üzleti adat | Közepes | Tavak, halállomány, telepítés/kivét/etetés, napló. |
| A5 | Auditnapló | Közepes | `NaploEsemeny` — integritása fontos a visszakövethetőséghez. |
| A6 | Ideiglenes jelszavak | Magas | Dolgozó felvételekor generált temp jelszó (egyszer adjuk vissza). |
| A7 | Üzemeltetési titkok | Magas | `DATABASE_URL` (DB hitelesítő adatok). |

## 3. Bizalmi határok (Trust Boundaries)

1. **Böngésző ↔ Szerver** — nem megbízható kliens; minden bemenet ellenőrzendő
   szerveroldalon. A süti HttpOnly, így JS-ből nem olvasható.
2. **API réteg ↔ Adatbázis** — a Prisma az egyetlen DB-hozzáférési út;
   paraméteres lekérdezések (nincs nyers SQL-összefűzés).
3. **Tenant ↔ Tenant** — logikai határ: minden tenant-adat ugyanabban a DB-ben él,
   az izolációt az alkalmazáslogika (`requireHalaszatRole` +
   `assertToBelongsToTenant`) biztosítja, nem külön séma/DB.
4. **Alkalmazás ↔ Üzemeltetési titkok** — a `DATABASE_URL` környezeti változóban,
   nem a repóban (`.env*` gitignore-olt).

## 4. Támadási felületek (Attack Surfaces)

- Nyilvános auth végpontok: `POST /api/auth/register`, `POST /api/auth/login`
  (nincs előzetes auth → brute-force és enumeráció célpontja).
- Session süti (`nh_session`) — eltérítés (XSS/MITM) esetén teljes
  fiókátvétel.
- Tenant-hatókörös végpontok: `/api/halaszatok/[hid]/**` — IDOR/tenant-átlépés
  veszélye, ha a `[hid]`/`[toId]` ellenőrzése hiányos.
- Hibabejelentés végpontok: `GET /api/halaszatok/[hid]/hibabejelentesek`,
  `POST /api/hibabejelentesek`, `PATCH /api/hibabejelentesek/[id]` — **auth + RBAC
  kikényszerítve** (korábban auth nélkül futottak; rendezve, lásd 6/3).
- Felhasználói szabad szöveg (megjegyzések, hibabejelentés tárgy/leírás) — tárolt
  XSS kockázat a megjelenítésnél.

## 5. STRIDE elemzés

### S — Spoofing (identitáshamisítás)
- **Fenyegetés:** ellopott vagy kitalált session-nel más felhasználónak adja ki
  magát a támadó; jelszó brute-force.
- **Védelem:** 256 bites random token (`crypto.randomBytes(32)`), DB-ben csak
  SHA-256 hash; HttpOnly + `secure` (prod) süti; bcrypt cost 12 jelszó-hash;
  inaktív fiók (`aktiv=false`) nem léphet be; egységes „Hibás belépési adatok”
  üzenet (nem árulja el, hogy az email létezik-e).
- **Reziduális kockázat:** **nincs login rate limiting / lockout** → automatizált
  jelszótörés lehetséges (lásd 6. szakasz, ismert hiány).

### T — Tampering (adatmódosítás)
- **Fenyegetés:** kérés törzsének manipulálása jogosulatlan állapotváltáshoz;
  napló meghamisítása; tenant-idegen rekord módosítása.
- **Védelem:** Prisma paraméteres lekérdezések; írási műveletek
  `prisma.$transaction`-ben (telepítés/kivét/etetés/áttelepítés atomi);
  tenant-szűrés módosítás előtt (`findFirst({ where: { azonosito, halaszatId } })`).
- **Reziduális kockázat:** ~~a hibabejelentés `POST` a `felhasznaloId`/`halaszatId`
  mezőt a kérés törzséből veszi~~ **(megoldva — a `felhasznaloId` mostantól
  sessionből származik, `halaszatId`-hez STAFF tagság kell).** Továbbra is nincs
  szervezett bemenet-validációs réteg (pl. zod); a mezők kézi parse-olással.

### R — Repudiation (letagadhatóság)
- **Fenyegetés:** felhasználó letagadja a műveletét (pl. nagy kivét).
- **Védelem:** `NaploEsemeny` auditnapló minden fontos műveletnél, idő­bélyeggel és
  leírással; áttelepítésnél forrás+cél esemény is keletkezik. **Sprint 1 (2026-06-26):
  actor rögzítés** — a `NaploEsemeny` és a `TakarmanyMozgas` mostantól tárolja a
  cselekvő `felhasznaloId`-ját (a **sessionből**, nem a kérés törzséből) a
  telepítés/kivét/etetés/áttelepítés és a takarmánymozgás műveleteknél; a
  read-végpontok `rogzitoNev`-et adnak vissza.
- **Reziduális kockázat (csökkent, de nem nulla):** ~~a napló nem rögzíti a
  cselekvő azonosítóját~~ **rendezve az új műveletekre**. Ami **még hiányzik**: a
  művelet **szerkesztésének/érvénytelenítésének** és a **verziózott előzménynek** a
  naplózása (ki, mikor, mit módosított/vont vissza) — jelenleg a műveletek nem
  szerkeszthetők/érvényteleníthetők auditáltan. Emellett a `felhasznaloId`
  **nullable** (régi sorok / rendszer-események null actorral). TODO: edit/invalidate
  audit + verziózás (következő sprint).

### I — Information Disclosure (információszivárgás)
- **Fenyegetés:** személyes adat, jelszó vagy token kiszivárgása; tenant-idegen
  adat elérése; logokban érzékeny adat.
- **Védelem:** jelszó sosem plaintext (bcrypt); session nyers token nincs DB-ben;
  `select`-tel szűkített válaszmezők; tenant-izoláció a guardokban.
- **Reziduális kockázat:**
  - A Prisma kliens **minden lekérdezést logol** (`log: ["query"]` a
    `src/lib/prisma.ts`-ben) — production­ben ez érzékeny paramétereket írhat a
    szerverlogba (ismert hiány, lásd 6.).
  - ~~A hibabejelentés `POST` handler `console.log`-olja a kérés törzsét és az
    eredményt.~~ **(megoldva — a `console.log`-ok eltávolítva; csak `console.error`
    maradt váratlan szerverhibára.)**
  - ~~`GET .../hibabejelentesek` auth nélkül adja vissza a bejelentéseket a
    bejelentő nevével/emailjével együtt.~~ **(megoldva — `requireHalaszatRole(STAFF)`
    + halászatra szűrt lista.)**

### D — Denial of Service (szolgáltatásmegtagadás)
- **Fenyegetés:** auth végpontok terheléses elárasztása; költséges aggregációk
  ismételt hívása.
- **Védelem:** az aggregáló végpontok korlátozzák a paramétereket (`days` 1–90,
  `take` 1–200, `events` 1–50), ami megakadályozza a túlzott lekéréseket.
- **Reziduális kockázat:** **nincs alkalmazás-szintű rate limiting**; a bcrypt
  (cost 12) drága, így a `login`/`register` elárasztása CPU-t terhel. Mitigáció
  jellemzően a reverse proxy / hosting szintjén várható (scope-on kívül).

### E — Elevation of Privilege (jogosultság-emelés)
- **Fenyegetés:** STAFF ADMIN-műveletet végez; ADMIN OWNER-jogot szerez; tenant-átlépés.
- **Védelem:** rangsoros RBAC két szinten (`HALASZAT_ROLE_RANK`:
  STAFF<ADMIN<OWNER); írási műveletek `ADMIN`/`OWNER` minimumhoz kötve
  (telepítés, kivét, áttelepítés, halfaj-/tó-/dolgozó-kezelés); a dolgozó-kezelés
  külön szabályokkal (ADMIN csak STAFF-ot vehet fel; szerepkört csak OWNER vált;
  saját magát nem módosíthatja). Tenant-átlépés ellen `assertToBelongsToTenant`.
- **Reziduális kockázat:** ~~a hibabejelentés-végpontok auth nélkül futnak → bárki
  módosíthat státuszt vagy listázhat~~ **(megoldva — auth + RBAC kikényszerítve;
  a státuszváltás a bejelentés saját halászatában ADMIN/OWNER-höz kötött,
  tenant-átlépés kizárva).**

## 6. Ismert hiányosságok (current known gaps)

A feladat által kiemelt, kódban visszaigazolt hiányok — release előtt rendezendők:

1. **Nincs login rate limiting / lockout.** A `POST /api/auth/login` és
   `register` korlátlanul próbálható → brute-force / fiók-enumeráció kockázat.
   *Javaslat:* IP + email alapú próbálkozás-számláló, exponenciális késleltetés
   vagy ideiglenes zárolás; middleware vagy reverse proxy szinten.
2. **Inkonzisztens hibakulcs: `error` vs `hiba`.** A végpontok két különböző JSON
   kulccsal adnak hibát (lásd `docs/03_design/api-design.md`). Ez nem közvetlen
   sebezhetőség, de növeli a hibakezelési hibák esélyét a kliensen, és nehezíti az
   egységes biztonsági naplózást. *Javaslat:* egységes hibaformátum + opcionális
   hibakód.
3. ~~**Hibabejelentés-végpontok jogosultsági felülvizsgálata szükséges.**~~
   **Megoldva (2026-06-26).** A `GET /api/halaszatok/[hid]/hibabejelentesek`
   mostantól `requireHalaszatRole(STAFF)`-ot követel és csak az adott halászat
   bejelentéseit adja vissza; a `POST /api/hibabejelentesek` `requireUser`-t
   követel, a `felhasznaloId` a **sessionből** jön (a body mezőjét figyelmen kívül
   hagyja), és `halaszatId` megadásakor STAFF tagságot ellenőriz; a
   `PATCH /api/hibabejelentesek/[id]` betölti a bejelentést (`404`, ha nincs), és a
   bejelentés **saját** halászatára követel ADMIN/OWNER-t (globálisnál csak a
   bejelentő). A döntés a unit-tesztelt `canUpdateHibabejelentesStatus`-ban
   (`src/lib/roles.ts`). Lásd `docs/05_security_ops/role-matrix.md` §2.5.
4. **Query logging ne szivárogtasson production­ben.** A `src/lib/prisma.ts`
   `log: ["query"]` beállítása minden lekérdezést (paraméterekkel) a logba ír.
   *Javaslat:* a log szint kötése `NODE_ENV`-hez (prod: csak `error`/`warn`),
   és a `console.log`-ok eltávolítása a hibabejelentés handlerből.

## 7. Fenyegetés → védelem → reziduális kockázat mátrix

| Fenyegetés | STRIDE | Jelenlegi védelem | Reziduális kockázat |
|---|---|---|---|
| Jelszó brute-force | S, D | bcrypt cost 12, egységes hibaüzenet | **Magas** — nincs rate limit |
| Session-eltérítés | S, I | HttpOnly, `secure` (prod), hashelt token DB-ben | Közepes — `sameSite: lax`, nincs explicit CSRF token |
| Tenant-átlépés (IDOR) | E, I | `requireHalaszatRole` + `assertToBelongsToTenant` (a hibabejelentéseken is) | Alacsony a fő API-n; **Alacsony** a hibabejelentéseknél (rendezve) |
| Jogosulatlan státuszváltás (hibabejelentés) | E, T | `requireUser` + a bejelentés saját halászatára `requireHalaszatRole(ADMIN)` (globálisnál a bejelentő) | **Alacsony** — auth + RBAC kikényszerítve |
| Érzékeny adat logban | I | szűkített `select`; `console.log` eltávolítva a hibabejelentés-handlerekből | **Közepes** — még megvan a Prisma query log (prod) |
| Napló-letagadás | R | `NaploEsemeny` + `TakarmanyMozgas` időbélyeggel **és cselekvő `felhasznaloId`-val** (sessionből) | **Alacsony-közepes** — az actor rögzül; hiányzik még az edit/invalidate audit + verziózás |
| Tárolt XSS szabad szövegből | T, I | React alapból escapel | Alacsony–közepes — felülvizsgálandó a megjelenítés |
| DB titok kiszivárgása | I | `.env*` gitignore | Alacsony — kézi titokkezelés, lásd `deployment.md` |

## 8. Összegzés és prioritás

A rendszer alapvető védelmi mechanizmusai (hashelt jelszó, hashelt session-token,
kétszintű RBAC, tenant-izoláció a fő API-n, tranzakciós írás, auditnapló) jelen
vannak és helyesek. A korábbi 1. prioritású tétel — a **hibabejelentés-végpontok
jogosultságolása** — **megoldva** (lásd 6/3). A hátralévő, release előtt kezelendő
tételek prioritás szerint: **(1)** login rate limiting, **(2)** production
query/console logging visszafogása (Prisma query log), **(3)** ~~napló
cselekvő-azonosító~~ **részben rendezve (Sprint 1: actor a naplón és a
takarmánymozgáson); hátra: edit/invalidate audit + verziózás**, **(4)** egységes
hibaformátum és bemenet-validáció.
