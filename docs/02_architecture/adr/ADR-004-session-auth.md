# ADR-004

## Title

Session alapú authentikáció

## Status

Accepted

## Context

A rendszer webalkalmazásként működik.

## Decision

Session alapú authentikáció használata.

## Consequences

Előnyök:

- egyszerűbb jogosultságkezelés
- HttpOnly cookie támogatás

Hátrányok:

- szerveroldali session tárolás szükséges