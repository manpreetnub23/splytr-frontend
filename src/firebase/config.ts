import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
	apiKey: "AIzaSyAKTX0kf35NsmLeK1xpKFBtSB49_xOJsLE",
	authDomain: "splytr-20964.firebaseapp.com",
	projectId: "splytr-20964",
	storageBucket: "splytr-20964.firebasestorage.app",
	messagingSenderId: "708495686674",
	appId: "1:708495686674:web:b441e921f0991fd8e76ccb",
	measurementId: "G-H4GFYFLXHP",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

export default app;
