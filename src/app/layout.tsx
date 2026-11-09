import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anwar Best Restaurant | Good Food, Warm Company",
  description:
    "Honest Pakistani cooking, slow-simmered tradition, and a warm welcome. Explore the menu and reserve your table.",
  openGraph: {
    title: "Anwar Best Restaurant",
    description: "Good food. Warm company. Come as you are.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
