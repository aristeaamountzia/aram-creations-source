import 'dotenv/config';
import { createStripeCheckoutSession } from '../server/stripe-service';

console.log('Testing createStripeCheckoutSession directly with real Stripe API...');

try {
  const session = await createStripeCheckoutSession({
    orderId: "test-order-direct-1234",
    orderNumber: "ARAM-TEST-001",
    items: [
      {
        name: "Σκουλαρίκια από Αληθινά άνθη ορχιδέας",
        price: 31,
        quantity: 1,
        imageUrl: "https://firebasestorage.googleapis.com/v0/b/aramcreations-e1529.firebasestorage.app/o/jewelry%2Fvinted-imports%2F1791886370855-10278806291-1.jpg?alt=media&token=2024f7c0-aa86-4df6-acff-b783b053263f"
      }
    ],
    shippingMethod: "boxnow",
    shippingCost: 2.5,
    customerEmail: "aristeaamnta@gmail.com",
    origin: "https://aramcreationsofficial1.netlify.app"
  });

  console.log('SUCCESS! Session ID:', session.id);
  console.log('URL:', session.url);
} catch (err) {
  console.error('FAILED! Error:', err);
}

