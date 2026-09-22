<?php

namespace App\Filament\Resources\EquipamientoResource\Pages;

use App\Filament\Resources\EquipamientoResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditEquipamiento extends EditRecord
{
    protected static string $resource = EquipamientoResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
