import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { rooms } from "../rooms/roomData";
import WaitingQueuePanel from "../waitingQueue/WaitingQueuePanel";
import { supabase, supabasePublicKey, supabaseUrl } from "../../lib/supabaseClient";
import "./AdminPage.css";

const DEFAULT_ADMIN_EMAIL = import.meta.env.DEV
  ? import.meta.env.VITE_ADMIN_TEST_EMAIL || "admin@gmail.com"
  : "admin@gmail.com";
const DEFAULT_ADMIN_PASSWORD = import.meta.env.DEV
  ? import.meta.env.VITE_ADMIN_TEST_PASSWORD || ""
  : "";

function isAdmin(user) {
  return user?.app_metadata?.role === "admin";
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

function formatTimestamp(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" });
}

/* ── Sidebar view definitions ────────────────────────────── */
const ADMIN_VIEWS = [
  { id: "dashboard", label: "Dashboard",     icon: "grid" },
  { id: "rooms",     label: "Rooms",         icon: "bed" },
  { id: "bookings",  label: "Bookings",      icon: "calendar" },
  { id: "reservations", label: "Reservations", icon: "document-text" },
  { id: "clients",   label: "Clients",       icon: "people" },
  { id: "settings",  label: "Settings",      icon: "flash" },
];

/* ── Individual view components ──────────────────────────── */

function DashboardView({ bookings, cancelled, waiting, roomStats, guestCount, maxRoomBookings }) {
  return (
    <>
      <section className="admin-welcome">
        <div>
          <p className="admin-eyebrow">WELCOME, ADMIN</p>
          <h1>Hollow Space Hotel</h1>
          <p>Manage rooms, bookings, and guests all in one place.</p>
          <small><ion-icon name="calendar"></ion-icon> Today is {new Date().toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })}</small>
        </div>
      </section>

      <section className="admin-stats" aria-label="Hotel overview">
        <article className="admin-stat"><span><ion-icon name="bed"></ion-icon></span><div><small>Total Rooms</small><strong>{rooms.length}</strong><p>Room types available</p></div><ion-icon className="admin-stat-arrow" name="arrow-forward-circle"></ion-icon></article>
        <article className="admin-stat"><span><ion-icon name="calendar"></ion-icon></span><div><small>Total Bookings</small><strong>{bookings.length}</strong><p>Active reservations</p></div><ion-icon className="admin-stat-arrow" name="arrow-forward-circle"></ion-icon></article>
        <article className="admin-stat"><span><ion-icon name="person"></ion-icon></span><div><small>Total Guests</small><strong>{guestCount}</strong><p>Unique booked guests</p></div><ion-icon className="admin-stat-arrow" name="arrow-forward-circle"></ion-icon></article>
        <article className="admin-stat"><span><ion-icon name="ban"></ion-icon></span><div><small>Cancelled Bookings</small><strong>{cancelled.length}</strong><p>Cancelled reservations</p></div><ion-icon className="admin-stat-arrow" name="arrow-forward-circle"></ion-icon></article>
      </section>

      <section className="admin-overview-grid">
        <article className="admin-panel admin-chart-panel" id="booking-statistics">
          <div className="admin-panel-heading"><h2><ion-icon name="bar-chart"></ion-icon> Booking Statistics</h2><span>By room type</span></div>
          <div className="admin-chart" role="img" aria-label="Bookings and cancellations grouped by room type">
            {roomStats.map((room) => (
              <div className="admin-chart-group" key={room.id}>
                <div className="admin-chart-bars">
                  <span className="admin-bar admin-bar-booked" style={{ height: `${Math.max(4, (room.bookings / maxRoomBookings) * 100)}%` }} title={`${room.bookings} active bookings`}></span>
                  <span className="admin-bar admin-bar-cancelled" style={{ height: `${Math.max(4, (room.cancelled / maxRoomBookings) * 100)}%` }} title={`${room.cancelled} cancellations`}></span>
                </div>
                <small>{room.name.replace(" Room", "")}</small>
              </div>
            ))}
          </div>
          <div className="admin-chart-legend"><span><i></i> Bookings</span><span><i></i> Cancellations</span></div>
        </article>

        <article className="admin-panel admin-demand-panel">
          <div className="admin-panel-heading"><h2><ion-icon name="bed"></ion-icon> Room Demand</h2></div>
          <div className="admin-demand-list">
            {roomStats.map((room) => (
              <div className="admin-demand-row" key={room.id}>
                <span className="admin-demand-icon"><ion-icon name="bed"></ion-icon></span>
                <div><strong>{room.name}</strong><small>₱{room.price.toLocaleString()} / night</small></div>
                <b>{room.bookings} booked</b>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-panel admin-quick-panel">
          <div className="admin-panel-heading"><h2><ion-icon name="flash"></ion-icon> Quick Actions</h2></div>
          <div className="admin-quick-actions">
            <Link to="/rooms"><ion-icon name="bed"></ion-icon><strong>Browse Rooms</strong><small>View room types</small></Link>
            <Link to="/booking"><ion-icon name="calendar"></ion-icon><strong>New Booking</strong><small>Make a reservation</small></Link>
            <Link to="/client"><ion-icon name="person-add"></ion-icon><strong>Client Login</strong><small>Open client portal</small></Link>
            <a href="#booking-statistics"><ion-icon name="document-text"></ion-icon><strong>View Stats</strong><small>Review statistics</small></a>
          </div>
        </article>
      </section>

      <section className="admin-lower-grid">
        <article className="admin-panel admin-activity-panel">
          <div className="admin-panel-heading"><h2><ion-icon name="time"></ion-icon> Recent Activity</h2></div>
          {bookings.slice(0, 3).map((booking, index) => (
            <div className="admin-activity-row" key={booking.id ?? `${booking.name}-${index}`}>
              <span><ion-icon name="calendar"></ion-icon></span>
              <div><strong>Booking received</strong><small>{booking.name} · {booking.room}</small><small>{formatDate(booking.date)}</small></div>
            </div>
          ))}
          {cancelled.slice(0, 2).map((booking, index) => (
            <div className="admin-activity-row" key={`cancelled-${booking.id ?? `${booking.name}-${index}`}`}>
              <span className="is-cancelled"><ion-icon name="ban"></ion-icon></span>
              <div><strong>Booking cancelled</strong><small>{booking.name} · {booking.room}</small></div>
            </div>
          ))}
          {!bookings.length && !cancelled.length && <p className="admin-empty">No recent activity.</p>}
          <div className="admin-waiting-summary"><ion-icon name="people"></ion-icon><span><strong>{waiting.length} waiting</strong><small>Customers in queue</small></span></div>
        </article>

        <article className="admin-panel admin-inventory-panel">
          <div className="admin-panel-heading"><h2><ion-icon name="albums"></ion-icon> Room Inventory</h2><Link to="/rooms">View all <ion-icon name="arrow-forward"></ion-icon></Link></div>
          {roomStats.map((room) => (
            <div className="admin-inventory-row" key={room.id}>
              <span className="admin-inventory-image"><ion-icon name="bed"></ion-icon></span>
              <span><strong>{room.name}</strong><small>₱{room.price.toLocaleString()} / night</small></span>
              <b>{room.bookings} booked</b>
            </div>
          ))}
        </article>

        <article className="admin-panel admin-activity-panel">
          <div className="admin-panel-heading"><h2><ion-icon name="people"></ion-icon> Guest Summary</h2></div>
          <div className="admin-demand-list">
            {Array.from(new Set(bookings.map((b) => b.name).filter(Boolean))).slice(0, 5).map((name) => {
              const guestBookings = bookings.filter((b) => b.name === name);
              return (
                <div className="admin-demand-row" key={name}>
                  <span className="admin-demand-icon"><ion-icon name="person"></ion-icon></span>
                  <div><strong>{name}</strong><small>{guestBookings.length} booking{guestBookings.length !== 1 ? "s" : ""}</small></div>
                  <b>{guestBookings[0]?.room}</b>
                </div>
              );
            })}
            {!bookings.length && <p className="admin-empty">No guests yet.</p>}
          </div>
        </article>
      </section>
    </>
  );
}

function RoomsView({ roomStats }) {
  return (
    <>
      <section className="admin-view-header">
        <div>
          <p className="admin-eyebrow">ROOM MANAGEMENT</p>
          <h1>Rooms</h1>
          <p>View and manage room types, pricing, and availability.</p>
        </div>
      </section>

      <section className="admin-stats" aria-label="Room statistics">
        <article className="admin-stat"><span><ion-icon name="bed"></ion-icon></span><div><small>Total Room Types</small><strong>{rooms.length}</strong><p>Available categories</p></div><ion-icon className="admin-stat-arrow" name="arrow-forward-circle"></ion-icon></article>
        <article className="admin-stat"><span><ion-icon name="calendar"></ion-icon></span><div><small>Total Bookings</small><strong>{roomStats.reduce((sum, r) => sum + r.bookings, 0)}</strong><p>Across all rooms</p></div><ion-icon className="admin-stat-arrow" name="arrow-forward-circle"></ion-icon></article>
        <article className="admin-stat"><span><ion-icon name="ban"></ion-icon></span><div><small>Total Cancelled</small><strong>{roomStats.reduce((sum, r) => sum + r.cancelled, 0)}</strong><p>Cancelled bookings</p></div><ion-icon className="admin-stat-arrow" name="arrow-forward-circle"></ion-icon></article>
        <article className="admin-stat"><span><ion-icon name="flash"></ion-icon></span><div><small>Price Range</small><strong>₱{Math.min(...rooms.map((r) => r.price)).toLocaleString()} – ₱{Math.max(...rooms.map((r) => r.price)).toLocaleString()}</strong><p>Per night</p></div><ion-icon className="admin-stat-arrow" name="arrow-forward-circle"></ion-icon></article>
      </section>

      <section className="admin-rooms-grid">
        {rooms.map((room) => {
          const stats = roomStats.find((rs) => rs.id === room.id) ?? room;
          return (
            <article className="admin-panel admin-room-card" key={room.id}>
              <div className="admin-room-card-image" style={{ backgroundImage: `url("${room.image}")` }}>
                <span className="admin-room-card-badge"><ion-icon name="checkmark-circle"></ion-icon> Available</span>
              </div>
              <div className="admin-room-card-body">
                <h2>{room.name}</h2>
                <p className="admin-room-card-price">₱{room.price.toLocaleString()} <small>/ night</small></p>
                <p className="admin-room-card-desc">{room.description}</p>
                <ul className="admin-room-card-features">
                  {room.features.map((f) => (
                    <li key={f}><ion-icon name="checkmark-circle"></ion-icon> {f}</li>
                  ))}
                </ul>
                <div className="admin-room-card-stats">
                  <span><strong>{stats.bookings}</strong> booked</span>
                  <span><strong>{stats.cancelled}</strong> cancelled</span>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}

function BookingsView({ bookings, bookingActionMessage, cancelingBookingRef, onCancelBooking }) {
  return (
    <>
      <section className="admin-view-header">
        <div>
          <p className="admin-eyebrow">BOOKING MANAGEMENT</p>
          <h1>Bookings</h1>
          <p>View and manage all hotel bookings.</p>
        </div>
      </section>

      <section className="admin-stats" aria-label="Booking statistics">
        <article className="admin-stat"><span><ion-icon name="calendar"></ion-icon></span><div><small>Total Bookings</small><strong>{bookings.length}</strong><p>All reservations</p></div><ion-icon className="admin-stat-arrow" name="arrow-forward-circle"></ion-icon></article>
        <article className="admin-stat"><span><ion-icon name="checkmark-circle"></ion-icon></span><div><small>Active</small><strong>{bookings.filter((b) => !["cancelled", "canceled", "completed"].includes((b.status || "").toLowerCase())).length}</strong><p>Current bookings</p></div><ion-icon className="admin-stat-arrow" name="arrow-forward-circle"></ion-icon></article>
        <article className="admin-stat"><span><ion-icon name="ban"></ion-icon></span><div><small>Cancelled</small><strong>{bookings.filter((b) => ["cancelled", "canceled"].includes((b.status || "").toLowerCase())).length}</strong><p>Cancelled bookings</p></div><ion-icon className="admin-stat-arrow" name="arrow-forward-circle"></ion-icon></article>
        <article className="admin-stat"><span><ion-icon name="person"></ion-icon></span><div><small>Unique Guests</small><strong>{new Set(bookings.map((b) => b.name).filter(Boolean)).size}</strong><p>Individual guests</p></div><ion-icon className="admin-stat-arrow" name="arrow-forward-circle"></ion-icon></article>
      </section>

      <article className="admin-panel admin-records-panel admin-full-panel">
        <div className="admin-panel-heading"><h2><ion-icon name="calendar"></ion-icon> All Bookings</h2><span>{bookings.length} total</span></div>
        {bookings.length ? (
          <div className="admin-table-wrap">
            {bookingActionMessage && <p className="admin-booking-action-message" role="status">{bookingActionMessage}</p>}
            <table className="admin-booking-table">
              <thead><tr><th>Guest</th><th>Room</th><th>Check-in</th><th>Check-out</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {bookings.map((booking, index) => (
                  <tr key={booking.id ?? `${booking.name}-${index}`}>
                    <td>{booking.name}</td><td>{booking.room}</td><td>{formatDate(booking.date)}</td><td>{formatDate(booking.checkout_date)}</td>
                    <td><span className={`admin-status ${(booking.status || "Booked").toLowerCase().replace(/\s+/g, "-")}`}>{booking.status || "Booked"}</span></td>
                    <td>
                      <button
                        className="admin-cancel-button"
                        type="button"
                        disabled={["cancelled", "canceled", "completed"].includes((booking.status || "").toLowerCase()) || cancelingBookingRef === booking.client_booking_ref}
                        onClick={() => onCancelBooking(booking.client_booking_ref)}
                      >
                        {cancelingBookingRef === booking.client_booking_ref ? "Cancelling…" : "Cancel"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="admin-empty">No bookings yet. New reservations will appear here.</p>}
      </article>
    </>
  );
}

function ReservationsView({ bookings, cancelled, waiting, waitingError }) {
  const active = bookings.filter((b) => !["cancelled", "canceled", "completed"].includes((b.status || "").toLowerCase()));
  const completed = bookings.filter((b) => (b.status || "").toLowerCase() === "completed");

  return (
    <>
      <section className="admin-view-header">
        <div>
          <p className="admin-eyebrow">RESERVATION RECORDS</p>
          <h1>Reservations</h1>
          <p>Track active, completed, cancelled, and waiting reservations.</p>
        </div>
      </section>

      <section className="admin-stats" aria-label="Reservation statistics">
        <article className="admin-stat"><span><ion-icon name="calendar"></ion-icon></span><div><small>Active</small><strong>{active.length}</strong><p>Current reservations</p></div><ion-icon className="admin-stat-arrow" name="arrow-forward-circle"></ion-icon></article>
        <article className="admin-stat"><span><ion-icon name="checkmark-circle"></ion-icon></span><div><small>Completed</small><strong>{completed.length}</strong><p>Past stays</p></div><ion-icon className="admin-stat-arrow" name="arrow-forward-circle"></ion-icon></article>
        <article className="admin-stat"><span><ion-icon name="ban"></ion-icon></span><div><small>Cancelled</small><strong>{cancelled.length}</strong><p>Cancelled reservations</p></div><ion-icon className="admin-stat-arrow" name="arrow-forward-circle"></ion-icon></article>
        <article className="admin-stat"><span><ion-icon name="people"></ion-icon></span><div><small>Waiting Queue</small><strong>{waiting.length}</strong><p>Customers in queue</p></div><ion-icon className="admin-stat-arrow" name="arrow-forward-circle"></ion-icon></article>
      </section>

      <section className="admin-reservations-grid">
        <article className="admin-panel admin-full-panel">
          <div className="admin-panel-heading"><h2><ion-icon name="archive"></ion-icon> Cancelled Bookings</h2><span>{cancelled.length} total</span></div>
          {cancelled.length ? cancelled.map((item, index) => (
            <p className="admin-cancelled-item" key={`${item.id ?? item.name}-${index}`}>{item.name} <span>{item.room}</span> <span>{formatDate(item.date)} – {formatDate(item.checkout_date)}</span></p>
          )) : <p className="admin-empty">No cancelled bookings.</p>}
        </article>

        <article className="admin-panel admin-full-panel admin-waiting-panel">
          {waitingError && <p className="admin-auth-error" role="alert">{waitingError}</p>}
          <WaitingQueuePanel items={waiting} />
        </article>
      </section>
    </>
  );
}

function ClientsView({ bookings }) {
  // ==========================================================================
  // [DSA: DATA STRUCTURE - HASH MAP (Map) & HASH SET (Set)]
  // Purpose: Groups booking history by client name in O(1) average lookup time.
  // - Map: Associates unique guest name -> guest profile with list of bookings
  // - Set: Collects distinct room types booked per client without duplicates
  // Time Complexity: O(N) where N = bookings count
  // Space Complexity: O(U) where U = number of unique clients
  // ==========================================================================
  const guestMap = useMemo(() => {
    const map = new Map();
    bookings.forEach((b) => {
      if (!b.name) return;
      if (!map.has(b.name)) {
        map.set(b.name, { name: b.name, bookings: [], rooms: new Set() });
      }
      const guest = map.get(b.name);
      guest.bookings.push(b);
      guest.rooms.add(b.room);
    });
    return Array.from(map.values());
  }, [bookings]);

  return (
    <>
      <section className="admin-view-header">
        <div>
          <p className="admin-eyebrow">CLIENT MANAGEMENT</p>
          <h1>Clients</h1>
          <p>View registered clients and their booking history.</p>
        </div>
      </section>

      <section className="admin-stats" aria-label="Client statistics">
        <article className="admin-stat"><span><ion-icon name="people"></ion-icon></span><div><small>Total Clients</small><strong>{guestMap.length}</strong><p>Unique guests</p></div><ion-icon className="admin-stat-arrow" name="arrow-forward-circle"></ion-icon></article>
        <article className="admin-stat"><span><ion-icon name="calendar"></ion-icon></span><div><small>Total Bookings</small><strong>{bookings.length}</strong><p>All reservations</p></div><ion-icon className="admin-stat-arrow" name="arrow-forward-circle"></ion-icon></article>
        <article className="admin-stat"><span><ion-icon name="bed"></ion-icon></span><div><small>Rooms Used</small><strong>{new Set(bookings.map((b) => b.room).filter(Boolean)).size}</strong><p>Distinct room types</p></div><ion-icon className="admin-stat-arrow" name="arrow-forward-circle"></ion-icon></article>
        <article className="admin-stat"><span><ion-icon name="person"></ion-icon></span><div><small>Returning</small><strong>{guestMap.filter((g) => g.bookings.length > 1).length}</strong><p>Repeat guests</p></div><ion-icon className="admin-stat-arrow" name="arrow-forward-circle"></ion-icon></article>
      </section>

      <article className="admin-panel admin-full-panel">
        <div className="admin-panel-heading"><h2><ion-icon name="people"></ion-icon> Client Directory</h2><span>{guestMap.length} clients</span></div>
        {guestMap.length ? (
          <div className="admin-table-wrap">
            <table className="admin-booking-table">
              <thead><tr><th>Name</th><th>Total Bookings</th><th>Rooms Booked</th><th>Latest Booking</th><th>Status</th></tr></thead>
              <tbody>
                {guestMap.map((guest) => {
                  const latest = guest.bookings[0];
                  return (
                    <tr key={guest.name}>
                      <td><strong>{guest.name}</strong></td>
                      <td>{guest.bookings.length}</td>
                      <td>{Array.from(guest.rooms).join(", ")}</td>
                      <td>{formatDate(latest?.date)}</td>
                      <td><span className={`admin-status ${(latest?.status || "Booked").toLowerCase().replace(/\s+/g, "-")}`}>{latest?.status || "Booked"}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="admin-empty">No clients found. Client records appear after bookings are made.</p>}
      </article>
    </>
  );
}

function SettingsView({ user, accessLogs, logsLoading, logsError }) {
  return (
    <>
      <section className="admin-view-header">
        <div>
          <p className="admin-eyebrow">SYSTEM CONFIGURATION</p>
          <h1>Settings</h1>
          <p>Admin account information, access history, and system settings.</p>
        </div>
      </section>

      <section className="admin-settings-grid">
        <article className="admin-panel">
          <div className="admin-panel-heading"><h2><ion-icon name="person-circle"></ion-icon> Admin Account</h2></div>
          <div className="admin-settings-info">
            <div className="admin-settings-row"><span>Email</span><strong>{user.email}</strong></div>
            <div className="admin-settings-row"><span>Role</span><strong>Administrator</strong></div>
            <div className="admin-settings-row"><span>User ID</span><strong className="admin-settings-id">{user.id}</strong></div>
            <div className="admin-settings-row"><span>Last Sign-in</span><strong>{user.last_sign_in_at ? formatTimestamp(user.last_sign_in_at) : "—"}</strong></div>
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-heading"><h2><ion-icon name="flash"></ion-icon> System Information</h2></div>
          <div className="admin-settings-info">
            <div className="admin-settings-row"><span>Backend</span><strong>Supabase</strong></div>
            <div className="admin-settings-row"><span>Authentication</span><strong>Email / Password</strong></div>
            <div className="admin-settings-row"><span>Database</span><strong>PostgreSQL</strong></div>
            <div className="admin-settings-row"><span>Status</span><strong style={{ color: "#d9aa62" }}>● Connected</strong></div>
          </div>
        </article>
      </section>

      <article className="admin-panel admin-full-panel admin-access-log-panel">
        <div className="admin-panel-heading">
          <h2><ion-icon name="shield-checkmark"></ion-icon> Admin Access History</h2>
          <span>Latest 20 events</span>
        </div>
        {logsError && <p className="admin-auth-error" role="alert">{logsError}</p>}
        {logsLoading ? (
          <p className="admin-empty">Loading access history…</p>
        ) : accessLogs.length ? (
          <div className="admin-access-log-list">
            {accessLogs.map((entry) => (
              <div className="admin-access-log-row" key={entry.id}>
                <span className="admin-access-log-event">{entry.event.replace("_", " ")}</span>
                <strong>{entry.actor_email || "Anonymous visitor"}</strong>
                <time dateTime={entry.created_at}>{formatTimestamp(entry.created_at)}</time>
              </div>
            ))}
          </div>
        ) : (
          !logsError && <p className="admin-empty">No admin access events recorded yet.</p>
        )}
        <p className="admin-access-log-note">Anonymous page visits are counted, but their identities are only known after they sign in.</p>
      </article>
    </>
  );
}

/* ── Main AdminPage component ────────────────────────────── */

export default function AdminPage({
  bookings = [],
  cancelled = [],
  waiting = [],
  waitingError = "",
  onCancelBooking
}) {
  const navigate = useNavigate();
  const [email, setEmail] = useState(DEFAULT_ADMIN_EMAIL);
  const [password, setPassword] = useState(DEFAULT_ADMIN_PASSWORD);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [bookingActionMessage, setBookingActionMessage] = useState("");
  const [cancelingBookingRef, setCancelingBookingRef] = useState("");
  const [accessLogs, setAccessLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState("");
  const pageViewRecorded = useRef(false);
  const loggedIn = isAdmin(user);

  /* ── Active sidebar view ── */
  const [activeView, setActiveView] = useState("dashboard");

  async function cancelAdminBooking(bookingRef) {
    setBookingActionMessage("");
    setCancelingBookingRef(bookingRef);
    try {
      const result = await onCancelBooking(bookingRef);
      if (result?.error) {
        setBookingActionMessage(`Could not cancel this reservation: ${result.error}`);
      } else {
        setBookingActionMessage("Reservation cancelled. The record remains available for review.");
      }
    } catch (error) {
      console.error("Admin booking cancellation failed:", error);
      setBookingActionMessage(
        `Could not cancel this reservation: ${error instanceof Error ? error.message : "Unexpected error"}`
      );
    } finally {
      setCancelingBookingRef("");
    }
  }

  const recordAccess = useCallback(async (event, actorEmail = null) => {
    if (!supabase) {
      setLogsError(
        "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY before viewing admin access logs."
      );
      return false;
    }

    if (event === "page_view" && actorEmail === null) {
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/admin_access_logs`, {
          method: "POST",
          headers: {
            apikey: supabasePublicKey,
            "Content-Type": "application/json",
            Prefer: "return=minimal"
          },
          body: JSON.stringify({
            event,
            actor_email: null,
            page_path: "/admin"
          })
        });

        if (!response.ok) {
          const responseError = await response.json().catch(() => null);
          const message = responseError?.message || `Request failed with status ${response.status}`;
          throw new Error(message);
        }

        return true;
      } catch (error) {
        console.error("Could not record anonymous admin page view:", error);
        setLogsError(
          `Could not record admin access: ${error instanceof Error ? error.message : "Unexpected error"}`
        );
        return false;
      }
    }

    const { error } = await supabase.from("admin_access_logs").insert({
      event,
      actor_email: actorEmail,
      page_path: "/admin"
    });

    if (error) {
      console.error("Could not record admin access:", error);
      setLogsError(`Could not record admin access: ${error.message}`);
      return false;
    }

    return true;
  }, []);

  const loadAccessLogs = useCallback(async () => {
    if (!supabase) {
      setLogsError(
        "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY before viewing admin access logs."
      );
      return;
    }

    setLogsLoading(true);
    const { data, error } = await supabase
      .from("admin_access_logs")
      .select("id, event, actor_email, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Could not load admin access history:", error);
      setLogsError(`Could not load access history: ${error.message}`);
    } else {
      setLogsError("");
      setAccessLogs(data ?? []);
    }

    setLogsLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) return undefined;

    let active = true;

    async function initializeAdminPage() {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;

      if (error) {
        console.error("Could not check admin session:", error);
        setAuthError(`Could not check your sign-in: ${error.message}`);
      }

      const sessionUser = error ? null : data.session?.user;
      const adminUser = isAdmin(sessionUser) ? sessionUser : null;
      setUser(adminUser);

      if (!pageViewRecorded.current) {
        pageViewRecorded.current = true;
        await recordAccess("page_view", adminUser?.email ?? null);
      }

      if (adminUser) await loadAccessLogs();
      if (active) setAuthLoading(false);
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(isAdmin(session?.user) ? session.user : null);
    });

    initializeAdminPage();

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadAccessLogs, recordAccess]);

  // ==========================================================================
  // [DSA: ALGORITHMS - FREQUENCY COUNTING, SET DEDUPLICATION & EXTREMA SEARCH]
  // 1. Frequency Counter (Map/Filter): Counts bookings and cancellations per room type - O(R * N)
  // 2. Hash Set (Set): Deduplicates guest names to calculate total unique guests in O(N)
  // 3. Extrema Search (Math.max): Finds the highest booking frequency for chart scaling - O(R)
  // ==========================================================================
  const roomStats = useMemo(
    () => rooms.map((room) => ({
      ...room,
      bookings: bookings.filter((booking) => booking.room === room.name).length,
      cancelled: cancelled.filter((booking) => booking.room === room.name).length
    })),
    [bookings, cancelled]
  );
  // [DSA: Set Deduplication - O(N)]
  const guestCount = new Set(bookings.map((booking) => booking.name).filter(Boolean)).size;
  // [DSA: Max Extrema Calculation - O(R)]
  const maxRoomBookings = Math.max(1, ...roomStats.map((room) => room.bookings + room.cancelled));

  async function handleLogin(event) {
    event.preventDefault();

    if (!supabase) {
      setAuthError(
        "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY before signing in as an admin."
      );
      return;
    }

    setAuthSubmitting(true);
    setAuthError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) {
      setAuthError(
        error.message === "Invalid login credentials"
          ? "Sign-in failed: Invalid login credentials. Check the password and confirm this email exists in Supabase Authentication → Users."
          : `Sign-in failed: ${error.message}`
      );
      setAuthSubmitting(false);
      return;
    }

    if (!isAdmin(data.user)) {
      const { error: signOutError } = await supabase.auth.signOut();
      setAuthError(
        signOutError
          ? `This account does not have admin access. Sign-out failed: ${signOutError.message}`
          : "This account does not have admin access."
      );
      setAuthSubmitting(false);
      return;
    }

    setUser(data.user);
    await recordAccess("login", data.user.email);
    await loadAccessLogs();
    setPassword("");
    setAuthSubmitting(false);
  }

  async function logout() {
    if (!supabase) {
      setAuthError(
        "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY before signing out."
      );
      return;
    }

    await recordAccess("logout", user.email);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(`Could not sign out: ${error.message}`);
      return;
    }

    setUser(null);
    navigate("/admin");
  }

  /* ── Loading state ── */
  if (authLoading) {
    return (
      <div className="admin-login-page">
        <p>Checking admin session…</p>
        <Link to="/client" className="admin-login-system-link" aria-label="Back to System" title="Back to System"><ion-icon name="arrow-back" aria-hidden="true"></ion-icon></Link>
      </div>
    );
  }

  /* ── Login form ── */
  if (!loggedIn) {
    return (
      <div className="admin-login-page">
        <form className="admin-login-card" onSubmit={handleLogin}>
          <span className="admin-login-icon"><ion-icon name="lock-closed"></ion-icon></span>
          <p className="admin-eyebrow">HOLLOW SPACE HOTEL</p>
          <h1>Admin Dashboard</h1>
          <p className="admin-login-copy">Sign in with your authorized admin email and password.</p>
          {authError && <p className="admin-auth-error" role="alert">{authError}</p>}
          <label htmlFor="admin-email">Admin email address</label>
          <input
            id="admin-email"
            type="email"
            placeholder={DEFAULT_ADMIN_EMAIL}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            required
          />
          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            placeholder="Enter admin password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
          <button type="submit" disabled={authSubmitting}>
            <ion-icon name="log-in"></ion-icon> {authSubmitting ? "Logging in..." : "Login"}
          </button>
          <Link to="/client" className="admin-back-link admin-login-system-link" aria-label="Back to System" title="Back to System"><ion-icon name="arrow-back" aria-hidden="true"></ion-icon></Link>
        </form>
      </div>
    );
  }

  /* ── Render the active view content ── */
  function renderActiveView() {
    switch (activeView) {
      case "rooms":
        return <RoomsView roomStats={roomStats} />;
      case "bookings":
        return (
          <BookingsView
            bookings={bookings}
            bookingActionMessage={bookingActionMessage}
            cancelingBookingRef={cancelingBookingRef}
            onCancelBooking={cancelAdminBooking}
          />
        );
      case "reservations":
        return (
          <ReservationsView
            bookings={bookings}
            cancelled={cancelled}
            waiting={waiting}
            waitingError={waitingError}
          />
        );
      case "clients":
        return <ClientsView bookings={bookings} />;
      case "settings":
        return (
          <SettingsView
            user={user}
            accessLogs={accessLogs}
            logsLoading={logsLoading}
            logsError={logsError}
          />
        );
      default:
        return (
          <DashboardView
            bookings={bookings}
            cancelled={cancelled}
            waiting={waiting}
            roomStats={roomStats}
            guestCount={guestCount}
            maxRoomBookings={maxRoomBookings}
          />
        );
    }
  }

  /* ── Logged-in admin dashboard ── */
  const viewTitles = {
    dashboard: "Hotel Management",
    rooms: "Room Management",
    bookings: "Booking Management",
    reservations: "Reservation Records",
    clients: "Client Management",
    settings: "System Settings",
  };

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <Link className="admin-brand" to="/admin">
          <img className="admin-brand-logo" src="/hollow-space-hotel-mark.png" alt="Hollow Space Hotel logo" />
          <span><strong>HOLLOW SPACE HOTEL</strong><small>Admin Dashboard</small></span>
        </Link>
        <nav className="admin-side-nav" aria-label="Admin navigation">
          {ADMIN_VIEWS.map((view) => (
            <button
              key={view.id}
              type="button"
              className={activeView === view.id ? "is-active" : ""}
              onClick={() => setActiveView(view.id)}
            >
              <ion-icon name={view.icon}></ion-icon> {view.label}
            </button>
          ))}
        </nav>
        <button className="admin-side-logout" type="button" onClick={logout}>
          <ion-icon name="log-out"></ion-icon> Logout
        </button>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <span className="admin-topbar-title">{viewTitles[activeView] || "Hotel Management"}</span>
          <div>
            <Link to="/client" className="system-back-link" aria-label="Back to System" title="Back to System"><ion-icon name="arrow-back" aria-hidden="true"></ion-icon></Link>
            <ion-icon name="notifications-outline"></ion-icon>
            <span className="admin-user"><ion-icon name="person-circle"></ion-icon> {user.email}</span>
          </div>
        </header>

        <main className="admin-content" id="admin-overview">
          {renderActiveView()}
          <footer className="admin-footer"><span>HOLLOW SPACE HOTEL · Admin Panel</span><span><ion-icon name="shield-checkmark"></ion-icon> Secure · Manage · Provide Comfort</span></footer>
        </main>
      </div>
    </div>
  );
}
