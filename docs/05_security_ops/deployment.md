# Deployment

Ez a dokumentum a Németh Horgászat rendszer telepítési és üzembe helyezési
folyamatát írja le: helyi fejlesztői környezet, production környezet, szükséges
környezeti változók, build- és migrációs lépések, visszaállítási terv és
titokkezelés. A technológiai döntések hátteréhez lásd `docs/02_architecture/adr/`.

## 1. Technológiai stack

- **Runtime:** Node.js (LTS ajánlott), Next.js `16.x` (App Router), React `19.x`.
- **ORM/DB:** Prisma `6.x` + MySQL (Hostinger-kompatibilis, lásd ADR-003).
- **Csomagkezelő:** npm (a repo `package-lock.json`-t tartalmaz).
- **Szkriptek (`package.json`):** `dev`, `build`, `start`, `lint`.

## 2. Környezeti változók

| Változó | Kötelező | Leírás |
|---|---|---|
| `DATABASE_URL` | Igen | MySQL kapcsolati string, pl. `mysql://user:pass@host:3306/dbnev`. A Prisma datasource ezt használja. |
| `NODE_ENV` | Ajánlott | `development` / `production`. Befolyásolja a süti `secure` flagjét (`src/lib/auth.ts`) és a Prisma kliens viselkedését (`src/lib/prisma.ts`). |

- A `.env*` fájlok **gitignore-oltak** — titkot nem commitolunk.
- TODO: hozzáadni egy `.env.example` sablont (kulcsok érték nélkül), hogy az
  elvárt változók dokumentáltak legyenek a repóban.
- TODO (biztonság): production­ben a Prisma query-logging visszafogása
  `NODE_ENV` alapján (lásd `threat-model.md` 6/4. pont).

## 3. Helyi (fejlesztői) környezet

Előfeltétel: Node.js + egy elérhető MySQL példány.

```bash
# 1) Függőségek
npm install

# 2) Környezeti változók
#    Hozz létre egy .env fájlt a DATABASE_URL értékkel:
#    DATABASE_URL="mysql://user:pass@localhost:3306/nemeth_horgaszat"

# 3) Adatbázis séma alkalmazása (lokálisan migrate dev is használható)
npx prisma migrate deploy
#    (fejlesztés közben séma-iteráláshoz: npx prisma migrate dev)

# 4) Prisma kliens generálása (telepítéskor általában automatikus)
npx prisma generate

# 5) Fejlesztői szerver
npm run dev   # http://localhost:3000
```

## 4. Production környezet

Cél: Hostinger (Node + MySQL), de a folyamat bármely Node-képes hosztra (vagy
Vercel-szerű platformra) átültethető.

```bash
# 1) Függőségek (reprodukálható telepítés)
npm ci

# 2) Adatbázis migráció (lásd 5. szakasz)
npx prisma migrate deploy

# 3) Production build
npm run build

# 4) Indítás
npm run start   # next start, alapértelmezetten 3000-es port
```

Megjegyzések:
- A `DATABASE_URL`-t és `NODE_ENV=production`-t a hosting felület
  környezeti-változó kezelőjén keresztül kell beállítani (nem `.env` fájlból).
- Production­ben a `secure` süti miatt **HTTPS kötelező**, különben a session süti
  nem kerül beállításra.
- Ajánlott a folyamatot process-managerrel (pl. PM2) vagy a platform natív
  futtatójával felügyelni, automatikus újraindítással.

## 5. Migrációs lépések

- A migrációk a `prisma/migrations/` alatt verziózva vannak.
- **Production­ben mindig `npx prisma migrate deploy`** fut (csak a meglévő,
  commitolt migrációkat alkalmazza; nem generál újat). Soha ne fusson
  `migrate dev` éles adatbázison.
- Új séma-változás menete: `schema.prisma` módosítás → `npx prisma migrate dev`
  (lokálisan, migráció létrehozása) → commit → deploy pipeline alkalmazza
  `migrate deploy`-jal.
- **Migráció előtt mindig készüljön adatbázis-mentés** (lásd `runbook.md`).

## 6. Visszaállítási terv (Rollback)

Az alkalmazás és az adatbázis külön kezelendő:

- **Alkalmazás rollback:** állítsd vissza az előző, működő git commitra/tagre, és
  építsd újra (`npm ci && npm run build && npm run start`). A korábbi commitok
  (pl. `git log`) ismertek; release-enként ajánlott git tag (lásd
  `docs/06_release/`).
- **Adatbázis rollback:** a Prisma migrációk előre irányúak; automatikus „down”
  migráció nincs. Visszaállítás módjai:
  1. **Mentésből visszatöltés** (preferált) — a migráció előtt készített dumpból.
  2. **Kompenzáló migráció** — új, kézzel írt migráció, amely visszacsinálja a
     változást (ha a mentésből visszaállás nem opció).
- **Aranyszabály:** kockázatos (adatromboló) migráció előtt mindig legyen friss,
  ellenőrzött mentés; a rollback csak akkor biztonságos, ha a mentés visszaállása
  korábban tesztelve lett.

## 7. Titokkezelés (Secrets)

- A `DATABASE_URL` az egyetlen jelenlegi kritikus titok; **soha nem kerül a
  repóba** (`.gitignore`: `.env*`).
- Production­ben a hosting környezeti-változó tárolójában él, hozzáférés-korlátozva.
- Titok rotáció: DB-jelszó cseréjekor a `DATABASE_URL`-t frissíteni kell minden
  környezetben, majd az alkalmazást újraindítani.
- A `prisma.config.ts.bak` típusú segéd/biztonsági fájlok ne tartalmazzanak valós
  titkot, és lehetőleg ne is maradjanak a repóban (takarítás javasolt).
- Lásd még az AI-adatkezelési szabályt a `privacy.md` 5. szakaszában: titok
  AI-eszköznek nem adható át.
