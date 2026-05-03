<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            // Allow delivery_fee to be NULL (NULL = shipping not yet set/pending)
            $table->decimal('delivery_fee', 10, 2)->nullable()->default(null)->change();

            // 'pending' = shipping not yet quoted, 'set' = shipping finalized
            // NULL for pickup orders or when not applicable
            $table->string('shipping_fee_status', 20)->nullable()->after('delivery_fee');

            // Per-sack rate used when OpenRoute is OFF
            $table->decimal('shipping_price_per_sack_override', 10, 2)->nullable()->after('shipping_fee_status');
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn(['shipping_fee_status', 'shipping_price_per_sack_override']);
            // Restore delivery_fee to not-null with default 0
            $table->decimal('delivery_fee', 10, 2)->default(0)->change();
        });
    }
};
