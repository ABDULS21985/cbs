package com.cbs.account;

import com.cbs.common.config.CbsProperties;
import com.cbs.provider.numbering.AccountNumberGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AccountNumberGeneratorTest {

    private CbsProperties cbsProperties;

    @BeforeEach
    void setUp() {
        cbsProperties = new CbsProperties();
    }

    private AccountNumberGenerator generatorWith(String scheme, String prefix, int length) {
        cbsProperties.getAccount().setNumberingScheme(scheme);
        cbsProperties.getAccount().setNumberPrefix(prefix);
        cbsProperties.getAccount().setNumberLength(length);
        return new AccountNumberGenerator(cbsProperties);
    }

    @Test
    @DisplayName("SEQUENTIAL: generates zero-padded number with prefix")
    void sequential() {
        AccountNumberGenerator gen = generatorWith("SEQUENTIAL", "", 10);
        String result = gen.generate(12345L);
        assertThat(result).isEqualTo("0000012345");
        assertThat(result).hasSize(10);
    }

    @Test
    @DisplayName("SEQUENTIAL with prefix")
    void sequentialWithPrefix() {
        AccountNumberGenerator gen = generatorWith("SEQUENTIAL", "ACC", 10);
        String result = gen.generate(1L);
        assertThat(result).isEqualTo("ACC0000000001");
        assertThat(result).startsWith("ACC");
    }

    @Test
    @DisplayName("NUBAN: generates number with check digit")
    void nuban() {
        AccountNumberGenerator gen = generatorWith("NUBAN", "000", 10);
        String result = gen.generate(123456L);
        assertThat(result).hasSize(10);
        assertThat(result).startsWith("000");
        // Last digit is check digit
        assertThat(result.length()).isEqualTo(10);
    }

    @Test
    @DisplayName("IBAN: generates valid IBAN format")
    void iban() {
        cbsProperties.getAccount().setNumberingScheme("IBAN");
        cbsProperties.getAccount().setIbanCountryCode("GB");
        cbsProperties.getAccount().setIbanBankCode("NWBK");
        cbsProperties.getAccount().setNumberLength(14);
        AccountNumberGenerator gen = new AccountNumberGenerator(cbsProperties);

        String result = gen.generate(60161331926L);
        assertThat(result).startsWith("GB");
        assertThat(result.substring(0, 2)).isEqualTo("GB"); // Country
        assertThat(result.substring(2, 4)).matches("[0-9]{2}"); // Check digits
        assertThat(result.substring(4, 8)).isEqualTo("NWBK"); // Bank code
    }

    @Test
    @DisplayName("BBAN: generates basic bank account number")
    void bban() {
        AccountNumberGenerator gen = generatorWith("BBAN", "0021", 12);
        String result = gen.generate(99999L);
        assertThat(result).startsWith("0021");
        assertThat(result.length()).isEqualTo(16); // prefix + 12 digit number
    }

    @Test
    @DisplayName("CIF generation with configurable prefix and length")
    void cifGeneration() {
        cbsProperties.getAccount().setCifPrefix("CIF");
        cbsProperties.getAccount().setCifLength(10);
        AccountNumberGenerator gen = new AccountNumberGenerator(cbsProperties);

        String result = gen.generateCif(100000L);
        assertThat(result).isEqualTo("CIF0000100000");
    }

    @Test
    @DisplayName("CIF with custom prefix for different market")
    void cifCustomPrefix() {
        cbsProperties.getAccount().setCifPrefix("C");
        cbsProperties.getAccount().setCifLength(8);
        AccountNumberGenerator gen = new AccountNumberGenerator(cbsProperties);

        String result = gen.generateCif(42L);
        assertThat(result).isEqualTo("C00000042");
    }

    @Test
    @DisplayName("Transaction reference generation")
    void txnRef() {
        cbsProperties.getAccount().setTxnRefPrefix("TXN");
        AccountNumberGenerator gen = new AccountNumberGenerator(cbsProperties);

        String result = gen.generateTxnRef(1L, "20260317");
        assertThat(result).isEqualTo("TXN202603170000000001");
    }

    @Test
    @DisplayName("Transaction ref with custom prefix")
    void txnRefCustom() {
        cbsProperties.getAccount().setTxnRefPrefix("TX");
        AccountNumberGenerator gen = new AccountNumberGenerator(cbsProperties);

        String result = gen.generateTxnRef(999L, "20260317");
        assertThat(result).isEqualTo("TX202603170000000999");
    }
}
