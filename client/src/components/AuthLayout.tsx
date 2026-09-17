import { Link } from "react-router-dom";

interface AccountLayoutProps {
  pageImage?: any;
  authTitle?: string;
  helpText?: string;
  bottomLinks?: any;
  isCombineForm?: boolean;
  children?: any;
  hasForm?: boolean;
  userImage?: string;
}

const AuthLayout = ({
  pageImage,
  authTitle,
  helpText,
  bottomLinks,
  isCombineForm,
  children,
  hasForm,
  userImage,
}: AccountLayoutProps) => {
  return (
    <>
      <div className="min-h-screen w-screen flex justify-center items-center bg-slate-100 dark:bg-slate-900 px-4 py-8">
        <div className="2xl:w-1/4 lg:w-1/3 md:w-1/2 w-full max-w-md">
          <div className="card shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 rounded-xl overflow-hidden">
            <div className="p-8">
              <div className="text-center mb-8">
                <Link to="/" className="inline-flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white font-black text-xl shadow-md">
                    C
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    CRM Portal
                  </h2>
                </Link>
                {authTitle && (
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-2">
                    {authTitle}
                  </h3>
                )}
                {helpText && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {helpText}
                  </p>
                )}
              </div>

              {children}

              {bottomLinks}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthLayout;
