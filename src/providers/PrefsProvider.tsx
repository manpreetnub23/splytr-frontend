import AsyncStorage from "@react-native-async-storage/async-storage";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useColorScheme } from "react-native";
import {
	CURRENCIES,
	DEFAULT_CURRENCY,
	darkTheme,
	formatMoney,
	formatMoneySigned,
	lightTheme,
	type Currency,
	type Theme,
	type ThemeMode,
} from "../theme";

const MODE_KEY = "splytr.theme.mode";
const CURRENCY_KEY = "splytr.currency.code";

type PrefsContextValue = {
	ready: boolean;
	mode: ThemeMode;
	setMode: (mode: ThemeMode) => void;
	scheme: "light" | "dark";
	theme: Theme;
	currency: Currency;
	setCurrencyCode: (code: string) => void;
	money: (amount: number) => string;
	moneySigned: (amount: number) => string;
};

const PrefsContext = createContext<PrefsContextValue | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
	const systemScheme = useColorScheme();
	const [mode, setModeState] = useState<ThemeMode>("system");
	const [currencyCode, setCurrencyCodeState] = useState<string>(DEFAULT_CURRENCY.code);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		const load = async () => {
			try {
				const [savedMode, savedCurrency] = await Promise.all([
					AsyncStorage.getItem(MODE_KEY),
					AsyncStorage.getItem(CURRENCY_KEY),
				]);
				if (savedMode === "light" || savedMode === "dark" || savedMode === "system") {
					setModeState(savedMode);
				}
				if (savedCurrency && CURRENCIES.some((c) => c.code === savedCurrency)) {
					setCurrencyCodeState(savedCurrency);
				}
			} finally {
				setReady(true);
			}
		};
		void load();
	}, []);

	const setMode = (next: ThemeMode) => {
		setModeState(next);
		void AsyncStorage.setItem(MODE_KEY, next);
	};

	const setCurrencyCode = (code: string) => {
		setCurrencyCodeState(code);
		void AsyncStorage.setItem(CURRENCY_KEY, code);
	};

	const scheme: "light" | "dark" =
		mode === "system" ? (systemScheme === "dark" ? "dark" : "light") : mode;

	const value = useMemo<PrefsContextValue>(() => {
		const theme = scheme === "dark" ? darkTheme : lightTheme;
		const currency = CURRENCIES.find((c) => c.code === currencyCode) ?? DEFAULT_CURRENCY;
		return {
			ready,
			mode,
			setMode,
			scheme,
			theme,
			currency,
			setCurrencyCode,
			money: (amount: number) => formatMoney(amount, currency.symbol),
			moneySigned: (amount: number) => formatMoneySigned(amount, currency.symbol),
		};
	}, [ready, mode, scheme, currencyCode]);

	return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
	const ctx = useContext(PrefsContext);
	if (!ctx) {
		throw new Error("usePrefs must be used within a PrefsProvider");
	}
	return ctx;
}
