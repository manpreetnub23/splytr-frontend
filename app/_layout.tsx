import { Stack, useRootNavigationState, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../src/providers/AuthProvider";
import { PrefsProvider, usePrefs } from "../src/providers/PrefsProvider";
import "./globals.css";

function AuthGate() {
  const { isReady, user } = useAuth();
  const { theme, scheme } = usePrefs();
  const navigationState = useRootNavigationState();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!isReady || !navigationState?.key) {
      return;
    }

    const currentRoute = segments[0];
    const isAuthScreen = currentRoute === "login" || currentRoute === "register";

    if (user && (currentRoute === undefined || isAuthScreen)) {
      router.replace("/home");
    }

    if (!user && currentRoute === "home") {
      router.replace("/login");
    }
  }, [isReady, navigationState?.key, router, segments, user]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.bg }}>
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
          animation: "slide_from_right",
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PrefsProvider>
          <AuthProvider>
            <AuthGate />
          </AuthProvider>
        </PrefsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
