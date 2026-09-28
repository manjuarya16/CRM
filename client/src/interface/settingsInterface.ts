export interface SettingItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  url: string;
  badge?: string;
  category?: string;
}

export interface SettingCategory {
  id: string;
  title: string;
  subtitle: string;
  items: SettingItem[];
  gridCols?: string;
}

export interface ConfigNavItem {
  id: string;
  key: string;
  title: string;
  icon: string;
  subItems?: { id: string; key: string; title: string }[];
}

export interface ConfigState {
  configs: Record<string, any>;
  loading: boolean;
  fetchConfigs: () => Promise<Record<string, any>>;
  saveConfigurations: (settings: Record<string, any>) => Promise<any>;
  uploadConfigImage: (file: File) => Promise<any>;
  testSmtpConnection: (testConfig?: Record<string, any>) => Promise<any>;
  setConfigs: (configs: Record<string, any>) => void;
}
