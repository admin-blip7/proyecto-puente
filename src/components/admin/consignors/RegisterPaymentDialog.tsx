"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Consignor, PaymentMethod } from '@/types';
import { CheckCircle, CreditCard, DollarSign, FileText, AlertCircle, Loader2, X } from 'lucide-react';
import styles from './RegisterPaymentDialog.module.css';

// Enhanced validation schema with more robust rules
const paymentSchema = z.object({
  amount: z.union([z.number(), z.string()])
    .transform((val) => {
      // Convert to number if it's a string
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? 0 : num;
    })
    .refine((val) => val > 0, {
      message: "El monto debe ser mayor a cero"
    })
    .refine((val) => val <= 999999.99, {
      message: "El monto no puede exceder $999,999.99"
    })
    .refine((val) => Number(val.toFixed(2)) === val, {
      message: "Solo se permiten hasta 2 decimales"
    }),
  paymentMethod: z.enum(['Transferencia Bancaria', 'Efectivo', 'Depósito'] as const, {
    required_error: "Debe seleccionar un método de pago",
  }),
  notes: z.string()
    .max(500, "Las notas no pueden exceder 500 caracteres")
    .optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface RegisterPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  consignor: Consignor | null;
  onPaymentRegistered: (consignorId: string, amountPaid: number) => void;
}

export default function RegisterPaymentDialog({
  isOpen,
  onOpenChange,
  consignor,
  onPaymentRegistered,
}: RegisterPaymentDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
    reset,
    trigger,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    mode: 'onChange',
    defaultValues: {
      amount: 0,
      paymentMethod: undefined,
      notes: '',
    },
  });

  const watchedAmount = watch('amount');
  const watchedPaymentMethod = watch('paymentMethod');
  const watchedNotes = watch('notes');

  // Ensure watchedAmount is a number for toFixed operations
  const numericAmount = typeof watchedAmount === 'string' ? parseFloat(watchedAmount) || 0 : (watchedAmount || 0);

  // Reset form when dialog opens/closes or consignor changes
  useEffect(() => {
    if (isOpen && consignor) {
      reset({
        amount: 0,
        paymentMethod: undefined,
        notes: '',
      });
      setCurrentStep(1);
      setSubmitError(null);
      setSubmitSuccess(false);
    }
  }, [isOpen, consignor?.id, reset]);

  // Quick amount buttons based on balance
  const getQuickAmounts = () => {
    if (!consignor?.balanceDue) return [];
    const balance = consignor.balanceDue;
    const amounts = [];
    
    if (balance >= 100) amounts.push(100);
    if (balance >= 250) amounts.push(250);
    if (balance >= 500) amounts.push(500);
    if (balance >= 1000) amounts.push(1000);
    
    // Always include full balance
    amounts.push(Math.round(balance * 100) / 100);
    
    return [...new Set(amounts)].sort((a, b) => a - b);
  };

  const handleQuickAmount = (amount: number) => {
    setValue('amount', amount);
    trigger('amount');
  };

  // Function to safely format amount to display
  const formatAmount = (amount: number | string | undefined) => {
    const num = typeof amount === 'string' ? parseFloat(amount) || 0 : (amount || 0);
    return num.toFixed(2);
  };

  const proceedToConfirmation = async () => {
    const isStepValid = await trigger(['amount', 'paymentMethod']);
    if (isStepValid) {
      setCurrentStep(2);
    }
  };

  const goBackToForm = () => {
    setCurrentStep(1);
  };

  const onSubmit = async (data: PaymentFormData) => {
    if (!consignor) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Use the id field from consignor (UUID)
      const consignorIdentifier = consignor.id;

      console.log('=== PAYMENT SUBMISSION DEBUG ===');
      console.log('Consignor:', consignor);
      console.log('Form data:', data);
      console.log('Numeric amount:', numericAmount);
      console.log('Consignment identifier:', consignorIdentifier);
      console.log('API URL:', `/api/consignors/${consignorIdentifier}/register-payment`);
      console.log('=================================');
      const response = await fetch(`/api/consignors/${consignorIdentifier}/register-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: numericAmount,
          paymentMethod: data.paymentMethod,
          notes: data.notes?.trim() || undefined,
        }),
      });

      // Handle response based on status - only parse JSON if response is not empty
      let result = {};
      try {
        if (response.headers.get('content-type')?.includes('application/json')) {
          result = await response.json();
        } else {
          // If not JSON response, try to get text
          const textResult = await response.text();
          // Try to parse as JSON if it looks like JSON
          if (textResult.startsWith('{') || textResult.startsWith('[')) {
            result = JSON.parse(textResult);
          } else {
            result = { error: textResult || 'Error desconocido del servidor' };
          }
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        result = { 
          error: 'Error de comunicación con el servidor', 
          details: 'La respuesta del servidor no es válida',
          code: 'PARSE_ERROR'
        };
      }

      console.log('Payment API response:', {
        status: response.status,
        ok: response.ok,
        result
      });

      if (!response.ok) {
        console.error('Payment registration failed:', result);
        // Provide better error message based on the result
        const errorMessage = result && typeof result === 'object' && 'error' in result
          ? (result as { error: string }).error
          : (result && typeof result === 'string'
              ? result
              : 'Error al registrar el pago. Por favor intente nuevamente.');
        throw new Error(errorMessage);
      }

      setSubmitSuccess(true);
      setCurrentStep(3);
      
      // Call the callback to update parent component
      onPaymentRegistered(consignorIdentifier, numericAmount);

      // Auto-close after success
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);

    } catch (error) {
      console.error('Error registering payment:', error);
      // Handle the error properly to avoid empty error messages
      if (error instanceof Error) {
        setSubmitError(error.message || 'Error desconocido al registrar el pago');
      } else {
        setSubmitError('Error desconocido al registrar el pago');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  if (!consignor) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <div className={styles.dialogOverlay} />
      <DialogContent
        className={styles.dialogContent}
        aria-labelledby="payment-dialog-title"
        aria-describedby="payment-dialog-description"
        role="dialog"
        aria-modal="true"
      >
        <DialogHeader className={styles.header}>
          <DialogTitle id="payment-dialog-title" className={styles.title}>
            <CreditCard className="w-5 h-5" aria-hidden="true" />
            Registrar Pago a Consignador
          </DialogTitle>
          <p className={styles.subtitle} id="payment-dialog-description">
            {consignor ? `${consignor.name} - Saldo pendiente: $${consignor.balanceDue.toFixed(2)}` : 'Cargando información del consignador...'}
          </p>
          {!isSubmitting && (
            <button
              onClick={handleClose}
              className={styles.closeButton}
              aria-label="Cerrar diálogo de registro de pago"
              type="button"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </DialogHeader>

        <div className={styles.content}>
          {/* Progress Indicator */}
          <div className={styles.progressContainer}>
            <div className={styles.progressBar} role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={3}>
              <div className={`${styles.progressStep} ${currentStep >= 1 ? styles.active : styles.inactive}`}>
                1
              </div>
              <div className={`${styles.progressLine} ${currentStep > 1 ? styles.completed : ''}`} />
              <div className={`${styles.progressStep} ${currentStep >= 2 ? (currentStep === 2 ? styles.active : styles.completed) : styles.inactive}`}>
                2
              </div>
              <div className={`${styles.progressLine} ${currentStep > 2 ? styles.completed : ''}`} />
              <div className={`${styles.progressStep} ${currentStep >= 3 ? styles.active : styles.inactive}`}>
                3
              </div>
            </div>
            <div className={styles.progressLabels}>
              <span>Datos del Pago</span>
              <span>Confirmación</span>
              <span>Completado</span>
            </div>
          </div>

          {/* No balance warning */}
          {consignor.balanceDue <= 0 && (
            <div className={styles.errorAlert}>
              <AlertCircle className="w-5 h-5" />
              <p>No hay saldo pendiente para registrar pagos.</p>
            </div>
          )}

          {/* Error message */}
          {submitError && (
            <div 
              className={styles.errorAlert}
              role="alert"
              aria-live="assertive"
              aria-label="Mensaje de error"
            >
              <AlertCircle className="w-5 h-5" aria-hidden="true" />
              <div>
                <h4>Error al Procesar el Pago</h4>
                <p>{submitError}</p>
                <p className={styles.errorHelp}>
                  Por favor, verifique los datos e intente nuevamente. Si el problema persiste, contacte al administrador del sistema.
                </p>
              </div>
            </div>
          )}

          {/* Success message */}
          {submitSuccess && (
            <div className={styles.successMessage}>
              <CheckCircle className="w-5 h-5" />
              <p>¡Pago registrado exitosamente!</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit as any)} className={styles.form}>
            {/* Step 1: Payment Information */}
            {currentStep === 1 && (
              <>
                {/* Amount Field */}
                <div className={styles.formGroup}>
                  <Label htmlFor="amount" className={styles.label}>
                    <DollarSign className="w-4 h-4" />
                    Monto a Pagar <span className={styles.required}>*</span>
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    max={consignor.balanceDue}
                    placeholder="0.00"
                    className={`${styles.input} ${errors.amount ? styles.error : ''}`}
                    {...register('amount')}
                    aria-describedby={errors.amount ? 'amount-error' : undefined}
                    aria-invalid={!!errors.amount}
                    autoComplete="off"
                  />
                  {errors.amount && (
                    <div 
                      id="amount-error" 
                      className={styles.errorMessage}
                      role="alert"
                      aria-live="polite"
                    >
                      <AlertCircle className="w-4 h-4" aria-hidden="true" />
                      {errors.amount.message}
                    </div>
                  )}
                  
                  {/* Quick Amount Buttons */}
                  <div className={styles.quickAmounts}>
                    {getQuickAmounts().map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => handleQuickAmount(amount)}
                        className={styles.quickAmountButton}
                        aria-label={`Establecer monto a $${amount}`}
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Method Field */}
                <div className={styles.formGroup}>
                  <Label htmlFor="paymentMethod" className={styles.label}>
                    Método de Pago *
                  </Label>
                  <Select 
                    onValueChange={(value) => setValue('paymentMethod', value as PaymentMethod)}
                    value={watch('paymentMethod') || ''}
                  >
                    <SelectTrigger 
                      id="paymentMethod"
                      className={styles.select}
                      aria-describedby={errors.paymentMethod ? 'payment-method-error' : undefined}
                      aria-invalid={!!errors.paymentMethod}
                    >
                      <SelectValue placeholder="Seleccionar método de pago" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Efectivo">💵 Efectivo</SelectItem>
                      <SelectItem value="Transferencia Bancaria">🏦 Transferencia Bancaria</SelectItem>
                      <SelectItem value="Depósito">💳 Depósito</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.paymentMethod && (
                    <span 
                      id="payment-method-error"
                      className={styles.errorMessage}
                      role="alert"
                      aria-live="polite"
                    >
                      <AlertCircle className="w-4 h-4" aria-hidden="true" />
                      {errors.paymentMethod.message}
                    </span>
                  )}
                </div>

                {/* Notes Field */}
                <div className={styles.formGroup}>
                  <Label htmlFor="notes" className={styles.label}>
                    <FileText className="w-4 h-4" />
                    Notas (Opcional)
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Información adicional sobre el pago..."
                    className={styles.textarea}
                    {...register('notes')}
                    maxLength={500}
                    aria-describedby={errors.notes ? 'notes-error' : 'notes-help'}
                    aria-invalid={!!errors.notes}
                  />
                  <div id="notes-help" className={styles.helpText}>
                    Máximo 500 caracteres
                  </div>
                  {errors.notes && (
                    <div 
                      id="notes-error"
                      className={styles.errorMessage}
                      role="alert"
                      aria-live="polite"
                    >
                      <AlertCircle className="w-4 h-4" aria-hidden="true" />
                      {errors.notes.message}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Step 2: Confirmation */}
            {currentStep === 2 && (
              <div className={styles.confirmationCard}>
                <h3 className={styles.confirmationTitle}>
                  <CheckCircle className="w-5 h-5" />
                  Confirmar Pago
                </h3>
                <div className={styles.confirmationDetails}>
                  <div className={styles.confirmationRow}>
                    <span className={styles.confirmationLabel}>Consignador:</span>
                    <span className={styles.confirmationValue}>{consignor.name}</span>
                  </div>
                  <div className={styles.confirmationRow}>
                    <span className={styles.confirmationLabel}>Monto a Pagar:</span>
                    <span className={styles.confirmationValue}>${formatAmount(watchedAmount)}</span>
                  </div>
                  <div className={styles.confirmationRow}>
                    <span className={styles.confirmationLabel}>Método de Pago:</span>
                    <span className={styles.confirmationValue}>{watchedPaymentMethod}</span>
                  </div>
                  <div className={styles.confirmationRow}>
                    <span className={styles.confirmationLabel}>Saldo Actual:</span>
                    <span className={styles.confirmationValue}>${consignor.balanceDue.toFixed(2)}</span>
                  </div>
                  <div className={styles.confirmationRow}>
                    <span className={styles.confirmationLabel}>Nuevo Saldo:</span>
                    <span className={styles.confirmationValue}>
                      ${Math.max(0, consignor.balanceDue - numericAmount).toFixed(2)}
                    </span>
                  </div>
                  {watchedNotes && (
                    <div className={styles.confirmationRow}>
                      <span className={styles.confirmationLabel}>Notas:</span>
                      <span className={styles.confirmationValue}>{watchedNotes}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Success */}
            {currentStep === 3 && submitSuccess && (
              <div 
                className={styles.successMessage}
                role="status"
                aria-live="polite"
                aria-label="Mensaje de éxito"
              >
                <CheckCircle className="w-6 h-6" aria-hidden="true" />
                <div>
                  <h3>¡Pago Registrado Exitosamente!</h3>
                  <p>El pago de ${formatAmount(watchedAmount)} ha sido procesado correctamente. El saldo del consignador {consignor.name} ha sido actualizado.</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className={styles.actions}>
              {currentStep === 1 && (
                <>
                  <Button
                    type="button"
                    onClick={handleClose}
                    className={`${styles.button} ${styles.buttonSecondary}`}
                    disabled={isSubmitting}
                    aria-label="Cancelar registro de pago"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={proceedToConfirmation}
                    className={`${styles.button} ${styles.buttonPrimary}`}
                    disabled={!watchedAmount || !watchedPaymentMethod || consignor.balanceDue <= 0}
                    aria-label={`Continuar con el pago de $${formatAmount(watchedAmount)}`}
                  >
                    {!watchedAmount || !watchedPaymentMethod ? (
                      <>
                        <AlertCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                        Completar Datos
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-4 h-4 mr-2" aria-hidden="true" />
                        Continuar
                      </>
                    )}
                  </Button>
                </>
              )}

              {currentStep === 2 && (
                <>
                  <Button
                    type="button"
                    onClick={goBackToForm}
                    className={`${styles.button} ${styles.buttonSecondary}`}
                    disabled={isSubmitting}
                    aria-label="Volver al formulario de pago"
                  >
                    <FileText className="w-4 h-4 mr-2" aria-hidden="true" />
                    Volver
                  </Button>
                  <Button
                    type="submit"
                    className={`${styles.button} ${styles.buttonPrimary}`}
                    disabled={isSubmitting}
                    aria-label={`Confirmar pago de $${formatAmount(watchedAmount)} a ${consignor.name}`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                        Procesando Pago...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                        Confirmar Pago
                      </>
                    )}
                  </Button>
                </>
              )}

              {currentStep === 3 && (
                <Button
                  type="button"
                  onClick={handleClose}
                  className={`${styles.button} ${styles.buttonPrimary}`}
                >
                  Cerrar
                </Button>
              )}
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}