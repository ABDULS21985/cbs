package com.cbs.payments.islamic.gateway;

/**
 * Encapsulates the response received from the IPS network gateway after
 * submitting a real-time payment instruction.
 *
 * @param responseCode the gateway response code
 * @param responseMessage the human-readable response description
 * @param transactionId the network or locally correlated transaction identifier
 * @param timeout whether the request timed out waiting for the gateway acknowledgement
 */
public record IpsGatewayResponse(
        String responseCode,
        String responseMessage,
        String transactionId,
        boolean timeout
) {
}