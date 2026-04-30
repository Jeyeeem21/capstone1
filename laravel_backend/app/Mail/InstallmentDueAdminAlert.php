<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;

class InstallmentDueAdminAlert extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Collection $dueToday,
        public Collection $overdue,
        public Collection $upcoming // due in 3 days
    ) {}

    public function envelope(): Envelope
    {
        $total = $this->dueToday->count() + $this->overdue->count();
        return new Envelope(
            subject: "📋 Installment Alert: {$total} Payment(s) Need Attention — " . now()->format('M d, Y'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.installment-due-admin-alert',
            with: [
                'dueToday' => $this->dueToday,
                'overdue'  => $this->overdue,
                'upcoming' => $this->upcoming,
            ],
        );
    }
}
