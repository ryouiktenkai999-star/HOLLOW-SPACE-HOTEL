import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import "./ClientPage.css";

export default function ClientPage({
  authLoading = false,
  sessionError = ""
}) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [loginCooldown, setLoginCooldown] = useState(0);

  useEffect(() => {
    if (loginCooldown <= 0) return undefined;

    const timer = window.setInterval(() => {
      setLoginCooldown((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [loginCooldown]);

  async function login(event) {
    event.preventDefault();

    if (!supabase) {
      setAuthError(
        "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY before logging in."
      );
      return;
    }

    if (loginCooldown > 0) {
      setAuthError(`Please wait ${loginCooldown} seconds before trying again.`);
      return;
    }

    setAuthError("");
    setAuthSubmitting(true);

    let didSignIn = false;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (error) {
        const lowerError = error.message.toLowerCase();

        if (lowerError.includes("rate limit") || lowerError.includes("too many requests")) {
          setLoginCooldown(60);
          setAuthError("Too many login attempts. Please wait 1 minute before trying again.");
          return;
        }

        setAuthError(`Sign-in failed: ${error.message}`);
        return;
      }

      if (data.user?.app_metadata?.role === "admin") {
        const { error: signOutError } = await supabase.auth.signOut();
        setAuthError(
          signOutError
            ? `This account is for administrators. Sign-out failed: ${signOutError.message}`
            : "This account is for administrators. Please use the client account."
        );
        return;
      }

      setPassword("");
      didSignIn = true;
    } catch (error) {
      console.error("Client sign-in failed:", error);
      setAuthError(
        `Sign-in failed: ${error instanceof Error ? error.message : "Unexpected error"}`
      );
    } finally {
      setAuthSubmitting(false);
    }

    if (didSignIn) navigate("/rooms");
  }

  return (
    <div className="client-page client-login-layout">
      <main className="client-login-wrap">
        <form className="client-login-card" onSubmit={login}>
          <span className="client-login-icon"><ion-icon name="person"></ion-icon></span>
          <p className="client-eyebrow">WELCOME TO HOLLOW SPACE</p>
          <h1>Client Login</h1>
          <p className="client-login-description">Login to book and manage your hotel reservation.</p>
          {(authError || sessionError) && (
            <p className="client-login-error" role="alert">{authError || sessionError}</p>
          )}
          <label htmlFor="client-email">Email Address</label>
          <input
            id="client-email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
          <label htmlFor="client-password">Password</label>
          <input
            id="client-password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
          <button type="submit" disabled={authSubmitting || authLoading || loginCooldown > 0}>
            <ion-icon name="log-in"></ion-icon>
            {authLoading
              ? "Checking session…"
              : authSubmitting
                ? "Signing in…"
                : loginCooldown > 0
                  ? `Please wait ${loginCooldown}s`
                  : "Login"}
          </button>
          <p className="client-register-prompt">
            Don&apos;t have an account? <Link to="/register">Register</Link>
          </p>
        </form>
      </main>
    </div>
  );
}