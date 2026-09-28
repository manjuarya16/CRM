import React, { useEffect, useState } from "react";
import API from "@/config";

export interface ITag {
  id: number;
  name: string;
  color?: string;
}

interface TagPickerProps {
  selectedTagIds: number[];
  onChange: (tagIds: number[]) => void;
  disabled?: boolean;
}

export const TagPicker: React.FC<TagPickerProps> = ({
  selectedTagIds = [],
  onChange,
  disabled = false,
}) => {
  const [allTags, setAllTags] = useState<ITag[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    API.get("/tags")
      .then((res) => setAllTags(res.data?.data || []))
      .catch(() => {});
  }, []);

  const toggleTag = (id: number) => {
    if (disabled) return;
    if (selectedTagIds.includes(id)) {
      onChange(selectedTagIds.filter((t) => t !== id));
    } else {
      onChange([...selectedTagIds, id]);
    }
  };

  const filteredTags = allTags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-2">
      {/* Selected Tags Pills */}
      <div className="flex flex-wrap items-center gap-1.5 min-h-[32px] p-1.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg">
        {selectedTagIds.length === 0 ? (
          <span className="text-xs text-gray-400 italic px-1">No tags selected</span>
        ) : (
          selectedTagIds.map((id) => {
            const tag = allTags.find((t) => t.id === id);
            if (!tag) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-white rounded-md shadow-sm"
                style={{ backgroundColor: tag.color || "#0088cc" }}
              >
                {tag.name}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => toggleTag(id)}
                    className="hover:opacity-80 text-white font-bold ml-0.5"
                  >
                    &times;
                  </button>
                )}
              </span>
            );
          })
        )}
      </div>

      {/* Available Tags Selector */}
      {!disabled && allTags.length > 0 && (
        <div className="space-y-1.5">
          <input
            type="text"
            placeholder="Filter tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-2.5 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
          />
          <div className="flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto p-1">
            {filteredTags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`px-2 py-0.5 text-xs rounded font-medium border transition-all cursor-pointer ${
                    isSelected
                      ? "ring-2 ring-blue-500 font-bold opacity-100"
                      : "opacity-75 hover:opacity-100"
                  }`}
                  style={{
                    backgroundColor: tag.color || "#0088cc",
                    borderColor: tag.color || "#0088cc",
                    color: "#ffffff",
                  }}
                >
                  {isSelected ? "✓ " : "+ "}
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const TagBadgeList: React.FC<{ tags?: ITag[] }> = ({ tags = [] }) => {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((t, idx) => (
        <span
          key={idx}
          className="px-1.5 py-0.5 text-[10px] font-semibold text-white rounded shadow-sm"
          style={{ backgroundColor: t.color || "#0088cc" }}
        >
          {t.name}
        </span>
      ))}
    </div>
  );
};
