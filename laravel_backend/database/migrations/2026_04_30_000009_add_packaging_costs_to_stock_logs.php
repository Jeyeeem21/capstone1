<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_logs', function (Blueprint $table) {
            $table->decimal('sack_cost', 10, 2)->nullable()->after('milling_cost');
            $table->decimal('packaging_twines_cost', 10, 2)->nullable()->after('sack_cost');
        });
    }

    public function down(): void
    {
        Schema::table('stock_logs', function (Blueprint $table) {
            $table->dropColumn(['sack_cost', 'packaging_twines_cost']);
        });
    }
};
