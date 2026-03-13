import { type ReactNode, useRef } from "react";
import {
	Animated,
	Pressable,
	type PressableProps,
	type StyleProp,
	type ViewStyle,
} from "react-native";
import { tapLight, tapSelection } from "../haptics";

type TouchableProps = Omit<PressableProps, "style"> & {
	children: ReactNode;
	style?: StyleProp<ViewStyle>;
	/** Scale the element settles to while pressed. */
	pressedScale?: number;
	/** Fire a haptic on press. */
	haptic?: "none" | "light" | "selection";
};

// A Pressable with a smooth spring scale + optional haptic — used everywhere so
// every tap in the app feels alive and consistent.
export default function Touchable({
	children,
	style,
	pressedScale = 0.97,
	haptic = "light",
	onPressIn,
	onPressOut,
	onPress,
	disabled,
	...rest
}: TouchableProps) {
	const scale = useRef(new Animated.Value(1)).current;

	const animateTo = (value: number) => {
		Animated.spring(scale, {
			toValue: value,
			useNativeDriver: true,
			speed: 40,
			bounciness: 6,
		}).start();
	};

	return (
		<Pressable
			disabled={disabled}
			onPressIn={(e) => {
				animateTo(pressedScale);
				onPressIn?.(e);
			}}
			onPressOut={(e) => {
				animateTo(1);
				onPressOut?.(e);
			}}
			onPress={(e) => {
				if (haptic === "light") tapLight();
				else if (haptic === "selection") tapSelection();
				onPress?.(e);
			}}
			{...rest}
		>
			<Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>
		</Pressable>
	);
}
