import { useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "../src/firebase/config";

const getParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const parseUrlParams = (url: string | null) => {
  if (!url) {
    return { idToken: undefined as string | undefined, oauthError: undefined as string | undefined };
  }

  const [withoutHash, hashPart = ""] = url.split("#");
  const queryPart = withoutHash.includes("?") ? withoutHash.split("?")[1] ?? "" : "";

  const queryParams = new URLSearchParams(queryPart);
  const hashParams = new URLSearchParams(hashPart);

  return {
    idToken: hashParams.get("id_token") ?? queryParams.get("id_token") ?? undefined,
    oauthError: hashParams.get("error") ?? queryParams.get("error") ?? undefined,
  };
};

export default function ExpoAuthSessionCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const incomingUrl = Linking.useURL();
  const hasHandled = useRef(false);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fromUrl = useMemo(() => parseUrlParams(incomingUrl), [incomingUrl]);
  const urlParam = useMemo(() => getParam(params.url), [params.url]);
  const decodedUrlParam = useMemo(() => {
    if (!urlParam) return null;
    try {
      return decodeURIComponent(urlParam);
    } catch {
      return urlParam;
    }
  }, [urlParam]);

  const fromNestedUrl = useMemo(() => parseUrlParams(decodedUrlParam), [decodedUrlParam]);

  const idToken = useMemo(
    () => getParam(params.id_token) ?? fromUrl.idToken ?? fromNestedUrl.idToken,
    [fromNestedUrl.idToken, fromUrl.idToken, params.id_token]
  );

  const oauthError = useMemo(
    () => getParam(params.error) ?? fromUrl.oauthError ?? fromNestedUrl.oauthError,
    [fromNestedUrl.oauthError, fromUrl.oauthError, params.error]
  );

  useEffect(() => {
    const handleCallback = async () => {
      if (hasHandled.current) return;

      if (oauthError) {
        hasHandled.current = true;
        Alert.alert("Google login failed", oauthError);
        router.replace("/login");
        return;
      }

      if (!idToken) {
        fallbackTimerRef.current = setTimeout(() => {
          if (!hasHandled.current) {
            hasHandled.current = true;
            router.replace("/login");
          }
        }, 4000);
        return;
      }

      try {
        hasHandled.current = true;
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
        }

        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
        router.replace("/home");
      } catch {
        Alert.alert("Google login failed", "Could not complete sign-in.");
        router.replace("/login");
      }
    };

    void handleCallback();

    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [idToken, oauthError, router]);

  return (
    <View className="flex-1 items-center justify-center bg-[#f7f7f5]">
      <ActivityIndicator color="#e8150e" size="large" />
    </View>
  );
}
