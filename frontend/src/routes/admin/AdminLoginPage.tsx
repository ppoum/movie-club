import { useEffect, useState } from "react";
import type { GetSchemasResponse } from "../../types/AuthTypes";
import LoginForm from "../../components/LoginForm";

// TODO: This is probably better implemented as a general "user" login page and not just an admin login page

interface AdminLoginPageProps {
  onLoginSucces?: (() => void) | null;
}

export default function AdminLoginPage({
  onLoginSucces = null,
}: AdminLoginPageProps) {
  const [error, setError] = useState<string | null>(null);
  const [response, setSchemasResponse] = useState<GetSchemasResponse | null>(
    null,
  );

  useEffect(() => {
    async function fetch_schemas() {
      try {
        const res = await fetch("/api/auth/schemas");
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const response: GetSchemasResponse = await res.json();
        setSchemasResponse(response);
      } catch (err) {
        setError((err as Error).message);
      }
    }
    fetch_schemas();
  }, []);

  if (error) return <p>Error: {error}</p>;

  if (response?.schemas.length === 0) return <p>Error: No schemas enabled</p>;

  // Response should never be null when error is null
  if (response !== null)
    return (
      <div>
        <LoginForm
          showPassword={response.schemas.includes("password")}
          showEmailPassword={response.schemas.includes("emailPassword")}
          onSuccess={onLoginSucces}
        />
      </div>
    );
}
