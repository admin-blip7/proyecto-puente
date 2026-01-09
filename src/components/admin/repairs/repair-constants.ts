
export const COMMON_MODELS: Record<string, string[]> = {
    iPhone: [
        "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15",
        "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14",
        "iPhone 13 Pro Max", "iPhone 13 Pro", "iPhone 13", "iPhone 13 mini",
        "iPhone 12 Pro Max", "iPhone 12 Pro", "iPhone 12", "iPhone 12 mini",
        "iPhone 11 Pro Max", "iPhone 11 Pro", "iPhone 11",
        "iPhone SE (3rd Gen)", "iPhone XR", "iPhone X", "iPhone 8 Plus"
    ],
    Samsung: [
        "Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24",
        "Galaxy S23 Ultra", "Galaxy S23+", "Galaxy S23",
        "Galaxy S22 Ultra", "Galaxy S22+", "Galaxy S22",
        "Galaxy A54 5G", "Galaxy A34 5G", "Galaxy A14",
        "Galaxy Z Fold5", "Galaxy Z Flip5"
    ],
    Xiaomi: [
        "Redmi Note 13 Pro+", "Redmi Note 13 Pro", "Redmi Note 13",
        "Xiaomi 13T Pro", "Xiaomi 13T",
        "POCO X6 Pro", "POCO F5", "POCO M6 Pro"
    ],
    Huawei: [
        "P60 Pro", "P60",
        "Nova 11 Pro", "Nova 11", "Nova 11i",
        "Mate 50 Pro"
    ],
    Motorola: [
        "Moto G84", "Moto G54", "Edge 40 Neo", "Edge 40"
    ],
    Honor: [
        "Magic6 Lite", "Magic5 Pro", "X8b", "90 Lite"
    ],
    Google: [
        "Pixel 8 Pro", "Pixel 8", "Pixel 7a", "Pixel 7 Pro", "Pixel 7"
    ]
};

export const COMMON_PROBLEMS = [
    { id: "screen", label: "Pantalla Rota / Touch", category: "hardware" },
    { id: "battery", label: "Cambio de Batería", category: "hardware" },
    { id: "charging", label: "Puerto de Carga", category: "hardware" },
    { id: "camera_back", label: "Cámara Trasera", category: "hardware" },
    { id: "camera_front", label: "Cámara Frontal", category: "hardware" },
    { id: "back_glass", label: "Tapa Trasera (Back Glass)", category: "hardware" },
    { id: "speaker", label: "Altavoz / Auricular", category: "hardware" },
    { id: "microphone", label: "Micrófono", category: "hardware" },
    { id: "buttons", label: "Botones (Power/Volumen)", category: "hardware" },
    { id: "face_id", label: "Face ID / Touch ID", category: "hardware" },
    { id: "water_damage", label: "Baño Químico (Mojado)", category: "hardware" },
    { id: "software", label: "Software / Sistema", category: "software" },
    { id: "unlock", label: "Desbloqueo de Red", category: "software" },
    { id: "icloud", label: "Cuenta Google / iCloud", category: "software" },
    { id: "board", label: "Reparación de Placa", category: "hardware" },
];

// Precios sugeridos base (ejemplo)
export const BASE_PRICES: Record<string, number> = {
    screen: 1200,
    battery: 800,
    charging: 600,
    camera_back: 900,
    camera_front: 600,
    back_glass: 1000,
    speaker: 500,
    microphone: 500,
    buttons: 500,
    face_id: 1500,
    water_damage: 800,
    software: 500,
    unlock: 400,
    icloud: 800,
    board: 1500
};

export const QUICK_ACTIONS = [
    { label: "Pantalla iPhone X-11", problem: "Pantalla Rota / Touch", price: 1200 },
    { label: "Batería Genérica", problem: "Cambio de Batería", price: 600 },
    { label: "Limpieza P. Carga", problem: "Puerto de Carga", price: 300 },
    { label: "Mica Hidrogel", problem: "Protector de Pantalla", price: 150 },
];
