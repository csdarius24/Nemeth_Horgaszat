# Németh Horgászat

Több-bérlős (multi-tenant) halgazdasági és horgászati nyilvántartó rendszer.

## Projekt célja

A rendszer célja magyarországi halgazdaságok és horgásztavak digitális nyilvántartásának támogatása.

A platform lehetővé teszi:

- halászatok kezelését
- tavak kezelését
- telelő tavak kezelését
- halfajok nyilvántartását
- halállomány követését
- telepítések kezelését
- kivételek rögzítését
- etetések naplózását
- eseménynapló vezetését
- szerepkör alapú jogosultságkezelést

## Technológiai stack

Frontend:
- Next.js
- React
- TypeScript

Backend:
- Next.js API Routes

Adatbázis:
- MySQL
- Prisma ORM

Authentikáció:
- Session alapú authentikáció
- HttpOnly cookie
- bcrypt jelszóhash

## Fő funkciók

### Halászat kezelés

Minden halászat önálló tenantként működik.

### Tó kezelés

- normál tavak
- telelő tavak

### Halállomány kezelés

- halfajonkénti nyilvántartás
- darabszám
- tömegtartomány

### Telepítés

Új halállomány rögzítése.

### Kivétel

Halállomány csökkentése.

### Etetés

Etetési események nyilvántartása.

### Naplózás

Minden esemény auditálható módon naplózásra kerül.

## Jogosultsági rendszer

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

## Fejlesztői környezet

### Telepítés

```bash
npm install
```

### Adatbázis migráció

```bash
npx prisma migrate deploy
```

### Fejlesztői szerver

```bash
npm run dev
```


Fejlesztő:
Csóka Dániel Dárius

2026