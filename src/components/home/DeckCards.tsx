import { ActivityIndicator, Alert, Dimensions, Linking, Pressable, Text, View } from "react-native";
import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { fmt } from "./helpers";
import type { DashboardBill, DashboardTotals } from "./types";

const { width } = Dimensions.get("window");
const CARD_W = width - 48;

const openPaymentApp = async (amount: number, note: string) => {
  const upiApps = [
    { name: "GPay", url: `tez://upi/pay?pa=&pn=&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}` },
    { name: "PhonePe", url: `phonepe://pay?transactionId=splytr&amount=${amount}&remarks=${encodeURIComponent(note)}` },
    { name: "Paytm", url: `paytmmp://pay?pa=&pn=&am=${amount}&cu=INR` },
    { name: "BHIM", url: `upi://pay?am=${amount}&cu=INR&tn=${encodeURIComponent(note)}` },
  ];

  for (const app of upiApps) {
    try {
      const canOpen = await Linking.canOpenURL(app.url);
      if (canOpen) {
        await Linking.openURL(app.url);
        return;
      }
    } catch {
      // Try next app.
    }
  }

  try {
    await Linking.openURL(`upi://pay?am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`);
  } catch {
    Alert.alert("No payment app found", "Install GPay, PhonePe, or Paytm to pay directly.");
  }
};

type DeckCardsProps = {
  bills: DashboardBill[];
  totals: DashboardTotals;
  loading: boolean;
};

export default function DeckCards({ bills, totals, loading }: DeckCardsProps) {
  const totalBalance = totals.totalGet - totals.totalOwe;
  const total = 1 + bills.length;
  const [active, setActive] = useState(0);

  const next = () => setActive((prev) => (prev + 1) % total);

  const cardAt = (layer: number) => (active + layer) % total;

  const renderCard = (idx: number, layer: number) => {
    const isTotal = idx === 0;
    const bill = isTotal ? null : bills[idx - 1];
    const isTop = layer === 0;

    const offsetTop = layer * 10;
    const offsetH = layer * 8;
    const opacity = layer === 0 ? 1 : layer === 1 ? 0.72 : 0.44;
    const zIndex = 10 - layer;

    return (
      <Pressable
        key={`card-${idx}-layer-${layer}`}
        onPress={isTop ? next : undefined}
        style={{
          position: "absolute",
          top: offsetTop,
          left: offsetH / 2,
          right: offsetH / 2,
          height: 210,
          borderRadius: 28,
          zIndex,
          opacity,
          overflow: "hidden",
          shadowColor: isTotal ? "#e8150e" : bill?.type === "you_get" ? "#16a34a" : "#e8150e",
          shadowOffset: { width: 0, height: isTop ? 16 : 4 },
          shadowOpacity: isTop ? 0.18 : 0.06,
          shadowRadius: isTop ? 32 : 8,
          elevation: isTop ? 14 : 4,
        }}
      >
        {isTotal ? (
          <View style={{ flex: 1, backgroundColor: "#111827", padding: 24, borderRadius: 28 }}>
            <View
              style={{
                position: "absolute",
                right: -30,
                top: -30,
                width: 130,
                height: 130,
                borderRadius: 65,
                backgroundColor: "#e8150e",
                opacity: 0.12,
              }}
            />
            <View
              style={{
                position: "absolute",
                right: 20,
                bottom: -20,
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: "#e8150e",
                opacity: 0.07,
              }}
            />

            <Text style={{ color: "#6b7280", fontSize: 10, fontWeight: "700", letterSpacing: 2.5 }}>
              TOTAL BALANCE
            </Text>
            {loading ? (
              <ActivityIndicator color="#e8150e" style={{ marginTop: 16 }} />
            ) : (
              <>
                <Text
                  style={{
                    color: totalBalance >= 0 ? "#4ade80" : "#f87171",
                    fontSize: 42,
                    fontWeight: "900",
                    letterSpacing: -2,
                    marginTop: 6,
                  }}
                >
                  {fmt(Math.abs(totalBalance))}
                </Text>
                <Text style={{ color: "#9ca3af", fontSize: 13, marginTop: 4, fontWeight: "500" }}>
                  {totalBalance > 0 ? "People owe you" : totalBalance < 0 ? "You owe overall" : "All settled"}
                </Text>

                <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
                  <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, padding: 12 }}>
                    <Text style={{ color: "#6b7280", fontSize: 10, fontWeight: "700", letterSpacing: 1.5 }}>YOU GET</Text>
                    <Text style={{ color: "#4ade80", fontSize: 17, fontWeight: "800", marginTop: 4 }}>{fmt(totals.totalGet)}</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, padding: 12 }}>
                    <Text style={{ color: "#6b7280", fontSize: 10, fontWeight: "700", letterSpacing: 1.5 }}>YOU OWE</Text>
                    <Text style={{ color: "#f87171", fontSize: 17, fontWeight: "800", marginTop: 4 }}>{fmt(totals.totalOwe)}</Text>
                  </View>
                </View>
              </>
            )}

            {isTop && total > 1 ? (
              <View style={{ position: "absolute", bottom: 18, right: 20, flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={{ color: "#4b5563", fontSize: 11, fontWeight: "600" }}>
                  {bills.length} bill{bills.length !== 1 ? "s" : ""}
                </Text>
                <Feather name="chevron-right" size={13} color="#4b5563" />
              </View>
            ) : null}
          </View>
        ) : bill ? (
          <View
            style={{
              flex: 1,
              backgroundColor: "#fff",
              padding: 24,
              borderRadius: 28,
              borderWidth: 1.5,
              borderColor: bill.type === "you_get" ? "#bbf7d0" : "#fecaca",
            }}
          >
            <View
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: 5,
                backgroundColor: bill.type === "you_get" ? "#22c55e" : "#e8150e",
                borderTopLeftRadius: 28,
                borderBottomLeftRadius: 28,
              }}
            />

            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <View
                  style={{
                    alignSelf: "flex-start",
                    backgroundColor: bill.type === "you_get" ? "#f0fdf4" : "#fff1f2",
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    marginBottom: 10,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "800",
                      letterSpacing: 1.5,
                      color: bill.type === "you_get" ? "#16a34a" : "#e8150e",
                    }}
                  >
                    {bill.type === "you_get" ? "YOU GET BACK" : "YOU OWE"}
                  </Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: "800", color: "#111827", letterSpacing: -0.3 }} numberOfLines={1}>
                  {bill.title}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 }}>
                  <Feather name="users" size={12} color="#9ca3af" />
                  <Text style={{ fontSize: 12, color: "#9ca3af", fontWeight: "500" }}>{bill.group}</Text>
                </View>
              </View>

              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "900",
                  letterSpacing: -1.5,
                  color: bill.type === "you_get" ? "#16a34a" : "#e8150e",
                }}
              >
                {fmt(bill.amount)}
              </Text>
            </View>

            {bill.type === "you_owe" && isTop ? (
              <Pressable
                onPress={(event) => {
                  event.stopPropagation?.();
                  void openPaymentApp(bill.amount, `Settle: ${bill.title} via Splytr`);
                }}
                style={({ pressed }) => ({
                  marginTop: 22,
                  backgroundColor: pressed ? "#c01010" : "#e8150e",
                  borderRadius: 14,
                  paddingVertical: 13,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  shadowColor: "#e8150e",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.35,
                  shadowRadius: 12,
                  elevation: 8,
                })}
              >
                <Feather name="credit-card" size={15} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14, letterSpacing: 0.3 }}>
                  Pay {fmt(bill.amount)}
                </Text>
              </Pressable>
            ) : null}

            {bill.type === "you_get" && isTop ? (
              <View
                style={{
                  marginTop: 22,
                  backgroundColor: "#f0fdf4",
                  borderRadius: 14,
                  paddingVertical: 13,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  borderWidth: 1.5,
                  borderColor: "#bbf7d0",
                }}
              >
                <Feather name="check-circle" size={15} color="#16a34a" />
                <Text style={{ color: "#16a34a", fontWeight: "800", fontSize: 14 }}>
                  Awaiting payment
                </Text>
              </View>
            ) : null}

            {isTop && total > 1 ? (
              <View style={{ position: "absolute", bottom: 18, right: 20, flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={{ color: "#d1d5db", fontSize: 11, fontWeight: "600" }}>
                  {idx}/{bills.length}
                </Text>
                <Feather name="chevron-right" size={13} color="#d1d5db" />
              </View>
            ) : null}
          </View>
        ) : null}
      </Pressable>
    );
  };

  const layers = Math.min(3, total);

  return (
    <View style={{ width: CARD_W, height: 210 + (layers - 1) * 10 }}>
      {Array.from({ length: layers }, (_, layer) => layers - 1 - layer).map((layer) =>
        renderCard(cardAt(layer), layer)
      )}

      {total > 1 ? (
        <View
          style={{
            position: "absolute",
            bottom: -24,
            left: 0,
            right: 0,
            flexDirection: "row",
            justifyContent: "center",
            gap: 5,
          }}
        >
          {Array.from({ length: total }, (_, index) => (
            <Pressable key={index} onPress={() => setActive(index)}>
              <View
                style={{
                  width: active === index ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: active === index ? "#e8150e" : "#d1d5db",
                }}
              />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
