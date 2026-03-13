export type GoogleExtraConfig = {
	googleExpoClientId?: string;
	googleIosClientId?: string;
	googleAndroidClientId?: string;
	googleWebClientId?: string;
};

type RuntimeInputs = {
	appOwnership: string | null | undefined;
	owner: string | null | undefined;
	slug: string | null | undefined;
	platform: "ios" | "android" | "web" | "default";
	appReturnUri: string;
	nativeRedirectUri: string;
	extra: GoogleExtraConfig;
};

export function buildGoogleAuthRuntime(inputs: RuntimeInputs) {
	const isWeb = inputs.platform === "web";
	const useProxy = inputs.appOwnership === "expo" && !isWeb;
	const projectNameForProxy =
		inputs.owner && inputs.slug ? `@${inputs.owner}/${inputs.slug}` : undefined;
	const proxyRedirectUri = projectNameForProxy
		? `https://auth.expo.io/${projectNameForProxy}`
		: undefined;

	const useProxyRedirect = useProxy && Boolean(proxyRedirectUri);

	let redirectUri;
	if (isWeb) {
		redirectUri = inputs.appReturnUri;
	} else if (useProxyRedirect) {
		// In Expo Go, openAuthSessionAsync should return to the app URI, while
		// Google's redirect_uri is still forced to the proxy URI in startUrl.
		redirectUri = inputs.appReturnUri;
	} else {
		redirectUri = inputs.nativeRedirectUri;
	}

	const clientId = isWeb
		? inputs.extra.googleWebClientId
		: useProxyRedirect
			? inputs.extra.googleExpoClientId || inputs.extra.googleWebClientId
			: {
					ios: inputs.extra.googleIosClientId,
					android: inputs.extra.googleAndroidClientId,
					web: inputs.extra.googleWebClientId,
					default: inputs.extra.googleExpoClientId,
				}[inputs.platform] || inputs.extra.googleWebClientId;

	return {
		useProxy,
		useProxyRedirect,
		projectNameForProxy,
		proxyRedirectUri,
		redirectUri,
		clientId,
	};
}

export function buildExpoProxyStartUrl(input: {
	requestUrl: string;
	projectNameForProxy: string;
	proxyRedirectUri: string;
	appReturnUri: string;
}) {
	const authUrl = new URL(input.requestUrl);
	authUrl.searchParams.set("redirect_uri", input.proxyRedirectUri);
	return `https://auth.expo.io/${input.projectNameForProxy}/start?${new URLSearchParams(
		{
			authUrl: authUrl.toString(),
			returnUrl: input.appReturnUri,
		},
	).toString()}`;
}
