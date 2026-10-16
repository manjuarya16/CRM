import React from "react";

interface ViewModeSwitcherProps {
  viewMode: "cards" | "table";
  onViewModeChange: (mode: "cards" | "table") => void;
  className?: string;
}

export const ViewModeSwitcher: React.FC<ViewModeSwitcherProps> = ({
  viewMode,
  onViewModeChange,
  className = "",
}) => {
  return (
    <div
      className={`flex items-center bg-gray-100 dark:bg-gray-700/60 p-0.5 rounded-xl border border-gray-200/80 dark:border-gray-600 ${className}`}
    >
      <button
        type="button"
        onClick={() => onViewModeChange("cards")}
        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
          viewMode === "cards"
            ? "bg-white dark:bg-gray-800 text-[#0088cc] shadow-xs"
            : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
        }`}
        title="Cards View"
      >
        <i className="mgc_grid_2_line text-sm"></i>
        <span className="hidden sm:inline">Cards</span>
      </button>
      <button
        type="button"
        onClick={() => onViewModeChange("table")}
        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
          viewMode === "table"
            ? "bg-white dark:bg-gray-800 text-[#0088cc] shadow-xs"
            : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
        }`}
        title="Table View"
      >
        <i className="mgc_table_line text-sm"></i>
        <span className="hidden sm:inline">Table</span>
      </button>
    </div>
  );
};
export default ViewModeSwitcher;
