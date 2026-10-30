import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Zyveron Play - Painel de Controle",
  description: "Gerenciamento de servidores, DNS em massa, ativação por MAC e revendas para Zyveron Play TV.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.svg", type: "image/svg+xml" }
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="bg-[#090d12] text-zinc-100 antialiased min-h-screen">
        <AuthProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 ml-64 flex flex-col min-h-screen bg-[#090d12]">
              {children}
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}

