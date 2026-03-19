<?php

namespace App\Services;

use App\Mail\DailyUnpaidOrdersReport;
use App\Mail\DeliveryAssigned;
use App\Mail\LoginNotification;
use App\Mail\NewOrderNotification;
use App\Mail\OrderPlacedCustomer;
use App\Mail\OrderStatusUpdate;
use App\Mail\ProcurementNotification;
use App\Mail\VerificationCode;
use App\Mail\WelcomeAccount;
use App\Models\BusinessSetting;
use App\Models\Procurement;
use App\Models\Sale;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class EmailService
{
    /**
     * Configure the SMTP mailer dynamically from database settings.
     * Uses business_email as SMTP username and Gmail defaults.
     */
    private function configureMailer(): void
    {
        $username = BusinessSetting::getValue('business_email', config('mail.mailers.smtp.username'));
        $password = BusinessSetting::getValue('smtp_password', config('mail.mailers.smtp.password'));

        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => 'smtp.gmail.com',
            'mail.mailers.smtp.port' => 587,
            'mail.mailers.smtp.username' => $username,
            'mail.mailers.smtp.password' => $password,
            'mail.mailers.smtp.encryption' => 'tls',
        ]);

        // Purge the cached mailer so Laravel rebuilds it with new config
        Mail::purge('smtp');
    }

    /**
     * Get the business name from settings.
     */
    private function getBusinessName(): string
    {
        return BusinessSetting::getValue('business_name', config('app.name'));
    }

    /**
     * Get the business email (super admin or business setting).
     */
    private function getAdminEmail(): ?string
    {
        // First try business email from settings
        $businessEmail = BusinessSetting::getValue('business_email');
        if ($businessEmail) {
            return $businessEmail;
        }

        // Fallback to super admin email
        $superAdmin = User::where('role', User::ROLE_SUPER_ADMIN)
            ->where('status', 'active')
            ->first();

        return $superAdmin?->email;
    }

    /**
     * Send email safely — never throw, just log on failure.
     * Dynamically configures SMTP + from address/name from database.
     */
    private function sendSafely(string $to, $mailable): void
    {
        try {
            // Check if SMTP credentials are configured
            $password = BusinessSetting::getValue('smtp_password');
            $email = BusinessSetting::getValue('business_email');
            if (!$email || !$password) {
                Log::info("Email skipped (SMTP not configured): {$to}");
                return;
            }

            $this->configureMailer();

            $fromEmail = BusinessSetting::getValue('business_email', config('mail.from.address'));
            $fromName = $this->getBusinessName();
            $mailable->from($fromEmail, $fromName);

            Mail::to($to)->send($mailable);
        } catch (\Exception $e) {
            Log::warning("Email failed to send to {$to}: " . $e->getMessage());
        }
    }

    /**
     * Email admin when a new order is placed.
     */
    public function sendNewOrderToAdmin(Sale $sale): void
    {
        $adminEmail = $this->getAdminEmail();
        if (!$adminEmail) return;

        $sale->load('customer');
        $this->sendSafely($adminEmail, new NewOrderNotification($sale));
    }

    /**
     * Email customer when their order is placed.
     */
    public function sendOrderPlacedToCustomer(Sale $sale): void
    {
        $sale->load('customer');
        $email = $sale->customer?->email;
        if (!$email) return;

        $this->sendSafely($email, new OrderPlacedCustomer($sale));
    }

    /**
     * Email admin about order status change.
     */
    public function sendOrderStatusToAdmin(Sale $sale, string $heading, string $body): void
    {
        $adminEmail = $this->getAdminEmail();
        if (!$adminEmail) return;

        $sale->load('customer');
        $this->sendSafely($adminEmail, new OrderStatusUpdate($sale, $heading, $body));
    }

    /**
     * Email customer about their order status change.
     */
    public function sendOrderStatusToCustomer(Sale $sale, string $heading, string $body): void
    {
        $sale->load('customer');
        $email = $sale->customer?->email;
        if (!$email) return;

        $this->sendSafely($email, new OrderStatusUpdate($sale, $heading, $body));
    }

    /**
     * Send a generic alert email to the admin (no Sale required).
     */
    public function sendAdminAlert(string $subject, string $heading, string $body): void
    {
        $adminEmail = $this->getAdminEmail();
        if (!$adminEmail) return;

        $businessName = $this->getBusinessName();
        $this->configureMailer();

        $mailable = new class($subject, $heading, $body, $businessName) extends \Illuminate\Mail\Mailable {
            use \Illuminate\Bus\Queueable, \Illuminate\Queue\SerializesModels;
            public function __construct(
                public string $subject,
                public string $heading,
                public string $body,
                public string $businessName,
            ) {}
            public function envelope(): \Illuminate\Mail\Mailables\Envelope {
                return new \Illuminate\Mail\Mailables\Envelope(subject: $this->subject);
            }
            public function content(): \Illuminate\Mail\Mailables\Content {
                return new \Illuminate\Mail\Mailables\Content(
                    view: 'emails.admin-alert',
                    with: [
                        'heading' => $this->heading,
                        'body'    => $this->body,
                    ]
                );
            }
        };

        Mail::to($adminEmail)->send($mailable);
    }

    /**
     * Send a generic alert email to a specific address (no Sale required).
     */
    public function sendAlertTo(string $toEmail, string $subject, string $heading, string $body): void
    {
        if (!$toEmail) return;

        $this->configureMailer();

        $mailable = new class($subject, $heading, $body) extends \Illuminate\Mail\Mailable {
            use \Illuminate\Bus\Queueable, \Illuminate\Queue\SerializesModels;
            public function __construct(
                public string $subject,
                public string $heading,
                public string $body,
            ) {}
            public function envelope(): \Illuminate\Mail\Mailables\Envelope {
                return new \Illuminate\Mail\Mailables\Envelope(subject: $this->subject);
            }
            public function content(): \Illuminate\Mail\Mailables\Content {
                return new \Illuminate\Mail\Mailables\Content(
                    view: 'emails.admin-alert',
                    with: [
                        'heading' => $this->heading,
                        'body'    => $this->body,
                    ]
                );
            }
        };

        Mail::to($toEmail)->send($mailable);
    }

    /**
     * Email driver when delivery is assigned.
     */
    public function sendDeliveryAssigned(Sale $sale, User $driverUser): void
    {
        if (!$driverUser->email) return;

        $sale->load('customer');
        $this->sendSafely($driverUser->email, new DeliveryAssigned($sale, $driverUser->name));
    }

    /**
     * Email admin on user login.
     */
    public function sendLoginNotification(User $user, string $ipAddress): void
    {
        $adminEmail = $this->getAdminEmail();
        if (!$adminEmail) return;

        $this->sendSafely($adminEmail, new LoginNotification($user, $ipAddress));
    }

    /**
     * Email the customer themselves when they log in.
     */
    public function sendCustomerLoginNotification(User $user, string $ipAddress): void
    {
        if (!$user->email) return;

        $this->sendSafely($user->email, new class($user, $ipAddress) extends \Illuminate\Mail\Mailable {
            use \Illuminate\Bus\Queueable, \Illuminate\Queue\SerializesModels;
            public function __construct(public User $user, public string $ipAddress) {}
            public function envelope(): \Illuminate\Mail\Mailables\Envelope {
                return new \Illuminate\Mail\Mailables\Envelope(subject: 'Login Alert — ' . config('app.name'));
            }
            public function content(): \Illuminate\Mail\Mailables\Content {
                return new \Illuminate\Mail\Mailables\Content(
                    view: 'emails.customer-login-notification',
                    with: ['user' => $this->user, 'ipAddress' => $this->ipAddress]
                );
            }
        });
    }

    /**
     * Email user when their account is created.
     */
    public function sendWelcomeEmail(User $user): void
    {
        if (!$user->email) return;

        $this->sendSafely($user->email, new WelcomeAccount($user));
    }

    /**
     * Send verification code email.
     */
    public function sendVerificationCode(string $email, string $code): void
    {
        $this->sendSafely($email, new VerificationCode($code));
    }

    /**
     * Email supplier when procurement purchase is made.
     */
    public function sendProcurementToSupplier(Procurement $procurement): void
    {
        $procurement->load(['supplier', 'variety']);
        $supplier = $procurement->supplier;

        if (!$supplier || !$supplier->email) return;

        $this->sendSafely($supplier->email, new ProcurementNotification($procurement, $supplier));
    }

    /**
     * Send daily unpaid orders report to all admins and super admins.
     */
    public function sendDailyUnpaidOrdersReport(): void
    {
        $unpaidOrders = Sale::where('payment_status', 'not_paid')
            ->whereNotIn('status', ['cancelled', 'voided', 'returned'])
            ->with('customer')
            ->orderBy('created_at', 'desc')
            ->get();

        if ($unpaidOrders->isEmpty()) return;

        $totalUnpaid = $unpaidOrders->sum('total');
        $mailable = new DailyUnpaidOrdersReport($unpaidOrders, $totalUnpaid);

        // Send to all active admins and super admins
        $adminUsers = User::whereIn('role', [User::ROLE_SUPER_ADMIN, User::ROLE_ADMIN])
            ->where('status', 'active')
            ->whereNotNull('email')
            ->get();

        foreach ($adminUsers as $admin) {
            $this->sendSafely($admin->email, clone $mailable);
        }
    }
}
