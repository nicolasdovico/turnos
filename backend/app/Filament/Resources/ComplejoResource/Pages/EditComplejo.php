<?php

namespace App\Filament\Resources\ComplejoResource\Pages;

use App\Filament\Resources\ComplejoResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditComplejo extends EditRecord
{
    protected static string $resource = ComplejoResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
