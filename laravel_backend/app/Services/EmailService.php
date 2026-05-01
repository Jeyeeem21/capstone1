<?php

namespace App\Services;

use App\Mail\AdminAlert;
use App\Mail\CustomerLoginNotification;
use App\Mail\DailyUnpaidOrdersReport;
use App\Mail\DeliveryAssigned;
use App\Mail\DeliveryAssignmentNotification;
use App\Mail\InstallmentDueAdminAlert;
use App\Mail\InstallmentDueReminder;
use App\Mail\LoginNotification;
use App\Mail\NewOrderNotification;
use App\Mail\OrderPlacedCustomer;
use App\Mail\OrderStatusUpdate;
use App\Mail\ProcurementAdminNotification;
use App\Mail\ProcurementNotification;
use App\Mail\VerificationCode;
use App\Mail\WelcomeAccount;
use App\Jobs\SendEmail;
use App\Models\BusinessSetting;
use App\Models\DeliveryAssignment;
use App\Models\PaymentInstallment;
use App\Models\Procurement;
use App\Models\Sale;
use App\Models\User;
use Carbon\Carbon;
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
        // Save to DB queue + spawn background worker — zero blocking
        SendEmail::dispatchAndProcess($to, $mailable);
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

        $mailable = (new AdminAlert($heading, $body, $this->getBusinessName()))->subject($subject);

        SendEmail::dispatchAndProcess($adminEmail, $mailable);
    }

    /**
     * Send a generic alert email to a specific address (no Sale required).
     */
    public function sendAlertTo(string $toEmail, string $subject, string $heading, string $body): void
    {
        if (!$toEmail) return;

        $mailable = (new AdminAlert($heading, $body))->subject($subject);

        SendEmail::dispatchAndProcess($toEmail, $mailable);
    }

    /**
     * Email driver when delivery is assigned.
     */
    public function sendDeliveryAssigned(Sale $sale, User $driverUser): void
    {
        if (!$driverUser->email) return;

        $sale->load(['customer', 'items.product.variety']);
        $this->sendSafely($driverUser->email, new DeliveryAssigned($sale, $driverUser->name));
    }

    /**
     * Email driver when a standalone delivery assignment is created.
     */
    public function sendDeliveryAssignmentNotification(User $driverUser, DeliveryAssignment $delivery): void
    {
        if (!$driverUser->email) return;

        $delivery->load(['customer', 'items']);
        $this->sendSafely($driverUser->email, new DeliveryAssignmentNotification($delivery, $driverUser->name));
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

        $businessName = $this->getBusinessName();

        $this->sendSafely($user->email, new CustomerLoginNotification($user, $ipAddress, $businessName));
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
    public function sendVerificationCode(string $email, string $code, ?string $name = null): void
    {
        $this->sendSafely($email, new VerificationCode($code, $name));
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
     * Email the business owner / super admin when a procurement purchase is created.
     */
    public function sendProcurementToAdmin(Procurement $procurement): void
    {
        $adminEmail = $this->getAdminEmail();
        if (!$adminEmail) return;

        $procurement->load(['supplier', 'variety']);
        $this->sendSafely($adminEmail, new ProcurementAdminNotification($procurement));
    }

    /**
     * Send daily unpaid orders report to the business owner / super admin.
     */
    public function sendDailyUnpaidOrdersReport(): void
    {
        $unpaidOrders = Sale::where('payment_status', 'not_paid')
            ->whereNotIn('status', ['cancelled', 'voided', 'returned'])
            ->with('customer')
            ->orderBy('created_at', 'desc')
            ->get();

        if ($unpaidOrders->isEmpty()) return;

        $adminEmail = $this->getAdminEmail();
        if (!$adminEmail) return;

        $totalUnpaid = $unpaidOrders->sum('total');
        $this->sendSafely($adminEmail, new DailyUnpaidOrdersReport($unpaidOrders, $totalUnpaid));
    }

    /**
     * Send installment due reminders.
     * - Admin gets one consolidated digest email.
     * - Each customer gets an individual email per installment.
     * Skips installments that are already fully paid or cancelled.
     */
    public function sendInstallmentReminders(): void
    {
        $today = Carbon::today();
        $threeDaysLater = Carbon::today()->addDays(3);

        // Load all pending/partial installments with sale + customer
        $installments = PaymentInstallment::whereIn('status', ['pending', 'partial'])
            ->whereNotNull('due_date')
            ->with(['sale.customer'])
            ->get();

        $overdue  = $installments->filter(fn($i) => Carbon::parse($i->due_date)->lt($today));
        $dueToday = $installments->filter(fn($i) => Carbon::parse($i->due_date)->isSameDay($today));
        $upcoming = $installments->filter(fn($i) => Carbon::parse($i->due_date)->isSameDay($threeDaysLater));

        // ---- Admin digest ----
        if ($overdue->count() + $dueToday->count() + $upcoming->count() > 0) {
            $adminEmail = $this->getAdminEmail();
            if ($adminEmail) {
                $this->sendSafely($adminEmail, new InstallmentDueAdminAlert($dueToday, $overdue, $upcoming));
            }
        }

        // ---- Per-customer reminders ----
        $toNotify = collect()
            ->merge($overdue->map(fn($i) => ['installment' => $i, 'type' => 'overdue']))
            ->merge($dueToday->map(fn($i) => ['installment' => $i, 'type' => 'due_today']))
            ->merge($upcoming->map(fn($i) => ['installment' => $i, 'type' => 'reminder']));

        foreach ($toNotify as $item) {
            $installment = $item['installment'];
            $customerEmail = $installment->sale?->customer?->email;
            if ($customerEmail) {
                $this->sendSafely($customerEmail, new InstallmentDueReminder($installment, $item['type']));
            }
        }
    }

    /**
     * Send email change verification code to new email address.
     */
    public function sendEmailChangeVerification(string $newEmail, string $code, string $userName): void
    {
        $this->sendSafely($newEmail, new \App\Mail\EmailChangeVerification($code, $newEmail, $userName));
    }

    /**
     * Send email change notification to old email address.
     */
    public function sendEmailChangeNotification(string $oldEmail, string $newEmail, string $userName, string $ipAddress): void
    {
        $this->sendSafely($oldEmail, new \App\Mail\EmailChangeNotification($oldEmail, $newEmail, $userName, $ipAddress));
    }

    /**
     * Send profile update notification.
     */
    public function sendProfileUpdateNotification(User $user, array $changes, string $ipAddress): void
    {
        if (!$user->email) return;

        $this->sendSafely($user->email, new \App\Mail\ProfileUpdateNotification($user->name, $changes, $ipAddress));
    }

    /**
     * Send security update notification (password change, etc.).
     */
    public function sendSecurityUpdateNotification(User $user, string $updateType, string $ipAddress): void
    {
        if (!$user->email) return;

        $this->sendSafely($user->email, new \App\Mail\SecurityUpdateNotification($user->name, $updateType, $ipAddress));
    }

    /**
     * Send password reset code email.
     */
    public function sendPasswordResetCode(string $email, string $code, string $name): void
    {
        $this->sendSafely($email, new \App\Mail\PasswordResetCode($code, $name));
    }

    /**
     * Send contact form email to business owner.
     */
    public function sendContactEmail(string $toEmail, \App\Models\ContactMessage $contactMessage): void
    {
        $this->sendSafely($toEmail, new \App\Mail\ContactMessageMail($contactMessage));
    }

    /**
     * ========================================================================
     * PAYMENT NOTIFICATION METHODS
     * ========================================================================
     */

    /**
     * Notify super admin when a payment is verified.
     */
    public function notifyPaymentVerified(\App\Models\Payment $payment, string $verifiedBy): void
    {
        $adminEmail = $this->getAdminEmail();
        if (!$adminEmail) return;

        $payment->load(['sale.customer']);
        $this->sendSafely($adminEmail, new \App\Mail\PaymentVerifiedNotification($payment, $verifiedBy));
    }

    /**
     * Notify super admin and customer when a payment is rejected.
     */
    public function notifyPaymentRejected(\App\Models\Payment $payment, string $reason, string $rejectedBy): void
    {
        $payment->load(['sale.customer']);

        // Notify super admin
        $adminEmail = $this->getAdminEmail();
        if ($adminEmail) {
            $this->sendSafely($adminEmail, new \App\Mail\PaymentRejectedNotification($payment, $reason, $rejectedBy, false));
        }

        // Notify customer
        $customerEmail = $payment->sale?->customer?->email;
        if ($customerEmail) {
            $this->sendSafely($customerEmail, new \App\Mail\PaymentRejectedNotification($payment, $reason, $rejectedBy, true));
        }
    }

    /**
     * Notify super admin when a PDO check is approved.
     */
    public function notifyPDOApproved(\App\Models\Payment $payment, string $approvedBy): void
    {
        $adminEmail = $this->getAdminEmail();
        if (!$adminEmail) return;

        $payment->load(['sale.customer']);
        $this->sendSafely($adminEmail, new \App\Mail\PDOApprovedNotification($payment, $approvedBy));
    }

    /**
     * Notify super admin when a payment is held for review.
     */
    public function notifyPaymentHeld(\App\Models\Payment $payment, string $reason, string $heldBy): void
    {
        $adminEmail = $this->getAdminEmail();
        if (!$adminEmail) return;

        $payment->load(['sale.customer']);
        $this->sendSafely($adminEmail, new \App\Mail\PaymentHeldNotification($payment, $reason, $heldBy));
    }
}
