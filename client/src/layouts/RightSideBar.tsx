import { ScrollToTop, ThemeCustomizer } from "../components";
import { useLayoutStore } from "../store";
import { OffcanvasLayout } from "../components/HeadlessUI";

const RightSideBar = () => {
  const { isOpenRightSideBar, showRightSidebar, hideRightSidebar } =
    useLayoutStore();

  /**
   * Toggles the right sidebar
   */
  const handleRightSideBar = () => {
    if (isOpenRightSideBar) {
      hideRightSidebar();
    } else if (!isOpenRightSideBar) {
      showRightSidebar();
    }
  };

  return (
    <>
      <ScrollToTop />

      <OffcanvasLayout
        open={isOpenRightSideBar}
        toggleOffcanvas={handleRightSideBar}
        sizeClassName="w-96 max-w-sm"
      >
        <ThemeCustomizer handleRightSideBar={handleRightSideBar} />
      </OffcanvasLayout>
    </>
  );
};

export default RightSideBar;
