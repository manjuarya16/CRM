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
