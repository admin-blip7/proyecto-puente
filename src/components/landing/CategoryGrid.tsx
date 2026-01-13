import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default function CategoryGrid() {
    const categories = [
        { name: "Electronics", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuChNri5tNB7vKVU7ZCDp1Fef5FRbYN4vJcBRYRoGZBrTde2UnC-wGpfJFUK2yrdxGh9vFBbfnA_ZkareLQa7ZMeCN39oiRMZQEp8K1C43qE887jJVIHmdqJx_Fd8nR2VH_EXnmExoswyWDfC1HbPz0FMTxNvy23bajMLEROYtDapD-haot1Rhmlytju8lAlblq7zgBTT3c3YhfuvZu2vSocaTmdwUi3XbsWnNVSiYTnIdRS0rHTsXI7nI6uOsgwyY3VkrwJadhjX-o", mixBlend: true },
        { name: "Fashion", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAUlPRoBWFHXrCFupjleblfGMx0FbZkoW5jAkUaesHw5SGEnjVCt8pl2erlOMKCLyFDSJNDf33bfD17qACMHj7kLDv1KJwv4VuV0tvPyQwEkes0aqzZPPqVP8bsBSwMQAKqG9yzPMjeEdaWCWCyMDzq6wnwfPFlYzaxxTxO58ico0vPA0sblwVus67LN3e8Bbvc-7xUkeb18aut9EX52EFxJ7RHR3JCPcnMrGPZPVQbEZYQNYa3cPHIr2GXoWVddBnWl03RY_4F5dQ", mixBlend: false },
        { name: "Luxury", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAYVRNEBdpSkLhtzsbxnN_Jy6letFBbbzRdrjb-NGaZ_4iBVtMovf80nRmtadnBCXLjR_p8EZQ8rFvD7qhZykqZ8-0HgrM7nI0cpz6UDXgUaS3_oohh8GFrLfLK_p8rmfOZWgHbkT6cZYy_jaUXftgSqgzju7nt-EaeiwCk__I1aY-sYih32hx-XsmYi_kb_-M-fjXZPn0d03HofJaqPs0vkTStUIs63uDNjGRC7sCPC9qenYkrtPMRUF61C5SU1oZYlHUBwkQnBV8", mixBlend: true },
        { name: "Home Decor", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuA3rvCEYL4zFDGmQy_ATQLDekD0eXoa9XBydiQg_BbsOsycxH7NL3yjIOLFM5UwIkn_vvn9H16ouTL5iXKEJXPJYZKC014KND_hL7df5cIPwoIJCvm2BVUHT7-awHEMg1v8cWZUlhspyiCIQpXCXt-fIqXkfbe8Ua4SFtRL9zOFxtHNokE1ZJpY5_GOTcsto91MJMeY6KbkNUlwGGp_O-QHKqCZYPou6JJ_qrHU8-ybn0YLT8Rcw9AjiKjhZ9wvJ5ocwIvwt1m4hps", mixBlend: false },
        { name: "Health & Beauty", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBVGhVsmqUwtF8jje7FtEApbjje_-yNAdtXQlVWK4ZHA7Sq_nIALsjdVaPo6dq48mij4ygPfOlUcri5DHcUgcz5a5a34pF01P4PWf0Iazf3qaJIEEcfUkpq4fHDQeU20-GUKzIfJcPoaDdOAkuwKyyBaQ_07WXmBcqylekeTsupOrIlKFjM71IQXqENaye36l1HUPqDKnijPsLABXOWQm1BccTlRHJSrBQCtkGlOHU55TNm2_EMfYd6KjfR5j0ZXLZ61jNm6-GCbLY", mixBlend: true },
        { name: "Groceries", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDHqwMSjtMoJlewwvJPBB0dZWEJUA7iiLpN8qUxFGA4yU1X1BGbHS7Sx3AYPlDM55F1MHyMeZpSbOCKQasVpFBepiUVawYKO3AbFOZ7zx6xJKDURCjDQpKn_FEdqlR8aL4ophDutpIyEPdbyvGTJIpY31cbo3Xjf55y90fK81CYQYprUGAMWbTO1TQoV-rZo3gBQAG7Uq7h_68ijQgN2nnaRYWDj6l6tJ1D5tILc-z8ABgAMrCQyTPcLV-bDdlDJQOnKrDysH3QXYw", mixBlend: false },
        { name: "Sneakers", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuB3fQAANCY-ZQKFoKFmKptBJb0qnahdSaQb7tj5sz2MY9FBgFEafVOQpPoxClHrT_O2iyLdUkvyHRMQRg8K6Cw9Z377M9P15Aq3o72ZRGwXUz2htrHJSgkrUzLrQch6SrluLmw7ngTYHH38QiArCDfhXWjCVB-LkZ8ZfLjiSpwWO8IDw-wpBrrS9lM2vcdrBPDGisIppnicj07AbPmYy2y2VM7O7Xt9K0tRDvOFid4h1dB9vBvYIXsVaHnh02QnjFgu-hqc875kHtI", mixBlend: true },
    ];

    return (
        <section>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-text-light dark:text-text-dark">Explore Popular Categories</h3>
                <Link href="#" className="text-sm text-secondary font-medium hover:underline flex items-center">
                    View All <ChevronRight className="w-4 h-4" />
                </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {categories.map((cat, idx) => (
                    <Link key={idx} href="#" className="group flex flex-col items-center gap-3">
                        <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-surface-dark flex items-center justify-center group-hover:shadow-md transition duration-300 overflow-hidden border border-transparent group-hover:border-secondary">
                            <img
                                alt={cat.name}
                                className={`w-16 h-16 ${cat.mixBlend ? 'object-contain mix-blend-multiply dark:mix-blend-normal' : 'object-cover rounded-full'}`}
                                src={cat.img}
                            />
                        </div>
                        <span className="text-xs font-semibold text-center group-hover:text-secondary">{cat.name}</span>
                    </Link>
                ))}
            </div>
        </section>
    );
}
