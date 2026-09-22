<?php

namespace App\Filament\Resources\SuperficieResource\Pages;

use App\Filament\Resources\SuperficieResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditSuperficie extends EditRecord
{
    protected static string $resource = SuperficieResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
