import { useEffect, useState } from 'react'

const ScrollToTop = () => {

  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  const handleScroll = () => {
    if (window.pageYOffset > 200) {
      setShowScrollTop(true)
    }
    else if (window.pageYOffset <= 200) {
      setShowScrollTop(false)
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <>
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className='fixed h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full z-30 bottom-5 end-4 sm:bottom-8 sm:end-8 p-2 bg-primary hover:bg-primary/90 active:scale-95 cursor-pointer shadow-lg text-white transition-all'
          title="Scroll to top"
        >
          <i className="mgc_arrow_up_line text-lg"></i>
        </button>
      )}
    </>
  )
}

export default ScrollToTop