package com.cbs.integration;

import com.cbs.common.config.CbsProperties;
import com.cbs.payments.repository.FxRateRepository;
import com.cbs.payments.repository.PaymentBatchRepository;
import com.cbs.payments.repository.PaymentInstructionRepository;
import com.cbs.payments.service.PaymentService;
import com.cbs.provider.numbering.AccountNumberGenerator;
import com.cbs.account.repository.AccountRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class NibssContractTest {

    @Mock
    private PaymentInstructionRepository paymentRepository;
    @Mock
    private PaymentBatchRepository batchRepository;
    @Mock
    private FxRateRepository fxRateRepository;
    @Mock
    private AccountRepository accountRepository;

    @InjectMocks
    private PaymentService paymentService;

    @Test
    @DisplayName("NIP transfer request format matches NIBSS expectations")
    void nibssNipRequestFormat() {
        PaymentService.NibssNipRequest request = paymentService.buildNibssNipRequest(
                new PaymentService.NibssTransferDetails(
                        "058",
                        "1",
                        "0123456789",
                        new BigDecimal("1250.75"),
                        "1234567890",
                        "ORIGINATOR NAME",
                        "BENEFICIARY NAME",
                        "Salary payment"
                )
        );

        assertThat(request.sessionId()).matches("\\d{12}");
        assertThat(request.destinationInstitutionCode()).matches("\\d{6}");
        assertThat(request.channelCode()).matches("\\d{1,2}");
        assertThat(request.beneficiaryAccountNumber()).matches("\\d{10}");
        assertThat(request.originatorAccountNumber()).matches("\\d{10}");
    }

    @Test
    @DisplayName("NIP request amount is converted to kobo")
    void nibssAmountUsesKobo() {
        PaymentService.NibssNipRequest request = paymentService.buildNibssNipRequest(
                new PaymentService.NibssTransferDetails(
                        "058",
                        "2",
                        "0123456789",
                        new BigDecimal("100.55"),
                        "1234567890",
                        "ORIGINATOR NAME",
                        "BENEFICIARY NAME",
                        "Wallet funding"
                )
        );

        assertThat(request.amount()).isEqualTo(10055L);
    }

    @Test
    @DisplayName("Generated compact NUBAN passes validation")
    void generatedNubanPassesValidation() {
        AccountNumberGenerator generator = nubanGenerator("011");
        String accountNumber = generator.generate(1457L);

        assertThat(accountNumber).matches("\\d{10}");
        assertThat(generator.isValidNuban(accountNumber)).isTrue();
    }

    @Test
    @DisplayName("Tampered NUBAN fails validation")
    void tamperedNubanFailsValidation() {
        AccountNumberGenerator generator = nubanGenerator("011");
        String valid = generator.generate(1457L);
        String invalid = valid.substring(0, 9) + (valid.endsWith("9") ? "8" : "9");

        assertThat(generator.isValidNuban(invalid)).isFalse();
    }

    private AccountNumberGenerator nubanGenerator(String prefix) {
        CbsProperties properties = new CbsProperties();
        properties.getAccount().setNumberingScheme("NUBAN");
        properties.getAccount().setNumberPrefix(prefix);
        properties.getAccount().setNumberLength(10);
        return new AccountNumberGenerator(properties);
    }
}
