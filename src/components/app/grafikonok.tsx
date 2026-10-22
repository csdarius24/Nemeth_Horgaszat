"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

/** Szám magyar formátumban (Decimal/string bemenetet is elfogad). */
export function fmtSzam(x: unknown) {
    const n = typeof x === "number" ? x : Number(String(x ?? 0).replace(",", "."));
    return Number.isFinite(n) ? n.toLocaleString("hu-HU", { maximumFractionDigits: 2 }) : "–";
}

// ─── Grafikon kártya ─────────────────────────────────────────────────────────

export function GrafikonKartya({ cim, leiras, jobb, children, className }: {
    cim: string;
    leiras?: string;
    jobb?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle>{cim}</CardTitle>
                {leiras && <CardDescription>{leiras}</CardDescription>}
                {jobb && <CardAction className="flex gap-2">{jobb}</CardAction>}
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

/** Vízszintes oszlopdiagram — egy sorozat, soronként saját színnel. */
export function VizszintesOszlop({ adat, config, mertekegyseg = "db" }: {
    adat: Array<{ nev: string; ertek: number; kulcs: string; fill: string }>;
    config: ChartConfig;
    mertekegyseg?: string;
}) {
    return (
        <ChartContainer config={config} className="aspect-auto w-full" style={{ height: Math.max(160, adat.length * 44) }}>
            <BarChart data={adat} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                <YAxis dataKey="nev" type="category" width={96} tickLine={false} axisLine={false} />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel formatter={(v, _n, item) => (
                        <div className="flex w-full items-center justify-between gap-4">
                            <span className="text-muted-foreground">{item.payload.nev}</span>
                            <span className="font-mono font-medium tabular-nums">{fmtSzam(v)} {mertekegyseg}</span>
                        </div>
                    )} />}
                />
                {/* A soronkénti szín az adat `fill` mezőjéből jön (config → --color-<kulcs>). */}
                <Bar dataKey="ertek" radius={6} maxBarSize={32} />
            </BarChart>
        </ChartContainer>
    );
}

