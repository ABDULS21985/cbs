package com.cbs.card.issuer;

import com.cbs.common.exception.BusinessException;
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

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Component
@ConditionalOnProperty(name = "cbs.card.issuer.provider", havingValue = "REMOTE")
@Slf4j
public class RemoteCardPanIssuer implements CardPanIssuer {

    private final RestClient restClient;
    private final String issuerUrl;
    private final String apiKey;
    private final String institutionId;

    public RemoteCardPanIssuer(
            @Value("${cbs.card.issuer.url:}") String issuerUrl,
            @Value("${cbs.card.issuer.api-key:}") String apiKey,
            @Value("${cbs.card.issuer.institution-id:}") String institutionId,
            @Value("${cbs.card.issuer.timeout-seconds:15}") int timeoutSeconds
    ) {
        if (!StringUtils.hasText(issuerUrl)) {
            throw new IllegalStateException("cbs.card.issuer.url is required when the REMOTE PAN issuer is enabled");
        }

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        int timeoutMs = Math.max(1, timeoutSeconds) * 1000;
        requestFactory.setConnectTimeout(timeoutMs);
        requestFactory.setReadTimeout(timeoutMs);

        this.issuerUrl = issuerUrl;
        this.apiKey = apiKey;
        this.institutionId = institutionId;
        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    @Override
    public CardPanIssueResult issuePan(CardPanIssueCommand command) {
        Map<String, Object> payload = buildPayload(command);
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .uri(issuerUrl)
                    .headers(headers -> {
                        if (StringUtils.hasText(apiKey)) {
                            headers.setBearerAuth(apiKey);
                        }
                    })
                    .body(payload)
                    .retrieve()
                    .body(Map.class);

            if (response == null || response.isEmpty()) {
                throw new BusinessException("Card issuer returned an empty PAN issuance response", "CARD_ISSUER_EMPTY_RESPONSE");
            }

            String pan = firstString(response, List.of("pan", "cardNumber", "primaryAccountNumber"), null);
            validatePan(pan);
            return new CardPanIssueResult(
                    pan,
                    firstString(response, List.of("providerName", "issuerName"), "REMOTE"),
                    firstString(response, List.of("providerReference", "issuerReference", "requestId"), command.cardReference())
            );
        } catch (ResourceAccessException ex) {
            throw new BusinessException("Card issuer is unavailable: " + sanitizeMessage(ex.getMessage(), "connection failure"), "CARD_ISSUER_UNAVAILABLE");
        } catch (RestClientResponseException ex) {
            throw new BusinessException(
                    "Card issuer rejected PAN issuance: " + sanitizeMessage(ex.getResponseBodyAsString(), ex.getMessage()),
                    "CARD_ISSUER_REJECTED"
            );
        }
    }

    private Map<String, Object> buildPayload(CardPanIssueCommand command) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("cardReference", command.cardReference());
        payload.put("accountId", command.accountId());
        payload.put("customerId", command.customerId());
        payload.put("cardType", command.cardType() != null ? command.cardType().name() : null);
        payload.put("scheme", command.cardScheme() != null ? command.cardScheme().name() : null);
        payload.put("tier", command.cardTier());
        payload.put("cardholderName", command.cardholderName());
        payload.put("branchCode", command.branchCode());
        payload.put("currencyCode", command.currencyCode());
        payload.put("expiryDate", command.expiryDate() != null ? command.expiryDate().toString() : LocalDate.now().plusYears(3).toString());
        payload.put("institutionId", institutionId);
        return payload;
    }

    private void validatePan(String pan) {
        if (!StringUtils.hasText(pan) || !pan.matches("\\d{12,19}") || !passesLuhn(pan)) {
            throw new BusinessException("Card issuer returned an invalid PAN", "CARD_ISSUER_INVALID_PAN");
        }
    }

    private boolean passesLuhn(String pan) {
        int sum = 0;
        boolean alternate = false;
        for (int index = pan.length() - 1; index >= 0; index--) {
            int digit = pan.charAt(index) - '0';
            if (alternate) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            sum += digit;
            alternate = !alternate;
        }
        return sum % 10 == 0;
    }

    private String firstString(Map<String, Object> response, List<String> keys, String defaultValue) {
        for (String key : keys) {
            Object value = response.get(key);
            if (value != null && StringUtils.hasText(String.valueOf(value))) {
                return String.valueOf(value).trim();
            }
        }
        return defaultValue;
    }

    private String sanitizeMessage(String preferred, String fallback) {
        String message = StringUtils.hasText(preferred) ? preferred : fallback;
        return message == null ? "unknown error" : message.trim().replaceAll("\\s+", " ");
    }
}