import { router } from "expo-router";
import { StatusBar, Text, View, Dimensions, Image, Pressable } from "react-native";
import Svg, { Circle, Rect, Path, Ellipse, G } from "react-native-svg";
import { Feather } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

function SplitIllustration() {
  return (
    <Svg width={width - 56} height={200} viewBox="0 0 320 200">
      <Ellipse cx="160" cy="170" rx="130" ry="24" fill="#C1121F" opacity="0.06" />

      {/* Left person */}
      <G>
        <Rect x="30" y="100" width="50" height="65" rx="12" fill="#fbbf24" />
        <Circle cx="55" cy="88" r="22" fill="#fde68a" />
        <Circle cx="47" cy="86" r="3.5" fill="#1c1917" />
        <Circle cx="63" cy="86" r="3.5" fill="#1c1917" />
        <Circle cx="48.5" cy="84.5" r="1.2" fill="white" />
        <Circle cx="64.5" cy="84.5" r="1.2" fill="white" />
        <Path d="M47 94 Q55 101 63 94" stroke="#92400e" strokeWidth="2" fill="none" strokeLinecap="round" />
        <Path d="M33 82 Q55 62 77 82" fill="#92400e" />
        <Rect x="12" y="108" width="18" height="11" rx="5.5" fill="#fde68a" />
        <Rect x="80" y="108" width="18" height="11" rx="5.5" fill="#fde68a" />
        <Rect x="36" y="158" width="16" height="28" rx="8" fill="#fbbf24" />
        <Rect x="58" y="158" width="16" height="28" rx="8" fill="#fbbf24" />
        <Ellipse cx="44" cy="186" rx="11" ry="6" fill="#1c1917" />
        <Ellipse cx="66" cy="186" rx="11" ry="6" fill="#1c1917" />
      </G>

      {/* Bill */}
      <G>
        <Rect x="126" y="72" width="68" height="88" rx="6" fill="white" stroke="#e4e4e7" strokeWidth="1.5" />
        <Rect x="136" y="86" width="48" height="5" rx="2.5" fill="#f4f4f5" />
        <Rect x="136" y="98" width="36" height="5" rx="2.5" fill="#f4f4f5" />
        <Rect x="136" y="110" width="42" height="5" rx="2.5" fill="#f4f4f5" />
        <Rect x="130" y="122" width="60" height="1" fill="#e4e4e7" />
        <Rect x="136" y="130" width="20" height="7" rx="3.5" fill="#fca5a5" />
        <Rect x="162" y="130" width="28" height="7" rx="3.5" fill="#C1121F" />
        <Path d="M160 72 L160 60" stroke="#C1121F" strokeWidth="2" strokeDasharray="4,3" />
        <Circle cx="155" cy="56" r="5" fill="none" stroke="#C1121F" strokeWidth="2" />
        <Circle cx="165" cy="56" r="5" fill="none" stroke="#C1121F" strokeWidth="2" />
        <Path d="M151 52 L169 60 M151 60 L169 52" stroke="#C1121F" strokeWidth="1.5" strokeLinecap="round" />
      </G>

      {/* Right person */}
      <G>
        <Rect x="240" y="100" width="50" height="65" rx="12" fill="#818cf8" />
        <Circle cx="265" cy="88" r="22" fill="#c7d2fe" />
        <Circle cx="257" cy="86" r="3.5" fill="#1c1917" />
        <Circle cx="273" cy="86" r="3.5" fill="#1c1917" />
        <Circle cx="258.5" cy="84.5" r="1.2" fill="white" />
        <Circle cx="274.5" cy="84.5" r="1.2" fill="white" />
        <Path d="M257 94 Q265 101 273 94" stroke="#3730a3" strokeWidth="2" fill="none" strokeLinecap="round" />
        <Rect x="243" y="66" width="44" height="14" rx="7" fill="#1c1917" />
        <Rect x="222" y="108" width="18" height="11" rx="5.5" fill="#c7d2fe" />
        <Rect x="290" y="108" width="18" height="11" rx="5.5" fill="#c7d2fe" />
        <Rect x="246" y="158" width="16" height="28" rx="8" fill="#818cf8" />
        <Rect x="268" y="158" width="16" height="28" rx="8" fill="#818cf8" />
        <Ellipse cx="254" cy="186" rx="11" ry="6" fill="#1c1917" />
        <Ellipse cx="276" cy="186" rx="11" ry="6" fill="#1c1917" />
      </G>

      {/* Coins */}
      <Circle cx="108" cy="60" r="12" fill="#fbbf24" opacity="0.9" />
      <Circle cx="212" cy="52" r="10" fill="#fbbf24" opacity="0.85" />
      <Circle cx="90" cy="130" r="8" fill="#fbbf24" opacity="0.6" />
      <Circle cx="232" cy="125" r="9" fill="#fbbf24" opacity="0.7" />
    </Svg>
  );
}

function BalanceCard() {
  return (
    <View
      className="rounded-[4px] bg-white p-6"
      style={{
        width: width - 56,
        shadowColor: "#C1121F",
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.12,
        shadowRadius: 40,
        elevation: 12,
      }}
    >
      <View className="flex-row items-start justify-between">
        <View>
          <Text className="text-xs font-semibold tracking-widest text-zinc-400">
            GROUP BALANCE
          </Text>
          <View className="mt-1 flex-row items-baseline">
            <Text className="font-black text-zinc-900" style={{ fontSize: 38, letterSpacing: -2, lineHeight: 46 }}>
              $348
            </Text>
            <Text className="font-black text-zinc-300" style={{ fontSize: 22, letterSpacing: -1, lineHeight: 46 }}>
              .00
            </Text>
          </View>
        </View>
        <View className="mt-1 rounded-[3px] bg-red-50 px-3 py-1.5">
          <Text className="text-sm font-bold text-red-600">+$24</Text>
        </View>
      </View>

      <View className="mt-4 h-1.5 rounded-full bg-zinc-100">
        <View className="h-1.5 w-[62%] rounded-full bg-red-500" />
      </View>
      <View className="mt-1.5 flex-row items-center justify-between">
        <Text className="text-xs text-zinc-400">Paid $216</Text>
        <Text className="text-xs text-zinc-400">Total $348</Text>
      </View>

      <View className="my-4 h-px bg-zinc-100" />

      <View className="flex-row items-center justify-between">
        <View className="flex-row">
          {["#fbbf24", "#818cf8", "#34d399", "#f87171"].map((c, i) => (
            <View
              key={i}
              style={{
                width: 30, height: 30, borderRadius: 15,
                backgroundColor: c,
                marginLeft: i > 0 ? -8 : 0,
                borderWidth: 2, borderColor: "#fff",
              }}
            />
          ))}
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="h-2 w-2 rounded-full bg-red-500" />
          <Text className="text-xs text-zinc-400">4 members</Text>
        </View>
      </View>
    </View>
  );
}

export default function Index() {
  return (
    <View className="flex-1 bg-[#f4f4f5]" style={{ paddingHorizontal: 28, paddingTop: 64, paddingBottom: 40 }}>
      <StatusBar barStyle="dark-content" />

      <View className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-red-500 opacity-[0.06]" />
      <View className="absolute -left-16 bottom-16 h-52 w-52 rounded-full bg-red-400 opacity-[0.04]" />

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
      <View className="mt-6 items-center">
        <SplitIllustration />
      </View>

      {/* Hero */}
      <View className="mt-4">
        <Text
          className="font-black text-zinc-900"
          style={{ fontSize: 42, lineHeight: 46, letterSpacing: -2 }}
        >
          Splitting bills{"\n"}made{" "}
          <Text className="text-red-600">effortless.</Text>
        </Text>
        <Text className="mt-3 max-w-[280px] text-sm leading-6 text-zinc-400">
          Track expenses, see who owes what, and settle up — no awkward texts needed.
        </Text>
      </View>

      {/* Tags */}
      <View className="mt-4 flex-row gap-3">
        <View
          className="flex-row items-center gap-2 rounded-full bg-white px-4 py-2"
          style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }}
        >
          <Feather name="shield" size={13} color="#71717a" />
          <Text className="text-xs font-semibold text-zinc-500">Private</Text>
        </View>
        <View
          className="flex-row items-center gap-2 rounded-full bg-white px-4 py-2"
          style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }}
        >
          <Feather name="zap-off" size={13} color="#71717a" />
          <Text className="text-xs font-semibold text-zinc-500">No ads</Text>
        </View>
        <View
          className="flex-row items-center gap-2 rounded-full bg-white px-4 py-2"
          style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }}
        >
          <Feather name="users" size={13} color="#71717a" />
          <Text className="text-xs font-semibold text-zinc-500">Groups</Text>
        </View>
      </View>

      {/* Card */}
      <View className="mt-5">
        <BalanceCard />
      </View>

      <View className="flex-1" />

      {/* Buttons */}
      <View className="gap-2">
        <Pressable
          onPress={() => router.push("/register")}
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.97 : 1 }],
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <View
            className="items-center rounded-[3px] bg-[#C1121F] py-5"
            style={{
              shadowColor: "#C1121F",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <Text className="text-base font-bold tracking-wide text-white">
              Create free account
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => router.push("/login")}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <View className="items-center py-3">
            <Text className="text-base font-semibold text-zinc-400">Sign in</Text>
          </View>
        </Pressable>
      </View>

    </View>
  );
}