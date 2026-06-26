# API Design

Ez a dokumentum a `src/app/api/**` alatti Next.js App Router route handlerek
alapján készült, és a tényleges, implementált végpontokat írja le. Csak létező
végpontok szerepelnek; ahol a viselkedés a kódból nem egyértelmű, `TODO` jelzi.

## Általános elvek

### Authentikáció és session

- **Session alapú**, `nh_session` nevű **HttpOnly** sütivel (`src/lib/auth.ts`).
- Bejelentkezéskor (`POST /api/auth/login`) vagy regisztrációkor véletlen 32 bájtos
  token generálódik; a süti a **nyers** tokent tárolja, az adatbázis (`Session`)
  csak a token **SHA-256 hash**-ét (`tokenHash`). A session élettartama 30 nap.
- Süti beállítások: `httpOnly: true`, `sameSite: "lax"`, `secure` csak
  production­ben, `path: "/"`.
- A jelszavak **bcrypt**-tel (cost 12) hash-eltek.
- A felhasználót a `getAuthUser()` oldja fel a sütiből; lejárt session esetén
  `null`. A guard helperek (`src/lib/guards.ts`) erre építenek.

### Jogosultság (RBAC)

A védett végpontok a `src/lib/guards.ts` helpereit használják:

- `requireUser()` — csak bejelentkezést követel (nincs szerepkör-ellenőrzés).
- `requireHalaszatRole(halaszatId, minRole)` — ellenőrzi, hogy a felhasználó
  aktív tagja-e a halászatnak, és szerepköre eléri-e a `minRole` szintet.
  Rangsor: `STAFF (1) < ADMIN (2) < OWNER (3)`.

A `requireToRole` / `requireToAccess` (tó-szintű szerepkör) helperek léteznek, de
a jelenlegi route-ok kizárólag `requireHalaszatRole`-t használnak.

> A teljes, szerepkörönkénti jogosultsági mátrix (ki láthat/módosíthat mit) és az
> ismert jogosultsági hiányosságok: [`docs/05_security_ops/role-matrix.md`](../05_security_ops/role-matrix.md).

### Tenant izoláció

- Minden `/api/halaszatok/[hid]/...` végpont a `[hid]` (halaszatId) köré épül, és
  `requireHalaszatRole`-lal ellenőrzi, hogy a hívó tagja-e az adott halászatnak.
- A tó-szintű végpontok ezen felül `assertToBelongsToTenant(toId, halaszatId)`
  hívással biztosítják, hogy a megadott tó valóban a `[hid]` halászathoz tartozik;
  ha nem, **404**-et adnak. Így egy halászat tagja nem érhet el más halászat tavát.
- A halfaj-műveletek `findFirst({ where: { azonosito, halaszatId } })` mintával
  szűrnek tenantra a módosítás előtt.

### Közös hibaformátum

A hibaválaszok JSON objektumok HTTP hibakóddal. **Két kulcskonvenció él
párhuzamosan a kódbázisban** (nincs egységesítve):

- `{ "error": "<üzenet>" }` — a halfaj-, tó-, művelet-, summary-, timeline-,
  összesítő- és naptár-végpontokon (a `jsonError(...)` helper, ill. a `dolgozok`
  végpontok `error` kulccsal).
- `{ "hiba": "<üzenet>" }` — a halászat-lista, halászat-részlet, dolgozó-PATCH/
  DELETE és hibabejelentés-végpontokon.

> TODO: a `error` vs. `hiba` kulcs nincs egységesítve. Release előtt érdemes egy
> közös hibaformátumra konszolidálni (a teljes API-n egységes kulcs + opcionális
> hibakód mező).

A sikeres válaszok burkolókulcsai is változnak végpontonként (`halaszatok`,
`item`, `items`, `to`, `toak`, `bejegyzes`, `adat`, `siker` stb.); az alábbi
táblázatok az egyes végpontoknál pontosítják.

---

## Auth végpontok

### POST /api/auth/register
- **Cél:** új felhasználó regisztrációja, majd automatikus bejelentkeztetés.
- **Jogosultság:** nyilvános (nem kell session).
- **Request body:** `{ email: string, password: string (min. 8), nev?: string }`
- **Siker:** `200` `{ user: { azonosito, email, nev } }` + `nh_session` süti.
- **Hibák:** `400` hibás adatok (hiányzó email/jelszó, jelszó < 8 karakter);
  `409` ha az email már foglalt.
- **Mellékhatás:** `Felhasznalo` létrejön, `Session` létrejön, süti beállítva.

### POST /api/auth/login
- **Cél:** bejelentkezés email + jelszóval.
- **Jogosultság:** nyilvános.
- **Request body:** `{ email: string, password: string }`
- **Siker:** `200` `{ user: { azonosito, email, nev } }` + `nh_session` süti.
- **Hibák:** `400` hiányzó email/jelszó; `401` hibás belépési adatok vagy inaktív
  fiók (azonos üzenet a felsorolás-elkerülés miatt).
- **Mellékhatás:** `Session` létrejön, süti beállítva.

### POST /api/auth/logout
- **Cél:** kijelentkezés.
- **Jogosultság:** nyilvános (süti alapján törli a sessiont, ha van).
- **Request body:** nincs.
- **Siker:** `200` `{ ok: true }`; a `Session` törlődik, a süti lejár.
- **Hibák:** —
- **Mellékhatás:** `Session` rekord törlése (`deleteMany` a tokenHash alapján).

### GET /api/auth/me
- **Cél:** az aktuális felhasználó lekérdezése.
- **Jogosultság:** süti alapján; auth nélkül is hív, csak `null`-t ad.
- **Siker:** `200` `{ user: { azonosito, email, nev } }` vagy `{ user: null }`.
- **Hibák:** —
- **Mellékhatás:** nincs.

---

## Halászat (tenant) végpontok

### GET /api/halaszatok
- **Cél:** a bejelentkezett felhasználó halászat-tagságainak listája.
- **Jogosultság:** `requireUser()` (bejelentkezés).
- **Siker:** `200` `{ halaszatok: [{ szerepkor, halaszat: { azonosito, nev, slug, aktiv, letrehozva } }] }` (csak aktív tagságok).
- **Hibák:** `401` `{ hiba }` ha nincs bejelentkezés.
- **Mellékhatás:** nincs.

### POST /api/halaszatok
- **Cél:** új halászat létrehozása; a létrehozó OWNER lesz.
- **Jogosultság:** `requireUser()`.
- **Request body:** `{ nev: string (min. 3) }`
- **Siker:** `201` `{ halaszat: { azonosito, nev, slug, ... } }`.
- **Hibák:** `401` nincs bejelentkezés; `400` `{ hiba }` ha a név < 3 karakter.
- **Mellékhatás:** `Halaszat` + `HalaszatTagsag(OWNER)` egy tranzakcióban; a `slug`
  a névből generálódik és ütközés esetén `-2`, `-3`… utótaggal egyedivé válik.
- **Megjegyzés:** a kódban `// TODO: előfizetés check` jelöli a későbbi
  előfizetés-ellenőrzés helyét.

### GET /api/halaszatok/[hid]
- **Cél:** egy halászat alapadatai.
- **Jogosultság:** `requireHalaszatRole(hid, "STAFF")`.
- **Siker:** `200` `{ halaszat: { azonosito, nev, slug, aktiv, letrehozva } }`.
- **Hibák:** `400` hibás azonosító; `401/403` jogosultság; `404` `{ hiba }` ha nincs ilyen halászat.

---

## Dolgozók (tagság) végpontok

### GET /api/halaszatok/[hid]/dolgozok
- **Cél:** a halászat dolgozóinak (tagságainak) listája.
- **Jogosultság:** `requireHalaszatRole(hid, "ADMIN")`.
- **Siker:** `200` `{ items: [{ azonosito, szerepkor, aktiv, letrehozva, felhasznalo: { azonosito, email, nev, aktiv } }], viewerRole }`.
- **Hibák:** `400` érvénytelen halászatazonosító; `401/403` jogosultság (`{ error }`).

### POST /api/halaszatok/[hid]/dolgozok
- **Cél:** dolgozó felvétele (meglévő felhasználó hozzárendelése vagy új létrehozása).
- **Jogosultság:** `requireHalaszatRole(hid, "ADMIN")`. Üzleti szabály: **ADMIN
  csak `STAFF`-ot vehet fel**; ADMIN+STAFF kombinációt a végpont `403`-mal tilt.
- **Request body:** `{ email: string, nev?: string, role: "ADMIN" | "STAFF" }`
- **Siker:** `200` `{ createdUser: boolean, user: {...}, tagsag: {...}, tempPassword: string | null }`. A `tempPassword` csak **újonnan létrehozott**
  felhasználónál nem `null` (meglévő fióknál nem állítjuk vissza a jelszót).
- **Hibák:** `400` érvénytelen JSON / e-mail / szerepkör; `401/403` jogosultság;
  `403` ha ADMIN nem STAFF szerepkört próbál kiosztani (`{ error }`).
- **Mellékhatás:** tranzakcióban `Felhasznalo` find-or-create (új esetén random
  14 karakteres ideiglenes jelszóval), majd `HalaszatTagsag` upsert (aktivál +
  szerepkört frissít).

### PATCH /api/halaszatok/[hid]/dolgozok/[tid]
- **Cél:** dolgozó szerepkörének és/vagy a felhasználó nevének módosítása.
- **Jogosultság:** `requireHalaszatRole(hid, "ADMIN")`, plusz cél-szabályok:
  OWNER célt senki nem módosíthat; ADMIN csak STAFF célt; **szerepkört csak OWNER**
  módosíthat; saját magát a hívó nem módosíthatja.
- **Request body:** `{ role?: "ADMIN" | "STAFF", nev?: string (üres, vagy min. 2) }`
- **Siker:** `200` `{ item: { azonosito, szerepkor, aktiv, letrehozva, felhasznalo: {...} } }`.
- **Hibák:** `400` hibás azonosító / túl rövid név / önmódosítás / érvénytelen
  szerepkör; `403` szerepkört csak OWNER / nincs jogosultság a célon; `404` nincs
  ilyen dolgozó ebben a halászatban (tenant izoláció). Hibakulcs: `{ hiba }`.
- **Mellékhatás:** `HalaszatTagsag.szerepkor` és/vagy `Felhasznalo.nev` frissül.

### DELETE /api/halaszatok/[hid]/dolgozok/[tid]
- **Cél:** dolgozó **soft-delete** (deaktiválás).
- **Jogosultság:** `requireHalaszatRole(hid, "ADMIN")`; ADMIN csak STAFF-ot, OWNER
  STAFF+ADMIN-t; saját magát nem deaktiválhatja; OWNER célt nem lehet.
- **Siker:** `200` `{ item: { azonosito, aktiv: false } }`.
- **Hibák:** `400` hibás azonosító / önmagát; `403` nincs jogosultság; `404` nincs
  ilyen dolgozó ebben a halászatban. Hibakulcs: `{ hiba }`.
- **Mellékhatás:** `HalaszatTagsag.aktiv = false` (rekord megmarad).

---

## Halfaj végpontok

### GET /api/halaszatok/[hid]/halfajok
- **Cél:** a halászat halfajainak listája.
- **Jogosultság:** `requireHalaszatRole(hid, "STAFF")`.
- **Query:** `active` — `0` esetén az inaktívak is megjelennek (alapból csak aktívak).
- **Siker:** `200` `{ items: [{ azonosito, nev, aktiv }], viewerRole }`.
- **Hibák:** `400` hibás azonosító; `401/403` jogosultság (`{ error }`).

### POST /api/halaszatok/[hid]/halfajok
- **Cél:** új halfaj létrehozása.
- **Jogosultság:** `requireHalaszatRole(hid, "ADMIN")`.
- **Request body:** `{ nev: string }`
- **Siker:** `201` `{ ok: true, item: { azonosito, nev, aktiv } }`.
- **Hibák:** `400` üres név; `409` ilyen nevű halfaj már létezik (Prisma `P2002`);
  `500` egyéb (`{ error }`).
- **Mellékhatás:** `Halfaj` létrejön `aktiv: true`-val.

### PATCH /api/halaszatok/[hid]/halfajok/[id]
- **Cél:** halfaj átnevezése és/vagy `aktiv` flag váltása.
- **Jogosultság:** `requireHalaszatRole(hid, "ADMIN")`; a halfaj tenantra szűrve
  (`azonosito, halaszatId`).
- **Request body:** `{ nev?: string, aktiv?: boolean }` (legalább egy mező).
- **Siker:** `200` `{ ok: true, item: { azonosito, nev, aktiv } }`.
- **Hibák:** `400` hibás azonosító / üres név / nincs frissítendő mező; `404` nem
  található; `409` névütközés (`P2002`); `500` egyéb (`{ error }`).

### DELETE /api/halaszatok/[hid]/halfajok/[id]
- **Cél:** halfaj **kemény** törlése.
- **Jogosultság:** `requireHalaszatRole(hid, "ADMIN")`; tenantra szűrve.
- **Siker:** `200` `{ ok: true }`.
- **Hibák:** `404` nem található; `409` `{ error, inaktivalhatjuk: true }` ha a
  halfaj készlethez/naplóhoz kötődik (idegen kulcs sértés, `P2003`/`P2014`) —
  ilyenkor inaktiválás javasolt; `500` egyéb.
- **Mellékhatás:** `Halfaj` törlése, ha nincs FK-hivatkozás.

---

## Takarmány (feed inventory) végpontok

### GET /api/halaszatok/[hid]/takarmanyok
- **Cél:** a halászat takarmányfajtáinak listája (aktuális készlettel).
- **Jogosultság:** `requireHalaszatRole(hid, "STAFF")`.
- **Query:** `active` — `0` esetén az inaktívak is megjelennek (alapból csak aktívak).
- **Siker:** `200` `{ items: [{ azonosito, nev, egyseg, keszlet, szin, aktiv }], viewerRole }`.
- **Hibák:** `400` hibás azonosító; `401/403` jogosultság (`{ error }`).

### POST /api/halaszatok/[hid]/takarmanyok
- **Cél:** új takarmányfajta létrehozása (kezdő készlet `0`).
- **Jogosultság:** `requireHalaszatRole(hid, "ADMIN")`.
- **Request body:** `{ nev: string, egyseg: string, szin?: string }`
- **Siker:** `201` `{ ok: true, item: { azonosito, nev, egyseg, keszlet, szin, aktiv } }`.
- **Hibák:** `400` üres név / üres egység; `409` ilyen nevű takarmány már létezik
  (`P2002`); `500` egyéb (`{ error }`).
- **Mellékhatás:** `Takarmany` létrejön `keszlet: 0`, `aktiv: true` értékkel.

### PATCH /api/halaszatok/[hid]/takarmanyok/[id]
- **Cél:** takarmány módosítása (név / egység / szín / `aktiv` flag).
- **Jogosultság:** `requireHalaszatRole(hid, "ADMIN")`; tenantra szűrve
  (`azonosito, halaszatId`).
- **Request body:** `{ nev?: string, egyseg?: string, szin?: string | null, aktiv?: boolean }` (legalább egy mező).
- **Siker:** `200` `{ ok: true, item: { azonosito, nev, egyseg, keszlet, szin, aktiv } }`.
- **Hibák:** `400` hibás azonosító / üres mező / nincs frissítendő mező; `404` nem
  található; `409` névütközés (`P2002`); `500` egyéb (`{ error }`).
- **Megjegyzés:** a `keszlet` ezen a végponton **nem** módosítható; a készlet
  kizárólag a mozgás-végponton keresztül változik.

### DELETE /api/halaszatok/[hid]/takarmanyok/[id]
- **Cél:** takarmány **kemény** törlése.
- **Jogosultság:** `requireHalaszatRole(hid, "ADMIN")`; tenantra szűrve.
- **Siker:** `200` `{ ok: true }`.
- **Hibák:** `404` nem található; `409` `{ error, inaktivalhatjuk: true }` ha a
  takarmányhoz mozgás kötődik (idegen kulcs sértés, `P2003`/`P2014`) — ilyenkor
  inaktiválás javasolt; `500` egyéb.
- **Mellékhatás:** `Takarmany` törlése, ha nincs FK-hivatkozás.

### GET /api/halaszatok/[hid]/takarmanyok/[id]/mozgasok
- **Cél:** egy takarmány készletmozgásainak listája (legújabb elöl).
- **Jogosultság:** `requireHalaszatRole(hid, "STAFF")` + a takarmány tenantra szűrve.
- **Query:** `limit` (alap 50, max 200).
- **Siker:** `200` `{ mozgasok: [{ azonosito, tipus, mennyiseg, datum, megjegyzes }] }`.
- **Hibák:** `400` hibás azonosító; `401/403` jogosultság (`{ error }`).

### POST /api/halaszatok/[hid]/takarmanyok/[id]/mozgasok
- **Cél:** készletmozgás rögzítése (bevétel vagy felhasználás) + a készlet frissítése.
- **Jogosultság:** `requireHalaszatRole(hid, "STAFF")` + a takarmány tenantra szűrve.
- **Request body:** `{ tipus: "BEVETEL" | "FELHASZNALVA", mennyiseg: number (>0), datum?: string, megjegyzes?: string }`
- **Siker:** `201` `{ ok: true, mozgas: {...}, ujKeszlet: number }`.
- **Hibák:** `400` érvénytelen típus / nem pozitív mennyiség / hibás dátum; `404`
  nem található takarmány; `422` ha a felhasználás a készletet negatívba vinné;
  `401/403`; `500` (`{ error }`).
- **Mellékhatás (tranzakció):** `TakarmanyMozgas` rekord létrejön, és a
  `Takarmany.keszlet` a mozgás előjelével (bevétel `+`, felhasználás `−`)
  frissül. A készlet nem mehet 0 alá.
- **Megjegyzés:** az etetési művelethez (`/etetes`) kötött **automatikus**
  felhasználás-mozgás **tervezett** (SZD2); jelenleg a mozgás kézi rögzítésű.

---

## Tó és műveleti végpontok

### GET /api/halaszatok/[hid]/toak
- **Cél:** a halászat tavainak listája.
- **Jogosultság:** `requireHalaszatRole(hid, "STAFF")`.
- **Siker:** `200` `{ toak: [{ azonosito, nev, tipus, aktiv, letrehozva }] }` (legújabb elöl).
- **Hibák:** `400` hibás azonosító; `401/403` jogosultság (`{ hiba }`).

### POST /api/halaszatok/[hid]/toak
- **Cél:** új tó létrehozása.
- **Jogosultság:** `requireHalaszatRole(hid, "ADMIN")`.
- **Request body:** `{ nev: string (min. 2), tipus?: "TO" | "TELELO" }` (alap `TO`).
- **Siker:** `201` `{ to: { azonosito, nev, tipus, aktiv, letrehozva } }`.
- **Hibák:** `400` túl rövid név; `401/403` jogosultság (`{ hiba }`).
- **Mellékhatás:** `To` létrejön a `halaszatId`-vel.

### GET /api/halaszatok/[hid]/toak/[toId]
- **Cél:** egy tó adatai + aktuális készlete halfajonként.
- **Jogosultság:** `requireHalaszatRole(hid, "STAFF")` + `assertToBelongsToTenant`.
- **Siker:** `200` `{ to, allomanyok: [{ azonosito, darab, minTomegKg, maxTomegKg, halfaj: { azonosito, nev } }] }`.
- **Hibák:** `400` hibás azonosító; `401/403` jogosultság; `404` a tó nem a
  halászathoz tartozik; `500` egyéb (`{ error }`).

### POST /api/halaszatok/[hid]/toak/[toId]/telepites
- **Cél:** telepítés — állomány növelése + telepítési rekord + napló.
- **Jogosultság:** `requireHalaszatRole(hid, "ADMIN")` + tenant-check.
- **Request body:** `{ halfajId: number, darab: number (>0), minTomegKg?: number, maxTomegKg?: number, forras?: string, megjegyzes?: string }`
- **Siker:** `201` `{ ok: true }`.
- **Hibák:** `400` hiányzó halfajId / nem pozitív darab; `401/403`; `404` tó nem a
  tenantban; `500` (`{ error }`).
- **Mellékhatás (tranzakció):** `HalAllomany` létrehozás vagy `darab` növelés;
  `Telepites` rekord; `NaploEsemeny(TELEPITES)`.

### POST /api/halaszatok/[hid]/toak/[toId]/kivetel
- **Cél:** kivét — állomány csökkentése + kivétel rekord + napló.
- **Jogosultság:** `requireHalaszatRole(hid, "ADMIN")` + tenant-check.
- **Request body:** `{ halfajId: number, darab: number (>0), datum?: string, ok?: string, megjegyzes?: string }`
- **Siker:** `201` `{ ok: true, kivetelAzonosito }`.
- **Hibák:** `400` hiányzó halfajId / nem pozitív darab / hibás dátum / nincs
  készlet / nincs elég készlet (a kért darab > elérhető); `401/403`; `404`; `500`.
- **Mellékhatás (tranzakció):** készlet ellenőrzés és csökkentés (0-nál a
  tömegtartomány nullázódik); `Kivetel` rekord; `NaploEsemeny(KIVETEL)`.

### POST /api/halaszatok/[hid]/toak/[toId]/etetes
- **Cél:** etetés rögzítése + napló.
- **Jogosultság:** `requireHalaszatRole(hid, "STAFF")` + tenant-check.
- **Request body:** `{ mennyisegKg: number (>0), datum?: string, tipus?: string, megjegyzes?: string }`
- **Siker:** `201` `{ azonosito, toId, mennyisegKg, tipus, datum, megjegyzes }`.
- **Hibák:** `400` mennyiség ≤ 0 / hibás dátum; `401/403`; `404`; `500` (`{ error }`).
- **Mellékhatás (tranzakció):** `Etetes` rekord; `NaploEsemeny(ETETES)`. Készletet
  nem módosít.

### POST /api/halaszatok/[hid]/toak/[toId]/attelepites
- **Cél:** áttelepítés — állomány mozgatása forrás tóból (`[toId]`) cél tóba.
- **Jogosultság:** `requireHalaszatRole(hid, "ADMIN")` + tenant-check **mindkét**
  tóra.
- **Request body:** `{ celToId: number, halfajId: number, darab: number (>0), megjegyzes?: string }`
- **Siker:** `201` `{ ok: true }`.
- **Hibák:** `400` hiányzó celToId / cél = forrás / hiányzó halfajId / nem pozitív
  darab / nincs elég készlet a forrásban; `401/403`; `404` valamelyik tó nem a
  tenantban; `500` (`{ error }`).
- **Mellékhatás (tranzakció):** forrás `HalAllomany` csökkentés; cél `HalAllomany`
  upsert/increment; **két** napló: `NaploEsemeny(KIVETEL)` a forráson és
  `NaploEsemeny(TELEPITES)` a célon.

### GET /api/halaszatok/[hid]/toak/[toId]/summary
- **Cél:** tó összefoglaló — készlet-snapshot, etetés-összeg (N nap), utolsó N esemény.
- **Jogosultság:** `requireHalaszatRole(hid, "STAFF")` + tenant-check.
- **Query:** `days` (1–90, alap 7), `events` (1–50, alap 10).
- **Siker:** `200` `{ to, summary: { osszDarab, etetes: { napok, osszegKg, darab } }, allomany, timeline }`.
- **Hibák:** `400` hibás azonosító; `401/403`; `404`; `500` (`{ error }`).

### GET /api/halaszatok/[hid]/toak/[toId]/timeline
- **Cél:** a tó naplóeseményeinek listája (legújabb elöl).
- **Jogosultság:** `requireHalaszatRole(hid, "STAFF")` + tenant-check.
- **Query:** `take` (1–200, alap 50).
- **Siker:** `200` `{ to: { azonosito, nev }, items: [{ azonosito, tipus, datum, leiras, darab, mennyisegKg, halfaj }] }`.
- **Hibák:** `400`; `401/403`; `404`; `500` (`{ error }`).

---

## Összesítő végpont

### GET /api/halaszatok/[hid]/osszesito
- **Cél:** halászat-szintű összesítő (dashboard): tavak száma, készlet
  fajonként, etetés N napra, eseményeloszlás, aktivitási trend.
- **Jogosultság:** `requireHalaszatRole(hid, "STAFF")`.
- **Query:** `days` (1–90, alap 30).
- **Siker:** `200` `{ toak: { ossz, aktiv }, halallomany: { osszDarab, fajokSzama, fajonkent }, etetes: { napok, osszegKg, darab }, esemenyEloszlas, aktivitasEsemenyek, tavakAllomany, days }`.
- **Hibák:** `400` hibás azonosító; `401/403` (`{ error }`).
- **Mellékhatás:** nincs (csak olvasás/aggregáció).

---

## Naptár végpontok

### GET /api/halaszatok/[hid]/naptar
- **Cél:** egy hónap naptárbejegyzései.
- **Jogosultság:** `requireHalaszatRole(hid, "STAFF")`.
- **Query:** `ev` (év, alap aktuális), `honap` (1–12, alap aktuális hónap).
- **Siker:** `200` `{ bejegyzesek: [{ azonosito, datum, cim, tartalom, szin, letrehozva }] }`.
- **Hibák:** `400` hibás azonosító; `401/403` (`{ error }`).

### POST /api/halaszatok/[hid]/naptar
- **Cél:** új naptárbejegyzés.
- **Jogosultság:** `requireHalaszatRole(hid, "STAFF")`.
- **Request body:** `{ cim: string, datum: string (YYYY-MM-DD), tartalom?: string, szin?: string }`
- **Siker:** `201` `{ bejegyzes: { azonosito, datum, cim, tartalom, szin } }`.
- **Hibák:** `400` hiányzó cím / hiányzó vagy érvénytelen dátum; `401/403` (`{ error }`).
- **Mellékhatás:** `NaptarBejegyzes` létrejön.

### PATCH /api/halaszatok/[hid]/naptar/[id]
- **Cél:** naptárbejegyzés módosítása.
- **Jogosultság:** `requireHalaszatRole(hid, "STAFF")`; a bejegyzés tenantra szűrve
  (`azonosito, halaszatId`).
- **Request body:** `{ cim?: string, tartalom?: string, szin?: string, datum?: string }` (legalább egy érvényes mező).
- **Siker:** `200` `{ bejegyzes: {...} }`.
- **Hibák:** `400` hibás azonosító / nincs frissítendő mező; `404` nem található;
  `401/403` (`{ error }`).

### DELETE /api/halaszatok/[hid]/naptar/[id]
- **Cél:** naptárbejegyzés törlése (hard delete).
- **Jogosultság:** `requireHalaszatRole(hid, "STAFF")`; tenantra szűrve.
- **Siker:** `200` `{ ok: true }`.
- **Hibák:** `400` hibás azonosító; `404` nem található; `401/403` (`{ error }`).
- **Mellékhatás:** `NaptarBejegyzes` törlése.

---

## Hibabejelentés végpontok

> **Biztonsági megjegyzés / TODO:** az alábbi három végpont a jelenlegi kódban
> **nem hív auth/RBAC guardot**. A `GET .../hibabejelentesek` bármely `[hid]`-re
> visszaadja a bejelentéseket (a tartalmazott `felhasznalo` mezővel együtt), a
> globális `POST` és `PATCH` pedig session és tenant-ellenőrzés nélkül fut. Ez
> tenant-izolációs és jogosultsági rés. Release előtt rendezendő: a listázás
> `requireHalaszatRole`-t, a státuszváltás megfelelő szerepkört igényeljen, és a
> bejelentéshez a `felhasznaloId`/`halaszatId` szerveroldalról (sessionből)
> származzon, ne a kérés törzséből.

### GET /api/halaszatok/[hid]/hibabejelentesek
- **Cél:** egy halászat hibabejelentéseinek listája (bejelentővel együtt).
- **Jogosultság:** **nincs ellenőrzés** (csak a `hid` egész szám validáció). TODO.
- **Siker:** `200` `{ adatok: [Hibabejelentes + felhasznalo: { azonosito, nev, email }] }`.
- **Hibák:** `400` érvénytelen halászat azonosító; `500` lekérési hiba (`{ hiba }`).

### POST /api/hibabejelentesek
- **Cél:** új hibabejelentés rögzítése (globális, nem `[hid]` alatt).
- **Jogosultság:** **nincs ellenőrzés**. A `felhasznaloId` és `halaszatId` a kérés
  törzséből jön (csak ha `number`), egyébként `null`. TODO: sessionből kellene.
- **Request body:** `{ targy: string (min. 3), leiras: string (min. 10), oldalUrl?: string, felhasznaloId?: number, halaszatId?: number }`
- **Siker:** `201` `{ siker: true, adat: Hibabejelentes (+ felhasznalo, halaszat) }`.
- **Hibák:** `400` tárgy < 3 / leírás < 10; `500` mentési hiba (`{ hiba }`).
- **Mellékhatás:** `Hibabejelentes` létrejön `statusz: UJ`-jal. A handler a kérés
  törzsét és az eredményt `console.log`-gal naplózza (TODO: production­ben
  eltávolítandó).

### PATCH /api/hibabejelentesek/[id]
- **Cél:** hibabejelentés státuszának módosítása.
- **Jogosultság:** **nincs ellenőrzés**. TODO: legalább halászat-szintű ADMIN/OWNER
  kellene, tenant-ellenőrzéssel.
- **Request body:** `{ statusz: "UJ" | "FOLYAMATBAN" | "MEGOLDVA" | "ELUTASITVA" }`
  (kis/nagybetű-érzéketlen, `toUpperCase` után validálva).
- **Siker:** `200` `{ siker: true, adat: Hibabejelentes }`.
- **Hibák:** `400` érvénytelen azonosító vagy státusz; `500` frissítési hiba
  (`{ hiba }`). Megjegyzés: nem létező `id` esetén a Prisma `update` dobhat, amit a
  handler `500`-ként ad vissza (TODO: 404 lenne helyesebb).

---

## Végpont-összesítő

| Metódus | Útvonal | Min. szerepkör |
|---|---|---|
| POST | `/api/auth/register` | nyilvános |
| POST | `/api/auth/login` | nyilvános |
| POST | `/api/auth/logout` | nyilvános |
| GET | `/api/auth/me` | nyilvános (session opcionális) |
| GET | `/api/halaszatok` | bejelentkezett |
| POST | `/api/halaszatok` | bejelentkezett |
| GET | `/api/halaszatok/[hid]` | STAFF |
| GET | `/api/halaszatok/[hid]/dolgozok` | ADMIN |
| POST | `/api/halaszatok/[hid]/dolgozok` | ADMIN (ADMIN csak STAFF-ot) |
| PATCH | `/api/halaszatok/[hid]/dolgozok/[tid]` | ADMIN (szerepkör: OWNER) |
| DELETE | `/api/halaszatok/[hid]/dolgozok/[tid]` | ADMIN |
| GET | `/api/halaszatok/[hid]/halfajok` | STAFF |
| POST | `/api/halaszatok/[hid]/halfajok` | ADMIN |
| PATCH | `/api/halaszatok/[hid]/halfajok/[id]` | ADMIN |
| DELETE | `/api/halaszatok/[hid]/halfajok/[id]` | ADMIN |
| GET | `/api/halaszatok/[hid]/takarmanyok` | STAFF |
| POST | `/api/halaszatok/[hid]/takarmanyok` | ADMIN |
| PATCH | `/api/halaszatok/[hid]/takarmanyok/[id]` | ADMIN |
| DELETE | `/api/halaszatok/[hid]/takarmanyok/[id]` | ADMIN |
| GET | `/api/halaszatok/[hid]/takarmanyok/[id]/mozgasok` | STAFF |
| POST | `/api/halaszatok/[hid]/takarmanyok/[id]/mozgasok` | STAFF |
| GET | `/api/halaszatok/[hid]/toak` | STAFF |
| POST | `/api/halaszatok/[hid]/toak` | ADMIN |
| GET | `/api/halaszatok/[hid]/toak/[toId]` | STAFF |
| POST | `/api/halaszatok/[hid]/toak/[toId]/telepites` | ADMIN |
| POST | `/api/halaszatok/[hid]/toak/[toId]/kivetel` | ADMIN |
| POST | `/api/halaszatok/[hid]/toak/[toId]/etetes` | STAFF |
| POST | `/api/halaszatok/[hid]/toak/[toId]/attelepites` | ADMIN |
| GET | `/api/halaszatok/[hid]/toak/[toId]/summary` | STAFF |
| GET | `/api/halaszatok/[hid]/toak/[toId]/timeline` | STAFF |
| GET | `/api/halaszatok/[hid]/osszesito` | STAFF |
| GET | `/api/halaszatok/[hid]/naptar` | STAFF |
| POST | `/api/halaszatok/[hid]/naptar` | STAFF |
| PATCH | `/api/halaszatok/[hid]/naptar/[id]` | STAFF |
| DELETE | `/api/halaszatok/[hid]/naptar/[id]` | STAFF |
| GET | `/api/halaszatok/[hid]/hibabejelentesek` | **nincs (TODO)** |
| POST | `/api/hibabejelentesek` | **nincs (TODO)** |
| PATCH | `/api/hibabejelentesek/[id]` | **nincs (TODO)** |
