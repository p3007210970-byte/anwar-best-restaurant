import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AdminLoginForm from "@/components/admin-login-form";
import { getCurrentAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Owner sign in | Anwar Best Restaurant",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function AdminLoginPage() {
  if (await getCurrentAdmin()) redirect("/admin");

  return (
    <main className="admin-login-page">
      <Link className="admin-back-link" href="/">← Back to restaurant</Link>
      <section className="admin-login-card">
        <span className="brand-mark">A</span>
        <p className="eyebrow"><span /> OWNER ACCESS</p>
        <h1>Welcome <em>back.</em></h1>
        <p className="admin-login-intro">Sign in to manage reservations, your menu and restaurant details.</p>
        <AdminLoginForm />
        <p className="admin-login-help">The owner account is created securely during initial setup.</p>
      </section>
    </main>
  );
}
