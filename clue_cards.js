export const presets = {
    default: {
        suspects: ["Scarlet", "Mustard", "White", "Green", "Peacock", "Plum"],
        weapons: ["Candlestick", "Knife", "Pipe", "Revolver", "Rope", "Wrench"],
        rooms: ["Kitchen", "Ballroom", "Conservatory", "Dining", "Billiard", "Library", "Lounge", "Hall", "Study"]
    },
    classic: {
        suspects: ["Miss Scarlet", "Colonel Mustard", "Mrs. White", "Mr. Green", "Mrs. Peacock", "Professor Plum"],
        weapons: ["Candlestick", "Knife", "Lead Pipe", "Revolver", "Rope", "Wrench"],
        rooms: ["Kitchen", "Ballroom", "Conservatory", "Dining Room", "Billiard Room", "Library", "Lounge", "Hall", "Study"]
    },
    2016: {
        suspects: ["Miss Scarlet", "Colonel Mustard", "Dr. Orchid", "Mr. Green", "Mrs. Peacock", "Professor Plum"],
        weapons: ["Candlestick", "Knife", "Lead Pipe", "Revolver", "Rope", "Wrench"],
        rooms: ["Kitchen", "Ballroom", "Conservatory", "Dining Room", "Billiard Room", "Library", "Lounge", "Hall", "Study"]
    },
    simpsons: {
        suspects: ["Homer", "Marge", "Bart", "Lisa", "Krusty", "Burns"],
        weapons: ["Slingshot", "Donut", "Plutonium Rod", "Radioactive Man Comic", "Saxophone", "Duff Can"],
        rooms: ["Living Room", "Nuclear Plant", "Kwik-E-Mart", "Simpsons' Kitchen", "Moe's", "Springfield Elementary", "Treehouse", "Flanders' Yard", "Power Plant Core"]
    }
};

let currentCards = {
    suspects: [...presets.default.suspects],
    weapons: [...presets.default.weapons],
    rooms: [...presets.default.rooms]
};

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
        clueAPI.loadPreset('default');
    }
};