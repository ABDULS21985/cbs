package com.cbs.payments.islamic.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.payments.entity.BankDirectory;
import com.cbs.payments.entity.PaymentInstruction;
import com.cbs.payments.islamic.dto.IslamicPaymentRequests;
import com.cbs.payments.islamic.dto.IslamicPaymentResponses;
import com.cbs.payments.islamic.entity.CrossBorderPaymentExtension;
import com.cbs.payments.islamic.entity.IslamicPaymentDomainEnums;
import com.cbs.payments.islamic.entity.PaymentIslamicExtension;
import com.cbs.payments.islamic.repository.CrossBorderPaymentExtensionRepository;
import com.cbs.payments.islamic.repository.PaymentIslamicExtensionRepository;
import com.cbs.payments.repository.BankDirectoryRepository;
import com.cbs.payments.repository.FxRateRepository;
import com.cbs.payments.repository.PaymentInstructionRepository;
import com.cbs.fingateway.entity.FinancialGateway;
import com.cbs.fingateway.entity.GatewayMessage;
import com.cbs.fingateway.service.FinancialGatewayService;
import com.cbs.shariahcompliance.entity.ShariahExclusionList;
import com.cbs.shariahcompliance.repository.ShariahExclusionListEntryRepository;
import com.cbs.shariahcompliance.repository.ShariahExclusionListRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CrossBorderPaymentService {

    private final CrossBorderPaymentExtensionRepository extensionRepository;
    private final PaymentInstructionRepository paymentInstructionRepository;
    private final PaymentIslamicExtensionRepository paymentIslamicExtensionRepository;
    private final FxRateRepository fxRateRepository;
    private final BankDirectoryRepository bankDirectoryRepository;
    private final ShariahExclusionListRepository exclusionListRepository;
    private final ShariahExclusionListEntryRepository exclusionListEntryRepository;
        private final FinancialGatewayService financialGatewayService;
    private final IslamicPaymentSupport paymentSupport;

    public IslamicPaymentResponses.CrossBorderPaymentResult processCrossBorderPayment(Long paymentId) {
        PaymentInstruction payment = loadPayment(paymentId);
        PaymentIslamicExtension islamicExtension = loadIslamicExtension(paymentId);
        return createOrUpdateExtension(payment, islamicExtension, null);
    }

    public IslamicPaymentResponses.CrossBorderPaymentResult processCrossBorderPayment(
            Long paymentId,
            IslamicPaymentRequests.CrossBorderProcessRequest request) {
        PaymentInstruction payment = loadPayment(paymentId);
        PaymentIslamicExtension islamicExtension = loadIslamicExtension(paymentId);
        return createOrUpdateExtension(payment, islamicExtension, request);
    }

    public IslamicPaymentResponses.CrossBorderPaymentResult processCrossBorderPayment(
            PaymentInstruction payment,
            PaymentIslamicExtension islamicExtension,
            IslamicPaymentRequests.IslamicPaymentRequest request) {
        IslamicPaymentRequests.CrossBorderProcessRequest processRequest = IslamicPaymentRequests.CrossBorderProcessRequest.builder()
                .paymentId(payment.getId())
                .correspondentBankSwift(request.getCorrespondentBankSwift())
                .correspondentBankName(request.getCorrespondentBankName())
                .beneficiaryBankSwift(request.getDestinationBankSwift())
                .beneficiaryBankName(request.getBeneficiaryBankName())
                .beneficiaryBankCountry(paymentSupport.resolveCountryCode(request))
                .regulatoryReportingCode(request.getAaoifiReportingCategory())
                .build();
        return createOrUpdateExtension(payment, islamicExtension, processRequest);
    }

    @Transactional(readOnly = true)
    public IslamicPaymentResponses.FxQuote getFxQuote(String sourceCurrency, String destinationCurrency, BigDecimal amount) {
        if (paymentSupport.uppercase(sourceCurrency).equals(paymentSupport.uppercase(destinationCurrency))) {
            return IslamicPaymentResponses.FxQuote.builder()
                    .sourceCurrency(sourceCurrency)
                    .destinationCurrency(destinationCurrency)
                    .sourceAmount(amount)
                    .fxRate(BigDecimal.ONE)
                    .destinationAmount(amount)
                    .valueDate(LocalDate.now())
                    .spotCompliant(true)
                    .build();
        }
        var rate = fxRateRepository.findLatestRate(sourceCurrency, destinationCurrency).stream().findFirst()
                .orElseThrow(() -> new BusinessException("Spot FX rate not found", "NO_SPOT_FX_RATE"));
        BigDecimal converted = amount.multiply(rate.getSellRate()).setScale(2, RoundingMode.HALF_UP);
        return IslamicPaymentResponses.FxQuote.builder()
                .sourceCurrency(sourceCurrency)
                .destinationCurrency(destinationCurrency)
                .sourceAmount(amount)
                .fxRate(rate.getSellRate())
                .destinationAmount(converted)
                .valueDate(LocalDate.now().plusDays(2))
                .spotCompliant(true)
                .build();
    }

    @Transactional(readOnly = true)
    public IslamicPaymentResponses.SwiftTrackingStatus trackPayment(Long paymentId) {
        CrossBorderPaymentExtension extension = extensionRepository.findByPaymentId(paymentId)
                .orElseThrow(() -> new BusinessException("Cross-border payment extension not found", "CROSS_BORDER_EXTENSION_NOT_FOUND"));
        PaymentInstruction payment = loadPayment(paymentId);
        return IslamicPaymentResponses.SwiftTrackingStatus.builder()
                .paymentId(paymentId)
                .paymentRef(payment.getInstructionRef())
                .swiftMessageRef(extension.getSwiftMessageRef())
                .status(extension.getSwiftStatus().name())
                .statusTimestamp(extension.getSwiftStatusTimestamp())
                .trackingUrl(extension.getSwiftTrackingUrl())
                .build();
    }

    @Transactional(readOnly = true)
    public CrossBorderPaymentExtension getDetails(Long paymentId) {
        return extensionRepository.findByPaymentId(paymentId)
                .orElseThrow(() -> new BusinessException("Cross-border payment extension not found", "CROSS_BORDER_EXTENSION_NOT_FOUND"));
    }

    @Transactional(readOnly = true)
    public List<CrossBorderPaymentExtension> getPendingSwiftPayments() {
        return extensionRepository.findBySwiftStatus(IslamicPaymentDomainEnums.SwiftStatus.PENDING);
    }

    @Transactional(readOnly = true)
    public List<CrossBorderPaymentExtension> getRejectedSwiftPayments(LocalDate from, LocalDate to) {
        return extensionRepository.findBySwiftStatus(IslamicPaymentDomainEnums.SwiftStatus.REJECTED).stream()
                .filter(extension -> extension.getSwiftStatusTimestamp() != null)
                .filter(extension -> !extension.getSwiftStatusTimestamp().toLocalDate().isBefore(from)
                        && !extension.getSwiftStatusTimestamp().toLocalDate().isAfter(to))
                .toList();
    }

    @Transactional(readOnly = true)
    public IslamicPaymentResponses.CrossBorderPaymentSummary getCrossBorderSummary(LocalDate from, LocalDate to) {
        List<CrossBorderPaymentExtension> extensions = extensionRepository.findAll().stream()
                .filter(extension -> extension.getSwiftStatusTimestamp() != null)
                .filter(extension -> !extension.getSwiftStatusTimestamp().toLocalDate().isBefore(from)
                        && !extension.getSwiftStatusTimestamp().toLocalDate().isAfter(to))
                .toList();

        Map<String, Long> byCorridor = extensions.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        extension -> extension.getSourceCurrency() + "->" + extension.getBeneficiaryBankCountry(),
                        LinkedHashMap::new,
                        java.util.stream.Collectors.counting()
                ));
        Map<String, Long> byCurrency = extensions.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        CrossBorderPaymentExtension::getSourceCurrency,
                        LinkedHashMap::new,
                        java.util.stream.Collectors.counting()
                ));

        return IslamicPaymentResponses.CrossBorderPaymentSummary.builder()
                .totalCount(extensions.size())
                .rejectedCount(extensions.stream().filter(extension -> extension.getSwiftStatus() == IslamicPaymentDomainEnums.SwiftStatus.REJECTED).count())
                .byCorridor(byCorridor)
                .byCurrency(byCurrency)
                .build();
    }

    @Transactional(readOnly = true)
    public List<BankDirectory> getCorrespondentBanks(String currency) {
        return bankDirectoryRepository.findAll().stream()
                .filter(bank -> StringUtils.hasText(bank.getSwiftCode()))
                .filter(bank -> !StringUtils.hasText(currency) || supportedCorrespondentCurrency(bank, currency))
                .toList();
    }

    @Transactional(readOnly = true)
    public boolean isCorrespondentShariahScreened(String swiftCode) {
        return !isListMatch("PROHIBITED_BANKS", swiftCode);
    }

    private IslamicPaymentResponses.CrossBorderPaymentResult createOrUpdateExtension(
            PaymentInstruction payment,
            PaymentIslamicExtension islamicExtension,
            IslamicPaymentRequests.CrossBorderProcessRequest request) {
        if (!islamicExtension.isShariahScreened()) {
            throw new BusinessException("Payment must be screened before SWIFT submission", "PAYMENT_NOT_SCREENED");
        }

        String correspondentSwift = request != null && StringUtils.hasText(request.getCorrespondentBankSwift())
                ? request.getCorrespondentBankSwift()
                : null;
        String beneficiarySwift = request != null && StringUtils.hasText(request.getBeneficiaryBankSwift())
                ? request.getBeneficiaryBankSwift()
                : payment.getBeneficiaryBankCode();
        String beneficiaryCountry = request != null && StringUtils.hasText(request.getBeneficiaryBankCountry())
                ? request.getBeneficiaryBankCountry()
                : lookupCountryBySwiftOrCode(beneficiarySwift, payment.getBeneficiaryBankCode());

        if (isListMatch("SANCTIONED_COUNTRIES", beneficiaryCountry)) {
            throw new BusinessException("Cross-border payment blocked: beneficiary country is sanctioned", "SHARIAH-PAY-SANCTIONED-COUNTRY");
        }
        if (isListMatch("PROHIBITED_BANKS", beneficiarySwift)) {
            throw new BusinessException("Cross-border payment blocked: beneficiary bank is restricted", "SHARIAH-PAY-PROHIBITED-BANK");
        }

        IslamicPaymentResponses.FxQuote fxQuote = getFxQuote(
                payment.getCurrencyCode(),
                StringUtils.hasText(payment.getFxTargetCurrency()) ? payment.getFxTargetCurrency() : payment.getCurrencyCode(),
                payment.getAmount()
        );

        CrossBorderPaymentExtension extension = extensionRepository.findByPaymentId(payment.getId()).orElseGet(() ->
                CrossBorderPaymentExtension.builder()
                        .paymentId(payment.getId())
                        .tenantId(paymentSupport.currentTenantId())
                        .build());
        extension.setSwiftMessageRef(StringUtils.hasText(payment.getSwiftUetr())
                ? payment.getSwiftUetr()
                : paymentSupport.nextMessageRef("SWF", payment.getId()));
        extension.setMessageType(StringUtils.hasText(payment.getSwiftMessageType()) ? payment.getSwiftMessageType() : "MT103");
        extension.setCorrespondentBankSwift(correspondentSwift);
        extension.setCorrespondentBankName(request != null ? request.getCorrespondentBankName() : null);
        extension.setBeneficiaryBankSwift(beneficiarySwift);
        extension.setBeneficiaryBankName(request != null && StringUtils.hasText(request.getBeneficiaryBankName())
                ? request.getBeneficiaryBankName()
                : payment.getBeneficiaryBankName());
        extension.setBeneficiaryBankCountry(beneficiaryCountry);
        extension.setField72Narrative(buildField72Narrative(islamicExtension));
        extension.setIslamicPurposeCode(islamicExtension.getIslamicTransactionCode());
        extension.setRegulatoryReportingCode(request != null ? request.getRegulatoryReportingCode() : islamicExtension.getAaoifiReportingCategory());
        extension.setCorrespondentScreened(StringUtils.hasText(correspondentSwift));
        extension.setCorrespondentScreeningResult(StringUtils.hasText(correspondentSwift) && isListMatch("PROHIBITED_BANKS", correspondentSwift)
                ? IslamicPaymentDomainEnums.PaymentScreeningResult.ALERT
                : IslamicPaymentDomainEnums.PaymentScreeningResult.PASS);
        extension.setBeneficiaryBankScreened(StringUtils.hasText(beneficiarySwift));
        extension.setBeneficiaryBankScreeningResult(IslamicPaymentDomainEnums.PaymentScreeningResult.PASS);
        extension.setChargesOption(resolveChargeOption(payment.getChargeType()));
        extension.setEstimatedCharges(payment.getChargeAmount());
        extension.setActualCharges(payment.getChargeAmount());
        extension.setChargesGlRef(payment.getInstructionRef());
        extension.setFxRequired(!paymentSupport.uppercase(fxQuote.getSourceCurrency()).equals(paymentSupport.uppercase(fxQuote.getDestinationCurrency())));
        extension.setSourceCurrency(fxQuote.getSourceCurrency());
        extension.setDestinationCurrency(fxQuote.getDestinationCurrency());
        extension.setFxRate(fxQuote.getFxRate());
        extension.setFxSpotDate(fxQuote.getValueDate());
        extension.setFxDealRef(payment.getInstructionRef());
        extension.setFxSettlementAmount(fxQuote.getDestinationAmount());
        GatewayMessage gatewayMessage = handoffToSwiftGateway(payment, extension);
        extension.setSwiftStatus(resolveSwiftStatus(gatewayMessage));
        extension.setSwiftStatusTimestamp(LocalDateTime.now());
        extension.setSwiftTrackingUrl(gatewayMessage != null ? "gateway-message:" + gatewayMessage.getMessageRef() : null);
        extensionRepository.save(extension);

        return IslamicPaymentResponses.CrossBorderPaymentResult.builder()
                .paymentId(payment.getId())
                .paymentRef(payment.getInstructionRef())
                .swiftMessageRef(extension.getSwiftMessageRef())
                .field72Narrative(extension.getField72Narrative())
                .status(extension.getSwiftStatus().name())
                .fxRate(extension.getFxRate())
                .fxSpotDate(extension.getFxSpotDate())
                .build();
    }

        private GatewayMessage handoffToSwiftGateway(PaymentInstruction payment, CrossBorderPaymentExtension extension) {
                List<FinancialGateway> gateways = financialGatewayService.getByType("SWIFT");
                if (gateways.isEmpty()) {
                        log.warn("No active SWIFT gateway configured for payment {} - leaving message in PENDING state", payment.getInstructionRef());
                        return null;
                }

                FinancialGateway gateway = gateways.getFirst();
                try {
                        return financialGatewayService.sendMessage(GatewayMessage.builder()
                                        .gatewayId(gateway.getId())
                                        .direction("OUTBOUND")
                                        .messageType(extension.getMessageType())
                                        .messageFormat("SWIFT_MT")
                                        .senderBic(gateway.getBicCode())
                                        .receiverBic(extension.getBeneficiaryBankSwift())
                                        .amount(payment.getAmount())
                                        .currency(payment.getCurrencyCode())
                                        .valueDate(payment.getValueDate())
                                        .build());
                } catch (Exception ex) {
                        log.error("SWIFT gateway handoff failed for payment {}: {}", payment.getInstructionRef(), ex.getMessage());
                        return null;
                }
        }

        private IslamicPaymentDomainEnums.SwiftStatus resolveSwiftStatus(GatewayMessage gatewayMessage) {
                if (gatewayMessage == null || !StringUtils.hasText(gatewayMessage.getDeliveryStatus())) {
                        return IslamicPaymentDomainEnums.SwiftStatus.PENDING;
                }
                return switch (gatewayMessage.getDeliveryStatus().toUpperCase(Locale.ROOT)) {
                        case "SENT" -> IslamicPaymentDomainEnums.SwiftStatus.SENT;
                        case "ACKNOWLEDGED" -> IslamicPaymentDomainEnums.SwiftStatus.ACKNOWLEDGED;
                        case "BLOCKED", "NACKED" -> IslamicPaymentDomainEnums.SwiftStatus.REJECTED;
                        default -> IslamicPaymentDomainEnums.SwiftStatus.PENDING;
                };
        }

    private String buildField72Narrative(PaymentIslamicExtension extension) {
        return "/ISLM/SHARIAH_COMPLIANT\n"
                + "/PURP/" + (StringUtils.hasText(extension.getIslamicTransactionCode())
                ? extension.getIslamicTransactionCode()
                : "GENERAL") + "\n"
                + "/ISLM/SCREENED_COMPLIANT";
    }

    private IslamicPaymentDomainEnums.ChargesOption resolveChargeOption(String chargeType) {
        String normalized = paymentSupport.uppercase(chargeType);
        if (!StringUtils.hasText(normalized)) {
            return IslamicPaymentDomainEnums.ChargesOption.SHA;
        }
        return IslamicPaymentDomainEnums.ChargesOption.valueOf(normalized);
    }

    private boolean supportedCorrespondentCurrency(BankDirectory bank, String currency) {
        return StringUtils.hasText(bank.getCountryCode()) || StringUtils.hasText(currency);
    }

    private String lookupCountryBySwiftOrCode(String swiftCode, String bankCode) {
        if (StringUtils.hasText(swiftCode)) {
            return bankDirectoryRepository.findAll().stream()
                    .filter(bank -> swiftCode.equalsIgnoreCase(bank.getSwiftCode()))
                    .map(BankDirectory::getCountryCode)
                    .findFirst()
                    .orElse("INTL");
        }
        if (StringUtils.hasText(bankCode)) {
            return bankDirectoryRepository.findByBankCode(bankCode)
                    .map(BankDirectory::getCountryCode)
                    .orElse("INTL");
        }
        return "INTL";
    }

    private boolean isListMatch(String listCode, String value) {
        if (!StringUtils.hasText(value)) {
            return false;
        }
        return exclusionListRepository.findByListCode(listCode)
                .map(ShariahExclusionList::getId)
                .map(listId -> exclusionListEntryRepository.existsByListIdAndEntryValueAndStatus(listId, value, "ACTIVE"))
                .orElse(false);
    }

    private PaymentInstruction loadPayment(Long paymentId) {
        return paymentInstructionRepository.findById(paymentId)
                .orElseThrow(() -> new BusinessException("Payment not found", "PAYMENT_NOT_FOUND"));
    }

    private PaymentIslamicExtension loadIslamicExtension(Long paymentId) {
        return paymentIslamicExtensionRepository.findByPaymentId(paymentId)
                .orElseThrow(() -> new BusinessException("Islamic payment extension not found", "PAYMENT_ISLAMIC_EXTENSION_NOT_FOUND"));
    }
}
