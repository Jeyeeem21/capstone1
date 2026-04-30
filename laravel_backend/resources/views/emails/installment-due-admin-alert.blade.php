@extends('emails.layout')

@section('title', 'Installment Due Alert')

@section('content')
<h2>📋 Installment Payment Alert</h2>
<p>Here is a summary of installment payments that need your attention as of <strong>{{ now()->format('F d, Y') }}</strong>:</p>

@if($overdue->count() > 0)
<div style="margin: 20px 0;">
    <h3 style="color: #dc2626; margin: 0 0 12px;">⚠️ Overdue ({{ $overdue->count() }})</h3>
    <table class="info-table">
        <thead>
            <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Installment</th>
                <th>Amount Due</th>
                <th>Due Date</th>
                <th>Days Overdue</th>
            </tr>
        </thead>
        <tbody>
            @foreach($overdue as $inst)
            <tr>
                <td>{{ $inst->sale?->transaction_id ?? 'N/A' }}</td>
                <td>{{ $inst->sale?->customer?->name ?? 'Walk-in' }}</td>
                <td>#{{ $inst->installment_number }}</td>
                <td><strong style="color: #dc2626;">₱{{ number_format($inst->amount_expected - ($inst->amount_paid ?? 0), 2) }}</strong></td>
                <td>{{ \Carbon\Carbon::parse($inst->due_date)->format('M d, Y') }}</td>
                <td style="color: #dc2626; font-weight: 700;">{{ \Carbon\Carbon::parse($inst->due_date)->diffInDays(now()) }}d</td>
            </tr>
            @endforeach
        </tbody>
    </table>
</div>
@endif

@if($dueToday->count() > 0)
<div style="margin: 20px 0;">
    <h3 style="color: #d97706; margin: 0 0 12px;">📅 Due Today ({{ $dueToday->count() }})</h3>
    <table class="info-table">
        <thead>
            <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Installment</th>
                <th>Amount Due</th>
            </tr>
        </thead>
        <tbody>
            @foreach($dueToday as $inst)
            <tr>
                <td>{{ $inst->sale?->transaction_id ?? 'N/A' }}</td>
                <td>{{ $inst->sale?->customer?->name ?? 'Walk-in' }}</td>
                <td>#{{ $inst->installment_number }}</td>
                <td><strong>₱{{ number_format($inst->amount_expected - ($inst->amount_paid ?? 0), 2) }}</strong></td>
            </tr>
            @endforeach
        </tbody>
    </table>
</div>
@endif

@if($upcoming->count() > 0)
<div style="margin: 20px 0;">
    <h3 style="color: #2563eb; margin: 0 0 12px;">🔔 Upcoming in 3 Days ({{ $upcoming->count() }})</h3>
    <table class="info-table">
        <thead>
            <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Installment</th>
                <th>Amount Due</th>
                <th>Due Date</th>
            </tr>
        </thead>
        <tbody>
            @foreach($upcoming as $inst)
            <tr>
                <td>{{ $inst->sale?->transaction_id ?? 'N/A' }}</td>
                <td>{{ $inst->sale?->customer?->name ?? 'Walk-in' }}</td>
                <td>#{{ $inst->installment_number }}</td>
                <td>₱{{ number_format($inst->amount_expected - ($inst->amount_paid ?? 0), 2) }}</td>
                <td>{{ \Carbon\Carbon::parse($inst->due_date)->format('M d, Y') }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
</div>
@endif

<p style="margin-top: 16px;">Please follow up with the relevant customers to ensure timely payment collection.</p>
@endsection
