import React from "react";

export default function GlassCard({
                                      title,
                                      right,
                                      children,
                                      className,
                                  }: {
    title?: string;
    right?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <section className={`glass card ${className ?? ""}`}>
            {(title || right) && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                    {title ? <h2 className="h2">{title}</h2> : <div />}
                    {right}
                </div>
            )}
            {children}
        </section>
    );
}