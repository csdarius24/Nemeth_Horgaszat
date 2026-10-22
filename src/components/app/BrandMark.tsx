import { cn } from "@/lib/utils";

/**
 * Fish App márkanév. Egyelőre csak felirat (nincs végleges logó); egy helyen
 * definiálva, hogy a login, a regisztráció és a fejlécek mindig ugyanazt mutassák.
 */
export function BrandMark({
    inverted = false,
    size = "md",
    className,
}: {
    /** Sötét háttéren (pl. auth márkapanel) fehér felirat. */
    inverted?: boolean;
    size?: "sm" | "md";
    className?: string;
}) {
    return (
        <span
            className={cn(
                "truncate font-heading font-extrabold tracking-tight",
                size === "md" ? "text-xl" : "text-lg",
                inverted ? "text-white" : "text-foreground",
                className
            )}
        >
            Fish App
        </span>
    );
}
