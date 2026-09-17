export interface LeftSideBarProps {
  isCondensed: boolean;
  isLight?: boolean;
  hideLogo?: boolean;
}

export interface NotificationItem {
  id: number;
  text: string;
  subText: string;
  icon?: string;
  avatar?: string;
  bgColor?: string;
  createdAt: Date;
}

export type ProfileMenuItem = {
  label: string;
  icon: string;
  redirectTo: string;
};

export interface NotificationDropDownProps {
  notifications: Array<NotificationItem>;
}
