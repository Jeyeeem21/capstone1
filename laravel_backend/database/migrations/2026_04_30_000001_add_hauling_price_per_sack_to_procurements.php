<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('procurements', function (Blueprint $table) {
            $table->decimal('hauling_price_per_sack', 12, 2)->nullable()->default(null)
                ->after('price_per_kg')
                ->comment('Optional hauling cost per sack. Hauling cost = sacks × hauling_price_per_sack, added to total_cost.');
        });
    }

    public function down(): void
    {
        Schema::table('procurements', function (Blueprint $table) {
            $table->dropColumn('hauling_price_per_sack');
        });
    }
};
