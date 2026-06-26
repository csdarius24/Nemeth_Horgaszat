# Product Vision

## Tézis-irány (témavezetői visszajelzés alapján)

A projekt iránya a témavezetői visszajelzés nyomán élesedett: egy **általános
horgászati nyilvántartó rendszer** helyett egy **halgazdálkodási műveleteket
támogató, nyomon követhető üzemeltetési MVP** felé. A hangsúly nem pusztán
adatrögzítésen van, hanem a **napi halgazdálkodási műveletek** támogatásán és
azok **auditálható, tóra bontott történetén**.

A reframing központi elemei:

- **halállomány-követés** — fajonkénti, tavankénti aktuális készlet,
- **műveleti naplózás** — minden telepítés / kivét / etetés / áttelepítés
  auditálható eseményként rögzül,
- **takarmánykészlet** — a takarmány mint nyilvántartott, dinamikusan változó
  erőforrás,
- **tó-szintű történet** — egy tó teljes művelet-idővonala visszakereshető,
- **döntéstámogatás** — összesítő nézetek (dashboard) a gazdálkodói döntésekhez,
- **nyomon követhető halgazdálkodási műveletek** — ki, mit, mikor, melyik tóban.

## Probléma

A kisebb és közepes méretű magyarországi halgazdaságok jelentős része papír alapú
vagy Excel alapú nyilvántartásokat használ. Ez nem csak adminisztratív teher: a
napi **halgazdálkodási műveletek** (telepítés, kivét, etetés, áttelepítés,
takarmányfelhasználás) nem állnak össze egyetlen, megbízható, tóra bontott képpé.

Ez nehezíti:

- a halállomány pontos nyomon követését tavanként és fajonként,
- a telepítések és kivételek auditálható dokumentálását,
- az etetések és a takarmányfelhasználás követését,
- a takarmánykészlet naprakész nyilvántartását,
- a lehalászás és a szezonális tervezés előkészítését,
- a felelős (ki végezte a műveletet) és a jogosultságok kezelését.

## Megoldás

A Németh Horgászat egy webes, több-bérlős (multi-tenant) **halgazdálkodási
művelet-támogató rendszer**, amely a halgazdaságok napi műveleteit digitális,
auditálható nyilvántartásba szervezi. Minden adat egy halászathoz (tenant)
tartozik; a műveletek a tavakhoz kötődnek, és minden fontos művelet
naplóeseményt képez.

## Célfelhasználók

- halgazdaság tulajdonosok
- gazdaságvezetők
- alkalmazottak (dolgozók)
- horgászegyesületek üzemeltetői

## Sikerkritériumok

- a halállomány digitális, tavankénti/fajonkénti követése,
- a műveletek (telepítés, kivét, etetés, áttelepítés) auditálható naplózása,
- a takarmánykészlet nyilvántartása és mozgásainak rögzítése,
- összesítő nézetek a döntéstámogatáshoz,
- szerepkör alapú jogosultságkezelés és tenant-izoláció,
- több halászat biztonságos, egymástól elkülönített kezelése.

## Tézis-scope — munkacím

> **„Halgazdálkodási műveleteket támogató webalkalmazás fejlesztése többtavas
> horgászatok számára"**

A szakdolgozat a fenti munkacím alatt a halgazdálkodási műveletek
digitalizálását és nyomon követhetőségét vizsgálja egy működő MVP-n keresztül.
A pontos MVP-határokat (in scope / out of scope) a
[`scope-contract.md`](scope-contract.md) rögzíti.

## Témavezetői visszajelzés — illesztés és továbblépés (SZD2)

A témavezetői visszajelzés lényege: a projektet **ne** általános „horgászati
adminisztrációként", hanem **halgazdálkodási műveleteket támogató, nyomon
követhető rendszerként** pozícionáljuk. Ez a dokumentációs irány ezt a fókuszt
követi.

A jelenlegi MVP (SZD1) az alábbi műveleti magot **megvalósítva** tartalmazza:
többtavas, több-bérlős kezelés; halfaj- és halállomány-nyilvántartás;
telepítés / kivét / etetés / áttelepítés tranzakciós műveletek auditnaplóval;
takarmánykészlet-nyilvántartás mozgásrögzítéssel; összesítő dashboard;
szerepkör alapú hozzáférés.

Időközben **megvalósult**:

- **Takarmány ↔ etetés összekötése:** az etetési művelet (`takarmanyId` megadva)
  automatikusan levonja a felhasznált takarmányt a készletből, és nyomon
  követhető `FELHASZNALVA` mozgást rögzít — egy tranzakcióban. A `takarmanyId`
  nélküli etetés továbbra is támogatott (a készlet ilyenkor nem változik). ✅

A **továbblépés SZD2-ben** (jelenleg **tervezett**, nem megvalósított):
- **Halkeltetési modul:** ikráztatás / lárva- és ivadéknevelés nyilvántartása
  (jelenleg csak placeholder oldal létezik). *Tervezett.*
- **Bővített döntéstámogatás:** trendek, előrejelző-jellegű összesítések,
  lehalászás-tervezés. *Tervezett.*
- **Teljes körű verifikáció:** integration + e2e tesztek az elfogadási
  kritériumokra (lásd `docs/04_quality`). *Tervezett.*

## Jövőkép

A rendszer hosszú távú célja, hogy több halgazdaság közös SaaS platformon,
egységes, auditálható műveleti nyilvántartással gazdálkodjon — a napi
műveletektől a szezonális döntéstámogatásig.
