import axios, { isAxiosError } from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { auth } from "../firebase/config";

type ExpoExtra = {
	apiBaseUrl?: string;
	apiBaseUrlAndroid?: string;
	apiBaseUrlIos?: string;
	apiBaseUrlWeb?: string;
};

export type BackendUser = {
	_id: string;
	name?: string;
	email: string;
	photoURL?: string;
};

export type Group = {
	_id: string;
	name: string;
	createdBy?: string;
	members: BackendUser[];
	createdAt: string;
	updatedAt: string;
};

export type Friend = {
	_id: string;
	userId: string;
	friendId: BackendUser;
	createdAt: string;
	updatedAt: string;
};

type PopulatedUserRef = {
	_id: string;
	name?: string;
	email?: string;
	photoURL?: string;
};

export type Expense = {
	_id: string;
	group: string;
	paidBy: string | PopulatedUserRef;
	amount: number;
	description?: string;
	splits: {
		user: string | PopulatedUserRef;
		amount: number;
	}[];
	createdAt: string;
	updatedAt: string;
};

export type GroupBalances = Record<string, number>;

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
const hostFromExpo = (
	(Constants.expoConfig as { hostUri?: string } | null)?.hostUri ||
	(Constants as unknown as { manifest?: { debuggerHost?: string } }).manifest
		?.debuggerHost ||
	(
		Constants as unknown as {
			manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } };
		}
	).manifest2?.extra?.expoGo?.debuggerHost ||
	""
).split(":")[0];
const inferredLanBaseUrl = hostFromExpo
	? `http://${hostFromExpo}:8000/api`
	: undefined;
const configuredBaseUrl =
	Platform.select({
		android: extra.apiBaseUrlAndroid ?? extra.apiBaseUrl,
		ios: extra.apiBaseUrlIos ?? extra.apiBaseUrl,
		web: extra.apiBaseUrlWeb ?? extra.apiBaseUrl,
		default: extra.apiBaseUrl,
	}) ?? extra.apiBaseUrl;
const fallbackBaseUrl =
	Platform.OS === "android"
		? (inferredLanBaseUrl ?? "http://10.0.2.2:8000/api")
		: (inferredLanBaseUrl ?? "http://localhost:8000/api");
const baseURL =
	process.env.EXPO_PUBLIC_API_BASE_URL ||
	inferredLanBaseUrl ||
	configuredBaseUrl ||
	fallbackBaseUrl;

const api = axios.create({
	baseURL,
	timeout: 10000,
});

api.interceptors.request.use(async (config) => {
	const user = auth.currentUser;
	if (user) {
		let token = await user.getIdToken();
		if (!token) {
			token = await user.getIdToken(true);
		}
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

api.interceptors.response.use(
	(response) => response,
	async (error) => {
		if (isAxiosError(error)) {
			const status = error.response?.status;
			const originalConfig = error.config as
				| (typeof error.config & { _authRetry?: boolean })
				| undefined;

			if (
				status === 401 &&
				originalConfig &&
				!originalConfig._authRetry &&
				auth.currentUser
			) {
				originalConfig._authRetry = true;
				try {
					const freshToken = await auth.currentUser.getIdToken(true);
					originalConfig.headers = originalConfig.headers ?? {};
					originalConfig.headers.Authorization = `Bearer ${freshToken}`;
					return api(originalConfig);
				} catch {
					// Fall through and return original API error message.
				}
			}

			const message =
				typeof error.response?.data === "object" &&
				error.response?.data &&
				"message" in error.response.data
					? String((error.response.data as { message?: unknown }).message)
					: error.message || "Request failed";

			return Promise.reject(new Error(message));
		}

		return Promise.reject(new Error("Request failed"));
	},
);

export const syncCurrentUser = async () => {
	const { data } = await api.post<BackendUser>("/auth/sync");
	return data;
};

export const getCurrentUser = async () => {
	const { data } = await api.get<BackendUser>("/auth/me");
	return data;
};

export const getMyGroups = async () => {
	const { data } = await api.get<Group[]>("/groups");
	return data;
};

export const getGroupById = async (groupId: string) => {
	const { data } = await api.get<Group>(`/groups/${groupId}`);
	return data;
};

export const getGroupExpenses = async (groupId: string) => {
	const { data } = await api.get<Expense[]>(`/expenses/${groupId}`);
	return data;
};

export const getGroupBalances = async (groupId: string) => {
	const { data } = await api.get<GroupBalances>(
		`/expenses/balances/${groupId}`,
	);
	return data;
};

export const createGroup = async (payload: {
	name: string;
	memberIds?: string[];
}) => {
	const { data } = await api.post<Group>("/groups", payload);
	return data;
};

export const addGroupMembers = async (groupId: string, memberIds: string[]) => {
	const { data } = await api.patch<Group>(`/groups/${groupId}/members`, {
		memberIds,
	});
	return data;
};

export const deleteGroup = async (groupId: string) => {
	const { data } = await api.delete<{ message: string; groupId: string }>(
		`/groups/${groupId}`,
	);
	return data;
};

export const addExpense = async (payload: {
	groupId: string;
	amount: number;
	description: string;
	splits: { user: string; amount: number }[];
	paidBy?: string;
}) => {
	const { data } = await api.post<Expense>("/expenses", payload);
	return data;
};

export const getFriends = async () => {
	const { data } = await api.get<Friend[]>("/friends");
	return data;
};

export const addFriend = async (email: string) => {
	const { data } = await api.post<Friend>("/friends", { email });
	return data;
};

export const deleteFriend = async (friendId: string) => {
	const { data } = await api.delete<{ message: string; friendId: string }>(
		`/friends/${friendId}`,
	);
	return data;
};

export default api;
