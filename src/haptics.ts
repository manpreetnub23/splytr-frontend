import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

// Thin, crash-proof wrappers around expo-haptics. No-ops on web and never throw.
const safe = (fn: () => Promise<unknown>) => {
	if (Platform.OS === "web") return;
	try {
		void fn();
	} catch {
		// Haptics are best-effort; ignore failures on unsupported devices.
	}
};

export const tapLight = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
export const tapMedium = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
export const tapSelection = () => safe(() => Haptics.selectionAsync());
export const notifySuccess = () =>
	safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
export const notifyError = () =>
	safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
export const notifyWarning = () =>
	safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
