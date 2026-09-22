<?php

namespace App\Filament\Resources\EquipamientoResource\Pages;

use App\Filament\Resources\EquipamientoResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListEquipamientos extends ListRecords
{
    protected static string $resource = EquipamientoResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make()->label('+ Nuevo Equipamiento'),
        ];
    }
}
