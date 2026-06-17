# Operations Runbook

Üzemeltetési kézikönyv a Németh Horgászat rendszerhez. Minden incidens egységes
szerkezetben: **tünetek → diagnózis → azonnali elhárítás → hosszú távú javítás**.
Kapcsolódó dokumentumok: `deployment.md`, `threat-model.md`, `privacy.md`.

## Általános elvek

- Minden beavatkozás előtt rögzítsd a tüneteket (időpont, hibaüzenet, érintett
  felhasználó/halászat).
- Adatromboló lépés (DB írás, migráció, visszaállítás) **csak friss mentés után**.
- Production­ben kerüld a `console.log`-ot és a kézi adatmódosítást; minden
  beavatkozás legyen visszakövethető.

## Egészség-ellenőrzés (alap)

> TODO: dedikált health-check végpont jelenleg nincs. Helyettesítő ellenőrzés:
> a `GET /api/auth/me` válaszol-e (alkalmazás él), és a Prisma tud-e csatlakozni
> az adatbázishoz. Release előtt ajánlott egy `GET /api/health` végpont
> (app + DB ping).

---

## Incidens 1 — Adatbázis nem elérhető

**Tünetek**
- Az oldalak/endpointok 500-as hibát adnak; a szerverlogban Prisma kapcsolati
  hiba (pl. `P1001` „Can't reach database server”, `P1000` auth hiba, vagy
  connection timeout).
- Bejelentkezés és minden adatművelet megáll.

**Diagnózis**
1. Ellenőrizd a MySQL szerver állapotát a hostingon (fut-e, elérhető-e).
2. Ellenőrizd a `DATABASE_URL`-t (helyes host/port/user/jelszó/DB-név,
   nem rotálódott-e a jelszó).
3. Hálózat/tűzfal: az app hosztja eléri-e a DB portját.
4. Kapcsolat-limit: nem merült-e ki a MySQL `max_connections` (a fejlesztői
   Prisma singleton ezt mérsékli, de túlterhelésnél előfordulhat).

**Azonnali elhárítás**
- Ha a DB leállt: indítsd újra / kérd a hosting támogatást.
- Ha a `DATABASE_URL` rossz vagy elavult: javítsd a környezeti változót és indítsd
  újra az alkalmazást.
- Ha kapcsolat-kimerülés: indítsd újra az app processzt a kapcsolatok
  felszabadításához.

**Hosszú távú javítás**
- Health-check + monitoring/alert a DB elérhetőségére.
- Connection pool méret és időtúllépés tudatos beállítása.
- DB magas rendelkezésre állás / automatikus újraindítás a hosting szintjén.

---

## Incidens 2 — Sikertelen migráció

**Tünetek**
- A deploy a `npx prisma migrate deploy` lépésnél elbukik.
- A Prisma „failed/pending migration” állapotot jelez; az alkalmazás esetleg
  inkonzisztens sémával indulna.

**Diagnózis**
1. Olvasd a migrációs hibát: melyik migráció, milyen SQL hiba (pl. ütköző
   constraint, meglévő adat sérti az új szabályt — vö. a `To.halaszatId`
   nullable legacy-megfontolás a `data-model.md`-ben).
2. Ellenőrizd a `prisma/migrations/` és a DB `_prisma_migrations` tábla állapotát
   (mi alkalmazódott, mi maradt függőben).
3. Állapítsd meg, hogy a hiba séma- vagy adat-eredetű.

**Azonnali elhárítás**
- **Állítsd meg a deployt**; ne indítsd az alkalmazást fél-migrált sémával.
- Ha biztonságos: állítsd vissza az adatbázist a **migráció előtti mentésből**
  (lásd `deployment.md` rollback), és térj vissza az előző app-verzióra.
- Ne futtass `migrate dev`-et vagy kézi `db push`-t éles DB-n a hiba „megkerülésére”.

**Hosszú távú javítás**
- Migráció előtti kötelező mentés a deploy pipeline-ban.
- Migrációk tesztelése staging/másolat adatbázison éles deploy előtt.
- Adat-eredetű ütközéseknél előbb adattisztító migráció, csak utána a
  constraint-szigorítás.

---

## Incidens 3 — Bejelentkezési / session probléma

**Tünetek**
- A felhasználók nem tudnak belépni, vagy azonnal „kijelentkeznek”.
- Helyes jelszóval is „Hibás belépési adatok”, vagy a védett oldalak 401-et adnak.

**Diagnózis**
1. **HTTPS / `secure` süti:** production­ben a süti `secure: true`
   (`src/lib/auth.ts`). HTTP-n a böngésző nem tárolja a sütit → „azonnali
   kijelentkezés”. Ellenőrizd, hogy HTTPS-en fut-e a rendszer.
2. **Fiók állapot:** a `Felhasznalo.aktiv=false` fiók nem léphet be (login 401).
3. **Session lejárat:** lejárt session (`Session.lejar < now`) → `getAuthUser`
   `null`-t ad; a felhasználónak újra be kell lépnie (30 napos TTL).
4. **DB:** ha a session-írás/-olvasás hibázik, nézd az Incidens 1-et.
5. **Süti-tartomány/útvonal:** fordított proxy mögött a süti `path:"/"` és a
   domain konfiguráció helyes-e.

**Azonnali elhárítás**
- HTTPS hiánya esetén állítsd helyre a TLS-t (a `secure` süti ezt igényli).
- Téves deaktiválásnál: a `Felhasznalo.aktiv` visszaállítása (ellenőrzött módon).
- Tömeges „kijelentkezés” deploy után általában elvárt, ha a session-tábla
  ürült/változott; tájékoztasd a felhasználókat az újra-belépésről.

**Hosszú távú javítás**
- Lejárt sessionök rendszeres takarítása (cron) — lásd `privacy.md` 3. szakasz.
- Login rate limiting bevezetése (a brute-force és a „zár” jellegű hibák
  elkülönítéséhez) — lásd `threat-model.md` 6/1.
- Egységesebb auth-hibakezelés (vö. `error` vs `hiba` inkonzisztencia).

---

## Incidens 4 — Jogosulatlan tenant-hozzáférés (gyanú vagy bejelentés)

**Tünetek**
- Felhasználó más halászat adatát látja/módosítja, vagy erre utaló bejelentés
  érkezik.
- A logban tenant-idegen `[hid]`/`[toId]` elérési kísérletek.

**Diagnózis**
1. **A fő API:** a `/api/halaszatok/[hid]/**` végpontok `requireHalaszatRole`-lal
   és tó-műveleteknél `assertToBelongsToTenant`-tal védettek — ellenőrizd a
   logokból, hogy az érintett kérés ezeken átment-e (404/403 várt idegen
   tenantnál).
2. **Ismert gyenge pont:** a hibabejelentés-végpontok
   (`GET /api/halaszatok/[hid]/hibabejelentesek`, `POST /api/hibabejelentesek`,
   `PATCH /api/hibabejelentesek/[id]`) **jelenleg auth nélkül** futnak, és a POST a
   `felhasznaloId`/`halaszatId` mezőt a kérés törzséből veszi. Elsőként ezeket
   vizsgáld, ha hibabejelentés-adat szivárgott vagy módosult.
3. Azonosítsd az érintett felhasználót/tenantot és a hozzáférés módját
   (`HalaszatTagsag` jogosultságok ellenőrzése).

**Azonnali elhárítás**
- Ha aktív visszaélés gyanúja áll fenn a hibabejelentés-végpontokon: korlátozd
  azokat reverse proxy / hosting szinten (vagy ideiglenesen tiltsd), amíg az
  authorizáció be nem épül.
- Vond vissza a téves jogosultságot (`HalaszatTagsag` szerepkör/`aktiv`
  felülvizsgálata), szükség esetén érintett session(ök) érvénytelenítése a
  `Session` rekordok törlésével.
- Dokumentáld az incidenst és az érintett adatkört (adatvédelmi értesítési
  kötelezettség mérlegelése — lásd `privacy.md`).

**Hosszú távú javítás**
- A hibabejelentés-végpontok jogosultságolása: listázás/státuszváltás megfelelő
  halászat-szintű szerepkörhöz kötése; a szerző/tenant sessionből, ne a kérés
  törzséből (lásd `threat-model.md` 6/3).
- Automatizált tesztek a tenant-izolációra (idegen `[hid]`/`[toId]` → 403/404).
- Biztonsági naplózás a megtagadott hozzáférésekről, riasztással.
