@extends('emails.layout')

@section('title', 'Delivery Assignment')

@section('content')
<h2>New Delivery Assigned</h2>
<p>Hello {{ $driverName }},</p>
<p>You have been assigned a new delivery. Here are the details:</p>

<table class="info-table">
    <tr>
        <th>Order #</th>
        <td>{{ $sale->transaction_id }}</td>
    </tr>
    <tr>
        <th>Customer</th>
        <td>{{ $sale->customer?->name ?? 'N/A' }}</td>
    </tr>
    @if($sale->delivery_address)
    <tr>
        <th>Delivery Address</th>
        <td>{{ $sale->delivery_address }}</td>
    </tr>
    @endif
    <tr>
        <th>Total Amount</th>
        <td>₱{{ number_format($sale->total, 2) }}</td>
    </tr>
    <tr>
        <th>Payment Method</th>
        <td>{{ ucfirst(str_replace('_', ' ', $sale->payment_method ?? 'N/A')) }}</td>
    </tr>
    <tr>
        <th>Assigned At</th>
        <td>{{ now()->format('M d, Y h:i A') }}</td>
    </tr>
</table>

<p>Please make sure to deliver the order promptly.</p>
@endsection
