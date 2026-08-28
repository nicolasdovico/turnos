<?php

namespace App\Filament\Resources\TurnoPagoDivididoResource\Pages;

use App\Filament\Resources\TurnoPagoDivididoResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditTurnoPagoDividido extends EditRecord
{
    protected static string $resource = TurnoPagoDivididoResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
