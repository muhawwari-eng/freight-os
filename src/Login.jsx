import { useState } from "react";
import { supabase } from "./supabase";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    onLogin(data.user);
  }

  async function handleSignUp(e) {
    e.preventDefault();

    if (!email || !password) {
      alert("Please enter email and password.");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          name: fullName || email.trim(),
        },
      },
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    if (data.user && data.session) {
      onLogin(data.user);
      return;
    }

    alert("Account created. Please check your email to confirm your account, then log in.");
    setMode("login");
  }

  return (
    <div className="loginPage">
      <div className="loginCard">
        <div className="brand loginBrand">
          <div className="brandIcon">⚓</div>
          <div>
            <h2>Freight OS</h2>
            <p>Maritime Management</p>
          </div>
        </div>

        <div className="loginTabs">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === "signup" ? "active" : ""}
            onClick={() => setMode("signup")}
          >
            Create Account
          </button>
        </div>

        <h2>{mode === "login" ? "Login" : "Create Account"}</h2>
        <p className="smallText">
          {mode === "login"
            ? "Enter your email and password to access the system."
            : "Create a new account. The admin role can be assigned from Supabase after registration."}
        </p>

        <form onSubmit={mode === "login" ? handleLogin : handleSignUp} className="formGrid one">
          {mode === "signup" && (
            <div className="formGroup">
              <label>Full Name</label>
              <input
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          )}

          <div className="formGroup">
            <label>Email</label>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="formGroup">
            <label>Password</label>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="saveBtn" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
