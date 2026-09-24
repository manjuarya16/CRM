export interface LayoutState {
  layoutTheme: string;
  layoutDirection: string;
  layoutWidth: string;
  topBarTheme: string;
  sideBarTheme: string;
  sideBarType: string;
  layoutPosition: string;
  showSideBarUserInfo: boolean;
  isOpenRightSideBar: boolean;

  // Actions
  changeLayoutTheme: (theme: string) => void;
  changeLayoutDirection: (direction: string) => void;
  changeLayoutWidth: (width: string) => void;
  changeTopBarTheme: (theme: string) => void;
  changeSideBarTheme: (theme: string) => void;
  changeSideBarType: (type: string) => void;
  changeLayoutPosition: (position: string) => void;
  showRightSidebar: () => void;
  hideRightSidebar: () => void;
}
