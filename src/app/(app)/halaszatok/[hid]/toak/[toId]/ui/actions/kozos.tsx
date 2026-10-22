"use client";

import { Button } from "@/components/ui/button";

/** A tó-műveleti modálok közös propjai. */
export type MuveletModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    hid: string;
    toId: string;
    /** Sikeres mentés után (pl. a tó adatainak újratöltése). */
    onMentve: () => void | Promise<void>;
};

/** A tóban lévő aktuális állomány halfajonként (a Kivétel/Áttelepítés segédszövegéhez). */
export type AllomanyTetel = { halfajId: number; nev: string; darab: number };

export function MuveletLablec({ formId, saving, onMegse, mentesFelirat = "Mentés", disabled }: {
    formId: string;
    saving: boolean;
    onMegse: () => void;
    mentesFelirat?: string;
    disabled?: boolean;
}) {
    return (
        <>
            <Button variant="outline" onClick={onMegse} disabled={saving}>Mégse</Button>
            <Button type="submit" form={formId} loading={saving} disabled={disabled}>{mentesFelirat}</Button>
        </>
    );
}

/** API hibaüzenet kinyerése (a végpontok `error` vagy `hiba` kulcsot használnak). */
export function apiHiba(json: unknown, alap: string) {
    const j = json as { error?: string; hiba?: string } | null;
    return j?.error ?? j?.hiba ?? alap;
}
