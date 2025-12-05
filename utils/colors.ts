// Converts a hex color string to an HSL object
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    // Return a default color if hex is invalid
    return { h: 217, s: 91, l: 60 };
  }

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// Generates a palette of color shades from a base hex color.
export function generateColorShades(baseHex: string): { [key: string]: string } {
  const { h, s, l: baseL } = hexToHSL(baseHex);
  const shades: { [key: string]: string } = {};

  // Define how much to adjust lightness for each shade relative to the base color (500)
  const lightnessScale: { [key: string]: number } = {
    '50': 0.95,
    '100': 0.85,
    '200': 0.70,
    '300': 0.55,
    '400': 0.40,
    '500': 0, // Base color offset
    '600': -0.10,
    '700': -0.20,
    '800': -0.30,
    '900': -0.40,
    '950': -0.55,
  };

  for (const shade in lightnessScale) {
    const adjustment = lightnessScale[shade];
    let newL;

    if (adjustment > 0) {
      // For lighter shades, interpolate between the base lightness and pure white (100)
      newL = baseL + (100 - baseL) * adjustment;
    } else {
      // For darker shades, interpolate between the base lightness and pure black (0)
      newL = baseL + baseL * adjustment; // adjustment is negative here
    }
    
    // Clamp lightness to be within the valid 0-100 range
    newL = Math.max(0, Math.min(100, Math.round(newL)));

    shades[shade] = `${h} ${s}% ${newL}%`;
  }
  
  // Ensure the 500 shade is the exact user-selected color
  shades['500'] = `${h} ${s}% ${baseL}%`;

  return shades;
}

