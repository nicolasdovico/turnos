<?php

namespace App\Filament\Resources\PartidoAbiertoResource\Pages;

use App\Filament\Resources\PartidoAbiertoResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListPartidoAbiertos extends ListRecords
{
    protected static string $resource = PartidoAbiertoResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
