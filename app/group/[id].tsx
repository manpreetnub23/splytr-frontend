import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Image,
	Linking,
	Modal,
	Pressable,
	RefreshControl,
	ScrollView,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
	addGroupMembers,
	deleteGroup,
	getCurrentUser,
	getFriends,
	getGroupBalances,
	getGroupById,
	getGroupExpenses,
	type BackendUser,
	type Expense,
	type Friend,
	type Group,
} from "../../src/api/api";
import AddExpenseModal from "../../src/components/AddExpenseModal";
import Touchable from "../../src/components/Touchable";
import { notifySuccess, tapSelection } from "../../src/haptics";
import { usePrefs } from "../../src/providers/PrefsProvider";
import { RADII, floatShadow, getUserAvatar, type Theme } from "../../src/theme";

const refId = (entity: string | { _id: string } | undefined) =>
	typeof entity === "string" ? entity : entity?._id ?? "";

const refName = (entity: string | BackendUser | { _id: string; name?: string } | undefined) =>
	typeof entity === "string" ? "" : entity?.name?.trim() || "";

const formatDate = (iso: string) => {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

// Best-effort UPI deep-link so "Settle up" opens a real payment app.
const openPaymentApp = async (amount: number, note: string) => {
	const candidates = [
		`tez://upi/pay?am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`,
		`phonepe://pay?amount=${amount}&remarks=${encodeURIComponent(note)}`,
		`paytmmp://pay?am=${amount}&cu=INR`,
		`upi://pay?am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`,
	];
	for (const url of candidates) {
		try {
			if (await Linking.canOpenURL(url)) {
				await Linking.openURL(url);
				return;
			}
		} catch {
			// try next
		}
	}
	try {
		await Linking.openURL(`upi://pay?am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`);
	} catch {
		Alert.alert("No payment app found", "Install a UPI app like GPay, PhonePe or Paytm to pay directly.");
	}
};

export default function GroupDetail() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const params = useLocalSearchParams<{ id: string }>();
	const groupId = params.id;
	const { theme: t, money } = usePrefs();

	const [group, setGroup] = useState<Group | null>(null);
	const [expenses, setExpenses] = useState<Expense[]>([]);
	const [balances, setBalances] = useState<Record<string, number>>({});
	const [meId, setMeId] = useState("");
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [expenseModalOpen, setExpenseModalOpen] = useState(false);
	const [memberModalOpen, setMemberModalOpen] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const [friends, setFriends] = useState<Friend[]>([]);
	const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
	const [addingMembers, setAddingMembers] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const topPad = Math.max(insets.top, 44) + 6;

	const load = useCallback(
		async (refresh = false) => {
			if (!groupId) return;
			if (refresh) setRefreshing(true);
			else setLoading(true);
			setError(null);
			try {
				const [me, groupData, expenseData, balanceData] = await Promise.all([
					getCurrentUser(),
					getGroupById(groupId),
					getGroupExpenses(groupId),
					getGroupBalances(groupId),
				]);
				setMeId(me._id);
				setGroup(groupData);
				setExpenses(expenseData);
				setBalances(balanceData);
			} catch (e) {
				setError(e instanceof Error ? e.message : "Could not load this group.");
			} finally {
				if (refresh) setRefreshing(false);
				else setLoading(false);
			}
		},
		[groupId],
	);

	useEffect(() => {
		void load();
	}, [load]);

	const myBalance = balances[meId] ?? 0;
	const isCreator = Boolean(group?.createdBy && group.createdBy === meId);

	const memberById = useMemo(() => {
		const map: Record<string, BackendUser> = {};
		group?.members.forEach((m) => {
			map[m._id] = m;
		});
		return map;
	}, [group]);

	const openAddMembers = async () => {
		setSelectedFriendIds([]);
		setMemberModalOpen(true);
		try {
			setFriends(await getFriends());
		} catch {
			setFriends([]);
		}
	};

	const availableFriends = useMemo(() => {
		const memberIds = new Set(group?.members.map((m) => m._id));
		return friends.filter((f) => f.friendId && !memberIds.has(f.friendId._id));
	}, [friends, group]);

	const handleAddMembers = async () => {
		if (selectedFriendIds.length === 0) {
			setMemberModalOpen(false);
			return;
		}
		setAddingMembers(true);
		try {
			await addGroupMembers(groupId, selectedFriendIds);
			notifySuccess();
			setMemberModalOpen(false);
			await load(true);
		} catch (e) {
			Alert.alert("Could not add members", e instanceof Error ? e.message : "Try again.");
		} finally {
			setAddingMembers(false);
		}
	};

	const confirmDelete = () => {
		setMenuOpen(false);
		Alert.alert(
			"Delete group?",
			`"${group?.name}" and all its expenses will be permanently removed. This can't be undone.`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						setDeleting(true);
						try {
							await deleteGroup(groupId);
							notifySuccess();
							router.back();
						} catch (e) {
							Alert.alert("Could not delete", e instanceof Error ? e.message : "Try again.");
						} finally {
							setDeleting(false);
						}
					},
				},
			],
		);
	};

	const balanceLabel =
		myBalance > 0 ? "you are owed overall" : myBalance < 0 ? "you owe overall" : "you're all settled up";
	const heroAmountColor =
		myBalance > 0 ? t.heroPositive : myBalance < 0 ? t.heroNegative : t.heroText;

	const headerBtn = (icon: keyof typeof Feather.glyphMap, onPress: () => void, haptic: "light" | "selection" = "light") => (
		<Touchable
			haptic={haptic}
			onPress={onPress}
			pressedScale={0.9}
			style={{
				width: 42,
				height: 42,
				borderRadius: RADII.control,
				backgroundColor: t.surface,
				borderWidth: 1,
				borderColor: t.border,
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<Feather name={icon} size={19} color={t.textPrimary} />
		</Touchable>
	);

	return (
		<View style={{ flex: 1, backgroundColor: t.bg }}>
			{/* Header */}
			<View
				style={{
					paddingTop: topPad,
					paddingHorizontal: 18,
					paddingBottom: 14,
					flexDirection: "row",
					alignItems: "center",
					gap: 10,
				}}
			>
				{headerBtn("chevron-left", () => router.back())}
				<View style={{ flex: 1 }}>
					<Text style={{ fontSize: 20, fontWeight: "800", color: t.textPrimary, letterSpacing: -0.4 }} numberOfLines={1}>
						{group?.name ?? "Group"}
					</Text>
					<Text style={{ fontSize: 12.5, color: t.textMuted, marginTop: 1 }}>
						{group ? `${group.members.length} member${group.members.length === 1 ? "" : "s"}` : " "}
					</Text>
				</View>
				{headerBtn("user-plus", () => void openAddMembers())}
				{headerBtn("more-vertical", () => setMenuOpen(true), "selection")}
			</View>

			{loading ? (
				<View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
					<ActivityIndicator color={t.accent} size="large" />
				</View>
			) : (
				<ScrollView
					showsVerticalScrollIndicator={false}
					contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: Math.max(insets.bottom, 20) + 96 }}
					refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={t.accent} />}
				>
					{error ? (
						<View
							style={{
								backgroundColor: t.dangerSoft,
								borderWidth: 1,
								borderColor: t.dangerBorder,
								borderRadius: RADII.control,
								padding: 14,
								marginBottom: 16,
							}}
						>
							<Text style={{ color: t.danger, fontSize: 13 }}>{error}</Text>
						</View>
					) : null}

					{/* Balance hero */}
					<View
						style={{
							backgroundColor: t.heroBg,
							borderRadius: RADII.card,
							borderWidth: 1,
							borderColor: t.heroBorder,
							padding: 22,
							flexDirection: "row",
						}}
					>
						<View style={{ width: 3, borderRadius: 2, backgroundColor: t.accent, marginRight: 16 }} />
						<View style={{ flex: 1 }}>
							<Text style={{ color: t.heroTextMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>
								YOUR BALANCE HERE
							</Text>
							<Text style={{ color: heroAmountColor, fontSize: 38, fontWeight: "800", letterSpacing: -1.5, marginTop: 8 }}>
								{money(myBalance)}
							</Text>
							<Text style={{ color: t.heroTextMuted, fontSize: 13, marginTop: 3, fontWeight: "500" }}>{balanceLabel}</Text>

							{myBalance < 0 ? (
								<Touchable
									haptic="light"
									pressedScale={0.97}
									onPress={() => void openPaymentApp(Math.abs(myBalance), `Settle up · ${group?.name ?? "Splytr"}`)}
									style={{
										marginTop: 18,
										backgroundColor: t.accent,
										borderRadius: RADII.control,
										paddingVertical: 13,
										flexDirection: "row",
										alignItems: "center",
										justifyContent: "center",
										gap: 8,
									}}
								>
									<Feather name="credit-card" size={16} color={t.onAccent} />
									<Text style={{ color: t.onAccent, fontWeight: "800", fontSize: 14 }}>
										Settle up · {money(myBalance)}
									</Text>
								</Touchable>
							) : null}
						</View>
					</View>

					{/* Members */}
					<SectionHeader theme={t} text="MEMBERS" />
					<View style={{ backgroundColor: t.surface, borderRadius: RADII.card, borderWidth: 1, borderColor: t.border, overflow: "hidden" }}>
						{group?.members.map((member, index) => {
							const bal = balances[member._id] ?? 0;
							const isMe = member._id === meId;
							return (
								<View
									key={member._id}
									style={{
										flexDirection: "row",
										alignItems: "center",
										gap: 12,
										paddingHorizontal: 14,
										paddingVertical: 13,
										borderTopWidth: index === 0 ? 0 : 1,
										borderTopColor: t.borderSoft,
									}}
								>
									<Image
										source={{ uri: getUserAvatar([member.name, member.email], member.photoURL) }}
										style={{ width: 40, height: 40, borderRadius: RADII.avatar, backgroundColor: t.surface3 }}
									/>
									<View style={{ flex: 1 }}>
										<Text style={{ fontSize: 14.5, fontWeight: "700", color: t.textPrimary }}>
											{isMe ? "You" : member.name?.trim() || member.email}
										</Text>
										<Text style={{ fontSize: 12, color: t.textMuted, marginTop: 1 }} numberOfLines={1}>
											{member.email}
										</Text>
									</View>
									<Text
										style={{
											fontSize: 13.5,
											fontWeight: "800",
											color: bal > 0 ? t.positive : bal < 0 ? t.negative : t.textMuted,
										}}
									>
										{bal === 0 ? "settled" : money(bal)}
									</Text>
								</View>
							);
						})}
					</View>

					{/* Expenses */}
					<SectionHeader theme={t} text="EXPENSES" trailing={expenses.length > 0 ? `${expenses.length}` : undefined} />

					{expenses.length === 0 ? (
						<View
							style={{
								backgroundColor: t.surface,
								borderRadius: RADII.card,
								borderWidth: 1,
								borderColor: t.border,
								paddingVertical: 32,
								paddingHorizontal: 22,
								alignItems: "center",
							}}
						>
							<View
								style={{
									width: 56,
									height: 56,
									borderRadius: RADII.tile,
									backgroundColor: t.surface3,
									alignItems: "center",
									justifyContent: "center",
								}}
							>
								<Feather name="file-text" size={24} color={t.textMuted} />
							</View>
							<Text style={{ fontSize: 16, fontWeight: "800", color: t.textPrimary, marginTop: 14 }}>No expenses yet</Text>
							<Text style={{ fontSize: 13, color: t.textSecondary, textAlign: "center", lineHeight: 19, marginTop: 4 }}>
								Add your first shared expense to start tracking who owes what.
							</Text>
							<Touchable
								onPress={() => setExpenseModalOpen(true)}
								pressedScale={0.96}
								style={{
									marginTop: 18,
									backgroundColor: t.accent,
									borderRadius: RADII.control,
									paddingHorizontal: 18,
									paddingVertical: 12,
									flexDirection: "row",
									alignItems: "center",
									gap: 8,
								}}
							>
								<Feather name="plus" size={15} color={t.onAccent} />
								<Text style={{ color: t.onAccent, fontWeight: "800", fontSize: 13.5 }}>Add expense</Text>
							</Touchable>
						</View>
					) : (
						<View style={{ gap: 10 }}>
							{expenses.map((expense) => {
								const payerId = refId(expense.paidBy);
								const paidByMe = payerId === meId;
								const myShare = expense.splits.find((s) => refId(s.user) === meId)?.amount ?? 0;
								const involved = paidByMe || myShare > 0;
								const impact = paidByMe ? expense.amount - myShare : -myShare;
								const payerName = paidByMe ? "you" : refName(expense.paidBy) || memberById[payerId]?.name || "someone";

								return (
									<View
										key={expense._id}
										style={{
											backgroundColor: t.surface,
											borderRadius: RADII.card,
											borderWidth: 1,
											borderColor: t.border,
											padding: 15,
										}}
									>
										<View style={{ flexDirection: "row", alignItems: "center", gap: 13 }}>
											<View
												style={{
													width: 42,
													height: 42,
													borderRadius: RADII.tile,
													backgroundColor: t.surface3,
													alignItems: "center",
													justifyContent: "center",
												}}
											>
												<Feather name="shopping-bag" size={18} color={t.textSecondary} />
											</View>
											<View style={{ flex: 1 }}>
												<Text style={{ fontSize: 15, fontWeight: "700", color: t.textPrimary }} numberOfLines={1}>
													{expense.description?.trim() || "Shared expense"}
												</Text>
												<Text style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
													Paid by {payerName} · {formatDate(expense.createdAt)}
												</Text>
											</View>
											<Text style={{ fontSize: 15, fontWeight: "800", color: t.textPrimary, letterSpacing: -0.3 }}>
												{money(expense.amount)}
											</Text>
										</View>

										{involved && impact !== 0 ? (
											<>
												<View style={{ height: 1, backgroundColor: t.borderSoft, marginTop: 13, marginBottom: 11 }} />
												<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
													<Text
														style={{
															fontSize: 12.5,
															fontWeight: "700",
															color: impact > 0 ? t.positive : t.negative,
														}}
													>
														{impact > 0 ? `you lent ${money(impact)}` : `you owe ${money(impact)}`}
													</Text>
													{impact < 0 ? (
														<Touchable
															haptic="light"
															pressedScale={0.95}
															onPress={() =>
																void openPaymentApp(
																	Math.abs(impact),
																	`${expense.description?.trim() || "Expense"} · Splytr`,
																)
															}
															style={{
																backgroundColor: t.accentSoft,
																borderRadius: RADII.chip,
																paddingHorizontal: 12,
																paddingVertical: 6,
																flexDirection: "row",
																alignItems: "center",
																gap: 5,
															}}
														>
															<Feather name="credit-card" size={12} color={t.accent} />
															<Text style={{ fontSize: 12, fontWeight: "800", color: t.accent }}>Pay</Text>
														</Touchable>
													) : null}
												</View>
											</>
										) : null}
									</View>
								);
							})}
						</View>
					)}
				</ScrollView>
			)}

			{/* Add expense FAB */}
			{!loading && group ? (
				<View style={{ position: "absolute", right: 18, bottom: Math.max(insets.bottom, 20) + 8 }}>
					<Touchable
						onPress={() => setExpenseModalOpen(true)}
						pressedScale={0.93}
						style={{
							backgroundColor: t.accent,
							borderRadius: RADII.fab,
							paddingHorizontal: 18,
							height: 52,
							flexDirection: "row",
							alignItems: "center",
							gap: 8,
							...floatShadow(t),
							shadowColor: t.accent,
						}}
					>
						<Feather name="plus" size={19} color={t.onAccent} />
						<Text style={{ color: t.onAccent, fontSize: 14, fontWeight: "800" }}>Add expense</Text>
					</Touchable>
				</View>
			) : null}

			{group ? (
				<AddExpenseModal
					visible={expenseModalOpen}
					onClose={() => setExpenseModalOpen(false)}
					groupId={groupId}
					groupName={group.name}
					members={group.members}
					meId={meId}
					onCreated={() => {
						setExpenseModalOpen(false);
						void load(true);
					}}
				/>
			) : null}

			{/* Overflow menu */}
			<Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
				<Pressable onPress={() => setMenuOpen(false)} style={{ flex: 1, backgroundColor: t.overlay }}>
					<Pressable
						onPress={(e) => e.stopPropagation()}
						style={{
							position: "absolute",
							top: topPad + 50,
							right: 18,
							backgroundColor: t.surface,
							borderRadius: RADII.card,
							borderWidth: 1,
							borderColor: t.border,
							paddingVertical: 6,
							width: 184,
							...floatShadow(t),
						}}
					>
						<Pressable
							onPress={() => {
								setMenuOpen(false);
								void openAddMembers();
							}}
							style={({ pressed }) => ({
								width: "100%",
								minHeight: 46,
								paddingHorizontal: 18,
								justifyContent: "center",
								backgroundColor: pressed ? t.surface3 : "transparent",
							})}
						>
							<View style={{ width: "100%", flexDirection: "row", alignItems: "center", gap: 12 }}>
								<Feather name="user-plus" size={18} color={t.textSecondary} />
								<Text style={{ flex: 1, fontSize: 14.5, fontWeight: "600", color: t.textPrimary }}>
									Add members
								</Text>
							</View>
						</Pressable>

						{isCreator ? (
							<>
								<View style={{ height: 1, backgroundColor: t.borderSoft, marginHorizontal: 14, marginVertical: 2 }} />
								<Pressable
									onPress={confirmDelete}
									disabled={deleting}
									style={({ pressed }) => ({
										width: "100%",
										minHeight: 46,
										paddingHorizontal: 18,
										justifyContent: "center",
										backgroundColor: pressed ? t.dangerSoft : "transparent",
									})}
								>
									<View style={{ width: "100%", flexDirection: "row", alignItems: "center", gap: 12 }}>
										<Feather name="trash-2" size={18} color={t.danger} />
										<Text style={{ flex: 1, fontSize: 14.5, fontWeight: "700", color: t.danger }}>
											{deleting ? "Deleting…" : "Delete group"}
										</Text>
									</View>
								</Pressable>
							</>
						) : null}
					</Pressable>
				</Pressable>
			</Modal>

			{/* Add members modal */}
			<Modal visible={memberModalOpen} transparent animationType="fade" onRequestClose={() => setMemberModalOpen(false)}>
				<Pressable
					onPress={() => setMemberModalOpen(false)}
					style={{ flex: 1, backgroundColor: t.overlay, justifyContent: "center", paddingHorizontal: 20 }}
				>
					<Pressable
						onPress={(e) => e.stopPropagation()}
						style={{ backgroundColor: t.surface, borderRadius: RADII.sheet, padding: 20, maxHeight: "72%", borderWidth: 1, borderColor: t.border }}
					>
						<Text style={{ fontSize: 19, fontWeight: "800", color: t.textPrimary, letterSpacing: -0.3 }}>Add members</Text>
						<Text style={{ fontSize: 13, color: t.textSecondary, marginTop: 4 }}>Pick friends to add to this group.</Text>

						{availableFriends.length === 0 ? (
							<View style={{ paddingVertical: 26, alignItems: "center", gap: 6 }}>
								<Feather name="users" size={22} color={t.textMuted} />
								<Text style={{ fontSize: 13, color: t.textSecondary, textAlign: "center", lineHeight: 19 }}>
									No friends left to add. Add friends from the Friends tab first.
								</Text>
							</View>
						) : (
							<ScrollView style={{ marginTop: 14 }} showsVerticalScrollIndicator={false}>
								{availableFriends.map((friend) => {
									const person = friend.friendId;
									const selected = selectedFriendIds.includes(person._id);
									return (
										<Pressable
											key={friend._id}
											onPress={() => {
												tapSelection();
												setSelectedFriendIds((prev) =>
													prev.includes(person._id) ? prev.filter((id) => id !== person._id) : [...prev, person._id],
												);
											}}
											style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11 }}
										>
											<Image
												source={{ uri: getUserAvatar([person.name, person.email], person.photoURL) }}
												style={{ width: 40, height: 40, borderRadius: RADII.avatar, backgroundColor: t.surface3 }}
											/>
											<View style={{ flex: 1 }}>
												<Text style={{ fontSize: 14, fontWeight: "700", color: t.textPrimary }}>
													{person.name?.trim() || person.email}
												</Text>
												<Text style={{ fontSize: 12, color: t.textMuted }} numberOfLines={1}>
													{person.email}
												</Text>
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
												}}
											>
												{selected ? <Feather name="check" size={15} color={t.onAccent} /> : null}
											</View>
										</Pressable>
									);
								})}
							</ScrollView>
						)}

						<View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
							<Pressable
								onPress={() => setMemberModalOpen(false)}
								style={({ pressed }) => ({
									flex: 1,
									borderRadius: RADII.control,
									borderWidth: 1,
									borderColor: t.border,
									alignItems: "center",
									paddingVertical: 13,
									backgroundColor: pressed ? t.surface3 : t.surface2,
								})}
							>
								<Text style={{ fontSize: 13.5, fontWeight: "700", color: t.textSecondary }}>Cancel</Text>
							</Pressable>
							<Pressable
								onPress={handleAddMembers}
								disabled={addingMembers || selectedFriendIds.length === 0}
								style={{
									flex: 1,
									borderRadius: RADII.control,
									backgroundColor: selectedFriendIds.length > 0 ? t.accent : t.surface3,
									alignItems: "center",
									paddingVertical: 13,
									opacity: addingMembers ? 0.6 : 1,
								}}
							>
								<Text style={{ fontSize: 13.5, fontWeight: "800", color: selectedFriendIds.length > 0 ? t.onAccent : t.textMuted }}>
									{addingMembers ? "Adding…" : selectedFriendIds.length > 0 ? `Add ${selectedFriendIds.length}` : "Add"}
								</Text>
							</Pressable>
						</View>
					</Pressable>
				</Pressable>
			</Modal>
		</View>
	);
}

function SectionHeader({ theme: t, text, trailing }: { theme: Theme; text: string; trailing?: string }) {
	return (
		<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 24, marginBottom: 12 }}>
			<Text style={{ fontSize: 11, fontWeight: "800", letterSpacing: 1.5, color: t.textMuted }}>{text}</Text>
			{trailing ? <Text style={{ fontSize: 11, fontWeight: "800", color: t.textMuted }}>{trailing}</Text> : null}
		</View>
	);
}
