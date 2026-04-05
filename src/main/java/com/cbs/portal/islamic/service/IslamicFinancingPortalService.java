package com.cbs.portal.islamic.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.hijri.dto.HijriDateResponse;
import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.ijarah.dto.IjarahResponses;
import com.cbs.ijarah.entity.IjarahRentalInstallment;
import com.cbs.ijarah.service.IjarahContractService;
import com.cbs.ijarah.service.IjarahRentalService;
import com.cbs.murabaha.dto.EarlySettlementQuote;
import com.cbs.murabaha.dto.MurabahaContractResponse;
import com.cbs.murabaha.entity.MurabahaInstallment;
import com.cbs.murabaha.service.MurabahaContractService;
import com.cbs.murabaha.service.MurabahaScheduleService;
import com.cbs.musharakah.dto.MusharakahResponses;
import com.cbs.musharakah.entity.MusharakahBuyoutInstallment;
import com.cbs.musharakah.service.MusharakahBuyoutService;
import com.cbs.musharakah.service.MusharakahContractService;
import com.cbs.musharakah.service.MusharakahRentalService;
import com.cbs.portal.islamic.dto.IslamicPortalDtos.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * BFF for Capability 2 — Financing Views.
 * Aggregates Murabaha, Ijarah, and Musharakah contract data, applies Islamic
 * terminology, Hijri dates, and normalises the output for the portal UI.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class IslamicFinancingPortalService {

    private final MurabahaContractService murabahaContractService;
    private final MurabahaScheduleService murabahaScheduleService;
    private final IjarahContractService ijarahContractService;
    private final IjarahRentalService ijarahRentalService;
    private final MusharakahContractService musharakahContractService;
    private final MusharakahBuyoutService musharakahBuyoutService;
    private final MusharakahRentalService musharakahRentalService;
    private final HijriCalendarService hijriCalendarService;
    private final IslamicTerminologyService terminologyService;

    // ── Financing Dashboard ──────────────────────────────────────────────

    /**
     * All customer's financing contracts summarised.
     */
    public List<IslamicFinancingSummaryDTO> getFinancingDashboard(Long customerId, String language) {
        List<IslamicFinancingSummaryDTO> result = new ArrayList<>();
        result.addAll(loadMurabahaSummaries(customerId, language));
        result.addAll(loadIjarahSummaries(customerId, language));
        result.addAll(loadMusharakahSummaries(customerId, language));
        return result;
    }

    // ── Financing Detail ─────────────────────────────────────────────────

    /**
     * Routes to appropriate contract service based on contract type and returns
     * full detail with schedule.
     */
    public IslamicFinancingDetailDTO getFinancingDetail(Long customerId, Long contractId,
                                                         String contractType, String language) {
        return switch (safeUpper(contractType)) {
            case "MURABAHA" -> buildMurabahaDetail(customerId, contractId, language);
            case "IJARAH" -> buildIjarahDetail(customerId, contractId, language);
            case "MUSHARAKAH" -> buildMusharakahDetail(customerId, contractId, language);
            default -> throw new BusinessException("Unsupported contract type: " + contractType);
        };
    }

    // ── Early Settlement ─────────────────────────────────────────────────

    /**
     * Delegates to contract service's early settlement calculator.
     */
    public EarlySettlementPortalDTO calculateEarlySettlement(Long customerId, Long contractId,
                                                              String contractType, LocalDate settlementDate) {
        return switch (safeUpper(contractType)) {
            case "MURABAHA" -> buildMurabahaEarlySettlement(contractId, settlementDate);
            case "MUSHARAKAH" -> buildMusharakahEarlyBuyout(contractId, settlementDate);
            default -> throw new BusinessException("Early settlement not supported for contract type: " + contractType);
        };
    }

    // ── Repayment Summary ────────────────────────────────────────────────

    /**
     * Total paid, remaining, next due.
     */
    public RepaymentSummaryDTO getRepaymentSummary(Long customerId, Long contractId, String contractType) {
        return switch (safeUpper(contractType)) {
            case "MURABAHA" -> buildMurabahaRepaymentSummary(contractId);
            case "IJARAH" -> buildIjarahRepaymentSummary(contractId);
            case "MUSHARAKAH" -> buildMusharakahRepaymentSummary(contractId);
            default -> throw new BusinessException("Unsupported contract type: " + contractType);
        };
    }

    // ── Murabaha internals ───────────────────────────────────────────────

    private IslamicFinancingDetailDTO buildMurabahaDetail(Long customerId, Long contractId, String language) {
        MurabahaContractResponse c = murabahaContractService.getContract(contractId);

        BigDecimal outstanding = safe(c.getFinancedAmount()).subtract(safe(c.getRecognisedProfit()));
        BigDecimal totalPaid = safe(c.getRecognisedProfit());
        BigDecimal completion = safe(c.getSellingPrice()).signum() > 0
                ? totalPaid.multiply(BigDecimal.valueOf(100)).divide(safe(c.getSellingPrice()), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return IslamicFinancingDetailDTO.builder()
                .financingId(String.valueOf(c.getId()))
                .contractReference(c.getContractRef())
                .contractType("MURABAHA")
                .productCode(c.getProductCode())
                .productName(terminologyService.translate("Murabaha Financing", "FINANCING", language))
                .originalAmount(c.getSellingPrice())
                .outstandingBalance(outstanding)
                .totalPaid(totalPaid)
                .status(c.getStatus() != null ? c.getStatus().name() : "UNKNOWN")
                .contractDate(c.getStartDate())
                .contractDateHijri(safeHijriString(c.getStartDate()))
                .maturityDate(c.getMaturityDate())
                .maturityDateHijri(safeHijriString(c.getMaturityDate()))
                .originalTenureMonths(c.getTenorMonths() != null ? c.getTenorMonths() : 0)
                .completionPercentage(completion)
                .shariahInfo(ShariahInfoDTO.builder()
                        .contractType("MURABAHA")
                        .contractTypeAr("\u0645\u0631\u0627\u0628\u062d\u0629")
                        .complianceStatus("COMPLIANT")
                        .build())
                .murabahaDetail(MurabahaPortalDTO.builder()
                        .costPrice(c.getCostPrice())
                        .sellingPrice(c.getSellingPrice())
                        .profitAmount(c.getMarkupAmount())
                        .profitRate(c.getMarkupRate())
                        .totalPrincipalPaid(totalPaid)
                        .totalProfitPaid(safe(c.getRecognisedProfit()))
                        .remainingPrincipal(outstanding)
                        .remainingProfit(safe(c.getUnrecognisedProfit()))
                        .assetDescription(c.getAssetDescription())
                        .schedule(loadMurabahaSchedule(contractId))
                        .build())
                .build();
    }

    private IslamicFinancingDetailDTO buildIjarahDetail(Long customerId, Long contractId, String language) {
        IjarahResponses.IjarahContractResponse c = ijarahContractService.getContract(contractId);

        return IslamicFinancingDetailDTO.builder()
                .financingId(String.valueOf(c.getId()))
                .contractReference(c.getContractRef())
                .contractType("IJARAH")
                .productCode(c.getProductCode())
                .productName(terminologyService.translate("Ijarah Lease", "FINANCING", language))
                .originalAmount(c.getAssetAcquisitionCost())
                .outstandingBalance(c.getAssetResidualValue())
                .currency(c.getCurrencyCode())
                .status(c.getStatus() != null ? c.getStatus().name() : "UNKNOWN")
                .contractDate(c.getLeaseStartDate())
                .contractDateHijri(safeHijriString(c.getLeaseStartDate()))
                .maturityDate(c.getLeaseEndDate())
                .maturityDateHijri(safeHijriString(c.getLeaseEndDate()))
                .originalTenureMonths(c.getTenorMonths() != null ? c.getTenorMonths() : 0)
                .shariahInfo(ShariahInfoDTO.builder()
                        .contractType("IJARAH")
                        .contractTypeAr("\u0625\u062c\u0627\u0631\u0629")
                        .complianceStatus("COMPLIANT")
                        .build())
                .ijarahDetail(IjarahPortalDTO.builder()
                        .assetCost(c.getAssetAcquisitionCost())
                        .residualValue(c.getAssetResidualValue())
                        .assetDescription(c.getAssetDescription())
                        .schedule(loadIjarahSchedule(contractId))
                        .build())
                .build();
    }

    private IslamicFinancingDetailDTO buildMusharakahDetail(Long customerId, Long contractId, String language) {
        MusharakahResponses.MusharakahContractResponse c = musharakahContractService.getContract(contractId);

        BigDecimal customerPct = c.getTotalCapital() != null && c.getTotalCapital().signum() > 0
                ? safe(c.getCustomerCapitalContribution()).multiply(BigDecimal.valueOf(100))
                        .divide(c.getTotalCapital(), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        BigDecimal bankPct = BigDecimal.valueOf(100).subtract(customerPct);

        return IslamicFinancingDetailDTO.builder()
                .financingId(String.valueOf(c.getId()))
                .contractReference(c.getContractRef())
                .contractType("MUSHARAKAH")
                .productCode(c.getProductCode())
                .productName(terminologyService.translate("Diminishing Musharakah", "FINANCING", language))
                .originalAmount(c.getTotalCapital())
                .outstandingBalance(c.getBankCapitalContribution())
                .currency(c.getCurrencyCode())
                .status(c.getStatus() != null ? c.getStatus().name() : "UNKNOWN")
                .shariahInfo(ShariahInfoDTO.builder()
                        .contractType("MUSHARAKAH")
                        .contractTypeAr("\u0645\u0634\u0627\u0631\u0643\u0629 \u0645\u062a\u0646\u0627\u0642\u0635\u0629")
                        .complianceStatus("COMPLIANT")
                        .build())
                .musharakahDetail(MusharakahPortalDTO.builder()
                        .totalAssetValue(c.getAssetCurrentMarketValue())
                        .customerEquity(c.getCustomerCapitalContribution())
                        .bankEquity(c.getBankCapitalContribution())
                        .customerOwnershipPercentage(customerPct)
                        .bankOwnershipPercentage(bankPct)
                        .totalUnits(c.getTotalOwnershipUnits() != null ? c.getTotalOwnershipUnits() : 0)
                        .assetDescription(c.getAssetDescription())
                        .schedule(loadMusharakahSchedule(contractId))
                        .build())
                .build();
    }

    // ── Early Settlement internals ───────────────────────────────────────

    private EarlySettlementPortalDTO buildMurabahaEarlySettlement(Long contractId, LocalDate settlementDate) {
        EarlySettlementQuote quote = murabahaContractService.calculateEarlySettlement(contractId, settlementDate);
        return EarlySettlementPortalDTO.builder()
                .financingId(String.valueOf(quote.getContractId()))
                .contractType("MURABAHA")
                .outstandingBalance(quote.getOutstandingPrincipal())
                .totalRemainingProfit(quote.getUnrecognisedProfit())
                .ibraAmount(quote.getIbraAmount())
                .earlySettlementAmount(quote.getSettlementAmount())
                .quoteValidUntil(quote.getSettlementDate())
                .quoteValidUntilHijri(safeHijriString(quote.getSettlementDate()))
                .ibraApplied(quote.getIbraAmount() != null && quote.getIbraAmount().signum() > 0)
                .build();
    }

    private EarlySettlementPortalDTO buildMusharakahEarlyBuyout(Long contractId, LocalDate settlementDate) {
        MusharakahResponses.EarlyBuyoutQuote quote = musharakahContractService.calculateEarlyBuyout(contractId, settlementDate);
        return EarlySettlementPortalDTO.builder()
                .financingId(String.valueOf(quote.getContractId()))
                .contractType("MUSHARAKAH")
                .earlySettlementAmount(quote.getTotalAmount())
                .outstandingBalance(quote.getBuyoutAmount())
                .build();
    }

    // ── Repayment Summary internals ──────────────────────────────────────

    private RepaymentSummaryDTO buildMurabahaRepaymentSummary(Long contractId) {
        MurabahaContractResponse c = murabahaContractService.getContract(contractId);
        BigDecimal totalPaid = safe(c.getRecognisedProfit());
        BigDecimal totalDue = safe(c.getSellingPrice());
        BigDecimal completion = totalDue.signum() > 0
                ? totalPaid.multiply(BigDecimal.valueOf(100)).divide(totalDue, 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return RepaymentSummaryDTO.builder()
                .financingId(String.valueOf(c.getId()))
                .contractType("MURABAHA")
                .totalAmountDue(totalDue)
                .totalPaid(totalPaid)
                .totalProfitPaid(safe(c.getRecognisedProfit()))
                .completionPercentage(completion)
                .currency(null)
                .build();
    }

    private RepaymentSummaryDTO buildIjarahRepaymentSummary(Long contractId) {
        IjarahResponses.IjarahContractResponse c = ijarahContractService.getContract(contractId);
        BigDecimal totalPaid = safe(c.getTotalRentalsReceived());
        BigDecimal totalDue = safe(c.getTotalRentalsExpected());
        BigDecimal completion = totalDue.signum() > 0
                ? totalPaid.multiply(BigDecimal.valueOf(100)).divide(totalDue, 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        return RepaymentSummaryDTO.builder()
                .financingId(String.valueOf(c.getId()))
                .contractType("IJARAH")
                .totalAmountDue(totalDue)
                .totalPaid(totalPaid)
                .totalProfitPaid(safe(c.getTotalRentalsReceived()).subtract(safe(c.getAssetResidualValue()).signum() > 0
                        ? safe(c.getAssetResidualValue()) : BigDecimal.ZERO))
                .completionPercentage(completion)
                .currency(c.getCurrencyCode())
                .build();
    }

    private RepaymentSummaryDTO buildMusharakahRepaymentSummary(Long contractId) {
        MusharakahResponses.MusharakahContractResponse c = musharakahContractService.getContract(contractId);
        BigDecimal totalRentalPaid = safe(c.getTotalRentalReceived());
        BigDecimal totalBuyoutPaid = safe(c.getTotalBuyoutPaymentsReceived());
        BigDecimal totalPaid = totalRentalPaid.add(totalBuyoutPaid);
        BigDecimal totalDue = safe(c.getTotalCapital());
        BigDecimal completion = totalDue.signum() > 0
                ? totalPaid.multiply(BigDecimal.valueOf(100)).divide(totalDue, 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        return RepaymentSummaryDTO.builder()
                .financingId(String.valueOf(c.getId()))
                .contractType("MUSHARAKAH")
                .totalAmountDue(totalDue)
                .totalPaid(totalPaid)
                .totalProfitPaid(totalRentalPaid)
                .completionPercentage(completion)
                .currency(c.getCurrencyCode())
                .build();
    }

    // ── Summary loaders ──────────────────────────────────────────────────

    private List<IslamicFinancingSummaryDTO> loadMurabahaSummaries(Long customerId, String language) {
        try {
            return murabahaContractService.getCustomerContracts(customerId).stream()
                    .map(c -> {
                        BigDecimal outstanding = safe(c.getFinancedAmount()).subtract(safe(c.getRecognisedProfit()));
                        BigDecimal completion = safe(c.getSellingPrice()).signum() > 0
                                ? safe(c.getRecognisedProfit()).multiply(BigDecimal.valueOf(100))
                                        .divide(safe(c.getSellingPrice()), 2, RoundingMode.HALF_UP)
                                : BigDecimal.ZERO;
                        return IslamicFinancingSummaryDTO.builder()
                                .financingId(String.valueOf(c.getId()))
                                .contractType("MURABAHA")
                                .productName(terminologyService.translate("Murabaha Financing", "FINANCING", language))
                                .originalAmount(c.getSellingPrice())
                                .outstandingBalance(outstanding)
                                .status(c.getStatus() != null ? c.getStatus().name() : "UNKNOWN")
                                .completionPercentage(completion)
                                .remainingTenureMonths(c.getTenorMonths() != null ? c.getTenorMonths() : 0)
                                .build();
                    })
                    .toList();
        } catch (Exception ex) {
            log.warn("Failed to load Murabaha contracts for customer {}: {}", customerId, ex.getMessage());
            return Collections.emptyList();
        }
    }

    private List<IslamicFinancingSummaryDTO> loadIjarahSummaries(Long customerId, String language) {
        try {
            return ijarahContractService.getCustomerContracts(customerId).stream()
                    .map(c -> IslamicFinancingSummaryDTO.builder()
                            .financingId(String.valueOf(c.getId()))
                            .contractType("IJARAH")
                            .productName(terminologyService.translate("Ijarah Lease", "FINANCING", language))
                            .originalAmount(c.getAssetAcquisitionCost())
                            .outstandingBalance(c.getAssetResidualValue())
                            .currency(c.getCurrencyCode())
                            .status(c.getStatus() != null ? c.getStatus().name() : "UNKNOWN")
                            .remainingTenureMonths(c.getTenorMonths() != null ? c.getTenorMonths() : 0)
                            .build())
                    .toList();
        } catch (Exception ex) {
            log.warn("Failed to load Ijarah contracts for customer {}: {}", customerId, ex.getMessage());
            return Collections.emptyList();
        }
    }

    private List<IslamicFinancingSummaryDTO> loadMusharakahSummaries(Long customerId, String language) {
        try {
            return musharakahContractService.getCustomerContracts(customerId).stream()
                    .map(c -> IslamicFinancingSummaryDTO.builder()
                            .financingId(String.valueOf(c.getId()))
                            .contractType("MUSHARAKAH")
                            .productName(terminologyService.translate("Diminishing Musharakah", "FINANCING", language))
                            .originalAmount(c.getTotalCapital())
                            .outstandingBalance(c.getBankCapitalContribution())
                            .currency(c.getCurrencyCode())
                            .status(c.getStatus() != null ? c.getStatus().name() : "UNKNOWN")
                            .build())
                    .toList();
        } catch (Exception ex) {
            log.warn("Failed to load Musharakah contracts for customer {}: {}", customerId, ex.getMessage());
            return Collections.emptyList();
        }
    }

    // ── Schedule loaders ─────────────────────────────────────────────────

    private List<InstallmentScheduleDTO> loadMurabahaSchedule(Long contractId) {
        try {
            List<MurabahaInstallment> installments = murabahaScheduleService.getSchedule(contractId);
            return installments.stream()
                    .map(i -> InstallmentScheduleDTO.builder()
                            .installmentNumber(i.getInstallmentNumber())
                            .dueDate(i.getDueDate() != null ? i.getDueDate().toString() : null)
                            .dueDateHijri(i.getDueDateHijri())
                            .principalPortion(i.getPrincipalComponent())
                            .profitPortion(i.getProfitComponent())
                            .totalAmount(i.getTotalInstallmentAmount())
                            .outstandingAfter(i.getOutstandingPrincipalAfter())
                            .status(i.getStatus() != null ? i.getStatus().name() : null)
                            .build())
                    .toList();
        } catch (Exception ex) {
            log.warn("Failed to load Murabaha schedule for contract {}: {}", contractId, ex.getMessage());
            return Collections.emptyList();
        }
    }

    private List<RentalScheduleDTO> loadIjarahSchedule(Long contractId) {
        try {
            List<IjarahRentalInstallment> installments = ijarahRentalService.getSchedule(contractId);
            return installments.stream()
                    .map(i -> RentalScheduleDTO.builder()
                            .periodNumber(i.getInstallmentNumber())
                            .dueDate(i.getDueDate() != null ? i.getDueDate().toString() : null)
                            .dueDateHijri(i.getDueDateHijri())
                            .rentalAmount(i.getNetRentalAmount())
                            .maintenanceReserve(i.getMaintenanceComponent())
                            .totalAmount(i.getRentalAmount())
                            .status(i.getStatus() != null ? i.getStatus().name() : null)
                            .build())
                    .toList();
        } catch (Exception ex) {
            log.warn("Failed to load Ijarah schedule for contract {}: {}", contractId, ex.getMessage());
            return Collections.emptyList();
        }
    }

    private List<CombinedScheduleDTO> loadMusharakahSchedule(Long contractId) {
        try {
            List<MusharakahBuyoutInstallment> installments = musharakahBuyoutService.getSchedule(contractId);
            return installments.stream()
                    .map(i -> CombinedScheduleDTO.builder()
                            .periodNumber(i.getInstallmentNumber())
                            .dueDate(i.getDueDate() != null ? i.getDueDate().toString() : null)
                            .dueDateHijri(i.getDueDateHijri())
                            .acquisitionPortion(i.getTotalBuyoutAmount())
                            .totalAmount(i.getTotalBuyoutAmount())
                            .ownershipPercentageAfter(i.getBankPercentageAfter())
                            .status(i.getStatus() != null ? i.getStatus().name() : null)
                            .build())
                    .toList();
        } catch (Exception ex) {
            log.warn("Failed to load Musharakah schedule for contract {}: {}", contractId, ex.getMessage());
            return Collections.emptyList();
        }
    }

    // ── Utilities ────────────────────────────────────────────────────────

    private String safeHijriString(LocalDate date) {
        if (date == null) return null;
        try {
            HijriDateResponse hijri = hijriCalendarService.toHijri(date);
            return hijri.getHijriDay() + " " + hijri.getHijriMonthName() + " " + hijri.getHijriYear();
        } catch (Exception ex) {
            log.debug("Hijri conversion failed for {}: {}", date, ex.getMessage());
            return null;
        }
    }

    private static BigDecimal safe(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private static String safeUpper(String value) {
        return value != null ? value.toUpperCase().trim() : "";
    }
}
