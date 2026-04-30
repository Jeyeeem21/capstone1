<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('procurements', function (Blueprint $table) {
            $table->unsignedInteger('hauling_sacks')->nullable()->default(null)
                ->after('hauling_price_per_sack')
                ->comment('Sacks used for hauling cost calculation. Null = defaults to sacks column.');
        });
    }

    public function down(): void
    {
        Schema::table('procurements', function (Blueprint $table) {
            $table->dropColumn('hauling_sacks');
        });
    }
};
