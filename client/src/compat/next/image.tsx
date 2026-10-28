import React from "react";

export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt?: string;
  width?: number | string;
  height?: number | string;
  priority?: boolean;
  fill?: boolean;
  quality?: number;
  unoptimized?: boolean;
}

const Image = React.forwardRef<HTMLImageElement, ImageProps>(
  ({ src, alt = "", width, height, className, priority, fill, ...props }, ref) => {
    const style: React.CSSProperties = {
      ...(fill
        ? {
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }
        : {}),
      ...props.style,
    };

    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        style={style}
        loading={priority ? "eager" : "lazy"}
        {...props}
      />
    );
  }
);

Image.displayName = "NextImageCompat";

export default Image;
export { Image };
