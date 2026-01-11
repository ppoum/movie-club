import { isValidElement, useState, type ReactNode } from "react";
import "./LoginForm.css";
import type {
  PostLoginErrorResponse,
  PostLoginPasswordPayload,
} from "../types/AuthTypes";

const PASSWORD_ICON = (
  <svg fill="currentColor" viewBox="-7.5 -7.5 39 39">
    <path d="M17,9V7c0-2.8-2.2-5-5-5S7,4.2,7,7v2c-1.7,0-3,1.3-3,3v7c0,1.7,1.3,3,3,3h10c1.7,0,3-1.3,3-3v-7C20,10.3,18.7,9,17,9z M9,7c0-1.7,1.3-3,3-3s3,1.3,3,3v2H9V7z M13.1,15.5c0,0-0.1,0.1-0.1,0.1V17c0,0.6-0.4,1-1,1s-1-0.4-1-1v-1.4c-0.6-0.6-0.7-1.5-0.1-2.1c0.6-0.6,1.5-0.7,2.1-0.1C13.6,13.9,13.7,14.9,13.1,15.5z" />
  </svg>
);

const EMAIL_ICON = (
  <svg viewBox="-7.5 -7.5 39 39" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M4 7.00005L10.2 11.65C11.2667 12.45 12.7333 12.45 13.8 11.65L20 7"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <rect
      x="3"
      y="5"
      width="18"
      height="14"
      rx="2"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    />
  </svg>
);

interface AdminLoginPageProps {
  showPassword?: boolean;
  showEmailPassword?: boolean;
  showOIDC?: boolean;
  onSuccess?: (() => void) | null;
}

export default function AdminLoginPage({
  showPassword = false,
  showEmailPassword = false,
  showOIDC = false,
  onSuccess = null,
}: AdminLoginPageProps) {
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [emailPasswordError, setEmailPasswordError] = useState<string | null>(
    null,
  );

  async function loginPassword(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const password = formData.get("password");
    if (typeof password !== "string") {
      setPasswordError("Invalid password value");
      return;
    }

    if (password.length === 0) {
      setPasswordError("Password cannot be empty");
      return;
    }

    try {
      const payload: PostLoginPasswordPayload = {
        schema: "password",
        password,
      };
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err: PostLoginErrorResponse = await res.json();
        setPasswordError(err.error);
        return;
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      console.log(`Error logging in via password: ${err}`);
      setPasswordError("Unknown error");
    }
  }

  async function loginEmailPassword(e: React.FormEvent) {
    e.preventDefault();
    setEmailPasswordError("Unimplemented");
    return;
  }

  return (
    <div className="login-card">
      <div className="login-card-header">
        {/* TODO: Logo */}
        <h1>Welcome Back</h1>
        <p>
          to the <i>Movie Club</i>
        </p>
      </div>
      <div className="login-card-body">
        {showPassword && (
          <LoginOption
            label="Admin Password"
            icon={PASSWORD_ICON}
            error={passwordError}
          >
            <form onSubmit={loginPassword}>
              <div className="login-card-option-form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter the admin password"
                />
              </div>
              {passwordError && (
                <p className="login-card-option-form-error-message">
                  {passwordError}
                </p>
              )}
              <button
                className="login-card-option-form-login-button"
                type="submit"
              >
                Sign In
              </button>
            </form>
          </LoginOption>
        )}
        {showEmailPassword && (
          <LoginOption
            label="User Login"
            icon={EMAIL_ICON}
            error={emailPasswordError}
          >
            <form onSubmit={loginEmailPassword}>
              <div className="login-card-option-form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                />
              </div>
              <div className="login-card-option-form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                />
              </div>
              {emailPasswordError && (
                <p className="login-card-option-form-error-message">
                  {emailPasswordError}
                </p>
              )}
              <button
                className="login-card-option-form-login-button"
                type="submit"
              >
                Sign In
              </button>
            </form>
          </LoginOption>
        )}
        {showOIDC && (
          <div className="login-card-option">
            <p>Unimplemented</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LoginOption({
  label,
  icon,
  error,
  children,
}: {
  label: string;
  icon: ReactNode;
  error: string | null;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (!isValidElement(icon) || icon.type !== "svg") {
    return <h2>Error: Invalid icon prop</h2>;
  }

  return (
    <div
      className={
        "login-card-option" +
        (open ? " active" : "") +
        (error !== null ? " error" : "")
      }
    >
      <div className="login-card-option-header" onClick={() => setOpen(!open)}>
        <div className="login-card-option-icon">{icon}</div>
        <div className="login-card-option-label">
          <h3>{label}</h3>
        </div>
        <div className="login-card-option-toggle" />
      </div>
      <div className="login-card-option-form" hidden={!open}>
        {children}
      </div>
    </div>
  );
}
