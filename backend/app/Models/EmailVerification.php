<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmailVerification extends Model
{
    protected $table = 'email_verifications';

    protected $fillable = [
        'email',
        'codigo',
        'tipo',
        'expires_at',
        'intentos',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'intentos' => 'integer',
        ];
    }

    public function isExpired(): bool
    {
        return now()->greaterThan($this->expires_at);
    }
}
