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
  Image,
  Dimensions,
} from "react-native";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithCredential,
  updateProfile,
} from "firebase/auth";
import { auth } from "../src/firebase/config";
import { getFirebaseAuthMessage } from "../src/firebase/authErrors";
import { AntDesign } from "@expo/vector-icons";
import Svg, { Circle, Rect, Path, Ellipse, G } from "react-native-svg";

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get("window");

// ── Register illustration — people joining / high five ─────
function RegisterIllustration() {
  return (
    <Svg width={width - 56} height={130} viewBox="0 0 320 140">

      {/* Ground shadow */}
      <Ellipse cx="160" cy="133" rx="125" ry="7" fill="#C1121F" opacity="0.05" />

      {/* ── Left person ── */}
      <G>
        {/* Body */}
        <Rect x="28" y="76" width="48" height="55" rx="13" fill="#fbbf24" />
        {/* Head */}
        <Circle cx="52" cy="64" r="20" fill="#fde68a" />
        {/* Hair */}
        <Path d="M32 60 Q52 42 72 60" fill="#92400e" />
        {/* Eyes */}
        <Circle cx="44" cy="62" r="3" fill="#1c1917" />
        <Circle cx="60" cy="62" r="3" fill="#1c1917" />
        <Circle cx="45.2" cy="60.8" r="1" fill="white" />
        <Circle cx="61.2" cy="60.8" r="1" fill="white" />
        {/* Smile */}
        <Path d="M44 70 Q52 77 60 70" stroke="#92400e" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Right arm reaching out */}
        <Rect x="74" y="82" width="38" height="11" rx="5.5" fill="#fde68a" />
        {/* Left arm */}
        <Rect x="10" y="82" width="20" height="11" rx="5.5" fill="#fde68a" />
        {/* Legs */}
        <Rect x="32" y="124" width="15" height="20" rx="7.5" fill="#fbbf24" />
        <Rect x="53" y="124" width="15" height="20" rx="7.5" fill="#fbbf24" />
        {/* Shoes */}
        <Ellipse cx="39" cy="144" rx="10" ry="5" fill="#1c1917" />
        <Ellipse cx="61" cy="144" rx="10" ry="5" fill="#1c1917" />
      </G>

      {/* ── Right person ── */}
      <G>
        {/* Body */}
        <Rect x="244" y="76" width="48" height="55" rx="13" fill="#34d399" />
        {/* Head */}
        <Circle cx="268" cy="64" r="20" fill="#a7f3d0" />
        {/* Hair — curly */}
        <Circle cx="256" cy="56" r="9" fill="#1c1917" />
        <Circle cx="268" cy="52" r="9" fill="#1c1917" />
        <Circle cx="280" cy="56" r="9" fill="#1c1917" />
        {/* Eyes */}
        <Circle cx="260" cy="62" r="3" fill="#1c1917" />
        <Circle cx="276" cy="62" r="3" fill="#1c1917" />
        <Circle cx="261.2" cy="60.8" r="1" fill="white" />
        <Circle cx="277.2" cy="60.8" r="1" fill="white" />
        {/* Smile */}
        <Path d="M260 70 Q268 77 276 70" stroke="#065f46" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Left arm reaching out */}
        <Rect x="208" y="82" width="38" height="11" rx="5.5" fill="#a7f3d0" />
        {/* Right arm */}
        <Rect x="290" y="82" width="20" height="11" rx="5.5" fill="#a7f3d0" />
        {/* Legs */}
        <Rect x="248" y="124" width="15" height="20" rx="7.5" fill="#34d399" />
        <Rect x="269" y="124" width="15" height="20" rx="7.5" fill="#34d399" />
        {/* Shoes */}
        <Ellipse cx="255" cy="144" rx="10" ry="5" fill="#1c1917" />
        <Ellipse cx="277" cy="144" rx="10" ry="5" fill="#1c1917" />
      </G>

      {/* ── Handshake in center ── */}
      <G>
        {/* Hand left */}
        <Rect x="112" y="84" width="26" height="14" rx="7" fill="#fde68a" />
        {/* Fingers left */}
        <Rect x="116" y="76" width="8" height="12" rx="4" fill="#fde68a" />
        <Rect x="126" y="74" width="8" height="14" rx="4" fill="#fde68a" />
        {/* Hand right */}
        <Rect x="182" y="84" width="26" height="14" rx="7" fill="#a7f3d0" />
        {/* Fingers right */}
        <Rect x="196" y="76" width="8" height="12" rx="4" fill="#a7f3d0" />
        <Rect x="186" y="74" width="8" height="14" rx="4" fill="#a7f3d0" />
        {/* Overlap — shake point */}
        <Rect x="138" y="82" width="44" height="16" rx="8" fill="#C1121F" opacity="0.15" />
        <Rect x="144" y="85" width="32" height="10" rx="5" fill="#C1121F" opacity="0.3" />
      </G>

      {/* ── Sparkles / confetti ── */}
      {/* Star left */}
      <Path d="M88 38 L90 30 L92 38 L100 40 L92 42 L90 50 L88 42 L80 40 Z" fill="#fbbf24" opacity="0.5" />
      {/* Star right */}
      <Path d="M220 32 L222 24 L224 32 L232 34 L224 36 L222 44 L220 36 L212 34 Z" fill="#34d399" opacity="0.5" />
      {/* Small dots */}
      <Circle cx="148" cy="26" r="4" fill="#C1121F" opacity="0.3" />
      <Circle cx="160" cy="18" r="3" fill="#fbbf24" opacity="0.4" />
      <Circle cx="172" cy="26" r="4" fill="#818cf8" opacity="0.3" />

      {/* Heart above handshake */}
      <Path
        d="M155 52 C155 49 151 46 148 49 C145 52 155 60 155 60 C155 60 165 52 162 49 C159 46 155 49 155 52 Z"
        fill="#C1121F"
        opacity="0.25"
      />

      {/* Dashed connection arc */}
      <Path
        d="M52 44 Q160 0 268 44"
        stroke="#C1121F"
        strokeWidth="1.5"
        strokeDasharray="5,4"
        fill="none"
        opacity="0.2"
      />
    </Svg>
  );
}

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const useProxy = Constants.appOwnership === "expo";
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;
  const owner = Constants.expoConfig?.owner;
  const slug = Constants.expoConfig?.slug;
  const projectNameForProxy = owner && slug ? `@${owner}/${slug}` : undefined;
  const nativeCallbackPath = "expo-auth-session";
  const proxyRedirectUri =
    projectNameForProxy ? `https://auth.expo.io/${projectNameForProxy}` : undefined;
  const appReturnUri = makeRedirectUri({ path: nativeCallbackPath });
  const nativeRedirectUri = makeRedirectUri({ scheme: "splytr", path: nativeCallbackPath });
  const webRedirectUri = makeRedirectUri({ path: nativeCallbackPath });
  const redirectUri = useProxy
    ? proxyRedirectUri ?? appReturnUri
    : Platform.OS === "web"
      ? webRedirectUri
      : nativeRedirectUri;
  const clientId = useProxy
    ? extra.googleExpoClientId || extra.googleWebClientId
    : Platform.OS === "ios"
      ? extra.googleIosClientId
      : Platform.OS === "android"
        ? extra.googleAndroidClientId
        : Platform.OS === "web"
          ? extra.googleWebClientId
          : undefined;

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
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(credential.user, { displayName: name.trim() });
      router.replace("/home");
    } catch (error) {
      Alert.alert("Registration failed", getFirebaseAuthMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    if (!hasGoogleConfig) {
      Alert.alert("Google login needs configuration", "Add Google OAuth client IDs in app.json.");
      return;
    }
    if (!clientId) {
      Alert.alert(
        "Google sign-up failed",
        useProxy
          ? "Google Expo/Web client ID is missing in app.json."
          : Platform.OS === "android"
            ? "Google Android client ID is missing in app.json."
            : Platform.OS === "ios"
              ? "Google iOS client ID is missing in app.json."
              : "Google Web client ID is missing in app.json."
      );
      return;
    }
    if (!request) {
      Alert.alert("Google sign-up failed", "Auth request is still loading. Try again.");
      return;
    }
    if (useProxy && !proxyRedirectUri) {
      Alert.alert("Google sign-up config missing", "Set expo.owner and expo.slug in app.json.");
      return;
    }
    setLoading(true);
    try {
      if (useProxy && request?.url && projectNameForProxy) {
        const startUrl = `https://auth.expo.io/${projectNameForProxy}/start?${new URLSearchParams({
          authUrl: request.url,
          returnUrl: appReturnUri,
        }).toString()}`;
        await WebBrowser.openBrowserAsync(startUrl);
        return;
      }
      const result = await promptAsync();
      if (result.type !== "success") {
        if (result.type !== "cancel") {
          Alert.alert("Google sign-up failed", `Google sign-in did not complete (${result.type}).`);
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

          {/* Logo */}
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

          {/* Illustration */}
          <View className="mt-5 items-center">
            <RegisterIllustration />
          </View>

          {/* Header */}
          <View className="mt-3">
            <Text className="text-[36px] font-black leading-tight tracking-tight text-zinc-900">
              Create your{"\n"}account.
            </Text>
            <Text className="mt-2 text-sm leading-6 text-zinc-400">
              Join splytr and start splitting bills effortlessly.
            </Text>
          </View>

          {/* Form */}
          <View className="mt-6">
            <View className="mb-4">
              <Text className="mb-2 text-xs font-semibold tracking-widest text-zinc-400">
                FULL NAME
              </Text>
              <TextInput
                placeholder="John Doe"
                placeholderTextColor="#d4d4d8"
                value={name}
                onChangeText={setName}
                onFocus={() => setFocusedField("name")}
                onBlur={() => setFocusedField(null)}
                className="bg-white px-4 py-4 text-base text-zinc-900"
                style={inputStyle("name")}
              />
            </View>

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
              <Text className="mb-2 text-xs font-semibold tracking-widest text-zinc-400">
                PASSWORD
              </Text>
              <TextInput
                placeholder="Min. 8 characters"
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

          {/* Create account button */}
          <Pressable
            disabled={loading}
            onPress={handleRegister}
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
                {loading ? "Creating account..." : "Create account"}
              </Text>
            </View>
          </Pressable>

          {/* Divider */}
          <View className="my-5 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-zinc-200" />
            <Text className="text-xs font-medium text-zinc-400">or continue with</Text>
            <View className="h-px flex-1 bg-zinc-200" />
          </View>

          {/* Google */}
          <Pressable
            disabled={loading}
            onPress={handleGoogleRegister}
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
              <AntDesign name="google" size={20} color="#EA4335" />
              <Text className="text-base font-semibold text-zinc-700">
                Continue with Google
              </Text>
            </View>
          </Pressable>

          <View className="flex-1" />

          <Text className="mt-8 text-center text-sm text-zinc-400">
            Already have an account?{" "}
            <Link href="/login">
              <Text className="font-bold text-zinc-900">Sign in</Text>
            </Link>
          </Text>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
