import { create } from 'zustand';
import {
  LayoutTheme,
  LayoutDirection,
  LayoutWidth,
  SideBarType,
  SideBarTheme,
  TopBarTheme,
  LayoutPosition,
} from '../constants/layout';
import { getLayoutConfigs } from '../utils/layout';

interface LayoutState {
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

const getInitialState = () => {
  const urlSearchParams = new URLSearchParams(window.location.search);
  const params = Object.fromEntries(urlSearchParams.entries());
  return {
    layoutTheme: params['layout_theme'] === 'dark' ? LayoutTheme.THEME_DARK : LayoutTheme.THEME_LIGHT,
    layoutDirection: LayoutDirection.LEFT_TO_RIGHT,
    layoutWidth: LayoutWidth.LAYOUT_WIDTH_FLUID,
    topBarTheme: TopBarTheme.TOPBAR_LIGHT,
    sideBarTheme: SideBarTheme.LEFT_SIDEBAR_THEME_LIGHT,
    sideBarType: SideBarType.LEFT_SIDEBAR_TYPE_DEFAULT,
    layoutPosition: LayoutPosition.POSITION_FIXED,
    showSideBarUserInfo: false,
    isOpenRightSideBar: false,
  };
};

export const useLayoutStore = create<LayoutState>((set) => ({
  ...getInitialState(),

  changeLayoutTheme: (theme: string) => {
    set({ layoutTheme: theme });
  },

  changeLayoutDirection: (direction: string) => {
    set({ layoutDirection: direction });
  },

  changeLayoutWidth: (width: string) => {
    const layoutConfig = getLayoutConfigs(width);
    set({
      layoutWidth: width,
      ...layoutConfig,
    });
  },

  changeTopBarTheme: (theme: string) => {
    set({ topBarTheme: theme });
  },

  changeSideBarTheme: (theme: string) => {
    set({ sideBarTheme: theme });
  },

  changeSideBarType: (type: string) => {
    set({ sideBarType: type });
  },

  changeLayoutPosition: (position: string) => {
    set({ layoutPosition: position });
  },

  showRightSidebar: () => {
    set({ isOpenRightSideBar: true });
  },

  hideRightSidebar: () => {
    set({ isOpenRightSideBar: false });
  },
}));
