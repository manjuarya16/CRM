import { ITag } from "./settingsSubmodulesInterface";
export type { ITag };

export interface TagPickerProps {
  selectedTagIds: number[];
  onChange: (tagIds: number[]) => void;
  disabled?: boolean;
}
