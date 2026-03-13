import { getApp, getApps, initializeApp } from "firebase/app";
import * as firebaseAuth from "firebase/auth";
import { getAuth, initializeAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// `getReactNativePersistence` ships only in Firebase's React Native build, so
// it's absent from the published web typings. Metro resolves it at runtime on
// native; read it dynamically so TypeScript stays happy on all platforms.
const getReactNativePersistence = (
	firebaseAuth as unknown as {
		getReactNativePersistence?: (storage: unknown) => unknown;
	}
).getReactNativePersistence;

const firebaseConfig = {
	apiKey: "AIzaSyAA-6VTC_kwBtJBYGFzIxZU9vclh8ZHQqc",
	authDomain: "splytr-new.firebaseapp.com",
	projectId: "splytr-new",
	storageBucket: "splytr-new.firebasestorage.app",
	messagingSenderId: "1063893251286",
	appId: "1:1063893251286:web:e2311a9b09e477ff740577",
	measurementId: "G-PL2JE6K4BK",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const initNativeAuth = () => {
	try {
		if (getReactNativePersistence) {
			return initializeAuth(app, {
				persistence: getReactNativePersistence(AsyncStorage) as never,
			});
		}
		return initializeAuth(app);
	} catch {
		return getAuth(app);
	}
};

export const auth = Platform.OS === "web" ? getAuth(app) : initNativeAuth();

export default app;
