import { useState } from "react";
import { supabase } from "./supabase";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e) {
    e.preventDefault();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      onLogin(data.user);
    }
  }


  return (
    <div className="app">
      <div className="panel">
        <h2>Login</h2>

        <form onSubmit={handleLogin} className="formGrid one">
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="saveBtn">Login</button>
        </form>

        
      </div>
    </div>
  );
}