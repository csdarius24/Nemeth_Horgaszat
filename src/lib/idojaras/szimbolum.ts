// MET Norway időjárás-szimbólum kódok (pl. "partlycloudy_day", "heavyrainandthunder")
// → magyar megnevezés + ikon-kategória. Tiszta függvény, unit-tesztelhető.

export type IkonKategoria =
    | "derult" | "derult_ejjel" | "kisse_felhos" | "kisse_felhos_ejjel" | "borult" | "kod"
    | "zivatar" | "ho" | "havaseso" | "szitalas" | "eso";

export type SzimbolumInfo = { cimke: string; ikon: IkonKategoria };

export function szimbolumInfo(kod: string | null | undefined): SzimbolumInfo | null {
    if (!kod) return null;
    const ejjel = kod.endsWith("_night");
    const alap = kod.replace(/_(day|night|polartwilight)$/, "");

    if (alap.includes("thunder")) return { cimke: "Zivatar", ikon: "zivatar" };
    if (alap.includes("sleet")) return { cimke: "Havas eső", ikon: "havaseso" };
    if (alap.includes("snow")) {
        return { cimke: alap.startsWith("heavy") ? "Erős havazás" : alap.startsWith("light") ? "Gyenge havazás" : "Havazás", ikon: "ho" };
    }
    if (alap.includes("rain")) {
        if (alap.includes("showers")) return { cimke: alap.startsWith("heavy") ? "Heves zápor" : "Zápor", ikon: "eso" };
        if (alap.startsWith("light")) return { cimke: "Gyenge eső", ikon: "szitalas" };
        if (alap.startsWith("heavy")) return { cimke: "Heves eső", ikon: "eso" };
        return { cimke: "Eső", ikon: "eso" };
    }
    switch (alap) {
        case "clearsky": return { cimke: "Derült", ikon: ejjel ? "derult_ejjel" : "derult" };
        case "fair": return { cimke: "Kissé felhős", ikon: ejjel ? "kisse_felhos_ejjel" : "kisse_felhos" };
        case "partlycloudy": return { cimke: "Részben felhős", ikon: ejjel ? "kisse_felhos_ejjel" : "kisse_felhos" };
        case "cloudy": return { cimke: "Borult", ikon: "borult" };
        case "fog": return { cimke: "Köd", ikon: "kod" };
        default: return { cimke: "Felhős", ikon: "borult" };
    }
}
