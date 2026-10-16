import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import "./RegisterPage.css";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [redirectPath, setRedirectPath] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!successMessage) return undefined;

    const redirectTimer = window.setTimeout(() => navigate(redirectPath), 1800);
    return () => window.clearTimeout(redirectTimer);
  }, [navigate, redirectPath, successMessage]);

  async function register(event) {
    event.preventDefault();

    if (!supabase) {
      setErrorMessage(
        "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY before registering."
      );
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName || !normalizedEmail || !password || !confirmPassword) {
      setErrorMessage("Please complete every field.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: normalizedName
          }
        }
      });

      if (error) {
        const lowerError = error.message.toLowerCase();

        if (lowerError.includes("already registered") || lowerError.includes("user exists")) {
          setErrorMessage("An account with this email already exists. Please sign in instead.");
          return;
        }

        if (lowerError.includes("rate limit") || lowerError.includes("email rate limit")) {
          setErrorMessage(
            "Supabase has temporarily limited sign-up emails for this project. Trying another email will not bypass it. For testing, turn off email confirmation in Supabase Dashboard → Authentication → Providers → Email, or configure custom SMTP / adjust Authentication → Rate Limits. Then retry."
          );
          return;
        }

        setErrorMessage(`Registration failed: ${error.message}`);
        return;
      }

      if (!data.user) {
        setErrorMessage("Registration did not return a user. Please try again.");
        return;
      }

      setFullName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setRedirectPath(data.session ? "/client" : "/client-login");
      setSuccessMessage(
        data.session
          ? "Account created successfully. Redirecting to your dashboard…"
          : "Account created. Check your email to confirm your account, then sign in. Redirecting…"
      );
    } catch (error) {
      console.error("Client registration failed:", error);
      setErrorMessage(
        `Registration failed: ${error instanceof Error ? error.message : "Unexpected error"}`
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="client-register-page">
      <Link
        className="client-register-back"
        to="/"
        aria-label="Back to home"
        title="Back to home"
      >
        <ion-icon name="arrow-back" aria-hidden="true"></ion-icon>
      </Link>

      <form className="client-register-card" onSubmit={register}>
        <span className="client-register-icon" aria-hidden="true">
          <ion-icon name="person-add"></ion-icon>
        </span>
        <p className="client-register-eyebrow">HOLLOW SPACE HOTEL</p>
        <h1>Create Your Account</h1>
        <p className="client-register-description">
          Register to book and manage your hotel stay.
        </p>

        {errorMessage && <p className="client-register-message is-error" role="alert">{errorMessage}</p>}
        {successMessage && <p className="client-register-message is-success" role="status">{successMessage}</p>}

        <label htmlFor="register-full-name">Full Name</label>
        <input
          id="register-full-name"
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          autoComplete="name"
          required
        />

        <label htmlFor="register-email">Email Address</label>
        <input
          id="register-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />

        <label htmlFor="register-password">Password</label>
        <input
          id="register-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />

        <label htmlFor="register-confirm-password">Confirm Password</label>
        <input
          id="register-confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />

        <button type="submit" disabled={submitting || Boolean(successMessage)}>
          <ion-icon name="person-add" aria-hidden="true"></ion-icon>
          {submitting ? "Creating Account…" : "Create Account"}
        </button>

        <p className="client-register-login-link">
          Already have an account? <Link to="/client-login">Client Login</Link>
        </p>
      </form>
    </main>
  );
}
