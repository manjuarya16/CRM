import React from "react";
import { Link as RouterLink, LinkProps as RouterLinkProps } from "react-router-dom";

export interface LinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href?: string;
  to?: string;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  passHref?: boolean;
  prefetch?: boolean;
  locale?: string | false;
  legacyBehavior?: boolean;
  children?: React.ReactNode;
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ href, to, children, ...props }, ref) => {
    const target = to || href || "#";
    
    // Check if target is an external link
    if (typeof target === "string" && (target.startsWith("http://") || target.startsWith("https://") || target.startsWith("mailto:") || target.startsWith("tel:"))) {
      return (
        <a ref={ref} href={target} {...props}>
          {children}
        </a>
      );
    }

    return (
      <RouterLink ref={ref} to={target} {...(props as any)}>
        {children}
      </RouterLink>
    );
  }
);

Link.displayName = "NextLinkCompat";

export default Link;
export { Link };
