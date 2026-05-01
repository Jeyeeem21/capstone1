<?php

namespace App\Mail;

use App\Models\Payment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PDOApprovedNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Payment $payment,
        public string $approvedBy
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "PDO Check Approved - Order #{$this->payment->sale->transaction_id}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.pdo-approved',
            with: [
                'payment' => $this->payment,
                'approvedBy' => $this->approvedBy,
            ],
        );
    }
}
