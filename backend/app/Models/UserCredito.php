<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserCredito extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'user_creditos';

    protected $fillable = [
        'user_id',
        'complejo_id',
        'saldo',
    ];

    protected function casts(): array
    {
        return [
            'saldo' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function complejo(): BelongsTo
    {
        return $this->belongsTo(Complejo::class);
    }
}
