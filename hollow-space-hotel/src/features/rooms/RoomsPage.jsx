import { useState } from "react";
import { Link } from "react-router-dom";
import { rooms } from "./roomData";
import "./RoomsPage.css";

const roomDetails = {
  "Single Room": {
    description: "A comfortable, thoughtfully furnished room for a relaxing stay.",
    image: "/single-room-bedroom.png",
    gallery: [
      { src: "/single-room-detail-bedroom.png", alt: "Single room bedroom" },
      { src: "/single-room-bathroom.png", alt: "Single room bathroom" }
    ]
  },
  "Double Room": {
    description: "Extra room to unwind, with a calm and welcoming atmosphere.",
    image: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1000&q=85",
    gallery: [
      { src: "/double-room-bedroom.png", alt: "Double room bedroom" },
      { src: "/double-room-bedroom-tv.png", alt: "Double room bedroom with entertainment area" },
      { src: "/double-room-view.png", alt: "View from the double room" },
      { src: "/double-room-bathroom.png", alt: "Double room bathroom" }
    ]
  },
  "Deluxe Room": {
    description: "A spacious retreat with elevated comfort and refined details.",
    image: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1000&q=85",
    gallery: [
      { src: "/deluxe-room-bedroom.png", alt: "Deluxe room bedroom" },
      { src: "/deluxe-room-bedroom-lounge.png", alt: "Deluxe room bedroom and lounge" },
      { src: "/deluxe-room-city-view.png", alt: "City view from the deluxe room" },
      { src: "/deluxe-room-bathroom.png", alt: "Deluxe room bathroom" }
    ]
  }
};

export default function RoomsPage({ onSelectRoom, onLogout }) {
  const [selectedRoom, setSelectedRoom] = useState(null);

  return (
    <div className="rooms-page">
      <header className="rooms-nav">
        <Link className="rooms-brand" to="/client">
          <ion-icon name="bed" aria-hidden="true"></ion-icon>
          <span><strong>HOLLOW SPACE HOTEL</strong><small>Your private escape</small></span>
        </Link>
        <nav className="rooms-nav-links" aria-label="Client navigation">
          <Link to="/client"><ion-icon name="home" aria-hidden="true"></ion-icon> Home</Link>
          <Link className="is-active" to="/rooms"><ion-icon name="bed" aria-hidden="true"></ion-icon> Rooms</Link>
          <Link to="/booking"><ion-icon name="calendar" aria-hidden="true"></ion-icon> My Bookings</Link>
          {onLogout && (
            <button className="rooms-nav-logout" type="button" onClick={onLogout}>
              <ion-icon name="log-out" aria-hidden="true"></ion-icon> Log Out
            </button>
          )}
        </nav>
      </header>

      <main className="rooms-content">
        <section className="rooms-hero">
          <div>
            <p className="rooms-eyebrow">FIND YOUR PLACE TO UNWIND</p>
            <h1>Rooms &amp; Suites</h1>
            <p>Thoughtful spaces, warm hospitality, and a stay made for you.</p>
            <span><ion-icon name="bed" aria-hidden="true"></ion-icon> {rooms.length} room types · Starting at ₱{Math.min(...rooms.map((room) => room.price)).toLocaleString()} per night</span>
          </div>
        </section>

        <section className="rooms-section" aria-labelledby="rooms-heading">
          <div className="rooms-section-heading">
            <div>
              <p className="rooms-eyebrow">A ROOM FOR EVERY KIND OF GETAWAY</p>
              <h2 id="rooms-heading">Choose Your Room</h2>
            </div>
            <span>Select a room to continue to booking</span>
          </div>
          <div className="rooms-card-grid">
            {rooms.map((room) => {
              const details = roomDetails[room.name] ?? {
                description: "A welcoming space designed for a comfortable hotel stay.",
                image: roomDetails["Single Room"].image
              };

              return (
                <article className="rooms-card" key={room.id}>
                  <div
                    className="rooms-card-image"
                    role="img"
                    aria-label={`${room.name} interior`}
                    style={{ backgroundImage: `url("${details.image}")` }}
                  >
                    <span><ion-icon name="checkmark-circle" aria-hidden="true"></ion-icon> Available to book</span>
                  </div>
                  <div className="rooms-card-body">
                    <div className="rooms-card-title">
                      <h3>{room.name}</h3>
                      <strong>₱{room.price.toLocaleString()} <small>/ night</small></strong>
                    </div>
                    <p>{details.description}</p>
                    <div className="rooms-card-meta">
                      <span><ion-icon name="moon" aria-hidden="true"></ion-icon> Per night</span>
                      <span><ion-icon name="calendar" aria-hidden="true"></ion-icon> Flexible dates</span>
                    </div>
                    <div className="rooms-card-actions">
                      <button
                        className="rooms-secondary-button"
                        type="button"
                        aria-expanded={selectedRoom?.id === room.id}
                        onClick={() => setSelectedRoom((current) => current?.id === room.id ? null : room)}
                      >
                        View Details
                      </button>
                      <button className="rooms-select-button" type="button" onClick={() => onSelectRoom(room.name)}>
                        Select Room <ion-icon name="arrow-forward" aria-hidden="true"></ion-icon>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {selectedRoom && (
            <aside
              className={`rooms-detail-panel${roomDetails[selectedRoom.name]?.gallery ? " is-gallery" : ""}`}
              aria-live="polite"
              aria-labelledby="room-details-heading"
            >
              <button
                className="rooms-detail-close"
                type="button"
                onClick={() => setSelectedRoom(null)}
                aria-label="Close room details"
              >
                <ion-icon name="close" aria-hidden="true"></ion-icon>
              </button>
              {roomDetails[selectedRoom.name]?.gallery ? (
                <div className="rooms-detail-gallery">
                  {roomDetails[selectedRoom.name].gallery.map((image) => (
                    <figure key={image.src}>
                      <img src={image.src} alt={image.alt} />
                      <figcaption>{image.alt}</figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <div
                  className="rooms-detail-image"
                  role="img"
                  aria-label={`${selectedRoom.name} interior`}
                  style={{ backgroundImage: `url("${selectedRoom.image}")` }}
                />
              )}
              <div className="rooms-detail-content">
                <p className="rooms-eyebrow">ROOM DETAILS</p>
                <h3 id="room-details-heading">{selectedRoom.name}</h3>
                <strong className="rooms-detail-price">
                  ₱{selectedRoom.price.toLocaleString()} <small>/ night</small>
                </strong>
                <p>{selectedRoom.description}</p>
                <ul className="rooms-detail-list">
                  {selectedRoom.features.map((feature) => (
                    <li key={feature}>
                      <ion-icon name="sparkles" aria-hidden="true"></ion-icon> {feature}
                    </li>
                  ))}
                </ul>
                <div className="rooms-detail-actions">
                  <button
                    className="rooms-select-button"
                    type="button"
                    onClick={() => onSelectRoom(selectedRoom.name)}
                  >
                    Select This Room <ion-icon name="arrow-forward" aria-hidden="true"></ion-icon>
                  </button>
                </div>
              </div>
            </aside>
          )}
        </section>

        <section className="rooms-booking-banner">
          <span className="rooms-booking-banner-icon"><ion-icon name="calendar" aria-hidden="true"></ion-icon></span>
          <div>
            <p className="rooms-eyebrow">READY WHEN YOU ARE</p>
            <strong>Plan your stay at Hollow Space.</strong>
            <p>Select a room to continue to booking and choose your dates.</p>
          </div>
          <Link className="rooms-button is-outline" to="/booking">
            Go to booking <ion-icon name="arrow-forward" aria-hidden="true"></ion-icon>
          </Link>
        </section>
      </main>

      <footer className="rooms-footer">
        <Link to="/client">HOLLOW SPACE HOTEL</Link>
        <span><ion-icon name="checkmark-circle" aria-hidden="true"></ion-icon> Secure · Relax · Feel at Home</span>
      </footer>
    </div>
  );
}
