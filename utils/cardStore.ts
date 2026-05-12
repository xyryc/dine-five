export interface Card {
  id: string;
  cardholderName: string;
  cardNumber: string;
  expirationDate: string;
  cvv: string;
  isDefault: boolean;
}

class CardStore {
  private cards: Card[] = [
    {
      id: '1',
      cardholderName: 'Daniel Jones',
      cardNumber: '**** **** **** 1234',
      expirationDate: '12/25',
      cvv: '123',
      isDefault: true,
    },
    {
      id: '2', 
      cardholderName: 'Emily Jones',
      cardNumber: '**** **** **** 5678',
      expirationDate: '09/24',
      cvv: '456',
      isDefault: false,
    }
  ];

  getAllCards(): Card[] {
    return [...this.cards];
  }

  addCard(card: Omit<Card, 'id'>): Card {
    const newCard: Card = {
      ...card,
      id: Date.now().toString(),
      cardNumber: this.maskCardNumber(card.cardNumber),
    };

    // If this card is set as default, remove default from others
    if (card.isDefault) {
      this.cards = this.cards.map(c => ({ ...c, isDefault: false }));
    }

    this.cards.push(newCard);
    return newCard;
  }

  removeCard(id: string): void {
    this.cards = this.cards.filter(card => card.id !== id);
  }

  setDefaultCard(id: string): void {
    this.cards = this.cards.map(card => ({
      ...card,
      isDefault: card.id === id
    }));
  }

  getDefaultCard(): Card | undefined {
    return this.cards.find(card => card.isDefault);
  }

  private maskCardNumber(cardNumber: string): string {
    // Mask all but last 4 digits
    const cleaned = cardNumber.replace(/\s/g, '');
    if (cleaned.length < 4) return cardNumber;
    
    const lastFour = cleaned.slice(-4);
    const masked = '**** **** **** ' + lastFour;
    return masked;
  }
}

export const cardStore = new CardStore();
