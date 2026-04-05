package com.cbs.payments.islamic.gateway;

import com.cbs.payments.entity.PaymentInstruction;
import com.cbs.payments.islamic.entity.InstantPaymentExtension;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Production IPS gateway client for SARIE Express real-time payment submissions.
 * It builds an ISO 20022-shaped payload and posts it to the configured gateway endpoint.
 */
@Component
@ConditionalOnProperty(name = "cbs.ips.gateway.enabled", havingValue = "true")
@Slf4j
public class SarieIpsGatewayClient implements IpsGatewayClient {

    private final RestClient restClient;
    private final String gatewayUrl;
    private final String participantBic;

    public SarieIpsGatewayClient(
            @Value("${cbs.ips.gateway.url:}") String gatewayUrl,
            @Value("${cbs.ips.gateway.timeout-seconds:30}") int timeoutSeconds,
            @Value("${cbs.ips.gateway.participant-bic:}") String participantBic) {
        if (!StringUtils.hasText(gatewayUrl)) {
            throw new IllegalStateException("cbs.ips.gateway.url is required when the IPS gateway is enabled");
        }
        if (!StringUtils.hasText(participantBic)) {
            throw new IllegalStateException("cbs.ips.gateway.participant-bic is required when the IPS gateway is enabled");
        }

        int timeoutMs = Math.max(1, timeoutSeconds) * 1000;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(timeoutMs);
        requestFactory.setReadTimeout(timeoutMs);

        this.gatewayUrl = gatewayUrl;
        this.participantBic = participantBic.trim().toUpperCase(Locale.ROOT);
        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();

        log.info("SARIE IPS gateway client initialized: url={}, timeoutSeconds={}, participantBic={}",
                gatewayUrl, timeoutSeconds, this.participantBic);
    }

    /**
     * Submits the payment to the configured SARIE endpoint and normalizes the network response.
     *
     * @param payment the core payment instruction
     * @param extension the instant-payment specific metadata
     * @param transactionId the locally generated correlation identifier
     * @return the normalized gateway response
     */
    @Override
    public IpsGatewayResponse submit(PaymentInstruction payment,
                                     InstantPaymentExtension extension,
                                     String transactionId) {
        Map<String, Object> payload = buildIso20022Payload(payment, extension, transactionId);

        log.info("Submitting IPS payment: paymentId={}, transactionId={}, rail={}, amount={} {}",
                payment.getId(), transactionId, extension.getIpsRail(), payment.getAmount(), payment.getCurrencyCode());

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .uri(gatewayUrl)
                    .header("X-Participant-BIC", participantBic)
                    .body(payload)
                    .retrieve()
                    .body(Map.class);

            if (response == null || response.isEmpty()) {
                return new IpsGatewayResponse("ERR", "Gateway returned an empty response", transactionId, false);
            }

            String responseCode = firstString(response, List.of("responseCode", "statusCode", "code"), "00");
            String responseMessage = firstString(response, List.of("responseMessage", "statusMessage", "message"), "Accepted");
            String networkTransactionId = firstString(
                    response,
                    List.of("networkTransactionId", "transactionId", "ipsTransactionId", "endToEndId"),
                    transactionId
            );

            log.info("IPS gateway response received: paymentId={}, responseCode={}, transactionId={}",
                    payment.getId(), responseCode, networkTransactionId);

            return new IpsGatewayResponse(responseCode, responseMessage, networkTransactionId, false);
        } catch (ResourceAccessException exception) {
            if (isTimeout(exception)) {
                log.error("IPS gateway timeout for payment {}: {}", payment.getId(), exception.getMessage());
                return new IpsGatewayResponse("TIMEOUT", buildTimeoutMessage(exception), transactionId, true);
            }
            log.error("IPS gateway connectivity failure for payment {}: {}", payment.getId(), exception.getMessage());
            return new IpsGatewayResponse("ERR", buildConnectionErrorMessage(exception), transactionId, false);
        } catch (RestClientResponseException exception) {
            log.error("IPS gateway HTTP error for payment {}: status={}, body={}",
                    payment.getId(), exception.getStatusCode(), exception.getResponseBodyAsString());
            return new IpsGatewayResponse(
                    "HTTP_" + exception.getStatusCode().value(),
                    sanitizeMessage(exception.getResponseBodyAsString(), exception.getMessage()),
                    transactionId,
                    false
            );
        } catch (Exception exception) {
            log.error("IPS gateway unexpected error for payment {}", payment.getId(), exception);
            return new IpsGatewayResponse("ERR", sanitizeMessage(exception.getMessage(), "Unexpected IPS gateway error"), transactionId, false);
        }
    }

    private Map<String, Object> buildIso20022Payload(PaymentInstruction payment,
                                                     InstantPaymentExtension extension,
                                                     String transactionId) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("msgId", transactionId);
        payload.put("creDtTm", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        payload.put("nbOfTxs", "1");
        payload.put("instrId", payment.getInstructionRef());
        payload.put("endToEndId", transactionId);
        payload.put("ipsRail", extension.getIpsRail());
        payload.put("instgAgtBic", participantBic);
        payload.put("debtorAccount", payment.getDebitAccountNumber());
        payload.put("debtorName", payment.getDebitAccount() != null ? payment.getDebitAccount().getAccountName() : payment.getDebitAccountNumber());
        payload.put("creditorAccount", extension.getResolvedAccountNumber());
        payload.put("creditorName", payment.getBeneficiaryName());
        payload.put("creditorBankCode", extension.getResolvedBankCode());
        payload.put("creditorBankName", payment.getBeneficiaryBankName());
        payload.put("amount", payment.getAmount());
        payload.put("currency", payment.getCurrencyCode());
        payload.put("valueDate", payment.getValueDate() != null ? payment.getValueDate().toString() : null);
        payload.put("proxyType", extension.getProxyType() != null ? extension.getProxyType().name() : null);
        payload.put("proxyValue", extension.getProxyValue());
        payload.put("screeningMode", extension.getScreeningMode() != null ? extension.getScreeningMode().name() : null);
        payload.put("purposeCode", payment.getPurposeCode());
        payload.put("remittanceInfo", payment.getRemittanceInfo());
        payload.put("routingCode", payment.getRoutingCode());
        return payload;
    }

    private String firstString(Map<String, Object> source, List<String> keys, String defaultValue) {
        for (String key : keys) {
            Object value = source.get(key);
            if (value != null && StringUtils.hasText(String.valueOf(value))) {
                return String.valueOf(value);
            }
        }
        return defaultValue;
    }

    private boolean isTimeout(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            String message = current.getMessage();
            if (message != null) {
                String normalized = message.toLowerCase(Locale.ROOT);
                if (normalized.contains("timeout") || normalized.contains("timed out")) {
                    return true;
                }
            }
            current = current.getCause();
        }
        return false;
    }

    private String buildTimeoutMessage(Exception exception) {
        return "Gateway timeout: " + sanitizeMessage(exception.getMessage(), "Timed out waiting for IPS acknowledgement");
    }

    private String buildConnectionErrorMessage(Exception exception) {
        return "Gateway connection error: " + sanitizeMessage(exception.getMessage(), "Unable to reach IPS gateway");
    }

    private String sanitizeMessage(String preferred, String fallback) {
        return StringUtils.hasText(preferred) ? preferred : fallback;
    }
}