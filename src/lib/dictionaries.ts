import { AppSupportedLanguage } from "@/types";

export type Dictionary = {
    landing: {
        hero: {
            offerEnds: string;
            title: string;
            subtitle: string;
            description: string;
            emailPlaceholder: string;
            cta: string;
            distributor: string;
            trendAlert: string;
            sales: string;
        };
        promo: {
            newOnStore: string;
            bluetoothTitle: string;
            bluetoothDesc: string;
            bluetoothCta: string;
            lightingTitle: string;
            lightingCta: string;
            watchTitle: string;
            startingAt: string;
        };
        trending: {
            title: string;
            viewAll: string;
        };
        designed: {
            title: string;
            subtitle: string;
            lifestyleAudio: string;
            soundPerfection: string;
            newSeries: string;
            soundCta: string;
            iphoneCta: string;
        };
        testimonials: {
            title: string;
            subtitle: string;
            verified: string;
            items: {
                quote: string;
                name: string;
                location: string;
            }[];
        };
        footer: {
            lastChance: string;
            cta: string;
            notification: {
                time: string;
                text: string;
                product: string;
            };
        };
        categories: {
            [key: string]: string;
        };
        products: {
            [key: string]: string;
        };
    };
};

export const dictionary: Record<AppSupportedLanguage, Dictionary> = {
    en: {
        landing: {
            hero: {
                offerEnds: "Offer ends in",
                title: "Wholesale Tech",
                subtitle: "Unbeatable Prices",
                description: "Unlock exclusive B2B pricing on premium electronics. Join 10,000+ businesses saving up to 40% on bulk orders.",
                emailPlaceholder: "Enter work email for price list",
                cta: "Unlock Access",
                distributor: "Official Distributor For",
                trendAlert: "Trend Alert",
                sales: "+240% Sales",
            },
            promo: {
                newOnStore: "New On Store",
                bluetoothTitle: "Bluetooth Earbuds",
                bluetoothDesc: "You can also frame more expansive scenes without taking a step back.",
                bluetoothCta: "Shop Headphones",
                lightingTitle: "Smart Lighting",
                lightingCta: "Shop",
                watchTitle: "Apple Ultra Smartwatch",
                startingAt: "Starting at",
            },
            trending: {
                title: "Trending Products",
                viewAll: "View All",
            },
            designed: {
                title: "Designed for Every Moment",
                subtitle: "Premium tech that fits seamlessly into your lifestyle",
                lifestyleAudio: "Lifestyle Audio",
                soundPerfection: "Sound perfection",
                newSeries: "New Series iPhone 14 Pro",
                soundCta: "Open Sound perfection collection",
                iphoneCta: "Open iPhone collection",
            },
            testimonials: {
                title: "What our partners say",
                subtitle: "Trusted by over 10,000 retailers worldwide. Our wholesale platform delivers consistency, quality, and competitive pricing for your business.",
                verified: "Verified Purchase",
                items: [
                    {
                        quote: '"Refurbished Premium Tech has completely transformed our supply chain. The bulk pricing allows us to maintain healthy margins while offering competitive prices to our customers."',
                        name: 'Kasim Khan',
                        location: 'Mexico City • Orders: 50+',
                    },
                    {
                        quote: '"The quality of the electronics is consistently top-tier. Shipping is faster than any other wholesale distributor we have worked with in the last 5 years."',
                        name: 'Sarah Jenkins',
                        location: 'London, UK • Orders: 120+',
                    },
                    {
                        quote: '"Reliable stock levels and excellent customer service. Even during peak holiday seasons, Refurbished Premium Tech delivers on time. Highly recommended for scaling businesses."',
                        name: 'David Chen',
                        location: 'Toronto, CA • Orders: 85+',
                    }
                ]
            },
            footer: {
                lastChance: "Last chance! These prices will not return for 6 months.",
                cta: "Shop Now",
                notification: {
                    time: "Just now",
                    text: "Someone in Mexico City just bought",
                    product: "10x Pro Earbuds",
                },
            },
            categories: {
                Portable: "Portable",
                Mice: "Mice",
                Earbuds: "Earbuds",
                "VR & Webcams": "VR & Webcams",
                Speakers: "Speakers",
                Games: "Games",
            },
            products: {
                "Sony WH-1000XM5": "Sony WH-1000XM5",
                "Apple Watch Ultra": "Apple Watch Ultra",
                "Oculus Quest Pro": "Oculus Quest Pro",
                "Logitech G Pro X": "Logitech G Pro X",
                "Over-Ear Headphones": "Over-Ear Headphones",
                "Wireless Earbuds": "Wireless Earbuds",
                "Smart Fitness Watch": "Smart Fitness Watch",
            }
        },
    },
    es: {
        landing: {
            hero: {
                offerEnds: "Oferta termina en",
                title: "Tecnología Mayorista",
                subtitle: "Precios Inigualables",
                description: "Desbloquea precios exclusivos B2B en electrónica premium. Únete a más de 10,000 empresas ahorrando hasta un 40% en pedidos al por mayor.",
                emailPlaceholder: "Ingresa tu email de trabajo",
                cta: "Obtener Acceso",
                distributor: "Distribuidor Oficial De",
                trendAlert: "Tendencia",
                sales: "+240% Ventas",
            },
            promo: {
                newOnStore: "Nuevo en Tienda",
                bluetoothTitle: "Audífonos Bluetooth",
                bluetoothDesc: "Puedes encuadrar escenas más amplias sin dar un paso atrás.",
                bluetoothCta: "Ver Audífonos",
                lightingTitle: "Iluminación Inteligente",
                lightingCta: "Comprar",
                watchTitle: "Apple Ultra Smartwatch",
                startingAt: "Desde",
            },
            trending: {
                title: "Productos en Tendencia",
                viewAll: "Ver Todo",
            },
            designed: {
                title: "Diseñado para Cada Momento",
                subtitle: "Tecnología premium que se adapta perfectamente a tu estilo de vida",
                lifestyleAudio: "Audio Estilo de Vida",
                soundPerfection: "Perfección de Sonido",
                newSeries: "Nueva Serie iPhone 14 Pro",
                soundCta: "Ver colección de sonido",
                iphoneCta: "Ver colección de iPhone",
            },
            testimonials: {
                title: "Lo que dicen nuestros socios",
                subtitle: "Confiado por más de 10,000 minoristas en todo el mundo. Nuestra plataforma mayorista ofrece consistencia, calidad y precios competitivos para su negocio.",
                verified: "Compra Verificada",
                items: [
                    {
                        quote: '"Refurbished Premium Tech ha transformado completamente nuestra cadena de suministro. Los precios al por mayor nos permiten mantener márgenes saludables mientras ofrecemos precios competitivos a nuestros clientes."',
                        name: 'Kasim Khan',
                        location: 'Ciudad de México • Pedidos: 50+',
                    },
                    {
                        quote: '"La calidad de los electrónicos es consistentemente de primer nivel. El envío es más rápido que cualquier otro distribuidor mayorista con el que hemos trabajado en los últimos 5 años."',
                        name: 'Sarah Jenkins',
                        location: 'Londres, UK • Pedidos: 120+',
                    },
                    {
                        quote: '"Niveles de stock confiables y excelente servicio al cliente. Incluso durante las temporadas altas, Refurbished Premium Tech entrega a tiempo. Altamente recomendado para empresas en crecimiento."',
                        name: 'David Chen',
                        location: 'Toronto, CA • Pedidos: 85+',
                    }
                ]
            },
            footer: {
                lastChance: "¡Última oportunidad! Estos precios no volverán por 6 meses.",
                cta: "Comprar Ahora",
                notification: {
                    time: "Justo ahora",
                    text: "Alguien en Ciudad de México acaba de comprar",
                    product: "10x Audífonos Pro",
                },
            },
            categories: {
                Portable: "Portátiles",
                Mice: "Ratones",
                Earbuds: "Audífonos",
                "VR & Webcams": "VR y Webcams",
                Speakers: "Bocinas",
                Games: "Juegos",
            },
            products: {
                "Sony WH-1000XM5": "Sony WH-1000XM5",
                "Apple Watch Ultra": "Apple Watch Ultra",
                "Oculus Quest Pro": "Oculus Quest Pro",
                "Logitech G Pro X": "Logitech G Pro X",
                "Over-Ear Headphones": "Audífonos Over-Ear",
                "Wireless Earbuds": "Audífonos Inalámbricos",
                "Smart Fitness Watch": "Reloj Inteligente",
            }
        },
    },
};
