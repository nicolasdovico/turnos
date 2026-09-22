<?php

namespace App\Filament\Resources\DeporteResource\Pages;

use App\Filament\Resources\DeporteResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditDeporte extends EditRecord
{
    protected static string $resource = DeporteResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
