import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  addFriend,
  createGroup,
  getCurrentUser,
  getFriends,
  getGroupBalances,
  getMyGroups,
  type Friend,
  type Group,
} from "../src/api/api";
import Touchable from "../src/components/Touchable";
import { auth } from "../src/firebase/config";
import { notifySuccess, tapSelection } from "../src/haptics";
import { useAuth } from "../src/providers/AuthProvider";
import { usePrefs } from "../src/providers/PrefsProvider";
import { CURRENCIES, RADII, floatShadow, getUserAvatar, type Theme, type ThemeMode } from "../src/theme";

type TabKey = "groups" | "friends" | "settings";
type FilterKey = "all" | "outstanding" | "owe" | "owed";

type GroupWithBalance = {
  group: Group;
  myBalance: number;
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "outstanding", label: "Outstanding" },
  { key: "owe", label: "You owe" },
  { key: "owed", label: "You're owed" },
];

const TAB_TITLE: Record<TabKey, string> = {
  groups: "Groups",
  friends: "Friends",
  settings: "Settings",
};

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme: t, mode, setMode, currency, setCurrencyCode, money } = usePrefs();

  const [activeTab, setActiveTab] = useState<TabKey>("groups");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [groups, setGroups] = useState<GroupWithBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [friendsError, setFriendsError] = useState<string | null>(null);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [friendEmail, setFriendEmail] = useState("");
  const [isAddingFriend, setIsAddingFriend] = useState(false);

  const [isPickGroupOpen, setIsPickGroupOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);

  const topPad = Math.max(insets.top, 44) + 6;
  const navBottom = Math.max(insets.bottom, 14);
  const navHeight = 62;

  const meAvatar = getUserAvatar([user?.displayName, user?.email], user?.photoURL);
  const firstName = (user?.displayName || user?.email || "there").split(" ")[0].split("@")[0];

  const loadGroups = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMessage(null);
    try {
      const [me, groupsData] = await Promise.all([getCurrentUser(), getMyGroups()]);
      const withBalances = await Promise.all(
        groupsData.map(async (group) => {
          try {
            const balances = await getGroupBalances(group._id);
            return { group, myBalance: balances[me._id] ?? 0 };
          } catch {
            return { group, myBalance: 0 };
          }
        })
      );
      setGroups(withBalances);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load groups.");
    } finally {
      if (refresh) setIsRefreshing(false);
      else setIsLoading(false);
    }
  }, []);

  const loadFriends = useCallback(async () => {
    setIsLoadingFriends(true);
    setFriendsError(null);
    try {
      setFriends(await getFriends());
    } catch (error) {
      setFriendsError(error instanceof Error ? error.message : "Could not load friends.");
    } finally {
      setIsLoadingFriends(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadGroups();
    }, [loadGroups])
  );

  useEffect(() => {
    if (activeTab === "friends") void loadFriends();
  }, [activeTab, loadFriends]);

  const overview = useMemo(() => {
    let owed = 0;
    let owe = 0;
    for (const { myBalance } of groups) {
      if (myBalance > 0) owed += myBalance;
      else if (myBalance < 0) owe += -myBalance;
    }
    return { owed, owe, net: owed - owe };
  }, [groups]);

  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return groups.filter(({ group, myBalance }) => {
      const matchesSearch =
        query.length === 0 ||
        group.name.toLowerCase().includes(query) ||
        group.members.some(
          (m) => m.name?.toLowerCase().includes(query) || m.email.toLowerCase().includes(query)
        );
      if (!matchesSearch) return false;
      if (filter === "outstanding") return myBalance !== 0;
      if (filter === "owe") return myBalance < 0;
      if (filter === "owed") return myBalance > 0;
      return true;
    });
  }, [filter, groups, searchQuery]);

  const openCreateGroup = () => {
    setNewGroupName("");
    setIsCreateModalOpen(true);
  };

  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name) {
      Alert.alert("Group name required", "Please enter a group name.");
      return;
    }
    setIsCreatingGroup(true);
    try {
      await createGroup({ name });
      notifySuccess();
      setIsCreateModalOpen(false);
      setNewGroupName("");
      await loadGroups(true);
    } catch (error) {
      Alert.alert("Could not create group", error instanceof Error ? error.message : "Try again.");
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const openGroup = (groupId: string) => {
    router.push({ pathname: "/group/[id]", params: { id: groupId } });
  };

  const handleAddExpense = () => {
    if (groups.length === 1) return openGroup(groups[0].group._id);
    setIsPickGroupOpen(true);
  };

  const openAddFriend = () => {
    setFriendEmail("");
    setIsAddFriendOpen(true);
  };

  const handleAddFriend = async () => {
    const email = friendEmail.trim().toLowerCase();
    if (!email) {
      Alert.alert("Email required", "Enter your friend's email address.");
      return;
    }
    setIsAddingFriend(true);
    try {
      await addFriend(email);
      notifySuccess();
      setIsAddFriendOpen(false);
      setFriendEmail("");
      await loadFriends();
    } catch (error) {
      Alert.alert("Could not add friend", error instanceof Error ? error.message : "Try again.");
    } finally {
      setIsAddingFriend(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilter("all");
  };

  const handleLogout = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
          } catch {
            Alert.alert("Sign out failed", "Please try again.");
          }
        },
      },
    ]);
  };

  // ── Renders ─────────────────────────────────────────────────

  const renderOverview = () => {
    const net = overview.net;
    const netColor = net > 0 ? t.heroPositive : net < 0 ? t.heroNegative : t.heroTextMuted;
    return (
      <View style={{ paddingHorizontal: 18, paddingTop: 4 }}>
        <View
          style={{
            backgroundColor: t.heroBg,
            borderRadius: RADII.card,
            borderWidth: 1,
            borderColor: t.heroBorder,
            padding: 20,
            flexDirection: "row",
          }}
        >
          {/* red accent spine */}
          <View style={{ width: 3, borderRadius: 2, backgroundColor: t.accent, marginRight: 16 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.heroTextMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>
              TOTAL BALANCE
            </Text>
            <Text style={{ color: netColor, fontSize: 34, fontWeight: "800", letterSpacing: -1, marginTop: 8 }}>
              {money(net)}
            </Text>
            <Text style={{ color: t.heroTextMuted, fontSize: 13, marginTop: 2, fontWeight: "500" }}>
              {net > 0 ? "you are owed overall" : net < 0 ? "you owe overall" : "you're all settled up"}
            </Text>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
              <View style={{ flex: 1, backgroundColor: t.heroSubtle, borderRadius: RADII.tile, paddingVertical: 12, paddingHorizontal: 13 }}>
                <Text style={{ color: t.heroTextMuted, fontSize: 10, fontWeight: "700", letterSpacing: 1 }}>
                  {"YOU'RE OWED"}
                </Text>
                <Text style={{ color: t.heroPositive, fontSize: 17, fontWeight: "800", marginTop: 6 }}>
                  {money(overview.owed)}
                </Text>
              </View>
              <View style={{ flex: 1, backgroundColor: t.heroSubtle, borderRadius: RADII.tile, paddingVertical: 12, paddingHorizontal: 13 }}>
                <Text style={{ color: t.heroTextMuted, fontSize: 10, fontWeight: "700", letterSpacing: 1 }}>
                  YOU OWE
                </Text>
                <Text style={{ color: t.heroNegative, fontSize: 17, fontWeight: "800", marginTop: 6 }}>
                  {money(overview.owe)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderGroupTab = () => {
    const noGroups = groups.length === 0;
    const noMatches = groups.length > 0 && filteredGroups.length === 0;

    return (
      <>
        {!noGroups ? renderOverview() : null}

        {!noGroups ? (
          <View style={{ paddingHorizontal: 18, paddingTop: 16 }}>
            <View
              style={{
                backgroundColor: t.surface,
                borderRadius: RADII.input,
                borderWidth: 1,
                borderColor: t.border,
                paddingHorizontal: 14,
                paddingVertical: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Feather name="search" size={17} color={t.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search groups or people"
                placeholderTextColor={t.placeholder}
                style={{ flex: 1, fontSize: 15, color: t.textPrimary }}
              />
              {searchQuery.length > 0 ? (
                <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                  <Feather name="x" size={16} color={t.textMuted} />
                </Pressable>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: 12, gap: 8, paddingRight: 8 }}
            >
              {FILTERS.map((item) => {
                const active = item.key === filter;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => {
                      tapSelection();
                      setFilter(item.key);
                    }}
                    style={({ pressed }) => ({
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: RADII.chip,
                      backgroundColor: active ? t.accent : "#FFFFFF",
                      borderWidth: 1,
                      borderColor: active ? t.accent : pressed ? t.borderStrong : t.border,
                    })}
                  >
                    <Text style={{ fontSize: 12.5, fontWeight: "700", color: active ? t.onAccent : "#18181B" }}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: 18, paddingTop: 14, gap: 12 }}>
          {noGroups && !isLoading ? (
            <EmptyState
              theme={t}
              icon="users"
              title="No groups yet"
              message="Create a group and start splitting expenses with friends."
              ctaLabel={isCreateModalOpen ? undefined : "Create a group"}
              ctaIcon="plus"
              onCta={isCreateModalOpen ? undefined : openCreateGroup}
            />
          ) : null}

          {noMatches ? (
            <EmptyState
              theme={t}
              icon="inbox"
              title="Nothing to show here"
              message={
                filter === "owe"
                  ? "You don't owe anything in any group right now."
                  : filter === "owed"
                    ? "Nobody owes you in any group right now."
                    : "No groups match your search or filter."
              }
              ctaLabel="Show all groups"
              ctaIcon="rotate-ccw"
              onCta={clearFilters}
            />
          ) : null}

          {filteredGroups.map(({ group, myBalance }) => {
            const label = myBalance > 0 ? "you're owed" : myBalance < 0 ? "you owe" : "settled up";
            const amountColor = myBalance > 0 ? t.positive : myBalance < 0 ? t.negative : t.textMuted;

            return (
              <Touchable
                key={group._id}
                onPress={() => openGroup(group._id)}
                pressedScale={0.985}
                style={{
                  backgroundColor: t.surface,
                  borderRadius: RADII.card,
                  borderWidth: 1,
                  borderColor: t.border,
                  padding: 16,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: RADII.tile,
                      backgroundColor: t.accentSoft,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 13,
                    }}
                  >
                    <Feather name="users" size={19} color={t.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: t.textPrimary, letterSpacing: -0.2 }} numberOfLines={1}>
                      {group.name}
                    </Text>
                    <Text style={{ marginTop: 3, fontSize: 12.5, color: t.textMuted }}>
                      {group.members.length} member{group.members.length === 1 ? "" : "s"}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", marginLeft: 8 }}>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: amountColor, letterSpacing: -0.3 }}>
                      {myBalance === 0 ? "—" : money(myBalance)}
                    </Text>
                    <Text style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>{label}</Text>
                  </View>
                </View>

                <View style={{ height: 1, backgroundColor: t.borderSoft, marginTop: 14, marginBottom: 14 }} />

                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ flexDirection: "row", flex: 1, paddingVertical: 2 }}>
                    {group.members.slice(0, 5).map((member, index) => (
                      <Image
                        key={member._id}
                        source={{ uri: getUserAvatar([member.name, member.email], member.photoURL) }}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: RADII.avatar,
                          marginLeft: index === 0 ? 0 : 5,
                          borderWidth: 1.5,
                          borderColor: t.border,
                          backgroundColor: t.surface3,
                        }}
                      />
                    ))}
                    {group.members.length > 5 ? (
                      <View
                        style={{
                          marginLeft: 5,
                          width: 28,
                          height: 28,
                          borderRadius: RADII.avatar,
                          backgroundColor: t.surface3,
                          borderWidth: 1.5,
                          borderColor: t.border,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: "800", color: t.textSecondary }}>
                          +{group.members.length - 5}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: t.textMuted }}>Open</Text>
                    <Feather name="chevron-right" size={16} color={t.textMuted} />
                  </View>
                </View>
              </Touchable>
            );
          })}
        </View>
      </>
    );
  };

  const renderFriendsTab = () => (
    <View style={{ paddingHorizontal: 18, paddingTop: 6, gap: 12 }}>
      {!isAddFriendOpen ? (
        <Touchable
          onPress={openAddFriend}
          pressedScale={0.98}
          style={{
            backgroundColor: t.accent,
            borderRadius: RADII.control,
            paddingVertical: 15,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Feather name="user-plus" size={17} color={t.onAccent} />
          <Text style={{ color: t.onAccent, fontWeight: "800", fontSize: 14 }}>Add a friend</Text>
        </Touchable>
      ) : null}

      {friendsError ? <ErrorBox theme={t} message={friendsError} /> : null}

      {isLoadingFriends && friends.length === 0 ? (
        <View style={{ paddingTop: 40, alignItems: "center" }}>
          <ActivityIndicator color={t.accent} />
        </View>
      ) : null}

      {!isLoadingFriends && friends.length === 0 && !friendsError ? (
        <EmptyState
          theme={t}
          icon="users"
          title="No friends yet"
          message="Add friends by email to build groups and split expenses together."
          ctaLabel={isAddFriendOpen ? undefined : "Add a friend"}
          ctaIcon="user-plus"
          onCta={isAddFriendOpen ? undefined : openAddFriend}
        />
      ) : null}

      {friends.map((friend) => {
        const person = friend.friendId;
        if (!person) return null;
        return (
          <View
            key={friend._id}
            style={{
              backgroundColor: t.surface,
              borderRadius: RADII.card,
              borderWidth: 1,
              borderColor: t.border,
              padding: 13,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Image
              source={{ uri: getUserAvatar([person.name, person.email], person.photoURL) }}
              style={{ width: 42, height: 42, borderRadius: RADII.avatar, backgroundColor: t.surface3 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: t.textPrimary }}>
                {person.name?.trim() || person.email}
              </Text>
              <Text style={{ fontSize: 12.5, color: t.textMuted }} numberOfLines={1}>
                {person.email}
              </Text>
            </View>
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: RADII.tile,
                backgroundColor: t.positiveSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="check" size={15} color={t.positive} />
            </View>
          </View>
        );
      })}
    </View>
  );

  const renderThemeOption = (value: ThemeMode, icon: keyof typeof Feather.glyphMap, label: string) => {
    const active = mode === value;
    return (
      <Pressable
        key={value}
        onPress={() => {
          tapSelection();
          setMode(value);
        }}
        style={({ pressed }) => ({
          flex: 1,
          borderRadius: RADII.control,
          borderWidth: 1.5,
          borderColor: active ? t.accent : t.border,
          backgroundColor: active ? t.accentSoft : pressed ? t.surface3 : t.surface2,
          padding: 10,
          gap: 10,
        })}
      >
        <ThemePreview mode={value} theme={t} />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Feather name={icon} size={14} color={active ? t.accent : t.textSecondary} />
          <Text style={{ fontSize: 12.5, fontWeight: "700", color: active ? t.accent : t.textSecondary }}>
            {label}
          </Text>
          {active ? <Feather name="check" size={13} color={t.accent} /> : null}
        </View>
      </Pressable>
    );
  };

  const renderSettingsTab = () => (
    <View style={{ paddingHorizontal: 18, paddingTop: 6, gap: 14 }}>
      <View style={settingsCardStyle(t)}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Image
            source={{ uri: meAvatar }}
            style={{ width: 54, height: 54, borderRadius: RADII.avatar, backgroundColor: t.surface3 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: "800", color: t.textPrimary }}>
              {user?.displayName || "Splytr user"}
            </Text>
            <Text style={{ fontSize: 13, color: t.textMuted, marginTop: 2 }}>
              {user?.email || "No email"}
            </Text>
          </View>
        </View>
      </View>

      <View style={settingsCardStyle(t)}>
        <SectionLabel theme={t} icon="sliders" text="APPEARANCE" />
        <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
          {renderThemeOption("light", "sun", "Light")}
          {renderThemeOption("dark", "moon", "Dark")}
          {renderThemeOption("system", "smartphone", "System")}
        </View>
      </View>

      <View style={settingsCardStyle(t)}>
        <SectionLabel theme={t} icon="dollar-sign" text="CURRENCY" />
        <Touchable
          haptic="selection"
          pressedScale={0.99}
          onPress={() => setIsCurrencyOpen(true)}
          style={{
            marginTop: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: t.surface2,
            borderRadius: RADII.control,
            borderWidth: 1,
            borderColor: t.border,
            paddingHorizontal: 14,
            paddingVertical: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: RADII.tile,
                backgroundColor: t.accentSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: t.accent, fontWeight: "800", fontSize: 15 }}>
                {currency.symbol.trim() || currency.code[0]}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 14, fontWeight: "700", color: t.textPrimary }}>{currency.label}</Text>
              <Text style={{ fontSize: 12, color: t.textMuted, marginTop: 1 }}>Sample: {money(1234.5)}</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color={t.textMuted} />
        </Touchable>
      </View>

      <View style={settingsCardStyle(t)}>
        <SectionLabel theme={t} icon="info" text="ABOUT" />
        <View style={{ marginTop: 6 }}>
          <SettingsRow theme={t} icon="shield" label="Privacy" value="Your data stays private" />
          <View style={{ height: 1, backgroundColor: t.borderSoft }} />
          <SettingsRow theme={t} icon="star" label="Version" value="1.0.0" />
        </View>
      </View>

      <Touchable
        haptic="none"
        onPress={handleLogout}
        pressedScale={0.98}
        style={{
          backgroundColor: t.dangerSoft,
          borderRadius: RADII.control,
          borderWidth: 1,
          borderColor: t.dangerBorder,
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <Feather name="log-out" size={16} color={t.danger} />
        <Text style={{ fontSize: 14, fontWeight: "800", color: t.danger }}>Sign out</Text>
      </Touchable>

      <Text style={{ textAlign: "center", fontSize: 12, color: t.textMuted, marginTop: 2 }}>
        splytr · split bills, stay friends
      </Text>
    </View>
  );

  const headerIconBtn = (
    icon: keyof typeof Feather.glyphMap,
    onPress: () => void,
    active = false,
  ) => (
    <Touchable
      haptic="selection"
      onPress={onPress}
      pressedScale={0.9}
      style={{
        width: 42,
        height: 42,
        borderRadius: RADII.control,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? t.accentSoft : t.surface,
        borderWidth: 1,
        borderColor: active ? t.accent : t.border,
      }}
    >
      <Feather name={icon} size={19} color={active ? t.accent : t.textPrimary} />
    </Touchable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {/* Header */}
      <View style={{ paddingTop: topPad, paddingHorizontal: 18, paddingBottom: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            {activeTab === "groups" ? (
              <Text style={{ fontSize: 13, color: t.textMuted, fontWeight: "500" }}>Hi, {firstName}</Text>
            ) : null}
            <Text
              style={{
                fontSize: 26,
                fontWeight: "800",
                color: t.textPrimary,
                letterSpacing: -0.5,
                marginTop: activeTab === "groups" ? 2 : 10,
              }}
            >
              {TAB_TITLE[activeTab]}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
            {activeTab === "groups" && !isCreateModalOpen
              ? headerIconBtn("plus", openCreateGroup)
              : null}
            {headerIconBtn("users", () => setActiveTab("friends"), activeTab === "friends")}
            <Pressable onPress={() => setActiveTab("settings")}>
              <Image
                source={{ uri: meAvatar }}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: RADII.avatar,
                  backgroundColor: t.surface3,
                  borderWidth: 1,
                  borderColor: activeTab === "settings" ? t.accent : t.border,
                }}
              />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          activeTab === "groups" ? (
            <RefreshControl refreshing={isRefreshing} onRefresh={() => void loadGroups(true)} tintColor={t.accent} />
          ) : undefined
        }
        contentContainerStyle={{ paddingBottom: navBottom + navHeight + 90 }}
      >
        {isLoading && groups.length === 0 && activeTab === "groups" ? (
          <View style={{ paddingTop: 80, alignItems: "center" }}>
            <ActivityIndicator color={t.accent} size="large" />
          </View>
        ) : null}

        {errorMessage && activeTab === "groups" ? (
          <View style={{ paddingHorizontal: 18, paddingTop: 8 }}>
            <ErrorBox theme={t} message={errorMessage} />
          </View>
        ) : null}

        {activeTab === "groups" ? renderGroupTab() : null}
        {activeTab === "friends" ? renderFriendsTab() : null}
        {activeTab === "settings" ? renderSettingsTab() : null}
      </ScrollView>

      {/* FAB — sits clear above the bottom nav */}
      {activeTab === "groups" && groups.length > 0 && !isCreateModalOpen && !isPickGroupOpen ? (
        <View style={{ position: "absolute", right: 18, bottom: navBottom + navHeight + 16 }}>
          <Touchable
            haptic="light"
            onPress={handleAddExpense}
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

      {/* Bottom nav — single flat bar; each icon centered within its half, no labels */}
      <View
        style={{
          position: "absolute",
          display: "flex",
          justifyContent: "space-evenly",
          gap: 140,
          left: 16,
          right: 16,
          bottom: navBottom,
          height: navHeight,
          backgroundColor: t.tabBar,
          borderRadius: RADII.card,
          borderWidth: 1,
          borderColor: t.border,
          flexDirection: "row",
          alignItems: "center",
          ...floatShadow(t),
        }}
      >
        {([
          { key: "groups", icon: "home" },
          { key: "settings", icon: "settings" },
        ] as { key: TabKey; icon: keyof typeof Feather.glyphMap }[]).map((item) => {
          const active = item.key === activeTab;
          return (
            <Pressable
              key={item.key}
              onPress={() => {
                tapSelection();
                setActiveTab(item.key);
              }}
              style={({ pressed }) => ({
                flex: 1,
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.55 : 1,
              })}
            >
              <Feather name={item.icon} size={23} color={active ? t.accent : t.tabInactive} />
            </Pressable>
          );
        })}
      </View>

      {/* Create group */}
      <CenterModal visible={isCreateModalOpen} theme={t} onClose={() => setIsCreateModalOpen(false)}>
        <Text style={modalTitleStyle(t)}>Create a group</Text>
        <Text style={modalSubtitleStyle(t)}>Give it a name to start splitting with friends.</Text>
        <TextInput
          value={newGroupName}
          onChangeText={setNewGroupName}
          autoFocus
          placeholder="e.g. Goa Trip, Flatmates"
          placeholderTextColor={t.placeholder}
          style={modalInputStyle(t)}
        />
        <ModalActions
          theme={t}
          onCancel={() => setIsCreateModalOpen(false)}
          confirmLabel={isCreatingGroup ? "Creating…" : "Create"}
          onConfirm={handleCreateGroup}
          confirmDisabled={isCreatingGroup}
        />
      </CenterModal>

      {/* Add friend */}
      <CenterModal visible={isAddFriendOpen} theme={t} onClose={() => setIsAddFriendOpen(false)}>
        <Text style={modalTitleStyle(t)}>Add a friend</Text>
        <Text style={modalSubtitleStyle(t)}>Enter the email your friend signed up with.</Text>
        <TextInput
          value={friendEmail}
          onChangeText={setFriendEmail}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="friend@example.com"
          placeholderTextColor={t.placeholder}
          style={modalInputStyle(t)}
        />
        <ModalActions
          theme={t}
          onCancel={() => setIsAddFriendOpen(false)}
          confirmLabel={isAddingFriend ? "Adding…" : "Add friend"}
          onConfirm={handleAddFriend}
          confirmDisabled={isAddingFriend}
        />
      </CenterModal>

      {/* Pick group for expense */}
      <CenterModal visible={isPickGroupOpen} theme={t} onClose={() => setIsPickGroupOpen(false)}>
        <Text style={modalTitleStyle(t)}>Add expense to…</Text>
        <Text style={modalSubtitleStyle(t)}>Choose a group.</Text>
        <ScrollView style={{ marginTop: 14, maxHeight: 320 }} showsVerticalScrollIndicator={false}>
          {groups.map(({ group }) => (
            <Touchable
              key={group._id}
              haptic="selection"
              pressedScale={0.985}
              onPress={() => {
                setIsPickGroupOpen(false);
                openGroup(group._id);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderRadius: RADII.control,
                borderWidth: 1,
                borderColor: t.border,
                backgroundColor: t.surface2,
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: RADII.tile,
                  backgroundColor: t.accentSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="users" size={17} color={t.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: t.textPrimary }}>{group.name}</Text>
                <Text style={{ fontSize: 12, color: t.textMuted, marginTop: 1 }}>
                  {group.members.length} member{group.members.length === 1 ? "" : "s"}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={t.textMuted} />
            </Touchable>
          ))}
        </ScrollView>
      </CenterModal>

      {/* Currency */}
      <CenterModal visible={isCurrencyOpen} theme={t} onClose={() => setIsCurrencyOpen(false)}>
        <Text style={modalTitleStyle(t)}>Currency</Text>
        <Text style={modalSubtitleStyle(t)}>Pick how amounts are shown across the app.</Text>
        <View style={{ marginTop: 14 }}>
          {CURRENCIES.map((item) => {
            const active = item.code === currency.code;
            return (
              <Touchable
                key={item.code}
                haptic="selection"
                pressedScale={0.985}
                onPress={() => {
                  setCurrencyCode(item.code);
                  setIsCurrencyOpen(false);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderRadius: RADII.control,
                  borderWidth: 1,
                  borderColor: active ? t.accent : t.border,
                  backgroundColor: active ? t.accentSoft : t.surface2,
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: RADII.tile,
                    backgroundColor: t.surface,
                    borderWidth: 1,
                    borderColor: t.border,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontWeight: "800", fontSize: 15, color: t.textPrimary }}>
                    {item.symbol.trim() || item.code[0]}
                  </Text>
                </View>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: t.textPrimary }}>{item.label}</Text>
                {active ? <Feather name="check" size={18} color={t.accent} /> : null}
              </Touchable>
            );
          })}
        </View>
      </CenterModal>
    </View>
  );
}

// ── Shared bits ─────────────────────────────────────────────────

function EmptyState({
  theme: t,
  icon,
  title,
  message,
  ctaLabel,
  ctaIcon,
  onCta,
}: {
  theme: Theme;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  message: string;
  ctaLabel?: string;
  ctaIcon?: keyof typeof Feather.glyphMap;
  onCta?: () => void;
}) {
  return (
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
        <Feather name={icon} size={24} color={t.textMuted} />
      </View>
      <Text style={{ fontSize: 16, fontWeight: "800", color: t.textPrimary, marginTop: 14 }}>{title}</Text>
      <Text style={{ fontSize: 13, color: t.textSecondary, textAlign: "center", lineHeight: 19, marginTop: 4 }}>
        {message}
      </Text>
      {ctaLabel && onCta ? (
        <Touchable
          onPress={onCta}
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
          {ctaIcon ? <Feather name={ctaIcon} size={15} color={t.onAccent} /> : null}
          <Text style={{ color: t.onAccent, fontWeight: "800", fontSize: 13.5 }}>{ctaLabel}</Text>
        </Touchable>
      ) : null}
    </View>
  );
}

// A miniature preview of each theme so the Appearance options read as premium
// swatches rather than plain buttons.
function ThemePreview({ mode, theme: t }: { mode: ThemeMode; theme: Theme }) {
  const light = { bg: "#FFFFFF", line: "#E4E4E7" };
  const dark = { bg: "#18181B", line: "#2B2B31" };
  const accent = "#C1121F";

  const Pane = ({ c, align }: { c: { bg: string; line: string }; align: "flex-start" | "flex-end" }) => (
    <View style={{ flex: 1, backgroundColor: c.bg, padding: 8, gap: 5, alignItems: align }}>
      <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: accent }} />
      <View style={{ width: "72%", height: 3.5, borderRadius: 2, backgroundColor: c.line }} />
      <View style={{ width: "48%", height: 3.5, borderRadius: 2, backgroundColor: c.line }} />
    </View>
  );

  return (
    <View
      style={{
        height: 52,
        borderRadius: RADII.tile,
        borderWidth: 1,
        borderColor: t.border,
        overflow: "hidden",
        flexDirection: "row",
      }}
    >
      {mode === "system" ? (
        <>
          <Pane c={light} align="flex-start" />
          <Pane c={dark} align="flex-end" />
        </>
      ) : (
        <Pane c={mode === "dark" ? dark : light} align="flex-start" />
      )}
    </View>
  );
}

function SectionLabel({ theme: t, icon, text }: { theme: Theme; icon: keyof typeof Feather.glyphMap; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
      <Feather name={icon} size={13} color={t.textMuted} />
      <Text style={{ fontSize: 11, fontWeight: "800", letterSpacing: 1.5, color: t.textMuted }}>{text}</Text>
    </View>
  );
}

function SettingsRow({
  theme: t,
  icon,
  label,
  value,
}: {
  theme: Theme;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: RADII.tile,
          backgroundColor: t.surface2,
          borderWidth: 1,
          borderColor: t.border,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Feather name={icon} size={15} color={t.textSecondary} />
      </View>
      <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: t.textPrimary }}>{label}</Text>
      <Text style={{ fontSize: 13, color: t.textMuted }}>{value}</Text>
    </View>
  );
}

function ErrorBox({ theme: t, message }: { theme: Theme; message: string }) {
  return (
    <View
      style={{
        backgroundColor: t.dangerSoft,
        borderWidth: 1,
        borderColor: t.dangerBorder,
        borderRadius: RADII.control,
        padding: 12,
      }}
    >
      <Text style={{ color: t.danger, fontSize: 13 }}>{message}</Text>
    </View>
  );
}

function CenterModal({
  visible,
  theme: t,
  onClose,
  children,
}: {
  visible: boolean;
  theme: Theme;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: t.overlay, justifyContent: "center", paddingHorizontal: 20 }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ backgroundColor: t.surface, borderRadius: RADII.sheet, padding: 20, borderWidth: 1, borderColor: t.border }}
        >
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ModalActions({
  theme: t,
  onCancel,
  onConfirm,
  confirmLabel,
  confirmDisabled,
}: {
  theme: Theme;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmDisabled?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6, marginTop: 22 }}>
      <Pressable
        onPress={onCancel}
        style={({ pressed }) => ({
          borderRadius: RADII.control,
          paddingHorizontal: 18,
          paddingVertical: 13,
          backgroundColor: pressed ? t.surface3 : "transparent",
        })}
      >
        <Text style={{ fontSize: 13.5, fontWeight: "700", color: t.textSecondary }}>Cancel</Text>
      </Pressable>
      <Pressable
        onPress={onConfirm}
        disabled={confirmDisabled}
        style={({ pressed }) => ({
          borderRadius: RADII.control,
          backgroundColor: pressed ? t.accentSoft : t.surface,
          borderWidth: 1.5,
          borderColor: t.accent,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 28,
          paddingVertical: 13,
          minWidth: 120,
          opacity: confirmDisabled ? 0.6 : 1,
        })}
      >
        <Text style={{ fontSize: 13.5, fontWeight: "800", color: t.accent }}>{confirmLabel}</Text>
      </Pressable>
    </View>
  );
}

// Style helpers ----------------------------------------------------

const settingsCardStyle = (t: Theme) => ({
  backgroundColor: t.surface,
  borderRadius: RADII.card,
  borderWidth: 1,
  borderColor: t.border,
  padding: 16,
});

const modalTitleStyle = (t: Theme) => ({
  fontSize: 19,
  fontWeight: "800" as const,
  color: t.textPrimary,
  letterSpacing: -0.3,
});

const modalSubtitleStyle = (t: Theme) => ({
  marginTop: 4,
  fontSize: 13,
  color: t.textSecondary,
});

const modalInputStyle = (t: Theme) => ({
  marginTop: 14,
  borderWidth: 1,
  borderColor: t.border,
  borderRadius: RADII.input,
  paddingHorizontal: 14,
  paddingVertical: 13,
  fontSize: 15,
  color: t.textPrimary,
  backgroundColor: t.surface2,
});
