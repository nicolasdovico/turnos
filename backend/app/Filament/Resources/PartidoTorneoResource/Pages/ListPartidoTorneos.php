<?php

namespace App\Filament\Resources\PartidoTorneoResource\Pages;

use App\Filament\Resources\PartidoTorneoResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListPartidoTorneos extends ListRecords
{
    protected static string $resource = PartidoTorneoResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
