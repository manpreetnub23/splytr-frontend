import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  addExpense,
  type BackendUser,
  createGroup,
  type Expense,
  type Group,
  getCurrentUser,
  getGroupBalances,
  getGroupExpenses,
  getMyGroups,
} from "../src/api/api";
import { auth } from "../src/firebase/config";
import { useAuth } from "../src/providers/AuthProvider";

const quickActions = [
  { id: "split", label: "Split expense", subtitle: "Add bill and split with friends" },
  { id: "settle", label: "Settle up", subtitle: "Record payment and clear balances" },
  { id: "group", label: "New group", subtitle: "Create trip, home, or office group" },
];

type BillType = "you_get" | "you_owe";

type DashboardBill = {
  id: string;
  title: string;
  group: string;
  amount: number;
  type: BillType;
  createdAt: string;
};

type DashboardTotals = {
  totalGet: number;
  totalOwe: number;
};

type ActionType = "split" | "settle" | "group" | null;

const formatCurrency = (value: number) => `Rs ${value.toFixed(2)}`;

const getEntityId = (entity: string | { _id: string } | undefined) =>
  typeof entity === "string" ? entity : entity?._id ?? "";

const getBillFromExpense = (expense: Expense, meId: string, groupName: string): DashboardBill | null => {
  const paidById = getEntityId(expense.paidBy);
  const splitForMe = expense.splits.find((split) => getEntityId(split.user) === meId)?.amount ?? 0;

  if (paidById === meId) {
    const receivable = Math.max(expense.amount - splitForMe, 0);

    if (receivable <= 0) {
      return null;
    }

    return {
      id: expense._id,
      title: expense.description?.trim() || "Shared expense",
      group: groupName,
      amount: receivable,
      type: "you_get",
      createdAt: expense.createdAt,
    };
  }

  const payable = Math.max(splitForMe, 0);

  if (payable <= 0) {
    return null;
  }

  return {
    id: expense._id,
    title: expense.description?.trim() || "Shared expense",
    group: groupName,
    amount: payable,
    type: "you_owe",
    createdAt: expense.createdAt,
  };
};

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [me, setMe] = useState<BackendUser | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentBills, setRecentBills] = useState<DashboardBill[]>([]);
  const [activeAction, setActiveAction] = useState<ActionType>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedFriendId, setSelectedFriendId] = useState<string>("");
  const [newGroupName, setNewGroupName] = useState("");
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [settleAmount, setSettleAmount] = useState("");
  const [totals, setTotals] = useState<DashboardTotals>({
    totalGet: 0,
    totalOwe: 0,
  });

  const totalBalance = totals.totalGet - totals.totalOwe;

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage(null);

    try {
      const [me, groups] = await Promise.all([getCurrentUser(), getMyGroups()]);
      setMe(me);
      setGroups(groups);

      if (!me?._id) {
        throw new Error("Could not find your backend profile. Please login again.");
      }

      if (groups.length === 0) {
        setTotals({ totalGet: 0, totalOwe: 0 });
        setRecentBills([]);
        return;
      }

      const groupData = await Promise.all(
        groups.map(async (group) => {
          const [expenses, balances] = await Promise.all([
            getGroupExpenses(group._id),
            getGroupBalances(group._id),
          ]);

          return { group, expenses, balances };
        })
      );

      let totalGet = 0;
      let totalOwe = 0;
      const bills: DashboardBill[] = [];

      for (const entry of groupData) {
        const myBalance = entry.balances[me._id] ?? 0;

        if (myBalance > 0) {
          totalGet += myBalance;
        } else if (myBalance < 0) {
          totalOwe += Math.abs(myBalance);
        }

        for (const expense of entry.expenses) {
          const bill = getBillFromExpense(expense, me._id, entry.group.name);

          if (bill) {
            bills.push(bill);
          }
        }
      }

      bills.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTotals({ totalGet, totalOwe });
      setRecentBills(bills.slice(0, 8));
    } catch (error) {
      const message =
        error instanceof Error && error.message.includes("timeout")
          ? "Request timeout. Check backend server and API URL."
          : error instanceof Error && error.message.includes("Network Error")
            ? "Cannot reach backend API. Ensure server is running on port 5000."
            : error instanceof Error
              ? error.message
              : "Failed to load dashboard data.";
      setErrorMessage(message);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/login");
    } catch {
      Alert.alert("Logout failed", "Please try again.");
    }
  };

  const selectedGroup = useMemo(
    () => groups.find((group) => group._id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

  const groupMembers = useMemo(() => selectedGroup?.members ?? [], [selectedGroup]);

  const settlementFriends = useMemo(
    () => groupMembers.filter((member) => member._id !== me?._id),
    [groupMembers, me?._id]
  );

  const round2 = (value: number) => Math.round(value * 100) / 100;

  const resetActionFields = () => {
    setSelectedGroupId("");
    setSelectedFriendId("");
    setNewGroupName("");
    setExpenseTitle("");
    setExpenseAmount("");
    setSettleAmount("");
  };

  const onPressAction = (action: ActionType) => {
    if (!action) {
      return;
    }

    if ((action === "split" || action === "settle") && groups.length === 0) {
      Alert.alert("No groups found", "Pehle New group se group create karo.");
      return;
    }

    setActiveAction(action);
    if ((action === "split" || action === "settle") && !selectedGroupId && groups[0]) {
      setSelectedGroupId(groups[0]._id);
    }

    if (action !== "settle") {
      setSelectedFriendId("");
    }
  };

  const closeAction = () => {
    setActiveAction(null);
    resetActionFields();
  };

  const handleCreateGroup = async () => {
    const name = newGroupName.trim();

    if (!name) {
      Alert.alert("Missing details", "Enter group name.");
      return;
    }

    setActionLoading(true);

    try {
      await createGroup({ name });
      closeAction();
      await loadDashboard(true);
      Alert.alert("Group created", "New group added successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create group.";
      Alert.alert("Create group failed", message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSplitExpense = async () => {
    const amount = Number(expenseAmount);

    if (!selectedGroupId) {
      Alert.alert("Missing details", "Select a group first.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Invalid amount", "Enter a valid expense amount.");
      return;
    }

    const members = selectedGroup?.members ?? [];

    if (members.length === 0) {
      Alert.alert("No members", "Selected group has no members.");
      return;
    }

    const baseShare = round2(amount / members.length);
    const splits = members.map((member, index) => {
      if (index === members.length - 1) {
        const assigned = round2(baseShare * (members.length - 1));
        return { user: member._id, amount: round2(amount - assigned) };
      }

      return { user: member._id, amount: baseShare };
    });

    setActionLoading(true);

    try {
      await addExpense({
        groupId: selectedGroupId,
        amount: round2(amount),
        description: expenseTitle.trim() || "Shared expense",
        splits,
      });
      closeAction();
      await loadDashboard(true);
      Alert.alert("Expense added", "Split expense created successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add expense.";
      Alert.alert("Split failed", message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSettleUp = async () => {
    const amount = Number(settleAmount);

    if (!selectedGroupId) {
      Alert.alert("Missing details", "Select a group first.");
      return;
    }

    if (!selectedFriendId) {
      Alert.alert("Missing details", "Select friend to settle with.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Invalid amount", "Enter a valid settle amount.");
      return;
    }

    setActionLoading(true);

    try {
      await addExpense({
        groupId: selectedGroupId,
        amount: round2(amount),
        description: "Settle up",
        splits: [{ user: selectedFriendId, amount: round2(amount) }],
      });
      closeAction();
      await loadDashboard(true);
      Alert.alert("Settled", "Settlement entry saved.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to settle up.";
      Alert.alert("Settle up failed", message);
    } finally {
      setActionLoading(false);
    }
  };

  const balanceLabel = useMemo(() => {
    if (totalBalance > 0) {
      return "You are owed overall";
    }

    if (totalBalance < 0) {
      return "You owe overall";
    }

    return "You are all settled";
  }, [totalBalance]);

  return (
    <View className="flex-1 bg-[#0d1117] pt-14">
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadDashboard(true)} />}
      >
        <Text className="mb-2 text-xs font-semibold uppercase tracking-[2.5px] text-emerald-400">
          Dashboard
        </Text>
        <Text className="text-3xl font-extrabold text-white">{user?.displayName || "Welcome back"}</Text>
        <Text className="mt-1 text-sm text-zinc-400">{user?.email || "Signed in with Firebase"}</Text>

        {loading ? (
          <View className="mt-12 items-center">
            <ActivityIndicator size="large" color="#10b981" />
            <Text className="mt-3 text-sm text-zinc-400">Loading your balances...</Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View className="mt-6 rounded-2xl border border-rose-900/70 bg-rose-950/30 p-4">
            <Text className="text-sm text-rose-300">{errorMessage}</Text>
          </View>
        ) : null}

        <View className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
          <Text className="text-xs uppercase tracking-[2px] text-zinc-400">Total balance</Text>
          <Text className="mt-2 text-4xl font-extrabold text-white">{formatCurrency(Math.abs(totalBalance))}</Text>
          <Text className={`mt-1 text-sm ${totalBalance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {balanceLabel}
          </Text>

          <View className="mt-5 flex-row gap-3">
            <View className="flex-1 rounded-2xl bg-zinc-800/70 p-3">
              <Text className="text-xs uppercase tracking-[1px] text-zinc-400">You get</Text>
              <Text className="mt-1 text-lg font-bold text-emerald-400">{formatCurrency(totals.totalGet)}</Text>
            </View>
            <View className="flex-1 rounded-2xl bg-zinc-800/70 p-3">
              <Text className="text-xs uppercase tracking-[1px] text-zinc-400">You owe</Text>
              <Text className="mt-1 text-lg font-bold text-rose-400">{formatCurrency(totals.totalOwe)}</Text>
            </View>
          </View>
        </View>

        <Text className="mb-3 mt-8 text-lg font-bold text-white">Split options</Text>
        <View className="gap-3">
          {quickActions.map((action) => (
            <Pressable
              key={action.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-4"
              onPress={() => onPressAction(action.id as ActionType)}
            >
              <Text className="text-base font-semibold text-white">{action.label}</Text>
              <Text className="mt-1 text-sm text-zinc-400">{action.subtitle}</Text>
            </Pressable>
          ))}
        </View>

        {activeAction ? (
          <View className="mt-4 rounded-2xl border border-emerald-900/60 bg-zinc-900 p-4">
            <Text className="text-base font-semibold text-white">
              {activeAction === "group"
                ? "Create new group"
                : activeAction === "split"
                  ? "Split expense"
                  : "Settle up"}
            </Text>

            {activeAction === "group" ? (
              <View className="mt-3">
                <Text className="mb-2 text-sm text-zinc-400">Group name</Text>
                <TextInput
                  value={newGroupName}
                  onChangeText={setNewGroupName}
                  placeholder="e.g. Goa Trip"
                  placeholderTextColor="#71717a"
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-zinc-100"
                />
                <View className="mt-3 flex-row gap-3">
                  <Pressable className="flex-1 rounded-xl border border-zinc-700 px-3 py-3" onPress={closeAction}>
                    <Text className="text-center text-zinc-200">Cancel</Text>
                  </Pressable>
                  <Pressable
                    className={`flex-1 rounded-xl px-3 py-3 ${actionLoading ? "bg-emerald-700/60" : "bg-emerald-600"}`}
                    onPress={handleCreateGroup}
                    disabled={actionLoading}
                  >
                    <Text className="text-center font-semibold text-white">
                      {actionLoading ? "Creating..." : "Create"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View className="mt-3">
                <Text className="mb-2 text-sm text-zinc-400">Select group</Text>
                <View className="flex-row flex-wrap gap-2">
                  {groups.map((group) => (
                    <Pressable
                      key={group._id}
                      className={`rounded-full border px-3 py-2 ${selectedGroupId === group._id ? "border-emerald-500 bg-emerald-900/40" : "border-zinc-700"}`}
                      onPress={() => {
                        setSelectedGroupId(group._id);
                        if (activeAction === "settle") {
                          setSelectedFriendId("");
                        }
                      }}
                    >
                      <Text className="text-sm text-zinc-100">{group.name}</Text>
                    </Pressable>
                  ))}
                </View>

                {activeAction === "split" ? (
                  <>
                    <Text className="mb-2 mt-4 text-sm text-zinc-400">Amount</Text>
                    <TextInput
                      value={expenseAmount}
                      onChangeText={setExpenseAmount}
                      keyboardType="decimal-pad"
                      placeholder="e.g. 1500"
                      placeholderTextColor="#71717a"
                      className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-zinc-100"
                    />
                    <Text className="mb-2 mt-3 text-sm text-zinc-400">Description</Text>
                    <TextInput
                      value={expenseTitle}
                      onChangeText={setExpenseTitle}
                      placeholder="e.g. Dinner"
                      placeholderTextColor="#71717a"
                      className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-zinc-100"
                    />
                  </>
                ) : null}

                {activeAction === "settle" ? (
                  <>
                    <Text className="mb-2 mt-4 text-sm text-zinc-400">Select friend</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {settlementFriends.map((friend) => (
                        <Pressable
                          key={friend._id}
                          className={`rounded-full border px-3 py-2 ${selectedFriendId === friend._id ? "border-emerald-500 bg-emerald-900/40" : "border-zinc-700"}`}
                          onPress={() => setSelectedFriendId(friend._id)}
                        >
                          <Text className="text-sm text-zinc-100">{friend.name || friend.email}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <Text className="mb-2 mt-3 text-sm text-zinc-400">Amount</Text>
                    <TextInput
                      value={settleAmount}
                      onChangeText={setSettleAmount}
                      keyboardType="decimal-pad"
                      placeholder="e.g. 500"
                      placeholderTextColor="#71717a"
                      className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-zinc-100"
                    />
                  </>
                ) : null}

                <View className="mt-4 flex-row gap-3">
                  <Pressable className="flex-1 rounded-xl border border-zinc-700 px-3 py-3" onPress={closeAction}>
                    <Text className="text-center text-zinc-200">Cancel</Text>
                  </Pressable>
                  <Pressable
                    className={`flex-1 rounded-xl px-3 py-3 ${actionLoading ? "bg-emerald-700/60" : "bg-emerald-600"}`}
                    onPress={activeAction === "split" ? handleSplitExpense : handleSettleUp}
                    disabled={actionLoading}
                  >
                    <Text className="text-center font-semibold text-white">
                      {actionLoading ? "Saving..." : activeAction === "split" ? "Add expense" : "Settle"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        ) : null}

        <Text className="mb-3 mt-8 text-lg font-bold text-white">Recent bills</Text>
        <View className="mb-8 gap-3">
          {recentBills.length === 0 ? (
            <View className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-5">
              <Text className="text-sm text-zinc-300">No split bills yet. Add your first expense to start.</Text>
            </View>
          ) : null}

          {recentBills.map((bill) => (
            <View key={bill.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-4">
              <Text className="text-base font-semibold text-white">{bill.title}</Text>
              <Text className="mt-1 text-sm text-zinc-400">{bill.group}</Text>
              <View className="mt-3 flex-row items-center justify-between">
                <Text className={`text-sm font-semibold ${bill.type === "you_get" ? "text-emerald-400" : "text-rose-400"}`}>
                  {bill.type === "you_get" ? "You get back" : "You owe"}
                </Text>
                <Text className={`text-lg font-bold ${bill.type === "you_get" ? "text-emerald-400" : "text-rose-400"}`}>
                  {formatCurrency(bill.amount)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View className="border-t border-zinc-800 px-5 pb-8 pt-4">
        <Pressable className="rounded-2xl border border-zinc-700 px-6 py-4" onPress={handleLogout}>
          <Text className="text-center text-base font-bold text-zinc-100">Log out</Text>
        </Pressable>
      </View>
    </View>
  );
}
