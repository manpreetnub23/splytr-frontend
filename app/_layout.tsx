import { Stack, useRootNavigationState, useRouter, useSegments } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../src/providers/AuthProvider";
import "./globals.css";

function AuthGate() {
  const { isReady, user } = useAuth();
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
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator color="#ef4444" size="large" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
