import React, { useState } from "react";
import { API } from "@/config";
import Swal from "sweetalert2";
import { Check } from "lucide-react";
import { Navbar, Footer } from "@/components/marketing/layout";

export const BookDemo: React.FC = () => {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    preferred_date: "",
    preferred_time: "",
    explore: "",
    agreed: false,
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.first_name.trim()) {
      Swal.fire({
        title: "First Name Required",
        text: "Please enter your first name.",
        icon: "warning",
        confirmButtonColor: "#03075e",
      });
      return;
    }

    if (!formData.email.trim()) {
      Swal.fire({
        title: "Work Email Required",
        text: "Please enter your official work email address.",
        icon: "warning",
        confirmButtonColor: "#03075e",
      });
      return;
    }

    if (!formData.agreed) {
      Swal.fire({
        title: "Consent Required",
        text: "Please agree to the Privacy Policy to proceed.",
        icon: "warning",
        confirmButtonColor: "#03075e",
      });
      return;
    }

    setLoading(true);
    try {
      const fullName = `${formData.first_name.trim()} ${formData.last_name.trim()}`.trim();
      const payload = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        name: fullName,
        full_name: fullName,
        email: formData.email.trim().toLowerCase(),
        work_email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        preferred_demo_date: formData.preferred_date || null,
        preferred_demo_time: formData.preferred_time || null,
        message: formData.explore.trim() || null,
        explore: formData.explore.trim() || null,
      };

      const response = await API.post("/book-demo", payload);
      if (response.data && response.data.success) {
        await Swal.fire({
          title: "Demo Request Submitted! 🎉",
          html: `
            <div class="text-left text-sm text-gray-600 space-y-2 mt-2">
              <p>Thank you, <strong>${fullName}</strong>! We have received your demonstration request.</p>
              <p>Our solution engineers will review your requirements and reach out via <strong>${formData.email}</strong> to coordinate your live walkthrough.</p>
            </div>
          `,
          icon: "success",
          confirmButtonColor: "#03075e",
          confirmButtonText: "Got it",
        });

        setFormData({
          first_name: "",
          last_name: "",
          email: "",
          phone: "",
          city: "",
          state: "",
          preferred_date: "",
          preferred_time: "",
          explore: "",
          agreed: false,
        });
      }
    } catch (err: any) {
      console.error("Error submitting demo request:", err);
      const errMsg =
        err.response?.data?.message || err.message || "Failed to submit demo request. Please try again.";
      Swal.fire({
        title: "Submission Error",
        text: errMsg,
        icon: "error",
        confirmButtonColor: "#03075e",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col justify-between font-sans antialiased">
      {/* Official Marketing Navbar from Image 1 */}
      <Navbar />

      {/* Main Two-Card Layout */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-14">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          
          {/* Left Card: Information & Highlights */}
          <div className="lg:col-span-5 relative overflow-hidden bg-gradient-to-br from-white via-[#f8fbff] to-[#edf4ff] rounded-3xl border border-blue-100/70 p-7 sm:p-9 flex flex-col justify-between shadow-xs">
            {/* Top Content */}
            <div className="relative z-10">
              {/* Pill Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-widest text-[#03075e] bg-blue-100/60 border border-blue-200/60 shadow-2xs mb-5 uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-[#03075e]"></span>
                <span>A CLOSER LOOK</span>
              </div>

              {/* Title */}
              <h1
                className="font-bold text-slate-900 tracking-tight leading-tight mb-4"
                style={{ fontSize: "32px", lineHeight: "1.2" }}
              >
                Book a demo for your team.
              </h1>

              {/* Subtitle */}
              <p
                className="text-slate-600 leading-relaxed mb-7"
                style={{ fontSize: "15px", lineHeight: "1.6" }}
              >
                A focused conversation about your sales process, customer journey and what you want your CRM to do better.
              </p>

              {/* 3 Checklist Items */}
              <div className="space-y-3">
                <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs py-3 px-4 flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Check size={13} strokeWidth={2.8} />
                  </div>
                  <span
                    className="font-semibold text-slate-800"
                    style={{ fontSize: "14px" }}
                  >
                    Discuss your team's current workflow
                  </span>
                </div>

                <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs py-3 px-4 flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Check size={13} strokeWidth={2.8} />
                  </div>
                  <span
                    className="font-semibold text-slate-800"
                    style={{ fontSize: "14px" }}
                  >
                    Get guidance relevant to your process
                  </span>
                </div>

                <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs py-3 px-4 flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Check size={13} strokeWidth={2.8} />
                  </div>
                  <span
                    className="font-semibold text-slate-800"
                    style={{ fontSize: "14px" }}
                  >
                    No obligation to move forward
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom-Right Concentric Arcs Graphic (Watermark) */}
            <div className="absolute -bottom-10 -right-10 pointer-events-none opacity-40">
              <svg width="220" height="220" viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="150" cy="150" r="120" stroke="#93c5fd" strokeWidth="24" strokeOpacity="0.35" />
                <circle cx="150" cy="150" r="75" stroke="#93c5fd" strokeWidth="20" strokeOpacity="0.45" />
              </svg>
            </div>
          </div>

          {/* Right Card: Interactive Form */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-gray-200/90 shadow-sm p-7 sm:p-9 flex flex-col justify-between">
            <div>
              {/* Form Header */}
              <h2
                className="font-bold text-slate-900 tracking-tight"
                style={{ fontSize: "26px", lineHeight: "1.25" }}
              >
                Tell us about your team.
              </h2>
              <p
                className="text-slate-500 mt-1.5 mb-6"
                style={{ fontSize: "14px", lineHeight: "1.5" }}
              >
                A focused conversation around your process, not a generic product tour.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Row 1: First name & Last name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block font-semibold text-slate-700 mb-1.5"
                      style={{ fontSize: "13px" }}
                    >
                      First name <span className="text-blue-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      required
                      value={formData.first_name}
                      onChange={handleChange}
                      style={{ fontSize: "14px" }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#03075e]/15 focus:border-[#03075e] transition-all bg-white"
                    />
                  </div>

                  <div>
                    <label
                      className="block font-semibold text-slate-700 mb-1.5"
                      style={{ fontSize: "13px" }}
                    >
                      Last name
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      style={{ fontSize: "14px" }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#03075e]/15 focus:border-[#03075e] transition-all bg-white"
                    />
                  </div>
                </div>

                {/* Row 2: Work email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block font-semibold text-slate-700 mb-1.5"
                      style={{ fontSize: "13px" }}
                    >
                      Work email <span className="text-blue-600">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      style={{ fontSize: "14px" }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#03075e]/15 focus:border-[#03075e] transition-all bg-white"
                    />
                  </div>

                  <div>
                    <label
                      className="block font-semibold text-slate-700 mb-1.5"
                      style={{ fontSize: "13px" }}
                    >
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      style={{ fontSize: "14px" }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#03075e]/15 focus:border-[#03075e] transition-all bg-white"
                    />
                  </div>
                </div>

                {/* Row 3: City & State */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block font-semibold text-slate-700 mb-1.5"
                      style={{ fontSize: "13px" }}
                    >
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      placeholder="e.g. Ahmedabad"
                      value={formData.city}
                      onChange={handleChange}
                      style={{ fontSize: "14px" }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-slate-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#03075e]/15 focus:border-[#03075e] transition-all bg-white"
                    />
                  </div>

                  <div>
                    <label
                      className="block font-semibold text-slate-700 mb-1.5"
                      style={{ fontSize: "13px" }}
                    >
                      State
                    </label>
                    <input
                      type="text"
                      name="state"
                      placeholder="e.g. Gujarat"
                      value={formData.state}
                      onChange={handleChange}
                      style={{ fontSize: "14px" }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-slate-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#03075e]/15 focus:border-[#03075e] transition-all bg-white"
                    />
                  </div>
                </div>

                {/* Row 4: Preferred Demo Date & Preferred Demo Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block font-semibold text-slate-700 mb-1.5"
                      style={{ fontSize: "13px" }}
                    >
                      Preferred Demo Date
                    </label>
                    <input
                      type="date"
                      name="preferred_date"
                      min={new Date().toISOString().substring(0, 10)}
                      value={formData.preferred_date}
                      onChange={handleChange}
                      style={{ fontSize: "14px" }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#03075e]/15 focus:border-[#03075e] transition-all bg-white"
                    />
                  </div>

                  <div>
                    <label
                      className="block font-semibold text-slate-700 mb-1.5"
                      style={{ fontSize: "13px" }}
                    >
                      Preferred Demo Time
                    </label>
                    <input
                      type="time"
                      name="preferred_time"
                      value={formData.preferred_time}
                      onChange={handleChange}
                      style={{ fontSize: "14px" }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#03075e]/15 focus:border-[#03075e] transition-all bg-white"
                    />
                  </div>
                </div>

                {/* Row 5: What would you like to explore? */}
                <div>
                  <label
                    className="block font-semibold text-slate-700 mb-1.5"
                    style={{ fontSize: "13px" }}
                  >
                    What would you like to explore?
                  </label>
                  <textarea
                    rows={3}
                    name="explore"
                    placeholder="Your sales process, team needs, or integration requirements..."
                    value={formData.explore}
                    onChange={handleChange}
                    style={{ fontSize: "14px" }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-slate-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#03075e]/15 focus:border-[#03075e] transition-all bg-white resize-none"
                  ></textarea>
                </div>

                {/* Row 6: Consent Checkbox */}
                <div className="pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      name="agreed"
                      checked={formData.agreed}
                      onChange={handleChange}
                      required
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#03075e] focus:ring-[#03075e] cursor-pointer"
                    />
                    <span
                      className="text-slate-600 leading-snug"
                      style={{ fontSize: "13px" }}
                    >
                      I agree to the Privacy Policy and consent to being contacted about this request.
                    </span>
                  </label>
                </div>

                {/* Row 7: Request a Demo Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    style={{ fontSize: "15px" }}
                    className="w-full py-3.5 px-6 rounded-xl bg-[#03075e] hover:bg-[#020542] active:scale-[0.99] text-white font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Submitting Request...</span>
                      </>
                    ) : (
                      <>
                        <span>&rarr; Request a Demo</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>
      </main>

      {/* Official Marketing Footer */}
      <Footer />
    </div>
  );
};

export default BookDemo;
