export interface BranchState {
  branch: any;
  branches: any[];
  mainBranch: any;
  loading: boolean;
  error: any;

  getBranch: () => Promise<void>;
  getBranches: () => Promise<void>;
  getMainBranch: () => Promise<void>;
  createBranch: (data: any) => Promise<any>;
  updateBranch: (id: string, data: any) => Promise<any>;
  deleteBranch: (id: string) => Promise<any>;
}

export interface BranchFormDataAdd {
  branch_id?: number;
  name: string;
  code: string;
  location: string;
  is_main: boolean;
  created_by: number;
}
export interface BranchFormDataEdit {
  id: string;
  name: string;
  code: string;
  location: string;
  is_main: boolean;
  status: boolean;
  updated_by: number;
}

// Add optional address and organization fields used throughout forms
export interface BranchFormDataEdit {
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  address_id?: string | number | null;
}

// Additional types used by edit form components
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

// Extend editable form data with optional address fields used by UI
export interface BranchFormDataEditExtended extends BranchFormDataEdit {
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  address_id?: string | number | null;
}
