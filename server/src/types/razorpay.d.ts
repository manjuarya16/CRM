declare module 'razorpay' {
  class Razorpay {
    constructor(options: { key_id: string; key_secret: string });

    orders: {
      create(options: any): Promise<any>;
      fetch(orderId: string): Promise<any>;
      fetchPayments(orderId: string): Promise<any>;
    };

    payments: {
      fetch(paymentId: string): Promise<any>;
      capture(paymentId: string, amount: string | number, currency: string): Promise<any>;
      refund(paymentId: string, options?: any): Promise<any>;
    };

    subscriptions: {
      create(options: any): Promise<any>;
      fetch(subscriptionId: string): Promise<any>;
      cancel(subscriptionId: string, options?: any): Promise<any>;
    };

    plans: {
      create(options: any): Promise<any>;
      fetch(planId: string): Promise<any>;
    };

    paymentLink: {
      create(options: any): Promise<any>;
      fetch(linkId: string): Promise<any>;
      cancel(linkId: string): Promise<any>;
    };

    webhooks: {
      edit(options: any): Promise<any>;
    };
  }

  export = Razorpay;
}
