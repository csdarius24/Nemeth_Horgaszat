# Scope Contract

## Projekt neve

Németh Horgászat

## Tézis-scope — munkacím

> **„Halgazdálkodási műveleteket támogató webalkalmazás fejlesztése többtavas
> horgászatok számára"**

## Projekt típusa

Több-bérlős (multi-tenant) webalkalmazás **halgazdálkodási műveletek**
támogatására és nyomon követésére többtavas horgászatok / halgazdaságok számára.
A fókusz — a témavezetői visszajelzés nyomán — a napi műveletek (telepítés,
kivét, etetés, áttelepítés, takarmánymozgás) auditálható, tóra bontott
nyilvántartása.

---

# MVP-határ (In Scope / Out of Scope)

Ez a szakasz a tézis MVP-jének éles határát rögzíti. A jelölés:
**[kész]** = megvalósítva a kódbázisban · **[tervezett]** = még nem
megvalósított, SZD2-re tervezett.

## In Scope (a tézis MVP része)

- **több-bérlős (multi-user) halgazdálkodás-kezelés** [kész]
- **tavak** (normál és telelő) [kész]
- **halfajok** [kész]
- **halállomány** (fajonkénti/tavankénti készlet) [kész]
- **telepítés** (stocking) [kész]
- **kivét** (removal) [kész]
- **etetés** (feeding) [kész]
- **takarmánykészlet** (feed inventory) — készlet + bevétel/felhasználás
  mozgások [kész]
- **művelet-idővonal** (operation timeline) — tó-szintű naplóesemények [kész]
- **dashboard** (összesítő, döntéstámogató nézetek) [kész]
- **hibabejelentések** (bug reports) [kész] — *ismert korlát: a végpontok
  jelenleg auth/RBAC guard nélkül futnak, lásd `docs/05_security_ops/threat-model.md`*
- **szerepkör alapú jogosultságkezelés** (RBAC) [kész] — a részletes
  szerepkör-/jogosultsági mátrixot lásd:
  [`docs/05_security_ops/role-matrix.md`](../05_security_ops/role-matrix.md)

> **Megjegyzés a takarmánykészletről:** a takarmány készletértéke jelenleg
> **kézi** bevétel/felhasználás mozgásokkal változik. Az etetési művelethez való
> **automatikus** készletlevonás (etetés → takarmány csökken) **[tervezett]**
> (SZD2), még nincs megvalósítva.

> **Kiegészítő, már megvalósított modulok** (nem részei a szűk MVP-magnak, de a
> kódban jelen vannak): havi **naptár** bejegyzésekkel, beépített
> **számológép** segédeszköz a felületen.

## Out of Scope (a tézis MVP-n kívül)

- mobil alkalmazás
- IoT vízminőség-szenzorok
- online fizetés
- komplex gépi tanulás
- automatizált biológiai előrejelzés

> **Halkeltetési modul** (ikráztatás / ivadéknevelés): a felületen szerepel egy
> placeholder oldal, de a funkció **[tervezett]**, SZD2-re — jelenleg **nincs**
> megvalósítva.

---

# MVP Scope

Az MVP az alábbi funkciókat tartalmazza.

## Felhasználókezelés

- regisztráció
- bejelentkezés
- kijelentkezés
- session kezelés

## Halászat kezelés

- halászat létrehozása
- halászatok listázása
- tagságok kezelése

## Jogosultságkezelés

Halászat szint:

- OWNER
- ADMIN
- STAFF

Tó szint:

- OWNER
- ADMIN
- STAFF
- OR
- ANGLER

## Tó kezelés

- tavak létrehozása
- tavak szerkesztése
- telelő tavak kezelése

## Halfaj kezelés

- halfaj létrehozása
- halfaj módosítása
- halfaj archiválása

## Halállomány kezelés

- készlet nyilvántartás
- tömegtartomány követése

## Telepítés

- telepítések rögzítése
- állomány automatikus frissítése

## Kivétel

- kivételek rögzítése
- állomány automatikus csökkentése

## Etetés

- etetések naplózása
- összesítések készítése

## Takarmánykészlet (feed inventory) [kész]

- takarmányfajták nyilvántartása (név, egység, szín)
- aktuális készlet követése takarmányonként
- készletmozgások rögzítése: **bevétel** (+) és **felhasználás** (−)
- készlet- és megoszlás-diagramok (dashboard)
- *[tervezett, SZD2]* automatikus készletlevonás az etetési művelethez kötve

## Művelet-idővonal és naplózás

- események rögzítése (telepítés / kivét / etetés / áttelepítés)
- tó-szintű idővonal és audit célú visszakereshetőség

---

# Non Goals

A jelenlegi verzió **nem** tartalmaz (lásd a fenti „Out of Scope" listát is):

- online fizetést
- mobil alkalmazást
- IoT (vízminőség-) szenzor integrációt
- automatikus vízminőség mérést
- komplex gépi tanulás alapú előrejelzést / automatizált biológiai előrejelzést

A **halkeltetési modul** és az **etetés↔takarmány automatikus összekötése**
**tervezett** (SZD2), jelenleg nem része a megvalósított MVP-nek.

---

# Acceptance Criteria

A projekt sikeresnek tekinthető, ha:

1. Egy felhasználó létre tud hozni halászatot.

2. A halászathoz tavak rendelhetők.

3. A tavakhoz halfajok kezelhetők.

4. Telepítés és kivétel esetén az állomány automatikusan frissül.

5. A jogosultsági rendszer megakadályozza az illetéktelen hozzáférést.

6. Az események naplózásra kerülnek.

7. Több halászat adatai egymástól elkülönítve tárolódnak.