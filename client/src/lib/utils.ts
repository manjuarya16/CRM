import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export const isLocationMatch = (
  targetLocation: any,
  locationName: any,
): boolean => {
  return (
    locationName === targetLocation ||
    locationName.startsWith(`${targetLocation}/`)
  );
};

export const RGBToHex = (r: number, g: number, b: number): string => {
  const componentToHex = (c: number): string => {
    const hex = c.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  const redHex: string = componentToHex(r);
  const greenHex: string = componentToHex(g);
  const blueHex: string = componentToHex(b);

  return "#" + redHex + greenHex + blueHex;
};

export function hslToHex(hsl: string): string {
  // Remove "hsla(" and ")" from the HSL string
  let hslValues = hsl.replace("hsla(", "").replace(")", "");

  // Split the HSL string into an array of H, S, and L values
  const [h, s, l] = hslValues.split(" ").map((value) => {
    if (value.endsWith("%")) {
      // Remove the "%" sign and parse as a float
      return parseFloat(value.slice(0, -1));
    } else {
      // Parse as an integer
      return parseInt(value);
    }
  });

  // Function to convert HSL to RGB
  function hslToRgb(h: number, s: number, l: number): string {
    h /= 360;
    s /= 100;
    l /= 100;

    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number): number => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    // Convert RGB values to integers
    const rInt = Math.round(r * 255);
    const gInt = Math.round(g * 255);
    const bInt = Math.round(b * 255);

    // Convert RGB values to a hex color code
    const rgbToHex = (value: number): string => {
      const hex = value.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };

    return `#${rgbToHex(rInt)}${rgbToHex(gInt)}${rgbToHex(bInt)}`;
  }

  // Call the hslToRgb function and return the hex color code
  return hslToRgb(h, s, l);
}

export const hexToRGB = (hex: string, alpha?: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  if (alpha) {
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } else {
    return `rgb(${r}, ${g}, ${b})`;
  }
};

export const formatTime = (time: number | Date | string): string => {
  if (!time) return "";

  const date = new Date(time);
  const formattedTime = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return formattedTime;
};

// object check
export function isObjectNotEmpty(obj: any): boolean {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  return Object.keys(obj).length > 0;
}

export const formatDate = (date: string | number | Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return new Date(date).toLocaleDateString("en-US", options);
};

// random word
export function getWords(inputString: string): string {
  // Remove spaces from the input string
  const stringWithoutSpaces = inputString.replace(/\s/g, "");

  // Extract the first three characters
  return stringWithoutSpaces.substring(0, 3);
}

// for path name
export function getDynamicPath(pathname: any): any {
  const prefixes = ["en", "bn", "ar"];

  for (const prefix of prefixes) {
    if (pathname.startsWith(`/${prefix}/`)) {
      return `/${pathname.slice(prefix.length + 2)}`;
    }
  }

  return pathname;
}

// translate

interface Translations {
  [key: string]: string;
}

export const translate = (title: string, trans: Translations): string => {
  const lowercaseTitle = title.toLowerCase();

  if (trans?.hasOwnProperty(lowercaseTitle)) {
    return trans[lowercaseTitle];
  }

  return title;
};

/** 🔐 Token encryption helpers (client-side)
 * Uses Web Crypto API (AES-GCM) when available with a key derived from
 * NEXT_PUBLIC_ENCRYPTION_SECRET / NEXT_PUBLIC_ENCRYPTION_SALT. Falls back
 * to base64(JSON) if crypto is not available.
 */
export async function encryptToken(obj: any): Promise<string> {
  try {
    if (
      typeof window === "undefined" ||
      !(window.crypto && (window.crypto as any).subtle)
    ) {
      // Fallback: base64 encode JSON
      return btoa(JSON.stringify(obj));
    }

    const secret =
      process.env.NEXT_PUBLIC_ENCRYPTION_SECRET || "nata_public_secret";
    const saltStr = process.env.NEXT_PUBLIC_ENCRYPTION_SALT || "nata_salt_v1";

    const enc = new TextEncoder();
    const salt = enc.encode(saltStr);
    const baseKey = await (window.crypto as any).subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "PBKDF2" },
      false,
      ["deriveKey"],
    );
    const key = await (window.crypto as any).subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const plain = new TextEncoder().encode(JSON.stringify(obj));
    const ct = await (window.crypto as any).subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      plain,
    );
    const combined = new Uint8Array(iv.byteLength + ct.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ct), iv.byteLength);

    // base64 encode
    let binary = "";
    for (let i = 0; i < combined.byteLength; i++)
      binary += String.fromCharCode(combined[i]);
    return btoa(binary);
  } catch (err) {
    // Fallback
    try {
      return btoa(JSON.stringify(obj));
    } catch {
      throw err;
    }
  }
}

export async function decryptToken(token: string): Promise<any | null> {
  try {
    if (
      typeof window === "undefined" ||
      !(window.crypto && (window.crypto as any).subtle)
    ) {
      return JSON.parse(atob(token));
    }

    // decode base64
    const binary = atob(token);
    const arr = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const iv = arr.slice(0, 12);
    const ct = arr.slice(12);

    const secret =
      process.env.NEXT_PUBLIC_ENCRYPTION_SECRET || "nata_public_secret";
    const saltStr = process.env.NEXT_PUBLIC_ENCRYPTION_SALT || "nata_salt_v1";

    const enc = new TextEncoder();
    const salt = enc.encode(saltStr);
    const baseKey = await (window.crypto as any).subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "PBKDF2" },
      false,
      ["deriveKey"],
    );
    const key = await (window.crypto as any).subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );

    const plain = await (window.crypto as any).subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ct,
    );
    const decoded = new TextDecoder().decode(plain);
    return JSON.parse(decoded);
  } catch (err) {
    try {
      return JSON.parse(atob(token));
    } catch {
      return null;
    }
  }
}
