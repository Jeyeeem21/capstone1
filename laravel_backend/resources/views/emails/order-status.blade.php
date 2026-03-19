@extends('emails.layout')

@section('title', 'Order Status Update')

@section('content')
<h2>Order Status Updated</h2>
<p>{{ $heading }}</p>

<table class="info-table">
    <tr>
        <th>Order #</th>
        <td>{{ $sale->transaction_id }}</td>
    </tr>
    <tr>
        <th>New Status</th>
        <td>
            <span class="badge {{ $statusBadge }}">{{ ucfirst(str_replace('_', ' ', $sale->status)) }}</span>
        </td>
    </tr>
    <tr>
        <th>Total Amount</th>
        <td>₱{{ number_format($sale->total, 2) }}</td>
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
    @if($sale->driver_name)
    <tr>
        <th>Driver</th>
        <td>{{ $sale->driver_name }}</td>
    </tr>
    @endif
    <tr>
        <th>Updated At</th>
        <td>{{ $sale->updated_at->format('M d, Y h:i A') }}</td>
    </tr>
</table>

<p>{{ $body }}</p>
@endsection
