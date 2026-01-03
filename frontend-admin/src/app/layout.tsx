import { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Dashboard",
  description: "Application de gestion de la coupe universitaire",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <main className="min-h-screen flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
