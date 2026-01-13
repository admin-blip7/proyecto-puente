import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default function AccessoriesGrid() {
    const items = [
        { name: "Laptop", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBKKVr3jXtxDFzZ6gO0Tz5Du9sUpcno6pxnT0ya4Ih3i7HoOgyp6c682qh7xIRxg0hBbP2kOolBWB6LBMx9qY3hIAH50BRyQj6ruhD7VQpdjjY1fpU2aAHwme5gMiMZdcbMPBgJ-W4_z_uS0x7n8-0jIMgENsFyipn_pWdiZ8pwRgohrRvWy3k-2LpWhMAXD548dLp1lK_rKGUkJqCORl-xeQZcLdbdhebHVc4CU-hM1bQu_zyt8i4w6aqIUr5DplTbFBBPlGnZwZs" },
        { name: "Monitor", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCy8W0qtBuc53I04NxJHrXd-aNHVTfFdID2vtWZrhMkN7QBCrOokLmFLwSD-bBdZ6LI18dRwIAYhFOWTP3TjxkdnpEXWkzGWmmJBY61d9a3ujC_iXU3H2_Q0Mbhd1RgHYSWZ6Mutt-Q7SvCSqRee8OdCJnnR70CSD2jzUgHpN5F4BY3lihRTIOS18HodMMXAdBHzteqvJ-85U2-DegZomEPXcpVqrQWXYSYFA4Q4ZVHzlVxhTsulPvO05YFuqwvS-akwB4ptdZjzuU" },
        { name: "MacBooks", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCaBoyj8dkqiH4kdpqEbqEeFPjz3Yxdrbixb-2eQEfBOKbxHqBztt4ORsE2YlMBjLP7CebmMHMTbKGRW0v7mVAPy7qGPdl6hWKje5G_o5weztck4PjaqkCWQAfUeiwmJaySm4YQn3cQXESezhu4NmSVfjuhpQG0CLHlJH0GUsT0_Dkriyhfw8es2rxxzPGNXMTnGi4pmhHI30ATLj2_ACinA8mWi9rFopYjMBat1dEIUkNt6qFidPySLIE8u88vWa63KpQsBtCn5Ks" },
        { name: "Storage Device", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAxJk8tjX1BME4H3Gg-oFLRRYZJ7ZBYNSul9lFIhtcB0P0vOwg7BEqZFMxP813S43pE2QSdirzHN_pYfjQ8LfJBAzHrRtRjraGF0kBEdWQ5z7XAqQELq_xEs5q0RQiBoCrMnlIvvkmdKfbAAsfIMrCvgZ048aMQnaUUtcd3SA6ESfD6tXBLe1F38gYUf1v5m-MGgutqVV5bHq_NB8Ow7EgrokNcl_FoDq-dkX7UgS4Ga4dQhjj9hDftsxjWFBRfkz5wGuOm2cLZQXc" },
        { name: "Printer", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuD2Vsoq1cinT97cOC9kNOmrhuMcDRfxOFEfhcGDBO3sRpOT9kyU1hnSQ4lV33sq97ceqIwTtDlrQy5t1LjC20pHJHseF1Ua9VWxyjjrlPQ-NaZS5_M43-reW7-n-ssgPdxRHZh16CaVrzNqvIsR310XRP7bUjd3RV034zYdGCGnDIczK-9_bkFTU4LDTKgRLsD6HM-ERrAK_hbsPdAGjCmDgpSj72JqShm7EeNI8C8KuRQRrUCXlz96n9ItJvjOC5svn94atadtkaw" }
    ];

    return (
        <section>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-text-light dark:text-text-dark">Laptops & Accessories</h3>
                <Link href="#" className="text-sm text-secondary font-medium hover:underline flex items-center">
                    View All <ChevronRight className="w-4 h-4" />
                </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {items.map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center bg-white dark:bg-surface-dark p-6 rounded-xl hover:shadow-md transition cursor-pointer">
                        <img
                            alt={item.name}
                            className="h-32 object-contain mb-4"
                            src={item.img}
                        />
                        <span className="font-medium text-sm">{item.name}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}
