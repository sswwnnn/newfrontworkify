import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import React from "react";
import CheckoutForm from "./CheckoutForm";

const stripePromise = loadStripe(
  `${import.meta.env.VITE_PAYMENT_PUBLISHABLE_KEY}`
);

function Payment() {
  return (
    <div className="mt-10">
      <Elements stripe={stripePromise}>
        <CheckoutForm />
      </Elements>
    </div>
  );
}

export default Payment;
