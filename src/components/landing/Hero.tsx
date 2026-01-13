export default function Hero() {
    return (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 relative h-[400px] rounded-2xl overflow-hidden bg-gradient-to-r from-[#1c2e4a] to-[#2563eb] text-white flex flex-col justify-center px-10 shadow-lg">
                <div className="z-10 max-w-md space-y-4">
                    <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium tracking-wide">
                        NEW ARRIVAL
                    </span>
                    <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                        iPhone 16 Pro Max <br />
                        From $50,769*
                    </h2>
                    <p className="text-gray-200 text-sm md:text-base">
                        A18 chip. Superfast. Supersmart.<br />
                        History's Biggest Price Drop.
                    </p>
                    <button className="mt-4 px-6 py-3 bg-white text-primary font-bold rounded-full hover:bg-gray-100 transition shadow-lg transform hover:-translate-y-1">
                        Shop Now
                    </button>
                    <p className="text-[10px] text-gray-300 mt-4">*Incl. All Offers</p>
                </div>
                <div className="absolute right-0 bottom-0 top-0 w-1/2 flex items-center justify-center">
                    <img
                        alt="Latest iPhone Model"
                        className="h-[90%] object-contain drop-shadow-2xl transform translate-x-10 translate-y-10 rotate-[-10deg]"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDzQQLlKbd7Kewjpx_NlnllhoFTzpFqzP8IEyf52XeYmi27OVJABY46iLbB7S5xexpjWOaeawJYEoWIKEtBghuHsvOnkYLhiUWm1U1Yo2qKE4fu3XQhZgo89oauD8D4BeNBdwzbwLBfCmUqFZxXE-TF56fXhXs5fc9ehQw5rRNsFIiaKikE1MREAJXxmGIcIfMdztPMPEbsbT04Urrjzl5KqIBqrL9eEzMCLZUHIJkid8C2IJW1IN1XaaGY7so-yLsAYaAfRiKuZTY"
                    />
                </div>
            </div>
            <div className="lg:col-span-1 h-[400px] rounded-2xl overflow-hidden relative bg-gray-100 dark:bg-surface-dark group cursor-pointer shadow-lg">
                <div
                    className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
                    style={{
                        backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDGuCysml0N1sgrsMQpUIx25qFi7Oe6EJU-H81tNnNopZ44uzAgnGEIyHVwBgxpj0eDUuoEh1bGiFv4WgQB97W-K5kM6p2fgiYN9rZ-B8POnteTa_OQ9F3Qg2p2aivIlLzWlPcoLTaZ5bHpkPFL-UvyoFVjoEKN47p75Gpxkc6DMIrbMX18MSGIcTCumdPlLQWDTkzreY1piPePFGlJpQIMGMQV_Lfalw5KoxzFqXlKTREIUlbIdHXfHIWjX3pJLGXcltrgo8Llejw')",
                    }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute top-6 left-6 text-white z-10">
                    <span className="block text-xl font-bold uppercase tracking-wider text-secondary">
                        SALE
                    </span>
                    <span className="block text-sm font-light mb-1">UP TO</span>
                    <span className="block text-6xl font-black leading-none text-white">
                        50<span className="text-3xl align-top">%</span>
                    </span>
                    <span className="block text-xl font-bold text-right mr-2 text-white/80">
                        OFF
                    </span>
                </div>
                <div className="absolute bottom-6 left-6 right-6">
                    <button className="w-full py-2 bg-white/90 backdrop-blur text-black font-semibold rounded-lg hover:bg-white transition">
                        Explore Sale
                    </button>
                </div>
            </div>
        </section>
    );
}
