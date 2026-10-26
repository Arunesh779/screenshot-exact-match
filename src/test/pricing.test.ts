import { describe, it, expect } from "vitest";
import { calcTotals, clampQty } from "@/lib/pricing";

describe("pricing", () => {
  it("charges 9.99 shipping under $100", () => {
    expect(calcTotals([{ price: 40, quantity: 2 }])).toEqual({ subtotal: 80, shipping: 9.99, discount: 0, total: 89.99 });
  });
  it("ships free at $100 or more", () => {
    expect(calcTotals([{ price: 100, quantity: 1 }]).shipping).toBe(0);
  });
  it("gives 10% off at $200 or more", () => {
    expect(calcTotals([{ price: 250, quantity: 1 }])).toEqual({ subtotal: 250, shipping: 0, discount: 25, total: 225 });
  });
  it("empty cart totals zero", () => {
    expect(calcTotals([]).total).toBe(0);
  });
  it("never exceeds stock", () => {
    expect(clampQty(10, 3)).toBe(3);
    expect(clampQty(0, 3)).toBe(1);
    expect(clampQty(2, 0)).toBe(0);
  });
});
