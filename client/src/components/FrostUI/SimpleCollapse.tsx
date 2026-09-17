import {
  ElementType,
  FC,
  RefObject,
  useRef,
  useLayoutEffect,
  useState,
  useEffect,
} from "react";

interface CollapseProps {
  open: boolean;
  children: any;
  classNames?: string;
  as?: ElementType;
}

const SimpleCollapse: FC<CollapseProps> = ({
  open,
  children,
  classNames,
  as: tag = "div",
}) => {
  const ref = useRef<HTMLElement | null>(null);
  const [measuredHeight, setMeasuredHeight] = useState<number>(0);
  const Tag: any = tag;

  useLayoutEffect(() => {
    if (ref.current) {
      setMeasuredHeight(ref.current.scrollHeight);
    }
  }, [open, children]);

  useEffect(() => {
    const onResize = () => {
      if (ref.current && open) setMeasuredHeight(ref.current.scrollHeight);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, children]);

  return (
    <Tag
      ref={ref as any}
      className={`transition-all overflow-hidden ${classNames ? classNames : ""}`}
      style={{ height: open ? `${measuredHeight}px` : 0 }}
    >
      {children}
    </Tag>
  );
};

export default SimpleCollapse;
