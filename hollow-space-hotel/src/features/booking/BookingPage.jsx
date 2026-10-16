import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { rooms } from "../rooms/roomData";
import { supabase } from "../../lib/supabaseClient";
import {
  getSafeSupabaseQueryMessage,
  isSupabaseSchemaError,
  logSupabaseQueryError
} from "../../lib/supabaseQueryErrors";
import "./BookingPage.css";

function getLocalDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "—";

  const parsedDate = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  return Number.isNaN(parsedDate.getTime())
    ? value
    : parsedDate.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

// ============================================================================
// [DSA: ALGORITHM - STATE CLASSIFICATION / DECISION LOGIC O(1)]
// Categorizes a reservation into dynamic lifecycle states based on date boundaries
// ============================================================================
function getReservationStatus(booking, today) {
  const savedStatus = (booking.status || "Booked").trim().toLowerCase();
  if (savedStatus === "cancelled" || savedStatus === "canceled") return "Cancelled";
  if (savedStatus === "waiting") return "Waiting";
  if (savedStatus === "completed") return "Completed";
  if (booking.checkout_date && booking.checkout_date <= today) return "Completed";
  if (booking.date && booking.date <= today) return "Checked In / Active";
  if (booking.date) return "Upcoming";
  return booking.status || "Booked";
}

function formatPrice(value) {
  const price = Number(value);
  return Number.isFinite(price) ? `₱${price.toLocaleString()} / night` : "—";
}

export default function BookingPage({
  clientLoggedIn,
  clientUser,
  name,
  onNameChange,
  room,
  onRoomChange,
  date,
  onDateChange,
  checkoutDate,
  onCheckoutDateChange,
  onBook,
  onAddToWaitingQueue,
  bookings = [],
  bookingsLoading = false,
  bookingsError = "",
  onRefreshBookings,
  onCancelBooking,
  onReserveAgain,
  onLogout
}) {
  const navigate = useNavigate();
  const bookingFormRef = useRef(null);
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unavailableSelection, setUnavailableSelection] = useState(null);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);
  const [waitlistEntries, setWaitlistEntries] = useState([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistLoaded, setWaitlistLoaded] = useState(false);
  const [waitlistMessage, setWaitlistMessage] = useState("");
  const [waitlistErrorMessage, setWaitlistErrorMessage] = useState("");
  const [cancelingBookingId, setCancelingBookingId] = useState("");
  const [bookingActionMessage, setBookingActionMessage] = useState("");
  const [bookingRefreshLoading, setBookingRefreshLoading] = useState(false);
  const [today, setToday] = useState(getLocalDate);
  const [activeTab, setActiveTab] = useState(() => (room ? "new" : "bookings"));

  // Pre-fill customer name from client user profile if empty
  useEffect(() => {
    if (!name && clientUser) {
      const defaultName = clientUser.user_metadata?.full_name || clientUser.email?.split("@")[0] || "";
      if (defaultName && onNameChange) {
        onNameChange(defaultName);
      }
    }
  }, [clientUser, name, onNameChange]);

  // When room is selected from external navigation, switch to new reservation tab
  useEffect(() => {
    if (room) {
      setActiveTab("new");
    }
  }, [room]);

  const loadClientWaitlist = useCallback(async () => {
    if (!supabase) {
      setWaitlistEntries([]);
      setWaitlistErrorMessage("Waiting-list requests cannot load because Supabase is not configured.");
      setWaitlistLoaded(false);
      return false;
    }

    if (!clientUser) {
      setWaitlistEntries([]);
      setWaitlistErrorMessage("Sign in with a client account to load your waiting-list requests.");
      setWaitlistLoaded(false);
      return;
    }

    setWaitlistLoaded(false);
    setWaitlistErrorMessage("");
    setWaitlistLoading(true);
    try {
      const { data, error } = await supabase
        .from("booking_waitlist")
        .select("id, room, date, checkout_date, status, created_at")
        .eq("user_id", clientUser.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWaitlistEntries(data ?? []);
      setWaitlistErrorMessage("");
      setWaitlistLoaded(true);
    } catch (error) {
      logSupabaseQueryError("Could not load your waiting-list requests:", error);
      if (isSupabaseSchemaError(error)) {
        setWaitlistEntries([]);
        setWaitlistErrorMessage("");
        setWaitlistLoaded(false);
        return false;
      }
      setWaitlistErrorMessage(getSafeSupabaseQueryMessage(error, "waiting-list requests"));
      setWaitlistLoaded(false);
      return false;
    } finally {
      setWaitlistLoading(false);
    }
    return true;
  }, [clientUser]);

  useEffect(() => {
    const timer = window.setTimeout(() => loadClientWaitlist(), 0);
    return () => window.clearTimeout(timer);
  }, [loadClientWaitlist]);

  useEffect(() => {
    const timer = window.setInterval(() => setToday(getLocalDate()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  async function submitBooking(event) {
    event.preventDefault();
    setFormMessage("");
    setFormError(false);
    setUnavailableSelection(null);

    if (checkoutDate <= date) {
      setFormMessage("Check-out date must be after check-in date.");
      setFormError(true);
      return;
    }

    setSubmitting(true);
    try {
      const result = await onBook();
      if (result?.error) {
        setFormMessage(
          result.unavailable
            ? "This room is already reserved for part of those dates. You can join the waiting list."
            : `Could not create the reservation: ${result.error}`
        );
        setFormError(true);
        if (result.unavailable) {
          setUnavailableSelection({ name, room, date, checkoutDate });
        }
        return;
      }

      setFormMessage(
        result.bookingReference
          ? `Your reservation has been booked. Reference: ${result.bookingReference}`
          : "Your reservation has been booked."
      );
      setFormError(false);
      // Switch to bookings tab so the client immediately sees their new booking
      setActiveTab("bookings");
    } catch (error) {
      console.error("Booking request failed:", error);
      setFormMessage(
        `Could not create the reservation: ${error instanceof Error ? error.message : "Unexpected error"}`
      );
      setFormError(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function joinWaitlist(selection = unavailableSelection) {
    if (!selection) return;

    setJoiningWaitlist(true);
    setWaitlistMessage("");
    setWaitlistErrorMessage("");

    try {
      const result = await onAddToWaitingQueue(selection);
      if (result?.error) {
        setWaitlistErrorMessage(`Could not join the waiting list: ${result.error}`);
      } else if (result?.alreadyWaiting) {
        setWaitlistMessage("You are already on the waiting list for those dates.");
      } else {
        setWaitlistMessage(
          "Your waiting-list request is saved. The hotel has not enabled automatic availability notifications."
        );
        setUnavailableSelection(null);
        await loadClientWaitlist();
      }
    } catch (error) {
      console.error("Waiting-list request failed:", error);
      setWaitlistErrorMessage(
        `Could not join the waiting list: ${error instanceof Error ? error.message : "Unexpected error"}`
      );
    } finally {
      setJoiningWaitlist(false);
    }
  }

  async function cancelBooking(booking) {
    const confirmed = window.confirm(
      `Cancel your ${booking.room} reservation from ${formatDate(booking.date)} to ${formatDate(booking.checkout_date)}?`
    );
    if (!confirmed) return;

    setCancelingBookingId(booking.client_booking_ref);
    setBookingActionMessage("");
    try {
      const result = await onCancelBooking(booking.client_booking_ref);
      if (result?.error) {
        setBookingActionMessage(`Could not cancel this reservation: ${result.error}`);
      } else {
        setBookingActionMessage("Reservation cancelled. The booking record remains available for review.");
      }
    } catch (error) {
      console.error("Booking cancellation failed:", error);
      setBookingActionMessage(
        `Could not cancel this reservation: ${error instanceof Error ? error.message : "Unexpected error"}`
      );
    } finally {
      setCancelingBookingId("");
    }
  }

  function reserveAgain(booking) {
    onReserveAgain(booking.room);
    setFormMessage("");
    setUnavailableSelection(null);
    window.requestAnimationFrame(() => {
      bookingFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  async function refreshBookings() {
    if (bookingRefreshLoading || bookingsLoading) return;
    setBookingActionMessage("");
    setBookingRefreshLoading(true);
    try {
      await onRefreshBookings();
    } finally {
      setBookingRefreshLoading(false);
    }
  }

  return (
    <div className="booking-dashboard">
      <header className="booking-nav">
        <Link className="booking-brand" to="/client">
          <ion-icon name="bed"></ion-icon>
          <span><strong>HOLLOW SPACE HOTEL</strong><small>Your private escape</small></span>
        </Link>
        <nav className="booking-nav-links" aria-label="Client navigation">
          <Link to="/client"><ion-icon name="home"></ion-icon> Home</Link>
          <Link to="/rooms"><ion-icon name="bed"></ion-icon> Rooms</Link>
          <Link className="is-active" to="/booking"><ion-icon name="calendar"></ion-icon> My Bookings</Link>
          {onLogout && (
            <button className="booking-nav-logout" type="button" onClick={onLogout}>
              <ion-icon name="log-out"></ion-icon> Log Out
            </button>
          )}
        </nav>
      </header>

      <main className="booking-content">
        <section className="booking-welcome">
          <div className="booking-welcome-copy">
            <p className="booking-eyebrow">YOUR STAY STARTS HERE</p>
            <h1>{clientLoggedIn ? "My Bookings" : "Make a Reservation"}</h1>
            <p>Choose your room and dates to plan a comfortable stay.</p>
            <span className="booking-promise"><ion-icon name="calendar"></ion-icon> A few details are all it takes</span>
          </div>
        </section>

        {!clientLoggedIn ? (
          <section className="booking-auth-notice">
            <span className="booking-notice-icon"><ion-icon name="lock-closed"></ion-icon></span>
            <div>
              <p className="booking-eyebrow">ONE MORE STEP</p>
              <h2>Sign in to book your stay</h2>
              <p>Your account lets you make and manage reservations.</p>
            </div>
            <button className="booking-button is-gold" type="button" onClick={() => navigate("/client-login")}>
              <ion-icon name="person"></ion-icon> Client Login
            </button>
          </section>
        ) : (
          <>
            <div className="booking-tab-switcher">
              <button
                type="button"
                className={`booking-tab-button ${activeTab === "bookings" ? "is-active" : ""}`}
                onClick={() => setActiveTab("bookings")}
              >
                <ion-icon name="calendar"></ion-icon> My Bookings ({bookings.length})
              </button>
              <button
                type="button"
                className={`booking-tab-button ${activeTab === "new" ? "is-active" : ""}`}
                onClick={() => setActiveTab("new")}
              >
                <ion-icon name="bed"></ion-icon> New Reservation
              </button>
              <button
                type="button"
                className={`booking-tab-button ${activeTab === "all" ? "is-active" : ""}`}
                onClick={() => setActiveTab("all")}
              >
                <ion-icon name="albums"></ion-icon> View All
              </button>
            </div>

            {/* My Bookings View (Shown when 'bookings' or 'all' is active) */}
            {(activeTab === "bookings" || activeTab === "all") && (
              <section className="booking-panel booking-my-bookings" style={{ marginBottom: "24px" }}>
                <div className="booking-panel-heading">
                  <div>
                    <p className="booking-eyebrow">YOUR RESERVATION HISTORY</p>
                    <h2>My Bookings</h2>
                  </div>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    {activeTab === "bookings" && (
                      <button className="booking-button is-gold" type="button" onClick={() => setActiveTab("new")}>
                        <ion-icon name="bed"></ion-icon> Book a Room
                      </button>
                    )}
                    <button className="booking-refresh" type="button" onClick={refreshBookings} disabled={bookingsLoading || bookingRefreshLoading}>
                      {bookingsLoading || bookingRefreshLoading ? "Refreshing…" : "Refresh"}
                    </button>
                  </div>
                </div>
                {bookingsError && <p className="booking-feedback is-error" role="alert">{bookingsError}</p>}
                {bookingActionMessage && <p className="booking-feedback" role="status">{bookingActionMessage}</p>}
                {bookingsLoading ? (
                  <p className="booking-muted" role="status">Loading your bookings…</p>
                ) : bookingsError ? null : bookings.length === 0 ? (
                  <div style={{ padding: "16px 0" }}>
                    <p className="booking-muted">You do not have any bookings yet. Create a reservation to get started.</p>
                    <button
                      className="booking-button is-gold"
                      type="button"
                      style={{ marginTop: "12px" }}
                      onClick={() => setActiveTab("new")}
                    >
                      <ion-icon name="bed"></ion-icon> Make a Reservation Now
                    </button>
                  </div>
                ) : (
                  <div className="booking-card-list">
                    {bookings.map((booking) => {
                      const bookingId = booking.id || booking.client_booking_ref;
                      const status = getReservationStatus(booking, today);
                      const canCancel = !["Cancelled", "Completed", "Waiting"].includes(status);
                      return (
                        <article className="booking-record" key={bookingId}>
                          <div className="booking-record-heading">
                            <div>
                              <p className="booking-eyebrow">RESERVATION</p>
                              <h3>{booking.room}</h3>
                            </div>
                            <span className={`booking-status is-${status.toLowerCase().replace(/[^a-z]+/g, "-").replace(/-$/, "")}`}>
                              {status}
                            </span>
                          </div>
                          <dl className="booking-record-details">
                            <div><dt>Check-in</dt><dd>{formatDate(booking.date)}</dd></div>
                            <div><dt>Check-out</dt><dd>{formatDate(booking.checkout_date)}</dd></div>
                            <div><dt>Price</dt><dd>{formatPrice(booking.price)}</dd></div>
                            <div><dt>Booking date</dt><dd>{formatDate(booking.created_at)}</dd></div>
                            <div><dt>Guest</dt><dd>{booking.name || "Guest"}</dd></div>
                            <div><dt>Saved status</dt><dd>{booking.status || "Booked"}</dd></div>
                          </dl>
                          {status === "Upcoming" && (
                            <p className="booking-record-note">
                              Your reservation is upcoming. Check-in is scheduled for {formatDate(booking.date)}.
                            </p>
                          )}
                          <div className="booking-record-actions">
                            {canCancel && (
                              <button
                                className="booking-button is-danger"
                                type="button"
                                disabled={cancelingBookingId === bookingId}
                                onClick={() => cancelBooking(booking)}
                              >
                                {cancelingBookingId === bookingId ? "Cancelling…" : "Cancel Booking"}
                              </button>
                            )}
                            {["Cancelled", "Completed"].includes(status) && (
                              <button className="booking-button is-outline" type="button" onClick={() => reserveAgain(booking)}>
                                Reserve Again
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* New Reservation Form (Shown when 'new' or 'all' is active) */}
            {(activeTab === "new" || activeTab === "all") && (
              <div className="booking-layout">
                <section className="booking-panel booking-form-panel" ref={bookingFormRef}>
                  <div className="booking-panel-heading">
                    <div>
                      <p className="booking-eyebrow">PLAN YOUR VISIT</p>
                      <h2><ion-icon name="calendar"></ion-icon> New Reservation</h2>
                    </div>
                    <span>All fields required</span>
                  </div>
                  <form onSubmit={submitBooking}>
                    <div className="booking-form-grid">
                      <div className="booking-field booking-field-wide">
                        <label htmlFor="booking-name">Customer Name</label>
                        <input
                          id="booking-name"
                          type="text"
                          value={name}
                          placeholder="Enter your name"
                          onChange={(event) => onNameChange(event.target.value)}
                          autoComplete="name"
                          required
                        />
                      </div>
                      <div className="booking-field booking-field-wide">
                        <label htmlFor="booking-room">Select Room</label>
                        <select id="booking-room" value={room} onChange={(event) => onRoomChange(event.target.value)} required>
                          <option value="">Choose room</option>
                          {rooms.map((roomOption) => (
                            <option key={roomOption.id} value={roomOption.name}>
                              {roomOption.name} - ₱{roomOption.price.toLocaleString()} / night
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="booking-field">
                        <label htmlFor="booking-checkin">Check-in Date</label>
                        <input id="booking-checkin" type="date" min={today} value={date} onChange={(event) => onDateChange(event.target.value)} required />
                      </div>
                      <div className="booking-field">
                        <label htmlFor="booking-checkout">Check-out Date</label>
                        <input id="booking-checkout" type="date" min={date || today} value={checkoutDate} onChange={(event) => onCheckoutDateChange(event.target.value)} required />
                      </div>
                    </div>
                    <button className="booking-button is-gold booking-confirm" type="submit" disabled={submitting}>
                      {submitting ? "Checking availability…" : "Confirm Booking"}
                      <ion-icon name="arrow-forward"></ion-icon>
                    </button>
                  </form>
                  {formMessage && (
                    <p className={`booking-feedback${formError ? " is-error" : " is-success"}`} role={formError ? "alert" : "status"}>
                      {formMessage}
                    </p>
                  )}
                  {unavailableSelection && (
                    <button
                      className="booking-button is-outline"
                      type="button"
                      disabled={joiningWaitlist}
                      onClick={() => joinWaitlist()}
                    >
                      {joiningWaitlist ? "Joining waiting list…" : "Join Waiting List"}
                    </button>
                  )}
                </section>

                <aside className="booking-side-panel">
                  <section className="booking-panel booking-help-panel">
                    <span className="booking-side-icon"><ion-icon name="sparkles"></ion-icon></span>
                    <p className="booking-eyebrow">THE HOLLOW SPACE EXPERIENCE</p>
                    <h2>Your stay, thoughtfully planned.</h2>
                    <p>Room availability is checked before a reservation is saved. Each room type currently represents one reservable unit.</p>
                    <Link className="booking-button is-outline" to="/rooms">
                      Browse available rooms <ion-icon name="arrow-forward"></ion-icon>
                    </Link>
                  </section>
                  <section className="booking-panel booking-queue-panel">
                    <div className="booking-panel-heading">
                      <div>
                        <p className="booking-eyebrow">ROOM REQUESTS</p>
                        <h2>My Waiting List</h2>
                      </div>
                      <button className="booking-refresh" type="button" onClick={loadClientWaitlist} disabled={waitlistLoading}>
                        {waitlistLoading ? "Refreshing…" : "Refresh"}
                      </button>
                    </div>
                    {waitlistErrorMessage && <p className="booking-feedback is-error" role="alert">{waitlistErrorMessage}</p>}
                    {waitlistMessage && <p className="booking-feedback is-success" role="status">{waitlistMessage}</p>}
                    {waitlistLoading ? (
                      <p className="booking-muted">Loading waiting-list requests…</p>
                    ) : waitlistErrorMessage ? null : waitlistEntries.length ? (
                      <ul className="booking-waitlist">
                        {waitlistEntries.map((entry) => (
                          <li key={entry.id}>
                            <strong>{entry.room} · {entry.status}</strong>
                            <span>{formatDate(entry.date)} – {formatDate(entry.checkout_date)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : waitlistLoaded ? (
                      <p className="booking-muted">No waiting-list requests yet. Availability notifications are not automatic.</p>
                    ) : null}
                  </section>
                </aside>
              </div>
            )}
          </>
        )}
        <footer className="booking-footer">
          <span>HOLLOW SPACE HOTEL</span>
          <span><ion-icon name="checkmark-circle"></ion-icon> Secure · Relax · Feel at Home</span>
        </footer>
      </main>
    </div>
  );
}
