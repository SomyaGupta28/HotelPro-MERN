import { useEffect, useMemo, useState } from "react";
import { BedDouble, CalendarDays, CheckCircle2, CircleUserRound, Hotel, LogIn, LogOut, Menu, ShieldCheck, Sparkles, X } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const demoRooms = [
  { _id: "demo1", name: "Deluxe King Room", description: "A calm, spacious room with a king bed and warm natural finishes.", pricePerNight: 3500, capacity: 2, imageUrl: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85" },
  { _id: "demo2", name: "Garden View Suite", description: "Relax in a bright suite overlooking a peaceful green garden.", pricePerNight: 5200, capacity: 3, imageUrl: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85" },
  { _id: "demo3", name: "Family Comfort Room", description: "Extra space for family trips, with comfortable beds and a seating area.", pricePerNight: 4400, capacity: 4, imageUrl: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=85" }
];

export default function App() {
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("hotelpro_user") || "null"));
  const [token, setToken] = useState(() => localStorage.getItem("hotelpro_token") || "");
  const [modal, setModal] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [bookingForm, setBookingForm] = useState({ checkIn: "", checkOut: "", guests: 2 });
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [adminBookings, setAdminBookings] = useState([]);
  const [roomForm, setRoomForm] = useState({ name: "", description: "", pricePerNight: "", capacity: 2, imageUrl: "" });

  const request = async (path, options = {}) => {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Something went wrong. Check that the backend is running.");
    return data;
  };

  const loadRooms = async () => {
    try { setRooms(await request("/rooms")); }
    catch { setRooms(demoRooms); }
  };
  const loadBookings = async () => {
    if (!token) return;
    try { setBookings(await request("/bookings/mine")); } catch (e) { setNotice(e.message); }
  };
  useEffect(() => { loadRooms(); }, []);
  useEffect(() => { loadBookings(); }, [token]);
  useEffect(() => {
    if (user?.role === "admin" && token) {
      request("/admin/bookings").then(setAdminBookings).catch(e => setNotice(e.message));
    } else setAdminBookings([]);
  }, [token, user?.role]);
  const currency = n => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

  async function submitAuth(e) {
    e.preventDefault(); setBusy(true); setNotice("");
    try {
      const data = await request(`/auth/${modal}`, { method: "POST", body: JSON.stringify(form) });
      localStorage.setItem("hotelpro_token", data.token);
      localStorage.setItem("hotelpro_user", JSON.stringify(data.user));
      setToken(data.token); setUser(data.user); setModal(""); setForm({ name: "", email: "", password: "" });
      setNotice(`Welcome${data.user.name ? `, ${data.user.name}` : ""}! You are logged in.`);
    } catch (e) { setNotice(e.message); } finally { setBusy(false); }
  }
  function logout() {
    localStorage.removeItem("hotelpro_token"); localStorage.removeItem("hotelpro_user");
    setToken(""); setUser(null); setBookings([]); setNotice("You have logged out.");
  }
  async function submitBooking(e) {
    e.preventDefault();
    if (!token) { setModal("login"); setNotice("Please log in to book a room."); return; }
    if (selectedRoom?._id?.startsWith("demo")) { setNotice("Demo rooms are shown because the API is not connected. Start the backend and MongoDB to make a real booking."); return; }
    setBusy(true); setNotice("");
    try {
      const data = await request("/bookings", { method: "POST", body: JSON.stringify({ roomId: selectedRoom._id, ...bookingForm }) });
      setNotice(`Booking confirmed! Total: ${currency(data.totalPrice)}.`);
      setSelectedRoom(null); setModal(""); await loadBookings();
    } catch (e) { setNotice(e.message); } finally { setBusy(false); }
  }
  async function cancelBooking(id) {
    try { await request(`/bookings/${id}/cancel`, { method: "PATCH" }); setNotice("Booking cancelled."); await loadBookings(); if (user?.role === "admin") setAdminBookings(await request("/admin/bookings")); }
    catch (e) { setNotice(e.message); }
  }
  async function submitRoom(e) {
    e.preventDefault(); setBusy(true); setNotice("");
    try {
      await request("/rooms", { method: "POST", body: JSON.stringify({ ...roomForm, pricePerNight: Number(roomForm.pricePerNight), capacity: Number(roomForm.capacity) }) });
      setRoomForm({ name: "", description: "", pricePerNight: "", capacity: 2, imageUrl: "" });
      await loadRooms(); setNotice("Room added successfully.");
    } catch (e) { setNotice(e.message); } finally { setBusy(false); }
  }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#home"><span className="brand-mark"><Hotel size={23}/></span><span>Hotel<span className="brand-light">Pro</span><small>STAYS MADE SIMPLE</small></span></a>
      <button className="menu-toggle" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle menu">{mobileMenu ? <X/> : <Menu/>}</button>
      <nav className={mobileMenu ? "nav open" : "nav"}>
        <a href="#rooms" onClick={() => setMobileMenu(false)}>Explore rooms</a>
        {user && <a href="#bookings" onClick={() => setMobileMenu(false)}>My bookings</a>}
        {user?.role === "admin" && <a href="#admin" onClick={() => setMobileMenu(false)}>Admin panel</a>}
        {user ? <><span className="user-chip"><CircleUserRound size={17}/>{user.name}</span><button className="btn btn-outline btn-small" onClick={logout}><LogOut size={15}/> Log out</button></> :
          <><button className="btn btn-ghost" onClick={() => {setModal("login");setMobileMenu(false)}}>Log in</button><button className="btn btn-dark btn-small" onClick={() => {setModal("register");setMobileMenu(false)}}>Create account</button></>}
      </nav>
    </header>

    <main id="home">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={15}/> YOUR NEXT STAY STARTS HERE</div>
          <h1>Find a place<br/>to <em>feel at home.</em></h1>
          <p>Thoughtfully chosen rooms, effortless booking, and a smoother way to travel. Your comfortable stay is just a few clicks away.</p>
          <a href="#rooms" className="btn btn-light">Explore stays <span>↗</span></a>
          <div className="hero-trust"><span><CheckCircle2 size={16}/> Easy booking</span><span><ShieldCheck size={16}/> Secure account</span></div>
        </div>
        <div className="hero-photo">
          <img src="https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=90" alt="Warm and welcoming hotel bedroom"/>
          <div className="photo-caption"><span className="caption-dot"></span><div><strong>Stay a little better</strong><small>Comfort that feels considered</small></div></div>
        </div>
        <div className="hero-decoration">H</div>
      </section>

      {notice && <div className="notice" role="status"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss notice"><X size={16}/></button></div>}

      <section className="section rooms-section" id="rooms">
        <div className="section-heading"><div><div className="eyebrow dark-eyebrow">A STAY FOR EVERY STORY</div><h2>Rooms you'll <em>love.</em></h2><p>Choose your space. We'll take care of the rest.</p></div><span className="room-count"><BedDouble size={16}/> {rooms.length} stays</span></div>
        <div className="room-grid">
          {rooms.map((room, i) => <article className="room-card" key={room._id}>
            <div className="room-image"><img src={room.imageUrl || demoRooms[i % demoRooms.length].imageUrl} alt={room.name} onError={e => {e.currentTarget.src = demoRooms[i % demoRooms.length].imageUrl}}/><span className="room-tag">{i === 0 ? "GUEST FAVOURITE" : i === 1 ? "A LITTLE LUXURY" : "MADE FOR SHARING"}</span></div>
            <div className="room-info"><div className="room-title-row"><h3>{room.name}</h3><span className="capacity"><CircleUserRound size={14}/> {room.capacity}</span></div><p>{room.description || "A comfortable stay designed around you."}</p><div className="room-bottom"><div><strong>{currency(room.pricePerNight)}</strong><span> / night</span></div><button className="btn btn-dark" onClick={() => {setSelectedRoom(room);setBookingForm({checkIn:"",checkOut:"",guests:Math.min(2, room.capacity)});setModal("book")}}>Book stay <span>↗</span></button></div></div>
          </article>)}
        </div>
        {rooms.length === 0 && <div className="empty">No rooms yet. Add rooms to your database to show them here.</div>}
      </section>

      {user?.role === "admin" && <section className="section" id="admin">
        <div className="section-heading"><div><div className="eyebrow dark-eyebrow">HOTEL MANAGEMENT</div><h2>Admin <em>panel.</em></h2><p>Add rooms and review reservations.</p></div><ShieldCheck size={28}/></div>
        <div className="room-card" style={{ padding: "24px", marginBottom: "28px" }}>
          <h3 style={{ marginTop: 0 }}>Add a room</h3>
          <form className="form" onSubmit={submitRoom}>
            <label>Room name<input required value={roomForm.name} onChange={e => setRoomForm({ ...roomForm, name: e.target.value })} placeholder="Deluxe King Room" /></label>
            <label>Description<input value={roomForm.description} onChange={e => setRoomForm({ ...roomForm, description: e.target.value })} placeholder="Room description" /></label>
            <label>Price per night (INR)<input required type="number" min="1" value={roomForm.pricePerNight} onChange={e => setRoomForm({ ...roomForm, pricePerNight: e.target.value })} placeholder="3500" /></label>
            <label>Guest capacity<select value={roomForm.capacity} onChange={e => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })}>{[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} guest{n > 1 ? "s" : ""}</option>)}</select></label>
            <label>Image URL<input type="url" value={roomForm.imageUrl} onChange={e => setRoomForm({ ...roomForm, imageUrl: e.target.value })} placeholder="https://..." /></label>
            <button className="btn btn-dark submit-btn" disabled={busy}>{busy ? "Saving..." : "Add room"}</button>
          </form>
        </div>
        <h3>All reservations ({adminBookings.length})</h3>
        {!adminBookings.length ? <div className="empty">No reservations have been made yet.</div> : <div className="booking-list">{adminBookings.map(b => <div className="booking-row" key={b._id}><div><strong>{b.room?.name || "Hotel room"}</strong><p>{b.user?.name || "Guest"} ({b.user?.email || "no email"}) · {new Date(b.checkIn).toLocaleDateString()} – {new Date(b.checkOut).toLocaleDateString()}</p></div><div className="booking-price">{currency(b.totalPrice)}<small className={b.status === "cancelled" ? "status cancelled" : "status"}>{b.status}</small></div></div>)}</div>}
      </section>}

      <section className="promise">
        <div className="promise-icon"><ShieldCheck size={26}/></div><div><div className="eyebrow">A BETTER WAY TO STAY</div><h2>Less planning. <em>More living.</em></h2><p>From the first click to check-in day, HotelPro keeps your stay simple and organised.</p></div>
        <div className="promise-points"><span><CheckCircle2/> Simple reservations</span><span><CheckCircle2/> Your bookings in one place</span><span><CheckCircle2/> Secure sign-in</span></div>
      </section>

      {user && <section className="section bookings-section" id="bookings"><div className="section-heading"><div><div className="eyebrow dark-eyebrow">YOUR TRAVEL PLANS</div><h2>My <em>bookings.</em></h2><p>All your reservations, in one place.</p></div><CalendarDays size={28}/></div>
        {!bookings.length ? <div className="empty">You don't have any bookings yet. Find a room above to get started.</div> : <div className="booking-list">{bookings.map(b => <div className="booking-row" key={b._id}><div><strong>{b.room?.name || "Hotel room"}</strong><p>{new Date(b.checkIn).toLocaleDateString()} – {new Date(b.checkOut).toLocaleDateString()} · {b.guests} guest(s)</p></div><div className="booking-price">{currency(b.totalPrice)}<small className={b.status === "cancelled" ? "status cancelled" : "status"}>{b.status}</small></div>{b.status !== "cancelled" && <button className="cancel-link" onClick={() => cancelBooking(b._id)}>Cancel</button>}</div>)}</div>}
      </section>}

      <footer><a className="brand footer-brand" href="#home"><span className="brand-mark"><Hotel size={20}/></span><span>Hotel<span className="brand-light">Pro</span><small>STAYS MADE SIMPLE</small></span></a><span>Made for better stays. © {new Date().getFullYear()} HotelPro</span><a href="#home">Back to top ↑</a></footer>
    </main>

    {modal && <div className="modal-backdrop" onMouseDown={e => {if(e.target === e.currentTarget) setModal("")}}><div className="modal" role="dialog" aria-modal="true">
      <button className="modal-close" onClick={() => setModal("")} aria-label="Close"><X/></button>
      {modal === "login" || modal === "register" ? <>
        <div className="modal-icon"><LogIn/></div><div className="eyebrow dark-eyebrow">WELCOME TO HOTELPRO</div><h2>{modal === "login" ? "Good to see you." : "Let's get you settled."}</h2><p className="modal-sub">{modal === "login" ? "Log in to manage your upcoming stays." : "Create an account to book and manage your stays."}</p>
        <form onSubmit={submitAuth} className="form">
          {modal === "register" && <label>Full name<input required value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="Your name"/></label>}
          <label>Email address<input required type="email" value={form.email} onChange={e => setForm({...form,email:e.target.value})} placeholder="you@example.com"/></label>
          <label>Password<input required minLength="6" type="password" value={form.password} onChange={e => setForm({...form,password:e.target.value})} placeholder="At least 6 characters"/></label>
          <button className="btn btn-dark submit-btn" disabled={busy}>{busy ? "Please wait..." : modal === "login" ? "Log in" : "Create account"}</button>
        </form><p className="switch-modal">{modal === "login" ? "New to HotelPro?" : "Already have an account?"} <button onClick={() => setModal(modal === "login" ? "register" : "login")}>{modal === "login" ? "Create account" : "Log in"}</button></p>
      </> : <>
        <div className="modal-icon"><CalendarDays/></div><div className="eyebrow dark-eyebrow">MAKE IT YOURS</div><h2>Book your <em>stay.</em></h2><p className="modal-sub">{selectedRoom?.name} · {currency(selectedRoom?.pricePerNight)} per night</p>
        <form className="form" onSubmit={submitBooking}>
          <label>Check-in<input type="date" required min={new Date().toISOString().slice(0,10)} value={bookingForm.checkIn} onChange={e => setBookingForm({...bookingForm,checkIn:e.target.value})}/></label>
          <label>Check-out<input type="date" required min={bookingForm.checkIn || new Date().toISOString().slice(0,10)} value={bookingForm.checkOut} onChange={e => setBookingForm({...bookingForm,checkOut:e.target.value})}/></label>
          <label>Guests<select value={bookingForm.guests} onChange={e => setBookingForm({...bookingForm,guests:Number(e.target.value)})}>{Array.from({length:selectedRoom?.capacity || 2},(_,i)=><option key={i} value={i+1}>{i+1} guest{i ? "s" : ""}</option>)}</select></label>
          <button className="btn btn-dark submit-btn" disabled={busy}>{busy ? "Processing..." : "Confirm booking"}</button>
        </form>
        <p className="switch-modal">You'll see your reservation in My bookings after confirmation.</p>
      </>}
    </div></div>}
  </div>;
}
