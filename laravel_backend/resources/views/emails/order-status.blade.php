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
    @if($sale->payment_method)
    <tr>
        <th>Payment Method</th>
        <td>{{ strtoupper($sale->payment_method) }}</td>
    </tr>
    @endif
    @if($sale->reference_number)
    <tr>
        <th>Reference Number</th>
        <td>{{ $sale->reference_number }}</td>
    </tr>
    @endif
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

@if(!empty($sale->payment_proof) && is_array($sale->payment_proof))
<h3 style="margin-top: 20px;">Payment Proof</h3>
<div>
    @foreach($sale->payment_proof as $proof)
        <img src="{{ url('storage/' . $proof) }}" alt="Payment Proof" style="max-width: 300px; max-height: 200px; border-radius: 8px; margin: 5px 0; border: 1px solid #ddd;" />
    @endforeach
</div>
@endif
@endsection
