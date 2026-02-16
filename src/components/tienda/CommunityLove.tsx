import { Instagram, User, Heart, MessageCircle, Send } from 'lucide-react'
import Image from 'next/image'

export function CommunityLove() {
    return (
        <section id="reviews" className="py-12 lg:py-16 bg-secondary/30">
            <div className="container mx-auto px-4 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                    <div>
                        <span className="text-accent font-mono text-xs tracking-widest block mb-2 font-bold">
              /// SOCIAL
                        </span>
                        <h2 className="font-editors-note text-4xl lg:text-5xl font-thin">
                            Community Love
                        </h2>
                        <p className="text-muted-foreground mt-4 max-w-md">
                            See how our community uses 22 Electronic products in their daily lives. Tag @22electronic to be featured.
                        </p>
                    </div>
                    <button className="px-6 py-3 border border-border rounded-full hover:border-accent transition-colors flex items-center gap-2 group">
                        <Instagram className="h-4 w-4 group-hover:text-accent transition-colors" />
                        <span className="text-xs font-bold uppercase tracking-widest">
                            Follow us
                        </span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Review 1 */}
                    <div className="bg-background rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 group">
                        <div className="p-4 flex items-center justify-between border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-500 p-[2px]">
                                    <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                                        <User className="text-muted-foreground h-5 w-5" />
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm">alex_urban</h4>
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                        New York, NY
                                    </span>
                                </div>
                            </div>
                            <Instagram className="text-muted-foreground h-5 w-5" />
                        </div>
                        <div className="aspect-square bg-secondary relative overflow-hidden">
                            <Image
                                src="/assets/reviews/review_headphones.png"
                                alt="Headphones Review"
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                        </div>
                        <div className="p-6">
                            <div className="flex gap-4 mb-4">
                                <Heart className="text-red-500 fill-red-500 h-5 w-5" />
                                <MessageCircle className="h-5 w-5" />
                                <Send className="h-5 w-5" />
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                                <span className="font-bold text-primary mr-1">alex_urban</span>
                                The sound quality on these XM5s is absolutely insane. 🎧 The isolation mode completely shuts out the city noise. #22electronic #sony #music
                            </p>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                                2 HOURS AGO
                            </span>
                        </div>
                    </div>

                    {/* Review 2 */}
                    <div className="bg-background rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 group">
                        <div className="p-4 flex items-center justify-between border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-500 p-[2px]">
                                    <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                                        <User className="text-muted-foreground h-5 w-5" />
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm">creative_desk</h4>
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                        Berlin, DE
                                    </span>
                                </div>
                            </div>
                            <Instagram className="text-muted-foreground h-5 w-5" />
                        </div>
                        <div className="aspect-square bg-secondary relative overflow-hidden">
                            <Image
                                src="/assets/reviews/review_smartwatch.png"
                                alt="Smartwatch Review"
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                        </div>
                        <div className="p-6">
                            <div className="flex gap-4 mb-4">
                                <Heart className="text-red-500 fill-red-500 h-5 w-5" />
                                <MessageCircle className="h-5 w-5" />
                                <Send className="h-5 w-5" />
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                                <span className="font-bold text-primary mr-1">creative_desk</span>
                                Finally completed my setup with the Ultra 2. The integration is seamless. ✨ #setup #minimal #tech
                            </p>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                                5 HOURS AGO
                            </span>
                        </div>
                    </div>

                    {/* Review 3 */}
                    <div className="bg-background rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 group">
                        <div className="p-4 flex items-center justify-between border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-500 p-[2px]">
                                    <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                                        <User className="text-muted-foreground h-5 w-5" />
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm">adventure_cam</h4>
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                        Denver, CO
                                    </span>
                                </div>
                            </div>
                            <Instagram className="text-muted-foreground h-5 w-5" />
                        </div>
                        <div className="aspect-square bg-secondary relative overflow-hidden">
                            <Image
                                src="/assets/reviews/review_camera.png"
                                alt="Camera Review"
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                        </div>
                        <div className="p-6">
                            <div className="flex gap-4 mb-4">
                                <Heart className="text-red-500 fill-red-500 h-5 w-5" />
                                <MessageCircle className="h-5 w-5" />
                                <Send className="h-5 w-5" />
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                                <span className="font-bold text-primary mr-1">adventure_cam</span>
                                Took the Hero 11 to the peaks today. Video stabilization is next level! 🏔️ #gopro #adventure #hiking
                            </p>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                                1 DAY AGO
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
