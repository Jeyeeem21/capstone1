<?php

namespace App\Mail;

use App\Models\Payment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PaymentHeldNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Payment $payment,
        public string $reason,
        public string $heldBy
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Payment Held for Review - Order #{$this->payment->sale->transaction_id}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.payment-held',
            with: [
                'payment' => $this->payment,
                'reason' => $this->reason,
                'heldBy' => $this->heldBy,
            ],
        );
    }
}
