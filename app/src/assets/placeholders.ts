// Luxury-fashion SVG placeholders. Used as default product/hero images for
// new projects so marketers see something polished before uploading their own.
// Emitted as data URLs so they survive localStorage saves + production builds.

const svg = (body: string, w = 600, h = 900) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${body}</svg>`,
  );

const defs = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1F1A15"/>
      <stop offset="60%" stop-color="#13100D"/>
      <stop offset="100%" stop-color="#080603"/>
    </linearGradient>
    <radialGradient id="spot" cx="50%" cy="42%" r="55%">
      <stop offset="0%" stop-color="rgba(196,147,115,0.18)"/>
      <stop offset="100%" stop-color="rgba(196,147,115,0)"/>
    </radialGradient>
    <linearGradient id="bronze" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#C49373"/>
      <stop offset="100%" stop-color="#9C6B48"/>
    </linearGradient>
  </defs>`;

const frame = `
  <rect width="600" height="900" fill="url(#bg)"/>
  <rect width="600" height="900" fill="url(#spot)"/>
  <rect x="40" y="40" width="520" height="820" fill="none" stroke="#C49373" stroke-width="0.5" stroke-opacity="0.22"/>`;

const ornament = (y: number) => `
  <g transform="translate(300,${y})">
    <line x1="-60" y1="0" x2="-10" y2="0" stroke="#C49373" stroke-opacity="0.5" stroke-width="0.8"/>
    <path d="M 0,-4 L 6,0 L 0,4 L -6,0 Z" fill="#C49373" fill-opacity="0.7"/>
    <line x1="10" y1="0" x2="60" y2="0" stroke="#C49373" stroke-opacity="0.5" stroke-width="0.8"/>
  </g>`;

const numPlaceholder = (numeral: string, label: string) =>
  svg(`${defs}${frame}
    <text x="300" y="280" text-anchor="middle" fill="#C49373" font-family="'Nunito Sans', sans-serif" font-weight="700" font-size="22" letter-spacing="10" fill-opacity="0.85">N°</text>
    <text x="300" y="520" text-anchor="middle" fill="url(#bronze)" font-family="'Fraunces', Georgia, serif" font-weight="300" font-size="260" letter-spacing="-8">${numeral}</text>
    ${ornament(620)}
    <text x="300" y="700" text-anchor="middle" fill="#F5F3EF" fill-opacity="0.72" font-family="'Nunito Sans', sans-serif" font-weight="700" font-size="18" letter-spacing="8">${label}</text>
  </svg>`.replace(/<\/svg>$/, ''));

// Fashion item placeholders — numbered series
export const productPlaceholders = {
  p01: numPlaceholder('01', 'DRESS'),
  p02: numPlaceholder('02', 'TROUSER'),
  p03: numPlaceholder('03', 'BLOUSE'),
  p04: numPlaceholder('04', 'HANDBAG'),
  p05: numPlaceholder('05', 'FOOTWEAR'),
  p06: numPlaceholder('06', 'OUTERWEAR'),
};

// Abstract fashion figure — a single flowing silhouette for hero templates
// that want one dramatic image instead of a numbered product.
export const heroSilhouette = svg(`${defs}${frame}
  <g transform="translate(300,470)" fill="url(#bronze)" fill-opacity="0.88">
    <!-- Stylised figure: head + elongated torso + flowing dress hem -->
    <circle cx="0" cy="-230" r="36"/>
    <path d="M -20,-190 L 20,-190 L 34,-80 L 50,80 L 110,350 L -110,350 L -50,80 L -34,-80 Z"/>
    <!-- Accent shoulder -->
    <path d="M -50,-150 L -44,-135 L -40,-100 L -54,-110 Z" fill="#F5F3EF" fill-opacity="0.4"/>
  </g>
  ${ornament(780)}
  <text x="300" y="820" text-anchor="middle" fill="#F5F3EF" fill-opacity="0.6" font-family="'Nunito Sans', sans-serif" font-weight="700" font-size="14" letter-spacing="6">COLLECTION</text>
</svg>`.replace(/<\/svg>$/, ''));

// Abstract sale motif — typographic-only placeholder for promo/countdown
export const salePlaceholder = svg(`${defs}${frame}
  <text x="300" y="440" text-anchor="middle" fill="url(#bronze)" font-family="'Fraunces', Georgia, serif" font-style="italic" font-weight="300" font-size="200" letter-spacing="-4">Sale</text>
  ${ornament(520)}
  <text x="300" y="600" text-anchor="middle" fill="#F5F3EF" fill-opacity="0.72" font-family="'Nunito Sans', sans-serif" font-weight="700" font-size="18" letter-spacing="8">UP TO 50% OFF</text>
</svg>`.replace(/<\/svg>$/, ''));

/** Convenience: first N product placeholders as ordered array. */
export function firstNPlaceholders(n: number): string[] {
  const all = Object.values(productPlaceholders);
  return Array.from({ length: n }, (_, i) => all[i % all.length]);
}
