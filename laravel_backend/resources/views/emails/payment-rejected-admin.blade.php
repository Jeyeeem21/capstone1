@extends('emails.layout')

@section('title', 'Payment Rejected')

@section('content')
<h2>Payment Rejected</h2>
<p>A payment has been rejected:</p>

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
        <th>Rejected By</th>
        <td>{{ $rejectedBy }}</td>
    </tr>
    <tr>
        <th>Reason</th>
        <td><strong style="color: #dc3545;">{{ $reason }}</strong></td>
    </tr>
</table>

<p>The customer has been notified about the rejection.</p>
@endsection
