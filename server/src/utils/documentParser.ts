import fs from 'fs';
import path from 'path';

export interface ExtractedProduct {
  name: string;
  sku?: string;
  quantity?: number;
  price?: number;
  description?: string;
}

export interface ExtractedLeadData {
  title?: string;
  leadValue?: number | null;
  contactPerson?: string;
  email?: string;
  phone?: string;
  organization?: string;
  jobTitle?: string;
  source?: string;
  type?: string;
  expectedCloseDate?: string;
  products?: ExtractedProduct[];
  description?: string;
  rawText?: string;
}

/**
 * Extracts plain text from a PDF, text file, or binary document buffer.
 */
export function extractTextFromBuffer(buffer: Buffer, originalFilename: string): string {
  const ext = path.extname(originalFilename).toLowerCase();

  if (ext === '.txt' || ext === '.csv' || ext === '.json' || ext === '.md' || ext === '.html') {
    return buffer.toString('utf8');
  }

  // Handle PDF extraction
  const raw = buffer.toString('latin1');
  const textChunks: string[] = [];

  // Match PDF string literals: (Text here) Tj or [(T)(e)(x)(t)] TJ
  const tjRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
  let match;
  while ((match = tjRegex.exec(raw)) !== null) {
    const unescaped = match[1]
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\([()\\])/g, '$1');
    textChunks.push(unescaped);
  }

  // Match PDF array text: [ (text1) 20 (text2) ] TJ
  const arrayTjRegex = /\[\s*((?:\([^)]*\)|[0-9\s.-]+)+)\s*\]\s*TJ/g;
  while ((match = arrayTjRegex.exec(raw)) !== null) {
    const subStrRegex = /\(([^)]+)\)/g;
    let subMatch;
    let fullWord = '';
    while ((subMatch = subStrRegex.exec(match[1])) !== null) {
      fullWord += subMatch[1].replace(/\\([()\\])/g, '$1');
    }
    if (fullWord) {
      textChunks.push(fullWord);
    }
  }

  // Fallback: If no PDF text operators matched, scan for printable ASCII character sequences
  if (textChunks.length === 0) {
    const asciiRegex = /[a-zA-Z0-9@+._\s-]{4,}/g;
    while ((match = asciiRegex.exec(raw)) !== null) {
      const candidate = match[0].trim();
      if (candidate.includes('@') || candidate.includes(':') || candidate.length > 8) {
        textChunks.push(candidate);
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

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // 1. Email extraction
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
  const emailMatch = text.match(emailRegex);
  if (emailMatch) {
    result.email = emailMatch[1].toLowerCase().trim();
  }

  // 2. Phone extraction
  const phonePatterns = [
    /(?:phone|mobile|tel|contact(?:\s*no|\s*number)?|cell)\s*[:=-]\s*([+]?[0-9\s().-]{7,20})/i,
    /([+]?\d{1,3}[-.\s]?(?:\(\d{2,4}\)|\d{2,4})[-.\s]?\d{3,4}[-.\s]?\d{3,5})/,
  ];
  for (const pat of phonePatterns) {
    const pm = text.match(pat);
    if (pm) {
      const cleanPhone = pm[1].trim();
      if (cleanPhone.replace(/[^0-9]/g, '').length >= 7) {
        result.phone = cleanPhone;
        break;
      }
    }
  }

  // 3. Contact Person extraction
  const personPatterns = [
    /(?:contact\s*person|person\s*name|contact\s*name|client\s*name|customer\s*name|attention|attn|full\s*name|name)\s*[:=-]\s*([A-Za-z\s.'-]+)/i,
    /(?:prepared\s*for|billed\s*to|bill\s*to)\s*[:=-]\s*([A-Za-z\s.'-]+)/i,
  ];
  for (const pat of personPatterns) {
    const pMatch = text.match(pat);
    if (pMatch && pMatch[1]) {
      const val = pMatch[1].split('\n')[0].replace(/[,;].*$/, '').trim();
      if (val.length >= 2 && !val.includes('@') && !val.toLowerCase().includes('ltd') && !val.toLowerCase().includes('inc') && !val.toLowerCase().includes('corp')) {
        result.contactPerson = val;
        break;
      }
    }
  }

  // If no person name explicitly found but email exists, synthesize name from email
  if (!result.contactPerson && result.email) {
    const emailPrefix = result.email.split('@')[0];
    const parts = emailPrefix.split(/[._-]/).filter((p) => p.length > 1);
    if (parts.length >= 2) {
      result.contactPerson = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
    }
  }

  // 4. Organization / Company extraction
  const orgPatterns = [
    /(?:organization|company\s*name|company|account\s*name|business\s*name|firm|client(?:\s*org)?|vendor)\s*[:=-]\s*([A-Za-z0-9\s.,&'-]+)/i,
    /(?:at|for|from)\s+([A-Za-z0-9\s.,&'-]+(?:\s+(?:Inc|LLC|Ltd|Corp|Corporation|Technologies|Solutions|Enterprises|Pvt|Global|Services|Group|Systems)))/i,
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

  // 6. Lead Source & Type
  const sourceMatch = text.match(/(?:lead\s*source|source|channel)\s*[:=-]\s*([^\r\n,;]+)/i);
  if (sourceMatch && sourceMatch[1]) {
    result.source = sourceMatch[1].trim();
  }

  const typeMatch = text.match(/(?:lead\s*type|type|deal\s*type|opportunity\s*type)\s*[:=-]\s*([^\r\n,;]+)/i);
  if (typeMatch && typeMatch[1]) {
    result.type = typeMatch[1].trim();
  }

  // 7. Expected Close Date
  const dateMatch = text.match(/(?:expected\s*close\s*date|close\s*date|target\s*date|due\s*date)\s*[:=-]\s*([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2}|[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{4})/i);
  if (dateMatch && dateMatch[1]) {
    result.expectedCloseDate = dateMatch[1].trim();
  }

  // 8. Product Items extraction
  const productList: ExtractedProduct[] = [];
  const addedProductNames = new Set<string>();

  // Pattern A: Product: Name, Qty: X, Price: Y
  const productLineRegex = /(?:product|item|service|package|software|hardware)\s*(?:name)?\s*[:=-]\s*([A-Za-z0-9\s._-]+?)(?:[,\s]+(?:sku|code)\s*[:=-]\s*([A-Za-z0-9._-]+))?(?:[,\s]+(?:qty|quantity|units?)\s*[:=-]\s*(\d+))?(?:[,\s]+(?:price|rate|cost|amount)\s*[:=-]\s*[$€£₹]?\s*([0-9,]+(?:\.[0-9]{1,2})?))?(?:[,\n;]|$)/gi;
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
  const itemRowRegex = /(?:^|\n)\s*(?:\d+[\).])?\s*([A-Za-z0-9][A-Za-z0-9\s._-]{2,40})\s+[-–—]?\s*(?:(?:qty|quantity)?\s*[:=]?\s*(\d+)\s*(?:x|@|units?)\s*)?[$€£₹]\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi;
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

  // 9. Lead Value extraction
  const valuePatterns = [
    /(?:lead\s*value|value|budget|deal\s*size|grand\s*total|total\s*amount|total|amount|price|cost)\s*[:=-]?\s*[$€£₹]?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /[$€£₹]\s*([0-9,]+(?:\.[0-9]{1,2})?)/,
  ];
  for (const pat of valuePatterns) {
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
      result.title = `Lead from Uploaded File`;
    }
  }

  // 11. Description / Notes summary
  const summaryParts: string[] = [];
  if (result.contactPerson) summaryParts.push(`Contact: ${result.contactPerson}`);
  if (result.email) summaryParts.push(`Email: ${result.email}`);
  if (result.phone) summaryParts.push(`Phone: ${result.phone}`);
  if (result.organization) summaryParts.push(`Organization: ${result.organization}`);
  if (result.jobTitle) summaryParts.push(`Title: ${result.jobTitle}`);
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
