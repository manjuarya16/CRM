/**
 * Color utilities for Dynamic Branding Engine
 */

export const isValidHex = (hex: string): boolean => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex.trim());
};

export const adjustColorBrightness = (hex: string, percent: number): string => {
  if (!hex) return "#0E90D9";
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return hex;

  let r = (num >> 16) + Math.round(255 * (percent / 100));
  let g = ((num >> 8) & 0x00ff) + Math.round(255 * (percent / 100));
  let b = (num & 0x0000ff) + Math.round(255 * (percent / 100));

  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

export const getContrastTextColor = (hex: string): string => {
  if (!hex) return "#ffffff";
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;

  // Perceived luminance (ITU-R BT.709)
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  return luminance >= 160 ? "#111827" : "#ffffff";
};

export const getHoverColor = (hex: string): string => {
  if (!hex) return "#232894";
  const clean = hex.replace("#", "").trim();
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  // If color is dark, lighten on hover; if light/normal, darken on hover
  return luminance < 85 ? adjustColorBrightness(hex, 14) : adjustColorBrightness(hex, -12);
};

export const getActiveColor = (hex: string): string => {
  if (!hex) return "#373ca8";
  const clean = hex.replace("#", "").trim();
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  return luminance < 85 ? adjustColorBrightness(hex, 22) : adjustColorBrightness(hex, -20);
};

/**
 * Extracts the most prominent vibrant brand color from an image (URL or data URL)
 */
export const extractDominantColor = (imageSrc: string): Promise<string> => {
  return new Promise((resolve) => {
    if (!imageSrc) return resolve("#0E90D9");

    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve("#0E90D9");

        // Scale down to 64x64 for fast pixel scanning
        canvas.width = 64;
        canvas.height = 64;
        ctx.drawImage(img, 0, 0, 64, 64);

        const imgData = ctx.getImageData(0, 0, 64, 64);
        const data = imgData.data;

        const colorMap: Record<string, { count: number; r: number; g: number; b: number; score: number }> = {};

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          // Ignore transparent pixels
          if (a < 120) continue;

          // Ignore pure white / near-white background
          if (r > 235 && g > 235 && b > 235) continue;

          // Ignore pure black / very dark shadows
          if (r < 18 && g < 18 && b < 18) continue;

          // Compute saturation and lightness
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const delta = max - min;
          const saturation = max === 0 ? 0 : delta / max;

          // Quantize into buckets of 16 to group similar shades
          const qr = Math.round(r / 16) * 16;
          const qg = Math.round(g / 16) * 16;
          const qb = Math.round(b / 16) * 16;
          const key = `${qr},${qg},${qb}`;

          if (!colorMap[key]) {
            colorMap[key] = { count: 0, r: qr, g: qg, b: qb, score: 0 };
          }

          colorMap[key].count += 1;
          // Heavily favor saturated brand colors over dull grays
          colorMap[key].score += 1 + saturation * 4;
        }

        let bestKey = "";
        let maxScore = -1;

        for (const [key, item] of Object.entries(colorMap)) {
          if (item.score > maxScore) {
            maxScore = item.score;
            bestKey = key;
          }
        }

        if (bestKey && colorMap[bestKey]) {
          const { r, g, b } = colorMap[bestKey];
          const hex = `#${((1 << 24) + (Math.min(255, r) << 16) + (Math.min(255, g) << 8) + Math.min(255, b))
            .toString(16)
            .slice(1)}`;
          return resolve(hex);
        }
      } catch (err) {
        console.error("extractDominantColor failed:", err);
      }
      resolve("#0E90D9");
    };

    img.onerror = () => resolve("#0E90D9");
    img.src = imageSrc;
  });
};
