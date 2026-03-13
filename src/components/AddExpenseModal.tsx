import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
	ActivityIndicator,
	Image,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import { addExpense, type BackendUser } from "../api/api";
import { notifyError, notifySuccess, tapSelection } from "../haptics";
import { usePrefs } from "../providers/PrefsProvider";
import { RADII, getUserAvatar, type Theme } from "../theme";
import Touchable from "./Touchable";

type AddExpenseModalProps = {
	visible: boolean;
	onClose: () => void;
	groupId: string;
	groupName: string;
	members: BackendUser[];
	meId: string;
	onCreated: () => void;
};

const memberLabel = (member: BackendUser, meId: string) =>
	member._id === meId ? "You" : member.name?.trim() || member.email;

// Split `amount` equally across the ids to the paisa, giving the leftover paisa
// to the first people so the parts sum back to the exact total.
const equalSplit = (amount: number, ids: string[]): Record<string, number> => {
	const result: Record<string, number> = {};
	const count = ids.length;
	if (count === 0) return result;

	const totalPaise = Math.round(amount * 100);
	const base = Math.floor(totalPaise / count);
	let remainder = totalPaise - base * count;

	ids.forEach((id) => {
		const paise = base + (remainder > 0 ? 1 : 0);
		if (remainder > 0) remainder -= 1;
		result[id] = paise / 100;
	});

	return result;
};

export default function AddExpenseModal({
	visible,
	onClose,
	groupId,
	groupName,
	members,
	meId,
	onCreated,
}: AddExpenseModalProps) {
	const { theme: t, money, currency } = usePrefs();

	const [description, setDescription] = useState("");
	const [amountText, setAmountText] = useState("");
	const [payerId, setPayerId] = useState(meId);
	const [selectedIds, setSelectedIds] = useState<string[]>(() => members.map((m) => m._id));
	const [submitting, setSubmitting] = useState(false);
	const [focused, setFocused] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const amount = useMemo(() => {
		const parsed = Number.parseFloat(amountText.replace(/,/g, ""));
		return Number.isFinite(parsed) ? parsed : 0;
	}, [amountText]);

	const shares = useMemo(() => equalSplit(amount, selectedIds), [amount, selectedIds]);
	const perHead = selectedIds.length > 0 ? amount / selectedIds.length : 0;

	const reset = () => {
		setDescription("");
		setAmountText("");
		setPayerId(meId);
		setSelectedIds(members.map((m) => m._id));
		setFocused(null);
		setErrorMessage(null);
	};

	const close = () => {
		reset();
		onClose();
	};

	const toggleMember = (id: string) => {
		tapSelection();
		setSelectedIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
	};

	const canSubmit = amount > 0 && selectedIds.length > 0 && description.trim().length > 0;

	const handleSubmit = async () => {
		if (!canSubmit || submitting) return;
		setSubmitting(true);
		setErrorMessage(null);
		try {
			const splits = selectedIds.map((id) => ({ user: id, amount: shares[id] ?? 0 }));
			await addExpense({ groupId, amount, description: description.trim(), splits, paidBy: payerId });
			notifySuccess();
			reset();
			onCreated();
		} catch (error) {
			notifyError();
			setErrorMessage(error instanceof Error ? error.message : "Could not add expense.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				style={{ flex: 1, justifyContent: "flex-end", backgroundColor: t.overlay }}
			>
				<View
					style={{
						backgroundColor: t.bg,
						borderTopLeftRadius: RADII.sheet,
						borderTopRightRadius: RADII.sheet,
						borderWidth: 1,
						borderColor: t.border,
						maxHeight: "92%",
						paddingTop: 10,
					}}
				>
					<View
						style={{
							alignSelf: "center",
							width: 40,
							height: 4,
							borderRadius: 2,
							backgroundColor: t.borderStrong,
							marginBottom: 6,
						}}
					/>

					<View
						style={{
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "space-between",
							paddingHorizontal: 20,
							paddingVertical: 12,
						}}
					>
						<View style={{ flex: 1 }}>
							<Text style={{ fontSize: 20, fontWeight: "800", color: t.textPrimary, letterSpacing: -0.4 }}>
								Add expense
							</Text>
							<Text style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>in {groupName}</Text>
						</View>
						<Pressable
							onPress={close}
							style={{
								width: 34,
								height: 34,
								borderRadius: RADII.control,
								backgroundColor: t.surface3,
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<Feather name="x" size={18} color={t.textSecondary} />
						</Pressable>
					</View>

					<ScrollView
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
						contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28, width: "100%" }}
					>
						{/* Amount hero */}
						<View
							style={{
								backgroundColor: t.heroBg,
								borderRadius: RADII.card,
								borderWidth: 1,
								borderColor: t.heroBorder,
								padding: 20,
								marginBottom: 18,
							}}
						>
							<Text style={{ color: t.heroTextMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>
								TOTAL AMOUNT
							</Text>
							<View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
								<Text style={{ color: t.heroTextMuted, fontSize: 26, fontWeight: "800", marginRight: 6 }}>
									{currency.symbol.trim() || currency.code[0]}
								</Text>
								<TextInput
									value={amountText}
									onChangeText={(x) => setAmountText(x.replace(/[^0-9.]/g, ""))}
									placeholder="0.00"
									placeholderTextColor={t.heroTextMuted}
									keyboardType="decimal-pad"
									style={{ flex: 1, color: t.heroText, fontSize: 38, fontWeight: "800", letterSpacing: -1, padding: 0 }}
								/>
							</View>
							{selectedIds.length > 0 && amount > 0 ? (
								<Text style={{ color: t.heroTextMuted, fontSize: 12, marginTop: 8, fontWeight: "600" }}>
									{money(perHead)} each · {selectedIds.length} people
								</Text>
							) : null}
						</View>

						{/* Description */}
						<Text style={labelStyle(t)}>WHAT FOR?</Text>
						<TextInput
							value={description}
							onChangeText={setDescription}
							placeholder="Dinner, cab, groceries…"
							placeholderTextColor={t.placeholder}
							onFocus={() => setFocused("description")}
							onBlur={() => setFocused((f) => (f === "description" ? null : f))}
							style={{
								backgroundColor: t.surface,
								borderWidth: 1.5,
								borderColor: focused === "description" ? t.accent : t.border,
								borderRadius: RADII.input,
								paddingHorizontal: 16,
								paddingVertical: 14,
								fontSize: 15,
								color: t.textPrimary,
								marginBottom: 20,
							}}
						/>

						{/* Paid by */}
						<Text style={labelStyle(t)}>PAID BY</Text>
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
							style={{ marginBottom: 20 }}
						>
							{members.map((member) => {
								const active = member._id === payerId;
								return (
									<Pressable
										key={member._id}
										onPress={() => {
											tapSelection();
											setPayerId(member._id);
										}}
										style={{
											flexDirection: "row",
											alignItems: "center",
											gap: 8,
											paddingVertical: 8,
											paddingHorizontal: 12,
											borderRadius: RADII.chip,
											backgroundColor: active ? t.accent : t.surface,
											borderWidth: 1.5,
											borderColor: active ? t.accent : t.border,
										}}
									>
										<Image
											source={{ uri: getUserAvatar([member.name, member.email], member.photoURL) }}
											style={{ width: 22, height: 22, borderRadius: RADII.avatar, backgroundColor: t.surface3 }}
										/>
										<Text style={{ fontSize: 13, fontWeight: "700", color: active ? t.onAccent : t.textSecondary }}>
											{memberLabel(member, meId)}
										</Text>
									</Pressable>
								);
							})}
						</ScrollView>

						{/* Split between */}
						<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
							<Text style={labelStyle(t)}>SPLIT EQUALLY BETWEEN</Text>
							<Text style={{ fontSize: 11, fontWeight: "700", color: t.accent }}>
								{selectedIds.length}/{members.length}
							</Text>
						</View>

						<View
							style={{
								backgroundColor: t.surface,
								borderRadius: RADII.card,
								borderWidth: 1,
								borderColor: t.border,
								overflow: "hidden",
								marginBottom: 20,
								width: "100%",
							}}
						>
							{members.map((member, index) => {
								const selected = selectedIds.includes(member._id);
								return (
									<Pressable
										key={member._id}
										onPress={() => toggleMember(member._id)}
										style={({ pressed }) => ({
											paddingHorizontal: 14,
											paddingVertical: 12,
											borderTopWidth: index === 0 ? 0 : 1,
											borderTopColor: t.borderSoft,
											backgroundColor: pressed ? t.surface3 : "transparent",
										})}
									>
										<View style={{ width: "100%", flexDirection: "row", alignItems: "center" }}>
											<View style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 12 }}>
												<Image
													source={{ uri: getUserAvatar([member.name, member.email], member.photoURL) }}
													style={{ width: 34, height: 34, borderRadius: RADII.avatar, backgroundColor: t.surface3 }}
												/>
												<View style={{ flex: 1, minWidth: 0 }}>
													<Text style={{ fontSize: 14, fontWeight: "700", color: t.textPrimary }} numberOfLines={1}>
														{memberLabel(member, meId)}
													</Text>
													{selected && amount > 0 ? (
														<Text style={{ fontSize: 12, color: t.textMuted, marginTop: 1 }} numberOfLines={1}>
															owes {money(shares[member._id] ?? 0)}
														</Text>
													) : null}
												</View>
											</View>
											<View
												style={{
													width: 24,
													height: 24,
													borderRadius: RADII.chip,
													alignItems: "center",
													justifyContent: "center",
													backgroundColor: selected ? t.accent : "transparent",
													borderWidth: selected ? 0 : 1.5,
													borderColor: t.border,
													marginLeft: 12,
													flexShrink: 0,
												}}
											>
												{selected ? <Feather name="check" size={15} color={t.onAccent} /> : null}
											</View>
										</View>
									</Pressable>
								);
							})}
						</View>

						{errorMessage ? (
							<View
								style={{
									backgroundColor: t.dangerSoft,
									borderWidth: 1,
									borderColor: t.dangerBorder,
									borderRadius: RADII.control,
									padding: 12,
									marginBottom: 14,
								}}
							>
								<Text style={{ color: t.danger, fontSize: 13 }}>{errorMessage}</Text>
							</View>
						) : null}

						<Touchable
							haptic="none"
							onPress={handleSubmit}
							disabled={!canSubmit || submitting}
							pressedScale={0.98}
							style={{
								backgroundColor: canSubmit ? t.accent : t.surface3,
								borderRadius: RADII.control,
								paddingVertical: 16,
								flexDirection: "row",
								alignItems: "center",
								justifyContent: "center",
								gap: 8,
							}}
						>
							{submitting ? (
								<ActivityIndicator color={t.onAccent} />
							) : (
								<>
									<Feather name="plus-circle" size={18} color={canSubmit ? t.onAccent : t.textMuted} />
									<Text style={{ color: canSubmit ? t.onAccent : t.textMuted, fontWeight: "800", fontSize: 15 }}>
										{amount > 0 ? `Add ${money(amount)}` : "Add expense"}
									</Text>
								</>
							)}
						</Touchable>
					</ScrollView>
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
}

const labelStyle = (t: Theme) => ({
	fontSize: 11,
	fontWeight: "700" as const,
	letterSpacing: 1.5,
	color: t.textMuted,
	marginBottom: 8,
});
