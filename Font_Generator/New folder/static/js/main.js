const sourceText = document.getElementById("sourceText");
const fontGrid = document.getElementById("fontGrid");
const copyToast = document.getElementById("copyToast");
const loadingMore = document.getElementById("loadingMore");
const charCount = document.getElementById("charCount");
const nonLatinHint = document.getElementById("nonLatinHint");

const PLACEHOLDER = "Your Text Here";
const INITIAL_BATCH = 20;
const BATCH_SIZE = 20;
const BENTO_PATTERNS = [
    // Asymmetric spans for a bento-style masonry feel.
    { col: 7, row: 2 },
    { col: 5, row: 1 },
    { col: 4, row: 1 },
    { col: 4, row: 2 },
    { col: 6, row: 1 },
    { col: 3, row: 1 },
    { col: 3, row: 2 },
    { col: 8, row: 1 },
    { col: 4, row: 1 },
    { col: 5, row: 2 },
    { col: 6, row: 1 },
    { col: 3, row: 1 },
];

const LETTERS_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LETTERS_LOWER = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";

// Some Unicode font blocks have "holes": certain letters don't exist at the
// offset-derived codepoints. The PDF requires explicit replacements for those.
const EXCEPTION_MAP = {
    // Style 2: Mathematical Italic
    "Mathematical Italic": {
        h: 0x210e, // ℎ
    },

    // Style 10: Script/Cursive (Decorative Script / Cursive)
    "Decorative Script / Cursive": {
        B: 0x212c, // ℬ
        E: 0x2130, // ℰ
        F: 0x2131, // ℱ
        H: 0x210b, // ℋ
        I: 0x2110, // ℐ
        L: 0x2112, // ℒ
        M: 0x2133, // ℳ
        R: 0x211b, // ℛ
        e: 0x212f, // ℯ
        g: 0x210a, // ℊ
        o: 0x2134, // ℴ
    },

    // Style 12: Fraktur/Gothic (Decorative Fraktur (Gothic))
    "Decorative Fraktur (Gothic)": {
        C: 0x212d, // ℭ
        H: 0x210c, // ℌ
        I: 0x2111, // ℑ
        R: 0x211c, // ℜ
        Z: 0x2128, // ℨ
    },

    // Style 17: Decorative Old English Style (same Gothic-style holes)
    "Decorative Old English Style": {
        C: 0x212d, // ℭ
        H: 0x210c, // ℌ
        I: 0x2111, // ℑ
        R: 0x211c, // ℜ
        Z: 0x2128, // ℨ
    },

    // Style 9: Double Struck (Outline)
    "Double Struck (Outline)": {
        C: 0x2102, // ℂ
        H: 0x210d, // ℍ
        N: 0x2115, // ℕ
        P: 0x2119, // ℙ
        Q: 0x211a, // ℚ
        R: 0x211d, // ℝ
        Z: 0x2124, // ℤ
    },
};

const styleConfig = [
    // Styles 1-42 from your PDF (Font Styles Table)
    { name: "Mathematical Bold", upper: 0x1d400, lower: 0x1d41a, digit: 0x1d7ce },
    { name: "Mathematical Italic", upper: 0x1d434, lower: 0x1d44e },
    { name: "Bold Italic Serif", upper: 0x1d468, lower: 0x1d482 },
    { name: "Sans-Serif Normal", upper: 0x1d5a0, lower: 0x1d5ba, digit: 0x1d7e2 },
    { name: "Sans-Serif Bold", upper: 0x1d5ee, lower: 0x1d608, digit: 0x1d7ec },
    { name: "Sans-Serif Italic", upper: 0x1d622, lower: 0x1d63c },
    { name: "Sans-Serif Bold Italic", upper: 0x1d656, lower: 0x1d670, digit: 0x1d7f6 },
    { name: "Monospace (Typewriter)", upper: 0x1d670, lower: 0x1d68a, digit: 0x1d7f6 },
    { name: "Double Struck (Outline)", upper: 0x1d538, lower: 0x1d552, digit: 0x1d7d8 },
    // PDF style 10 sample (Input: "Abc") => "𝓐𝓫𝓬"
    // i.e. lowercase starts at U+1D4EA (not U+1D4E4).
    { name: "Decorative Script / Cursive", upper: 0x1d4d0, lower: 0x1d4ea },
    // PDF style 11 sample (Input: "Abc") => "𝓪𝓫𝓬"
    // i.e. lowercase also starts at U+1D4EA for correct mapping.
    { name: "Decorative Bold Script", upper: 0x1d4ea, lower: 0x1d4ea },
    { name: "Decorative Fraktur (Gothic)", upper: 0x1d504, lower: 0x1d51e },
    { name: "Decorative Bold Fraktur", upper: 0x1d56c, lower: 0x1d586 },
    { name: "Decorative Small Caps", type: "smallcaps" },
    { name: "Decorative Tiny Text (High)", type: "superscript" },
    { name: "Decorative Subscript", type: "subscript" },
    // PDF: "Specific Gothic Range". The sample output matches Fraktur (Gothic), so
    // we use the same Gothic (Fraktur) Unicode range.
    { name: "Decorative Old English Style", upper: 0x1d504, lower: 0x1d51e },
    { name: "Boxed Bubbles (Circled)", upper: 0x24b6, lower: 0x24d0, circledNumbers: true },
    // PDF style 19: in some fonts, lowercase glyphs may not be present.
    // Fallback to uppercase mapping to avoid tofu blocks.
    { name: "Boxed Dark Bubbles", upper: 0x1f150, lower: 0x1f169, lowerFallbackToUpper: true },
    { name: "Boxed Squares (Framed)", upper: 0x1f130, lower: 0x1f149 },
    // PDF style 21: same lowercase fallback rationale.
    { name: "Boxed Dark Squares", upper: 0x1f170, lower: 0x1f189, lowerFallbackToUpper: true },
    { name: "Boxed Brackets", upper: 0x249c, lower: 0x24b5 },
    { name: "Linear Strikethrough", type: "combine", mark: "\u0336" },
    { name: "Linear Cross-Hatch", type: "combine", mark: "\u033D" },
    { name: "Linear Underline", type: "combine", mark: "\u0332" },
    { name: "Linear Double Underline", type: "combine", mark: "\u0333" },
    { name: "Linear Overline", type: "combine", mark: "\u0305" },
    { name: "Linear Slash Through", type: "combine", mark: "\u0337" },
    { name: "Emoji Heart Sparkle", type: "wrap", left: "♥ ", right: " ♥" },
    { name: "Emoji Star Decoration", type: "wrap", left: "★ ", right: " ★" },
    { name: "Emoji Sparkles", type: "wrap", left: "✨ ", right: " ✨" },
    { name: "Emoji Music Notes", type: "wrap", left: "🎵 ", right: " 🎵" },
    { name: "Emoji Coffee Vibes", type: "wrap", left: "☕ ", right: " ☕" },
    { name: "Special Mirror Text", type: "mirrorReverse" },
    { name: "Special Upside Down", type: "invertReverse" },
    { name: "Special Glitch (Zalgo)", type: "glitch", glitchDepth: 2 },
    { name: "Special Wavy Text", type: "wavy", wavyChar: "≋" },
    { name: "Special Wide (Vaporwave)", type: "wide" },
    { name: "Borders Aesthetic Border", type: "wrap", left: "┊ ", right: " ┊" },
    // PDF style 40: "Wingdings Wrap" (Decoration Symbols). The exact wrapper glyphs
    // were not recoverable from text extraction, so we use a reliable decorative pair.
    { name: "Borders Wingdings Wrap", type: "wrap", left: "(╯°□°）╯ ", right: " ╰(°□°)╯" },
    { name: "Borders Arrow Wrapper", type: "wrap", left: "» ", right: " «" },
    { name: "Borders Diamond Border", type: "wrap", left: "◈ ", right: " ◈" },
];

const superscriptMap = {
    a: "ᵃ", b: "ᵇ", c: "ᶜ", d: "ᵈ", e: "ᵉ", f: "ᶠ", g: "ᵍ", h: "ʰ", i: "ᶦ", j: "ʲ",
    k: "ᵏ", l: "ˡ", m: "ᵐ", n: "ⁿ", o: "ᵒ", p: "ᵖ", q: "q", r: "ʳ", s: "ˢ", t: "ᵗ",
    u: "ᵘ", v: "ᵛ", w: "ʷ", x: "ˣ", y: "ʸ", z: "ᶻ",
    A: "ᴬ", B: "ᴮ", C: "ᶜ", D: "ᴰ", E: "ᴱ", F: "ᶠ", G: "ᴳ", H: "ᴴ", I: "ᴵ", J: "ᴶ",
    K: "ᴷ", L: "ᴸ", M: "ᴹ", N: "ᴺ", O: "ᴼ", P: "ᴾ", Q: "Q", R: "ᴿ", S: "ˢ", T: "ᵀ",
    U: "ᵁ", V: "ⱽ", W: "ᵂ", X: "ˣ", Y: "ʸ", Z: "ᶻ",
    0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹",
};

const subscriptMap = {
    a: "ₐ", e: "ₑ", h: "ₕ", i: "ᵢ", j: "ⱼ", k: "ₖ", l: "ₗ", m: "ₘ", n: "ₙ", o: "ₒ",
    p: "ₚ", r: "ᵣ", s: "ₛ", t: "ₜ", u: "ᵤ", v: "ᵥ", x: "ₓ",
    0: "₀", 1: "₁", 2: "₂", 3: "₃", 4: "₄", 5: "₅", 6: "₆", 7: "₇", 8: "₈", 9: "₉",
    // PDF example for "Decorative Subscript" (Input: "Abc") => "ₐ♭꜀"
    b: "♭",
    c: "꜀",
};

const smallCapsMap = {
    a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ꜰ", g: "ɢ", h: "ʜ", i: "ɪ", j: "ᴊ",
    k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ", s: "ꜱ", t: "ᴛ",
    u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ",
};

const mirrorMap = {
    a: "ɒ", b: "d", c: "ɔ", d: "b", e: "ɘ", f: "Ꮈ", g: "ǫ", h: "ʜ", i: "i", j: "ꞁ",
    k: "ʞ", l: "l", m: "ɯ", n: "u", o: "o", p: "q", q: "p", r: "ɿ", s: "ƨ", t: "t",
    u: "n", v: "v", w: "w", x: "x", y: "ʏ", z: "z",
};

const invertMap = {
    // Lowercase (common upside-down mappings)
    a: "ɐ",
    b: "q",
    c: "ɔ",
    d: "p",
    e: "ǝ",
    f: "ɟ",
    g: "ɓ",
    h: "ɥ",
    i: "ᴉ",
    j: "ɾ",
    k: "ʞ",
    l: "ן",
    m: "ɯ",
    n: "u",
    o: "o",
    p: "d",
    q: "b",
    r: "ɹ",
    s: "s",
    t: "ʇ",
    u: "n",
    v: "ʌ",
    w: "ʍ",
    x: "x",
    y: "ʎ",
    z: "z",

    // Uppercase
    A: "∀",
    B: "𐐒",
    C: "Ɔ",
    D: "ᗡ",
    E: "Ǝ",
    F: "Ⅎ",
    G: "⅁",
    H: "H",
    I: "I",
    J: "ſ",
    K: "ʞ",
    L: "˥",
    M: "W",
    N: "N",
    O: "O",
    P: "Ԁ",
    Q: "Q",
    R: "Я",
    S: "S",
    T: "┴",
    U: "∩",
    V: "Λ",
    W: "M",
    X: "X",
    Y: "⅄",
    Z: "Z",

    // Digits
    0: "0",
    1: "Ɩ",
    2: "ᄅ",
    3: "Ɛ",
    4: "ㄣ",
    5: "5",
    6: "9",
    7: "ㄭ",
    8: "8",
    9: "6",
};

const circledNumberMap = {
    0: "⓪", 1: "①", 2: "②", 3: "③", 4: "④", 5: "⑤", 6: "⑥", 7: "⑦", 8: "⑧", 9: "⑨",
};

let renderCount = 0;
let lastInput = "";
let isRendering = false;
let lazyObserver = null;
const COMPAT_DISCLAIMER =
    "Your device may not support some high-range Unicode glyphs (boxes/tofu may appear).";

function mapAlphaNumeric(char, config) {
    if (config.type === "identity") return char;

    // First: apply PDF-specified hole/exception replacements.
    const styleExceptions = EXCEPTION_MAP[config.name];
    if (styleExceptions) {
        const ex = styleExceptions[char];
        if (typeof ex === "number") return String.fromCodePoint(ex);
    }

    if (config.digitOnly && !DIGITS.includes(char)) return char;

    if (config.type === "superscript") return superscriptMap[char] || superscriptMap[char.toLowerCase()] || char;
    if (config.type === "subscript") return subscriptMap[char] || subscriptMap[char.toLowerCase()] || char;
    if (config.type === "smallcaps") return smallCapsMap[char.toLowerCase()] || char;
    if (config.type === "wide") return char === " " ? " " : String.fromCodePoint(char.codePointAt(0) + 0xfee0);
    if (config.type === "mirror") return mirrorMap[char.toLowerCase()] || char;
    if (config.type === "combine") return char === " " ? " " : `${char}${config.mark}`;

    if (config.type === "wrap") return char;

    if (LETTERS_UPPER.includes(char) && config.upper) {
        return String.fromCodePoint(config.upper + (char.charCodeAt(0) - 65));
    }
    if (LETTERS_LOWER.includes(char)) {
        // Some Unicode blocks provide better glyph coverage for the uppercase
        // symbols than the lowercase variants. If requested, fall back to the
        // uppercase range for lowercase input instead of returning tofu.
        if (config.lowerFallbackToUpper && config.upper) {
            return String.fromCodePoint(config.upper + (char.charCodeAt(0) - 97));
        }
        if (config.lower) {
            return String.fromCodePoint(config.lower + (char.charCodeAt(0) - 97));
        }
    }
    if (DIGITS.includes(char)) {
        if (config.circledNumbers) return circledNumberMap[char] || char;
        if (config.digit) return String.fromCodePoint(config.digit + Number(char));
    }
    return char;
}

function applyStyle(text, config) {
    if (!text) return PLACEHOLDER;

    if (config.type === "mirrorReverse") {
        return [...text]
            .reverse()
            .map((char) => mirrorMap[char.toLowerCase()] || char)
            .join("");
    }

    if (config.type === "invertReverse") {
        return [...text]
            .reverse()
            .map((char) => invertMap[char] || invertMap[char.toLowerCase()] || char)
            .join("");
    }

    if (config.type === "glitch") {
        const start = 0x0300;
        const end = 0x036f;
        const count = end - start + 1;
        const depth = Number(config.glitchDepth || 2);

        return [...text]
            .map((char, idx) => {
                if (char === " ") return " ";
                const cp = char.codePointAt(0) || 0;
                // Leave non-Latin glyphs untouched (PDF requirement).
                if (cp > 0x7f) return char;
                const code = cp;
                let out = char;
                for (let d = 0; d < depth; d++) {
                    const markPoint = start + ((idx + 1) * (d + 3) * 17 + code) % count;
                    out += String.fromCodePoint(markPoint);
                }
                return out;
            })
            .join("");
    }

    if (config.type === "wavy") {
        const wave = config.wavyChar || "≋";
        const chars = [...text];
        let out = "";
        for (let i = 0; i < chars.length; i++) {
            const ch = chars[i];
            if (ch === " ") {
                out += ch;
                continue;
            }
            const cp = ch.codePointAt(0) || 0;
            if (cp > 0x7f) {
                out += ch; // leave non-latin unchanged
                continue;
            }
            out += `${wave}${ch}`;
        }
        const last = chars[chars.length - 1];
        const lastCp = last ? last.codePointAt(0) || 0 : 0;
        if (last && last !== " " && lastCp <= 0x7f) out += wave; // matches PDF sample for "Abc"
        return out;
    }

    if (config.type === "wrap") return `${config.left}${text}${config.right}`;
    return [...text].map((char) => mapAlphaNumeric(char, config)).join("");
}

function hasNonLatin(text) {
    return /[^\u0000-\u007f]/.test(text);
}

function getBentoSpans(globalIndex) {
    const pattern = BENTO_PATTERNS[globalIndex % BENTO_PATTERNS.length];
    return pattern || { col: 6, row: 1 };
}

function asyncCopyToClipboard(text) {
    if (navigator.clipboard?.writeText) {
        return navigator.clipboard.writeText(text);
    }

    return new Promise((resolve, reject) => {
        try {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.setAttribute("readonly", "true");
            ta.style.position = "fixed";
            ta.style.left = "-9999px";
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand("copy");
            document.body.removeChild(ta);
            if (!ok) reject(new Error("execCommand copy failed"));
            else resolve();
        } catch (err) {
            reject(err);
        }
    });
}

function spawnRipple(event, button) {
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    button.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 650);
}

function buildCard(config, source, globalIndex) {
    const converted = applyStyle(source, config);
    const card = document.createElement("article");
    card.className = "font-card";
    const { col, row } = getBentoSpans(globalIndex);
    card.style.setProperty("--col-span", String(col));
    card.style.setProperty("--row-span", String(row));
    card.style.setProperty("--enter-delay", `${(globalIndex % 60) * 30}ms`);
    card.innerHTML = `
        <div class="font-card-header">
            <span class="font-name">${config.name}</span>
            <button class="copy-btn" type="button">Copy</button>
        </div>
        <p class="font-output">${converted}</p>
    `;

    const btn = card.querySelector(".copy-btn");
    btn.addEventListener("click", async (e) => {
        spawnRipple(e, btn);
        try {
            await asyncCopyToClipboard(converted);
            showToast("Copied!");
        } catch (err) {
            showToast("Copy failed");
        }
    });
    return card;
}

function renderChunk(reset = false) {
    if (isRendering) return;
    isRendering = true;

    if (reset) {
        renderCount = 0;
        fontGrid.innerHTML = "";
        // Ensure the lazy-loading sentinel is observable immediately.
        loadingMore.hidden = false;
    }

    const source = sourceText.value.trim();
    if (!source) {
        nonLatinHint.textContent = "";
    } else if (hasNonLatin(source)) {
        nonLatinHint.textContent = "Some non-Latin characters may remain unchanged.";
    } else if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "")) {
        nonLatinHint.textContent = COMPAT_DISCLAIMER;
    } else {
        nonLatinHint.textContent = "";
    }

    const next = styleConfig.slice(renderCount, renderCount + BATCH_SIZE);
    if (next.length === 0) {
        loadingMore.hidden = true;
        isRendering = false;
        return;
    }

    // Ensure the sentinel is not `hidden` while we append new cards.
    loadingMore.hidden = false;

    const fragment = document.createDocumentFragment();
    next.forEach((style, idx) => {
        fragment.appendChild(buildCard(style, source, renderCount + idx));
    });

    // Append in the next frame to avoid layout jank.
    requestAnimationFrame(() => {
        fontGrid.appendChild(fragment);
        renderCount += next.length;
        loadingMore.hidden = renderCount >= styleConfig.length;
        isRendering = false;
    });
}

function showToast(text) {
    copyToast.textContent = text;
    copyToast.classList.remove("show");
    // Restart animation so each copy action feels immediate.
    void copyToast.offsetWidth;
    copyToast.classList.add("show");
}

function onInputChange() {
    const value = sourceText.value;
    charCount.textContent = `${value.length} / 280`;
    if (value === lastInput) return;
    lastInput = value;
    renderChunk(true);
}

function setupLazyLoading() {
    if (!("IntersectionObserver" in window)) {
        // Fallback: keep functional behavior on older browsers.
        window.addEventListener("scroll", () => {
            const nearBottom =
                window.innerHeight + window.scrollY >= document.body.offsetHeight - 180;
            if (!nearBottom) return;
            if (renderCount >= styleConfig.length) return;
            loadingMore.hidden = false;
            renderChunk(false);
        });
        return;
    }

    loadingMore.hidden = false;

    lazyObserver = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                if (renderCount >= styleConfig.length) return;
                renderChunk(false);
            }
        },
        { root: null, rootMargin: "360px 0px", threshold: 0.01 }
    );

    lazyObserver.observe(loadingMore);
}

function init() {
    sourceText.addEventListener("input", onInputChange);
    renderChunk(true);
    setupLazyLoading();
}

init();
