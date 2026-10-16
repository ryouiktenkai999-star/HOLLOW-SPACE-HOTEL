// ============================================================================
// [DSA: QUEUE CONSUMER COMPONENT (FIFO Presentation)]
// Purpose: Displays the WaitingQueue items in strict chronological sequence (1, 2, 3...)
// demonstrating first-come, first-served customer scheduling.
// ============================================================================
export default function WaitingQueuePanel({ items = [], onAddCustomer }) {
  return (
    <div className={onAddCustomer ? "waiting-queue-actions" : "admin-box"}>
      <h2>
        <ion-icon name="calendar"></ion-icon> Waiting Queue
      </h2>

      {onAddCustomer ? (
        <button onClick={onAddCustomer} type="button">
          Add Customer to Queue
        </button>
      ) : items.length === 0 ? (
        <p>No customers waiting.</p>
      ) : (
        // [DSA: Sequential Queue Traversal - O(N)]
        // Renders each customer according to their priority position in the queue
        items.map((item, index) => (
          <article className="waiting-queue-record" key={item.id ?? `${item.name}-${index}`}>
            <strong>{index + 1}. {typeof item === "string" ? item : item.name}</strong>
            {typeof item !== "string" && (
              <>
                <span>{item.room} · {item.status}</span>
                <small>{item.date} – {item.checkout_date}</small>
              </>
            )}
          </article>
        ))
      )}
    </div>
  );
}