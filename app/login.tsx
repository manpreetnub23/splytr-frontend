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
  signInWithEmailAndPassword,
  signInWithCredential,
} from "firebase/auth";
import { auth } from "../src/firebase/config";
import { getFirebaseAuthMessage } from "../src/firebase/authErrors";

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const useProxy = Constants.appOwnership === "expo";
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;
  const owner = Constants.expoConfig?.owner;
  const slug = Constants.expoConfig?.slug;
  const projectNameForProxy = owner && slug ? `@${owner}/${slug}` : undefined;
  const proxyRedirectUri =
    projectNameForProxy ? `https://auth.expo.io/${projectNameForProxy}` : undefined;
  const redirectUri = useProxy
    ? proxyRedirectUri ?? makeRedirectUri()
    : makeRedirectUri({ scheme: "splytr" });
  const clientId = useProxy
    ? extra.googleExpoClientId || extra.googleWebClientId
    : (Platform.OS === "ios"
        ? extra.googleIosClientId
        : Platform.OS === "android"
          ? extra.googleAndroidClientId
          : Platform.OS === "web"
            ? extra.googleWebClientId
            : extra.googleExpoClientId) || extra.googleWebClientId;

  const [request, , promptAsync] = useAuthRequest(
    {
      clientId: clientId ?? "",
      responseType: ResponseType.IdToken,
      redirectUri,
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
    extra.googleWebClientId ||
    extra.googleIosClientId ||
    extra.googleAndroidClientId ||
    extra.googleExpoClientId
  );

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing details", "Enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/home");
    } catch (error) {
      Alert.alert("Login failed", getFirebaseAuthMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!hasGoogleConfig) {
      Alert.alert(
        "Google login needs configuration",
        "Add Google OAuth client IDs in app.json under expo.extra (googleExpoClientId/googleIosClientId/googleAndroidClientId/googleWebClientId)."
      );
      return;
    }

    if (!clientId) {
      Alert.alert("Google login failed", "Google client ID is missing for this platform.");
      return;
    }

    if (useProxy && !proxyRedirectUri) {
      Alert.alert(
        "Google login config missing",
        "Set expo.owner and expo.slug in app.json. Redirect URI should be like https://auth.expo.io/@your-username/slpytr"
      );
      return;
    }

    setLoading(true);

    try {
      const result = useProxy && request?.url && projectNameForProxy
        ? await promptAsync({
            url: `https://auth.expo.io/${projectNameForProxy}/start?${new URLSearchParams({
              authUrl: request.url,
              returnUrl: redirectUri,
            }).toString()}`,
          })
        : await promptAsync();

      if (result.type !== "success") {
        if (result.type !== "cancel") {
          Alert.alert("Google login failed", "Google sign-in did not complete.");
        }
        return;
      }

      const idToken = typeof result.params?.id_token === "string" ? result.params.id_token : undefined;

      if (!idToken) {
        Alert.alert("Google login failed", "No Google ID token was returned.");
        return;
      }

      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
      router.replace("/home");
    } catch (error) {
      Alert.alert("Google login failed", getFirebaseAuthMessage(error));
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
            Welcome back
          </Text>
          <Text className="mb-3 text-4xl font-extrabold text-white">Log in</Text>
          <Text className="mb-10 text-base leading-7 text-zinc-400">
            Sign in with Firebase email/password or Google.
          </Text>

          <View className="gap-4">
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
            onPress={handleLogin}
          >
            <Text className="text-center text-base font-bold text-white">
              {loading ? "Signing in..." : "Log in"}
            </Text>
          </Pressable>

          <Pressable
            className="mt-4 rounded-2xl border border-zinc-700 px-6 py-4"
            disabled={loading}
            onPress={handleGoogleLogin}
          >
            <Text className="text-center text-base font-bold text-zinc-100">Continue with Google</Text>
          </Pressable>

          <Text className="mt-8 text-center text-zinc-400">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-white">
              Register
            </Link>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
