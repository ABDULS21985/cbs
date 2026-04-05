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
        this(RestClient.builder(), issuerUrl, apiKey, institutionId, timeoutSeconds);
    }

    RemoteCardPanIssuer(RestClient.Builder restClientBuilder,
                        String issuerUrl,
                        String apiKey,
                        String institutionId,
                        int timeoutSeconds) {
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
        this.restClient = restClientBuilder
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    @Override
    public CardPanIssueResult issuePan(CardPanIssueCommand command) {
        RemoteCardPanIssueRequest payload = buildPayload(command);
        try {
            RemoteCardPanIssueResponse response = restClient.post()
                    .uri(issuerUrl)
                    .headers(headers -> {
                        if (StringUtils.hasText(apiKey)) {
                            headers.setBearerAuth(apiKey);
                        }
                    })
                    .body(payload)
                    .retrieve()
                    .body(RemoteCardPanIssueResponse.class);

            if (response == null) {
                throw new BusinessException("Card issuer returned an empty PAN issuance response", "CARD_ISSUER_EMPTY_RESPONSE");
            }

            String pan = response.getPan();
            validatePan(pan);
            return new CardPanIssueResult(
                    pan,
                    StringUtils.hasText(response.getProviderName()) ? response.getProviderName().trim() : "REMOTE",
                    StringUtils.hasText(response.getProviderReference()) ? response.getProviderReference().trim() : command.cardReference()
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

    private RemoteCardPanIssueRequest buildPayload(CardPanIssueCommand command) {
        return RemoteCardPanIssueRequest.builder()
                .cardReference(command.cardReference())
                .accountId(command.accountId())
                .customerId(command.customerId())
                .cardType(command.cardType() != null ? command.cardType().name() : null)
                .scheme(command.cardScheme() != null ? command.cardScheme().name() : null)
                .tier(command.cardTier())
                .cardholderName(command.cardholderName())
                .branchCode(command.branchCode())
                .currencyCode(command.currencyCode())
                .expiryDate(command.expiryDate() != null ? command.expiryDate().toString() : LocalDate.now().plusYears(3).toString())
                .institutionId(institutionId)
                .build();
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

    private String sanitizeMessage(String preferred, String fallback) {
        String message = StringUtils.hasText(preferred) ? preferred : fallback;
        return message == null ? "unknown error" : message.trim().replaceAll("\\s+", " ");
    }
}