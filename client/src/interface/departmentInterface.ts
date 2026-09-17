export interface Department {
  id: number;
  name: string;
  organization_id?: number;
  status?: boolean;
}

export interface DepartmentFormDataAdd {
  id?: number;
  name: string;
  organization_id?: number;
}

export interface DepartmentFormDataEdit {
  id?: number;
  name: string;
  organization_id?: number;
}

export interface DepartmentStore {
  departments: Department[];
  loading: boolean;
  error: string | null;
  selectedDepartment: Department | null;

  fetchDepartments: () => Promise<void>;
  fetchDepartmentById: (id: number) => Promise<void>;
  addDepartment: (departmentData: any) => Promise<void>;
  updateDepartment: (id: number, departmentData: any) => Promise<void>;
  deleteDepartment: (id: number) => Promise<void>;

  setSelectedDepartment: (department: Department | null) => void;
  clearError: () => void;
}
