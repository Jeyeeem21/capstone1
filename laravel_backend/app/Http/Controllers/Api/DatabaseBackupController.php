<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Traits\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DatabaseBackupController extends Controller
{
    use AuditLogger;

    /**
     * Export database as SQL file
     */
    public function export(Request $request)
    {
        $database = config('database.connections.mysql.database');
        $tables = $this->getTables();
        
        $filename = 'KjpRicemill_backup_' . date('Y-m-d_His') . '.sql';

        $this->logAudit('EXPORT', 'Database', "Exported database backup: {$filename}", [
            'filename' => $filename,
            'tables_count' => count($tables),
        ]);

        return new StreamedResponse(function () use ($tables, $database) {
            $handle = fopen('php://output', 'w');
            
            // Write header
            fwrite($handle, "-- Database Backup\n");
            fwrite($handle, "-- Database: {$database}\n");
            fwrite($handle, "-- Generated: " . date('Y-m-d H:i:s') . "\n");
            fwrite($handle, "-- PHP Version: " . phpversion() . "\n");
            fwrite($handle, "-- --------------------------------------------------------\n\n");
            fwrite($handle, "SET FOREIGN_KEY_CHECKS=0;\n");
            fwrite($handle, "SET SQL_MODE = \"NO_AUTO_VALUE_ON_ZERO\";\n");
            fwrite($handle, "SET time_zone = \"+00:00\";\n\n");
            
            foreach ($tables as $table) {
                // Get create table statement
                $createTable = DB::select("SHOW CREATE TABLE `{$table}`");
                if (!empty($createTable)) {
                    $createStatement = $createTable[0]->{'Create Table'};
                    
                    fwrite($handle, "-- --------------------------------------------------------\n");
                    fwrite($handle, "-- Table structure for table `{$table}`\n");
                    fwrite($handle, "-- --------------------------------------------------------\n\n");
                    fwrite($handle, "DROP TABLE IF EXISTS `{$table}`;\n");
                    fwrite($handle, $createStatement . ";\n\n");
                    
                    // Get table data
                    $rows = DB::table($table)->get();
                    
                    if ($rows->count() > 0) {
                        fwrite($handle, "-- --------------------------------------------------------\n");
                        fwrite($handle, "-- Dumping data for table `{$table}`\n");
                        fwrite($handle, "-- --------------------------------------------------------\n\n");
                        
                        foreach ($rows as $row) {
                            $rowArray = (array) $row;
                            $columns = array_keys($rowArray);
                            $values = array_map(function ($value) {
                                if (is_null($value)) {
                                    return 'NULL';
                                }
                                return "'" . addslashes($value) . "'";
                            }, array_values($rowArray));
                            
                            $columnsList = '`' . implode('`, `', $columns) . '`';
                            $valuesList = implode(', ', $values);
                            
                            fwrite($handle, "INSERT INTO `{$table}` ({$columnsList}) VALUES ({$valuesList});\n");
                        }
                        fwrite($handle, "\n");
                    }
                }
            }
            
            fwrite($handle, "SET FOREIGN_KEY_CHECKS=1;\n");
            fwrite($handle, "\n-- End of backup\n");
            
            fclose($handle);
        }, 200, [
            'Content-Type' => 'application/sql',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }
    
    /**
     * Get list of tables in the database
     */
    private function getTables(): array
    {
        $tables = DB::select('SHOW TABLES');
        
        if (empty($tables)) {
            return [];
        }
        
        // Get the first key dynamically since it varies based on database name
        $firstTable = (array) $tables[0];
        $tableKey = array_keys($firstTable)[0];
        
        return array_map(function ($table) use ($tableKey) {
            return $table->$tableKey;
        }, $tables);
    }
    
    /**
     * Get database info
     */
    public function info()
    {
        $database = config('database.connections.mysql.database');
        $tables = $this->getTables();
        
        $tableInfo = [];
        $totalSize = 0;
        $totalRows = 0;
        
        foreach ($tables as $table) {
            $count = DB::table($table)->count();
            $totalRows += $count;
            
            // Get table size
            $sizeQuery = DB::select("
                SELECT 
                    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
                FROM information_schema.tables 
                WHERE table_schema = ? AND table_name = ?
            ", [$database, $table]);
            
            $sizeMb = $sizeQuery[0]->size_mb ?? 0;
            $totalSize += $sizeMb;
            
            $tableInfo[] = [
                'name' => $table,
                'rows' => $count,
                'size' => $sizeMb . ' MB',
            ];
        }
        
        return response()->json([
            'database' => $database,
            'tables_count' => count($tables),
            'total_rows' => $totalRows,
            'total_size' => round($totalSize, 2) . ' MB',
            'tables' => $tableInfo,
        ]);
    }
}
