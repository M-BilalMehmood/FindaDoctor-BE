import Stripe from 'stripe';

class PaymentService {
    constructor() {
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    }

    async createPaymentIntent(amount, currency = 'usd') {
        try {
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount,
                currency,
            });
            return paymentIntent;
        } catch (error) {
            console.error('Error creating payment intent: ', error);
            throw error;
        }
    }

    async confirmPayment(paymentIntentId) {
        try {
            const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId);
            return paymentIntent;
        } catch (error) {
            console.error('Error confirming payment: ', error);
            throw error;
        }
    }

    async createRefund(paymentIntentId, amount) {
        try {
            const refund = await this.stripe.refunds.create({
                payment_intent: paymentIntentId,
                amount,
            });
            return refund;
        } catch (error) {
            console.error('Error creating refund: ', error);
            throw error;
        }
    }
}

export default new PaymentService();

