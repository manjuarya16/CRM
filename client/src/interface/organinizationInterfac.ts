import type React from "react";

export interface EditField {
  label: string;
  key: string;
  type:
    | "text"
    | "email"
    | "number"
    | "date"
    | "textarea"
    | "dropdown"
    | "radio"
    | "checkbox"
    | "file"
    | "url"
    | "tel";
  order: number;
  className?: string;
  options?: { label: string; value: string }[];
  required?: boolean;
  placeholder?: string;
}

export interface FormFieldProps {
  field: EditField;
  value: any;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => void;
  error?: string;
}

export interface OrganizationState {
  organization: any;
  loading: boolean;
  error: any;

  getOrganization: () => Promise<void>;
  updateOrganization: (id: string, data: any) => Promise<any>;
}
