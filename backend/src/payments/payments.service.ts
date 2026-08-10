import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { ClassesService } from '../classes/classes.service';

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;

  constructor(
    private readonly config: ConfigService,
    private readonly classesService: ClassesService,
  ) {
    this.stripe = new Stripe(this.config.get<string>('STRIPE_SECRET_KEY') ?? '');
  }

  async createCheckoutSession(classId: string, email: string, origin: string): Promise<{ url: string }> {
    const trainingClass = await this.classesService.getEntity(classId);
    if (!trainingClass.isPaid) throw new BadRequestException('This class is not a paid class.');
    if (!trainingClass.priceCents) {
      throw new BadRequestException('This class has no price set — contact the school to purchase access.');
    }

    const normalizedEmail = email.toLowerCase();

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      // Omitting payment_method_types lets Stripe Checkout automatically
      // offer whatever's enabled in the dashboard (Settings > Payment
      // methods) — starts with just card, and PayPal appears on its own
      // once activated there, with no code change needed.
      customer_email: normalizedEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: trainingClass.title },
            unit_amount: trainingClass.priceCents,
          },
          quantity: 1,
        },
      ],
      metadata: { classId, email: normalizedEmail },
      success_url: `${origin}/classes/${classId}?payment=success`,
      cancel_url: `${origin}/classes/${classId}?payment=cancelled`,
    });

    if (!session.url) throw new BadRequestException('Could not start checkout.');
    return { url: session.url };
  }

  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
    return this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    if (event.type !== 'checkout.session.completed') return;

    const session = event.data.object as Stripe.Checkout.Session;
    const classId = session.metadata?.classId;
    const email = session.metadata?.email;
    if (classId && email) await this.classesService.grantAccess(classId, email);
  }
}
