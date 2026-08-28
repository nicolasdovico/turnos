<?php

namespace App\Traits;

use App\Models\Complejo;
use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToTenant
{
    /**
     * Boot the trait to apply TenantScope and auto-assign complejo_id on model creation.
     */
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope(new TenantScope);

        static::creating(function ($model) {
            if (empty($model->complejo_id) && app()->bound('currentTenant')) {
                $tenant = app('currentTenant');
                if ($tenant instanceof Complejo && $tenant->id) {
                    $model->complejo_id = $tenant->id;
                }
            }
        });
    }

    /**
     * Relationship to the owning tenant (Complejo).
     */
    public function complejo(): BelongsTo
    {
        return $this->belongsTo(Complejo::class, 'complejo_id');
    }
}
