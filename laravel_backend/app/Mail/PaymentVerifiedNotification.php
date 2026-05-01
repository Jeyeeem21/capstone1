<?php

namespace App\Mail;

use App\Models\Payment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PaymentVerifiedNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Payment $payment,
        public string $verifiedBy
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Payment Verified - Order #{$this->payment->sale->transaction_id}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.payment-verified',
            with: [
                'payment' => $this->payment,
                'verifiedBy' => $this->verifiedBy,
            ],
        );
    }
}
