import fs from 'fs';
import path from 'path';
import { logger } from '@/utils/logger';
import { configService } from '@/services/configService';

export interface IVoiceLeadExtractedData {
  title: string;
  personName?: string;
  contactEmail?: string;
  contactPhone?: string;
  organizationName?: string;
  jobTitle?: string;
  leadValue?: number | null;
  expectedCloseDate?: string | null;
  description: string;
  source: string;
  rawTranscript: string;
  translatedTranscript?: string;
}

/**
 * Translates any spoken text (Hindi, Hinglish, Spanish, French, etc.) into clean English.
 * Uses Google Translate public translation service (zero API keys needed).
 */
export async function translateToEnglish(text: string, sourceLang?: string): Promise<string> {
  const trimmed = (text || '').trim();
  if (!trimmed) return '';

  try {
    const sl =
      sourceLang && !sourceLang.startsWith('en') && sourceLang !== 'hi-Latn' && sourceLang !== 'hinglish'
        ? sourceLang.split('-')[0]
        : 'auto';

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=en&dt=t&q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    if (res.ok) {
      const data: any = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translated = data[0]
          .map((item: any) => (item && item[0] ? item[0] : ''))
          .join('')
          .trim();
        if (translated) {
          return translated;
        }
      }
    }
  } catch (err: any) {
    logger.warn(`translateToEnglish exception: ${err.message}`);
  }

  return trimmed;
}

/**
 * Normalizes speech recognition phonetic slips or verbal expressions:
 * e.g., "john dot doe at gmail dot com" -> "john.doe@gmail.com"
 */
export function normalizeSpokenText(text: string): string {
  if (!text) return '';
  let cleaned = text.trim();

  // Normalize common spoken email symbols
  cleaned = cleaned.replace(/\s+(?:at the rate|at rate|at)\s+/gi, '@');
  cleaned = cleaned.replace(/\s+dot\s+/gi, '.');
  cleaned = cleaned.replace(/\s+underscore\s+/gi, '_');
  cleaned = cleaned.replace(/\s+dash\s+/gi, '-');

  // Fix spaced emails: e.g. "john @ gmail . com" -> "john@gmail.com"
  cleaned = cleaned.replace(/([a-zA-Z0-9._%+-]+)\s*@\s*([a-zA-Z0-9.-]+)\s*\.\s*([a-zA-Z]{2,})/g, '$1@$2.$3');

  return cleaned;
}

/**
 * Offline Heuristic / Regex NLP fallback when AI is unavailable or disabled
 */
export function extractVoiceLeadHeuristic(rawTranscript: string): IVoiceLeadExtractedData {
  const text = normalizeSpokenText(rawTranscript);

  // 1. Email extraction
  let contactEmail: string | undefined;
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
  if (emailMatch) {
    contactEmail = emailMatch[0].toLowerCase();
  }

  // 2. Phone extraction
  let contactPhone: string | undefined;
  // Look for 10-digit Indian numbers, with optional +91, or general international numbers
  const phonePatterns = [
    /(?:(?:\+|00)91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/,
    /(?:(?:\+|00)\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}\b/,
    /\b\d{10}\b/,
  ];

  for (const pat of phonePatterns) {
    const match = text.match(pat);
    if (match) {
      const cleanDigits = match[0].replace(/[\s-()]/g, '');
      if (cleanDigits.length >= 10) {
        contactPhone = cleanDigits;
        break;
      }
    }
  }

  // Also support verbally spoken digits: "phone 9 8 7 6 5 4 3 2 1 0"
  if (!contactPhone) {
    const verbalDigitsMatch = text.match(/(?:phone|mobile|number|call|contact|cell)(?:\s+(?:is|at))?\s+([\d\s]{10,25})/i);
    if (verbalDigitsMatch) {
      const compacted = verbalDigitsMatch[1].replace(/\s+/g, '');
      if (compacted.length >= 10 && compacted.length <= 13) {
        contactPhone = compacted;
      }
    }
  }

  // 3. Lead Value / Budget extraction
  let leadValue: number | null = null;
  // Matches "budget 50000", "50k", "2.5 lakh", "budget of 100000 rupees", "$5000", etc.
  const budgetPatterns = [
    /(?:budget|deal|value|amount|worth|cost|price|inr|rs|₹|\$)\s*(?:is|of|around|approx|estimated)?\s*([\d,]+(?:\.\d+)?)\s*(k|thousand|lakh|lac|lakhs|lacs|crore|crores|rupees|usd|dollars)?/i,
    /([\d,]+(?:\.\d+)?)\s*(k|thousand|lakh|lac|lakhs|lacs|crore|crores)\s*(?:rupees|budget|deal|inr|usd)?/i,
  ];

  for (const bPat of budgetPatterns) {
    const bMatch = text.match(bPat);
    if (bMatch) {
      const rawNum = parseFloat(bMatch[1].replace(/,/g, ''));
      const unit = (bMatch[2] || '').toLowerCase();
      if (!isNaN(rawNum)) {
        if (unit.startsWith('k') || unit === 'thousand') {
          leadValue = Math.round(rawNum * 1000);
        } else if (unit.startsWith('lakh') || unit.startsWith('lac')) {
          leadValue = Math.round(rawNum * 100000);
        } else if (unit.startsWith('crore')) {
          leadValue = Math.round(rawNum * 10000000);
        } else {
          leadValue = Math.round(rawNum);
        }
        break;
      }
    }
  }

  // 4. Contact Person Name extraction
  let personName: string | undefined;
  const namePatterns = [
    /(?:lead for|new lead for|contact person is|contact is|name is|client is|person is|speak with|talk to|speaking with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)(?=\s+(?:from|at|with|phone|email|mobile|budget|who|in)|[,.]|$)/i,
    /(?:Mr\.|Ms\.|Mrs\.|Dr\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /(?:for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)(?=\s+(?:from|at|with|company|phone|email|mobile)|[,.]|$)/i,
  ];

  for (const nPat of namePatterns) {
    const nMatch = text.match(nPat);
    if (nMatch && nMatch[1]) {
      let candidate = nMatch[1].trim();
      candidate = candidate.replace(/\s+(from|at|with|of|in|to|and|company|phone|email|mobile)$/i, '').trim();
      // Ignore common non-name words
      if (!/^(the|a|an|new|lead|company|deal|crm|client|project)$/i.test(candidate)) {
        personName = candidate;
        break;
      }
    }
  }

  // 5. Organization Name extraction
  let organizationName: string | undefined;
  const orgPatterns = [
    /(?:from|company|organization|org|firm|business|at)\s+(?:is|called|named)?\s*([A-Za-z0-9&.'-]+(?:\s+[A-Za-z0-9&.'-]+){0,3}\s*(?:Pvt\s*Ltd|Private\s*Limited|Limited|Ltd|LLC|Inc|Corp|Enterprises|Technologies|Solutions|Services|Group|Industries|Infotech|Hospital|Systems|Hub|Store|Shop)?)(?=(?:,|\.|\s+(?:phone|mobile|email|budget|value|worth|looking|interested|deal|number)|$))/i,
    /([A-Za-z0-9&.'-]+(?:\s+[A-Za-z0-9&.'-]+){0,2}\s*(?:Pvt\s*Ltd|Private\s*Limited|Limited|Ltd|LLC|Inc|Corp|Enterprises|Technologies|Solutions|Services|Group|Industries|Infotech))/i,
  ];

  for (const oPat of orgPatterns) {
    const oMatch = text.match(oPat);
    if (oMatch && oMatch[1]) {
      const candidate = oMatch[1].trim();
      if (candidate.length > 2 && !/^(the|a|this|my|our|him|her|them)$/i.test(candidate)) {
        organizationName = candidate;
        break;
      }
    }
  }

  // 6. Expected Close Date extraction
  let expectedCloseDate: string | null = null;
  const inDaysMatch = text.match(/(?:close|closing|within|in)\s+(\d+)\s+days/i);
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1], 10);
    const d = new Date();
    d.setDate(d.getDate() + days);
    expectedCloseDate = d.toISOString().split('T')[0];
  } else if (/next week/i.test(text)) {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    expectedCloseDate = d.toISOString().split('T')[0];
  } else if (/next month/i.test(text)) {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    expectedCloseDate = d.toISOString().split('T')[0];
  }

  // 7. Title Generation
  let title = '';
  if (organizationName && personName) {
    title = `${organizationName} - ${personName}`;
  } else if (organizationName) {
    title = `Lead from ${organizationName}`;
  } else if (personName) {
    title = `Lead for ${personName}`;
  } else {
    // Take first 6 words of transcript as title
    const words = text.split(/\s+/).slice(0, 6).join(' ');
    title = words ? `Voice Lead: ${words}` : 'New Voice Lead';
  }

  return {
    title,
    personName,
    contactEmail,
    contactPhone,
    organizationName,
    leadValue,
    expectedCloseDate,
    description: rawTranscript.trim(),
    source: 'Voice Lead',
    rawTranscript: rawTranscript.trim(),
  };
}

/**
 * Helper to dispatch AI completions supporting OpenRouter, OpenAI, and custom models
 */
async function callAiVoiceChatCompletion(
  messages: any[],
  apiKey: string,
  requestedModel: string
): Promise<string | null> {
  try {
    const isOpenRouter = apiKey.startsWith('sk-or-') || requestedModel.includes('/');
    const endpoint = isOpenRouter
      ? 'https://openrouter.ai/api/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

    let targetModel = requestedModel;
    if (!isOpenRouter && targetModel.includes('/')) {
      targetModel = targetModel.split('/')[1] || 'gpt-4o-mini';
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    if (isOpenRouter) {
      headers['HTTP-Referer'] = 'https://crm.imorse.digital';
      headers['X-Title'] = 'Krayin CRM';
    }

    const body: any = {
      model: targetModel,
      messages,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errTxt = await res.text();
      logger.warn(`AI voice extraction failed HTTP ${res.status}: ${errTxt}`);
      return null;
    }

    const data: any = await res.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch (err: any) {
    logger.warn(`AI voice extraction exception: ${err.message}`);
    return null;
  }
}

/**
 * Transcribes audio file using OpenAI Whisper API if an API key is available
 */
export async function transcribeAudioWithWhisper(audioFilePath: string, apiKey: string): Promise<string | null> {
  try {
    if (!fs.existsSync(audioFilePath)) return null;

    const fileBuffer = fs.readFileSync(audioFilePath);
    const fileName = path.basename(audioFilePath);
    const blob = new Blob([fileBuffer], { type: 'audio/webm' });

    const formData = new FormData();
    formData.append('file', blob, fileName);
    formData.append('model', 'whisper-1');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.text();
      logger.warn(`Whisper transcription error HTTP ${res.status}: ${err}`);
      return null;
    }

    const result: any = await res.json();
    return result?.text || null;
  } catch (err: any) {
    logger.warn(`Whisper audio transcription exception: ${err.message}`);
    return null;
  }
}

/**
 * Main parser function:
 * Takes spoken text transcript and language, translates to English if necessary,
 * and uses Magic AI (if enabled) or intelligent heuristic fallback to extract fields.
 */
export async function parseVoiceTranscript(
  rawTranscript: string,
  language?: string
): Promise<IVoiceLeadExtractedData> {
  const trimmed = (rawTranscript || '').trim();
  if (!trimmed) {
    return {
      title: 'New Voice Lead',
      description: '',
      source: 'Voice Lead',
      rawTranscript: '',
      translatedTranscript: '',
    };
  }

  // 1. Always translate voice transcript to English if spoken in another language (Hindi, Spanish, etc.)
  let translatedText = trimmed;
  try {
    const translation = await translateToEnglish(trimmed, language);
    if (translation && translation.trim()) {
      translatedText = translation.trim();
    }
  } catch (err: any) {
    logger.warn(`Failed to translate voice transcript to English: ${err.message}`);
  }

  // 2. Check Magic AI configuration
  try {
    const configMap = await configService.getAllConfigs();
    const isMagicAiEnabled =
      configMap['general.magic_ai.settings.enabled'] === '1' ||
      configMap['general.magic_ai.settings.enabled'] === 'true' ||
      configMap['general.magic_ai.settings.enable'] === '1' ||
      configMap['general.magic_ai.settings.enable'] === 'true';

    const apiKey =
      (configMap['general.magic_ai.settings.api_key'] ? String(configMap['general.magic_ai.settings.api_key']) : '') ||
      process.env.OPENROUTER_API_KEY ||
      process.env.OPENAI_API_KEY;

    const selectedModel = configMap['general.magic_ai.settings.model']
      ? String(configMap['general.magic_ai.settings.model'])
      : 'openai/gpt-4o-mini';

    if (isMagicAiEnabled && apiKey && trimmed.length > 5) {
      const today = new Date().toISOString().split('T')[0];
      const systemPrompt = `You are an expert Voice CRM Assistant.
Your job is to analyze spoken voice dictation and extract structured Lead information into a JSON object.
Today's date is: ${today}.

CRITICAL REQUIREMENT:
Regardless of the language of the spoken dictation (Hindi, Hinglish, Spanish, French, etc.), ALL extracted fields (title, personName, organizationName, description) MUST be translated and output STRICTLY IN ENGLISH.

Spoken voice often contains phrases like:
- "Create a lead for Amit Verma from Horizon Tech"
- "his phone is 9876543210 and email is amit@horizon.com"
- "deal value is around 50 thousand rupees, expected to close in two weeks"
- "interested in cloud migration and ERP integration"

Analyze the transcript carefully and return ONLY a JSON object with these exact keys:
- title: string (A concise, professional title in English, e.g. "Cloud Migration - Horizon Tech" or "Opportunity: Amit Verma")
- personName: string or null (Full Name of the contact person translated to Latin/English script)
- contactPhone: string or null (Phone/Mobile number formatted with digits only, e.g. "9876543210")
- contactEmail: string or null (Email address if spoken or inferred from domain, else null)
- organizationName: string or null (Company / Organization / Business name in English)
- jobTitle: string or null (Job title/designation in English if spoken, else null)
- leadValue: number or null (Numeric budget/deal value in figures e.g. 50000, 250000, or null)
- expectedCloseDate: string or null (Estimated close date in YYYY-MM-DD format based on context, or null)
- description: string (Cleaned up summary of requirements and context in English)
- source: string (Always "Voice Lead")

If any field is not mentioned, return null for that field. Do NOT guess phone or email if not spoken.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Spoken Voice Transcript (original): "${trimmed}"\nTranslated to English: "${translatedText}"`,
        },
      ];

      const aiResponse = await callAiVoiceChatCompletion(messages, apiKey, selectedModel);
      if (aiResponse) {
        try {
          const parsed = JSON.parse(aiResponse);
          return {
            title: parsed.title || `Voice Lead: ${parsed.personName || parsed.organizationName || 'Inquiry'}`,
            personName: parsed.personName || undefined,
            contactPhone: parsed.contactPhone || undefined,
            contactEmail: parsed.contactEmail || undefined,
            organizationName: parsed.organizationName || undefined,
            jobTitle: parsed.jobTitle || undefined,
            leadValue: parsed.leadValue !== null && parsed.leadValue !== undefined ? Number(parsed.leadValue) : null,
            expectedCloseDate: parsed.expectedCloseDate || null,
            description: parsed.description || translatedText || trimmed,
            source: 'Voice Lead',
            rawTranscript: trimmed,
            translatedTranscript: translatedText,
          };
        } catch (jsonErr) {
          logger.warn(`Failed to parse AI JSON response, falling back to heuristic: ${jsonErr}`);
        }
      }
    }
  } catch (err: any) {
    logger.warn(`AI Voice extraction failed, using heuristic parser: ${err.message}`);
  }

  // 3. Fallback to local heuristic extractor running on English translated text
  const heuristicResult = extractVoiceLeadHeuristic(translatedText);

  // Guarantee person and organization names are in Latin/English characters
  if (heuristicResult.personName && /[^\u0000-\u007F]/.test(heuristicResult.personName)) {
    try {
      heuristicResult.personName = await translateToEnglish(heuristicResult.personName, language);
    } catch (e) {
      // Keep heuristicResult.personName
    }
  }

  if (heuristicResult.organizationName && /[^\u0000-\u007F]/.test(heuristicResult.organizationName)) {
    try {
      heuristicResult.organizationName = await translateToEnglish(heuristicResult.organizationName, language);
    } catch (e) {
      // Keep heuristicResult.organizationName
    }
  }

  // Regenerate title in English if names were updated
  if (heuristicResult.organizationName && heuristicResult.personName) {
    heuristicResult.title = `${heuristicResult.organizationName} - ${heuristicResult.personName}`;
  } else if (heuristicResult.organizationName) {
    heuristicResult.title = `Lead from ${heuristicResult.organizationName}`;
  } else if (heuristicResult.personName) {
    heuristicResult.title = `Lead for ${heuristicResult.personName}`;
  }

  return {
    ...heuristicResult,
    description: translatedText || trimmed,
    rawTranscript: trimmed,
    translatedTranscript: translatedText,
  };
}
