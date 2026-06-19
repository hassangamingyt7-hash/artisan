import dotenv from "dotenv";

dotenv.config();
async function run() {
  const res = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ email: "hassan", username: "hassan", password: "hassan321" })
  });
  console.log(await res.json());
}
run();
