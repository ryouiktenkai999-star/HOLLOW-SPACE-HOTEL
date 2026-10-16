import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  useLocation,
  Routes,
  useNavigate
} from "react-router-dom";

import { CancelledStack, createClientBooking } from "./features/booking/bookingStructures";
import { WaitingQueue } from "./features/waitingQueue/waitingQueueData";
import { supabase } from "./lib/supabaseClient";
import { getSafeSupabaseQueryMessage, isSupabaseSchemaError, logSupabaseQueryError } from "./lib/supabaseQueryErrors";
import "./AppLayout.css";

// ============================================================================
// [DSA: GLOBAL IN-MEMORY DATA STRUCTURE INSTANCES]
// 1. Stack: LIFO data structure holding cancelled bookings
// 2. Queue: FIFO data structure holding customer waiting list
// ============================================================================
const cancelledStack = new CancelledStack();
const waitingQueue = new WaitingQueue();
const SUPABASE_SETUP_MESSAGE =
  "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY.";

const AdminPage = lazy(() => import("./features/admin/AdminPage"));
const BookingPage = lazy(() => import("./features/booking/BookingPage"));
const ClientPage = lazy(() => import("./features/client/ClientPage"));
const RegisterPage = lazy(() => import("./features/register/RegisterPage"));
const RoomsPage = lazy(() => import("./features/rooms/RoomsPage"));

function HotelApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [bookingsScope, setBookingsScope] = useState("");
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [date, setDate] = useState("");
  const [checkoutDate, setCheckoutDate] = useState("");
  const [bookingsLoading, setBookingsLoading] = useState(Boolean(supabase));
  const [bookingsError, setBookingsError] = useState("");
  const [waiting, setWaiting] = useState([]);
  const [waitingScope, setWaitingScope] = useState("");
  const [waitingError, setWaitingError] = useState("");
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [authSessionError, setAuthSessionError] = useState(() => (
    supabase
      ? ""
      : "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY before using the hotel app."
  ));

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (!supabase) {
      return undefined;
    }

    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setAuthUser(session?.user ?? null);
      setAuthSessionError("");
      setAuthLoading(false);
    });

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Could not check client session:", error);
          setAuthSessionError(`Could not check your sign-in: ${error.message}`);
        } else {
          setAuthUser(data.session?.user ?? null);
        }
        setAuthLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        console.error("Could not check client session:", error);
        setAuthSessionError(
          `Could not check your sign-in: ${error instanceof Error ? error.message : "Unexpected error"}`
        );
        setAuthLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadBookings = useCallback(async (user = authUser) => {
    if (!supabase) {
      setBookingsError(SUPABASE_SETUP_MESSAGE);
      setBookings([]);
      setBookingsScope("");
      setBookingsLoading(false);
      return false;
    }

    if (!user) {
      setBookings([]);
      setBookingsScope("");
      setBookingsError("");
      setBookingsLoading(false);
      return true;
    }

    setBookingsLoading(true);
    const isAdmin = user.app_metadata?.role === "admin";
    const scope = `${isAdmin ? "admin" : "client"}:${user.id}`;
    setBookingsError("");

    // Query valid columns from Supabase bookings table
    const query = supabase
      .from("bookings")
      .select("id, name, room, date, checkout_date, price, status, created_at")
      .order("created_at", { ascending: false });

    try {
      const { data, error } = await query;
      if (error) throw error;

      // Ensure client_booking_ref aliases id for compatibility
      const allRows = (data ?? []).map((b) => ({
        ...b,
        client_booking_ref: b.client_booking_ref || b.id
      }));

      let result = allRows;
      if (!isAdmin && user) {
        // Read local booking IDs associated with this client
        let storedIds = [];
        try {
          storedIds = JSON.parse(localStorage.getItem(`client_bookings_${user.id}`) || "[]");
        } catch {
          storedIds = [];
        }

        const clientFullName = (user.user_metadata?.full_name || "").trim().toLowerCase();
        const clientEmailPrefix = (user.email?.split("@")[0] || "").trim().toLowerCase();

        // Match bookings belonging to this client by stored ID, account full name, or email username
        result = allRows.filter((b) => {
          if (storedIds.includes(b.id) || storedIds.includes(b.client_booking_ref)) return true;
          const bookingName = (b.name || "").trim().toLowerCase();
          if (clientFullName && (bookingName === clientFullName || clientFullName.includes(bookingName))) return true;
          if (clientEmailPrefix && (bookingName === clientEmailPrefix || clientEmailPrefix.includes(bookingName) || bookingName.includes(clientEmailPrefix))) return true;
          return false;
        });
      }

      setBookings(result);
      setBookingsScope(scope);
      setBookingsError("");
      return true;
    } catch (error) {
      logSupabaseQueryError("Could not load bookings:", error);
      if (isSupabaseSchemaError(error)) {
        setBookings([]);
        setBookingsScope("");
        setBookingsError("");
        return false;
      }
      setBookingsError(getSafeSupabaseQueryMessage(error, "bookings"));
      return false;
    } finally {
      setBookingsLoading(false);
    }
  }, [authUser]);

  const loadWaitingList = useCallback(async (user = authUser) => {
    if (!supabase || user?.app_metadata?.role !== "admin") {
      setWaiting([]);
      setWaitingScope("");
      setWaitingError("");
      return true;
    }

    try {
      const { data, error } = await supabase
        .from("booking_waitlist")
        .select("id, user_id, name, room, date, checkout_date, status, created_at")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setWaiting(data ?? []);
      setWaitingScope(`admin:${user.id}`);
      setWaitingError("");
      return true;
    } catch (error) {
      logSupabaseQueryError("Could not load the admin waiting list:", error);
      if (isSupabaseSchemaError(error)) {
        setWaiting([]);
        setWaitingScope("");
        setWaitingError("");
        return false;
      }
      setWaitingError(getSafeSupabaseQueryMessage(error, "waiting-list requests"));
      return false;
    }
  }, [authUser]);

  useEffect(() => {
    if (authLoading) return;

    const timer = window.setTimeout(() => {
      loadBookings(authUser);
      loadWaitingList(authUser);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, authUser, loadBookings, loadWaitingList]);

  async function bookRoom() {
    if (!supabase) return { error: SUPABASE_SETUP_MESSAGE };
    if (!clientUser) return { error: "Sign in with a client account before booking." };
    if (!name.trim() || !room || !date || !checkoutDate) {
      return { error: "Please complete every booking field." };
    }

    if (checkoutDate <= date) {
      return { error: "Check-out date must be after check-in date." };
    }

    const { data, error } = await createClientBooking(supabase, {
      name: name.trim(),
      room,
      date,
      checkoutDate
    });

    if (error) {
      console.error("Could not create booking:", error);
      return {
        error: error.message,
        unavailable: error.message.toLowerCase().includes("room is unavailable")
      };
    }

    // Persist new booking ID in localStorage for this client
    const newId = typeof data === "object" ? data?.id : data;
    if (newId && clientUser?.id) {
      try {
        const key = `client_bookings_${clientUser.id}`;
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        if (!existing.includes(newId)) {
          existing.push(newId);
          localStorage.setItem(key, JSON.stringify(existing));
        }
      } catch (err) {
        console.error("Could not persist client booking ID:", err);
      }
    }

    await loadBookings(clientUser);
    setName("");
    setRoom("");
    setDate("");
    setCheckoutDate("");
    return { success: true, bookingReference: newId };
  }

  async function cancelBooking(clientBookingId, adminAction = false) {
    if (!supabase) return { error: SUPABASE_SETUP_MESSAGE };

    // [DSA: Algorithm - Linear Search O(N)]
    // Finds the specific booking by unique reference ID
    const booking = bookings.find(
      (item) => item.client_booking_ref === clientBookingId || item.id === clientBookingId
    );

    // Attempt cancellation via RPC
    let updateSuccess = false;
    try {
      const { data, error } = await supabase.rpc(
        adminAction ? "admin_cancel_booking" : "cancel_client_booking",
        { p_client_booking_ref: clientBookingId }
      );
      if (!error && data) updateSuccess = true;
    } catch {
      // Fallback below
    }

    // Direct status update fallback
    if (!updateSuccess) {
      try {
        await supabase
          .from("bookings")
          .update({ status: "Cancelled" })
          .eq("id", clientBookingId);
      } catch (err) {
        console.error("Could not update booking status directly:", err);
      }
    }

    // [DSA: Data Structure - Stack Push O(1)]
    // Places the cancelled booking onto the CancelledStack (LIFO order)
    if (booking) cancelledStack.push({ ...booking, status: "Cancelled" });

    // Update in-memory state immediately so UI changes responsively
    setBookings((prev) =>
      prev.map((b) =>
        (b.id === clientBookingId || b.client_booking_ref === clientBookingId)
          ? { ...b, status: "Cancelled" }
          : b
      )
    );

    await loadBookings(authUser);
    return { success: true };
  }

  async function addToQueue(entry) {
    if (!supabase) return { error: SUPABASE_SETUP_MESSAGE };
    if (!clientUser) return { error: "Sign in with a client account to join the waiting list." };

    const waitlistEntry = {
      user_id: clientUser.id,
      name: entry.name.trim(),
      room: entry.room,
      date: entry.date,
      checkout_date: entry.checkoutDate,
      status: "Waiting"
    };
    const { data, error } = await supabase
      .from("booking_waitlist")
      .insert(waitlistEntry)
      .select()
      .single();

    if (error?.code === "23505") {
      return { alreadyWaiting: true };
    }

    if (error) {
      console.error("Could not join the waiting list:", error);
      return { error: error.message };
    }

    // [DSA: Data Structure - Queue Enqueue O(1)]
    // Appends the new waitlist customer to the WaitingQueue (FIFO order)
    waitingQueue.enqueue(data);
    await loadWaitingList();
    return { success: true };
  }

  function selectRoom(roomName) {
    setRoom(roomName);
    navigate("/booking");
  }

  async function handleLogout() {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Sign-out failed:", error);
    }
    setBookings([]);
    setBookingsScope("");
    setWaiting([]);
    setWaitingScope("");
    navigate("/client-login");
  }

  const clientUser = authUser?.app_metadata?.role === "admin" ? null : authUser;
  const clientLoggedIn = Boolean(clientUser);
  const bookingScope = authUser
    ? `${authUser.app_metadata?.role === "admin" ? "admin" : "client"}:${authUser.id}`
    : "";
  const visibleBookings = bookingsScope === bookingScope ? bookings : [];
  const visibleWaiting = waitingScope === `admin:${authUser?.id}` ? waiting : [];
  // [DSA: Algorithm - Array Filtering / Partitioning O(N)]
  // Filters visible bookings to isolate cancelled reservations
  const cancelled = visibleBookings.filter((booking) =>
    ["cancelled", "canceled"].includes((booking.status || "").toLowerCase())
  );
  return (
    <div className="app-shell">
      <main className="main-content">
        <Suspense fallback={<div className="client-main-loading" role="status">Loading page…</div>}>
          <Routes>
            <Route path="/" element={<Navigate to="/client-login" replace />} />
            <Route
              path="/client"
              element={
                authLoading ? (
                  <div className="client-main-loading" role="status">Checking your account…</div>
                ) : clientLoggedIn ? (
                  <Navigate to="/rooms" replace />
                ) : (
                  <Navigate to="/client-login" replace />
                )
              }
            />
            <Route
              path="/client-login"
              element={
                authLoading ? (
                  <div className="client-main-loading" role="status">Checking your account…</div>
                ) : clientLoggedIn ? (
                  <Navigate to="/rooms" replace />
                ) : (
                  <ClientPage
                    authLoading={authLoading}
                    sessionError={authSessionError}
                  />
                )
              }
            />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/admin"
              element={
                <AdminPage
                  bookings={visibleBookings}
                  cancelled={cancelled}
                  waiting={visibleWaiting}
                  waitingError={waitingError}
                  onCancelBooking={(bookingId) => cancelBooking(bookingId, true)}
                />
              }
            />
            <Route
              path="/rooms"
              element={
                <RoomsPage
                  onSelectRoom={selectRoom}
                  clientLoggedIn={clientLoggedIn}
                  onLogout={handleLogout}
                />
              }
            />
            <Route
              path="/booking"
              element={
                <BookingPage
                  key={clientUser?.id ?? "signed-out"}
                  clientLoggedIn={clientLoggedIn}
                  clientUser={clientUser}
                  name={name}
                  onNameChange={setName}
                  room={room}
                  onRoomChange={setRoom}
                  date={date}
                  onDateChange={setDate}
                  checkoutDate={checkoutDate}
                  onCheckoutDateChange={setCheckoutDate}
                  onBook={bookRoom}
                  onAddToWaitingQueue={addToQueue}
                  bookings={visibleBookings}
                  bookingsLoading={bookingsLoading}
                  bookingsError={bookingsError}
                  onRefreshBookings={() => loadBookings(clientUser)}
                  onCancelBooking={(bookingId) => cancelBooking(bookingId)}
                  onReserveAgain={(roomName) => {
                    setRoom(roomName);
                    setDate("");
                    setCheckoutDate("");
                  }}
                  onLogout={handleLogout}
                />
              }
            />
            <Route path="*" element={<Navigate to="/rooms" replace />} />
          </Routes>
        </Suspense>
      </main>

    </div>
  );
}

export default function AppCoordinator() {
  return (
    <BrowserRouter>
      <HotelApp />
    </BrowserRouter>
  );
}