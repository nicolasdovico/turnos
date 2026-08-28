<?php

namespace App\Filament\Resources\PartidoAbiertoResource\Pages;

use App\Filament\Resources\PartidoAbiertoResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditPartidoAbierto extends EditRecord
{
    protected static string $resource = PartidoAbiertoResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
