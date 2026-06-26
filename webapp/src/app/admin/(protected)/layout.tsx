"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export default function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/admin/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "var(--color-canvas-parchment)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "28px", height: "28px",
            border: "2.5px solid var(--color-hairline)",
            borderTopColor: "var(--color-primary)",
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
            margin: "0 auto 14px",
          }} />
          <p style={{ fontSize: "14px", color: "var(--color-ink-muted-48)" }}>인증 확인 중…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
