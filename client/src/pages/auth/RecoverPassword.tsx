import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { showErrorAlert, showSuccessAlert } from "../../utils/swalAlert";
import { useAuthStore } from "../../store";
import {
  FormInput,
  AuthLayout,
  PageBreadcrumb,
} from "../../components";

const RecoverPassword = () => {
  const navigate = useNavigate();
  const { forgotPassword, resetPassword, loading } = useAuthStore();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      showErrorAlert("Validation Error", "Please enter a valid email address.");
      return;
    }

    try {
      await forgotPassword(email.trim());
      showSuccessAlert("Email Verified", `Registered account found for ${email}. You may now set your new password.`);
      setStep(2);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || "This email address is not registered in our system.";
      showErrorAlert("Email Not Registered", message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showErrorAlert("Validation Error", "Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showErrorAlert("Validation Error", "Passwords do not match.");
      return;
    }

    try {
      await resetPassword(email, newPassword);
      await showSuccessAlert(
        "Password Reset Successful!",
        "Your password has been updated. You can now sign in with your new password."
      );
      navigate("/auth/login");
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || "Password reset failed. Please try again.";
      showErrorAlert("Reset Failed", message);
    }
  };

  return (
    <>
      <PageBreadcrumb title="Recover Password" />
      <AuthLayout
        authTitle={step === 1 ? "Forgot Password?" : "Set New Password"}
        helpText={
          step === 1
            ? "Enter your registered email address to reset your password."
            : `Set a new secure password for ${email}`
        }
      >
        {step === 1 ? (
          <form onSubmit={handleVerifyEmail} className="space-y-4">
            <FormInput
              label="Email Address"
              type="email"
              name="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              containerClass="mb-4"
              className="form-input w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0088cc] focus:border-transparent text-slate-800 dark:text-slate-100 transition-all"
              labelClassName="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider"
              required
            />

            <button
              className="w-full py-3 px-4 bg-[#0088cc] hover:bg-[#0077b5] active:scale-[0.99] text-white text-sm font-bold rounded-xl shadow-md transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verifying Email...</span>
                </>
              ) : (
                <span>Continue</span>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <FormInput
              label="New Password"
              type="password"
              name="new_password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
              containerClass="mb-4"
              className="form-input w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0088cc] focus:border-transparent text-slate-800 dark:text-slate-100 transition-all"
              labelClassName="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider"
              required
            />

            <FormInput
              label="Confirm New Password"
              type="password"
              name="confirm_password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
              containerClass="mb-4"
              className="form-input w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0088cc] focus:border-transparent text-slate-800 dark:text-slate-100 transition-all"
              labelClassName="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider"
              required
            />

            <button
              className="w-full py-3 px-4 bg-[#0088cc] hover:bg-[#0077b5] active:scale-[0.99] text-white text-sm font-bold rounded-xl shadow-md transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Resetting Password...</span>
                </>
              ) : (
                <span>Reset Password</span>
              )}
            </button>
          </form>
        )}

        <div className="text-center pt-2">
          <Link
            to="/auth/login"
            className="text-xs font-semibold text-[#0088cc] hover:underline inline-flex items-center gap-1"
          >
            <i className="mgc_arrow_left_line"></i>
            <span>Back to Sign In</span>
          </Link>
        </div>
      </AuthLayout>
    </>
  );
};

export default RecoverPassword;
