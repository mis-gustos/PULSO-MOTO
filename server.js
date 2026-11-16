import "dotenv/config";
import express from "express";
import session from "express-session";
import connectSqlite3 from "connect-sqlite3";
import bcrypt from "bcryptjs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import multer from "multer";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./db.js";
import "./seed.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const BASE_URL = (process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, "");
const PROD = process.env.NODE_ENV === "production";
const DATA_DIR = path.join(ROOT, "data");
const UPLOAD_DIR = path.join(ROOT, "public", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

if (PROD && !BASE_URL.startsWith("https://")) {
  throw new Error("PUBLIC_BASE_URL debe comenzar con https:// en producción.");
}
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  console.warn("ADVERTENCIA: configurá SESSION_SECRET con al menos 32 caracteres aleatorios antes de publicar.");
}

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", PROD ? 1 : false);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'"],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

const SQLiteStore = connectSqlite3(session);
app.use(session({
  name: "pulsomoto.sid",
  store: new SQLiteStore({ db: "sessions.sqlite", dir: DATA_DIR, table: "sessions" }),
  secret: process.env.SESSION_SECRET || "development-session-secret-change-this-now",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: PROD,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: "draft-7", legacyHeaders: false });
const checkoutLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 8, standardHeaders: "draft-7", legacyHeaders: false });

function sanitizeUser(u) {
  return u ? { id: u.id, name: u.name, email: u.email, role: u.role } : null;
}
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "Iniciá sesión para continuar." });
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "Iniciá sesión como administrador." });
  const u = db.prepare("SELECT id, role FROM users WHERE id=?").get(req.session.userId);
  if (!u || u.role !== "admin") return res.status(403).json({ error: "No tenés permisos de administrador." });
  next();
}
function parseProduct(row) {
  if (!row) return null;
  let specs = [];
  try { specs = JSON.parse(row.specs || "[]"); } catch { specs = []; }
  return { ...row, specs, active: !!row.active, featured: !!row.featured };
}
function validEmail(v) {
  return typeof v === "string" && v.length <= 190 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
function intValue(v, fallback = 0) {
  if (v === "" || v === null || v === undefined) return fallback;
  const n = Number(v);
  return Number.isSafeInteger(n) && n >= 0 ? n : fallback;
}
function sameOrigin(req, res, next) {
  const origin = req.get("origin");
  if (!origin) return next();
  try {
    if (new URL(origin).host !== req.get("host")) return res.status(403).json({ error: "Origen no permitido." });
  } catch {
    return res.status(403).json({ error: "Origen inválido." });
  }
  next();
}

// Bootstrap del primer administrador. No hay contraseña predeterminada.
const adminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const adminPassword = String(process.env.ADMIN_PASSWORD || "");
if (adminEmail && adminPassword && validEmail(adminEmail) && adminPassword.length >= 12 &&
    !db.prepare("SELECT id FROM users WHERE email=?").get(adminEmail)) {
  const hash = bcrypt.hashSync(adminPassword, 12);
  db.prepare("INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,'admin')")
    .run("Administrador PULSO MOTO", adminEmail, hash);
  console.log(`Administrador inicial creado: ${adminEmail}`);
}

// ------------------------- Cuentas y autenticación -------------------------
app.get("/api/auth/me", (req, res) => {
  const u = req.session.userId
    ? db.prepare("SELECT id,name,email,role FROM users WHERE id=?").get(req.session.userId)
    : null;
  res.json({ user: sanitizeUser(u) });
});

app.post("/api/auth/register", authLimiter, sameOrigin, async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (name.length < 2 || name.length > 100) return res.status(400).json({ error: "Ingresá un nombre válido." });
  if (!validEmail(email)) return res.status(400).json({ error: "Ingresá un email válido." });
  if (password.length < 10 || password.length > 200) return res.status(400).json({ error: "La contraseña debe tener al menos 10 caracteres." });
  if (db.prepare("SELECT id FROM users WHERE email=?").get(email)) return res.status(409).json({ error: "Ese email ya está registrado." });
  try {
    const hash = await bcrypt.hash(password, 12);
    const result = db.prepare("INSERT INTO users (name,email,password_hash) VALUES (?,?,?)").run(name, email, hash);
    await new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
    req.session.userId = Number(result.lastInsertRowid);
    res.status(201).json({ user: sanitizeUser(db.prepare("SELECT id,name,email,role FROM users WHERE id=?").get(req.session.userId)) });
  } catch (err) {
    console.error("register:", err);
    res.status(500).json({ error: "No se pudo crear la cuenta." });
  }
});

app.post("/api/auth/login", authLimiter, sameOrigin, async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const user = db.prepare("SELECT * FROM users WHERE email=?").get(email);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "Email o contraseña incorrectos." });
  }
  await new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
  req.session.userId = user.id;
  res.json({ user: sanitizeUser(user) });
});

app.post("/api/auth/logout", sameOrigin, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("pulsomoto.sid");
    res.json({ ok: true });
  });
});

app.get("/api/public-config", (_req, res) => {
  res.json({ whatsappNumber: String(process.env.WHATSAPP_NUMBER || "").replace(/[^0-9]/g, "") });
});

// ------------------------- Catálogo público -------------------------
app.get("/api/products", (req, res) => {
  const kind = ["accessory", "kit", "moto"].includes(req.query.kind) ? req.query.kind : null;
  const rows = db.prepare(
    `SELECT * FROM products WHERE active=1 ${kind ? "AND kind=?" : ""} ORDER BY featured DESC, id DESC`
  ).all(...(kind ? [kind] : []));
  res.json({ products: rows.map(parseProduct) });
});

app.get("/api/products/:id", (req, res) => {
  const p = parseProduct(db.prepare("SELECT * FROM products WHERE id=? AND active=1").get(Number(req.params.id)));
  if (!p) return res.status(404).json({ error: "Producto no encontrado." });
  res.json({ product: p });
});

// ------------------------- Pedidos del cliente -------------------------
app.get("/api/orders/mine", requireAuth, (req, res) => {
  const rows = db.prepare(
    "SELECT id,total,currency,status,fulfillment_status,created_at,paid_at FROM orders WHERE user_id=? ORDER BY created_at DESC"
  ).all(req.session.userId);
  res.json({ orders: rows });
});

app.get("/api/orders/:id", requireAuth, (req, res) => {
  const order = db.prepare(
    "SELECT * FROM orders WHERE id=? AND (user_id=? OR EXISTS(SELECT 1 FROM users WHERE id=? AND role='admin'))"
  ).get(String(req.params.id), req.session.userId, req.session.userId);
  if (!order) return res.status(404).json({ error: "Pedido no encontrado." });
  const items = db.prepare("SELECT title,unit_price,quantity,image FROM order_items WHERE order_id=?").all(order.id);
  res.json({ order, items });
});

// ------------------------- Mercado Pago Checkout Pro - Orders API -------------------------
app.post("/api/checkout", requireAuth, checkoutLimiter, sameOrigin, async (req, res) => {
  if (!process.env.MP_ACCESS_TOKEN) {
    return res.status(503).json({ error: "Mercado Pago todavía no está conectado. El administrador debe configurar MP_ACCESS_TOKEN en el servidor." });
  }
  if (!Array.isArray(req.body.items) || req.body.items.length < 1 || req.body.items.length > 20) {
    return res.status(400).json({ error: "El carrito está vacío o contiene demasiados productos." });
  }

  const quantities = new Map();
  for (const line of req.body.items) {
    const id = Number(line.id);
    const quantity = Number(line.quantity);
    if (!Number.isSafeInteger(id) || id < 1 || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10) {
      return res.status(400).json({ error: "Hay un producto o una cantidad inválida." });
    }
    quantities.set(id, (quantities.get(id) || 0) + quantity);
  }
  if ([...quantities.values()].some(q => q > 10)) return res.status(400).json({ error: "El máximo por producto es 10 unidades." });

  const lines = [];
  let total = 0;
  for (const [id, quantity] of quantities) {
    const product = db.prepare("SELECT * FROM products WHERE id=? AND active=1").get(id);
    if (!product) return res.status(400).json({ error: "Uno de los productos ya no está publicado." });
    if (!Number.isSafeInteger(product.price) || product.price <= 0) {
      return res.status(400).json({ error: `El precio de "${product.name}" todavía no está configurado.` });
    }
    if (product.stock < quantity) return res.status(400).json({ error: `No hay stock suficiente de "${product.name}".` });
    total += product.price * quantity;
    lines.push({ product, quantity });
  }
  if (!Number.isSafeInteger(total) || total <= 0) return res.status(400).json({ error: "El importe del pedido no es válido." });

  const user = db.prepare("SELECT id,name,email FROM users WHERE id=?").get(req.session.userId);
  const localOrderId = crypto.randomUUID();
  const insertOrder = db.prepare("INSERT INTO orders (id,user_id,total,status) VALUES (?,?,?,'awaiting_payment')");
  const insertItem = db.prepare(
    "INSERT INTO order_items (order_id,product_id,title,unit_price,quantity,image) VALUES (?,?,?,?,?,?)"
  );
  const reserveStock = db.prepare(
    "UPDATE products SET stock=stock-?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND active=1 AND stock>=?"
  );
  const createLocalOrder = db.transaction(() => {
    insertOrder.run(localOrderId, user.id, total);
    for (const { product, quantity } of lines) {
      const reserved = reserveStock.run(quantity, product.id, quantity);
      if (!reserved.changes) throw new Error(`Stock insuficiente para ${product.name}. Volvé a actualizar el carrito.`);
      insertItem.run(localOrderId, product.id, product.name, product.price, quantity, product.image);
    }
  });
  try {
    createLocalOrder();
  } catch (err) {
    db.prepare("DELETE FROM orders WHERE id=?").run(localOrderId);
    return res.status(409).json({ error: err.message });
  }

  try {
    const payload = {
      type: "online",
      processing_mode: "manual",
      total_amount: total.toFixed(2),
      external_reference: localOrderId,
      description: `Compra PULSO MOTO #${localOrderId.slice(0, 8)}`,
      payer: { email: user.email },
      items: lines.map(({ product, quantity }) => ({
        title: product.name,
        quantity,
        unit_price: product.price.toFixed(2)
      })),
      config: {
        online: {
          success_url: `${BASE_URL}/pago.html?pedido=${encodeURIComponent(localOrderId)}&estado=aprobado`,
          failure_url: `${BASE_URL}/pago.html?pedido=${encodeURIComponent(localOrderId)}&estado=rechazado`,
          pending_url: `${BASE_URL}/pago.html?pedido=${encodeURIComponent(localOrderId)}&estado=pendiente`,
          auto_return: "approved"
        }
      }
    };
    const mpResponse = await fetch("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": crypto.randomUUID()
      },
      body: JSON.stringify(payload)
    });
    const mpData = await mpResponse.json().catch(() => ({}));
    if (!mpResponse.ok || !mpData.checkout_url || !mpData.id) {
      console.error("Mercado Pago create order:", mpResponse.status, mpData);
      const release = db.transaction(() => {
        for (const { product, quantity } of lines) {
          db.prepare("UPDATE products SET stock=stock+? WHERE id=?").run(quantity, product.id);
        }
        db.prepare("UPDATE orders SET status='payment_error',updated_at=CURRENT_TIMESTAMP WHERE id=?").run(localOrderId);
      });
      release();
      return res.status(502).json({ error: "Mercado Pago no pudo crear el pago. No se realizó el cobro; revisá las credenciales y el entorno." });
    }
    db.prepare("UPDATE orders SET mp_order_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(String(mpData.id), localOrderId);
    res.json({ checkoutUrl: mpData.checkout_url, orderId: localOrderId });
  } catch (err) {
    console.error("checkout:", err);
    const release = db.transaction(() => {
      for (const { product, quantity } of lines) {
        db.prepare("UPDATE products SET stock=stock+? WHERE id=?").run(quantity, product.id);
      }
      db.prepare("UPDATE orders SET status='payment_error',updated_at=CURRENT_TIMESTAMP WHERE id=?").run(localOrderId);
    });
    release();
    res.status(502).json({ error: "No fue posible conectar con Mercado Pago. No se realizó ningún cobro." });
  }
});

// Verificación HMAC de notificaciones de Mercado Pago (x-signature / x-request-id).
function validMpSignature(req) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  const signature = req.get("x-signature") || "";
  const requestId = req.get("x-request-id") || "";
  const dataId = String(req.query["data.id"] || req.body?.data?.id || "").toLowerCase();
  if (!secret || !signature || !requestId || !dataId) return false;
  const fields = Object.fromEntries(signature.split(",").map(part => {
    const [key, value] = part.trim().split("=", 2);
    return [key, value];
  }));
  if (!fields.ts || !fields.v1) return false;
  const manifest = `id:${dataId};request-id:${requestId};ts:${fields.ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(fields.v1, "hex");
  return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function syncOrderFromMp(mpOrder) {
  const localId = String(mpOrder.external_reference || "");
  if (!localId) return;
  const local = db.prepare("SELECT * FROM orders WHERE id=?").get(localId);
  if (!local) return;
  const paidAmount = Number(mpOrder.total_paid_amount || 0);
  const expectedAmount = Number(local.total.toFixed(2));
  const paid = mpOrder.status === "processed" && paidAmount >= expectedAmount;
  const terminalFailed = ["canceled", "cancelled", "expired", "failed"].includes(String(mpOrder.status || "").toLowerCase());

  const sync = db.transaction(() => {
    const current = db.prepare("SELECT status FROM orders WHERE id=?").get(localId);
    if (!current || current.status === "paid" || current.status === "cancelled" || current.status === "expired") return;
    if (paid) {
      db.prepare("UPDATE orders SET status='paid',paid_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(localId);
    } else if (terminalFailed) {
      const items = db.prepare("SELECT product_id,quantity FROM order_items WHERE order_id=?").all(localId);
      for (const item of items) {
        db.prepare("UPDATE products SET stock=stock+?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(item.quantity, item.product_id);
      }
      db.prepare("UPDATE orders SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
        .run(String(mpOrder.status).toLowerCase(), localId);
    }
  });
  sync();
}

app.post("/api/webhooks/mercadopago", async (req, res) => {
  if (!validMpSignature(req)) return res.sendStatus(401);
  const mpOrderId = String(req.query["data.id"] || req.body?.data?.id || "");
  if (!mpOrderId) return res.sendStatus(400);
  try {
    const response = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(mpOrderId)}`, {
      headers: { "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}` }
    });
    if (!response.ok) return res.sendStatus(502);
    const mpOrder = await response.json();
    const saved = db.prepare("SELECT mp_order_id FROM orders WHERE id=?").get(String(mpOrder.external_reference || ""));
    if (!saved || String(saved.mp_order_id) !== String(mpOrder.id)) return res.sendStatus(404);
    syncOrderFromMp(mpOrder);
    return res.sendStatus(200);
  } catch (err) {
    console.error("Mercado Pago webhook:", err);
    return res.sendStatus(500);
  }
});

// ------------------------- Panel de administración -------------------------
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = ({ "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" })[file.mimetype];
    cb(null, `${crypto.randomUUID()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) return cb(new Error("La imagen debe ser JPG, PNG o WebP."));
    cb(null, true);
  }
});

app.get("/api/admin/summary", requireAdmin, (_req, res) => {
  res.json({
    products: db.prepare("SELECT COUNT(*) AS n FROM products").get().n,
    customers: db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='customer'").get().n,
    pending: db.prepare("SELECT COUNT(*) AS n FROM orders WHERE status='awaiting_payment'").get().n,
    paid: db.prepare("SELECT COUNT(*) AS n FROM orders WHERE status='paid'").get().n
  });
});
app.get("/api/admin/products", requireAdmin, (_req, res) => {
  res.json({ products: db.prepare("SELECT * FROM products ORDER BY id DESC").all().map(parseProduct) });
});

function productPayload(body, previous = null, uploadedPath = null) {
  const name = String(body.name || "").trim();
  const kind = String(body.kind || "");
  if (name.length < 2 || name.length > 180 || !["accessory", "kit", "moto"].includes(kind)) {
    throw new Error("Completá un nombre y tipo de producto válido.");
  }
  let specs;
  try {
    specs = JSON.parse(body.specs || "[]");
    if (!Array.isArray(specs) || specs.some(s => typeof s !== "string")) throw new Error();
  } catch {
    throw new Error("La ficha técnica debe ser una lista JSON de textos.");
  }
  const price = String(body.price ?? "").trim() === "" ? null : intValue(body.price, -1);
  if (price === -1 || (price !== null && price <= 0)) throw new Error("El precio de venta debe ser un importe mayor a cero en pesos argentinos.");
  const reference = String(body.reference_price ?? "").trim() === "" ? null : intValue(body.reference_price, -1);
  if (reference === -1) throw new Error("El precio de referencia debe ser un número válido.");
  return {
    name,
    brand: String(body.brand || "").trim().slice(0, 100),
    category: String(body.category || "").trim().slice(0, 100),
    kind,
    description: String(body.description || "").trim().slice(0, 3000),
    specs: JSON.stringify(specs.slice(0, 30).map(s => s.slice(0, 300))),
    image: uploadedPath || String(body.image || "").trim() || previous?.image || "",
    source_url: String(body.source_url || "").trim().slice(0, 500),
    reference_price: reference,
    price,
    stock: intValue(body.stock, 0),
    active: body.active === "true" ? 1 : 0,
    featured: body.featured === "true" ? 1 : 0
  };
}

app.post("/api/admin/products", requireAdmin, sameOrigin, upload.single("imageFile"), (req, res) => {
  try {
    const p = productPayload(req.body, null, req.file ? `/uploads/${req.file.filename}` : null);
    const result = db.prepare(`
      INSERT INTO products (name,brand,category,kind,description,specs,image,source_url,reference_price,price,stock,active,featured)
      VALUES (@name,@brand,@category,@kind,@description,@specs,@image,@source_url,@reference_price,@price,@stock,@active,@featured)
    `).run(p);
    res.status(201).json({ product: parseProduct(db.prepare("SELECT * FROM products WHERE id=?").get(result.lastInsertRowid)) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/admin/products/:id", requireAdmin, sameOrigin, upload.single("imageFile"), (req, res) => {
  const id = Number(req.params.id);
  const previous = db.prepare("SELECT * FROM products WHERE id=?").get(id);
  if (!previous) return res.status(404).json({ error: "Producto no encontrado." });
  try {
    const p = productPayload(req.body, previous, req.file ? `/uploads/${req.file.filename}` : null);
    db.prepare(`
      UPDATE products SET
      name=@name,brand=@brand,category=@category,kind=@kind,description=@description,specs=@specs,
      image=@image,source_url=@source_url,reference_price=@reference_price,price=@price,
      stock=@stock,active=@active,featured=@featured,updated_at=CURRENT_TIMESTAMP
      WHERE id=@id
    `).run({ ...p, id });
    res.json({ product: parseProduct(db.prepare("SELECT * FROM products WHERE id=?").get(id)) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/admin/products/:id", requireAdmin, sameOrigin, (req, res) => {
  const id = Number(req.params.id);
  const changed = db.prepare("UPDATE products SET active=0,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(id).changes;
  if (!changed) return res.status(404).json({ error: "Producto no encontrado." });
  res.json({ ok: true });
});

app.get("/api/admin/orders", requireAdmin, (_req, res) => {
  const orders = db.prepare(`
    SELECT o.*,u.name AS customer_name,u.email AS customer_email,
    (SELECT COUNT(*) FROM order_items i WHERE i.order_id=o.id) AS items_count
    FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC LIMIT 200
  `).all();
  res.json({ orders });
});

app.patch("/api/admin/orders/:id/fulfillment", requireAdmin, sameOrigin, (req, res) => {
  const allowed = ["new", "preparing", "shipped", "delivered", "cancelled"];
  const status = String(req.body.status || "");
  if (!allowed.includes(status)) return res.status(400).json({ error: "Estado de envío no válido." });
  const changed = db.prepare("UPDATE orders SET fulfillment_status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
    .run(status, String(req.params.id)).changes;
  if (!changed) return res.status(404).json({ error: "Pedido no encontrado." });
  res.json({ ok: true });
});

// Public static files
app.use(express.static(path.join(ROOT, "public"), { extensions: ["html"] }));
app.get("/", (_req, res) => res.sendFile(path.join(ROOT, "public", "index.html")));
app.use((req, res) => res.status(404).sendFile(path.join(ROOT, "public", "404.html")));
app.use((err, req, res, next) => {
  console.error(err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "La imagen supera el máximo de 5 MB." : "No se pudo subir la imagen." });
  }
  if (req.path.startsWith("/api/")) return res.status(400).json({ error: err.message || "Solicitud inválida." });
  res.status(500).send("Error interno del servidor.");
});

app.listen(PORT, () => console.log(`PULSO MOTO listo en ${BASE_URL}`));
