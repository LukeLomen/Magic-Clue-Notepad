/// Named sets of suspect/weapon/room cards for different editions of Clue (plus a joke
/// "simpsons" set). Each preset has the same shape: three arrays whose lengths must line up
/// with however many suspect/weapon/room columns the table was built with, since the table
/// doesn't know card names itself - it just displays whatever cardsAPI.getCards() returns.
export const presets = {
    default: {
        suspects: ["Scarlet", "Mustard", "White", "Green", "Peacock", "Plum"],
        weapons: ["Candlestick", "Knife", "Pipe", "Revolver", "Rope", "Wrench"],
        rooms: ["Kitchen", "Ballroom", "Conservatory", "Dining", "Billiard", "Library", "Lounge", "Hall", "Study"]
    },
    2016: {
        suspects: ["Miss Scarlet", "Colonel Mustard", "Dr. Orchid", "Mr. Green", "Mrs. Peacock", "Professor Plum"],
        weapons: ["Candlestick", "Knife", "Lead Pipe", "Revolver", "Rope", "Wrench"],
        rooms: ["Kitchen", "Ballroom", "Conservatory", "Dining Room", "Billiard Room", "Library", "Lounge", "Hall", "Study"]
    },
    classic: {
        suspects: ["Miss Scarlet", "Colonel Mustard", "Mrs. White", "Mr. Green", "Mrs. Peacock", "Professor Plum"],
        weapons: ["Candlestick", "Knife", "Lead Pipe", "Revolver", "Rope", "Wrench"],
        rooms: ["Kitchen", "Ballroom", "Conservatory", "Dining Room", "Billiard Room", "Library", "Lounge", "Hall", "Study"]
    },
    simpsons: {
        suspects: ["Homer", "Marge", "Bart", "Lisa", "Krusty", "Burns"],
        weapons: ["Slingshot", "Donut", "Plutonium Rod", "Radioactive Man Comic", "Saxophone", "Duff Can"],
        rooms: ["Living Room", "Nuclear Plant", "Kwik-E-Mart", "Simpsons' Kitchen", "Moe's", "Springfield Elementary", "Treehouse", "Flanders' Yard", "Power Plant Core"]
    },
    /// Real, officially licensed Clue editions below - all keep the same 6 suspects / 6
    /// weapons / 9 rooms structure as the classics above, just re-themed. Verified against
    /// each edition's official rulebook/product listing.
    bigbangtheory: {
        suspects: ["Sheldon", "Leonard", "Penny", "Howard", "Raj", "Bernadette"],
        weapons: ["Dog-eared Comic", "Dismantled Shelbot", "Erased Equation Board", "Wiped Hard Drive", "Stained Cushion", "Defiled Toothbrush"],
        rooms: ["Laundry Room", "Bathroom", "Penny's Living Room", "Leonard's Bedroom", "Kitchen", "Sheldon's Bedroom", "Sheldon & Leonard's Living Room", "Stairwell", "Roof"]
    },
    goldengirls: {
        suspects: ["Dorothy", "Blanche", "Rose", "Sophia", "Stan", "Miles"],
        weapons: ["Bathrobe", "Whipped Cream", "Rattan Chair", "Lipstick", "Feathered Slipper", "Sophia's Purse"],
        rooms: ["Kitchen", "Blanche's Bedroom", "The Lanai", "Rose's Bedroom", "The Bathroom", "The Garage", "Sophia's Bedroom", "Dorothy's Bedroom", "Front Yard"]
    },
    friends: {
        suspects: ["Rachel", "Monica", "Phoebe", "Chandler", "Joey", "Ross"],
        weapons: ["Blue Lipstick", "Taxi", "Copy of Science Boy", "Flower Bouquet", "Phone", "Sandwich"],
        rooms: ["Apartment 19", "Apartment 20", "Ross' Apartment", "Phoebe's Apartment", "Central Perk", "The Hallway", "The Hospital", "Monica's Parents Apartment", "The Balcony"]
    }
};

/// The currently active card names, starting from the default preset. This is module-level
/// state (not a class instance) because there's only ever one active game's worth of card
/// names at a time - GameManager reads it through cardsAPI rather than owning a copy itself.
let currentCards = {
    suspects: [...presets.default.suspects],
    weapons: [...presets.default.weapons],
    rooms: [...presets.default.rooms]
};

/// Small API surrounding `currentCards`. Everything returns/accepts copies (via spread) rather
/// than the live arrays, so callers can't accidentally mutate `currentCards` by holding onto a
/// reference returned from getCards().
export const cardsAPI = {
    // Load a full preset
    loadPreset: (presetName) => {
        const preset = presets[presetName];
        if (!preset) throw new Error(`Preset "${presetName}" not found.`);
        currentCards.suspects = [...preset.suspects];
        currentCards.weapons = [...preset.weapons];
        currentCards.rooms = [...preset.rooms];
    },

    // Change a single card by category + index
    setCardName: (category, index, newName) => {
        if (!['suspects', 'weapons', 'rooms'].includes(category)) {
            throw new Error(`Invalid category "${category}"`);
        }
        if (index < 0 || index >= currentCards[category].length) {
            throw new Error(`Index out of bounds for ${category}`);
        }
        currentCards[category][index] = newName;
    },

    // Get all cards
    getCards: () => ({
        suspects: [...currentCards.suspects],
        weapons: [...currentCards.weapons],
        rooms: [...currentCards.rooms]
    }),

    /// Cards are addressed everywhere else in the app (table columns, suggestion.cardArray,
    /// Player card-state arrays, etc.) by a single flat index into
    /// [...suspects, ...weapons, ...rooms] rather than by category+index. This is the one
    /// place that ordering is defined - keep it in sync with how the table builds its columns.
    getCardFromIndex(index) {
        const {
            suspects,
            weapons,
            rooms
        } = this.getCards();
        const allCards = [...suspects, ...weapons, ...rooms];
        if (index < 0 || index >= allCards.length) {
            throw new RangeError(`Card index ${index} is out of range (0–${allCards.length - 1})`);
        }
        return allCards[index];
    },

    // Reset to default
    reset: () => {
        cardsAPI.loadPreset('default');
    }
};
