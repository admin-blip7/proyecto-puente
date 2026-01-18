"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Info } from "lucide-react";
import Image from "next/image";

// Map of actual filenames from the Photoroom directory (internal names)
const iconList = [
    "airplane_white", "airplane_white_2", "alarm_clock_red", "armchair_cream",
    "armchair_sofa_tan", "atm_machine_gray", "backpack_hiking", "bank_check_cheque",
    "bank_transfer_arrows", "bar_stool_wood_tan", "bean_bag_chair_blue", "bed_double_brown_cream",
    "bicycle_basket", "bicycle_red", "binoculars_hiking", "bird_cage_silver",
    "bitcoin_crypto_gold", "bone_dog_toy", "books_stack", "bookshelf_wood_books",
    "bricks_stack_red", "briefcase", "bulldozer_red_yellow", "bulletin_board",
    "burger_cheeseburger", "bus_white", "calculator_basic_gray", "calculator_modern",
    "calendar_desk", "camera_vintage", "campfire_logs", "car_sports_red",
    "card_wave_blue", "card_wave_cyan_blue", "card_wave_cyan_green", "card_wave_green",
    "card_wave_pink", "card_wave_pink_blue", "card_wave_purple", "card_wave_purple_blue",
    "card_wave_red_orange", "card_wave_red_pink", "card_wave_red_yellow", "card_wave_teal_blue",
    "card_wave_teal_green", "card_wave_yellow", "cardboard_box_closed", "cardboard_box_peanuts",
    "cargo_ship_containers", "cash_stack_green", "cat_calico", "cat_food_can",
    "cat_toy_feather", "cement_bag_brown", "cement_mixer_truck", "closet_wardrobe_3_door",
    "coat_rack_wood", "coffee_croissant_breakfast", "coffee_cup_mug", "coffee_table_wood",
    "coins_gold_stack", "compass_navigation", "conveyor_belt_boxes", "credit_card_gray",
    "delivery_man_box", "delivery_truck_white", "delivery_van_creme", "desk_lamp_gray",
    "desk_office_chair_wood", "dining_table_chairs", "dog_collar_leather", "dresser_4_drawers_wood",
    "dumbbell_water_bottle", "dumbbells_weights", "dump_truck_yellow", "excavator_yellow",
    "file_organizer_desk", "first_aid_kit_red", "fish_tank_aquarium", "floor_lamp_tall_cream",
    "forklift_orange", "gas_nozzle_fuel", "gift_box_pink", "globe_desk",
    "gold_bar_ingot", "golden_retriever", "goldfish_bowl", "growth_chart_bar_graph",
    "guitar_acoustic", "hammer_wood_handle", "hamster_wheel", "hand_receiving_coin",
    "hand_truck_dolly", "hard_hat_yellow", "headphones_silver", "helicopter_white",
    "hole_puncher", "house_small_trees", "ice_cream_cone", "invoice_paid_stamp",
    "kitchen_counter_sink", "laptop_data", "macaw_parrot", "mailbox_white_red_flag",
    "microphone_vintage", "money_bag_dollar", "movie_clapperboard_popcorn",
    "mug_boss", "nightstand_lamp_wood", "padded_envelope", "pallet_boxes_strapped",
    "paper_clips", "paper_shredder", "passport_travel", "pencil_holder",
    "pet_bed_brown", "pet_brush_slicker", "pet_carrier_plastic", "pet_food_bag_dog",
    "pet_shampoo_bottle", "pet_water_bowl", "pie_chart_multicolor", "piggy_bank_pink",
    "pipe_wrench_red", "pizza_slice", "pos_terminal_receipt", "potted_flower",
    "potted_succulent", "potted_succulent_2", "power_drill_yellow", "rabbit_white",
    "rubber_stamp", "ruler_wooden", "safe_box_metal", "scissors",
    "scooter_delivery", "shoe_rack_wood", "shopping_bags_clothes", "shopping_cart_groceries",
    "skateboard_black", "smart_locker_packages", "smartphone_map", "smartphone_payment_nfc",
    "smartwatch_fitness", "soda_can_red", "sofa_cream_2_seater", "sports_art",
    "stapler_red", "sticky_notes", "suitcase_travel", "tape_dispenser",
    "tape_measure_yellow", "tent_camping", "toolbox_metal_silver", "tools_hammer_wrench",
    "toothbrush_toothpaste", "tower_crane_yellow", "traffic_cone_orange", "train_locomotive",
    "tv_stand_flatboard", "utility_bills_coins", "vanity_table_mirror", "video_game_controller_black",
    "vinyl_record", "watermelon_slice", "wheelbarrow_metal_silver", "whiteboard_office",
    "wood_planks_lumber", "work_gloves_yellow"
];

const SUPABASE_STORAGE_URL = "https://aaftjwktzpnyjwklroww.supabase.co/storage/v1/object/public/icons/";

interface IconPickerProps {
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function IconPicker({ value, onChange, placeholder = "Seleccionar icono" }: IconPickerProps) {
    const [search, setSearch] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    const filteredIcons = useMemo(() => {
        return iconList.filter(icon =>
            icon.toLowerCase().replace(/_/g, " ").includes(search.toLowerCase())
        );
    }, [search]);

    // Handle value construction for display: value is "UserIcons/name", we need "UserIcons/name.png"
    const selectedIconUrl = value ? `${SUPABASE_STORAGE_URL}${value}${value.endsWith('.png') ? '' : '.png'}` : null;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className="w-full justify-start gap-2 h-12"
                    type="button"
                >
                    {selectedIconUrl ? (
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className="relative w-8 h-8 shrink-0">
                                <Image
                                    src={selectedIconUrl}
                                    alt={value || "Icon"}
                                    fill
                                    className="object-contain"
                                />
                            </div>
                            <span className="truncate text-sm opacity-70">
                                {value?.replace("UserIcons/", "").replace(/_/g, " ")}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-muted-foreground font-normal">
                            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                                <Info className="w-4 h-4" />
                            </div>
                            {placeholder}
                        </div>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0" align="start">
                <div className="p-2 border-b">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar icono..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <ScrollArea className="h-[300px]">
                    <div className="grid grid-cols-4 gap-1 p-2">
                        {filteredIcons.map((iconName) => {
                            const dbValue = `UserIcons/${iconName}`;
                            const iconUrl = `${SUPABASE_STORAGE_URL}${dbValue}.png`;
                            return (
                                <Button
                                    key={iconName}
                                    variant="ghost"
                                    className={`h-16 w-full p-1 flex flex-col items-center justify-center gap-1 hover:bg-accent ${value === dbValue ? "bg-accent border-primary border" : ""
                                        }`}
                                    onClick={() => {
                                        onChange(dbValue);
                                        setIsOpen(false);
                                    }}
                                    title={iconName.replace(/_/g, " ")}
                                >
                                    <div className="relative w-10 h-10">
                                        <Image
                                            src={iconUrl}
                                            alt={iconName}
                                            fill
                                            className="object-contain"
                                            sizes="40px"
                                        />
                                    </div>
                                </Button>
                            );
                        })}
                    </div>
                    {filteredIcons.length === 0 && (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No se encontraron iconos.
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
