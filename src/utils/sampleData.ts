import { SavedAlbum, ImageItem } from '../types';

function createSvgPhoto(title: string, subtitle: string, gradient: [string, string], iconSvg: string): string {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${gradient[0]}" />
        <stop offset="100%" stop-color="${gradient[1]}" />
      </linearGradient>
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.07 0" />
      </filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#grad)" />
    <rect width="100%" height="100%" filter="url(#noise)" opacity="0.4" />
    <circle cx="400" cy="400" r="180" fill="white" opacity="0.15" />
    <g transform="translate(340, 340) scale(5)" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.9">
      ${iconSvg}
    </g>
    <rect x="60" y="700" width="680" height="220" rx="20" fill="black" opacity="0.25" />
    <text x="400" y="770" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="38" font-weight="bold" fill="white" text-anchor="middle" letter-spacing="1">${title}</text>
    <text x="400" y="825" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" fill="#f1f5f9" text-anchor="middle" opacity="0.9">${subtitle}</text>
    <text x="400" y="880" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" fill="#cbd5e1" text-anchor="middle">album kenangan • 2026</text>
  </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function generateSampleAlbum(): SavedAlbum {
  const images: ImageItem[] = [
    {
      id: 'sample-1',
      name: 'pantai-sunset.jpg',
      originalSize: 2450000,
      compressedSize: 42000,
      compressedBase64: createSvgPhoto(
        'Senja di Pantai Kuta',
        'Matahari terbenam dengan warna jingga keemasan',
        ['#f97316', '#db2777'],
        '<path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.95 16.5a4 4 0 0 0-7.9 0"/><path d="M3 20h18"/>'
      ),
      width: 800,
      height: 1000,
      orientation: 'portrait',
      caption: 'Menikmati hembusan angin laut dan deburan ombak saat matahari perlahan tenggelam.',
    },
    {
      id: 'sample-2',
      name: 'danau-pegunungan.jpg',
      originalSize: 3100000,
      compressedSize: 45000,
      compressedBase64: createSvgPhoto(
        'Danau Kabut Pagi',
        'Kesejukan udara pegunungan yang menenangkan jiwa',
        ['#0ea5e9', '#1e3a8a'],
        '<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>'
      ),
      width: 800,
      height: 1000,
      orientation: 'portrait',
      caption: 'Pagi hari yang berkabut di tepi danau, secangkir teh hangat menemani obrolan santai.',
    },
    {
      id: 'sample-3',
      name: 'kafe-senja.jpg',
      originalSize: 1980000,
      compressedSize: 38000,
      compressedBase64: createSvgPhoto(
        'Kopi & Kenangan',
        'Sudut kafe favorit dengan alunan musik akustik',
        ['#b45309', '#78350f'],
        '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/>'
      ),
      width: 800,
      height: 1000,
      orientation: 'portrait',
      caption: 'Tawa dan cerita bersama sahabat lama yang tak lekang oleh waktu.',
    },
    {
      id: 'sample-4',
      name: 'malam-bintang.jpg',
      originalSize: 2800000,
      compressedSize: 49000,
      compressedBase64: createSvgPhoto(
        'Bintang di Atas Bukit',
        'Malam hening bertabur jutaan gemintang',
        ['#312e81', '#0f172a'],
        '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'
      ),
      width: 800,
      height: 1000,
      orientation: 'portrait',
      caption: 'Menatap langit malam dan merenungi setiap langkah yang telah dilalui.',
    },
  ];

  return {
    id: 'demo-sample-album',
    title: 'Petualangan Musim Panas',
    subtitle: 'Kumpulan momen tak terlupakan di perjalanan indah kami',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2, // 2 days ago
    updatedAt: Date.now(),
    images,
    config: {
      title: 'Petualangan Musim Panas',
      subtitle: 'Kumpulan momen tak terlupakan di perjalanan indah kami',
      theme: 'vintage',
      transition: 'slide',
      showPageNumbers: true,
      autoplay: false,
      autoplayInterval: 4,
      photosPerPage: 4,
    },
    coverImage: images[0].compressedBase64,
  };
}
