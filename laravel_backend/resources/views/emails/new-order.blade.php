@extends('emails.layout')

@section('title', 'New Order Notification')

@section('content')
<h2>New Order Received</h2>
<p>A new order has been placed. Here are the details:</p>

<table class="info-table">
    <tr>
        <th>Order #</th>
        <td>{{ $sale->transaction_id }}</td>
    </tr>
    <tr>
        <th>Customer</th>
        <td>{{ $sale->customer?->name ?? 'Walk-in' }}</td>
    </tr>
    <tr>
        <th>Total Amount</th>
        <td><strong>₱{{ number_format($sale->total, 2) }}</strong></td>
    </tr>
    <tr>
        <th>Payment Method</th>
        <td>{{ ucfirst(str_replace('_', ' ', $sale->payment_method ?? 'N/A')) }}</td>
    </tr>
    <tr>
        <th>Payment Status</th>
        <td>
            @if($sale->payment_status === 'paid')
                <span class="badge badge-success">Paid</span>
            @else
                <span class="badge badge-warning">{{ ucfirst(str_replace('_', ' ', $sale->payment_status ?? 'Not Paid')) }}</span>
            @endif
        </td>
    </tr>
    <tr>
        <th>Status</th>
        <td><span class="badge badge-warning">{{ ucfirst($sale->status) }}</span></td>
    </tr>
    <tr>
        <th>Date</th>
        <td>{{ $sale->created_at->format('M d, Y h:i A') }}</td>
    </tr>
</table>

@if($sale->notes)
<p><strong>Notes:</strong> {{ $sale->notes }}</p>
@endif

@php
    // Check if this is a PDO payment
    $pdoPayment = $sale->payments->firstWhere('payment_method', 'pdo');
@endphp

@if($pdoPayment)
<h3 style="margin-top: 20px;">PDO Check Details</h3>
<table class="info-table">
    <tr>
        <th>Check Number</th>
        <td>{{ $pdoPayment->pdo_check_number ?? 'N/A' }}</td>
    </tr>
    <tr>
        <th>Bank</th>
        <td>{{ $pdoPayment->pdo_check_bank ?? 'N/A' }}</td>
    </tr>
    @if($pdoPayment->pdo_check_date)
    <tr>
        <th>Check Date</th>
        <td>{{ \Carbon\Carbon::parse($pdoPayment->pdo_check_date)->format('F d, Y') }}</td>
    </tr>
    @endif
    <tr>
        <th>Amount</th>
        <td><strong>₱{{ number_format($pdoPayment->amount, 2) }}</strong></td>
    </tr>
    <tr>
        <th>Approval Status</th>
        <td>
            @if($pdoPayment->pdo_approval_status === 'approved')
                <span class="badge badge-success">Approved</span>
            @elseif($pdoPayment->pdo_approval_status === 'rejected')
                <span class="badge badge-danger">Rejected</span>
            @else
                <span class="badge badge-warning">Pending Approval</span>
            @endif
        </td>
    </tr>
</table>
@endif

@php
    // Collect all payment proofs from payment records
    $allPaymentProofs = [];
    $pdoCheckImages = [];
    
    foreach($sale->payments as $payment) {
        // Regular payment proofs
        if (!empty($payment->payment_proof) && is_array($payment->payment_proof)) {
            $allPaymentProofs = array_merge($allPaymentProofs, $payment->payment_proof);
        }
        
        // PDO check images
        if ($payment->payment_method === 'pdo' && !empty($payment->pdo_check_image)) {
            if (is_array($payment->pdo_check_image)) {
                $pdoCheckImages = array_merge($pdoCheckImages, $payment->pdo_check_image);
            } elseif (is_string($payment->pdo_check_image)) {
                $pdoCheckImages[] = $payment->pdo_check_image;
            }
        }
    }
    
    // Also check sale's own payment_proof field (for backward compatibility)
    if (!empty($sale->payment_proof) && is_array($sale->payment_proof)) {
        $allPaymentProofs = array_merge($allPaymentProofs, $sale->payment_proof);
    }
@endphp

@if(count($allPaymentProofs) > 0)
<h3 style="margin-top: 20px;">Payment Proof</h3>
<div>
    @foreach($allPaymentProofs as $proof)
        @php $proofPath = storage_path('app/public/' . $proof); @endphp
        @if(file_exists($proofPath))
            <img src="{{ $message->embed($proofPath) }}" alt="Payment Proof" style="max-width: 300px; max-height: 200px; border-radius: 8px; margin: 5px 0; border: 1px solid #ddd;" />
        @endif
    @endforeach
</div>
@endif

@if(count($pdoCheckImages) > 0)
<h3 style="margin-top: 20px;">PDO Check Image(s)</h3>
<div>
    @foreach($pdoCheckImages as $checkImage)
        @php $checkPath = storage_path('app/public/' . $checkImage); @endphp
        @if(file_exists($checkPath))
            <img src="{{ $message->embed($checkPath) }}" alt="PDO Check" style="max-width: 300px; max-height: 200px; border-radius: 8px; margin: 5px 0; border: 1px solid #ddd;" />
        @endif
    @endforeach
</div>
@endif

<p>Please review and process this order.</p>
@endsection
