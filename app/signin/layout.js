import { AuthProvider } from "./_utils/auth-context"; // ✅ Ensure correct import

export default function Layout({ children }) {
  return <AuthProvider>{children}</AuthProvider>; // ✅ Use AuthProvider instead of AuthContextProvider
}
