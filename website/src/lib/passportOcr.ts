import { createWorker, PSM } from "tesseract.js";
import { parse as parseMrz, states as ICAO_STATES } from "mrz";
import { isPdfFile, pdfFirstPageToImageFile } from "@/lib/pdfToImage";

export type PassportOcrFields = {
  fullName: string;
  dateOfBirth: string;
  sex: string;
  nationality: string;
  passportNumber: string;
  passportIssuingCountry: string;
  passportIssueDate: string;
  passportExpiryDate: string;
  placeOfBirth: string;
  documentCode: string;
  rawMrz: string[];
};

export type PassportOcrResult = {
  fields: PassportOcrFields;
  warnings: string[];
  confidence: "high" | "medium" | "low";
};

/** ICAO alpha-3 → apply form country slug */
const ICAO_TO_SLUG: Record<string, string> = {
  AFG: "afghanistan",
  ARG: "argentina",
  AUS: "australia",
  BRA: "brazil",
  CAN: "canada",
  CHN: "china",
  COL: "colombia",
  DEU: "germany",
  D: "germany",
  ESP: "spain",
  FRA: "france",
  GBR: "united-kingdom",
  IND: "india",
  IRN: "iran",
  ISR: "israel",
  ITA: "italy",
  JPN: "japan",
  KAZ: "kazakhstan",
  KOR: "south-korea",
  MYS: "malaysia",
  OMN: "oman",
  PAK: "pakistan",
  PHL: "philippines",
  QAT: "qatar",
  RUS: "russia",
  SAU: "saudi-arabia",
  SGP: "singapore",
  THA: "thailand",
  TUR: "turkey",
  ARE: "uae",
  USA: "united-states",
  UZB: "uzbekistan",
  TJK: "tajikistan",
  TKM: "turkmenistan",
  KGZ: "kyrgyzstan",
  AZE: "azerbaijan",
  IDN: "indonesia",
};

function emptyFields(): PassportOcrFields {
  return {
    fullName: "",
    dateOfBirth: "",
    sex: "",
    nationality: "",
    passportNumber: "",
    passportIssuingCountry: "",
    passportIssueDate: "",
    passportExpiryDate: "",
    placeOfBirth: "",
    documentCode: "",
    rawMrz: [],
  };
}

function icaoToSlug(code: string | null | undefined): string {
  if (!code) return "";
  const upper = code.toUpperCase().replace(/</g, "");
  if (ICAO_TO_SLUG[upper]) return ICAO_TO_SLUG[upper];
  const name = (ICAO_STATES as Record<string, string>)[upper];
  if (!name) return "";
  const normalized = name
    .toLowerCase()
    .replace(/\s*\(the\)\s*/g, "")
    .replace(/[^a-z\s-]/g, "")
    .trim();
  if (normalized.includes("united states")) return "united-states";
  if (normalized.includes("united kingdom") || normalized.includes("britain")) {
    return "united-kingdom";
  }
  if (normalized.includes("emirates")) return "uae";
  if (normalized.includes("korea") && normalized.includes("republic")) {
    return "south-korea";
  }
  return normalized.replace(/\s+/g, "-");
}

/** YYMMDD → YYYY-MM-DD (assumes 19xx for years > current+10 else 20xx heuristic) */
function mrzDateToIso(yymmdd: string | null | undefined): string {
  if (!yymmdd || !/^\d{6}$/.test(yymmdd)) return "";
  const yy = Number(yymmdd.slice(0, 2));
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  const nowYY = new Date().getFullYear() % 100;
  const century = yy > nowYY + 10 ? 1900 : 2000;
  const yyyy = century + yy;
  return `${yyyy}-${mm}-${dd}`;
}

function sexToForm(sex: string | null | undefined): string {
  const s = (sex || "").toLowerCase();
  if (s === "male" || s === "m") return "male";
  if (s === "female" || s === "f") return "female";
  if (s === "unspecified" || s === "<" || s === "x") return "other";
  return "";
}

function normalizeMrzChar(ch: string): string {
  const map: Record<string, string> = {
    " ": "<",
    "«": "<",
    "‹": "<",
    "›": "<",
    "»": "<",
    "|": "I",
    "!": "I",
    "[": "I",
    "]": "I",
    "{": "<",
    "}": "<",
  };
  return map[ch] || ch;
}

function cleanMrzLine(line: string): string {
  return line
    .toUpperCase()
    .split("")
    .map(normalizeMrzChar)
    .join("")
    .replace(/[^A-Z0-9<]/g, "")
    .replace(/K{2,}/g, (m) => "<".repeat(m.length)); // OCR often reads < as K
}

/** Find TD3 (44-char) or TD2 (36-char) MRZ lines in OCR text */
export function extractMrzLines(ocrText: string): string[] {
  const rawLines = ocrText
    .split(/\r?\n/)
    .map((l) => cleanMrzLine(l.trim()))
    .filter((l) => l.length >= 28);

  const candidates = rawLines.filter((l) => {
    const ratio = (l.match(/[A-Z0-9<]/g) || []).length / l.length;
    return ratio > 0.85 && (l.includes("<") || /^P[A-Z<]/.test(l));
  });

  // Prefer passport TD3: first line starts with P
  for (let i = 0; i < candidates.length - 1; i += 1) {
    let a = candidates[i];
    let b = candidates[i + 1];
    if (a.startsWith("P") || a.startsWith("V") || a.startsWith("I")) {
      if (a.length > 44) a = a.slice(0, 44);
      if (b.length > 44) b = b.slice(0, 44);
      if (a.length >= 40 && b.length >= 40) {
        a = a.padEnd(44, "<").slice(0, 44);
        b = b.padEnd(44, "<").slice(0, 44);
        return [a, b];
      }
      if (a.length >= 34 && b.length >= 34) {
        a = a.padEnd(36, "<").slice(0, 36);
        b = b.padEnd(36, "<").slice(0, 36);
        return [a, b];
      }
    }
  }

  // TD1 three lines
  for (let i = 0; i < candidates.length - 2; i += 1) {
    const lines = candidates.slice(i, i + 3).map((l) => l.padEnd(30, "<").slice(0, 30));
    if (lines.every((l) => l.length === 30)) return lines;
  }

  return [];
}

function tryParseMrz(lines: string[]) {
  try {
    return parseMrz(lines, { autocorrect: true });
  } catch {
    return null;
  }
}

/**
 * MRZ name fields pad with "<" which OCR often misreads as K/L/C/E runs
 * (e.g. "LKLKLLLLLLLLLLLL"). Drop tokens that are clearly filler noise.
 */
function sanitizeNameToken(token: string): boolean {
  if (!token) return false;
  const unique = new Set(token.split(""));
  // Long runs made of 1–2 repeated characters are filler (KKKK, LKLKLL…)
  if (token.length >= 4 && unique.size <= 2) return false;
  // Single stray filler letters between names
  if (token.length === 1 && "KLCE<".includes(token)) return false;
  // Tokens with no vowels and length >= 5 are almost never real names
  if (token.length >= 5 && !/[AEIOUY]/.test(token)) return false;
  return true;
}

function cleanName(raw: string): string {
  return raw
    .replace(/</g, " ")
    .split(/\s+/)
    .filter(sanitizeNameToken)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Soft regex extras from free-text OCR (issue date / place of birth) */
function extractSoftFields(ocrText: string): Partial<PassportOcrFields> {
  const text = ocrText.replace(/\s+/g, " ");
  const out: Partial<PassportOcrFields> = {};

  // Allow the label and the value to be separated by a bit of noise
  // (two-column bio-page layouts push the date a few chars away from its label).
  const issue =
    text.match(
      /(?:date of issue|date of iss|issue date|issued|doi)[^0-9A-Z]{0,12}([0-9]{1,2}[./\-][0-9]{1,2}[./\-][0-9]{2,4})/i,
    ) ||
    text.match(
      /(?:date of issue|date of iss|issue date|issued)[^0-9A-Z]{0,12}([0-9]{1,2}\s?[A-Z]{3}\s?[0-9]{2,4})/i,
    );
  if (issue?.[1]) {
    const iso = looseDateToIso(issue[1]);
    if (iso) out.passportIssueDate = iso;
  }

  const pob = text.match(
    /(?:place of birth|lieu de naissance|pob)[:\s]*([A-Za-z][A-Za-z\s,'-]{2,40})/i,
  );
  if (pob?.[1]) {
    out.placeOfBirth = pob[1].trim().replace(/\s{2,}/g, " ");
  }

  return out;
}

function looseDateToIso(raw: string): string {
  const cleaned = raw.trim().toUpperCase();
  const numeric = cleaned.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})$/);
  if (numeric) {
    let [, a, b, c] = numeric;
    let year = Number(c);
    if (year < 100) year += year > 50 ? 1900 : 2000;
    // Prefer DD/MM/YYYY (common on passports) when day > 12
    let day = Number(a);
    let month = Number(b);
    if (day <= 12 && month > 12) {
      day = Number(b);
      month = Number(a);
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) return "";
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const months: Record<string, string> = {
    JAN: "01",
    FEB: "02",
    MAR: "03",
    APR: "04",
    MAY: "05",
    JUN: "06",
    JUL: "07",
    AUG: "08",
    SEP: "09",
    OCT: "10",
    NOV: "11",
    DEC: "12",
  };
  const alpha = cleaned.match(/^(\d{1,2})\s*([A-Z]{3})\s*(\d{2,4})$/);
  if (alpha) {
    const day = alpha[1].padStart(2, "0");
    const month = months[alpha[2]];
    let year = Number(alpha[3]);
    if (year < 100) year += year > 50 ? 1900 : 2000;
    if (!month) return "";
    return `${year}-${month}-${day}`;
  }
  return "";
}

/**
 * Fallback: the issue date is printed on the bio page but never in the MRZ.
 * Collect every date in the OCR text and pick the one that sits between
 * date of birth and expiry (and is not DOB/expiry themselves).
 */
function inferIssueDate(ocrText: string, dobIso: string, expiryIso: string): string {
  const numeric = ocrText.match(/\b\d{1,2}[./\-]\d{1,2}[./\-]\d{2,4}\b/g) || [];
  const alpha = ocrText.match(/\b\d{1,2}\s?[A-Za-z]{3}\s?\d{2,4}\b/g) || [];
  const candidates = new Set<string>();
  for (const m of [...numeric, ...alpha]) {
    const iso = looseDateToIso(m);
    if (iso) candidates.add(iso);
  }

  const today = new Date().toISOString().slice(0, 10);
  const valid = [...candidates].filter((iso) => {
    if (iso === dobIso || iso === expiryIso) return false;
    if (dobIso && iso <= dobIso) return false;
    if (expiryIso && iso >= expiryIso) return false;
    if (iso > today) return false;
    return true;
  });
  if (!valid.length) return "";

  // Strong signal: issue date = expiry minus the validity period (usually 10y,
  // sometimes 5y), and the day/month line up with the expiry date.
  if (expiryIso) {
    const [ey, em, ed] = expiryIso.split("-");
    for (const years of [10, 5]) {
      const expected = `${Number(ey) - years}-${em}-${ed}`;
      // exact, or same month with a ±1 day rounding difference
      const match = valid.find((iso) => {
        if (iso === expected) return true;
        const [y, m] = iso.split("-");
        return y === String(Number(ey) - years) && m === em;
      });
      if (match) return match;
    }
  }

  // Fallback: most recent plausible date before expiry.
  valid.sort();
  return valid[valid.length - 1];
}

export async function extractPassportFromImage(file: File): Promise<PassportOcrResult> {
  const warnings: string[] = [];
  const fields = emptyFields();

  let ocrSource: File | Blob = file;
  if (isPdfFile(file)) {
    try {
      ocrSource = await pdfFirstPageToImageFile(file);
      warnings.push("Using the first page of your PDF for OCR. Use a scan of the bio page for best results.");
    } catch {
      warnings.push("Could not read this PDF. Try exporting the bio page as JPG/PNG, or use a clearer scan.");
      return { fields, warnings, confidence: "low" };
    }
  }

  const worker = await createWorker("eng", 1, {
    logger: () => undefined,
  });

  let plainText = "";
  let mrzText = "";
  try {
    // Pass 1: unrestricted OCR — labels like "Date of Issue", printed dates, place of birth
    const plainResult = await worker.recognize(ocrSource);
    plainText = plainResult.data.text || "";

    // Pass 2: MRZ-friendly charset for the machine-readable lines
    await worker.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789< .-/:'",
      tessedit_pageseg_mode: PSM.AUTO,
    });
    const mrzResult = await worker.recognize(ocrSource);
    mrzText = mrzResult.data.text || "";
  } finally {
    await worker.terminate();
  }

  if (!plainText.trim() && !mrzText.trim()) {
    warnings.push("No text detected. Try a clearer, well-lit photo of the passport bio page.");
    return { fields, warnings, confidence: "low" };
  }

  const soft = extractSoftFields(plainText || mrzText);
  Object.assign(fields, soft);

  const mrzLines = extractMrzLines(mrzText || plainText);
  fields.rawMrz = mrzLines;

  if (!mrzLines.length) {
    warnings.push(
      "Could not find the passport MRZ (bottom machine-readable lines). Fill details manually or re-upload a sharper bio page.",
    );
    return { fields, warnings, confidence: "low" };
  }

  const parsed = tryParseMrz(mrzLines);
  if (!parsed?.fields) {
    warnings.push("MRZ was found but could not be parsed. Please review and edit fields below.");
    return { fields, warnings, confidence: "low" };
  }

  const f = parsed.fields;
  const first = cleanName(f.firstName || "");
  const last = cleanName(f.lastName || "");
  fields.fullName = [first, last].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  fields.passportNumber = (f.documentNumber || "").replace(/</g, "");
  fields.dateOfBirth = mrzDateToIso(f.birthDate);
  fields.passportExpiryDate = mrzDateToIso(f.expirationDate);
  fields.sex = sexToForm(f.sex);
  fields.nationality = icaoToSlug(f.nationality);
  fields.passportIssuingCountry = icaoToSlug(f.issuingState) || fields.nationality;
  fields.documentCode = f.documentCode || "";

  // Issue date is never in the MRZ — read it from the printed page text
  if (!fields.passportIssueDate) {
    fields.passportIssueDate = inferIssueDate(
      plainText,
      fields.dateOfBirth,
      fields.passportExpiryDate,
    );
    if (fields.passportIssueDate) {
      warnings.push("Issue date was read from the printed page — please verify it.");
    }
  }

  if (!parsed.valid) {
    warnings.push("MRZ checksums did not fully validate — double-check every field before continuing.");
  }
  if (!fields.passportIssueDate) {
    warnings.push("Issue date could not be read — enter it from the passport manually.");
  }
  if (!fields.placeOfBirth) {
    warnings.push("Place of birth is optional and often not machine-readable.");
  }

  const confidence: PassportOcrResult["confidence"] = parsed.valid
    ? fields.passportNumber && fields.fullName
      ? "high"
      : "medium"
    : "medium";

  return { fields, warnings, confidence };
}

/** Map OCR preview fields into ApplyFlow form values (address/email/phone left to user). */
export function ocrFieldsToFormValues(fields: PassportOcrFields): Record<string, string> {
  return {
    fullName: fields.fullName,
    dateOfBirth: fields.dateOfBirth,
    sex: fields.sex,
    nationality: fields.nationality,
    passportNumber: fields.passportNumber,
    passportIssuingCountry: fields.passportIssuingCountry,
    passportIssueDate: fields.passportIssueDate,
    passportExpiryDate: fields.passportExpiryDate,
    ...(fields.placeOfBirth ? { placeOfBirth: fields.placeOfBirth } : {}),
  };
}
