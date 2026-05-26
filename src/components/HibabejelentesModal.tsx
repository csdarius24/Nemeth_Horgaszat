"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import GlassModal from "@/components/ui/GlassModal";

type Props = {
    open: boolean;
    onClose: () => void;
    felhasznaloId: number | null;
    halaszatId: number | null;
};

const mezoStilus: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 14,
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.14)",
    color: "var(--text)",
    outline: "none",
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
            }, 900);
        } catch (error) {
            console.error(error);
            setHibaUzenet("Hálózati hiba történt.");
        } finally {
            setKuldesFolyamatban(false);
        }
    }

    return (
        <GlassModal
            open={open}
            onCloseAction={onClose}
            title="Hibabejelentés"
            subtitle="Írd le röviden és érthetően, mi történt, hogy könnyen vissza tudjam követni."
            width={620}
            footer={
                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 10,
                    }}
                >
                    <button
                        type="button"
                        className="btn"
                        onClick={onClose}
                        disabled={kuldesFolyamatban}
                    >
                        Mégse
                    </button>

                    <button
                        type="submit"
                        form="hibabejelentes-form"
                        className="btn btn-primary"
                        disabled={kuldesFolyamatban}
                    >
                        {kuldesFolyamatban ? "Küldés..." : "Beküldés"}
                    </button>
                </div>
            }
        >
            <form
                id="hibabejelentes-form"
                onSubmit={handleSubmit}
                style={{ display: "grid", gap: 14 }}
            >
                <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontWeight: 700, fontSize: 14 }}>Tárgy</label>
                    <input
                        type="text"
                        value={targy}
                        onChange={(e) => setTargy(e.target.value)}
                        maxLength={150}
                        required
                        placeholder="Pl. Nem mentődik a telepítés"
                        style={mezoStilus}
                    />
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontWeight: 700, fontSize: 14 }}>Leírás</label>
                    <textarea
                        value={leiras}
                        onChange={(e) => setLeiras(e.target.value)}
                        required
                        rows={7}
                        placeholder="Írd le részletesen, mit csináltál, mi történt, és mit vártál volna."
                        style={{
                            ...mezoStilus,
                            resize: "vertical",
                            minHeight: 150,
                        }}
                    />
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontWeight: 700, fontSize: 14 }}>Oldal</label>
                    <input
                        type="text"
                        value={pathname}
                        readOnly
                        style={{
                            ...mezoStilus,
                            opacity: 0.75,
                        }}
                    />
                </div>

                {sikerUzenet ? (
                    <div
                        style={{
                            borderRadius: 14,
                            padding: "10px 12px",
                            background: "rgba(34,197,94,0.12)",
                            border: "1px solid rgba(34,197,94,0.25)",
                            color: "#d1fae5",
                            fontSize: 14,
                            fontWeight: 600,
                        }}
                    >
                        {sikerUzenet}
                    </div>
                ) : null}

                {hibaUzenet ? (
                    <div
                        style={{
                            borderRadius: 14,
                            padding: "10px 12px",
                            background: "rgba(239,68,68,0.12)",
                            border: "1px solid rgba(239,68,68,0.25)",
                            color: "#fecaca",
                            fontSize: 14,
                            fontWeight: 600,
                        }}
                    >
                        {hibaUzenet}
                    </div>
                ) : null}
            </form>
        </GlassModal>
    );
}