# Privacy & Data Protection

Ez a dokumentum a Németh Horgászat rendszer adatkezelési és adatvédelmi
megközelítését írja le. A tárolt adatok köre a `prisma/schema.prisma` alapján
tényszerű; az elvek GDPR-tudatos, thesis-szintű keretet adnak. (Ez nem jogi
dokumentum; éles üzem előtt jogi felülvizsgálat ajánlott.)

## 1. Tárolt személyes adatok

| Adat | Hol (modell.mező) | Típus | Megjegyzés |
|---|---|---|---|
| E-mail cím | `Felhasznalo.email` | Azonosító/kapcsolattartás | Egyedi; login azonosító. |
| Név | `Felhasznalo.nev` | Opcionális | Megjeleníthető név. |
| Jelszó (hash) | `Felhasznalo.jelszoHash` | Hitelesítő | **bcrypt** hash (cost 12); plaintext sosem tárolódik. |
| Fiók állapot | `Felhasznalo.aktiv` | Metaadat | Deaktivált fiók nem léphet be. |
| Időbélyegek | `Felhasznalo.letrehozva/frissitve` | Metaadat | Audit célú. |
| Session token (hash) | `Session.tokenHash` | Hitelesítő | A nyers token csak a böngésző sütijében; DB-ben SHA-256 hash. |
| Session lejárat | `Session.lejar` | Metaadat | 30 napos élettartam. |
| Tagság + szerepkör | `HalaszatTagsag`, `ToTagsag` | Kapcsolat/jogosultság | Felhasználó ↔ halászat/tó + szerepkör. |
| Hibabejelentés szövege | `Hibabejelentes.targy/leiras/oldalUrl` | Szabad szöveg | **Tartalmazhat személyes adatot**, ha a felhasználó beír ilyet. |
| Hibabejelentés kapcsolat | `Hibabejelentes.felhasznaloId` | Opcionális | Ki tette a bejelentést (ha kötött). |

> **Ideiglenes jelszó:** dolgozó felvételekor a rendszer egyszer használatos temp
> jelszót generál és **csak a válaszban, egyszer** adja vissza (a DB-ben már
> hashelve tárolódik). Ezt biztonságos csatornán kell a dolgozóhoz eljuttatni, és
> első bejelentkezéskor cseréltetni (TODO: kötelező jelszócsere folyamat).

**Nem tárolt** (jelenleg): telefonszám, lakcím, pénzügyi/fizetési adat,
születési dátum, helyadat. A tenant üzleti adatai (tavak, halállomány, telepítés,
etetés, napló) nem személyes adatok, de üzletileg érzékenyek.

## 2. Az adatkezelés célja

- **Hitelesítés és hozzáférés-kezelés:** e-mail + jelszó-hash a bejelentkezéshez,
  session a munkamenet fenntartásához.
- **Jogosultságkezelés:** tagság és szerepkör alapján a megfelelő halászat/tó
  adataihoz való hozzáférés.
- **Szolgáltatásnyújtás:** a halgazdasági nyilvántartás (állomány, műveletek,
  napló, naptár) működtetése.
- **Üzemeltetés és hibajavítás:** hibabejelentések fogadása és kezelése.
- **Auditálhatóság:** műveletek visszakövethetősége (`NaploEsemeny`).

Az adatkezelés a szolgáltatás nyújtásához szükséges mértékre korlátozódik
(adattakarékosság elve).

## 3. Megőrzés és törlés

- **Felhasználói fiók:** a fiók fennállásáig tárolódik. Megszüntetéskor a séma
  cascade/SetNull szabályai szerint:
  - `Felhasznalo` törlésekor a `Session`, `HalaszatTagsag`, `ToTagsag` rekordok
    **cascade** törlődnek.
  - A `Hibabejelentes.felhasznaloId` **SetNull** lesz (a bejelentés anonimizálva
    megmarad).
- **Session:** 30 nap után lejár (`Session.lejar`); kijelentkezéskor azonnal
  törlődik (`deleteSession`). TODO: a lejárt sessionök rendszeres takarítása
  (jelenleg lejárat-szűréssel hatástalanítva, de a sor a DB-ben maradhat).
- **Tenant adat:** a `Halaszat` törlésekor a hozzá tartozó tavak, halfajok, napló,
  naptár cascade törlődnek; a `Hibabejelentes.halaszatId` SetNull lesz.
- **Soft delete:** a dolgozó-eltávolítás csak deaktivál (`HalaszatTagsag.aktiv=false`),
  nem töröl — a múltbeli kontextus megmarad.

> TODO: konkrét megőrzési időtartamok (pl. inaktív fiók X hónap után) és egy
> dokumentált, kérésre induló törlési (GDPR „elfeledtetéshez való jog”) folyamat
> meghatározása éles üzem előtt.

## 4. Hozzáférés-szabályozás (Access Control)

- A személyes és tenant-adatokhoz csak **bejelentkezett** felhasználó fér hozzá
  (`requireUser` / session).
- A hozzáférést **halászat-szintű szerepkör** korlátozza
  (`requireHalaszatRole`, STAFF<ADMIN<OWNER), tó-műveleteknél kiegészítve
  tenant-ellenőrzéssel (`assertToBelongsToTenant`).
- Más felhasználók e-mail/név adata csak a **dolgozó-listán** jelenik meg, és azt
  csak **ADMIN+** szerepkör kérheti le.
- **Ismert kivétel (TODO):** a hibabejelentés-végpontok jelenleg auth nélkül
  futnak, így a `GET .../hibabejelentesek` a bejelentő nevét/e-mailjét
  jogosultság-ellenőrzés nélkül adja vissza. Ez adatvédelmi szempontból is
  rendezendő (lásd `threat-model.md` 6–7. szakasz).
- A jelszavak hashelten (bcrypt), a session-tokenek hashelten tárolódnak; a
  `DATABASE_URL` (DB hitelesítő adat) környezeti változóban, nem a repóban.

## 5. AI-adatkezelési szabály

A projekt fejlesztése AI-eszközök támogatásával történik (lásd `docs/07_ai/`).
Erre az alábbi kötelező szabály vonatkozik:

> **Tilos** valós személyes adatot, éles hitelesítő adatot vagy titkot AI-eszköznek
> átadni. Konkrétan **nem** kerülhet AI promptba vagy AI-szolgáltatáshoz:
> - valós felhasználói e-mail, név vagy más személyes adat,
> - jelszavak, jelszó-hash-ek, session tokenek,
> - a `DATABASE_URL` vagy bármely más titok/kulcs,
> - éles adatbázis-kivonatok (dump), éles logok személyes adatokkal.

Megengedett: a forráskód, a séma szerkezete, és **anonimizált/szintetikus**
példaadatok megosztása. Ha valós adaton kell hibát reprodukálni, azt anonimizálni
kell, mielőtt bármilyen külső eszközbe kerül. A szabály célja, hogy az
AI-támogatott fejlesztés ne okozzon adatszivárgást — összhangban a 3. szakasz
adattakarékossági és a `threat-model.md` információszivárgási (STRIDE „I”)
megfontolásaival.
