<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ValidPhoneNumber implements ValidationRule
{
    /**
     * Run the validation rule.
     *
     * @param  \Closure(string, ?string=): \Illuminate\Translation\PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null || trim((string) $value) === '') {
            return;
        }

        $str = trim((string) $value);

        if (!preg_match('/^[+0-9\s\-()]+$/', $str)) {
            $fail('El número de WhatsApp o teléfono solo puede contener números, espacios, guiones, paréntesis y el prefijo "+".');
            return;
        }

        $digits = preg_replace('/\D+/', '', $str);
        if (strlen($digits) < 8 || strlen($digits) > 15) {
            $fail('El número de WhatsApp o teléfono debe tener entre 8 y 15 dígitos numéricos.');
        }
    }
}
