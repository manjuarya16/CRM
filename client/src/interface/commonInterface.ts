import { ReactNode, useEffect } from "react";

export interface PageTitleProps {
  breadCrumbItems?: string[];
  title: string;
  name?: string;
  children?: ReactNode;
}
