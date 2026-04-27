<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('pdo_check_number')->nullable()->after('notes');
            $table->string('pdo_check_bank')->nullable()->after('pdo_check_number');
            $table->json('pdo_check_image')->nullable()->after('pdo_check_bank');
            $table->string('pdo_approval_status', 20)->nullable()->after('pdo_check_image');
            $table->unsignedBigInteger('pdo_approved_by')->nullable()->after('pdo_approval_status');
            
            $table->foreign('pdo_approved_by')->references('id')->on('users')->onDelete('set null');
            $table->index('pdo_approval_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['pdo_approved_by']);
            $table->dropColumn([
                'pdo_check_number',
                'pdo_check_bank',
                'pdo_check_image',
                'pdo_approval_status',
                'pdo_approved_by',
            ]);
        });
    }
};
