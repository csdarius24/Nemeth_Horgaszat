# ADR-005

## Title

Multi-tenant architektúra

## Status

Accepted

## Context

A rendszer több halászat kiszolgálására készül.

## Decision

Minden halászat tenantként kerül kezelésre.

## Consequences

Előnyök:

- adatszeparáció
- SaaS modell támogatása

Hátrányok:

- összetettebb jogosultságkezelés