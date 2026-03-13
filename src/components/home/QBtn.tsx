import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

type QBtnProps = {
  icon: string;
  label: string;
  bg: string;
  onPress: () => void;
};

export default function QBtn({ icon, label, bg, onPress }: QBtnProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1, alignItems: "center", flex: 1 })}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 18,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: bg,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 10,
          elevation: 6,
        }}
      >
        <Feather name={icon as never} size={22} color="#fff" />
      </View>
      <Text style={{ marginTop: 7, fontSize: 11, fontWeight: "700", color: "#52525b", letterSpacing: 0.2 }}>
        {label}
      </Text>
    </Pressable>
  );
}
