export interface CartLine {
  sku: string;
  unitPrice: number;
  quantity: number;
}

export class Cart {
  private readonly lines: CartLine[] = [];

  addItem(line: CartLine): void {
    if (!Number.isInteger(line.unitPrice) || line.unitPrice < 0) throw new Error("unitPrice must be a non-negative integer");
    if (!Number.isInteger(line.quantity) || line.quantity < 1) throw new Error("quantity must be a positive integer");
    this.lines.push({ ...line });
  }

  subtotal(): number {
    return this.lines.reduce((total, line) => total + line.unitPrice * line.quantity, 0);
  }

  total(): number {
    return this.subtotal();
  }
}
