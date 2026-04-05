package com.cbs.payments.islamic.gateway;

import com.cbs.payments.entity.PaymentInstruction;
import com.cbs.payments.islamic.entity.InstantPaymentExtension;

/**
 * Abstraction for submitting real-time payment instructions to an IPS gateway.
 */
public interface IpsGatewayClient {

    /**
     * Submits a payment instruction to the configured IPS channel.
     *
     * @param payment the core payment instruction
     * @param extension the instant-payment specific metadata
     * @param transactionId the locally generated correlation identifier
     * @return the gateway acknowledgement payload
     */
    IpsGatewayResponse submit(PaymentInstruction payment,
                              InstantPaymentExtension extension,
                              String transactionId);
}