import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Tunix",
  description:
    "Plataforma brasileira para compositores, artistas e produtores encontrarem repertorios e oportunidades.",
  icons: {
    icon: "/brand/tunix-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
