import React from "react";
import "../styles/platinum.css";

type PlatinumLoginFrameProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  actionSlot?: React.ReactNode;
};

export default function PlatinumLoginFrame({
  title,
  subtitle,
  children,
  actionSlot,
}: PlatinumLoginFrameProps) {
  return (
    <div className="pl-wrap">
      <div className="pl-card">
        <section className="pl-left">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div
              style={{
                height: 36,
                width: 36,
                borderRadius: 12,
                background: "#dfe3ec",
                display: "grid",
                placeItems: "center",
                color: "#0c0f15",
                fontWeight: 800,
              }}
            >
              C
            </div>
            <div>
              <div style={{ fontWeight: 700, letterSpacing: "-.02em" }}>CMMS</div>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: ".28em",
                  textTransform: "uppercase",
                  color: "#9aa2b1",
                }}
              >
                WorkPro Suite
              </div>
            </div>
          </div>

          <h1 className="pl-h1">Orchestrate maintenance workflows with breathtaking clarity.</h1>
          <p className="pl-sub">
            Predictive scheduling, real-time analytics, and collaboration—designed for teams who treat uptime as a promise.
          </p>

          <div className="pl-points">
            <div className="pl-point">
              <i>🔒</i>Zero-trust perimeter • enterprise-grade security
            </div>
            <div className="pl-point">
              <i>🤝</i>Collaboration, notifications, permits & audits
            </div>
            <div className="pl-point">
              <i>📈</i>KPI dashboards • trends • smart insights
            </div>
          </div>
        </section>

        <section className="pl-right">
          {actionSlot}
          <h3 className="pl-title">{title}</h3>
          {subtitle ? <p className="pl-muted">{subtitle}</p> : null}
          {children}
        </section>
      </div>
    </div>
  );
}
