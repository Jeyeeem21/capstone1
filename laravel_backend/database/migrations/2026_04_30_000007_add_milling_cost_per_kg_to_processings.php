<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('processings', function (Blueprint $table) {
            $table->decimal('milling_cost_per_kg', 10, 2)->nullable()->default(null)->after('output_kg');
        });
    }

    public function down(): void
    {
        Schema::table('processings', function (Blueprint $table) {
            $table->dropColumn('milling_cost_per_kg');
        });
    }
};
