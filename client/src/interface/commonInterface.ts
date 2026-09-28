import { ReactNode, InputHTMLAttributes } from "react";

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


export interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  bgColor: string;
  trend?: string;
  isUp?: boolean;
}

export interface NavItem {
  id: string;
  title: string;
  icon: string;
  badge?: string;
  desc?: string;
}

export interface FlatpickrProps {
  className?: string;
  value?: Date | [Date, Date] | Date[] | string;
  options?: any;
  placeholder?: string;
  onChange?: (date: any) => void;
}

export interface PasswordInputProps {
  name: string;
  placeholder?: string;
  refCallback?: any;
  errors: any;
  control?: any;
  register?: any;
  className?: string;
}

export interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  type?: string;
  name: string;
  placeholder?: string;
  register?: any;
  errors?: any;
  control?: any;
  className?: string;
  labelClassName?: string;
  containerClass?: string;
  refCallback?: any;
  action?: ReactNode;
  rows?: string | number;
}

export interface StateItem {
  id: number;
  name: string;
  country_id?: number;
}

export interface CityItem {
  id: number;
  name: string;
  state_id: number;
}

export interface CommonState {
  states: StateItem[];
  cities: CityItem[];
  loading: boolean;
  fetchStates: () => Promise<StateItem[]>;
  fetchCities: (stateId: number | string) => Promise<CityItem[]>;
  fetchStateCities: () => Promise<{ states: StateItem[]; cities: CityItem[] }>;
}
