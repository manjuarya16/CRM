export type { ProfileMenuItem } from "./profileInterface";

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

export interface NotificationDropDownProps {
  notifications: Array<NotificationItem>;
}
