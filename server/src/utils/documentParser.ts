import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import sharp from 'sharp';
import Tesseract from 'tesseract.js';
import { logger } from '@/utils/logger';

export interface ExtractedProduct {
  name: string;
  sku?: string;
  quantity?: number;
  price?: number;
  description?: string;
}

export interface ExtractedContactPerson {
  name: string;
  title?: string;
  phone?: string;
  email?: string;
}

export interface ExtractedLeadData {
  title?: string;
  leadValue?: number | null;
  contactPerson?: string;
  contactPersons?: ExtractedContactPerson[];
  email?: string;
  emails?: string[];
  phone?: string;
  phones?: string[];
  organization?: string;
  address?: string;
  website?: string;
  jobTitle?: string;
  source?: string;
  type?: string;
  expectedCloseDate?: string;
  products?: ExtractedProduct[];
  description?: string;
  rawText?: string;
}

/**
 * Evaluates extracted OCR text to determine confidence level of business/contact data.
 */
export function scoreOcrText(text: string): number {
  if (!text || text.trim().length < 5) return 0;
  let score = 0;

  // 1. Email address detected
  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(text)) score += 50;

  // 2. Phone number detected
  if (/(?:[+]?91[\s.-]?)?\b([6-9]\d{4}[\s.-]?\d{5}|[6-9]\d{9})\b/.test(text) || /\+?\d{1,3}[-.\s]?\d{7,12}/.test(text)) {
    score += 35;
  }

  // 3. Organization, designation and contact keywords
  const keywords = [
    'ltd', 'pvt', 'technologies', 'solutions', 'limited', 'services', 'enterprises', 'inc', 'corp', 'industries', 'group', 'systems', 'consulting',
    'director', 'managing', 'manager', 'ceo', 'founder', 'partner', 'engineer', 'executive', 'officer',
    'phone', 'mobile', 'email', 'tel', 'cell', 'address', 'website', 'www', 'tower', 'road', 'street', 'india'
  ];
  const lower = text.toLowerCase();
  let kwMatches = 0;
  for (const kw of keywords) {
    if (lower.includes(kw)) kwMatches++;
  }
  score += Math.min(kwMatches * 15, 60);

  // 4. Penalize excessive noise / garbage non-alphanumeric characters
  const nonWs = text.replace(/\s+/g, '');
  if (nonWs.length > 0) {
    const noiseChars = (nonWs.match(/[^a-zA-Z0-9.,@+()&/'-]/g) || []).length;
    const noiseRatio = noiseChars / nonWs.length;
    if (noiseRatio > 0.3) score -= 30;
  }

  return Math.max(0, score);
}

/**
 * Runs offline multi-angle Tesseract OCR with Sharp image preprocessing.
 * Automatically tests orientations (0°, EXIF, 18°, -18°, 90°, 270°, 15°, -15°, 180°)
 * and returns the highest-confidence extracted text.
 */
export async function recognizeImageWithAutoOrientation(imageBuffer: Buffer, filename?: string): Promise<string> {
  const candidateAngles = [0, 18, -18, 90, 270, 15, -15, 180];
  let bestText = '';
  let bestScore = -1;

  for (const ang of candidateAngles) {
    try {
      let pipeline = sharp(imageBuffer);
      if (ang !== 0) {
        pipeline = pipeline.rotate(ang);
      } else {
        // Pass 1: Auto-orient based on EXIF metadata if present
        pipeline = pipeline.rotate();
      }

      const transformedBuffer = await pipeline.toBuffer();
      const ocrResult = await Tesseract.recognize(transformedBuffer, 'eng');
      const text = ocrResult?.data?.text || '';
      const score = scoreOcrText(text);

      logger.info(`[ImageOCR] Tested angle ${ang}° for ${filename || 'image'}: score = ${score}`);

      if (score > bestScore) {
        bestScore = score;
        bestText = text;
      }

      // Early stop: If text reaches high-confidence threshold (has valid email/phone and keywords), return immediately!
      if (score >= 60) {
        logger.info(`[ImageOCR] Early stop reached at angle ${ang}° with confidence score ${score}`);
        break;
      }
    } catch (err: any) {
      logger.warn(`[ImageOCR] Error testing angle ${ang}° for ${filename || 'image'}: ${err.message}`);
    }
  }

  return bestText.trim();
}

/**
 * Extracts plain text from a PDF, text file, or binary document buffer.
 * Supports standard PDF text streams, zlib/FlateDecode compressed streams, and hex encoded strings.
 */
export function extractTextFromBuffer(buffer: Buffer, originalFilename: string): string {
  const ext = path.extname(originalFilename).toLowerCase();

  if (ext === '.txt' || ext === '.csv' || ext === '.json' || ext === '.md' || ext === '.html') {
    return buffer.toString('utf8');
  }

  const raw = buffer.toString('latin1');
  const textChunks: string[] = [];

  // 1. Locate all stream...endstream sections and decompress flated streams
  const decompressedStreams: string[] = [];
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let sMatch;
  while ((sMatch = streamRegex.exec(raw)) !== null) {
    const streamContent = sMatch[1];
    const streamBuffer = Buffer.from(streamContent, 'latin1');
    try {
      const inflated = zlib.inflateSync(streamBuffer);
      decompressedStreams.push(inflated.toString('latin1'));
    } catch {
      try {
        const rawInflated = zlib.inflateRawSync(streamBuffer);
        decompressedStreams.push(rawInflated.toString('latin1'));
      } catch {
        decompressedStreams.push(streamContent);
      }
    }
  }

  // Combine raw content and decompressed streams
  const sources = [raw, ...decompressedStreams];

  for (const src of sources) {
    // Match PDF string literals: (Text here) Tj or (Text here) '
    const tjRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
    let match;
    while ((match = tjRegex.exec(src)) !== null) {
      const unescaped = match[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\([()\\])/g, '$1');
      if (unescaped.trim()) {
        textChunks.push(unescaped.trim());
      }
    }

    // Match PDF array text: [ (text1) 20 (text2) ] TJ
    const arrayTjRegex = /\[\s*((?:\([^)]*\)|[0-9\s.-]+)+)\s*\]\s*TJ/g;
    while ((match = arrayTjRegex.exec(src)) !== null) {
      const subStrRegex = /\(([^)]+)\)/g;
      let subMatch;
      let fullWord = '';
      while ((subMatch = subStrRegex.exec(match[1])) !== null) {
        fullWord += subMatch[1].replace(/\\([()\\])/g, '$1');
      }
      if (fullWord.trim()) {
        textChunks.push(fullWord.trim());
      }
    }

    // Match Hex strings: <48656c6c6f> Tj
    const hexTjRegex = /<([0-9a-fA-F]{4,})>\s*(?:Tj|'|")/g;
    while ((match = hexTjRegex.exec(src)) !== null) {
      const hex = match[1];
      let str = '';
      for (let i = 0; i < hex.length; i += 2) {
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
      }
      if (str.trim() && /[a-zA-Z0-9]/.test(str)) {
        textChunks.push(str.trim());
      }
    }
  }

  // Fallback: If no PDF text operators matched, scan for printable ASCII character sequences
  if (textChunks.length === 0) {
    for (const src of sources) {
      const asciiRegex = /[a-zA-Z0-9@+._\s-]{4,}/g;
      let am;
      while ((am = asciiRegex.exec(src)) !== null) {
        const candidate = am[0].trim();
        if (candidate.includes('@') || candidate.includes(':') || candidate.length > 8) {
          textChunks.push(candidate);
        }
      }
    }
  }

  return textChunks.join('\n');
}

/**
 * Parses structured CRM entities (Person, Org, Lead, Products, Dates) from raw document text.
 */
export function parseLeadDocumentText(text: string, fallbackFilename?: string): ExtractedLeadData {
  const result: ExtractedLeadData = {
    rawText: text,
    products: [],
  };

  // Clean lines of box drawing characters, decorative borders, and extra symbols
  const cleanedLines = text
    .split(/\r?\n/)
    .map((l) =>
      l
        .replace(/[┌┐└┘│─├┤┬┴┼═║╔╗╚╝╠╣╦╩╬┃━┏┓┗┛┣┫┳┻╋|_\-—=]/g, ' ')
        .replace(/[⚡📞☎️✉️🌐🏢👤💼🛠️✨🌟🔹🔸]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter((l) => l.length >= 2);

  const lines = cleanedLines;

  // 1. Email extraction (support multiple emails & labeled emails)
  const allEmails: string[] = [];
  const labeledEmails: string[] = [];
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  let eMatch;
  while ((eMatch = emailRegex.exec(text)) !== null) {
    const em = eMatch[1].toLowerCase().trim();
    if (!allEmails.includes(em)) {
      allEmails.push(em);
    }
  }

  const labeledEmailRegex = /(?:email|e-mail|mail)\s*[:=-]\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  let leMatch;
  while ((leMatch = labeledEmailRegex.exec(text)) !== null) {
    const em = leMatch[1].toLowerCase().trim();
    if (!labeledEmails.includes(em)) {
      labeledEmails.push(em);
    }
  }

  if (allEmails.length > 0) {
    result.email = labeledEmails[0] || allEmails[0];
    result.emails = allEmails;
  }

  // 2. Phone extraction
  const extractedPhones: string[] = [];
  const labeledOfficePhones: string[] = [];

  // A. Labeled contact: "Contact No. : 8888624454, 8530224414" or "Phone: +91..."
  const labeledRegex = /(?:phone|mobile|mob|tel|cell|contact|appointment)[^\d\n\r]*([+]?[0-9][0-9\s().,-]{7,40})/gi;
  let lMatch;
  while ((lMatch = labeledRegex.exec(text)) !== null) {
    const rawCandidates = lMatch[1].split(/[,;/]/);
    for (const cand of rawCandidates) {
      const trimmed = cand.trim();
      const digits = trimmed.replace(/[^0-9]/g, '');
      if (digits.length >= 7 && digits.length <= 15 && !extractedPhones.some((p) => p.replace(/[^0-9]/g, '') === digits)) {
        extractedPhones.push(trimmed);
        labeledOfficePhones.push(digits);
      }
    }
  }

  // B. Standard 10-digit mobile number pattern (e.g. 99750 83285, 90281 76386, 8888624454)
  const mobile10Regex = /(?:[+]?91[\s.-]?)?\b([6-9]\d{4}[\s.-]?\d{5}|[6-9]\d{9})\b/g;
  let m10Match;
  const directMobiles: string[] = [];
  while ((m10Match = mobile10Regex.exec(text)) !== null) {
    const candidate = m10Match[1].trim();
    const digits = candidate.replace(/[^0-9]/g, '');
    if (digits.length === 10 && !extractedPhones.some((p) => p.replace(/[^0-9]/g, '') === digits)) {
      extractedPhones.push(candidate);
    }
    if (digits.length === 10 && !labeledOfficePhones.includes(digits) && !directMobiles.some((p) => p.replace(/[^0-9]/g, '') === digits)) {
      directMobiles.push(candidate);
    }
  }

  // C. Fallback international formatted number
  if (extractedPhones.length === 0) {
    const genericRegex = /([+]?\d{1,3}[-.\s]?(?:\(\d{2,4}\)|\d{2,4})[-.\s]?\d{3,4}[-.\s]?\d{4})/g;
    let gMatch;
    while ((gMatch = genericRegex.exec(text)) !== null) {
      const cand = gMatch[1].trim();
      const digits = cand.replace(/[^0-9]/g, '');
      if (digits.length >= 7 && digits.length <= 15 && !extractedPhones.some((p) => p.replace(/[^0-9]/g, '') === digits)) {
        extractedPhones.push(cand);
      }
    }
  }

  if (extractedPhones.length > 0) {
    result.phone = extractedPhones[0];
    result.phones = extractedPhones;
  }

  // 3. Contact Person(s) extraction
  const extractedContactPersons: ExtractedContactPerson[] = [];
  const seenPersonNames = new Set<string>();

  // A. Honorific names (stopping before next honorific or line break to prevent greedy eating of adjacent names)
  const honorificRegex = /(?:mr|ms|mrs|dr)\.?\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)(?=\s+(?:mr|ms|mrs|dr)\.?|\s*[\n\r,;|]|$)/gi;
  let hMatch;
  while ((hMatch = honorificRegex.exec(text)) !== null) {
    let rawName = hMatch[1].trim().replace(/\b(?:mr|ms|mrs|dr)\.?$/i, '').trim();
    if (rawName.length >= 2 && !seenPersonNames.has(rawName.toLowerCase()) && !rawName.includes('@') && !rawName.toLowerCase().includes('ltd')) {
      seenPersonNames.add(rawName.toLowerCase());
      extractedContactPersons.push({ name: rawName });
    }
  }

  // B. Explicit label patterns
  const labeledPersonRegex = /(?:contact\s*person|person\s*name|contact\s*name|client\s*name|customer\s*name|attention|attn|full\s*name)\s*[:=-]\s*([A-Za-z\s.'-]+)/gi;
  let lpMatch;
  while ((lpMatch = labeledPersonRegex.exec(text)) !== null) {
    const rawVal = lpMatch[1].split('\n')[0].replace(/[,;].*$/, '').trim();
    if (rawVal.length >= 2 && !seenPersonNames.has(rawVal.toLowerCase()) && !rawVal.includes('@') && !rawVal.toLowerCase().includes('ltd')) {
      seenPersonNames.add(rawVal.toLowerCase());
      extractedContactPersons.push({ name: rawVal });
    }
  }

  // C. Natural intro patterns ("my name is...", "i am...")
  const nlIntroRegex = /(?:my\s*name\s*is|i\s*am|this\s*is)\s+([A-Za-z\s.'-]+?)(?:\s+(?:from|at|with|contact|phone|email|\.|\n|$)|$)/gi;
  let nlMatch;
  while ((nlMatch = nlIntroRegex.exec(text)) !== null) {
    const rawVal = nlMatch[1].split('\n')[0].replace(/[,;].*$/, '').trim();
    if (rawVal.length >= 2 && !seenPersonNames.has(rawVal.toLowerCase()) && !rawVal.includes('@')) {
      seenPersonNames.add(rawVal.toLowerCase());
      extractedContactPersons.push({ name: rawVal });
    }
  }

  // D. Check line immediately preceding a designation keyword (managing director, ceo, etc.)
  const designationKeywords = ['director', 'managing director', 'chief technology officer', 'chief executive officer', 'cto', 'ceo', 'partner', 'proprietor', 'b.e. mechanical', 'b.e.', 'manager', 'founder', 'engineer', 'architect', 'executive'];
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    if (designationKeywords.some((dk) => lower.includes(dk))) {
      if (i > 0) {
        const prev = lines[i - 1].trim();
        const prevLower = prev.toLowerCase();
        if (
          !prevLower.includes('email') &&
          !prevLower.includes('phone') &&
          !prevLower.includes('mobile') &&
          !prevLower.includes('tel') &&
          !prevLower.includes('address') &&
          !prevLower.includes('website') &&
          !prevLower.includes('www') &&
          !prevLower.includes('ltd') &&
          !prevLower.includes('pvt') &&
          !prevLower.includes('technologies') &&
          !prevLower.includes('solutions') &&
          !prevLower.includes('@')
        ) {
          const words = prev.split(/\s+/).filter(Boolean);
          if (words.length >= 2 && words.length <= 4 && words.every((w) => /^[A-Za-z.'-]+$/.test(w))) {
            const formattedName = words.map((w) => (/^[A-Z]+$/.test(w) ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w)).join(' ');
            if (!seenPersonNames.has(formattedName.toLowerCase())) {
              seenPersonNames.add(formattedName.toLowerCase());
              extractedContactPersons.unshift({ name: formattedName, title: lines[i] });
            }
          }
        }
      }
    }
  }

  // E. Fallback line candidate if no contact person found
  if (extractedContactPersons.length === 0) {
    const nameLineCandidate = lines.find((l) => {
      const lower = l.toLowerCase();
      if (lower.includes('email') || lower.includes('phone') || lower.includes('mobile') || lower.includes('tel') || lower.includes('web') || lower.includes('address') || lower.includes('services') || lower.includes('suite') || lower.includes('@') || lower.includes('http') || lower.includes('technologies') || lower.includes('solutions') || lower.includes('ltd') || lower.includes('corp') || lower.includes('director') || lower.includes('officer') || lower.includes('manager')) {
        return false;
      }
      const words = l.split(' ').filter(Boolean);
      return words.length >= 2 && words.length <= 4 && words.every((w) => /^[A-Za-z.'-]+$/.test(w));
    });
    if (nameLineCandidate) {
      const words = nameLineCandidate.split(' ').filter(Boolean);
      const formattedName = words.map((w) => (/^[A-Z]+$/.test(w) ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w)).join(' ');
      seenPersonNames.add(formattedName.toLowerCase());
      extractedContactPersons.push({ name: formattedName });
    }
  }

  // F. Fallback from email prefix if none found
  if (extractedContactPersons.length === 0 && result.email) {
    const emailPrefix = result.email.split('@')[0];
    const parts = emailPrefix.split(/[._-]/).filter((p) => p.length > 1);
    if (parts.length >= 2) {
      const synthName = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
      extractedContactPersons.push({ name: synthName });
    } else if (parts.length === 1 && parts[0].length >= 3 && !/^[0-9]+$/.test(parts[0])) {
      const synthName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
      extractedContactPersons.push({ name: synthName });
    }
  }

  // G. Assign direct mobile numbers & titles to extracted contact persons
  const foundDesignations: string[] = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (designationKeywords.some((dk) => lower.includes(dk))) {
      foundDesignations.push(line);
    }
  }

  if (extractedContactPersons.length > 0) {
    extractedContactPersons.forEach((cp, idx) => {
      if (!cp.title && foundDesignations.length > 0) {
        cp.title = foundDesignations[idx] || foundDesignations[0];
      }
      if (directMobiles[idx]) {
        cp.phone = directMobiles[idx];
      } else if (idx === 0 && extractedPhones.length > 0) {
        cp.phone = extractedPhones[0];
      }

      // Associate best matching email with contact person
      const cpFirstName = cp.name.toLowerCase().split(/\s+/)[0];
      const matchedEmail =
        labeledEmails.find((e) => e.includes(cpFirstName)) ||
        allEmails.find((e) => e.includes(cpFirstName)) ||
        labeledEmails[idx] ||
        (allEmails.length > 1 ? allEmails[allEmails.length - 1] : allEmails[0]);

      if (matchedEmail) {
        cp.email = matchedEmail;
      }
    });

    result.contactPersons = extractedContactPersons;
    result.contactPerson = extractedContactPersons[0].name;
    if (extractedContactPersons[0].title) {
      result.jobTitle = extractedContactPersons[0].title;
    }
    if (extractedContactPersons[0].phone) {
      result.phone = extractedContactPersons[0].phone;
    }
    if (extractedContactPersons[0].email) {
      result.email = extractedContactPersons[0].email;
    }
  }

  // 4. Organization / Company extraction
  const orgPatterns = [
    /(?:organization|company\s*name|company|account\s*name|business\s*name|firm|client(?:\s*org)?|vendor)\s*[:=-]\s*([A-Za-z0-9\s.,&'-]+)/i,
    /(?:at|for|from)\s+([A-Za-z0-9\s.,&'-]+(?:\s+(?:Inc|LLC|Ltd|Corporation|Technologies|Solutions|Enterprises|Pvt|Global|Services|Group|Systems)))/i,
  ];
  for (const pat of orgPatterns) {
    const oMatch = text.match(pat);
    if (oMatch && oMatch[1]) {
      const val = oMatch[1].split('\n')[0].replace(/[,;].*$/, '').trim();
      if (val.length >= 2 && !val.includes('@')) {
        result.organization = val;
        break;
      }
    }
  }

  // Check lines containing company keywords (e.g. APEX GLOBAL TECHNOLOGIES)
  if (!result.organization) {
    const companyKeywords = ['technologies', 'solutions', 'enterprises', 'pvt ltd', 'limited', 'global', 'systems', 'corp', 'corporation', 'inc', 'llc', 'services', 'industries', 'consulting', 'group', 'tech', 'software'];
    const orgLine = lines.find((l) => {
      const lower = l.toLowerCase();
      if (lower.includes('email') || lower.includes('phone') || lower.includes('address') || lower.includes('services:')) return false;
      return companyKeywords.some((kw) => lower.includes(kw));
    });
    if (orgLine) {
      result.organization = orgLine;
    }
  }

  // If organization not found, check email domain
  if (!result.organization && result.email) {
    const domain = result.email.split('@')[1]?.toLowerCase();
    const publicDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'mail.com', 'proton.me'];
    if (domain && !publicDomains.includes(domain)) {
      const domainName = domain.split('.')[0];
      if (domainName.length >= 2) {
        result.organization = domainName.charAt(0).toUpperCase() + domainName.slice(1);
      }
    }
  }

  // Address extraction
  const addressMatch = text.match(/(?:address|office|location|addr)\s*[:=-]\s*([^\r\n]+(?:\r?\n[^\r\n]+)?)/i);
  if (addressMatch && addressMatch[1]) {
    const rawAddr = addressMatch[1].replace(/[\r\n]+/g, ' ').replace(/[\\\/]/g, '').trim();
    if (rawAddr.length >= 5) {
      result.address = rawAddr;
    }
  }
  if (!result.address) {
    const addrLine = lines.find((l) => /^(?:address|office|location|addr)\s*:/i.test(l));
    if (addrLine) {
      result.address = addrLine.replace(/^(?:address|office|location|addr)\s*:\s*/i, '').replace(/[\\\/]/g, '').trim();
    }
  }

  // Website extraction
  const webMatch = text.match(/(?:website|web|site)\s*[:=-]\s*([^\r\n\s]+)/i) || text.match(/\b(www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/i);
  if (webMatch && webMatch[1]) {
    result.website = webMatch[1].trim();
  }

  // 5. Job Title extraction
  const jobTitlePatterns = [
    /(?:job\s*title|designation|role|position)\s*[:=-]\s*([A-Za-z\s.,-]+)/i,
  ];
  for (const pat of jobTitlePatterns) {
    const jMatch = text.match(pat);
    if (jMatch && jMatch[1]) {
      result.jobTitle = jMatch[1].split('\n')[0].trim();
      break;
    }
  }

  if (!result.jobTitle) {
    const designationKeywords = ['managing director', 'chief technology officer', 'chief executive officer', 'cto', 'ceo', 'director', 'president', 'vice president', 'vp', 'manager', 'lead', 'consultant', 'engineer', 'architect', 'executive'];
    const titleLine = lines.find((l) => {
      const lower = l.toLowerCase();
      return designationKeywords.some((dk) => lower.includes(dk));
    });
    if (titleLine) {
      result.jobTitle = titleLine;
    }
  }

  // 6. Lead Source & Type
  const sourceMatch = text.match(/(?:lead\s*source|source|channel)\s*[:=-]\s*([^\r\n,;]+)/i);
  if (sourceMatch && sourceMatch[1]) {
    result.source = sourceMatch[1].trim();
  }

  const typeMatch = text.match(/(?:lead\s*type|type|deal\s*type|opportunity\s*type)\s*[:=-]\s*([^\r\n,;]+)/i);
  if (typeMatch && typeMatch[1]) {
    result.type = typeMatch[1].trim();
  }

  // Multi-line line-by-line fallback scanner for separate label/value lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const nextLine = (i + 1 < lines.length) ? lines[i + 1].trim() : '';

    // Contact Person
    if (!result.contactPerson && /^(?:contact\s*person|person\s*name|contact\s*name|client\s*name|customer\s*name|full\s*name|name)\s*:?$/i.test(line)) {
      if (nextLine && !nextLine.includes(':') && !nextLine.includes('@') && nextLine.length >= 2 && !/^(?:organization|company|role|title|email|phone|source)/i.test(nextLine)) {
        result.contactPerson = nextLine;
      }
    }

    // Organization
    if (!result.organization && /^(?:organization|company\s*name|company|account\s*name|business\s*name|firm|client(?:\s*org)?|vendor)\s*:?$/i.test(line)) {
      if (nextLine && !nextLine.includes(':') && !nextLine.includes('@') && nextLine.length >= 2 && !/^(?:contact|role|title|email|phone|source)/i.test(nextLine)) {
        result.organization = nextLine;
      }
    }

    // Job Title
    if (!result.jobTitle && /^(?:job\s*title|designation|role|position)\s*:?$/i.test(line)) {
      if (nextLine && !nextLine.includes(':') && nextLine.length >= 2) {
        result.jobTitle = nextLine;
      }
    }

    // Email
    if (!result.email && /^(?:email|email\s*address|e-mail)\s*:?$/i.test(line)) {
      const em = nextLine.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      if (em) result.email = em[1].toLowerCase().trim();
    }

    // Phone
    if (!result.phone && /^(?:phone|mobile|tel|contact(?:\s*no|\s*number)?|cell)\s*:?$/i.test(line)) {
      const pm = nextLine.match(/([+]?[0-9\s().-]{7,20})/);
      if (pm && pm[1].replace(/[^0-9]/g, '').length >= 7) {
        result.phone = pm[1].trim();
      }
    }

    // Source
    if (!result.source && /^(?:lead\s*source|source|channel)\s*:?$/i.test(line)) {
      if (nextLine && !nextLine.includes(':')) {
        result.source = nextLine;
      }
    }

    // Close Date
    if (!result.expectedCloseDate && /^(?:expected\s*close\s*date|target\s*close\s*date|close\s*date|target\s*date|due\s*date)\s*:?$/i.test(line)) {
      const dMatch = nextLine.match(/([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2}|[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{4})/);
      if (dMatch) {
        result.expectedCloseDate = dMatch[1];
      }
    }
  }

  // 8. Product Items extraction
  const productList: ExtractedProduct[] = [];
  const addedProductNames = new Set<string>();

  // Pattern A: Product: Name, Qty: X, Price: Y
  const productLineRegex = /(?:product|item|service|package|software|hardware)\s*(?:name)?\s*[:=-]\s*([A-Za-z0-9\s._&/()+-]+?)(?:[,\s]+(?:sku|code)\s*[:=-]\s*([A-Za-z0-9._-]+))?(?:[,\s]+(?:qty|quantity|units?)\s*[:=-]\s*(\d+))?(?:[,\s]+(?:price|rate|cost|amount|unit\s*price)\s*[:=-]\s*[$€£₹]?\s*([0-9,]+(?:\.[0-9]{1,2})?))?(?:[,\n;]|$)/gi;
  let pMatch;
  while ((pMatch = productLineRegex.exec(text)) !== null) {
    const name = pMatch[1]?.trim();
    if (name && name.length >= 2 && !addedProductNames.has(name.toLowerCase())) {
      const sku = pMatch[2]?.trim();
      const qty = pMatch[3] ? parseInt(pMatch[3], 10) : 1;
      const price = pMatch[4] ? parseFloat(pMatch[4].replace(/,/g, '')) : undefined;
      productList.push({ name, sku, quantity: qty, price });
      addedProductNames.add(name.toLowerCase());
    }
  }

  // Pattern B: Line items like "1. Product Name - 2 x $500" or "Product Name x 3 @ $100"
  const itemRowRegex = /(?:^|\n)\s*(?:\d+[\).])?\s*([A-Za-z0-9][A-Za-z0-9\s._&/()+-]{2,40})\s+[-–—]?\s*(?:(?:qty|quantity)?\s*[:=]?\s*(\d+)\s*(?:x|@|units?)\s*)?[$€£₹]\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi;
  let rowMatch;
  while ((rowMatch = itemRowRegex.exec(text)) !== null) {
    const name = rowMatch[1]?.trim();
    if (name && !name.toLowerCase().includes('total') && !name.toLowerCase().includes('lead value') && !addedProductNames.has(name.toLowerCase())) {
      const qty = rowMatch[2] ? parseInt(rowMatch[2], 10) : 1;
      const price = rowMatch[3] ? parseFloat(rowMatch[3].replace(/,/g, '')) : undefined;
      productList.push({ name, quantity: qty, price });
      addedProductNames.add(name.toLowerCase());
    }
  }

  result.products = productList;

  // 9. Lead Value extraction (Prioritize explicit Total / Lead Value keywords)
  const totalValuePatterns = [
    /(?:total\s*lead\s*value|grand\s*total|total\s*amount|total\s*value|lead\s*value|deal\s*size|budget)\s*[:=-]?\s*[$€£₹]?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /(?:total|amount|price|cost)\s*[:=-]\s*[$€£₹]?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  ];
  for (const pat of totalValuePatterns) {
    const vMatch = text.match(pat);
    if (vMatch && vMatch[1]) {
      const cleanNum = parseFloat(vMatch[1].replace(/,/g, ''));
      if (!isNaN(cleanNum) && cleanNum > 0) {
        result.leadValue = cleanNum;
        break;
      }
    }
  }

  // If leadValue not explicitly stated, sum product prices
  if (result.leadValue == null && productList.length > 0) {
    const sum = productList.reduce((acc, p) => acc + ((p.price || 0) * (p.quantity || 1)), 0);
    if (sum > 0) {
      result.leadValue = sum;
    }
  }

  // 10. Lead Title extraction
  const titlePatterns = [
    /(?:title|subject|project\s*name|requirement|proposal\s*for|inquiry\s*for|lead\s*title)\s*[:=-]\s*([^\r\n]+)/i,
    /(?:project|deal|opportunity)\s*[:=-]\s*([^\r\n]+)/i,
  ];
  for (const pat of titlePatterns) {
    const tMatch = text.match(pat);
    if (tMatch && tMatch[1]) {
      const candidate = tMatch[1].trim();
      if (candidate.length >= 3) {
        result.title = candidate;
        break;
      }
    }
  }

  // Fallback title
  if (!result.title) {
    if (result.contactPerson && result.organization) {
      result.title = `Lead: ${result.contactPerson} - ${result.organization}`;
    } else if (result.organization) {
      result.title = `Opportunity with ${result.organization}`;
    } else if (result.contactPerson) {
      result.title = `Lead from ${result.contactPerson}`;
    } else if (fallbackFilename) {
      const baseName = path.basename(fallbackFilename, path.extname(fallbackFilename))
        .replace(/[_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      result.title = baseName || `Lead from Document`;
    } else {
      result.title = `Lead from Inbound Inquiry`;
    }
  }

  // 11. Description / Notes summary
  const summaryParts: string[] = [];
  if (result.contactPersons && result.contactPersons.length > 1) {
    summaryParts.push(`Key Contacts:`);
    result.contactPersons.forEach((cp, idx) => {
      summaryParts.push(`${idx + 1}. ${cp.name}${cp.title ? ` - ${cp.title}` : ''}${cp.phone ? ` | Mobile: ${cp.phone}` : ''}`);
    });
  } else if (result.contactPerson) {
    summaryParts.push(`Contact: ${result.contactPerson}`);
    if (result.jobTitle) summaryParts.push(`Title: ${result.jobTitle}`);
  }
  if (result.organization) summaryParts.push(`Organization: ${result.organization}`);
  if (result.address) summaryParts.push(`Address: ${result.address}`);
  if (result.website) summaryParts.push(`Website: ${result.website}`);
  if (result.source) summaryParts.push(`Source: ${result.source}`);
  if (result.type) summaryParts.push(`Type: ${result.type}`);
  if (result.expectedCloseDate) summaryParts.push(`Target Date: ${result.expectedCloseDate}`);
  if (result.products && result.products.length > 0) {
    const prodSummaries = result.products.map((p) => `${p.name} (Qty: ${p.quantity || 1}${p.price ? `, Price: $${p.price}` : ''})`);
    summaryParts.push(`Products: ${prodSummaries.join(', ')}`);
  }
  if (result.leadValue != null) summaryParts.push(`Value: $${result.leadValue.toLocaleString()}`);

  result.description = summaryParts.length > 0 
    ? `Extracted from uploaded document:\n${summaryParts.join('\n')}`
    : `Created from uploaded file: ${fallbackFilename || 'document'}`;

  return result;
}
