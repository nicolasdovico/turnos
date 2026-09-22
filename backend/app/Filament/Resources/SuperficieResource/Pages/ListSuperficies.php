<?php

namespace App\Filament\Resources\SuperficieResource\Pages;

use App\Filament\Resources\SuperficieResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListSuperficies extends ListRecords
{
    protected static string $resource = SuperficieResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make()->label('+ Nueva Superficie'),
        ];
    }
}
