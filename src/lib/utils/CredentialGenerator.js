/**
 * CredentialGenerator Class
 * Utilities for generating random credentials (email, username, password).
 */
class CredentialGenerator {
    static get WORDS() {
        return [
            "ace", "air", "aqua", "ash", "atom", "aurora", "axis", "bark", "beam", "berry",
            "blade", "blaze", "bloom", "bolt", "breeze", "brick", "brook", "bubble", "bud",
            "burst", "calm", "canyon", "cedar", "cell", "charm", "chill", "cloud", "coral",
            "core", "creek", "crystal", "curl", "dash", "dawn", "dew", "drift", "dusk", "echo",
            "ember", "fern", "field", "flame", "flash", "flow", "fog", "frost", "gale", "gem",
            "ghost", "glow", "grain", "grove", "haze", "heart", "hill", "hush", "ice", "ivy",
            "jade", "jet", "joy", "leaf", "light", "lily", "link", "log", "loop", "lunar",
            "marble", "meadow", "mist", "moss", "motion", "neon", "night", "north", "nova",
            "oak", "ocean", "olive", "orbit", "pebble", "petal", "pine", "pixel", "plume",
            "pond", "pulse", "quartz", "quiet", "rain", "ray", "reef", "ripple", "river",
            "rock", "root", "rose", "sand", "scar", "seed", "shade", "shadow", "shell",
            "shine", "sky", "smoke", "snow", "solar", "song", "sound", "spark", "spirit",
            "spring", "star", "steam", "stone", "storm", "stream", "sugar", "sun", "surf",
            "swirl", "tide", "tiny", "trace", "tree", "vale", "vapor", "wave", "west", "wind",
            "wood", "zen", "zero", "zone", "amber", "apple", "art", "band", "blue", "branch",
            "bronze", "brush", "clay", "comet", "cube", "curve", "dream", "elm", "pearl",
            "agate", "aloe", "alpha", "alpine", "anchor", "angel", "arc", "arch", "arrow", "atlas",
            "azure", "base", "basil", "bead", "bear", "bee", "bell", "bird", "bliss", "block",
            "blush", "boat", "bond", "bone", "book", "boon", "boot", "bow", "box", "brave",
            "bread", "burn", "cake", "camp", "cape", "case", "cave", "chip", "chord", "cider",
            "cliff", "clan", "claw", "clip", "clover", "coals", "coat", "code", "coin", "color",
            "cone", "cool", "cord", "cove", "craft", "crane", "crest", "cross", "crown", "cyan",
            "cycle", "dance", "dare", "dark", "dart", "data", "date", "day", "deep", "deer",
            "dell", "delta", "desk", "dial", "dice", "disk", "dock", "door", "dove", "draw",
            "drop", "drum", "duck", "dune", "dust", "eagle", "earth", "east", "edge", "elite",
            "entry", "epic", "even", "ever", "face", "fact", "fair", "faith", "fall", "fame",
            "fan", "farm", "fast", "fate", "feat", "feel", "film", "fine", "fire", "firm",
            "fish", "flag", "flax", "flint", "float", "flock", "flute", "foam", "focus", "foil",
            "fold", "folk", "font", "food", "foot", "force", "ford", "form", "fort", "fox",
            "free", "fresh", "frog", "fruit", "fume", "fund", "fury", "fuse", "game", "gate",
            "gear", "gene", "gift", "gilt", "glade", "glass", "glen", "globe", "glory", "gold",
            "good", "gown", "grace", "grade", "gram", "grand", "grape", "graph", "grass", "grid",
            "grip", "grit", "grow", "guide", "gulf", "gull", "gust", "halo", "hand", "harbor",
            "harp", "hawk", "hazel", "head", "helm", "help", "hero", "high", "hive", "hold",
            "quack", "bill", "mallard", "feather", "wing", "nest", "swamp", "lake", "egg", "hatch",
            "web", "dive", "acid", "acorn", "acre", "action", "active", "actor", "adapt",
            "add", "adept", "admin", "admit", "adobe", "adopt", "adult", "aeon", "aero",
            "affix", "after", "again", "aged", "agent", "agile", "agree", "ahead", "aid",
            "aim", "alarm", "album", "alert", "alien", "align", "alike", "alive", "alley",
            "alloy", "ally", "aloft", "alone", "along", "altar", "alter", "amaze", "amend",
            "amino", "ample", "angle", "angry", "anime", "ankle", "annex", "anode", "antic",
            "anvil", "aorta", "apex", "aphid", "apply", "apron", "arbor", "area", "arena",
            "argon", "argot", "argue", "arise", "arm", "army", "aroma", "array", "arson",
            "ascot", "ashen", "aside", "ask", "aspen", "assay", "asset", "aster", "astir",
            "atoll", "atone", "attic", "audio", "audit", "auger", "augur", "aunt", "aura",
            "auto", "avail", "avant", "aver", "avert", "avian", "avoid", "await", "awake",
            "award", "aware", "awash", "away", "awful", "axial", "axiom", "axle", "babe",
            "baby", "back", "bacon", "badge", "baffle", "bag", "bail", "bait", "bake",
            "bald", "bale", "ball", "balm", "ban", "bane", "bang", "bank", "bar",
            "barb", "bard", "bare", "barge", "barn", "baron", "bash", "basic", "basin",
            "basis", "bask", "bass", "baste", "batch", "bath", "baton", "bawl", "bay",
            "beach", "beak", "bean", "beat", "beau", "beck", "bed", "beef", "beep",
            "beer", "beet", "beg", "begin", "belt", "bench", "bend", "bent", "berg",
            "berth", "best", "beta", "bias", "bib", "bid", "big", "bike", "bilge",
            "bin", "bind", "bingo", "birch", "birth", "bit", "bite", "black", "blame",
            "bland", "blank", "blast", "bleak", "blend", "bless", "blind", "blink", "blip",
            "blitz", "bloat", "blond", "blood", "blot", "blow", "bluff", "blunt", "blur",
            "boar", "board", "boast", "bode", "body", "bog", "boil", "bold", "bomb",
            "boom", "boost", "booth", "booty", "border", "bore", "born", "boss", "bot",
            "both", "bottle", "bound", "bowl", "boy", "brace", "brag", "braid", "brain",
            "brake", "bran", "brand", "brass", "brat", "brawl", "bray", "break", "bred",
            "breed", "brew", "bribe", "bride", "bridge", "brief", "brig", "brim", "brine",
            "bring", "brink", "brisk", "broad", "broil", "broke", "brood", "broom", "broth",
            "brown", "bruise", "brunt", "brute", "buck", "buddy", "budge", "buff", "bug",
            "buggy", "bugle", "build", "bulb", "bulge", "bulk", "bull", "bully", "bump",
            "bun", "bunch", "bunk", "bunny", "buoy", "bur", "bureau", "burg", "burp",
            "burr", "bury", "bus", "bush", "bust", "busy", "but", "butte", "button",
            "buy", "buzz", "byte", "cab", "cabin", "cable", "cache", "cactus", "cadet",
            "cafe", "cage", "calf", "call", "camel", "camera", "can", "canal", "candy",
            "cane", "cannon", "canoe", "cant", "canvas", "cap", "caper", "capital"
        ];
    }

    // Generate a random integer between 0 (inclusive) and max (exclusive)
    static randInt(max) {
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        return buf[0] % max;
    }

    // Randomize an array in place
    static shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            // Choose a random remaining index
            const j = this.randInt(i + 1);
            // Swap current element with the random one
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    // Generate a random email address
    static generateRandomEmail() {
        // Generate a random token of 10 characters
        const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
        let token = "";
        for (let i = 0; i < 10; i++) {
            token += alphabet[this.randInt(alphabet.length)];
        }
        // Generate a random domain from the list of words
        const domain = `${this.WORDS[this.randInt(this.WORDS.length)]}.com`;
        // Return the email
        return `${token}@${domain}`;
    }

    // Generate a random username
    static generateRandomUsername() {
        // Generate a random word from the list of words
        const word = this.WORDS[this.randInt(this.WORDS.length)];
        // Generate a random number from 0 to 9999
        const num = this.randInt(10000);
        // Return the username
        return `${word}${num}`;
    }

    // Generate a memorable random password (e.g. BlueRiverHawk123)
    static generateRandomPassword() {
        const words = [];
        // Pick 3 random words
        for (let i = 0; i < 3; i++) {
            const word = this.WORDS[this.randInt(this.WORDS.length)];
            // Capitalize first letter
            words.push(word.charAt(0).toUpperCase() + word.slice(1));
        }

        // Add a random 3-digit number (100-999)
        const num = 100 + this.randInt(900);

        return words.join("") + num;
    }
}

export default CredentialGenerator;
