import dotenv from "dotenv";

dotenv.config();
async function run() {
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ email: "hassan", username: "hassan", password: "hassan321" })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  const res = await fetch("http://localhost:3000/api/users", {
    method: "POST",
    headers: {"Content-Type": "application/json", "Authorization": "Bearer " + token},
    body: JSON.stringify({ name: "Test User", email: "test@example.com", username: "testuser", password: "password123", role: "manager" })
  });
  console.log(await res.json());
}
run();
