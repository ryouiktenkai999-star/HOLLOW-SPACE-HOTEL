// ============================================================================
// [DSA: DATA STRUCTURE - STACK (LIFO: Last-In, First-Out)]
// ============================================================================
// Purpose: Stores cancelled reservations so that the most recently cancelled
// booking is placed at the top and can be retrieved or inspected first.
//
// Operations & Complexity:
// - push(booking): O(1) - Pushes a cancelled booking onto the top of the stack
// - pop():         O(1) - Removes and returns the top booking
// - peek():        O(1) - Views the most recently cancelled booking without removing
// - getItems():    O(N) - Returns a shallow copy snapshot of all stacked items
// ============================================================================
export class CancelledStack {
  constructor() {
    this.items = [];
  }

  // [DSA: Stack Push Operation - O(1)] Adds an item to the top of the stack
  push(booking) {
    this.items.push(booking);
  }

  // [DSA: Stack Pop Operation - O(1)] Removes and returns the top item
  pop() {
    return this.items.pop();
  }

  // [DSA: Stack Peek Operation - O(1)] Inspects the top item without removing it
  peek() {
    return this.items[this.items.length - 1];
  }

  // [DSA: Stack Traversal / Snapshot - O(N)]
  getItems() {
    return [...this.items];
  }
}

export function createClientBooking(supabase, { name, room, date, checkoutDate }) {
  return supabase.rpc("create_client_booking", {
    p_name: name,
    p_room: room,
    p_date: date,
    p_checkout_date: checkoutDate
  });
}
