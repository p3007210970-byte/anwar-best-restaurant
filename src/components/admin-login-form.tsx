"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Sign in failed. Please try again.");
        return;
      }
      router.replace("/admin");
    } catch {
      setError("We couldn't reach the sign-in service. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="admin-login-form" onSubmit={handleSubmit}>
      <label htmlFor="admin-email">EMAIL ADDRESS</label>
      <input id="admin-email" name="email" type="email" autoComplete="username" required maxLength={254} />
      <label htmlFor="admin-password">PASSWORD</label>
      <input id="admin-password" name="password" type="password" autoComplete="current-password" required maxLength={200} />
      <p className="admin-form-error" aria-live="polite">{error}</p>
      <button className="button button-dark" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing in…" : "Sign in securely"} <span aria-hidden="true">↗</span>
      </button>
    </form>
  );
}
