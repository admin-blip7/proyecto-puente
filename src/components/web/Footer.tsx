import Image from 'next/image';
import {
    Facebook,
    Globe,
    Instagram,
    Music2,
    Twitter,
    X,
    type LucideIcon,
} from 'lucide-react';
import PublicPreferencesControl from '@/components/preferences/PublicPreferencesControl';

type FooterColumn = {
    title: string;
    links: string[];
};

type SocialLink = {
    label: string;
    href: string;
    icon: LucideIcon;
};

const footerColumns: FooterColumn[] = [
    {
        title: 'Company',
        links: ['Our Story', 'Contact', 'FAQs', 'Blog', 'Find a Store'],
    },
    {
        title: 'Collection',
        links: ['Shipping', 'Returns & Refunds', 'Warranty', 'Track Order', 'Secure Payments'],
    },
    {
        title: 'Shop',
        links: ['New & Exclusive', 'Headphones', 'Speakers', 'Home Theater', 'Portable PA', 'Earbuds'],
    },
    {
        title: 'Theme Features',
        links: ['Gift Card', 'Product Compare', 'Color Swatch', 'Flash Sale', 'Coming Soon', 'Out Of Stock'],
    },
];

const socialLinks: SocialLink[] = [
    { label: 'Facebook', href: '#', icon: Facebook },
    { label: 'X', href: '#', icon: Twitter },
    { label: 'Instagram', href: '#', icon: Instagram },
    { label: 'TikTok', href: '#', icon: Music2 },
    { label: 'Pinterest', href: '#', icon: Globe },
];

const paymentLogos = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAe1X4U7Nf3CKiSXZ_Xj8gkDreobUNVHOfv-9jQc9M8cMu8Xg_WrxQ63gAfMEtpqjU1ZUaXfM9-t44hVz3hL2ZaK3557_o6WPWxQSp3yR8c0N1bgLX9Hz1OwBJRkXc8DEQHFXponSsD6V8mBbl1RhCfmQPROyJYLk68DlNEDMlHZdTNgsbN4WZ4FnfuM6-f-k08To6Ue1KwNs0lu4Yr61Sj1-CA2F6cwNy7f2bEJ_5zNtGBz-LMOE0-EQsupH5YlFNuu2ueNxgg-xox',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuA9yHA2ihOCAmrnYB4XQq58WLB7tkVuGgwnrv940mBzUc5k9BC0EZzDh_tFNQXtKXJUENFYgL4IovWbdEJ8hjEP7pw_2VuR_m0OO1PQAJeesHfq8yzD8nh_DE47dduU0uIWeckwsXq5NCoEPt5VHdVmaSkP-6QyoRLSy81uqkXMZOvINrZQPNiBrk_Lv8pHFDVvNR1fGnzfhdjwaEAq6xH0Q5-pGoy3ApckN49ewzpE_9EyPtg_vJOQrBaeL-e4QWcvDjMvgzxeX7Vr',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDpuVbw6veiw1TSiQWszz2wXZmmQ6K-hYgbP_liDVI5DhFwo6-viUT9x637pQK_k7h1vBpsJErgBETMNROHGqYNJVNDeV3Nlv32g7Jam-pBooKuPzm5Ez_0R8cYrDAwMZtx78l15VXYPlWltZqmzLK_eDgQHxLv-5VJwZRSTrb6V9yj7ReVl8u7klwt-3pIG0wz5C8D-P4AaMtbzInKTzTlp2uaBHGWSOvTj5aEAMlsHkVRyuXKInBUtbqBcGnRWYKEUmbfgyUri2zD',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuC_Sp2uP-lntfqe1UP_C4_ewjs859QQ1CW-bhKGLp16H50M2Lu_xNS1r3zMEzq6bNqz9cN9Oatg1-PRb36pTR0mA3URDMu-oacmEX-E0k5OuRLNdmXofoZBiPBrj0EyGe6Gl00Qo8Fh6RRR-mqgAcDt3Nevk2ozy9nkgjrWyyfFfwF9pgRCJpFNB1nM8HDVLvlHLCxzFZ9vnd7xvkG_siaDbOD3ijWl22rAeQBjt8xYFnQcMzxxNjJIEeXfY2eUtkkI9iaehb_HEKNW',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDVxL2DWqODbIF3QjRc37clSSJroO37b4zsln1BNV1ECF6cnkbO6pPaN_BR2ykyUBbhcaRusBaPtdYdt2awx-S2PzQo4utxGdCEHwwjLOBIgPtVc4JW4Tji87UKTtpMCMgvUxegouYWy22xPuCGqaWLTZ2ZiBqT2ykXkawVxbJuTTx477HpHV4T36ViZzKxmFNMmnXkkKI4_InLpn5Wc-3aPkhphzmzfH6JOIo8hyF0xBfb8vR4V93RTBTO6ac9sCcLRq5__xAuDD4V',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBInXpUffnce7DmoKj8GfkbymSINAw5RgbaOhCxdgkk9ysCM2wOcck119ryM9G2SU4BSZ-jT6GnPK5w9H_O7ruoO_j86sCq8EqmRK7bBKpuPoc5A74AWgQhEfaraYBqRCgLs_nb3j5NM56cAldL5aTDhzHFhSKiqXHsNGfI-UCa-vIp1MzX1nBOWnFTSNieb7qKAVPlV2_-0eUVtuWUQgUJxU0kkCxkb51J8XzRTxCzdpmTiRzMAtZFBjltuD2dBhog5cD3bj5IChz1',
];

export default function Footer() {
    return (
        <footer className="relative overflow-hidden border-t border-slate-200 dark:border-slate-800 bg-background-light dark:bg-background-dark pb-10 pt-20 text-slate-900 dark:text-white transition-colors duration-300">
            <div className="absolute right-0 top-10 z-20 hidden xl:flex">
                <button
                    type="button"
                    className="flex gap-2 rounded-l-lg bg-orange-500 px-2 py-6 font-bold text-white shadow-lg transition-colors hover:brightness-95"
                >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs text-orange-500">4</span>
                    <span style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>Special Offers</span>
                    <X className="size-4 rotate-90" />
                </button>
            </div>

            <div className="mx-auto max-w-[1600px] px-6">
                <div className="mb-20 flex flex-col gap-16 xl:flex-row">
                    <div className="w-full xl:w-1/3">
                        <div className="relative flex h-full min-h-[300px] flex-col justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-secondary to-slate-900 p-8">
                            <div className="absolute right-0 top-0 h-full w-2/3">
                                <Image
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCvmvd46xcyKK2yJvnit4x-dTwIOqvJtB27j5e7bcxCnUUNd4xczeOAqa_yfT1BolGRc5mwyPVg86QRlIFiZMbJs9rNoxFlcRtyPYWX2s6-lqbcH0CV2ayth7NU7bHKTwGYJAKklYl03-Jhdl8Zj0VEmDxbPIrf7WYq-y_kU73gdVWfAKO9n8sJWKn83Sds9r3sc-XAJzIuDiloIpOkix7Ca0wRxkFQK9C95a2U18DjLQjPdFzLN3ObK_yjAHUswQMDz7MsBMZUXzwa"
                                    alt="Laptop lifestyle"
                                    fill
                                    sizes="(min-width: 1280px) 20vw, 60vw"
                                    className="object-cover opacity-30 mix-blend-overlay"
                                    style={{
                                        maskImage: 'linear-gradient(to right, transparent, black)',
                                        WebkitMaskImage: 'linear-gradient(to right, transparent, black)',
                                    }}
                                />
                            </div>
                            <div className="relative z-10 max-w-xs">
                                <h3 className="mb-2 text-3xl font-bold text-white">
                                    Join Our <br /> Membership
                                </h3>
                                <p className="mb-8 text-sm leading-relaxed text-white/80">
                                    Unlock Exclusive Perks, Early Access And Member-Only Savings.
                                </p>
                                <button
                                    type="button"
                                    className="rounded-full bg-primary px-8 py-3 font-bold text-secondary transition-colors hover:bg-white"
                                >
                                    Join Now
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid w-full grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 xl:w-2/3">
                        {footerColumns.map((column) => (
                            <div key={column.title}>
                                <h4 className="mb-6 text-lg font-bold text-slate-900 dark:text-white">{column.title}</h4>
                                <ul className="space-y-4 text-sm text-slate-500 dark:text-slate-400">
                                    {column.links.map((link) => (
                                        <li key={`${column.title}-${link}`}>
                                            <a href="#" className="transition-colors hover:text-slate-900 dark:hover:text-white">
                                                {link}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mb-10 border-t border-slate-200 dark:border-slate-800" />

                <div className="flex flex-col items-center justify-between gap-8 lg:flex-row">
                    <div className="order-2 flex gap-4 lg:order-1">
                        {socialLinks.map((social) => {
                            const Icon = social.icon;
                            return (
                                <a
                                    key={social.label}
                                    href={social.href}
                                    aria-label={social.label}
                                    className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors hover:bg-primary hover:text-secondary hover:border-primary"
                                >
                                    <Icon className="size-4" />
                                </a>
                            );
                        })}
                    </div>

                    <div className="order-3 flex flex-col items-center text-center text-sm text-slate-500 dark:text-slate-400 lg:order-2 lg:items-end lg:text-right">
                        <div className="mb-2 flex items-center justify-center gap-2 lg:justify-end">
                            <span className="flex items-center gap-2 transition-colors hover:text-slate-900 dark:hover:text-white">
                                <Image
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDxqq_4ScMZlaOL5KHfVH4IyofSXOm1hg9Seqo3kQAPRYuPSWQn1G4XDwPFsGbXmP6X0kgo1n8-BJqTtacSBwZjcNW5Swb4Bm9U1-REcOqkRbOqLzKDVAz4Bd01I5CAwhmTjzlKe3oL0oNFxMOteNjFgCC57LJkRiT0aPOaNBTtYfk0lIgeCyUTgKypUz16vsSgIw1cAgBmH1sRWvPVtUNC4C9x4Wir3I1EVViKj9ciq28YqlnmTC1uTMCae5CaoVoFXK0Jam80CB_2"
                                    alt="United States"
                                    width={20}
                                    height={14}
                                    className="rounded-sm object-cover"
                                    style={{ height: 'auto' }}
                                />
                                Global Preferences
                            </span>
                            <PublicPreferencesControl />
                        </div>

                        <div className="mb-2 flex items-center gap-2">
                            {paymentLogos.map((logo, index) => (
                                <span
                                    key={`payment-${index + 1}`}
                                    className="flex h-6 w-10 items-center justify-center rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1 py-0.5"
                                >
                                    <Image src={logo} alt={`Payment method ${index + 1}`} width={32} height={16} className="h-full w-auto object-contain" />
                                </span>
                            ))}
                        </div>

                        <div className="mt-4 flex flex-wrap justify-center gap-4 lg:justify-end">
                            <a href="#" className="transition-colors hover:text-slate-900 dark:hover:text-white">
                                Terms of Service
                            </a>
                            <a href="#" className="transition-colors hover:text-slate-900 dark:hover:text-white">
                                Privacy Policy
                            </a>
                        </div>
                    </div>

                    <div className="order-1 lg:order-3 lg:hidden" />
                </div>
            </div>
        </footer>
    );
}
