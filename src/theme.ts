// Design tokens for the whole app.
//
// Design language: "boxy" — sharp, squared geometry inspired by the classic
// Lumia tile UI (only the geometry, not the colors). Corners are near-zero,
// separation comes from hairline borders and layered surfaces rather than big
// shadows. Two palettes (light / dark) share identical keys so any screen can
// theme itself from usePrefs().theme.

export type Theme = {
	bg: string;
	bgElevated: string;
	surface: string;
	surface2: string;
	surface3: string;
	border: string;
	borderSoft: string;
	borderStrong: string;

	textPrimary: string;
	textSecondary: string;
	textMuted: string;
	placeholder: string;

	accent: string;
	accentHover: string;
	accentDark: string;
	accentSoft: string;
	onAccent: string;

	positive: string;
	positiveSoft: string;
	negative: string;
	negativeSoft: string;

	heroBg: string;
	heroBorder: string;
	heroText: string;
	heroTextMuted: string;
	heroSubtle: string;
	heroPositive: string;
	heroNegative: string;

	overlay: string;
	tabBar: string;
	tabInactive: string;

	danger: string;
	dangerSoft: string;
	dangerBorder: string;

	shadow: string;
	isDark: boolean;
};

// Boxy radius scale. Small, consistent, intentional — never pill-round.
export const RADII = {
	card: 4,
	control: 3,
	input: 3,
	chip: 3,
	avatar: 4,
	fab: 4,
	tile: 3,
	sheet: 6,
} as const;

// Consistent spacing scale used across screens.
export const SPACE = {
	screen: 18,
	gap: 12,
	card: 16,
} as const;

export const lightTheme: Theme = {
	bg: "#F4F4F5",
	bgElevated: "#FFFFFF",
	surface: "#FFFFFF",
	surface2: "#FAFAFA",
	surface3: "#F1F1F3",
	border: "#E4E4E7",
	borderSoft: "#EEEEF0",
	borderStrong: "#D4D4D8",

	textPrimary: "#18181B",
	textSecondary: "#52525B",
	textMuted: "#A1A1AA",
	placeholder: "#C4C4C8",

	accent: "#C1121F",
	accentHover: "#D62839",
	accentDark: "#9E0F1A",
	accentSoft: "#FBE9EA",
	onAccent: "#FFFFFF",

	positive: "#128A4E",
	positiveSoft: "#E7F6EE",
	negative: "#C1121F",
	negativeSoft: "#FBE9EA",

	heroBg: "#141416",
	heroBorder: "#141416",
	heroText: "#FFFFFF",
	heroTextMuted: "#9A9AA2",
	heroSubtle: "rgba(255,255,255,0.06)",
	heroPositive: "#3FD07F",
	heroNegative: "#F1656A",

	overlay: "rgba(9,9,11,0.5)",
	tabBar: "#FFFFFF",
	tabInactive: "#A1A1AA",

	danger: "#C1121F",
	dangerSoft: "#FBE9EA",
	dangerBorder: "#F0C7CA",

	shadow: "#000000",
	isDark: false,
};

export const darkTheme: Theme = {
	bg: "#0B0B0C",
	bgElevated: "#121214",
	surface: "#18181B",
	surface2: "#202024",
	surface3: "#26262B",
	border: "#2B2B31",
	borderSoft: "#1F1F23",
	borderStrong: "#3A3A42",

	textPrimary: "#F5F5F7",
	textSecondary: "#A0A0A8",
	textMuted: "#6E6E77",
	placeholder: "#55555C",

	accent: "#C1121F",
	accentHover: "#D62839",
	accentDark: "#9E0F1A",
	accentSoft: "rgba(214,40,57,0.15)",
	onAccent: "#FFFFFF",

	positive: "#2FBF71",
	positiveSoft: "rgba(47,191,113,0.14)",
	negative: "#E5484D",
	negativeSoft: "rgba(229,72,77,0.14)",

	heroBg: "#141417",
	heroBorder: "#2B2B31",
	heroText: "#FFFFFF",
	heroTextMuted: "#8A8A92",
	heroSubtle: "rgba(255,255,255,0.05)",
	heroPositive: "#3FD07F",
	heroNegative: "#F1656A",

	overlay: "rgba(0,0,0,0.7)",
	tabBar: "#121214",
	tabInactive: "#6E6E77",

	danger: "#E5484D",
	dangerSoft: "rgba(229,72,77,0.14)",
	dangerBorder: "#402024",

	shadow: "#000000",
	isDark: true,
};

export type ThemeMode = "light" | "dark" | "system";

export type Currency = {
	code: string;
	symbol: string;
	label: string;
};

export const CURRENCIES: Currency[] = [
	{ code: "INR", symbol: "₹", label: "Indian Rupee" },
	{ code: "INR_RS", symbol: "Rs ", label: "Rupee (Rs)" },
	{ code: "USD", symbol: "$", label: "US Dollar" },
	{ code: "EUR", symbol: "€", label: "Euro" },
	{ code: "GBP", symbol: "£", label: "British Pound" },
	{ code: "AED", symbol: "AED ", label: "UAE Dirham" },
];

export const DEFAULT_CURRENCY = CURRENCIES[1]; // "Rs " to match earlier screens

export const formatMoney = (amount: number, symbol: string) =>
	`${symbol}${Math.abs(amount).toFixed(2)}`;

export const formatMoneySigned = (amount: number, symbol: string) =>
	`${amount < 0 ? "-" : "+"}${symbol}${Math.abs(amount).toFixed(2)}`;

export const money = (amount: number) => formatMoney(amount, DEFAULT_CURRENCY.symbol);

// Avatar helpers -----------------------------------------------------------

const AVATAR_ACCENTS = ["#C1121F", "#3F6BD6", "#128A4E", "#B8860B", "#5B4B8A", "#0E7490"];

const getDicebearAvatar = (seed: string) =>
	`https://api.dicebear.com/9.x/adventurer-neutral/png?seed=${encodeURIComponent(seed)}`;

export const getUserAvatar = (
	seedParts: (string | null | undefined)[],
	photoURL?: string | null,
) => {
	if (photoURL && photoURL.trim()) return photoURL;
	const seed = seedParts.find((part) => part && part.trim()) ?? "splytr-user";
	return getDicebearAvatar(seed);
};

export const colorForId = (id: string) => {
	let hash = 0;
	for (let i = 0; i < id.length; i += 1) {
		hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
	}
	return AVATAR_ACCENTS[hash % AVATAR_ACCENTS.length];
};

export const initials = (name?: string | null, email?: string | null) => {
	const source = (name && name.trim()) || (email && email.trim()) || "?";
	const parts = source.split(/\s+/).filter(Boolean);
	if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
	return source.slice(0, 2).toUpperCase();
};

// A restrained lift for genuinely floating elements only (FAB, bottom nav).
// Cards should rely on borders, not shadow.
export const floatShadow = (theme: Theme) => ({
	shadowColor: theme.shadow,
	shadowOffset: { width: 0, height: 6 },
	shadowOpacity: theme.isDark ? 0.5 : 0.14,
	shadowRadius: 16,
	elevation: 10,
});
