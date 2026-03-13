import { Text, TextInput, View, type TextInputProps } from "react-native";

type FieldProps = TextInputProps & {
  label: string;
};

export default function Field({ label, ...props }: FieldProps) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2, color: "#9ca3af", marginBottom: 8 }}>
        {label}
      </Text>
      <TextInput
        placeholderTextColor="#d1d5db"
        style={{
          backgroundColor: "#fafafa",
          borderWidth: 1.5,
          borderColor: "#e4e4e7",
          borderRadius: 14,
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontSize: 15,
          color: "#111827",
        }}
        {...props}
      />
    </View>
  );
}
