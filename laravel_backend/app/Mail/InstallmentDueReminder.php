<?php

namespace App\Mail;

use App\Models\PaymentInstallment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class InstallmentDueReminder extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public PaymentInstallment $installment,
        public string $type = 'reminder' // 'reminder' (3 days before) or 'due_today' or 'overdue'
    ) {}

    public function envelope(): Envelope
    {
        $subject = match ($this->type) {
            'overdue'   => '⚠️ Overdue Payment — Installment #' . $this->installment->installment_number,
            'due_today' => '📅 Payment Due Today — Installment #' . $this->installment->installment_number,
            default     => '🔔 Payment Reminder — Installment #' . $this->installment->installment_number . ' Due Soon',
        };

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.installment-due-reminder',
            with: [
                'installment' => $this->installment,
                'type'        => $this->type,
            ],
        );
    }
}
