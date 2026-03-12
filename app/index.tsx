import { router } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  Easing as RNEasing,
  Pressable,
  StatusBar,
  Text,
  View,
} from "react-native";
import {
  Canvas,
  Circle,
  Group,
  Path,
  Rect,
  RoundedRect,
  Shadow,
  Skia,
} from "@shopify/react-native-skia";
import {
  useSharedValue,
  useDerivedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

// ── Floating coin ──────────────────────────────────────────
function FloatingCoin({ cx, cy, delay, size = 22 }: { cx: number; cy: number; delay: number; size?: number }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-14, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
  }, []);

  const transform = useDerivedValue(() => [{ translateY: translateY.value }]);

  return (
    <Group transform={transform}>
      <Circle cx={cx} cy={cy} r={size} color="#ef4444" opacity={0.9}>
        <Shadow dx={0} dy={4} blur={12} color="#ef444488" />
      </Circle>
      <Circle cx={cx - size * 0.25} cy={cy - size * 0.25} r={size * 0.25} color="rgba(255,255,255,0.2)" />
      <Rect x={cx - 1.5} y={cy - size * 0.45} width={3} height={size * 0.9} color="rgba(255,255,255,0.5)" />
      <Rect x={cx - size * 0.35} y={cy - size * 0.15} width={size * 0.7} height={3} color="rgba(255,255,255,0.5)" />
    </Group>
  );
}

// ── Character ──────────────────────────────────────────────
function Character() {
  const bodyBob = useSharedValue(0);
  const armAngle = useSharedValue(0);

  useEffect(() => {
    bodyBob.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );

    armAngle.value = withRepeat(
      withSequence(
        withTiming(18, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(-18, { duration: 700, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, []);

  const bodyTransform = useDerivedValue(() => [{ translateY: bodyBob.value }]);

  const leftArmTransform = useDerivedValue(() => [
    { rotate: (armAngle.value * Math.PI) / 180 },
  ]);

  const rightArmTransform = useDerivedValue(() => [
    { rotate: (-armAngle.value * Math.PI) / 180 },
  ]);

  const cx = 140;
  const headY = 90;
  const bodyTopY = 148;
  const bodyBottomY = 240;

  return (
    <Group transform={bodyTransform}>
      {/* Shadow */}
      <Circle cx={cx} cy={bodyBottomY + 28} r={32} color="rgba(239,68,68,0.12)" />

      {/* Head */}
      <Circle cx={cx} cy={headY} r={36} color="#1a1a1a">
        <Shadow dx={0} dy={4} blur={16} color="rgba(239,68,68,0.3)" />
      </Circle>
      <Circle cx={cx} cy={headY} r={36} color="#ef4444" opacity={0.4} style="stroke" strokeWidth={2} />

      {/* Eyes */}
      <Circle cx={cx - 12} cy={headY - 4} r={5} color="#ef4444" />
      <Circle cx={cx + 12} cy={headY - 4} r={5} color="#ef4444" />
      <Circle cx={cx - 10} cy={headY - 6} r={2} color="white" opacity={0.8} />
      <Circle cx={cx + 14} cy={headY - 6} r={2} color="white" opacity={0.8} />

      {/* Smile */}
      <Path
        path={(() => {
          const p = Skia.Path.Make();
          p.moveTo(cx - 12, headY + 12);
          p.quadTo(cx, headY + 22, cx + 12, headY + 12);
          return p;
        })()}
        color="#ef4444"
        style="stroke"
        strokeWidth={2.5}
        strokeCap="round"
      />

      {/* Neck */}
      <Rect x={cx - 8} y={headY + 34} width={16} height={14} color="#1a1a1a" />

      {/* Body */}
      <RoundedRect x={cx - 38} y={bodyTopY} width={76} height={88} r={18} color="#1a1a1a">
        <Shadow dx={0} dy={6} blur={20} color="rgba(239,68,68,0.25)" />
      </RoundedRect>
      <RoundedRect x={cx - 38} y={bodyTopY} width={76} height={88} r={18} color="#ef4444" opacity={0.25} style="stroke" strokeWidth={1.5} />

      {/* Chest $ */}
      <Rect x={cx - 1.5} y={bodyTopY + 20} width={3} height={22} color="#ef4444" opacity={0.5} />
      <Rect x={cx - 10} y={bodyTopY + 27} width={20} height={3} color="#ef4444" opacity={0.5} />

      {/* Left arm */}
      <Group transform={leftArmTransform} origin={{ x: cx - 38, y: bodyTopY + 20 }}>
        <RoundedRect x={cx - 72} y={bodyTopY + 10} width={36} height={14} r={7} color="#1a1a1a" />
        <Circle cx={cx - 72} cy={bodyTopY + 17} r={8} color="#1a1a1a" />
      </Group>

      {/* Right arm */}
      <Group transform={rightArmTransform} origin={{ x: cx + 38, y: bodyTopY + 20 }}>
        <RoundedRect x={cx + 36} y={bodyTopY + 10} width={36} height={14} r={7} color="#1a1a1a" />
        <Circle cx={cx + 72} cy={bodyTopY + 17} r={8} color="#1a1a1a" />
        <Circle cx={cx + 72} cy={bodyTopY + 17} r={7} color="#ef4444" opacity={0.8} />
      </Group>

      {/* Legs */}
      <RoundedRect x={cx - 30} y={bodyBottomY} width={22} height={44} r={11} color="#1a1a1a" />
      <RoundedRect x={cx - 36} y={bodyBottomY + 36} width={30} height={14} r={7} color="#ef4444" opacity={0.85} />
      <RoundedRect x={cx + 8} y={bodyBottomY} width={22} height={44} r={11} color="#1a1a1a" />
      <RoundedRect x={cx + 6} y={bodyBottomY + 36} width={30} height={14} r={7} color="#ef4444" opacity={0.85} />
    </Group>
  );
}

// ── Index screen ───────────────────────────────────────────
export default function Index() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const btnFadeAnim = useRef(new Animated.Value(0)).current;
  const btnSlideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 900, delay: 200, easing: RNEasing.out(RNEasing.cubic), useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 900, delay: 200, easing: RNEasing.out(RNEasing.cubic), useNativeDriver: true }),
    ]).start();

    Animated.parallel([
      Animated.timing(btnFadeAnim, { toValue: 1, duration: 700, delay: 900, useNativeDriver: true }),
      Animated.timing(btnSlideAnim, { toValue: 0, duration: 700, delay: 900, easing: RNEasing.out(RNEasing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View className="flex-1 bg-black px-7 pb-12 pt-14">
      <StatusBar barStyle="light-content" />

      {/* App name */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <Text className="text-center text-xs font-bold tracking-[4px] text-red-500">
          SPLYTR
        </Text>
      </Animated.View>

      {/* Skia canvas */}
      <Canvas style={{ width: "100%", height: 320, marginTop: 4 }}>
        <Circle cx={140} cy={170} r={110} color="rgba(239,68,68,0.07)" />
        <FloatingCoin cx={48} cy={120} delay={0} size={18} />
        <FloatingCoin cx={232} cy={100} delay={300} size={14} />
        <FloatingCoin cx={60} cy={220} delay={600} size={12} />
        <FloatingCoin cx={220} cy={210} delay={200} size={16} />
        <Character />
      </Canvas>

      {/* Hero text */}
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <Text className="text-center text-[38px] font-black leading-[42px] tracking-tighter text-white">
          No more{"\n"}
          <Text className="text-red-500">awkward</Text>
          {"\n"}money talks.
        </Text>
        <Text className="mt-4 text-center text-sm leading-6 text-zinc-500">
          Split expenses with anyone.{"\n"}Settle up in seconds.
        </Text>
        <View className="mt-5 flex-row items-center justify-center gap-3">
          <View className="h-px w-6 bg-red-500" />
          <Text className="text-[10px] tracking-widest text-zinc-700">FAST · FAIR · SIMPLE</Text>
          <View className="h-px w-6 bg-red-500" />
        </View>
      </Animated.View>

      {/* Buttons */}
      <Animated.View
        className="mt-8 gap-3"
        style={{ opacity: btnFadeAnim, transform: [{ translateY: btnSlideAnim }] }}
      >
        <Pressable
          onPress={() => router.push("/register")}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}
        >
          <View className="items-center rounded-2xl bg-red-500 py-5">
            <Text className="text-sm font-bold tracking-widest text-white">CREATE ACCOUNT</Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => router.push("/login")}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <View className="items-center rounded-2xl border border-zinc-800 py-5">
            <Text className="text-sm font-semibold text-zinc-400">Sign in</Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}