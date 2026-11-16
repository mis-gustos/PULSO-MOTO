import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../db.js";

const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || "");
if (!email || !password || password.length < 12) {
  console.error("Configurá ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 12 caracteres) en .env.");
  process.exit(1);
}
const hash = await bcrypt.hash(password, 12);
const existing = db.prepare("SELECT id FROM users WHERE email=?").get(email);
if (existing) {
  db.prepare("UPDATE users SET password_hash=?,role='admin' WHERE id=?").run(hash, existing.id);
  console.log(`Administrador actualizado: ${email}`);
} else {
  db.prepare("INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,'admin')")
    .run("Administrador PULSO MOTO", email, hash);
  console.log(`Administrador creado: ${email}`);
}
