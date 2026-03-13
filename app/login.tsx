import { makeRedirectUri, ResponseType, useAuthRequest } from "expo-auth-session";
import Constants from "expo-constants";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { buildExpoProxyStartUrl, buildGoogleAuthRuntime } from "../src/auth/googleAuth";
import { getFirebaseAuthMessage } from "../src/firebase/authErrors";
import { auth } from "../src/firebase/config";

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get("window");

function LoginIllustration() {
  return (
    <Svg width={width - 56} height={140} viewBox="0 0 320 140">
      <Ellipse cx="160" cy="132" rx="120" ry="8" fill="#C1121F" opacity="0.05" />

      <G>
        <Rect x="118" y="62" width="52" height="58" rx="14" fill="#818cf8" />
        <Circle cx="144" cy="50" r="22" fill="#c7d2fe" />
        <Rect x="122" y="30" width="44" height="16" rx="8" fill="#1c1917" />
        <Circle cx="136" cy="48" r="3.5" fill="#1c1917" />
        <Circle cx="152" cy="48" r="3.5" fill="#1c1917" />
        <Circle cx="137.5" cy="46.5" r="1.2" fill="white" />
        <Circle cx="153.5" cy="46.5" r="1.2" fill="white" />
        <Path d="M136 57 Q144 64 152 57" stroke="#3730a3" strokeWidth="2" fill="none" strokeLinecap="round" />
        <Rect x="96" y="70" width="24" height="11" rx="5.5" fill="#c7d2fe" />
        <Rect x="168" y="70" width="24" height="11" rx="5.5" fill="#c7d2fe" />
        <Rect x="122" y="112" width="18" height="22" rx="9" fill="#818cf8" />
        <Rect x="148" y="112" width="18" height="22" rx="9" fill="#818cf8" />
        <Ellipse cx="131" cy="134" rx="12" ry="6" fill="#1c1917" />
        <Ellipse cx="157" cy="134" rx="12" ry="6" fill="#1c1917" />
      </G>

      <G>
        <Rect x="100" y="58" width="34" height="52" rx="6" fill="#1c1917" />
        <Rect x="103" y="62" width="28" height="40" rx="4" fill="#f0fdf4" />
        <Circle cx="117" cy="78" r="10" fill="#22c55e" opacity="0.2" />
        <Path d="M111 78 L115 82 L123 74" stroke="#22c55e" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Rect x="107" y="90" width="20" height="3" rx="1.5" fill="#d1d5db" />
        <Rect x="110" y="95" width="14" height="3" rx="1.5" fill="#e5e7eb" />
        <Circle cx="117" cy="106" r="3" fill="#374151" />
      </G>

      <Circle cx="58" cy="50" r="16" fill="#fbbf24" opacity="0.95" />
      <Circle cx="246" cy="108" r="8" fill="#fbbf24" opacity="0.5" />
      <Path d="M210 30 L212 24 L214 30 L220 32 L214 34 L212 40 L210 34 L204 32 Z" fill="#C1121F" opacity="0.3" />
      <Path d="M86 32 L87.5 27 L89 32 L94 33.5 L89 35 L87.5 40 L86 35 L81 33.5 Z" fill="#fbbf24" opacity="0.4" />
      <Path
        d="M80 70 Q144 20 210 70"
        stroke="#C1121F"
        strokeWidth="1.5"
        strokeDasharray="5,4"
        fill="none"
        opacity="0.25"
      />
    </Svg>
  );
}

function GoogleGIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.44a5.51 5.51 0 0 1-2.39 3.62v3h3.86c2.26-2.08 3.58-5.15 3.58-8.86Z"
      />
      <Path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.86-3c-1.07.72-2.43 1.15-4.07 1.15-3.13 0-5.79-2.12-6.74-4.96H1.27v3.09A11.99 11.99 0 0 0 12 24Z"
      />
      <Path
        fill="#FBBC05"
        d="M5.26 14.29A7.2 7.2 0 0 1 4.88 12c0-.79.14-1.55.38-2.29V6.62H1.27A11.99 11.99 0 0 0 0 12c0 1.93.46 3.76 1.27 5.38l3.99-3.09Z"
      />
      <Path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.35.6 4.6 1.79l3.45-3.45C17.94 1.15 15.23 0 12 0A11.99 11.99 0 0 0 1.27 6.62l3.99 3.09c.95-2.84 3.61-4.94 6.74-4.94Z"
      />
    </Svg>
  );
}

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;
  const authCallbackUri = makeRedirectUri({ path: "expo-auth-session" });
  const runtimePlatform: "ios" | "android" | "web" | "default" =
    Platform.OS === "ios" || Platform.OS === "android" || Platform.OS === "web"
      ? Platform.OS
      : "default";

  const {
    projectNameForProxy,
    proxyRedirectUri,
    redirectUri,
    useProxyRedirect,
    clientId,
  } = buildGoogleAuthRuntime({
    appOwnership: Constants.appOwnership,
    owner: Constants.expoConfig?.owner,
    slug: Constants.expoConfig?.slug,
    platform: runtimePlatform,
    appReturnUri: authCallbackUri,
    nativeRedirectUri: makeRedirectUri({ scheme: "splytr" }),
    extra,
  });

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
      Alert.alert("Google login needs configuration", "Add Google OAuth client IDs in app.json.");
      return;
    }

    if (!clientId) {
      Alert.alert("Google login failed", "Google client ID is missing for this platform.");
      return;
    }

    if (!request) {
      Alert.alert("Google login failed", "Auth request is still loading. Try again.");
      return;
    }

    setLoading(true);
    try {
      let resultUrl = "";
      let resultIdToken = "";
      let resultError = "";

      if (Platform.OS === "web" && request.url) {
        window.location.assign(request.url);
        return;
      }

      if (useProxyRedirect && request.url && projectNameForProxy && proxyRedirectUri) {
        const startUrl = buildExpoProxyStartUrl({
          requestUrl: request.url,
          projectNameForProxy,
          proxyRedirectUri,
          appReturnUri: authCallbackUri,
        });

        const sessionResult = await WebBrowser.openAuthSessionAsync(startUrl, authCallbackUri);
        if (sessionResult.type !== "success") {
          if (sessionResult.type !== "cancel") {
            Alert.alert("Google login failed", `Google sign-in did not complete (${sessionResult.type}).`);
          }
          return;
        }

        resultUrl = sessionResult.url;
        const [withoutHash, hashPart = ""] = resultUrl.split("#");
        const queryPart = withoutHash.includes("?") ? withoutHash.split("?")[1] ?? "" : "";
        const hashParams = new URLSearchParams(hashPart);
        const queryParams = new URLSearchParams(queryPart);

        resultIdToken = hashParams.get("id_token") ?? queryParams.get("id_token") ?? "";
        resultError = hashParams.get("error") ?? queryParams.get("error") ?? "";
      } else {
        const result = await promptAsync();

        if (result.type !== "success") {
          if (result.type === "dismiss") {
            Alert.alert(
              "Google login cancelled",
              "The sign-in popup was closed or blocked. Allow popups and try again."
            );
            return;
          }
          if (result.type !== "cancel") {
            Alert.alert("Google login failed", `Google sign-in did not complete (${result.type}).`);
          }
          return;
        }

        resultUrl = typeof result.url === "string" ? result.url : "";
        resultIdToken = typeof result.params?.id_token === "string" ? result.params.id_token : "";
        resultError = typeof result.params?.error === "string" ? result.params.error : "";
      }

      if (resultError) {
        Alert.alert("Google login failed", resultError);
        return;
      }

      if (resultIdToken) {
        const credential = GoogleAuthProvider.credential(resultIdToken);
        await signInWithCredential(auth, credential);
        router.replace("/home");
        return;
      }

      const callbackParams: Record<string, string> = {};
      if (resultUrl) callbackParams.url = encodeURIComponent(resultUrl);
      if (resultIdToken) callbackParams.id_token = resultIdToken;
      if (resultError) callbackParams.error = resultError;

      router.replace({
        pathname: "/expo-auth-session",
        params: callbackParams,
      });
    } catch (error) {
      Alert.alert("Google login failed", getFirebaseAuthMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field: string) => ({
    borderWidth: 1.5,
    borderColor: focusedField === field ? "#C1121F" : "#e4e4e7",
    borderRadius: 3,
    shadowColor: focusedField === field ? "#C1121F" : "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: focusedField === field ? 0.1 : 0.04,
    shadowRadius: 8,
    elevation: focusedField === field ? 3 : 1,
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-[#f4f4f5]"
    >
      <View className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-red-500 opacity-[0.06]" />
      <View className="absolute -left-16 bottom-40 h-52 w-52 rounded-full bg-red-400 opacity-[0.04]" />

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className="flex-1 px-7 pb-10 pt-14">
          <View className="flex-row items-center">
            <Image
              source={require("../assets/images/icon.png")}
              className="h-10 w-10 rounded-[3px]"
              resizeMode="contain"
            />
            <Text className="ml-2.5 text-xl font-extrabold tracking-tight text-zinc-900">
              splytr
            </Text>
          </View>

          <View className="mt-6 items-center">
            <LoginIllustration />
          </View>

          <View className="mt-4">
            <Text className="text-[36px] font-black leading-tight tracking-tight text-zinc-900">
              Welcome{"\n"}back.
            </Text>
            <Text className="mt-2 text-sm leading-6 text-zinc-400">
              Sign in to continue splitting bills.
            </Text>
          </View>

          <View className="mt-6">
            <View className="mb-4">
              <Text className="mb-2 text-xs font-semibold tracking-widest text-zinc-400">
                EMAIL
              </Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor="#d4d4d8"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                className="bg-white px-4 py-4 text-base text-zinc-900"
                style={inputStyle("email")}
              />
            </View>

            <View className="mb-2">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-xs font-semibold tracking-widest text-zinc-400">
                  PASSWORD
                </Text>
                <Pressable>
                  <Text className="text-xs font-semibold text-red-500">Forgot password?</Text>
                </Pressable>
              </View>
              <TextInput
                placeholder="********"
                placeholderTextColor="#d4d4d8"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                className="bg-white px-4 py-4 text-base text-zinc-900"
                style={inputStyle("password")}
              />
            </View>
          </View>

          <Pressable
            disabled={loading}
            onPress={handleLogin}
            style={({ pressed }) => ({
              marginTop: 20,
              opacity: pressed || loading ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <View
              className="items-center rounded-[3px] bg-[#C1121F] py-5 mt-5"
              style={{
                shadowColor: "#C1121F",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              <Text className="text-base font-bold tracking-wide text-white">
                {loading ? "Signing in..." : "Sign in"}
              </Text>
            </View>
          </Pressable>

          <View className="my-5 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-zinc-200" />
            <Text className="text-xs font-medium text-zinc-400">or continue with</Text>
            <View className="h-px flex-1 bg-zinc-200" />
          </View>

          <Pressable
            disabled={loading}
            onPress={handleGoogleLogin}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <View
              className="flex-row items-center justify-center gap-3 rounded-[3px] bg-white py-4"
              style={{
                borderWidth: 1.5,
                borderColor: "#e4e4e7",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 10,
                elevation: 3,
              }}
            >
              <GoogleGIcon size={20} />
              <Text className="text-base font-semibold text-zinc-700">
                Continue with Google
              </Text>
            </View>
          </Pressable>

          <View className="flex-1" />

          <Text className="mt-8 text-center text-sm text-zinc-400">
            Don&apos;t have an account?{" "}
            <Link href="/register">
              <Text className="font-bold text-zinc-900">Create one</Text>
            </Link>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
