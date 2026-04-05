package com.cbs.card.issuer;

import com.cbs.card.entity.CardScheme;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.Locale;

@Component
@ConditionalOnProperty(name = "cbs.card.issuer.provider", havingValue = "INTERNAL", matchIfMissing = true)
@Slf4j
public class InternalCardPanIssuer implements CardPanIssuer {

    private final SecureRandom secureRandom = new SecureRandom();

    public InternalCardPanIssuer() {
        log.warn("Card PAN issuer provider INTERNAL is active; configure cbs.card.issuer.provider=REMOTE for HSM or external issuer managed PAN issuance.");
    }

    @Override
    public CardPanIssueResult issuePan(CardPanIssueCommand command) {
        String pan = generatePan(command.cardScheme());
        return new CardPanIssueResult(
                pan,
                "INTERNAL",
                "INT-" + System.currentTimeMillis()
        );
    }

    private String generatePan(CardScheme scheme) {
        String prefix = switch (scheme) {
            case VISA -> "4";
            case MASTERCARD -> "52";
            case VERVE -> "650271";
            case AMEX -> "37";
            default -> "9";
        };
        StringBuilder digits = new StringBuilder(prefix);
        while (digits.length() < 15) {
            digits.append(secureRandom.nextInt(10));
        }
        digits.append(calculateLuhnCheckDigit(digits.toString()));
        return digits.toString().toUpperCase(Locale.ROOT);
    }

    private int calculateLuhnCheckDigit(String partialPan) {
        int sum = 0;
        boolean alternate = true;
        for (int index = partialPan.length() - 1; index >= 0; index--) {
            int digit = partialPan.charAt(index) - '0';
            if (alternate) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            sum += digit;
            alternate = !alternate;
        }
        return (10 - (sum % 10)) % 10;
    }
}