import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminDashboard from "@/components/admin-dashboard";
import { getCurrentAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Restaurant dashboard | Anwar Best Restaurant",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function AdminPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  return <AdminDashboard email={admin.email} />;
}
