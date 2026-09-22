<?php

namespace App\Filament\Resources\DeporteResource\Pages;

use App\Filament\Resources\DeporteResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListDeportes extends ListRecords
{
    protected static string $resource = DeporteResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make()->label('+ Nuevo Deporte'),
        ];
    }
}
