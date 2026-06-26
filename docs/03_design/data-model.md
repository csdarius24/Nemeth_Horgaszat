# Data Model

Ez a dokumentum a `prisma/schema.prisma` alapján készült, és a rendszer relációs
adatmodelljét írja le. Forrás: `prisma/schema.prisma` (MySQL provider, Prisma ORM).

## Áttekintés

A rendszer egy MySQL relációs adatbázisra épül, Prisma ORM-en keresztül elérve.
Az adatmodell központi szervezőelve a **multi-tenant** felépítés: minden adat egy
`Halaszat` (halászat / tenant) alá tartozik, vagy közvetlenül (`halaszatId`
mezővel), vagy közvetetten egy `To` (tó) kapcsolaton keresztül.

A modell három fő rétegre bontható:

1. **Identitás és hozzáférés** — `Felhasznalo`, `Session`, `HalaszatTagsag`,
   `ToTagsag`. Ezek kezelik a felhasználókat, a session alapú authentikációt és a
   szerepkör alapú jogosultságokat.
2. **Tenant és törzsadatok** — `Halaszat`, `To`, `Halfaj`. A halászat a tenant
   gyökér; a tavak és halfajok hozzá tartoznak.
3. **Készlet, műveletek és napló** — `HalAllomany` (aktuális készlet),
   `Telepites`, `Kivetel`, `Etetes` (műveleti rekordok), `Takarmany` +
   `TakarmanyMozgas` (takarmánykészlet és mozgásai), `NaploEsemeny`
   (auditnapló), `NaptarBejegyzes` (naptár), `Hibabejelentes` (hibabejelentések).

> **Takarmánykészlet (feed inventory).** A `Takarmany` egy halászathoz tartozó
> takarmányfajta aktuális készletét tartja nyilván, a `TakarmanyMozgas` pedig a
> készletet módosító egyedi mozgásokat (`BEVETEL` / `FELHASZNALVA`). A
> készletérték a mozgások hatására **dinamikusan változik** (a mozgás rögzítése
> és a `Takarmany.keszlet` frissítése egy tranzakcióban történik).
>
> **Kétféle készletmozgás:**
> - **Kézi** mozgás — a `POST .../takarmanyok/[id]/mozgasok` végponton rögzített
>   bevétel/felhasználás (a `toId`/`etetesId` ilyenkor `null`).
> - **Automatikus** felhasználás — etetéskor (`POST .../toak/[toId]/etetes`), ha a
>   kérés tartalmaz `takarmanyId`-t: a rendszer egy `FELHASZNALVA` típusú
>   `TakarmanyMozgas`-t hoz létre, levonja a `mennyisegKg`-ot a készletből, és a
>   mozgást a tóhoz (`toId`) és az etetéshez (`etetesId`) köti. Mindez **egy
>   tranzakcióban** az `Etetes` és a `NaploEsemeny` létrehozásával együtt.
>
> Az `Etetes.takarmanyId`, a `TakarmanyMozgas.toId` és a `TakarmanyMozgas.etetesId`
> **nullable** — a takarmányhoz nem kötött (régi vagy kézi) etetések és mozgások
> továbbra is érvényesek. **Nincs mértékegység-konverzió:** etetésnél a
> `mennyisegKg` értéke a levont mennyiség, ugyanabban az egységben, mint a
> takarmány készlete.

Az elsődleges kulcsok mindenhol `azonosito Int @id @default(autoincrement())`.
A pénz/tömeg jellegű mezők `Decimal` típusúak (`@db.Decimal`), a darabszámok
`Int` típusúak. Minden Prisma `@@map` direktívával explicit, kisbetűs/aláhúzásos
tábla­névre képződik le (pl. `felhasznalok`, `hal_allomany`).

## ER diagram

```mermaid
erDiagram
    Felhasznalo ||--o{ Session : "sessions"
    Felhasznalo ||--o{ HalaszatTagsag : "halaszatTagsag"
    Felhasznalo ||--o{ ToTagsag : "tagsagok"
    Felhasznalo |o--o{ Hibabejelentes : "hibabejelentesek"

    Halaszat ||--o{ HalaszatTagsag : "tagsagok"
    Halaszat |o--o{ To : "toak"
    Halaszat ||--o{ Halfaj : "halfajok"
    Halaszat ||--o{ Takarmany : "takarmanyok"
    Halaszat ||--o{ TakarmanyMozgas : "takarmanyMozgasok"
    Halaszat ||--o{ NaptarBejegyzes : "naptarBejegyzesek"
    Halaszat |o--o{ Hibabejelentes : "hibabejelentesek"

    Takarmany ||--o{ TakarmanyMozgas : "mozgasok"
    Takarmany |o--o{ Etetes : "etetesek"
    Etetes |o--o{ TakarmanyMozgas : "mozgasok"

    To ||--o{ ToTagsag : "tagsagok"
    To ||--o{ HalAllomany : "halAllomanyok"
    To ||--o{ Telepites : "telepitesek"
    To ||--o{ Kivetel : "kivetelek"
    To ||--o{ Etetes : "etetesek"
    To ||--o{ NaploEsemeny : "naploEsemenyek"
    To |o--o{ TakarmanyMozgas : "takarmanyMozgasok"

    Halfaj ||--o{ HalAllomany : "halAllomanyok"
    Halfaj ||--o{ Telepites : "telepitesek"
    Halfaj ||--o{ Kivetel : "kivetelek"
    Halfaj |o--o{ NaploEsemeny : "naploEsemenyek"

    Felhasznalo {
        int azonosito PK
        string email UK
        string nev
        string jelszoHash
        bool aktiv
        datetime letrehozva
        datetime frissitve
    }
    Session {
        int azonosito PK
        int felhasznaloId FK
        string tokenHash UK
        datetime lejar
        datetime letrehozva
    }
    Halaszat {
        int azonosito PK
        string nev
        string slug UK
        bool aktiv
        datetime letrehozva
        datetime frissitve
    }
    HalaszatTagsag {
        int azonosito PK
        int halaszatId FK
        int felhasznaloId FK
        enum szerepkor "HalaszatSzerepkor"
        bool aktiv
        datetime letrehozva
    }
    To {
        int azonosito PK
        string nev
        bool aktiv
        enum tipus "ToTipus"
        int halaszatId FK "nullable"
        datetime letrehozva
        datetime frissitve
    }
    ToTagsag {
        int azonosito PK
        int felhasznaloId FK
        int toId FK
        enum szerepkor "Szerepkor"
        bool aktiv
        datetime letrehozva
    }
    Halfaj {
        int azonosito PK
        int halaszatId FK
        string nev
        bool aktiv
        datetime letrehozva
        datetime frissitve
    }
    HalAllomany {
        int azonosito PK
        int toId FK
        int halfajId FK
        int darab
        decimal minTomegKg
        decimal maxTomegKg
        datetime frissitve
    }
    Telepites {
        int azonosito PK
        int toId FK
        int halfajId FK
        int darab
        decimal minTomegKg
        decimal maxTomegKg
        string forras
        datetime datum
        string megjegyzes
    }
    Kivetel {
        int azonosito PK
        int toId FK
        int halfajId FK
        int darab
        string ok
        datetime datum
        string megjegyzes
    }
    Etetes {
        int azonosito PK
        int toId FK
        int takarmanyId FK "nullable"
        decimal mennyisegKg
        string tipus
        datetime datum
        string megjegyzes
    }
    NaploEsemeny {
        int azonosito PK
        enum tipus "EsemenyTipus"
        int toId FK
        int halfajId FK "nullable"
        int darab
        decimal mennyisegKg
        datetime datum
        string leiras
    }
    Takarmany {
        int azonosito PK
        int halaszatId FK
        string nev
        string egyseg
        decimal keszlet
        string szin "nullable"
        bool aktiv
        datetime letrehozva
        datetime frissitve
    }
    TakarmanyMozgas {
        int azonosito PK
        int takarmanyId FK
        int halaszatId FK
        int toId FK "nullable"
        int etetesId FK "nullable"
        enum tipus "TakarmanyMozgasTipus"
        decimal mennyiseg
        datetime datum
        string megjegyzes "nullable"
        datetime letrehozva
    }
    NaptarBejegyzes {
        int azonosito PK
        int halaszatId FK
        date datum
        string cim
        string tartalom
        string szin
        datetime letrehozva
        datetime frissitve
    }
    Hibabejelentes {
        int azonosito PK
        string targy
        string leiras
        string oldalUrl
        enum statusz "HibabejelentesStatusz"
        int halaszatId FK "nullable"
        int felhasznaloId FK "nullable"
        datetime letrehozva
        datetime frissitve
    }
```

## Enumok

| Enum | Értékek | Felhasználás |
|---|---|---|
| `EsemenyTipus` | `TELEPITES`, `KIVETEL`, `ETETES` | `NaploEsemeny.tipus` — a naplózott művelet típusa. |
| `Szerepkor` | `OWNER`, `ADMIN`, `STAFF`, `OR`, `ANGLER` | `ToTagsag.szerepkor` — tó-szintű szerepkör (5 fokozat). |
| `HalaszatSzerepkor` | `OWNER`, `ADMIN`, `STAFF` | `HalaszatTagsag.szerepkor` — halászat (tenant) szintű szerepkör. |
| `ToTipus` | `TO`, `TELELO` | `To.tipus` — normál tó vagy telelő tó. |
| `TakarmanyMozgasTipus` | `BEVETEL`, `FELHASZNALVA` | `TakarmanyMozgas.tipus` — készletnövelő (bevétel) vagy készletcsökkentő (felhasználás) mozgás. |
| `HibabejelentesStatusz` | `UJ`, `FOLYAMATBAN`, `MEGOLDVA`, `ELUTASITVA` | `Hibabejelentes.statusz` — a hibabejelentés állapota (alapérték `UJ`). |

> Megjegyzés: a `Szerepkor` (tó-szintű, 5 fokozatú) enum és a `ToTagsag` modell
> definiálva van a sémában, de a jelenlegi API a hozzáférést **halászat-szintű**
> szerepkörrel (`HalaszatSzerepkor` / `HalaszatTagsag`) engedélyezi. A tó-szintű
> jogosultságkezelés (`requireToRole` a `src/lib/guards.ts`-ben) implementált, de
> az API route-ok jelenleg nem hívják. TODO: tisztázni, hogy a tó-szintű
> szerepkör része-e a végleges jogosultsági modellnek, vagy eltávolítandó.

## Entitások

### Felhasznalo (`felhasznalok`)
- **Cél:** rendszerfelhasználó (tulajdonos, gazdaságvezető, alkalmazott).
- **Fontos mezők:** `email` (egyedi, login azonosító), `jelszoHash` (bcrypt hash),
  `aktiv` (deaktivált fiók nem léphet be), `nev` (opcionális).
- **Megszorítások:** `email` egyedi (`@unique`).
- **Indexek:** az egyedi `email` implicit indexet ad.
- **Relációk:** `Session[]`, `HalaszatTagsag[]`, `ToTagsag[]`, `Hibabejelentes[]`.

### Session (`sessions`)
- **Cél:** szerveroldali session a cookie alapú authentikációhoz.
- **Fontos mezők:** `tokenHash` (a sütiben tárolt token SHA-256 hash-e — a nyers
  token nem kerül adatbázisba), `lejar` (lejárati idő), `felhasznaloId`.
- **Megszorítások:** `tokenHash` egyedi.
- **Indexek:** `@@index([felhasznaloId])`.
- **Relációk:** `felhasznalo` (kötelező).

### Halaszat (`halaszatok`)
- **Cél:** a tenant gyökérentitása; egy önálló halgazdaság / horgászszervezet.
- **Fontos mezők:** `nev`, `slug` (egyedi, URL-barát azonosító), `aktiv`.
- **Megszorítások:** `slug` egyedi.
- **Relációk:** `To[]`, `HalaszatTagsag[]`, `Halfaj[]`, `NaptarBejegyzes[]`,
  `Hibabejelentes[]`.

### HalaszatTagsag (`halaszat_tagsag`)
- **Cél:** felhasználó ↔ halászat tagság + halászat-szintű szerepkör (RBAC alapja).
- **Fontos mezők:** `halaszatId`, `felhasznaloId`, `szerepkor` (alap `STAFF`),
  `aktiv` (soft-delete jelző).
- **Megszorítások:** `@@unique([halaszatId, felhasznaloId])` — egy felhasználó egy
  halászatban legfeljebb egy tagsággal.
- **Indexek:** `@@index([felhasznaloId])`, `@@index([halaszatId])`.
- **Relációk:** `halaszat`, `felhasznalo` (mindkettő kötelező).

### To (`toak`)
- **Cél:** egy tó (normál vagy telelő) egy halászaton belül.
- **Fontos mezők:** `nev`, `tipus` (`ToTipus`, alap `TO`), `aktiv`, `halaszatId`.
- **Megszorítások / megjegyzés:** a `halaszatId` **nullable** (`Int?`). Ez
  szándékos: a séma kommentje szerint a mező átmenetileg nullable, hogy a régi
  (tenant nélküli) adatok ne boruljanak migrációkor. Új tó mindig `halaszatId`-vel
  jön létre (`POST /api/halaszatok/[hid]/toak`). Az alkalmazáslogika
  (`requireToAccess` a `src/lib/guards.ts`-ben) külön kezeli azt az esetet, ha egy
  tónak nincs `halaszatId`-ja (409 hiba).
- **Indexek:** `@@index([halaszatId])`.
- **Relációk:** `halaszat` (opcionális), `ToTagsag[]`, `HalAllomany[]`,
  `Telepites[]`, `Kivetel[]`, `Etetes[]`, `NaploEsemeny[]`.

### ToTagsag (`to_tagsag`)
- **Cél:** felhasználó ↔ tó tagság, tó-szintű szerepkörrel.
- **Fontos mezők:** `felhasznaloId`, `toId`, `szerepkor` (`Szerepkor`, alap
  `ANGLER`), `aktiv`.
- **Megszorítások:** `@@unique([felhasznaloId, toId])`.
- **Indexek:** `@@index([toId])`, `@@index([felhasznaloId])`.
- **Relációk:** `felhasznalo`, `to` (kötelező). Lásd a fenti enum-megjegyzést a
  jelenlegi felhasználtságról.

### Halfaj (`halfajok`)
- **Cél:** egy halfaj egy halászaton belül (tenant-specifikus törzsadat).
- **Fontos mezők:** `nev`, `aktiv` (archiváláshoz), `halaszatId`.
- **Megszorítások:** `@@unique([halaszatId, nev])` — a név tenanton belül egyedi.
- **Indexek:** `@@index([halaszatId, aktiv])`.
- **Relációk:** `halaszat` (kötelező), `HalAllomany[]`, `Telepites[]`,
  `Kivetel[]`, `NaploEsemeny[]`.

### HalAllomany (`hal_allomany`)
- **Cél:** egy tó egy halfajának **aktuális** készlete (denormalizált összesítő).
- **Fontos mezők:** `darab` (aktuális darabszám), `minTomegKg`, `maxTomegKg`
  (`Decimal(6,2)` tömegtartomány).
- **Megszorítások:** `@@unique([toId, halfajId])` — tó+halfaj páronként egy sor.
- **Indexek:** `@@index([toId])`, `@@index([halfajId])`.
- **Relációk:** `to` (Cascade), `halfaj` (Restrict).

### Telepites (`telepitesek`)
- **Cél:** egy telepítési (állomány-növelő) esemény rekordja.
- **Fontos mezők:** `darab`, `minTomegKg`, `maxTomegKg`, `forras` (opcionális),
  `datum`, `megjegyzes`.
- **Indexek:** `@@index([toId, datum])`, `@@index([halfajId, datum])`.
- **Relációk:** `to` (Cascade), `halfaj` (Restrict).

### Kivetel (`kivetelek`)
- **Cél:** egy kivételi (állomány-csökkentő) esemény rekordja.
- **Fontos mezők:** `darab`, `ok` (opcionális indok), `datum`, `megjegyzes`.
- **Indexek:** `@@index([toId, datum])`, `@@index([halfajId, datum])`.
- **Relációk:** `to` (Cascade), `halfaj` (Restrict).

### Etetes (`etetesek`)
- **Cél:** egy etetési esemény rekordja.
- **Fontos mezők:** `mennyisegKg` (`Decimal(8,2)`, kötelező), `tipus` (opcionális
  szabad szöveges takarmány típus), `datum`, `megjegyzes`, `takarmanyId`
  (**opcionális** — a felhasznált takarmány a készletből).
- **Indexek:** `@@index([toId, datum])`, `@@index([takarmanyId])`.
- **Relációk:** `to` (Cascade), `takarmany` (opcionális, **SetNull**),
  `TakarmanyMozgas[]` (a kiváltott készletmozgás[ok]). Halfajhoz nem kötődik.
- **Megjegyzés:** ha `takarmanyId` ki van töltve, az etetés rögzítésekor egy
  `FELHASZNALVA` típusú `TakarmanyMozgas` keletkezik és a `Takarmany.keszlet`
  csökken `mennyisegKg`-mal (egy tranzakcióban). A takarmány törlése a
  `takarmanyId`-t `null`-ra állítja (az etetésrekord megmarad).

### Takarmany (`takarmanyok`)
- **Cél:** egy halászathoz tartozó takarmányfajta és annak **aktuális** készlete
  (feed inventory).
- **Fontos mezők:** `nev`, `egyseg` (mértékegység, pl. `kg`/`zsák`), `keszlet`
  (`Decimal(10,2)`, aktuális készlet, alap `0`), `szin` (opcionális UI színkód),
  `aktiv` (archiváláshoz), `halaszatId`.
- **Megszorítások:** `@@unique([halaszatId, nev])` — a név tenanton belül egyedi.
- **Indexek:** `@@index([halaszatId, aktiv])`.
- **Relációk:** `halaszat` (Cascade), `TakarmanyMozgas[]`.
- **Megjegyzés:** a `keszlet` denormalizált összesítő, amelyet a mozgások
  rögzítése tranzakcióban tart szinkronban.

### TakarmanyMozgas (`takarmany_mozgasok`)
- **Cél:** egy takarmánykészlet-mozgás (bevétel vagy felhasználás) rekordja.
- **Fontos mezők:** `tipus` (`TakarmanyMozgasTipus`: `BEVETEL` / `FELHASZNALVA`),
  `mennyiseg` (`Decimal(10,2)`, kötelező, pozitív), `datum`, `megjegyzes`
  (opcionális), `takarmanyId`, `halaszatId`, `toId` (**opcionális** — melyik tóhoz
  kötődő felhasználás), `etetesId` (**opcionális** — melyik etetés váltotta ki).
- **Indexek:** `@@index([takarmanyId, datum])`, `@@index([halaszatId, datum])`,
  `@@index([toId])`, `@@index([etetesId])`.
- **Relációk:** `takarmany` (Cascade), `halaszat` (Cascade), `to` (opcionális,
  **SetNull**), `etetes` (opcionális, **SetNull**).
- **Megjegyzés:** a mozgás létrehozása és a `Takarmany.keszlet` frissítése egy
  `prisma.$transaction`-ben történik; a készlet nem mehet negatívba. Kétféle
  forrás: **kézi** (a mozgás-végpont, `toId`/`etetesId` = `null`) és
  **automatikus** (etetéskor, `tipus = FELHASZNALVA`, `toId`/`etetesId` kitöltve).

### NaploEsemeny (`naplo_esemenyek`)
- **Cél:** auditnapló; minden fontos művelet (telepítés, kivét, etetés,
  áttelepítés) ide is bejegyződik, ember által olvasható `leiras` szöveggel.
- **Fontos mezők:** `tipus` (`EsemenyTipus`), `darab` (opcionális), `mennyisegKg`
  (opcionális `Decimal(8,2)`), `datum`, `leiras` (opcionális szöveg).
- **Indexek:** `@@index([toId, datum])`, `@@index([tipus, datum])`.
- **Relációk:** `to` (Cascade), `halfaj` (opcionális, SetNull).

### NaptarBejegyzes (`naptar_bejegyzesek`)
- **Cél:** halászat-szintű naptár / eseménybejegyzés.
- **Fontos mezők:** `datum` (`@db.Date`), `cim`, `tartalom` (opcionális), `szin`
  (opcionális, UI színkód).
- **Indexek:** `@@index([halaszatId, datum])`.
- **Relációk:** `halaszat` (Cascade).

### Hibabejelentes (`hibabejelentesek`)
- **Cél:** felhasználói hibabejelentés / visszajelzés státuszkövetéssel.
- **Fontos mezők:** `targy`, `leiras`, `oldalUrl` (opcionális, honnan jött a
  bejelentés), `statusz` (`HibabejelentesStatusz`, alap `UJ`).
- **Megszorítások / megjegyzés:** `halaszatId` és `felhasznaloId` is **nullable**,
  hogy a halászathoz vagy felhasználóhoz nem köthető (pl. anonim) bejelentések is
  tárolhatók legyenek.
- **Indexek:** `@@index([halaszatId])`, `@@index([felhasznaloId])`,
  `@@index([statusz])`, `@@index([letrehozva])`.
- **Relációk:** `halaszat` (opcionális, SetNull), `felhasznalo` (opcionális,
  SetNull).

## Törlési viselkedés (Cascade / Restrict / SetNull)

A referenciális akciók a `schema.prisma` `onDelete` beállításaiból származnak.

| Reláció | Akció | Hatás |
|---|---|---|
| `Session.felhasznalo` | Cascade | Felhasználó törlésekor a sessionjei is törlődnek. |
| `HalaszatTagsag.halaszat` | Cascade | Halászat törlésekor a tagságok törlődnek. |
| `HalaszatTagsag.felhasznalo` | Cascade | Felhasználó törlésekor a tagságai törlődnek. |
| `To.halaszat` | Cascade | Halászat törlésekor a tavai törlődnek. |
| `ToTagsag.felhasznalo` | Cascade | Felhasználó törlésekor a tó-tagságai törlődnek. |
| `ToTagsag.to` | Cascade | Tó törlésekor a tó-tagságok törlődnek. |
| `Halfaj.halaszat` | Cascade | Halászat törlésekor a halfajai törlődnek. |
| `HalAllomany.to` | Cascade | Tó törlésekor a készletsorok törlődnek. |
| `HalAllomany.halfaj` | **Restrict** | Halfaj nem törölhető, amíg készletben szerepel. |
| `Telepites.to` | Cascade | Tó törlésekor a telepítési rekordok törlődnek. |
| `Telepites.halfaj` | **Restrict** | Halfaj nem törölhető, amíg telepítésben szerepel. |
| `Kivetel.to` | Cascade | Tó törlésekor a kivétel-rekordok törlődnek. |
| `Kivetel.halfaj` | **Restrict** | Halfaj nem törölhető, amíg kivételben szerepel. |
| `Etetes.to` | Cascade | Tó törlésekor az etetés-rekordok törlődnek. |
| `Etetes.takarmany` | **SetNull** | Takarmány törlésekor az `Etetes.takarmanyId` nullára áll, az etetés megmarad. |
| `Takarmany.halaszat` | Cascade | Halászat törlésekor a takarmányok törlődnek. |
| `TakarmanyMozgas.takarmany` | Cascade | Takarmány törlésekor a mozgásai törlődnek. |
| `TakarmanyMozgas.halaszat` | Cascade | Halászat törlésekor a takarmánymozgások törlődnek. |
| `TakarmanyMozgas.to` | **SetNull** | Tó törlésekor a mozgás `toId`-ja nullára áll, a mozgás megmarad. |
| `TakarmanyMozgas.etetes` | **SetNull** | Etetés törlésekor a mozgás `etetesId`-ja nullára áll, a mozgás megmarad. |
| `NaploEsemeny.to` | Cascade | Tó törlésekor a naplóesemények törlődnek. |
| `NaploEsemeny.halfaj` | **SetNull** | Halfaj törlésekor a `halfajId` nullára áll, a napló megmarad. |
| `NaptarBejegyzes.halaszat` | Cascade | Halászat törlésekor a naptárbejegyzések törlődnek. |
| `Hibabejelentes.halaszat` | **SetNull** | Halászat törlésekor a kapcsolat nullára áll, a bejelentés megmarad. |
| `Hibabejelentes.felhasznalo` | **SetNull** | Felhasználó törlésekor a kapcsolat nullára áll, a bejelentés megmarad. |

A `Restrict` szabályok miatt egy halfaj „kemény” törlése elbukik, ha bárhol
hivatkozzák; az API ezt 409-es válasszal kezeli, és helyette inaktiválást javasol
(lásd `DELETE /api/halaszatok/[hid]/halfajok/[id]`).

## Megjegyzés a `To.halaszatId` nullable mezőről

A `To.halaszatId` szándékosan `Int?` (nullable). Ez **legacy / migrációs
kompatibilitási** döntés: a tenant-szeparáció bevezetése előtt létrehozott tavak
nem rendelkeztek halászat-hivatkozással, és a séma nem kényszeríti rájuk
visszamenőleg. Új tavak mindig halászathoz kötve jönnek létre. Az
alkalmazásréteg (`requireToAccess`) explicit 409-es hibát ad, ha egy tóhoz
művelet közben nincs `halaszatId`. Hosszú távon megfontolandó az adat tisztítása
és a mező kötelezővé tétele (TODO: külön migráció).
