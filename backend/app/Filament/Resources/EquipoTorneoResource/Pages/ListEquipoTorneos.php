<?php

namespace App\Filament\Resources\EquipoTorneoResource\Pages;

use App\Filament\Resources\EquipoTorneoResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListEquipoTorneos extends ListRecords
{
    protected static string $resource = EquipoTorneoResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
