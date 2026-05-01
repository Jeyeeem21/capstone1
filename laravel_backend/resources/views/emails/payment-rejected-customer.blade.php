@extends('emails.layout')

@section('title', 'Payment Rejected')

@section('content')
<h2>Payment Rejected</h2>
<p>Hello {{ $payment->sale->customer?->name ?? 'Valued Customer' }},</p>
<p>We regret to inform you that your payment for Order #{{ $payment->sale->transaction_id }} has been rejected.</p>

<table class="info-table">
    <tr>
        <th>Order #</th>
        <td>{{ $payment->sale->transaction_id }}</td>
    </tr>
    <tr>
        <th>Payment Amount</th>
        <td><strong>₱{{ number_format($payment->amount, 2) }}</strong></td>
    </tr>
    <tr>
        <th>Payment Method</th>
        <td>{{ strtoupper($payment->payment_method) }}</td>
    </tr>
    @if($payment->reference_number)
    <tr>
        <th>Reference Number</th>
        <td>{{ $payment->reference_number }}</td>
    </tr>
    @endif
    @if($payment->pdo_check_number)
    <tr>
        <th>Check Number</th>
        <td>{{ $payment->pdo_check_number }}</td>
    </tr>
    @endif
    <tr>
        <th>Reason for Rejection</th>
        <td><strong style="color: #dc3545;">{{ $reason }}</strong></td>
    </tr>
</table>

<p>Please contact us if you have any questions or would like to submit a new payment.</p>
<p>Thank you for your understanding.</p>
@endsection
