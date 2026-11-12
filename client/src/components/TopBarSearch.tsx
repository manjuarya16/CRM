import { useRef, useState } from "react"
import { ModalLayout } from "./HeadlessUI"

const TopBarSearch = () => {

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [query, setQuery] = useState<string>("")

  const handleModal = () => {
    setIsModalOpen(!isModalOpen);
  }

  const ref: React.RefObject<HTMLDivElement> = useRef(null);

  if (isModalOpen) {
    ref.current?.children[0].classList.remove('hidden')
    ref.current?.children[0].classList.add('show')
  }

  return (
    <>
      <button type="button" className="nav-link p-2 me-auto" onClick={handleModal}>
        <span className="sr-only">Search</span>
        <span className="flex items-center justify-center h-6 w-6">
          <i className="mgc_search_line text-2xl"></i>
        </span>
      </button>

      <ModalLayout
        showModal={isModalOpen}
        toggleModal={handleModal}
        panelClassName="min-w-[512px] mt-8 card"
        placement='justify-center items-start'
      >
        <div className="opacity-100 transition-all sm:max-w-lg sm:w-full sm:mx-auto">
          <div className="mx-auto max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl transition-all dark:bg-slate-800">
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute top-3.5 start-4 text-gray-900 text-opacity-40 dark:text-gray-200">
                <i className="mgc_search_line text-xl"></i>
              </div>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-12 w-full border-0 bg-transparent ps-11 pe-10 text-gray-900 placeholder-gray-500 dark:placeholder-gray-300 dark:text-gray-200 focus:ring-0 sm:text-sm [&::-webkit-search-cancel-button]:appearance-none"
                placeholder="Search..."
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  title="Clear search"
                  className="absolute end-3 flex items-center justify-center w-6 h-6 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  <i className="mgc_close_line text-base"></i>
                </button>
              )}
            </div>
          </div>
        </div>
      </ModalLayout>

    </>
  )
}

export default TopBarSearch
