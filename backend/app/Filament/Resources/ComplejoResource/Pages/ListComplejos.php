<?php

namespace App\Filament\Resources\ComplejoResource\Pages;

use App\Filament\Resources\ComplejoResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListComplejos extends ListRecords
{
    protected static string $resource = ComplejoResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
