import { ReactNode } from "react";

export interface PageTitleProps {
  breadCrumbItems?: string[];
  title: string;
  name?: string;
  children?: ReactNode;
}

export type Option = { label: string; value: string };

export interface EditField {
  label: string;
  key: string;
  type: string;
  order?: number;
  className?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: Option[];
}

export interface FormFieldProps {
  field: EditField;
  value: any;
  onChange: (e: any) => void;
  error?: string | null;
}
