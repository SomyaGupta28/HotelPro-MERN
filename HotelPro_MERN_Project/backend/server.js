import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();
const app = express();
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",").map(origin => origin.trim()).filter(Boolean);
app.use(cors({ origin: (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error("This origin is not allowed by CORS."));
} }));
app.use(express.json());

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" }
}, { timestamps: true });

const RoomSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  pricePerNight: { type: Number, required: true, min: 1 },
  capacity: { type: Number, required: true, min: 1, default: 2 },
  imageUrl: { type: String, default: "" },
  isAvailable: { type: Boolean, default: true }
}, { timestamps: true });

const BookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  guests: { type: Number, required: true, min: 1 },
  totalPrice: { type: Number, required: true },
  status: { type: String, enum: ["confirmed", "cancelled"], default: "confirmed" }
}, { timestamps: true });

const User = mongoose.model("User", UserSchema);
const Room = mongoose.model("Room", RoomSchema);
const Booking = mongoose.model("Booking", BookingSchema);

const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Please log in first." });
    const payload = jwt.verify(token, process.env.JWT_SECRET || "development_only_secret");
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: "Account not found." });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Session expired. Please log in again." });
  }
};
const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Admin access required." });
  next();
};

app.get("/api/health", (_req, res) => res.json({ status: "ok", app: "HotelPro API" }));

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password || password.length < 6)
      return res.status(400).json({ message: "Enter name, valid email, and a password of at least 6 characters." });
    const normalizedEmail = email.trim().toLowerCase();
    if (await User.findOne({ email: normalizedEmail }))
      return res.status(409).json({ message: "An account with this email already exists." });
    const role = normalizedEmail === (process.env.ADMIN_EMAIL || "admin@hotelpro.com").toLowerCase() ? "admin" : "user";
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name: name.trim(), email: normalizedEmail, passwordHash, role });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "development_only_secret", { expiresIn: "7d" });
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { res.status(500).json({ message: "Could not create account.", detail: err.message }); }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(req.body.password || "", user.passwordHash)))
      return res.status(401).json({ message: "Incorrect email or password." });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "development_only_secret", { expiresIn: "7d" });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { res.status(500).json({ message: "Could not log in.", detail: err.message }); }
});

app.get("/api/rooms", async (_req, res) => {
  try { res.json(await Room.find({ isAvailable: true }).sort({ createdAt: -1 })); }
  catch (err) { res.status(500).json({ message: "Could not load rooms.", detail: err.message }); }
});
app.post("/api/rooms", auth, adminOnly, async (req, res) => {
  try {
    const { name, description, pricePerNight, capacity, imageUrl } = req.body;
    if (!name || Number(pricePerNight) <= 0 || Number(capacity) < 1)
      return res.status(400).json({ message: "Provide a room name, positive price, and capacity of at least 1." });
    res.status(201).json(await Room.create({ name, description, pricePerNight, capacity, imageUrl }));
  } catch (err) { res.status(500).json({ message: "Could not create room.", detail: err.message }); }
});

app.get("/api/admin/bookings", auth, adminOnly, async (_req, res) => {
  try {
    const bookings = await Booking.find().populate("user", "name email").populate("room", "name pricePerNight").sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) { res.status(500).json({ message: "Could not load all bookings.", detail: err.message }); }
});

app.post("/api/bookings", auth, async (req, res) => {
  try {
    const { roomId, checkIn, checkOut, guests } = req.body;
    const start = new Date(checkIn), end = new Date(checkOut);
    if (!roomId || !checkIn || !checkOut || Number.isNaN(+start) || Number.isNaN(+end) || end <= start)
      return res.status(400).json({ message: "Choose a room and valid check-in/check-out dates." });
    const room = await Room.findOne({ _id: roomId, isAvailable: true });
    if (!room) return res.status(404).json({ message: "Room not found or unavailable." });
    const guestCount = Number(guests || 1);
    if (guestCount < 1 || guestCount > room.capacity)
      return res.status(400).json({ message: `This room supports 1–${room.capacity} guests.` });
    const conflict = await Booking.findOne({
      room: roomId, status: "confirmed", checkIn: { $lt: end }, checkOut: { $gt: start }
    });
    if (conflict) return res.status(409).json({ message: "This room is already booked for those dates." });
    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const booking = await Booking.create({ user: req.user._id, room: roomId, checkIn: start, checkOut: end, guests: guestCount, totalPrice: nights * room.pricePerNight });
    res.status(201).json(await booking.populate("room"));
  } catch (err) { res.status(500).json({ message: "Could not create booking.", detail: err.message }); }
});

app.get("/api/bookings/mine", auth, async (req, res) => {
  try {
    res.json(await Booking.find({ user: req.user._id }).populate("room").sort({ createdAt: -1 }));
  } catch (err) { res.status(500).json({ message: "Could not load bookings.", detail: err.message }); }
});

app.patch("/api/bookings/:id/cancel", auth, async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id });
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    booking.status = "cancelled";
    await booking.save();
    res.json(booking);
  } catch (err) { res.status(500).json({ message: "Could not cancel booking.", detail: err.message }); }
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hotelpro")
  .then(() => {
    console.log("MongoDB connected.");
    app.listen(PORT, () => console.log(`HotelPro API running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error("MongoDB connection failed:", err.message);
    console.error("Start MongoDB or update MONGODB_URI in backend/.env.");
    process.exit(1);
  });
