@extends('emails.layout')

@section('title', 'Payment Held for Review')

@section('content')
<h2>Payment Held for Review</h2>
<p>A payment has been placed on hold for further review:</p>

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
    <tr>
        <th>Held By</th>
        <td>{{ $heldBy }}</td>
    </tr>
    <tr>
        <th>Reason</th>
        <td><strong style="color: #f59e0b;">{{ $reason }}</strong></td>
    </tr>
</table>

<p>Please review this payment and take appropriate action (verify or reject).</p>
@endsection
