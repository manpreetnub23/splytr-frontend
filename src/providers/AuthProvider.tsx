import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { type User, onAuthStateChanged } from "firebase/auth";
import { syncCurrentUser } from "../api/api";
import { auth } from "../firebase/config";

type AuthContextValue = {
    isReady: boolean;
    user: User | null;
};

const AuthContext = createContext<AuthContextValue>({
    isReady: false,
    user: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(auth.currentUser);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
            const syncAndSet = async () => {
                setUser(nextUser);

                if (nextUser) {
                    try {
                        await syncCurrentUser();
                    } catch (error) {
                        console.warn("Failed to sync backend user", error);
                    }
                }

                setIsReady(true);
            };

            void syncAndSet();
        });

        return unsubscribe;
    }, []);

    return (
        <AuthContext.Provider
            value={{
                isReady,
                user,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}