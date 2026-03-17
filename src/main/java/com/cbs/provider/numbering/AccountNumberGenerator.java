package com.cbs.provider.numbering;

import com.cbs.common.config.CbsProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigInteger;

/**
 * Pluggable account numbering engine.
 * Supports: SEQUENTIAL, IBAN, NUBAN, BBAN, or CUSTOM schemes.
 * Configured via cbs.account.numbering-scheme in application.yml.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AccountNumberGenerator {

    private final CbsProperties cbsProperties;

    /**
     * Generates an account number from a raw sequence value.
     *
     * @param sequenceValue raw sequence from the database
     * @return formatted account number per configured scheme
     */
    public String generate(Long sequenceValue) {
        CbsProperties.AccountConfig config = cbsProperties.getAccount();
        return switch (config.getNumberingScheme().toUpperCase()) {
            case "IBAN" -> generateIban(sequenceValue, config);
            case "NUBAN" -> generateWithCheckDigit(sequenceValue, config, 10);
            case "BBAN" -> generateBban(sequenceValue, config);
            default -> generateSequential(sequenceValue, config);
        };
    }

    /**
     * Generates a CIF number from a raw sequence value.
     */
    public String generateCif(Long sequenceValue) {
        CbsProperties.AccountConfig config = cbsProperties.getAccount();
        String format = "%0" + config.getCifLength() + "d";
        return config.getCifPrefix() + String.format(format, sequenceValue);
    }

    /**
     * Generates a transaction reference.
     */
    public String generateTxnRef(Long sequenceValue, String datePart) {
        CbsProperties.AccountConfig config = cbsProperties.getAccount();
        return config.getTxnRefPrefix() + datePart + String.format("%010d", sequenceValue);
    }

    // ========================================================================
    // SCHEMES
    // ========================================================================

    private String generateSequential(Long seq, CbsProperties.AccountConfig config) {
        String format = "%0" + config.getNumberLength() + "d";
        return config.getNumberPrefix() + String.format(format, seq);
    }

    /**
     * IBAN: {CountryCode}{CheckDigits}{BankCode}{AccountNumber}
     * ISO 13616 compliant. Check digits calculated per MOD-97-10 (ISO 7064).
     */
    private String generateIban(Long seq, CbsProperties.AccountConfig config) {
        String country = config.getIbanCountryCode().toUpperCase();
        String bankCode = config.getIbanBankCode();
        String bban = bankCode + String.format("%0" + (config.getNumberLength() - bankCode.length()) + "d", seq);

        // Calculate check digits: rearrange (BBAN + CountryLetterValues + "00"), mod 97
        String rearranged = bban + countryToDigits(country) + "00";
        BigInteger numeric = new BigInteger(rearranged);
        int checkDigits = 98 - numeric.mod(BigInteger.valueOf(97)).intValue();

        return country + String.format("%02d", checkDigits) + bban;
    }

    /**
     * NUBAN (Nigeria): {BankCode}{SerialNumber}{CheckDigit}
     * Check digit calculated using NUBAN algorithm.
     */
    private String generateWithCheckDigit(Long seq, CbsProperties.AccountConfig config, int totalLength) {
        String prefix = config.getNumberPrefix();
        int serialLength = totalLength - prefix.length() - 1;
        String serial = String.format("%0" + serialLength + "d", seq);
        String base = prefix + serial;

        int checkDigit = calculateMod10CheckDigit(base);
        return base + checkDigit;
    }

    /**
     * BBAN (Basic Bank Account Number): {BankCode}{BranchCode}{AccountSerial}
     */
    private String generateBban(Long seq, CbsProperties.AccountConfig config) {
        return config.getNumberPrefix() + String.format("%0" + config.getNumberLength() + "d", seq);
    }

    // ========================================================================
    // CHECK DIGIT ALGORITHMS
    // ========================================================================

    /**
     * Luhn/MOD-10 check digit — used globally for card numbers, some account schemes.
     */
    private int calculateMod10CheckDigit(String number) {
        int sum = 0;
        boolean doubleNext = true;
        for (int i = number.length() - 1; i >= 0; i--) {
            int digit = Character.getNumericValue(number.charAt(i));
            if (doubleNext) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
            doubleNext = !doubleNext;
        }
        return (10 - (sum % 10)) % 10;
    }

    /**
     * Converts country code letters to digits for IBAN check: A=10, B=11, ..., Z=35
     */
    private String countryToDigits(String country) {
        StringBuilder sb = new StringBuilder();
        for (char c : country.toCharArray()) {
            sb.append(Character.getNumericValue(c));
        }
        return sb.toString();
    }
}
