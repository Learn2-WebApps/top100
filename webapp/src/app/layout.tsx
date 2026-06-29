import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI TOP100 업무 역량 진단",
  description: "AI를 활용한 실전 업무 역량을 점검하는 평가입니다.",
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
