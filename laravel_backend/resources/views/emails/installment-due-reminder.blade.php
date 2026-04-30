@extends('emails.layout')

@section('title', 'Installment Payment Reminder')

@section('content')
@php
    $sale = $installment->sale;
    $customer = $sale?->customer;
    $dueDate = $installment->due_date ? \Carbon\Carbon::parse($installment->due_date) : null;
    $isOverdue = $type === 'overdue';
    $isDueToday = $type === 'due_today';
    $accentColor = $isOverdue ? '#dc2626' : ($isDueToday ? '#d97706' : '#2563eb');
    $bgColor = $isOverdue ? '#fef2f2' : ($isDueToday ? '#fffbeb' : '#eff6ff');
    $borderColor = $isOverdue ? '#fecaca' : ($isDueToday ? '#fde68a' : '#bfdbfe');
    $label = $isOverdue ? 'OVERDUE' : ($isDueToday ? 'DUE TODAY' : 'DUE IN 3 DAYS');
@endphp

<h2>
    @if($isOverdue) ⚠️ Payment Overdue
    @elseif($isDueToday) 📅 Payment Due Today
    @else 🔔 Payment Reminder
    @endif
</h2>

<p>Dear <strong>{{ $customer?->name ?? 'Valued Customer' }}</strong>,</p>

<p>
    @if($isOverdue)
        Your installment payment for Order <strong>{{ $sale?->transaction_id }}</strong> is <strong style="color: {{ $accentColor }};">overdue</strong>. Please settle your balance as soon as possible to avoid further issues.
    @elseif($isDueToday)
        Your installment payment for Order <strong>{{ $sale?->transaction_id }}</strong> is <strong style="color: {{ $accentColor }};">due today</strong>. Please make your payment at your earliest convenience.
    @else
        This is a friendly reminder that your installment payment for Order <strong>{{ $sale?->transaction_id }}</strong> is due in <strong>3 days</strong>.
    @endif
</p>

<div style="margin: 20px 0; padding: 16px 20px; background-color: {{ $bgColor }}; border: 1px solid {{ $borderColor }}; border-radius: 8px;">
    <span style="display: inline-block; padding: 3px 10px; background-color: {{ $accentColor }}; color: #fff; border-radius: 4px; font-size: 11px; font-weight: 700; letter-spacing: 1px; margin-bottom: 12px;">{{ $label }}</span>

    <table class="info-table">
        <tr>
            <th>Order #</th>
            <td>{{ $sale?->transaction_id ?? 'N/A' }}</td>
        </tr>
        <tr>
            <th>Installment</th>
            <td>#{{ $installment->installment_number }}</td>
        </tr>
        <tr>
            <th>Amount Due</th>
            <td><strong style="color: {{ $accentColor }};">₱{{ number_format($installment->amount_expected - ($installment->amount_paid ?? 0), 2) }}</strong></td>
        </tr>
        @if($installment->amount_paid > 0)
        <tr>
            <th>Already Paid</th>
            <td>₱{{ number_format($installment->amount_paid, 2) }}</td>
        </tr>
        @endif
        <tr>
            <th>Due Date</th>
            <td>{{ $dueDate?->format('F d, Y') ?? 'N/A' }}</td>
        </tr>
        @if($isOverdue && $dueDate)
        <tr>
            <th>Days Overdue</th>
            <td><strong style="color: #dc2626;">{{ $dueDate->diffInDays(now()) }} day(s)</strong></td>
        </tr>
        @endif
    </table>
</div>

<p>To make a payment, please log in to your account or contact us directly.</p>

@if($isOverdue)
<p style="color: #dc2626; font-weight: 600;">⚠️ Continued non-payment may result in account restrictions. Please settle your balance immediately.</p>
@endif

<p style="margin-top: 16px; color: #6b7280; font-size: 13px;">If you have already made this payment, please disregard this notice or contact us with your payment proof.</p>
@endsection
