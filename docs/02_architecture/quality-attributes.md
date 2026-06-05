# Quality Attributes

## Security

A rendszer csak hitelesített felhasználók számára érhető el.

A hozzáférést szerepkör alapú jogosultságkezelés szabályozza.

A jelszavak bcrypt algoritmussal kerülnek tárolásra.

A session tokenek HttpOnly cookie-ban tárolódnak.

---

## Availability

A rendszer webes felületen keresztül érhető el.

A szolgáltatás célja a napi használhatóság biztosítása halgazdasági környezetben.

---

## Maintainability

A projekt rétegezett felépítésű:

- frontend
- API
- domain logika
- adatbázis

A Prisma ORM biztosítja az adatbázis réteg egységességét.

---

## Scalability

A rendszer multi-tenant architektúrát használ.

Minden halászat logikailag elkülönített adatkészlettel rendelkezik.

A megoldás alkalmas több halászat egyidejű kiszolgálására.

---

## Auditability

Minden fontos művelet naplózásra kerül.

A naplózott események:

- telepítés
- kivétel
- etetés
- egyéb állományváltozások

visszakövethetőek.

---

## Data Integrity

A rendszer tranzakciós adatbázist használ.

Az állományváltozások konzisztenciáját az adatmodell és az alkalmazáslogika biztosítja.