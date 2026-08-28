<?php

namespace App\Models\Scopes;

use App\Models\Complejo;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class TenantScope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     */
    public function apply(Builder $builder, Model $model): void
    {
        if (app()->bound('currentTenant')) {
            $tenant = app('currentTenant');

            if ($tenant instanceof Complejo && $tenant->id) {
                $builder->where($model->qualifyColumn('complejo_id'), '=', $tenant->id);
            }
        }
    }
}
