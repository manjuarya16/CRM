import { Link } from "react-router-dom";

// components
import { PageBreadcrumb } from "../../components";

const Error404 = () => {
  return (
    <>
      <PageBreadcrumb title="Error 404" />
      <div className="bg-gradient-to-r from-rose-100 to-teal-100 dark:from-gray-700 dark:via-gray-900 dark:to-black">
        <div className="h-screen w-screen flex justify-center items-center">
          <div className="flex flex-col justify-center text-center gap-6">
            <Link to="/" className="flex justify-center mx-auto">
              <span className="text-lg font-semibold text-primary">
                NGO Management
              </span>
            </Link>
            <p className="text-3xl font-semibold text-primary">404!</p>
            <h1 className="text-4xl font-bold tracking-tight dark:text-gray-100">
              Page not found.
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-300">
              Sorry, we couldn’t find the page you’re looking for.
            </p>
            <Link to="/" className="text-base font-medium text-primary">
              {" "}
              Go back home{" "}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default Error404;
