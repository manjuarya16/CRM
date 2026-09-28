export interface ITag {
  id: number;
  name: string;
  color?: string;
}

export interface TagPickerProps {
  selectedTagIds: number[];
  onChange: (tagIds: number[]) => void;
  disabled?: boolean;
}
