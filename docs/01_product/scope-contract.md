# Scope Contract

## Projekt neve

Németh Horgászat

## Projekt típusa

Több-bérlős (multi-tenant) webalkalmazás halgazdaságok és horgászati szervezetek nyilvántartási feladatainak támogatására.

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

## Naplózás

- események rögzítése
- audit célú visszakereshetőség

---

# Non Goals

A jelenlegi verzió nem tartalmaz:

- online fizetést
- mobil alkalmazást
- IoT szenzor integrációt
- automatikus vízminőség mérést
- gépi tanulás alapú előrejelzést

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