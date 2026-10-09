import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { CartDrawerSlot } from '@/components/cart/CartDrawerSlot';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Toaster } from '@/components/toast/Toaster';
import { fontVariables } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Armazém Trote & Cia — Secos & Molhados, desde 1887',
    template: '%s · Armazém Trote & Cia',
  },
  description:
    'Mercadorias finas entregues no ritmo do casco — de burro, cavallo ou charrete. Frete calculado em léguas.',
};

export const viewport: Viewport = {
  themeColor: '#3b2416',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={fontVariables}>
      <body>
        <SiteHeader />
        <main id="conteudo" style={{ flex: 1 }}>
          {children}
        </main>
        <SiteFooter />
        <CartDrawerSlot />
        <Toaster />
      </body>
    </html>
  );
}
