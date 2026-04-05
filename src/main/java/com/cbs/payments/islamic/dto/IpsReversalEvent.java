package com.cbs.payments.islamic.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Domain event published when an instant payment must be reversed after deferred
 * Shariah screening fails.
 *
 * @param paymentId the internal payment identifier
 * @param paymentRef the internal payment reference
 * @param ipsTransactionId the IPS transaction identifier used for network correlation
 * @param ipsRail the instant payment rail used for submission
 * @param amount the original payment amount
 * @param currency the original payment currency
 * @param debitAccountNumber the debtor account number
 * @param creditAccountNumber the resolved beneficiary account number
 * @param reversalReason the business reason for the reversal
 * @param tenantId the tenant identifier associated with the payment
 * @param originalPaymentTimestamp the original confirmation timestamp, when available
 * @param reversalTimestamp the timestamp at which reversal was requested
 */
public record IpsReversalEvent(
        Long paymentId,
        String paymentRef,
        String ipsTransactionId,
        String ipsRail,
        BigDecimal amount,
        String currency,
        String debitAccountNumber,
        String creditAccountNumber,
        String reversalReason,
        String tenantId,
        LocalDateTime originalPaymentTimestamp,
        LocalDateTime reversalTimestamp
) {
}