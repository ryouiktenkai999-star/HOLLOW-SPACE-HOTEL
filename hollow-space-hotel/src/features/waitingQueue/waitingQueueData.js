// ============================================================================
// [DSA: DATA STRUCTURE - QUEUE (FIFO: First-In, First-Out)]
// ============================================================================
// Purpose: Manages the guest waiting list in strict chronological order.
// Customers who request a full room first are placed at the front of the line
// (First-Come, First-Served).
//
// Operations & Complexity:
// - enqueue(customer): O(1) - Appends a customer to the back/rear of the queue
// - dequeue():         O(N) - Serves/removes the customer at the front of the queue
// - getItems():        O(1) - Retrieves the list of waiting customers
// ============================================================================
export class WaitingQueue {
  constructor() {
    this.items = [];
  }

  // [DSA: Queue Enqueue Operation - O(1)] Inserts new customer at the back of the line
  enqueue(customer) {
    this.items.push(customer);
  }

  // [DSA: Queue Dequeue Operation - O(N)] Removes and returns first customer in line (FIFO)
  dequeue() {
    return this.items.shift();
  }

  // [DSA: Queue Accessor - O(1)] Returns the ordered queue items
  getItems() {
    return this.items;
  }
}