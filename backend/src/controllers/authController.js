import * as authService from "../services/authService.js";

export async function login(req, res) {
  try {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      return res.status(400).json({ error: "username and password required" });
    }
    const result = await authService.login(username, password);
    if (!result) return res.status(401).json({ error: "Invalid credentials" });
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Login failed" });
  }
}
