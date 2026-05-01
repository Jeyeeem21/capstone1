@extends('emails.layout')

@section('title', 'PDO Check Approved')

@section('content')
<h2>PDO Check Approved</h2>
<p>A PDO (Post-Dated Check) payment has been approved and is now awaiting payment clearance:</p>

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
        <th>Check Number</th>
        <td>{{ $payment->pdo_check_number }}</td>
    </tr>
    @if($payment->pdo_check_bank)
    <tr>
        <th>Bank</th>
        <td>{{ $payment->pdo_check_bank }}</td>
    </tr>
    @endif
    @if($payment->pdo_check_date)
    <tr>
        <th>Check Date</th>
        <td>{{ \Carbon\Carbon::parse($payment->pdo_check_date)->format('M d, Y') }}</td>
    </tr>
    @endif
    <tr>
        <th>Approved By</th>
        <td>{{ $approvedBy }}</td>
    </tr>
    <tr>
        <th>Status</th>
        <td><span class="badge badge-warning">Awaiting Payment Clearance</span></td>
    </tr>
</table>

<p>The check has been verified as legitimate. Please monitor when the check clears and mark it as paid in the PDO Management system.</p>
@endsection
