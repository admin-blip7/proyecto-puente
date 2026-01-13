export default function PromoBanners() {
    return (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl bg-gradient-to-br from-pink-600 to-rose-500 p-8 text-white relative overflow-hidden h-64 flex flex-col justify-between group">
                <div className="z-10 relative">
                    <h3 className="text-xl font-bold uppercase mb-1">Fresh and Healthy</h3>
                    <h2 className="text-3xl font-black mb-4 text-yellow-300">VEGETABLES</h2>
                    <span className="bg-white text-rose-600 text-xs font-bold px-2 py-1 rounded inline-block">50% SAVE</span>
                </div>
                <button className="z-10 relative w-max px-4 py-2 bg-rose-900 text-white text-xs font-bold rounded-full hover:bg-rose-800 transition">
                    Shop now
                </button>
                <img
                    alt="Vegetables"
                    className="absolute -bottom-8 -right-8 w-48 h-48 object-cover rounded-full border-4 border-white/20 group-hover:scale-110 transition duration-500"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAL1QinVNN1zbzv_patw2UarvodC9i5W6-2TQjvOD5HF2rVF2Cn9Tp9hJHFzqJyUbHzGHlCt0o-9SJHtsUZqXbaBBR2J6TKiVBC0JAAm42VpHw2Ic6lW8QeGsQy3biuZe9h_YMpeT9CYPTl-bFbj-H3tc7UhiEVZgfYM8TEmk7wPPS0Bxf3b9JE2Bsj05zeteINI-JuUUYlqnLCTSLX7e-pZZlHIcAobKC3sARJ0ps940VapO4xSaqEpWuDo15f_0iQkxArTOJn3i4"
                />
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-blue-100 to-blue-300 text-primary dark:text-gray-900 p-8 relative overflow-hidden h-64 flex flex-col justify-between group">
                <div className="z-10 relative">
                    <p className="text-sm font-semibold mb-1">SAMSUNG</p>
                    <h2 className="text-2xl font-bold mb-1">Galaxy S24 FE</h2>
                    <p className="text-sm">Galaxy AI is here</p>
                </div>
                <button className="z-10 relative w-max px-4 py-2 bg-primary text-white text-xs font-bold rounded-full hover:bg-opacity-90 transition">
                    Shop now
                </button>
                <div className="absolute bottom-0 right-4 flex gap-[-10px]">
                    <img
                        alt="Phone Back"
                        className="w-24 object-contain transform rotate-12 translate-x-4 z-0 opacity-80"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDpUSiv4b4XeAgE4hwhaczrQnsCTuOcb9bld3ivDqHuSnQ0SEMHIj4b-PLKkKBLjrb1SsS_4FARPKy5sWQXB0MYvr1rI6bw9O3A-EYedg7U33dlbK4P9b7QkfpifE3hpmVTvB0hf4yAhidWM0xabCPf2ZeDMX8GNcv4M0RlNwrHdN9xAROgyKdKRSgLonrpkdpiOT5RLj16fuwZaxPiMLxJae6ZU96ow7wOGPCoS-qiav2OADpaSmQGSbjq0c-RbzTaN2iw_PoTFA8"
                    />
                    <img
                        alt="Phone Front"
                        className="w-28 object-contain transform z-10"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCOCYDMLbGWf9UaaC--Rvb6ytxRw5E5e4jybkqGwU122DDsuFn5jRBAnDKKY1q9EyFJp2V42wJ0ISNrU4TorgJ3DFiZSr2aFY-3dF4oxy7VeFtOZFzFOj_6Nn_TYoal3jQjRPs9zyGouBSN6Gov9ergsTZ26oYRMHfKn3NJTy1XoHWiyCQIBWRIf_phbcVEnuF6OuW0zsnRalR2rwT5CENlNbiLJNUDhfezxSNNGeUTKzqSwgPdgQHrak_tNIo2oLyDsICLEDDT7WY"
                    />
                </div>
            </div>

            <div className="rounded-2xl bg-red-600 p-8 text-white relative overflow-hidden h-64 flex flex-col justify-between group">
                <div className="z-10 relative">
                    <div className="bg-yellow-400 text-red-900 font-bold px-3 py-1 inline-block rounded-full mb-2 text-sm transform -rotate-2">
                        عرض ايموكس
                    </div>
                    <p className="text-lg text-right" style={{ direction: 'rtl' }}>قبل نفاذ المخزون</p>
                    <p className="text-sm text-right opacity-90" style={{ direction: 'rtl' }}>العرض متاح حتى فبراير</p>
                </div>
                <button className="z-10 relative w-max px-4 py-2 bg-yellow-400 text-red-900 text-xs font-bold rounded-full hover:bg-yellow-300 transition mt-auto">
                    Shop now
                </button>
                <img
                    alt="Skin Care Products"
                    className="absolute bottom-0 right-0 w-40 object-contain group-hover:scale-105 transition duration-500"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAST6gyiVtWD4dOs4sUv-3__PEG-v4PMYAfDOgP8UOuCHATEMcxLEgPbxBq_ur0G7T9_gqIYrrzyU93U_sG4Q2mLktRNsrwuiwrI6ON38AfQQGNxce7kHSQ_P4K2dxsIbqPCx0Z-ekFzRYknHD78GK3Hf8ZxaTh40u24pVr9dC9fLUmfkKe7vfsCQxXznsgBuw62rKeMI_CKwkiPMgKcjD0M0nIv2g6uM03fu5xhUyv4jBqKZujUiGCE7DMHTC403lSdcZVVnxkgfQ"
                />
            </div>
        </section>
    );
}
