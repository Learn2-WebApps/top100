import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "웰컴데이 AI 활용 챌린지",
  description: "신입사원 AI 활용 미니 챌린지 — 전임자의 워크스페이스를 복구하라",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
