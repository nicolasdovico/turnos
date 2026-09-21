<?php

namespace App\Filament\Resources\FacturaClubResource\Pages;

use App\Filament\Resources\FacturaClubResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListFacturasClub extends ListRecords
{
    protected static string $resource = FacturaClubResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
