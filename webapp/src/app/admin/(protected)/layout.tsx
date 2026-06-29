import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionValue, COOKIE_NAME } from "@/lib/adminSession";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;

  if (!verifySessionValue(session)) {
    redirect("/admin/login");
  }

  return <>{children}</>;
}
