import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import API from "@/config";
import { IVoiceLeadData, VoiceLeadModalProps } from "@/interface";
import { useVoiceLanguages } from "@/hooks";

export const VoiceLeadModal: React.FC<VoiceLeadModalProps> = ({
  isOpen,
  onClose,
  onLeadCreated,
  pipelineId,
  stageId,
}) => {
  const navigate = useNavigate();

  // Language management hook
  const {
    languages,
    samplePrompts,
    selectedLanguageId,
    setSelectedLanguageId,
    currentLanguage,
    isLangDropdownOpen,
    setIsLangDropdownOpen,
  } = useVoiceLanguages("en-IN");

  // Voice recording states
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [speechSupported, setSpeechSupported] = useState(true);

  // Processing & Form states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [hasExtracted, setHasExtracted] = useState(false);

  // Extracted lead fields
  const [extractedLead, setExtractedLead] = useState<IVoiceLeadData>({
    title: "",
    personName: "",
    contactPhone: "",
    contactEmail: "",
    organizationName: "",
    leadValue: null,
    expectedCloseDate: "",
    description: "",
    rawTranscript: "",
    translatedTranscript: "",
  });

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const interimRef = useRef("");
  const baseTranscriptRef = useRef("");
  const isListeningRef = useRef(false);


  // Close language dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Initialize Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  // Timer counter when recording
  useEffect(() => {
    if (isListening) {
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isListening]);

  // Clean up recognition and clear lead data on unmount or close
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      baseTranscriptRef.current = "";
      setTranscript("");
      setInterimText("");
      setHasExtracted(false);
      setExtractedLead({
        title: "",
        personName: "",
        contactPhone: "",
        contactEmail: "",
        organizationName: "",
        leadValue: null,
        expectedCloseDate: "",
        description: "",
        rawTranscript: "",
        translatedTranscript: "",
      });
      setIsLangDropdownOpen(false);
    }
  }, [isOpen]);

  // Handle ESC key to close and clear lead
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        stopListening();
        baseTranscriptRef.current = "";
        setTranscript("");
        setInterimText("");
        setHasExtracted(false);
        setExtractedLead({
          title: "",
          personName: "",
          contactPhone: "",
          contactEmail: "",
          organizationName: "",
          leadValue: null,
          expectedCloseDate: "",
          description: "",
          rawTranscript: "",
          translatedTranscript: "",
        });
        setIsLangDropdownOpen(false);
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      Swal.fire({
        icon: "info",
        title: "Browser Speech Not Supported",
        text: "Your current browser does not support live speech recognition. Please use Google Chrome or Microsoft Edge.",
      });
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    isListeningRef.current = true;
    setIsListening(true);

    // Save existing transcript as base so speech appends cleanly
    baseTranscriptRef.current = transcript.trim();
    interimRef.current = "";
    setInterimText("");

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = currentLanguage.code;

    recognition.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
    };

    recognition.onresult = (event: any) => {
      let sessionFinal = "";
      let sessionInterim = "";

      for (let i = 0; i < event.results.length; ++i) {
        const item = event.results[i];
        const text = item[0]?.transcript || "";
        if (item.isFinal) {
          sessionFinal += (sessionFinal ? " " : "") + text.trim();
        } else {
          sessionInterim += (sessionInterim ? " " : "") + text.trim();
        }
      }

      interimRef.current = sessionInterim;
      setInterimText(sessionInterim);

      const base = baseTranscriptRef.current.trim();
      const combined = [base, sessionFinal.trim()].filter(Boolean).join(" ");
      setTranscript(combined);
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        isListeningRef.current = false;
        setIsListening(false);
        Swal.fire({
          icon: "warning",
          title: "Microphone Access Denied",
          text: "Please allow microphone permissions in your browser address bar to speak.",
        });
      } else if (event.error === "audio-capture") {
        isListeningRef.current = false;
        setIsListening(false);
        Swal.fire({
          icon: "warning",
          title: "No Microphone Detected",
          text: "No microphone was found or your microphone is in use/muted.",
        });
      } else if (event.error === "network") {
        isListeningRef.current = false;
        setIsListening(false);
        Swal.fire({
          icon: "error",
          title: "Speech Network Error",
          text: "Could not reach browser speech recognition service. Please check your internet connection or type your inquiry directly.",
        });
      }
    };

    recognition.onend = () => {
      const trailing = interimRef.current.trim();
      if (trailing) {
        setTranscript((prev) => {
          const trimmedPrev = (prev || "").trim();
          return trimmedPrev ? `${trimmedPrev} ${trailing}` : trailing;
        });
        interimRef.current = "";
        setInterimText("");
      }

      if (isListeningRef.current) {
        setTimeout(() => {
          if (!isListeningRef.current) return;
          try {
            setTranscript((curr) => {
              baseTranscriptRef.current = (curr || "").trim();
              return curr;
            });
            const nextRecognition = new SpeechRecognition();
            nextRecognition.continuous = true;
            nextRecognition.interimResults = true;
            nextRecognition.lang = currentLanguage.code;
            nextRecognition.onstart = recognition.onstart;
            nextRecognition.onresult = recognition.onresult;
            nextRecognition.onerror = recognition.onerror;
            nextRecognition.onend = recognition.onend;
            recognitionRef.current = nextRecognition;
            nextRecognition.start();
          } catch (err) {
            console.warn("Speech reconnect exception:", err);
            isListeningRef.current = false;
            setIsListening(false);
          }
        }, 150);
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err: any) {
      console.error("Failed to start speech recognition:", err);
      isListeningRef.current = false;
      setIsListening(false);
    }
  };

  const stopListening = () => {
    isListeningRef.current = false;
    setIsListening(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    const trailing = interimRef.current.trim();
    if (trailing) {
      setTranscript((prev) => {
        const trimmedPrev = (prev || "").trim();
        return trimmedPrev ? `${trimmedPrev} ${trailing}` : trailing;
      });
      interimRef.current = "";
      setInterimText("");
    }
    baseTranscriptRef.current = "";
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleReset = () => {
    stopListening();
    interimRef.current = "";
    baseTranscriptRef.current = "";
    setTranscript("");
    setInterimText("");
    setHasExtracted(false);
    setExtractedLead({
      title: "",
      personName: "",
      contactPhone: "",
      contactEmail: "",
      organizationName: "",
      leadValue: null,
      expectedCloseDate: "",
      description: "",
      rawTranscript: "",
      translatedTranscript: "",
    });
  };

  const handleModalClose = () => {
    handleReset();
    setIsLangDropdownOpen(false);
    onClose();
  };

  // Parse voice transcript into structured lead fields via Backend
  const handleProcessVoice = async (textToProcess?: string, langId?: string) => {
    stopListening();

    const currentLiveTranscript = (
      transcript + (interimRef.current ? (transcript ? " " : "") + interimRef.current : "")
    ).trim();

    const raw = (textToProcess || currentLiveTranscript || "").trim();

    if (!raw) {
      Swal.fire("Attention", "Please speak into the microphone or provide a transcript first.", "info");
      return;
    }

    const activeLanguageId = langId || selectedLanguageId;

    stopListening();
    setIsProcessing(true);

    try {
      const response = await API.post("/leads/parse-voice", {
        transcript: raw,
        language: activeLanguageId,
      });
      if (response.data?.success && response.data?.data) {
        const d = response.data.data;
        setExtractedLead({
          title: d.title || "",
          personName: d.personName || "",
          contactPhone: d.contactPhone || "",
          contactEmail: d.contactEmail || "",
          organizationName: d.organizationName || "",
          leadValue: d.leadValue !== null && d.leadValue !== undefined ? Number(d.leadValue) : null,
          expectedCloseDate: d.expectedCloseDate || "",
          description: d.description || d.translatedTranscript || raw,
          rawTranscript: d.rawTranscript || raw,
          translatedTranscript: d.translatedTranscript || "",
        });
        setHasExtracted(true);
      } else {
        throw new Error(response.data?.message || "Failed to parse voice details");
      }
    } catch (err: any) {
      Swal.fire("Processing Error", err.response?.data?.message || err.message || "Failed to process voice", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Direct 1-Click Save Lead
  const handleCreateLead = async () => {
    if (!extractedLead.title?.trim() && !transcript.trim()) {
      Swal.fire("Missing Information", "Lead title or transcript is required", "warning");
      return;
    }

    setIsCreating(true);
    try {
      const payload: any = {
        transcript,
        language: selectedLanguageId,
        title: extractedLead.title?.trim() || "Voice Lead",
        personName: extractedLead.personName?.trim() || undefined,
        contactEmail: extractedLead.contactEmail?.trim() || undefined,
        contactPhone: extractedLead.contactPhone?.trim() || undefined,
        organizationName: extractedLead.organizationName?.trim() || undefined,
        leadValue: extractedLead.leadValue ? Number(extractedLead.leadValue) : undefined,
        expectedCloseDate: extractedLead.expectedCloseDate || undefined,
        description: extractedLead.description || extractedLead.translatedTranscript || transcript,
        lead_pipeline_id: pipelineId ? Number(pipelineId) : undefined,
        lead_pipeline_stage_id: stageId ? Number(stageId) : undefined,
      };

      const res = await API.post("/leads/create-by-voice", payload);
      if (res.data?.success) {
        Swal.fire({
          icon: "success",
          title: "Lead Created in English!",
          text: res.data.message || `Lead "${payload.title}" created successfully.`,
          timer: 2000,
          showConfirmButton: false,
        });
        handleReset();
        onClose();
        if (onLeadCreated) onLeadCreated();
      } else {
        throw new Error(res.data?.message || "Failed to create lead");
      }
    } catch (err: any) {
      Swal.fire("Error", err.response?.data?.message || err.message || "Failed to create lead", "error");
    } finally {
      setIsCreating(false);
    }
  };

  // Open in full Create Lead form
  const handleOpenInFullForm = () => {
    const voiceData = {
      ...extractedLead,
      rawTranscript: transcript,
    };
    handleModalClose();
    navigate("/leads/create", {
      state: {
        voiceLead: voiceData,
      },
    });
  };

  // Format seconds to MM:SS
  const fmtTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleModalClose();
        }
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/80 flex items-center justify-between bg-gradient-to-r from-sky-50/60 to-transparent dark:from-sky-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0088cc]/10 dark:bg-[#0088cc]/20 flex items-center justify-center text-[#0088cc]">
              <i className="mgc_mic_line text-xl"></i>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                Voice Lead Creator
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-[#0088cc] dark:bg-sky-900/60 dark:text-sky-300">
                  AI Voice
                </span>
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Speak naturally to create or pre-fill a lead in seconds
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleModalClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            title="Close and clear lead"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Microphone Central Control Card */}
          <div className="bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/80 rounded-2xl p-5 sm:p-6 text-center space-y-4">
            {/* Interactive Pulse Mic Button */}
            <div className="flex flex-col items-center justify-center relative">
              {isListening && (
                <>
                  <div className="absolute w-28 h-28 rounded-full bg-[#0088cc]/20 animate-ping"></div>
                  <div className="absolute w-24 h-24 rounded-full bg-[#0088cc]/30 animate-pulse"></div>
                </>
              )}

              <button
                type="button"
                onClick={toggleListening}
                className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 active:scale-95 cursor-pointer ${
                  isListening
                    ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/30 ring-4 ring-red-400/30"
                    : "bg-[#0088cc] hover:bg-[#0077b5] text-white shadow-[#0088cc]/30 hover:scale-105"
                }`}
                title={isListening ? "Tap to stop recording" : "Tap to speak"}
              >
                {isListening ? (
                  <i className="mgc_stop_fill text-3xl animate-bounce"></i>
                ) : (
                  <i className="mgc_mic_fill text-3xl"></i>
                )}
              </button>

              {/* Status & Timer */}
              <div className="mt-3 flex items-center gap-2">
                {isListening ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-3 py-1 rounded-full border border-red-200 dark:border-red-800">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                    Listening ({fmtTime(recordingSeconds)}) - Tap to stop
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Tap microphone to start speaking
                  </span>
                )}
              </div>

              {/* Audio wave simulation bars when listening */}
              {isListening && (
                <div className="flex items-center gap-1 mt-3 h-5">
                  {[40, 70, 95, 60, 85, 45, 90, 65, 35].map((h, i) => (
                    <span
                      key={i}
                      className="w-1 bg-[#0088cc] rounded-full animate-pulse"
                      style={{
                        height: `${h}%`,
                        animationDuration: `${0.4 + (i % 3) * 0.2}s`,
                      }}
                    ></span>
                  ))}
                </div>
              )}
            </div>

            {/* Sleek Custom Language Dropdown */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <div className="relative" ref={langDropdownRef}>
                <button
                  type="button"
                  onClick={() => !isListening && setIsLangDropdownOpen(!isLangDropdownOpen)}
                  disabled={isListening}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all shadow-2xs ${
                    isLangDropdownOpen
                      ? "border-[#0088cc] bg-sky-50/70 text-[#0088cc] dark:bg-sky-950/40 dark:border-[#0088cc]"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
                  } ${isListening ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                  title="Select spoken language"
                >
                  <span className="text-sm select-none">{currentLanguage.flag}</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {currentLanguage.label}
                  </span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-400 font-normal">
                    ({currentLanguage.native})
                  </span>
                  <i
                    className={`mgc_down_line text-sm text-gray-400 transition-transform duration-200 ${
                      isLangDropdownOpen ? "rotate-180 text-[#0088cc]" : ""
                    }`}
                  ></i>
                </button>

                {/* Floating Menu */}
                {isLangDropdownOpen && (
                  <div className="absolute left-1/2 -translate-x-1/2 mt-1.5 w-64 max-h-64 overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700/60 mb-1">
                      Select Spoken Language
                    </div>
                    {languages.map((lang) => {
                      const isSelected = lang.id === selectedLanguageId;
                      return (
                        <button
                          key={lang.id}
                          type="button"
                          onClick={() => {
                            setSelectedLanguageId(lang.id);
                            setIsLangDropdownOpen(false);
                            if (isListening && recognitionRef.current) {
                              try {
                                recognitionRef.current.lang = lang.code;
                              } catch (e) {}
                            }
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-sky-50 dark:hover:bg-gray-700/70 transition-colors ${
                            isSelected
                              ? "bg-sky-50/70 dark:bg-gray-700/50 text-[#0088cc] font-semibold"
                              : "text-gray-700 dark:text-gray-200 font-medium"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">{lang.flag}</span>
                            <div className="flex flex-col">
                              <span>{lang.label}</span>
                              <span className="text-[10px] text-gray-400 dark:text-gray-400 font-normal">
                                {lang.native}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {lang.badge && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                                {lang.badge}
                              </span>
                            )}
                            {isSelected && (
                              <i className="mgc_check_line text-base text-[#0088cc]"></i>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Auto-translate info pill */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {currentLanguage.isAutoTranslate ? (
                  <span>
                    Spoken <strong>{currentLanguage.label}</strong> auto-transfers to <strong>English</strong>
                  </span>
                ) : (
                  <span>Transfers speech to structured English lead</span>
                )}
              </div>
            </div>
          </div>

          {/* Spoken Transcript Input & Live Display */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Spoken Voice Transcript
              </label>
              {transcript && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <i className="mgc_refresh_line text-xs"></i>
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="relative">
              <textarea
                rows={3}
                value={
                  isListening
                    ? [transcript, interimText].filter(Boolean).join(" ")
                    : transcript
                }
                onChange={(e) => {
                  const val = e.target.value;
                  setTranscript(val);
                  baseTranscriptRef.current = val;
                }}
                placeholder="Your spoken words will appear here in real-time... (or type your inquiry directly)"
                className="w-full px-3.5 py-2.5 bg-gray-50/70 hover:bg-gray-50 focus:bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm font-medium focus:border-[#0088cc] focus:ring-2 focus:ring-[#0088cc]/20 focus:outline-none dark:text-gray-100 transition-all placeholder-gray-400"
              />
            </div>
            {isListening && (
              <div className="flex items-center justify-between text-[11px] text-[#0088cc] dark:text-sky-400 font-medium px-1">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0088cc] animate-ping"></span>
                  {interimText ? `Hearing: "${interimText}"` : "Listening continuously... speak freely"}
                </span>
                <span className="text-[10px] text-gray-400">Continuous speech active</span>
              </div>
            )}

            {/* Quick Suggestions / Sample Prompts */}
            {!transcript && !hasExtracted && (
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <span>💡</span>
                  <span>Example voice commands (click any to try instantly):</span>
                </span>
                <div className="flex flex-col gap-2">
                  {samplePrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedLanguageId(prompt.langId);
                        setTranscript(prompt.text);
                        baseTranscriptRef.current = prompt.text;
                        handleProcessVoice(prompt.text, prompt.langId);
                      }}
                      className="text-left text-xs bg-gray-50/90 hover:bg-sky-50/80 dark:bg-gray-800/80 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-200 hover:text-[#0088cc] dark:hover:text-[#38bdf8] p-3 rounded-xl border border-gray-200/80 dark:border-gray-700 transition-all leading-relaxed flex items-start gap-2.5 group cursor-pointer shadow-2xs hover:border-[#0088cc]/40"
                    >
                      <span className="text-base shrink-0 select-none">{prompt.flag}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-[#0088cc] dark:text-sky-300">
                            {prompt.badge}
                          </span>
                        </div>
                        <span className="font-medium whitespace-normal break-words text-gray-800 dark:text-gray-100">
                          "{prompt.text}"
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action to Process / Extract if not yet done */}
          {transcript && !hasExtracted && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleProcessVoice()}
                disabled={isProcessing}
                className="px-4 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Extracting Lead Details...</span>
                  </>
                ) : (
                  <>
                    <i className="mgc_magic_line text-base"></i>
                    <span>Process Voice & Extract Details</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Extracted Structured Fields Form */}
          {hasExtracted && (
            <div className="bg-sky-50/40 dark:bg-gray-900/50 border border-sky-100 dark:border-gray-700/80 rounded-2xl p-4 sm:p-5 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-gray-200/60 dark:border-gray-700/60 pb-2.5">
                <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                  <i className="mgc_check_circle_fill text-green-500 text-sm"></i>
                  Extracted Lead Information
                </h4>
                <span className="text-[11px] text-gray-400">Review & edit before saving</span>
              </div>

              {/* English Translation Indicator Banner */}
              {extractedLead.translatedTranscript &&
                extractedLead.translatedTranscript.trim().toLowerCase() !== transcript.trim().toLowerCase() && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3 flex items-start gap-2.5 animate-in fade-in duration-200">
                    <span className="text-base shrink-0">🌐</span>
                    <div className="text-xs space-y-0.5 min-w-0 flex-1">
                      <div className="font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                        <span>Transferred to English</span>
                        <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded-full">
                          Ready for DB
                        </span>
                      </div>
                      <p className="text-emerald-700 dark:text-emerald-300/90 font-medium italic break-words">
                        "{extractedLead.translatedTranscript}"
                      </p>
                    </div>
                  </div>
                )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Title */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Lead Title *
                  </label>
                  <input
                    type="text"
                    value={extractedLead.title || ""}
                    onChange={(e) => setExtractedLead({ ...extractedLead, title: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs sm:text-sm font-medium focus:border-[#0088cc] focus:outline-none dark:text-gray-100"
                    placeholder="Opportunity title"
                  />
                </div>

                {/* Person Name */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    value={extractedLead.personName || ""}
                    onChange={(e) => setExtractedLead({ ...extractedLead, personName: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs sm:text-sm font-medium focus:border-[#0088cc] focus:outline-none dark:text-gray-100"
                    placeholder="Full name"
                  />
                </div>

                {/* Organization */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Organization / Company
                  </label>
                  <input
                    type="text"
                    value={extractedLead.organizationName || ""}
                    onChange={(e) => setExtractedLead({ ...extractedLead, organizationName: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs sm:text-sm font-medium focus:border-[#0088cc] focus:outline-none dark:text-gray-100"
                    placeholder="Company name"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={extractedLead.contactPhone || ""}
                    onChange={(e) => setExtractedLead({ ...extractedLead, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs sm:text-sm font-medium focus:border-[#0088cc] focus:outline-none dark:text-gray-100"
                    placeholder="e.g. 9876543210"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={extractedLead.contactEmail || ""}
                    onChange={(e) => setExtractedLead({ ...extractedLead, contactEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs sm:text-sm font-medium focus:border-[#0088cc] focus:outline-none dark:text-gray-100"
                    placeholder="contact@company.com"
                  />
                </div>

                {/* Budget / Lead Value */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Estimated Budget / Value (₹)
                  </label>
                  <input
                    type="number"
                    value={extractedLead.leadValue ?? ""}
                    onChange={(e) =>
                      setExtractedLead({
                        ...extractedLead,
                        leadValue: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs sm:text-sm font-medium focus:border-[#0088cc] focus:outline-none dark:text-gray-100"
                    placeholder="e.g. 50000"
                  />
                </div>

                {/* Expected Close Date */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Expected Close Date
                  </label>
                  <input
                    type="date"
                    value={extractedLead.expectedCloseDate || ""}
                    onChange={(e) => setExtractedLead({ ...extractedLead, expectedCloseDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs sm:text-sm font-medium focus:border-[#0088cc] focus:outline-none dark:text-gray-100"
                  />
                </div>

                {/* Notes / Description */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Requirement Notes / Context
                  </label>
                  <textarea
                    rows={2}
                    value={extractedLead.description || ""}
                    onChange={(e) => setExtractedLead({ ...extractedLead, description: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs sm:text-sm font-medium focus:border-[#0088cc] focus:outline-none dark:text-gray-100"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-800/80 flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            Reset
          </button>

          <div className="flex items-center gap-2">
            {hasExtracted && (
              <button
                type="button"
                onClick={handleOpenInFullForm}
                className="px-4 py-2 border border-[#0088cc] text-[#0088cc] hover:bg-sky-50 dark:hover:bg-gray-700 text-xs sm:text-sm font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                title="Open in full form to add custom fields or products"
              >
                <i className="mgc_edit_line text-sm"></i>
                <span>Open in Full Form</span>
              </button>
            )}

            <button
              type="button"
              onClick={hasExtracted ? handleCreateLead : () => handleProcessVoice()}
              disabled={isCreating || isProcessing || (!transcript.trim() && !extractedLead.title?.trim())}
              className="px-5 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isCreating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Creating Lead...</span>
                </>
              ) : hasExtracted ? (
                <>
                  <i className="mgc_check_line text-base"></i>
                  <span>Create Lead Now</span>
                </>
              ) : (
                <>
                  <i className="mgc_magic_line text-base"></i>
                  <span>Process & Create</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
