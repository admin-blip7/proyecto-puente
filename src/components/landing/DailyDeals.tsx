import Link from 'next/link';
import { ChevronRight, Heart, Star, StarHalf } from 'lucide-react';

export default function DailyDeals() {
    const deals = [
        {
            name: "Samsung Galaxy S24 Ultra",
            rating: 4,
            reviews: "1.2k",
            price: "999.99",
            oldPrice: null,
            img: "https://lh3.googleusercontent.com/aida-public/AB6AXuC-WA7V643U9xZ1ziBoV_Y4xpP0GZy6rWuJSljwXPS9kQ5uvwWuGSsGTWNqQrddEjjemK4iQ9zA_OfaQOT_aI-5oB8ll_sbWq_aS6dH0RG8CtV8B4nGqCpybTLx3BIkJSBmgyHqbk5df5mv1AlH4aQ-hQLZXJmA5GmhCXgDvaH5DdcljK03UZG42_pNfJJrZhrh-zlIpEkHoD-WdQNoDq3zeSWfqS1VDznTM89jaBI2EPmCKBSenEQns5ng1NGC3w-N19UuyRMKWPU"
        },
        {
            name: "Nike Air Jordan Brooklyn",
            rating: 3,
            reviews: "569",
            price: "45.00",
            oldPrice: null,
            img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCIYWDC-DJFQmLhbd9abx_Mpbzx4cYKJ_SsQIs1SY0zLjRd18qCug-UCkxPt52yW8ZDe_S8h3sXNDzc3gH5x7Gy1Tz3UD4qauwwG2QIGeKZSLwF2-opLO7vH30r8cOmr9GcloFIRpSxIsen5U5JTVmtEQsJZQsAK9S7IVB7hgYTzD5Y9tI1eYiiqkyaJp1R_ble-TM7LFn93LX3aHmcrJG5_rxfdDTmkE31z1g4_K2QWvvw_fTc8U7EMcmvLKxfYvRFquPkI7b2OX8"
        },
        {
            name: "Beanless Bag Inflatable",
            rating: 3,
            reviews: "100",
            price: "32.00",
            oldPrice: "48.00",
            img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAKYXt7_OMIhrk8XPwIjzvTIFATvvp8z8pPeDqBHyR6yexUXqDfUnHB8kl-i8mFc1NyaJYKD2A3eTcvy6nWb-6kzGsWc7X1G6-j87LgpdsIau7Ho5TSHcxfLEpEaEBeVunIcb_GwXr_WOoXYBTS-3zZuxaS3hwErkXjdaeSCWvrTSK_Jb0rP9RdLnYB7U9JWtI2m_r6GuQXdSNepojpQDHsIkxUQQ0VJc9jNMh7HS3tt3zqNw58yii8j6wdPbJtCauLMSHeAlt9czA"
        },
        {
            name: "Diamond Stud Earrings (1/3 ct)",
            rating: 4.5,
            reviews: "1.1k",
            price: "299.00",
            oldPrice: null,
            img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDqklKrvmx9c_5mwbqJWttxlthE5d1aMtyKnjrWlcBeD9x3YRzmdf08ujZmSTkGPpJuFdv_oeUTu_u_II7uaEuAlOk1QdDwBVmN3YeQoNHznqErxpjYic6zdCumOusMBmvp87f4aegB9FUi3ln-PzdpBmMIP-HDJUJqxSmTq3_N3XOigpXrtCBuYkbdO5rv2zPvLeeAfH7t_u54X3DX6I5Re22TBUTV5PRTqjk3lJfHrfLMQBP4OLeVBdGKcohaZs9MITrd_q9vYJs"
        },
        {
            name: "Nike Invincible 3 Premium",
            rating: 3,
            reviews: "157",
            price: "190",
            oldPrice: null,
            img: "https://lh3.googleusercontent.com/aida-public/AB6AXuD74Rg8wJwRvCEsiUUMwzBrMrB5CSL2RMZgLB44EaXYv3rMdYAMvCgLgOMI77V0zcu0f2yY94-Cusu8n1yRusPvH92rBZZx_CGrENva2GOm7_ScxdC8wcIfovDd-jEboKGiBNGlj52F52aCwLpRGEnA4hSdImMYbw9TnAxl44bbFKP8tEDBdzB9OFIFB7sPoINtVnz-KdSkqf6BjqxYtloV1xg8FEKIC7HDI9onbl8mRsYDRjGw0VbFoCg0frp38SP516n_VONzmaA"
        }
    ];

    return (
        <section>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-text-light dark:text-text-dark">Todays Best Deals For You!</h3>
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
                        <div className="flex items-center gap-1 mb-2">
                            {[...Array(5)].map((_, i) => (
                                <Star
                                    key={i}
                                    className={`w-3 h-3 ${i < Math.floor(deal.rating) ? 'text-yellow-400 fill-yellow-400' : (i < deal.rating ? 'text-yellow-400 fill-yellow-400 opacity-50' : 'text-gray-300')}`}
                                />
                            ))}
                            <span className="text-xs text-gray-500">({deal.reviews})</span>
                        </div>
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
