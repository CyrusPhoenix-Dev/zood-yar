import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import api from "../api";
import { REFRESH_TOKEN, ACCESS_TOKEN } from "../constants";
import { useState, useEffect } from "react";

function ProtectedRoute({ children, skipPhoneCheck = false }) {
    // "status" replaces the old boolean isAuthorized with three real
    // outcomes, since there are now three different places a user can
    // end up: no valid session at all, a valid session but an
    // unverified phone, or fully cleared to see the page.
    //   null           = still checking
    //   "ok"           = fully authorized
    //   "unauthenticated" = no valid session → /login
    //   "unverified"   = logged in, phone not verified yet → /verify-phone
    const [status, setStatus] = useState(null);

    useEffect(() => {
        auth().catch(() => setStatus("unauthenticated"));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const refreshToken = async () => {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN);
        try {
            const res = await api.post("/api/token/refresh/", {
                refresh: refreshToken,
            });
            if (res.status === 200) {
                localStorage.setItem(ACCESS_TOKEN, res.data.access);
                return true;
            }
            return false;
        } catch (error) {
            console.log(error);
            return false;
        }
    };

    const auth = async () => {
        const token = localStorage.getItem(ACCESS_TOKEN);
        if (!token) {
            setStatus("unauthenticated");
            return;
        }

        const decoded = jwtDecode(token);
        const tokenExpiration = decoded.exp;
        const now = Date.now() / 1000;

        let tokenIsValid = tokenExpiration >= now;
        if (!tokenIsValid) {
            tokenIsValid = await refreshToken();
        }

        if (!tokenIsValid) {
            setStatus("unauthenticated");
            return;
        }

        // The /verify-phone page itself is wrapped in this same guard
        // (still needs a real login) but must skip the verification
        // check — otherwise a logged-in, unverified user would be
        // redirected to /verify-phone... which redirects to
        // /verify-phone... forever.
        if (skipPhoneCheck) {
            setStatus("ok");
            return;
        }

        // Checked against the live DB value via the profile endpoint,
        // not a claim baked into the JWT at login time. A JWT claim
        // would go stale the moment the user actually verifies, since
        // the access token they're still holding was issued before
        // that happened — only a fresh fetch reflects reality.
        try {
            const profileRes = await api.get("/api/user/profile/");
            setStatus(profileRes.data.is_phone_verified ? "ok" : "unverified");
        } catch (error) {
            console.log(error);
            setStatus("unauthenticated");
        }
    };

    if (status === null) {
        return <div>Loading...</div>;
    }

    if (status === "unauthenticated") {
        return <Navigate to="/login" />;
    }

    if (status === "unverified") {
        return <Navigate to="/verify-phone" />;
    }

    return children;
}

export default ProtectedRoute;
