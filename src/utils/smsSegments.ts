/** Rough SMS segment estimate: GSM-7 if all code units are ASCII, else UCS-2. */

function isLikelyGsm7(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c > 127) return false;
  }
  return true;
}

export function smsSegmentHint(text: string): {
  charCount: number;
  segments: number;
  encoding: "gsm7" | "ucs2";
  unitLimit: number;
} {
  const charCount = [...text].length;
  if (charCount === 0) {
    return { charCount: 0, segments: 0, encoding: "gsm7", unitLimit: 160 };
  }
  const gsm7 = isLikelyGsm7(text);
  if (gsm7) {
    const segments =
      charCount <= 160 ? 1 : Math.ceil(charCount / 153);
    return { charCount, segments, encoding: "gsm7", unitLimit: 160 };
  }
  const segments = charCount <= 70 ? 1 : Math.ceil(charCount / 67);
  return { charCount, segments, encoding: "ucs2", unitLimit: 70 };
}
