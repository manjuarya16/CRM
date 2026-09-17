export type ProfileMenuItem = {
  label: string;
  icon: string;
  redirectTo: string;
};

export interface ProfileDropDownProps {
  menuItems: Array<ProfileMenuItem>;
  profiliePic?: string;
  profile_img?: string | null;
}
