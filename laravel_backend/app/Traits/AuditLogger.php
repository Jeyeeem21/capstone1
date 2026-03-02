<?php

namespace App\Traits;

use App\Models\AuditTrail;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

trait AuditLogger
{
    /**
     * Log an audit trail entry.
     *
     * @param string      $action      CREATE, UPDATE, DELETE, LOGIN, LOGOUT, RETURN, etc.
     * @param string      $module      Module name (Procurement, Drying, Products, etc.)
     * @param string      $description Human-readable description
     * @param array|null  $details     Extra context (old/new values, etc.)
     */
    protected function logAudit(string $action, string $module, string $description, ?array $details = null): AuditTrail
    {
        return AuditTrail::create([
            'user_id'    => Auth::id(),
            'action'     => strtoupper($action),
            'module'     => $module,
            'description'=> $description,
            'details'    => $details,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
        ]);
    }
}
