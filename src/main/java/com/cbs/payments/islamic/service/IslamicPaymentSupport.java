package com.cbs.payments.islamic.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.AccountStatus;
import com.cbs.account.repository.AccountRepository;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.payments.entity.BankDirectory;
import com.cbs.payments.entity.PaymentInstruction;
import com.cbs.payments.entity.PaymentStatus;
import com.cbs.payments.entity.PaymentType;
import com.cbs.payments.islamic.dto.IslamicPaymentRequests;
import com.cbs.payments.islamic.entity.IslamicPaymentDomainEnums;
import com.cbs.payments.repository.BankDirectoryRepository;
import com.cbs.payments.repository.PaymentInstructionRepository;
import com.cbs.productfactory.islamic.entity.IslamicDomainEnums;
import com.cbs.productfactory.islamic.entity.IslamicProductTemplate;
import com.cbs.productfactory.islamic.repository.IslamicProductTemplateRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class IslamicPaymentSupport {

    private final AccountRepository accountRepository;
    private final PaymentInstructionRepository paymentInstructionRepository;
    private final IslamicProductTemplateRepository islamicProductTemplateRepository;
    private final BankDirectoryRepository bankDirectoryRepository;
    private final CurrentActorProvider actorProvider;
    private final CurrentTenantResolver tenantResolver;

    public Account loadSourceAccount(Long accountId) {
        Account account = accountRepository.findByIdWithProduct(accountId)
                .orElseThrow(() -> new BusinessException("Source account not found", "SOURCE_ACCOUNT_NOT_FOUND"));
        if (account.getStatus() != AccountStatus.ACTIVE || !account.isDebitAllowed()) {
            throw new BusinessException("Source account is not eligible for debit", "SOURCE_ACCOUNT_INACTIVE");
        }
        return account;
    }

    public SourceAccountProfile resolveSourceProfile(Account account) {
        if (account == null || account.getProduct() == null || !StringUtils.hasText(account.getProduct().getCode())) {
            return new SourceAccountProfile(false, null, null, null, false);
        }
        Optional<IslamicProductTemplate> templateOptional =
                islamicProductTemplateRepository.findByProductCodeIgnoreCase(account.getProduct().getCode());
        if (templateOptional.isEmpty()) {
            return new SourceAccountProfile(false, null, account.getProduct().getCode(), null, false);
        }

        IslamicProductTemplate template = templateOptional.get();
        boolean fatwaActive = Boolean.FALSE.equals(template.getFatwaRequired()) || template.getActiveFatwaId() != null;
        boolean compliant = template.getStatus() == IslamicDomainEnums.IslamicProductStatus.ACTIVE
                && template.getShariahComplianceStatus() == IslamicDomainEnums.ShariahComplianceStatus.COMPLIANT
                && fatwaActive;
        String contractTypeCode = template.getContractType() != null ? template.getContractType().getCode() : null;
        return new SourceAccountProfile(true, contractTypeCode, template.getProductCode(), template, compliant);
    }

    public PaymentInstruction createRejectedPayment(IslamicPaymentRequests.IslamicPaymentRequest request,
                                                    Account sourceAccount,
                                                    String failureReason) {
        Long seq = paymentInstructionRepository.getNextInstructionSequence();
        String ref = String.format("PAY%015d", seq);
        PaymentInstruction payment = PaymentInstruction.builder()
                .instructionRef(ref)
                .paymentType(resolvePaymentType(request.getPaymentChannel()))
                .debitAccount(sourceAccount)
                .debitAccountNumber(sourceAccount.getAccountNumber())
                .creditAccountNumber(request.getDestinationAccountNumber())
                .beneficiaryName(request.getBeneficiaryName())
                .beneficiaryBankCode(request.getDestinationBankCode())
                .beneficiaryBankName(request.getBeneficiaryBankName())
                .amount(request.getAmount())
                .currencyCode(request.getCurrencyCode())
                .paymentRail(StringUtils.hasText(request.getPaymentChannel()) ? request.getPaymentChannel().toUpperCase(Locale.ROOT) : "UNKNOWN")
                .remittanceInfo(request.getReference())
                .screeningStatus("HIT")
                .status(PaymentStatus.REJECTED)
                .failureReason(failureReason)
                .executionDate(LocalDate.now())
                .build();
        return paymentInstructionRepository.save(payment);
    }

    public PaymentType resolvePaymentType(String paymentChannel) {
        String channel = uppercase(paymentChannel);
        return switch (channel) {
            case "INTERNAL" -> PaymentType.INTERNAL_TRANSFER;
            case "SWIFT" -> PaymentType.INTERNATIONAL_WIRE;
            case "IPS" -> PaymentType.DOMESTIC_INSTANT;
            case "ACH", "RTGS" -> PaymentType.DOMESTIC_BATCH;
            default -> PaymentType.DOMESTIC_BATCH;
        };
    }

    public String resolvePurposeCode(IslamicPaymentDomainEnums.PaymentPurpose purpose) {
        if (purpose == null) {
            return "GENL";
        }
        return switch (purpose) {
            case SALARY -> "SALA";
            case CHARITY_DONATION -> "CHAR";
            case ZAKAT -> "ZAKT";
            case FINANCING_REPAYMENT -> "LOAN";
            case INVESTMENT -> "INVE";
            case FOREIGN_REMITTANCE -> "FAMI";
            case GOVERNMENT -> "GOVT";
            default -> "GENL";
        };
    }

    public String resolveCountryCode(IslamicPaymentRequests.IslamicPaymentRequest request) {
        if (StringUtils.hasText(request.getMerchantCountry())) {
            return request.getMerchantCountry().trim().toUpperCase(Locale.ROOT);
        }
        if (StringUtils.hasText(request.getDestinationBankSwift())) {
            Optional<BankDirectory> bank = bankDirectoryRepository.findBySwiftCode(request.getDestinationBankSwift());
            if (bank.isPresent() && StringUtils.hasText(bank.get().getCountryCode())) {
                return bank.get().getCountryCode().trim().toUpperCase(Locale.ROOT);
            }
        }
        if (StringUtils.hasText(request.getDestinationBankCode())) {
            Optional<BankDirectory> bank = bankDirectoryRepository.findByBankCode(request.getDestinationBankCode());
            if (bank.isPresent() && StringUtils.hasText(bank.get().getCountryCode())) {
                return bank.get().getCountryCode().trim().toUpperCase(Locale.ROOT);
            }
        }
        return switch (uppercase(request.getCurrencyCode())) {
            case "SAR" -> "SA";
            case "AED" -> "AE";
            case "QAR" -> "QA";
            case "BHD" -> "BH";
            case "KWD" -> "KW";
            case "OMR" -> "OM";
            default -> "NG";
        };
    }

    public IslamicPaymentDomainEnums.ShariahPurposeFlag resolvePurposeFlag(
            IslamicPaymentDomainEnums.ScreeningOutcome outcome,
            String purposeDescription) {
        if (!StringUtils.hasText(purposeDescription)) {
            return IslamicPaymentDomainEnums.ShariahPurposeFlag.NOT_APPLICABLE;
        }
        if (outcome == IslamicPaymentDomainEnums.ScreeningOutcome.BLOCKED) {
            return IslamicPaymentDomainEnums.ShariahPurposeFlag.NON_COMPLIANT;
        }
        if (outcome == IslamicPaymentDomainEnums.ScreeningOutcome.ALLOWED_WITH_ALERT
                || outcome == IslamicPaymentDomainEnums.ScreeningOutcome.ALLOWED_WITH_WARNING) {
            return IslamicPaymentDomainEnums.ShariahPurposeFlag.REQUIRES_REVIEW;
        }
        return IslamicPaymentDomainEnums.ShariahPurposeFlag.COMPLIANT;
    }

    public BigDecimal money(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    public boolean fuzzyMatch(String left, String right) {
        if (!StringUtils.hasText(left) || !StringUtils.hasText(right)) {
            return false;
        }
        String normalizedLeft = normalize(left);
        String normalizedRight = normalize(right);
        if (normalizedLeft.equals(normalizedRight)) {
            return true;
        }
        return normalizedLeft.contains(normalizedRight) || normalizedRight.contains(normalizedLeft);
    }

    public String normalize(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^a-zA-Z0-9 ]", " ")
                .replaceAll("\\s+", " ")
                .trim()
                .toLowerCase(Locale.ROOT);
        return normalized;
    }

    public String nextMessageRef(String prefix, Long paymentId) {
        return prefix + "-" + LocalDate.now().getYear() + "-" + String.format("%06d", paymentId);
    }

    public String currentActor() {
        return actorProvider.getCurrentActor();
    }

    public Long currentTenantId() {
        return tenantResolver.getCurrentTenantId();
    }

    public String uppercase(String value) {
        return value == null ? null : value.trim().toUpperCase(Locale.ROOT);
    }

    public record SourceAccountProfile(
            boolean islamic,
            String contractTypeCode,
            String productCode,
            IslamicProductTemplate islamicProductTemplate,
            boolean compliant
    ) {
    }
}
