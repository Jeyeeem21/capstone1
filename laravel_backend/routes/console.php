<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Services\EmailService;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Send daily unpaid orders report to admins at 8:00 AM
Schedule::call(function () {
    app(EmailService::class)->sendDailyUnpaidOrdersReport();
})->daily()->at('08:00')->name('daily-unpaid-orders-report');

// Send installment due reminders daily at 8:30 AM
// - Admin gets a digest of overdue / due-today / due-in-3-days
// - Each customer gets an individual email
Schedule::call(function () {
    app(EmailService::class)->sendInstallmentReminders();
})->daily()->at('08:30')->name('installment-due-reminders');
