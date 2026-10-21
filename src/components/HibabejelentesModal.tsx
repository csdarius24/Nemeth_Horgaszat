"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, AlertCircle } from "lucide-react";

type Props = {
    open: boolean;
    onClose: () => void;
    felhasznaloId: number | null;
    halaszatId: number | null;
};

export default function HibabejelentesModal({
    open,
    onClose,
    felhasznaloId,
    halaszatId,
}: Props) {
    const pathname = usePathname();

    const [targy, setTargy] = useState("");
    const [leiras, setLeiras] = useState("");
    const [kuldesFolyamatban, setKuldesFolyamatban] = useState(false);
    const [sikerUzenet, setSikerUzenet] = useState("");
    const [hibaUzenet, setHibaUzenet] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setKuldesFolyamatban(true);
        setSikerUzenet("");
        setHibaUzenet("");

        try {
            const res = await fetch("/api/hibabejelentesek", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    targy,
                    leiras,
                    oldalUrl: pathname,
                    felhasznaloId,
                    halaszatId,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setHibaUzenet(data?.hiba || "Ismeretlen hiba történt.");
                return;
            }

            setSikerUzenet("A hibabejelentést sikeresen elküldtük.");
            setTargy("");
            setLeiras("");

            setTimeout(() => {
                setSikerUzenet("");
                onClose();
            }, 1200);
        } catch (error) {
            console.error(error);
            setHibaUzenet("Hálózati hiba történt.");
        } finally {
            setKuldesFolyamatban(false);
        }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Hibabejelentés"
            subtitle="Írd le röviden és érthetően, mi történt, hogy könnyen vissza tudjam követni."
            maxWidth="lg"
            footer={
                <>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        disabled={kuldesFolyamatban}
                    >
                        Mégse
                    </Button>
                    <Button
                        type="submit"
                        form="hibabejelentes-form"
                        variant="primary"
                        isLoading={kuldesFolyamatban}
                    >
                        {kuldesFolyamatban ? "Küldés..." : "Beküldés"}
                    </Button>
                </>
            }
        >
            <form id="hibabejelentes-form" onSubmit={handleSubmit} className="grid gap-5">
                
                <div className="grid gap-2">
                    <label className="text-sm font-bold text-foreground">Tárgy</label>
                    <Input
                        type="text"
                        value={targy}
                        onChange={(e) => setTargy(e.target.value)}
                        maxLength={150}
                        required
                        placeholder="Pl. Nem mentődik a telepítés"
                    />
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-bold text-foreground">Leírás</label>
                    <textarea
                        value={leiras}
                        onChange={(e) => setLeiras(e.target.value)}
                        required
                        rows={5}
                        placeholder="Írd le részletesen, mit csináltál, mi történt, és mit vártál volna."
                        className="flex w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm text-foreground transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50 resize-y min-h-[120px]"
                    />
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-bold text-foreground">Oldal</label>
                    <Input
                        type="text"
                        value={pathname}
                        readOnly
                        className="bg-slate-50/50 text-slate-500 border-slate-200 shadow-none pointer-events-none"
                    />
                </div>

                {/* Siker üzenet */}
                {sikerUzenet && (
                    <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 mt-2">
                        <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
                        <div className="text-sm font-semibold">{sikerUzenet}</div>
                    </div>
                )}

                {/* Hiba üzenet */}
                {hibaUzenet && (
                    <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100 text-danger mt-2">
                        <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                        <div className="text-sm font-semibold">{hibaUzenet}</div>
                    </div>
                )}
            </form>
        </Modal>
    );
}
