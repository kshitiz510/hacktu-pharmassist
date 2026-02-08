import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";
import Dasboard from "./pages/Dashboard";
import SignInPage from "./components/auth/SignInPage";
import SignUpPage from "./components/auth/SignUpPage";
import { setTokenGetter } from "./services/api";
import "./App.css";

/**
 * Bridge Clerk auth → API service.
 * Sets a token getter so every API call automatically includes the JWT.
 */
function AuthTokenBridge() {
  const { getToken } = useAuth();

  useEffect(() => {
    setTokenGetter(() => getToken());
    return () => setTokenGetter(null);
  }, [getToken]);

  return null;
}

function App() {
  return (
    <Router>
      <AuthTokenBridge />
      <Routes>
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />
        <Route path="/*" element={<Dasboard />} />
      </Routes>
    </Router>
  );
}

export default App;
