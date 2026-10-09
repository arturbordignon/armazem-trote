import localFont from 'next/font/local';

// Self-hosted subset fonts (see fonts/README.md). `swap` paints text immediately in a
// size-adjusted fallback, so the real face arrives without shifting the layout. Only the two
// display faces of the shop sign and headlines are preloaded: on a slow phone connection,
// preloading every face competed with the stylesheet for bandwidth.

export const fell = localFont({
  src: [
    { path: './fonts/im-fell-english-regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/im-fell-english-italic.woff2', weight: '400', style: 'italic' },
  ],
  display: 'swap',
  preload: false,
  adjustFontFallback: 'Times New Roman',
  variable: '--font-fell',
});

export const fellSmallCaps = localFont({
  src: './fonts/im-fell-english-sc.woff2',
  weight: '400',
  display: 'swap',
  preload: false,
  adjustFontFallback: 'Times New Roman',
  variable: '--font-fell-sc',
});

export const oswald = localFont({
  src: './fonts/oswald.woff2',
  weight: '400 700',
  display: 'swap',
  preload: false,
  adjustFontFallback: 'Arial',
  variable: '--font-oswald',
});

export const rye = localFont({
  src: './fonts/rye.woff2',
  weight: '400',
  display: 'swap',
  adjustFontFallback: 'Arial',
  variable: '--font-rye',
});

export const ultra = localFont({
  src: './fonts/ultra.woff2',
  weight: '400',
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
  variable: '--font-ultra',
});

export const courier = localFont({
  src: [
    { path: './fonts/courier-prime-regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/courier-prime-bold.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  preload: false,
  adjustFontFallback: 'Arial',
  variable: '--font-courier',
});

export const handwriting = localFont({
  src: './fonts/homemade-apple.woff2',
  weight: '400',
  display: 'swap',
  preload: false,
  adjustFontFallback: 'Arial',
  variable: '--font-hand',
});

export const fontVariables = [fell, fellSmallCaps, oswald, rye, ultra, courier, handwriting]
  .map((font) => font.variable)
  .join(' ');
