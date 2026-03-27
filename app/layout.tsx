import type { Metadata } from 'next';
import './globals.css';
import QueryProvider from '@/profiders/QueryProvider';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner'; 

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'IUG - Planning',
  description: 'Application de gestion des charges horaires de l\'IUG',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={cn("font-sans", geist.variable)}>
      <body className="bg-gray-50 text-gray-900 antialiased">
        <QueryProvider>
          <TooltipProvider delay={300}>
            {children}
          </TooltipProvider>
        </QueryProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}