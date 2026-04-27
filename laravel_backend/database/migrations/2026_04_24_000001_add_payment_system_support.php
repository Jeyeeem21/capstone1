<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add payment tracking columns to sales table
        Schema::table('sales', function (Blueprint $table) {
            $table->boolean('is_staggered')->default(false)->after('payment_status');
            $table->string('primary_method', 20)->nullable()->after('is_staggered');
            $table->decimal('amount_paid', 12, 2)->default(0)->after('primary_method');
            $table->decimal('balance_remaining', 12, 2)->default(0)->after('amount_paid');
            
            $table->index('is_staggered');
            $table->index('primary_method');
        });

        // Create payments table
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('sale_id');
            $table->unsignedBigInteger('installment_id')->nullable();
            $table->decimal('amount', 12, 2);
            $table->string('payment_method', 20);
            $table->string('reference_number')->nullable();
            $table->json('payment_proof')->nullable();
            $table->string('status', 20)->default('verified');
            $table->text('hold_reason')->nullable();
            $table->text('cancel_reason')->nullable();
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('received_by')->nullable();
            $table->unsignedBigInteger('verified_by')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamp('paid_at');
            $table->timestamps();

            $table->foreign('sale_id')->references('id')->on('sales')->onDelete('cascade');
            $table->foreign('received_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('verified_by')->references('id')->on('users')->onDelete('set null');
            
            $table->index('sale_id');
            $table->index('status');
            $table->index('payment_method');
            $table->index('paid_at');
        });

        // Create payment_installments table
        Schema::create('payment_installments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('sale_id');
            $table->integer('installment_number');
            $table->decimal('amount_expected', 12, 2);
            $table->decimal('amount_paid', 12, 2)->default(0);
            $table->string('payment_method', 20)->nullable();
            $table->date('due_date')->nullable();
            $table->date('paid_date')->nullable();
            $table->string('status', 20)->default('pending');
            $table->string('pdo_check_number')->nullable();
            $table->string('pdo_check_bank')->nullable();
            $table->json('pdo_check_image')->nullable();
            $table->string('pdo_approval_status', 20)->nullable();
            $table->unsignedBigInteger('pdo_approved_by')->nullable();
            $table->unsignedBigInteger('payment_id')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('sale_id')->references('id')->on('sales')->onDelete('cascade');
            $table->foreign('pdo_approved_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('payment_id')->references('id')->on('payments')->onDelete('set null');
            
            $table->index('sale_id');
            $table->index('status');
            $table->index('due_date');
            $table->index('payment_method');
        });

        // Backfill existing sales data
        DB::table('sales')->update([
            'amount_paid' => DB::raw('CASE WHEN payment_status = "paid" THEN total ELSE 0 END'),
            'balance_remaining' => DB::raw('CASE WHEN payment_status = "paid" THEN 0 ELSE total END'),
            'primary_method' => DB::raw('payment_method'),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_installments');
        Schema::dropIfExists('payments');
        
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn([
                'is_staggered',
                'primary_method',
                'amount_paid',
                'balance_remaining',
            ]);
        });
    }
};
