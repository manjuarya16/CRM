import React, { useState } from "react";
import {
  CRM_PERMISSION_TREE,
  IPermissionTreeNode,
  getNodeLeafKeys,
} from "@/constants/permissions";
import { PermissionTreeViewProps, TreeNodeItemProps } from "@/interface";

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
  node,
  level,
  selectedKeys,
  onToggleKey,
  onToggleNodeBranch,
  disabled = false,
}) => {
  const [expanded, setExpanded] = useState<boolean>(true);
  const isParent = Boolean(node.children && node.children.length > 0);
  const leafKeys = getNodeLeafKeys(node);

  const isAllChecked =
    leafKeys.length > 0 && leafKeys.every((k: string) => selectedKeys.includes(k));
  const isSomeChecked =
    !isAllChecked && leafKeys.some((k: string) => selectedKeys.includes(k));

  const checkboxRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = isSomeChecked;
    }
  }, [isSomeChecked]);

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (isParent) {
      onToggleNodeBranch(node);
    } else if (node.key) {
      onToggleKey(node.key);
    }
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isParent) {
      setExpanded((prev) => !prev);
    }
  };

  return (
    <div className="select-none">
      <div
        className={"flex items-center py-1.5 px-1 rounded hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors " + (level > 0 ? "ml-6" : "")}
      >
        {/* Expand / Collapse Chevron */}
        <div className="w-5 flex items-center justify-center flex-shrink-0">
          {isParent ? (
            <button
              type="button"
              onClick={toggleExpand}
              className="p-0.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
            >
              <svg
                className={"w-3.5 h-3.5 transition-transform duration-150 " + (expanded ? "rotate-90" : "rotate-0")}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          ) : (
            <span className="w-3.5" />
          )}
        </div>

        {/* Icon (Folder for Parent, File/Doc for Leaf) */}
        <div
          onClick={isParent ? toggleExpand : handleCheckboxClick}
          className="mr-2 flex items-center justify-center flex-shrink-0 cursor-pointer text-gray-500 dark:text-gray-400"
        >
          {isParent ? (
            <svg
              className="w-4 h-4 text-[#4a5568] dark:text-gray-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
          ) : (
            <svg
              className="w-4 h-4 text-[#4a5568] dark:text-gray-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <line x1="10" y1="9" x2="8" y2="9"></line>
            </svg>
          )}
        </div>

        {/* Checkbox */}
        <div className="flex items-center flex-shrink-0 mr-2">
          <input
            ref={checkboxRef}
            type="checkbox"
            checked={isAllChecked}
            disabled={disabled}
            onChange={() => {}}
            onClick={handleCheckboxClick}
            className="w-4 h-4 text-[#0088cc] border-gray-300 rounded focus:ring-[#0088cc] cursor-pointer disabled:opacity-50"
          />
        </div>

        {/* Label */}
        <span
          onClick={isParent ? toggleExpand : handleCheckboxClick}
          className="text-sm text-gray-800 dark:text-gray-200 cursor-pointer select-none font-normal"
        >
          {node.name}
        </span>
      </div>

      {/* Children Recursion */}
      {isParent && expanded && node.children && (
        <div className="border-l border-gray-100 dark:border-gray-800 ml-3 pl-1">
          {node.children.map((child: any) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              level={level + 1}
              selectedKeys={selectedKeys}
              onToggleKey={onToggleKey}
              onToggleNodeBranch={onToggleNodeBranch}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const PermissionTreeView: React.FC<PermissionTreeViewProps> = ({
  selectedKeys,
  onChange,
  disabled = false,
}) => {
  const handleToggleKey = (key: string) => {
    if (selectedKeys.includes(key)) {
      onChange(selectedKeys.filter((k) => k !== key));
    } else {
      onChange([...selectedKeys, key]);
    }
  };

  const handleToggleNodeBranch = (node: IPermissionTreeNode) => {
    const leafKeys = getNodeLeafKeys(node);
    const isAllChecked = leafKeys.every((k: string) => selectedKeys.includes(k));

    if (isAllChecked) {
      onChange(selectedKeys.filter((k) => !leafKeys.includes(k)));
    } else {
      const set = new Set([...selectedKeys, ...leafKeys]);
      onChange(Array.from(set));
    }
  };

  return (
    <div className="space-y-0.5 pt-2">
      {CRM_PERMISSION_TREE.map((node) => (
        <TreeNodeItem
          key={node.id}
          node={node}
          level={0}
          selectedKeys={selectedKeys}
          onToggleKey={handleToggleKey}
          onToggleNodeBranch={handleToggleNodeBranch}
          disabled={disabled}
        />
      ))}
    </div>
  );
};
