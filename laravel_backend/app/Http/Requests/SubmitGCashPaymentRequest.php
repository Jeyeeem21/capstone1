<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SubmitGCashPaymentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization handled by controller middleware
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'amount' => 'required|numeric|min:0',
            'reference_number' => 'required|string|max:255',
            'payment_proof' => 'required|string',
        ];
    }

    /**
     * Get custom validation messages
     */
    public function messages(): array
    {
        return [
            'amount.required' => 'Payment amount is required',
            'amount.numeric' => 'Payment amount must be a number',
            'amount.min' => 'Payment amount must be greater than 0',
            'reference_number.required' => 'GCash reference number is required',
            'reference_number.max' => 'Reference number must not exceed 255 characters',
            'payment_proof.required' => 'Payment proof image is required',
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            // Validate base64 image format
            if ($this->payment_proof && !$this->isValidBase64Image($this->payment_proof)) {
                $validator->errors()->add('payment_proof', 
                    'Invalid image format. Please upload a valid JPEG, PNG, or WebP image under 5MB.'
                );
            }
        });
    }

    /**
     * Validate base64 image format and size
     */
    private function isValidBase64Image($base64): bool
    {
        // Check if it matches base64 image pattern
        if (!preg_match('/^data:image\/(jpeg|jpg|png|webp);base64,/', $base64)) {
            return false;
        }
        
        // Extract and decode image data
        $imageData = substr($base64, strpos($base64, ',') + 1);
        $decoded = base64_decode($imageData, true);
        
        if ($decoded === false) {
            return false;
        }
        
        // Check file size (5MB max)
        if (strlen($decoded) > 5 * 1024 * 1024) {
            return false;
        }
        
        // Verify it's actually an image using finfo
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->buffer($decoded);
        $allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        
        if (!in_array($mimeType, $allowedMimes)) {
            return false;
        }
        
        return true;
    }
}
