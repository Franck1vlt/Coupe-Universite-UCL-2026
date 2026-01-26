import { ReactNode } from "react";
import "./globals.css";
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Coupe de l'Université UCL",
  description: "Application de gestion sportive de la coupe de l'Université",
  icons: {
    icon: '/img/coupe.png', // Chemin vers votre image dans le dossier public
  },
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