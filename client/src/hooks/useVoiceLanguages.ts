import { useState } from "react";
import { ILanguageOption, ISampleVoicePrompt } from "@/interface";

export const SUPPORTED_LANGUAGES: ILanguageOption[] = [
  { code: "en-IN", id: "en-IN", flag: "🇮🇳", label: "English", native: "India", isAutoTranslate: false },
  { code: "en-US", id: "en-US", flag: "🇺🇸", label: "English", native: "US", isAutoTranslate: false },
  { code: "en-GB", id: "en-GB", flag: "🇬🇧", label: "English", native: "UK", isAutoTranslate: false },
  { code: "hi-IN", id: "hi-IN", flag: "🇮🇳", label: "Hindi", native: "हिंदी", badge: "Auto-Translates", isAutoTranslate: true },
  { code: "en-IN", id: "hinglish", flag: "🇮🇳", label: "Hinglish", native: "Hindi in Eng", badge: "Auto-Translates", isAutoTranslate: true },
  { code: "es-ES", id: "es-ES", flag: "🇪🇸", label: "Spanish", native: "Español", badge: "Auto-Translates", isAutoTranslate: true },
  { code: "fr-FR", id: "fr-FR", flag: "🇫🇷", label: "French", native: "Français", badge: "Auto-Translates", isAutoTranslate: true },
  { code: "de-DE", id: "de-DE", flag: "🇩🇪", label: "German", native: "Deutsch", badge: "Auto-Translates", isAutoTranslate: true },
  { code: "ar-SA", id: "ar-SA", flag: "🇸🇦", label: "Arabic", native: "العربية", badge: "Auto-Translates", isAutoTranslate: true },
];

export const SAMPLE_VOICE_PROMPTS: ISampleVoicePrompt[] = [
  {
    langId: "en-IN",
    text: "New lead for Rahul Sharma from Horizon Tech, phone 9876543210, email rahul@horizon.com, budget 75000 rupees, closing next week",
    badge: "English (India)",
    flag: "🇮🇳",
  },
  {
    langId: "hi-IN",
    text: "रोहित शर्मा के लिए नया लीड, स्काईलाइन प्राइवेट लिमिटेड, फोन 9876543210, बजट 1 लाख रुपये, अगले हफ्ते क्लोज होगा",
    badge: "Hindi (हिंदी)",
    flag: "🇮🇳",
  },
  {
    langId: "hinglish",
    text: "Ramesh Kumar ke liye naya lead banao, Skyline company se, phone number 9876543210, budget 50000 rupees",
    badge: "Hinglish",
    flag: "🇮🇳",
  },
];

export function useVoiceLanguages(defaultLangId: string = "en-IN") {
  const [selectedLanguageId, setSelectedLanguageId] = useState<string>(defaultLangId);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState<boolean>(false);

  const currentLanguage =
    SUPPORTED_LANGUAGES.find((l) => l.id === selectedLanguageId) || SUPPORTED_LANGUAGES[0];

  return {
    languages: SUPPORTED_LANGUAGES,
    samplePrompts: SAMPLE_VOICE_PROMPTS,
    selectedLanguageId,
    setSelectedLanguageId,
    currentLanguage,
    isLangDropdownOpen,
    setIsLangDropdownOpen,
  };
}
