<?php

namespace App\Filament\Resources\EquipoTorneoResource\Pages;

use App\Filament\Resources\EquipoTorneoResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditEquipoTorneo extends EditRecord
{
    protected static string $resource = EquipoTorneoResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
