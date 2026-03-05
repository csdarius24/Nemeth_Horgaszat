"use client";

import React from "react";

export default function GlassModal({
                                       open,
                                       title,
                                       subtitle,
                                       onCloseAction,
                                       children,
                                       footer,
                                       width = 560,
                                   }: {
    open: boolean;
    title: string;
    subtitle?: string;
    onCloseAction: () => void;
    children: React.ReactNode;
    footer?: React.ReactNode;
    width?: number;
}) {
    if (!open) return null;

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
                zIndex: 60,
            }}
            onMouseDown={(e) => {
                // klik kint -> bezárás
                if (e.target === e.currentTarget) onCloseAction();
            }}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="glass card"
                style={{ width: `min(${width}px, 100%)` }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div>
                        <h2 className="h2" style={{ fontSize: 18 }}>
                            {title}
                        </h2>
                        {subtitle ? (
                            <div className="muted" style={{ marginTop: 6 }}>
                                {subtitle}
                            </div>
                        ) : null}
                    </div>

                    <button className="iconbtn" onClick={onCloseAction} aria-label="Bezárás">
                        ✕
                    </button>
                </div>

                <div style={{ marginTop: 14 }}>{children}</div>

                {footer ? <div style={{ marginTop: 16 }}>{footer}</div> : null}
            </div>
        </div>
    );
}