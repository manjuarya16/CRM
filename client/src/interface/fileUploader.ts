export interface ImageUploaderProps {
  onImageUpload: (file: File, preview: string) => void;
  label?: string;
  error?: string;
  preview?: string;
  maxSize?: number; // in MB
  accept?: string;
  onUpload?: (file: File) => Promise<any> | void;
  centered?: boolean;
  previewSize?: number; // in px
  required?: boolean;
}

export interface FileType extends File {
  preview?: string;
  formattedSize?: string;
}

export type ChildrenProps = {
  icon?: string;
  text?: string;
  textClass?: string;
  extraText?: string;
};

export interface FileUploaderProps extends ChildrenProps {
  onFileUpload?: (files: FileType[]) => void;
  showPreview?: boolean;
  accept?: any;
  maxFiles?: number;
  initialPreview?: string;
  previewClass?: string;
}
