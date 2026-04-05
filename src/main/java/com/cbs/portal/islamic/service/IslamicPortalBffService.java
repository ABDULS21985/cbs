package com.cbs.portal.islamic.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionJournal;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.TransactionJournalRepository;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.hijri.dto.HijriDateResponse;
import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.ijarah.dto.IjarahResponses;
import com.cbs.ijarah.service.IjarahContractService;
import com.cbs.mudarabah.dto.MudarabahAccountResponse;
import com.cbs.mudarabah.service.MudarabahAccountService;
import com.cbs.murabaha.dto.MurabahaContractResponse;
import com.cbs.murabaha.service.MurabahaContractService;
import com.cbs.musharakah.dto.MusharakahResponses;
import com.cbs.musharakah.service.MusharakahContractService;
import com.cbs.portal.islamic.dto.IslamicPortalDtos.*;
import com.cbs.portal.islamic.entity.IslamicPortalConfig;
import com.cbs.portal.islamic.repository.IslamicPortalConfigRepository;
import com.cbs.wadiah.dto.WadiahAccountResponse;
import com.cbs.wadiah.service.WadiahAccountService;
import com.cbs.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * BFF aggregation service for Capability 1 — Islamic Account Views.
 * Aggregates data from Wadiah, Mudarabah, Murabaha, Ijarah, and Musharakah
 * services and applies Islamic terminology, Hijri dates, and bilingual content.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class IslamicPortalBffService {

    private final CustomerRepository customerRepository;
    private final WadiahAccountService wadiahAccountService;
    private final MudarabahAccountService mudarabahAccountService;
    private final MurabahaContractService murabahaContractService;
    private final IjarahContractService ijarahContractService;
    private final MusharakahContractService musharakahContractService;
    private final HijriCalendarService hijriCalendarService;
    private final IslamicTerminologyService terminologyService;
    private final IslamicPortalConfigRepository portalConfigRepository;
    private final AccountRepository accountRepository;
    private final TransactionJournalRepository transactionJournalRepository;

    // ── Dashboard ───────────────────────────────────���────────────────────

    public IslamicAccountDashboardDTO getDashboard(Long customerId, String language) {
        Customer customer = findCustomerOrThrow(customerId);
        IslamicPortalConfig config = loadConfig();
        String lang = resolveLang(language, config);

        // Greeting
        String greeting = "AR".equals(lang) ? "\u0627\u0644\u0633\u0644\u0627\u0645 \u0639\u0644\u064a\u0643\u0645" : "Welcome";
        String customerName = greeting + ", " + Objects.toString(customer.getFirstName(), "") + " " + Objects.toString(customer.getLastName(), "");

        // Accounts
        List<IslamicAccountSummaryDTO> accounts = new ArrayList<>();
        accounts.addAll(loadWadiahSummaries(customerId, lang));
        accounts.addAll(loadMudarabahSummaries(customerId, lang));

        // Financings
        List<IslamicFinancingSummaryDTO> financings = new ArrayList<>();
        financings.addAll(loadMurabahaSummaries(customerId, lang));
        financings.addAll(loadIjarahSummaries(customerId, lang));
        financings.addAll(loadMusharakahSummaries(customerId, lang));

        BigDecimal totalDeposits = accounts.stream()
                .map(a -> a.getAvailableBalance() != null ? a.getAvailableBalance() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalFinancing = financings.stream()
                .map(f -> f.getOutstandingBalance() != null ? f.getOutstandingBalance() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        String lastLoginHijri = safeHijriString(LocalDate.now());

        return IslamicAccountDashboardDTO.builder()
                .customerName(customerName)
                .customerNameAr(customer.getFirstName())
                .customerId(String.valueOf(customerId))
                .lastLoginDate(LocalDate.now().toString())
                .lastLoginHijri(lastLoginHijri)
                .accounts(accounts)
                .financings(financings)
                .cards(Collections.emptyList())
                .quickActions(buildQuickActions(lang))
                .notifications(Collections.emptyList())
                .totalDeposits(totalDeposits)
                .totalFinancingOutstanding(totalFinancing)
                .currency("SAR")
                .build();
    }

    // ── Account Detail ───────────────────────────────────────────────────

    public IslamicAccountDetailDTO getAccountDetail(Long customerId, Long accountId, String language) {
        findCustomerOrThrow(customerId);
        IslamicPortalConfig config = loadConfig();
        String lang = resolveLang(language, config);

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", accountId));

        IslamicAccountDetailDTO.IslamicAccountDetailDTOBuilder builder = IslamicAccountDetailDTO.builder()
                .accountId(String.valueOf(account.getId()))
                .accountNumber(account.getAccountNumber())
                .accountName(account.getAccountName())
                .availableBalance(account.getAvailableBalance())
                .currentBalance(account.getBookBalance())
                .holdBalance(account.getLienAmount())
                .currency(account.getCurrencyCode())
                .status(account.getStatus() != null ? account.getStatus().name() : "UNKNOWN")
                .openDate(account.getOpenedDate())
                .openDateHijri(safeHijriString(account.getOpenedDate()));

        // Load Wadiah-specific detail
        try {
            List<WadiahAccountResponse> wadiahAccounts = wadiahAccountService.getCustomerWadiahAccounts(customerId);
            wadiahAccounts.stream()
                    .filter(w -> Objects.equals(w.getAccountId(), accountId))
                    .findFirst()
                    .ifPresent(w -> {
                        builder.contractType("WADIAH");
                        builder.productCode(w.getProductCode());
                        builder.productName(w.getProductName());
                        builder.zakatEligible(Boolean.TRUE.equals(w.getZakatApplicable()));
                        builder.wadiahDetail(WadiahAccountDetailDTO.builder()
                                .guaranteedPrincipal(Boolean.TRUE.equals(w.getPrincipalGuaranteed()))
                                .lastHibahAmount(w.getTotalHibahReceived())
                                .lastHibahDate(w.getLastHibahDistributionDate() != null ?
                                        w.getLastHibahDistributionDate().toString() : null)
                                .ytdHibah(w.getTotalHibahReceived())
                                .hibahHistory(Collections.emptyList())
                                .build());
                    });
        } catch (Exception ex) {
            log.warn("Failed to load Wadiah detail for account {}: {}", accountId, ex.getMessage());
        }

        // Load Mudarabah-specific detail
        try {
            List<MudarabahAccountResponse> mudarabahAccounts = mudarabahAccountService.getCustomerMudarabahAccounts(customerId);
            mudarabahAccounts.stream()
                    .filter(m -> Objects.equals(m.getAccountId(), accountId))
                    .findFirst()
                    .ifPresent(m -> {
                        builder.contractType("MUDARABAH");
                        builder.productName(m.getPoolName());
                        builder.mudarabahDetail(MudarabahAccountDetailDTO.builder()
                                .profitSharingRatio(m.getProfitSharingRatioCustomer())
                                .indicativeRate(m.getIndicativeProfitRate())
                                .lastProfitAmount(m.getLastProfitDistributionAmount())
                                .lastProfitDate(m.getLastProfitDistributionDate() != null ?
                                        m.getLastProfitDistributionDate().toString() : null)
                                .ytdProfit(m.getCumulativeProfitReceived())
                                .investmentPool(m.getPoolName())
                                .profitHistory(Collections.emptyList())
                                .build());
                    });
        } catch (Exception ex) {
            log.warn("Failed to load Mudarabah detail for account {}: {}", accountId, ex.getMessage());
        }

        // Recent transactions
        builder.recentTransactions(getMiniStatement(customerId, accountId, lang));

        return builder.build();
    }

    // ── Transaction History ──────────────────────────────────────────────

    public Page<IslamicTransactionDTO> getTransactionHistory(Long customerId, Long accountId,
                                                              int page, int size, String language) {
        findCustomerOrThrow(customerId);
        IslamicPortalConfig config = loadConfig();
        String lang = resolveLang(language, config);

        String contractType = resolveContractType(customerId, accountId);

        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<TransactionJournal> journalPage = transactionJournalRepository.findByAccountIdOrderByCreatedAtDesc(accountId, pageable);

        List<IslamicTransactionDTO> dtos = journalPage.getContent().stream()
                .map(txn -> mapTransaction(txn, contractType, lang))
                .toList();

        return new PageImpl<>(dtos, pageable, journalPage.getTotalElements());
    }

    // ── Mini Statement ───────────────────────────────────────────────────

    public List<IslamicTransactionDTO> getMiniStatement(Long customerId, Long accountId, String language) {
        findCustomerOrThrow(customerId);
        IslamicPortalConfig config = loadConfig();
        String lang = resolveLang(language, config);

        String contractType = resolveContractType(customerId, accountId);

        PageRequest pageable = PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<TransactionJournal> journalPage = transactionJournalRepository.findByAccountIdOrderByCreatedAtDesc(accountId, pageable);

        return journalPage.getContent().stream()
                .map(txn -> mapTransaction(txn, contractType, lang))
                .toList();
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private Customer findCustomerOrThrow(Long customerId) {
        return customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));
    }

    private IslamicPortalConfig loadConfig() {
        return portalConfigRepository.findByTenantIdIsNull()
                .orElse(IslamicPortalConfig.builder().build());
    }

    private String resolveLang(String requested, IslamicPortalConfig config) {
        if (StringUtils.hasText(requested)) {
            return requested.toUpperCase().startsWith("AR") ? "AR" : "EN";
        }
        return config.getDefaultLanguage() != null ? config.getDefaultLanguage() : "EN";
    }

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

    private String resolveContractType(Long customerId, Long accountId) {
        try {
            List<WadiahAccountResponse> wadiahAccounts = wadiahAccountService.getCustomerWadiahAccounts(customerId);
            if (wadiahAccounts.stream().anyMatch(w -> Objects.equals(w.getAccountId(), accountId))) {
                return "WADIAH";
            }
        } catch (Exception ignored) { }
        try {
            List<MudarabahAccountResponse> mudAccounts = mudarabahAccountService.getCustomerMudarabahAccounts(customerId);
            if (mudAccounts.stream().anyMatch(m -> Objects.equals(m.getAccountId(), accountId))) {
                return "MUDARABAH";
            }
        } catch (Exception ignored) { }
        return "GENERAL";
    }

    private IslamicTransactionDTO mapTransaction(TransactionJournal txn, String contractType, String lang) {
        String desc = txn.getNarration() != null ? txn.getNarration() : "";
        String translatedDesc = terminologyService.translateTransactionDescription(desc, contractType, lang);

        return IslamicTransactionDTO.builder()
                .transactionId(String.valueOf(txn.getId()))
                .accountId(txn.getAccount() != null ? String.valueOf(txn.getAccount().getId()) : null)
                .transactionDate(txn.getPostingDate())
                .valueDate(txn.getValueDate())
                .transactionDateHijri(safeHijriString(txn.getPostingDate()))
                .description(translatedDesc)
                .descriptionAr("AR".equals(lang) ? translatedDesc :
                        terminologyService.translateTransactionDescription(desc, contractType, "AR"))
                .amount(txn.getAmount())
                .currency(txn.getCurrencyCode())
                .type(txn.getTransactionType() != null ? txn.getTransactionType().name() : null)
                .runningBalance(txn.getRunningBalance())
                .reference(txn.getTransactionRef())
                .channel(txn.getChannel() != null ? txn.getChannel().name() : null)
                .build();
    }

    // ── Account summary loaders ────────────────────────────��─────────────

    private List<IslamicAccountSummaryDTO> loadWadiahSummaries(Long customerId, String lang) {
        try {
            return wadiahAccountService.getCustomerWadiahAccounts(customerId).stream()
                    .map(w -> IslamicAccountSummaryDTO.builder()
                            .accountId(String.valueOf(w.getAccountId()))
                            .accountNumber(w.getAccountNumber())
                            .accountName(w.getCustomerName())
                            .contractType("WADIAH")
                            .productName(w.getProductName())
                            .availableBalance(w.getAvailableBalance())
                            .currentBalance(w.getBookBalance())
                            .currency(w.getCurrencyCode())
                            .status(w.getStatus())
                            .lastHibahAmount(w.getTotalHibahReceived())
                            .lastProfitDate(w.getLastHibahDistributionDate() != null ?
                                    w.getLastHibahDistributionDate().toString() : null)
                            .zakatEligible(Boolean.TRUE.equals(w.getZakatApplicable()))
                            .build())
                    .toList();
        } catch (Exception ex) {
            log.warn("Failed to load Wadiah accounts for customer {}: {}", customerId, ex.getMessage());
            return Collections.emptyList();
        }
    }

    private List<IslamicAccountSummaryDTO> loadMudarabahSummaries(Long customerId, String lang) {
        try {
            return mudarabahAccountService.getCustomerMudarabahAccounts(customerId).stream()
                    .map(m -> IslamicAccountSummaryDTO.builder()
                            .accountId(String.valueOf(m.getAccountId()))
                            .accountNumber(m.getAccountNumber())
                            .accountName(m.getPoolName())
                            .contractType("MUDARABAH")
                            .productName(m.getPoolName())
                            .availableBalance(m.getAvailableBalance())
                            .currentBalance(m.getBookBalance())
                            .currency("SAR")
                            .status(m.getStatus())
                            .indicativeRate(m.getIndicativeProfitRate())
                            .lastHibahAmount(m.getLastProfitDistributionAmount())
                            .lastProfitDate(m.getLastProfitDistributionDate() != null ?
                                    m.getLastProfitDistributionDate().toString() : null)
                            .zakatEligible(false)
                            .build())
                    .toList();
        } catch (Exception ex) {
            log.warn("Failed to load Mudarabah accounts for customer {}: {}", customerId, ex.getMessage());
            return Collections.emptyList();
        }
    }

    // ── Financing summary loaders ────────────────────────────────────────

    private List<IslamicFinancingSummaryDTO> loadMurabahaSummaries(Long customerId, String lang) {
        try {
            return murabahaContractService.getCustomerContracts(customerId).stream()
                    .map(c -> {
                        BigDecimal outstanding = c.getFinancedAmount() != null ?
                                c.getFinancedAmount().subtract(
                                        c.getRecognisedProfit() != null ? c.getRecognisedProfit() : BigDecimal.ZERO)
                                : BigDecimal.ZERO;
                        BigDecimal completion = c.getSellingPrice() != null && c.getSellingPrice().signum() > 0 ?
                                c.getRecognisedProfit().multiply(BigDecimal.valueOf(100))
                                        .divide(c.getSellingPrice(), 2, java.math.RoundingMode.HALF_UP) : BigDecimal.ZERO;
                        return IslamicFinancingSummaryDTO.builder()
                                .financingId(String.valueOf(c.getId()))
                                .contractType("MURABAHA")
                                .productName(terminologyService.translate("Murabaha Financing", "FINANCING", lang))
                                .originalAmount(c.getSellingPrice())
                                .outstandingBalance(outstanding)
                                .currency(null)
                                .status(c.getStatus() != null ? c.getStatus().name() : "UNKNOWN")
                                .completionPercentage(completion)
                                .remainingTenureMonths(c.getTenorMonths() != null ? c.getTenorMonths() : 0)
                                .nextPaymentDate(c.getFirstInstallmentDate() != null ?
                                        c.getFirstInstallmentDate().toString() : null)
                                .nextPaymentHijri(safeHijriString(c.getFirstInstallmentDate()))
                                .build();
                    })
                    .toList();
        } catch (Exception ex) {
            log.warn("Failed to load Murabaha contracts for customer {}: {}", customerId, ex.getMessage());
            return Collections.emptyList();
        }
    }

    private List<IslamicFinancingSummaryDTO> loadIjarahSummaries(Long customerId, String lang) {
        try {
            return ijarahContractService.getCustomerContracts(customerId).stream()
                    .map(c -> IslamicFinancingSummaryDTO.builder()
                            .financingId(String.valueOf(c.getId()))
                            .contractType("IJARAH")
                            .productName(terminologyService.translate("Ijarah Lease", "FINANCING", lang))
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

    private List<IslamicFinancingSummaryDTO> loadMusharakahSummaries(Long customerId, String lang) {
        try {
            return musharakahContractService.getCustomerContracts(customerId).stream()
                    .map(c -> IslamicFinancingSummaryDTO.builder()
                            .financingId(String.valueOf(c.getId()))
                            .contractType("MUSHARAKAH")
                            .productName(terminologyService.translate("Diminishing Musharakah", "FINANCING", lang))
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

    // ── Quick Actions ────────────────────────────────────────────────────

    private List<QuickAction> buildQuickActions(String lang) {
        return List.of(
                QuickAction.builder().code("TRANSFER").label("Transfer").labelAr("\u062a\u062d\u0648\u064a\u0644")
                        .icon("transfer").route("/transfer").enabled(true).build(),
                QuickAction.builder().code("PAY_BILLS").label("Pay Bills").labelAr("\u062f\u0641\u0639 \u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631")
                        .icon("bills").route("/bills").enabled(true).build(),
                QuickAction.builder().code("FINANCING").label("Apply for Financing").labelAr("\u062a\u0642\u062f\u064a\u0645 \u0637\u0644\u0628 \u062a\u0645\u0648\u064a\u0644")
                        .icon("financing").route("/marketplace").enabled(true).build(),
                QuickAction.builder().code("ZAKAT").label("Zakat Calculator").labelAr("\u062d\u0627\u0633\u0628\u0629 \u0627\u0644\u0632\u0643\u0627\u0629")
                        .icon("zakat").route("/zakat").enabled(true).build()
        );
    }
}
