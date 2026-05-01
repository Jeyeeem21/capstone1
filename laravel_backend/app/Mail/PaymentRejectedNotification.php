<?php

namespace App\Mail;

use App\Models\Payment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PaymentRejectedNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Payment $payment,
        public string $reason,
        public string $rejectedBy,
        public bool $isForCustomer = false
    ) {
    }

    public function envelope(): Envelope
    {
        $subject = $this->isForCustomer
            ? "Payment Rejected - Order #{$this->payment->sale->transaction_id}"
            : "Payment Rejected Alert - Order #{$this->payment->sale->transaction_id}";

        return new Envelope(
            subject: $subject,
        );
    }

    public function content(): Content
    {
        $view = $this->isForCustomer 
            ? 'emails.payment-rejected-customer'
            : 'emails.payment-rejected-admin';

        return new Content(
            view: $view,
            with: [
                'payment' => $this->payment,
                'reason' => $this->reason,
                'rejectedBy' => $this->rejectedBy,
            ],
        );
    }
}
