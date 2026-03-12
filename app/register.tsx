import { useState } from "react";
import { Link, useRouter } from "expo-router";
import Constants from "expo-constants";
import { makeRedirectUri, ResponseType, useAuthRequest } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithCredential,
  updateProfile,
} from "firebase/auth";
import { auth } from "../src/firebase/config";
import { getFirebaseAuthMessage } from "../src/firebase/authErrors";

WebBrowser.maybeCompleteAuthSession();

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;
  const clientId =
    (Platform.OS === "ios"
      ? extra.googleIosClientId
      : Platform.OS === "android"
        ? extra.googleAndroidClientId
        : Platform.OS === "web"
          ? extra.googleWebClientId
          : extra.googleExpoClientId) || extra.googleExpoClientId;

  const [, , promptAsync] = useAuthRequest(
    {
      clientId: clientId ?? "",
      responseType: ResponseType.IdToken,
      redirectUri: makeRedirectUri({ scheme: "splytrfrontend" }),
      usePKCE: false,
      extraParams: { nonce: "splytr_nonce" },
      scopes: ["openid", "profile", "email"],
    },
    {
      authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenEndpoint: "https://oauth2.googleapis.com/token",
      revocationEndpoint: "https://oauth2.googleapis.com/revoke",
    }
  );

  const hasGoogleConfig = Boolean(
    extra.googleExpoClientId ||
      extra.googleIosClientId ||
      extra.googleAndroidClientId ||
      extra.googleWebClientId
  );

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert("Missing details", "Enter your name, email, and password.");
      return;
    }

    setLoading(true);

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      await updateProfile(credential.user, {
        displayName: name.trim(),
      });

      router.replace("/home");
    } catch (error) {
      Alert.alert("Registration failed", getFirebaseAuthMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    if (!hasGoogleConfig) {
      Alert.alert(
        "Google login needs configuration",
        "Add Google OAuth client IDs in app.json under expo.extra (googleExpoClientId/googleIosClientId/googleAndroidClientId/googleWebClientId)."
      );
      return;
    }

    if (!clientId) {
      Alert.alert("Google sign-up failed", "Google client ID is missing for this platform.");
      return;
    }

    setLoading(true);

    try {
      const result = await promptAsync();

      if (result.type !== "success") {
        if (result.type !== "cancel") {
          Alert.alert("Google sign-up failed", "Google sign-in did not complete.");
        }
        return;
      }

      const idToken = typeof result.params?.id_token === "string" ? result.params.id_token : undefined;

      if (!idToken) {
        Alert.alert("Google sign-up failed", "No Google ID token was returned.");
        return;
      }

      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
      router.replace("/home");
    } catch (error) {
      Alert.alert("Google sign-up failed", getFirebaseAuthMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-black"
    >
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-grow justify-center px-6 py-12">
          <Text className="mb-3 text-sm font-semibold uppercase tracking-[3px] text-red-500">
            New account
          </Text>
          <Text className="mb-3 text-4xl font-extrabold text-white">Register</Text>
          <Text className="mb-10 text-base leading-7 text-zinc-400">
            Create an account with Firebase and keep your session persisted on device.
          </Text>

          <View className="gap-4">
            <TextInput
              placeholder="Full name"
              placeholderTextColor="#71717a"
              value={name}
              onChangeText={setName}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-white"
            />

            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="Email"
              placeholderTextColor="#71717a"
              value={email}
              onChangeText={setEmail}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-white"
            />

            <TextInput
              placeholder="Password"
              placeholderTextColor="#71717a"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-white"
            />
          </View>

          <Pressable
            className={`mt-6 rounded-2xl px-6 py-4 ${loading ? "bg-red-500/60" : "bg-red-500"}`}
            disabled={loading}
            onPress={handleRegister}
          >
            <Text className="text-center text-base font-bold text-white">
              {loading ? "Creating account..." : "Create account"}
            </Text>
          </Pressable>

          <Pressable
            className="mt-4 rounded-2xl border border-zinc-700 px-6 py-4"
            disabled={loading}
            onPress={handleGoogleRegister}
          >
            <Text className="text-center text-base font-bold text-zinc-100">Continue with Google</Text>
          </Pressable>

          <Text className="mt-8 text-center text-zinc-400">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-white">
              Log in
            </Link>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
