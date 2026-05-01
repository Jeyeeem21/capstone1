@extends('emails.layout')

@section('title', 'Payment Verified')

@section('content')
<h2>Payment Verified</h2>
<p>A payment has been verified for the following order:</p>

<table class="info-table">
    <tr>
        <th>Payment #</th>
        <td>{{ $payment->id }}</td>
    </tr>
    <tr>
        <th>Order #</th>
        <td>{{ $payment->sale->transaction_id }}</td>
    </tr>
    <tr>
        <th>Customer</th>
        <td>{{ $payment->sale->customer?->name ?? 'Walk-in Customer' }}</td>
    </tr>
    <tr>
        <th>Amount</th>
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
        <th>Verified By</th>
        <td>{{ $verifiedBy }}</td>
    </tr>
    <tr>
        <th>Date Verified</th>
        <td>{{ $payment->verified_at ? $payment->verified_at->format('M d, Y h:i A') : now()->format('M d, Y h:i A') }}</td>
    </tr>
</table>

<p>The payment has been successfully verified and applied to the order.</p>
@endsection
