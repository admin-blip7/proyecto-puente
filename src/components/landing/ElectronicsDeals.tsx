import Link from 'next/link';
import { ChevronRight, Heart } from 'lucide-react';

export default function ElectronicsDeals() {
    const deals = [
        {
            name: "Samsung Smart TV, Crystal UHD",
            price: "409.75",
            oldPrice: "680.37",
            img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAZfif-6Gi3PDQu1jfe3Vf6keAZAeKNiojh1vhMZvIXSTfQEbyLJfnwTdyQLuYvQkVgvcb_fc_NU8jGIXrSuE-kaGwn7RzEmh-XxN3aIxdj-qrw9DLHG1gsQZwy16K3tkoLLxHR1Z_v5K8MIqLiUUVbSh13v9gNOfX8AKMiVcuymdMtc56B1m2DsO-HntGHeMMmhN11oHMqwkotcHhX8eP5VxSRVFliXG27eZCJPICb6UL31UNuAYURXB33FeP-hgK-_L_sH2itEOM"
        },
        {
            name: "Apple iPhone 16 Pro Max",
            price: "1747.06",
            oldPrice: null,
            img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBolfl716sTw0aHICYoc4z31ATXgjv9ADPzy4nzTHZGhoPh_SaLunlMPd00N1SNGkW3dJAgjQguGvrQxH244JwubdjMXBxx2S8hYz9LwOMroaWIjotPCFBd_ZymCtUFHfz63ltnMcLPh76MHW2oqDKY-1r7AkaQId_P-eeReKS5D3BAdBqQ8oeBLPH0Re9bmXsnYjShzSeC-dqq6q4rAsVt_BmhqBk4g8hytqvtKLHRPpRG90RXR1cjmGpJxxntexMOKrZwN2KsEVk"
        },
        {
            name: "HUAWEI FreeClip, Ground breaking",
            price: "135.58",
            oldPrice: "190.31",
            img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCpjM4F_v9HO82EI4E7Yw5yZwhE8dKgJ_XXq2XCBR5WYed72df2o4jCnHo2utgorjmYGAQGKBo1kNNVIg7KVwUbsYaBDFgP1BY7rWhfB_DvlU9ev2uVgng76T1oMPS457Du4JvsmnP50VtEu5mes_tQ_Mg72u-g8c64z7oyrtQQ48XKlV6MvrWqTiMFE_cR63qk1ZNvPLrFhre0ND0JgDqEPzBWlY6EHg9WMlSfuI8mjn2NWJ8LdKVN_WDhzEF9jjNQuqo802o9NvY"
        },
        {
            name: "Apple MacBook Air A1466",
            price: "500.00",
            oldPrice: null,
            img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAY1r7qGy5lap5h17AW639emFaeNsbl4K5W13xiVeNxzjf3ZwyCbT8rV8FEE1CYUcNZ4XR-fihzFZXmydCvEvUOG9pfYnbLIkfT-gOqSHu0W0uv8SPVvxnUZXlD_y7HndpX_pOXskKnaho9maQWSO5LSwKdkcA1KcJN5ITgBoxsDU0qli52xHf1HUo8vL8FeFJGUHGb17fbdk6NP1rfD1jW5fpWG9SZZlwPgxhLU9nTOP957Vft8o3RPbbdda0yHvrRgceqcXYOZys"
        },
        {
            name: "SanDisk 2Tb Extreme Portable SSD",
            price: "132.05",
            oldPrice: "138.85",
            img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBpRUu9mxreG8tsUJBohhrn6H6t3yGweEEJNMbeWZeJQvBnv8jcck54NQW0x4B8gwFcSMxX7wRrSXptUAeHJdqOFOnkN9xQzOp1iGE65Ie6ihlIisEIiPsU1sxWMQKbBWHb0fEe_Kfp_Mzdj1mvZA4RkI5vCOtslUKXnV3-f-SfVaodEnRJMm2a5lmriIjFwynaQV8kNPb8DURqt1xmzHDtGjb5-yD0-F-SwNigwmkAD2t22hL8LagdnLe52MPNvZJxKnJ-Hz2Q40I"
        }
    ];

    return (
        <section>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-text-light dark:text-text-dark">Top Deals In Electronics</h3>
                <Link href="#" className="text-sm text-secondary font-medium hover:underline flex items-center">
                    View All <ChevronRight className="w-4 h-4" />
                </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {deals.map((deal, idx) => (
                    <div key={idx} className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:shadow-lg transition group">
                        <div className="relative mb-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 h-48 flex items-center justify-center">
                            <button className="absolute top-2 right-2 text-gray-400 hover:text-red-500">
                                <Heart className="w-5 h-5" />
                            </button>
                            <img
                                alt={deal.name}
                                className="h-full object-contain mix-blend-multiply dark:mix-blend-normal group-hover:scale-105 transition"
                                src={deal.img}
                            />
                        </div>
                        <h4 className="font-medium text-sm mb-1 truncate">{deal.name}</h4>
                        <div className="flex items-baseline gap-2">
                            <span className="font-bold text-lg">{deal.price} <span className="text-xs">AED</span></span>
                            {deal.oldPrice && <span className="text-xs text-gray-400 line-through">{deal.oldPrice} AED</span>}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
