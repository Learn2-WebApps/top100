import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "인수인계 없는 첫 출근",
  description: "흩어진 자료 속에서 핵심 정보를 찾아 업무 상황을 파악하는 실전 미션입니다.",
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
