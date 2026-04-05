package com.cbs.trustservices.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.gl.entity.JournalEntry;
import com.cbs.gl.service.GeneralLedgerService;
import com.cbs.trustservices.entity.TrustAccount;
import com.cbs.trustservices.repository.TrustAccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TrustService {

    private static final String GL_TRUST_CORPUS = "2300010";
    private static final String GL_BENEFICIARY_DISTRIBUTION = "2300020";
    private static final String GL_TAX_WITHHOLDING = "2300030";

    /** Default withholding tax rate on trust distributions. */
    private static final BigDecimal DEFAULT_TAX_RATE = new BigDecimal("0.15");

    private final TrustAccountRepository trustRepository;
    private final GeneralLedgerService generalLedgerService;
    private final CurrentActorProvider currentActorProvider;

    // ── Create ──────────────────────────────────────────────────────────────

    @Transactional
    public TrustAccount create(TrustAccount trust) {
        // Validate required fields
        if (trust.getGrantorCustomerId() == null) {
            throw new BusinessException("Grantor customer ID is required", "MISSING_GRANTOR");
        }
        if (trust.getCorpusValue() == null || trust.getCorpusValue().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Corpus amount must be greater than zero", "INVALID_CORPUS_AMOUNT");
        }
        if (!StringUtils.hasText(trust.getTrustName())) {
            throw new BusinessException("Trust name is required", "MISSING_TRUST_NAME");
        }
        if (!StringUtils.hasText(trust.getTrustType())) {
            throw new BusinessException("Trust type is required", "MISSING_TRUST_TYPE");
        }

        // Validate beneficiary allocations if provided
        if (trust.getBeneficiaries() != null && !trust.getBeneficiaries().isEmpty()) {
            validateBeneficiaryAllocations(trust.getBeneficiaries());
        }

        trust.setTrustCode("TRS-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        trust.setStatus("PENDING");
        if (trust.getDistributionsYtd() == null) {
            trust.setDistributionsYtd(BigDecimal.ZERO);
        }
        if (trust.getIncomeYtd() == null) {
            trust.setIncomeYtd(BigDecimal.ZERO);
        }
        if (trust.getInceptionDate() == null) {
            trust.setInceptionDate(LocalDate.now());
        }
        TrustAccount saved = trustRepository.save(trust);
        log.info("Trust created: code={}, grantor={}, corpus={}, actor={}",
                saved.getTrustCode(), saved.getGrantorCustomerId(),
                saved.getCorpusValue(), currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Activate ────────────────────────────────────────────────────────────

    @Transactional
    public TrustAccount activateTrust(String trustCode) {
        TrustAccount trust = getByCode(trustCode);
        if (!"PENDING".equals(trust.getStatus())) {
            throw new BusinessException(
                    "Only PENDING trusts can be activated; current status: " + trust.getStatus(),
                    "INVALID_TRUST_STATUS");
        }
        trust.setStatus("ACTIVE");
        TrustAccount saved = trustRepository.save(trust);
        log.info("Trust activated: code={}, actor={}", trustCode, currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Terminate ───────────────────────────────────────────────────────────

    @Transactional
    public TrustAccount terminateTrust(String trustCode) {
        TrustAccount trust = getByCode(trustCode);
        if (!"ACTIVE".equals(trust.getStatus())) {
            throw new BusinessException(
                    "Only ACTIVE trusts can be terminated; current status: " + trust.getStatus(),
                    "INVALID_TRUST_STATUS");
        }
        trust.setStatus("TERMINATED");
        trust.setTerminationDate(LocalDate.now());
        TrustAccount saved = trustRepository.save(trust);
        log.info("Trust terminated: code={}, terminationDate={}, actor={}",
                trustCode, trust.getTerminationDate(), currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Distribution with Beneficiary Allocation and Tax Withholding ────────

    @Transactional
    public TrustAccount recordDistribution(String trustCode, BigDecimal amount) {
        TrustAccount trust = getByCode(trustCode);
        if (!"ACTIVE".equals(trust.getStatus())) {
            throw new BusinessException(
                    "Distributions can only be made from ACTIVE trusts; current status: " + trust.getStatus(),
                    "INVALID_TRUST_STATUS");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Distribution amount must be greater than zero", "INVALID_DISTRIBUTION_AMOUNT");
        }
        if (trust.getCorpusValue().compareTo(amount) < 0) {
            throw new BusinessException(
                    String.format("Distribution amount %s exceeds corpus value %s", amount, trust.getCorpusValue()),
                    "DISTRIBUTION_EXCEEDS_CORPUS");
        }

        // Calculate tax withholding
        BigDecimal taxRate = determineTaxRate(trust);
        BigDecimal taxAmount = amount.multiply(taxRate).setScale(2, RoundingMode.HALF_UP);
        BigDecimal netDistribution = amount.subtract(taxAmount);

        trust.setDistributionsYtd(trust.getDistributionsYtd().add(amount));
        trust.setCorpusValue(trust.getCorpusValue().subtract(amount));

        // GL posting: Debit Trust Corpus GL, Credit Beneficiary Distribution GL (net), Credit Tax Withholding GL
        String narration = String.format("Trust distribution - %s amount %s (tax %s)", trustCode, amount, taxAmount);
        List<GeneralLedgerService.JournalLineRequest> journalLines = new ArrayList<>();
        journalLines.add(new GeneralLedgerService.JournalLineRequest(
                GL_TRUST_CORPUS,
                amount, BigDecimal.ZERO,
                trust.getCurrency(), BigDecimal.ONE,
                narration, null, null, null, trust.getGrantorCustomerId()));
        journalLines.add(new GeneralLedgerService.JournalLineRequest(
                GL_BENEFICIARY_DISTRIBUTION,
                BigDecimal.ZERO, netDistribution,
                trust.getCurrency(), BigDecimal.ONE,
                narration, null, null, null, trust.getGrantorCustomerId()));

        if (taxAmount.compareTo(BigDecimal.ZERO) > 0) {
            journalLines.add(new GeneralLedgerService.JournalLineRequest(
                    GL_TAX_WITHHOLDING,
                    BigDecimal.ZERO, taxAmount,
                    trust.getCurrency(), BigDecimal.ONE,
                    "Tax withholding on trust distribution - " + trustCode,
                    null, null, null, trust.getGrantorCustomerId()));
        }

        JournalEntry journal = generalLedgerService.postJournal(
                "TRUST",
                narration,
                "TRUST_SERVICES",
                trustCode + "-DIST-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
                LocalDate.now(),
                currentActorProvider.getCurrentActor(),
                journalLines
        );

        TrustAccount saved = trustRepository.save(trust);
        log.info("Trust distribution recorded: code={}, gross={}, tax={}, net={}, corpusAfter={}, journalId={}, actor={}",
                trustCode, amount, taxAmount, netDistribution, trust.getCorpusValue(), journal.getId(),
                currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Beneficiary-based Distribution ──────────────────────────────────────

    @Transactional
    public Map<String, Object> distributeToAllBeneficiaries(String trustCode, BigDecimal totalAmount) {
        TrustAccount trust = getByCode(trustCode);
        if (!"ACTIVE".equals(trust.getStatus())) {
            throw new BusinessException("Distributions can only be made from ACTIVE trusts", "INVALID_TRUST_STATUS");
        }
        if (totalAmount == null || totalAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Distribution amount must be greater than zero", "INVALID_DISTRIBUTION_AMOUNT");
        }
        if (trust.getCorpusValue().compareTo(totalAmount) < 0) {
            throw new BusinessException(
                    String.format("Total distribution %s exceeds corpus value %s", totalAmount, trust.getCorpusValue()),
                    "DISTRIBUTION_EXCEEDS_CORPUS");
        }
        if (trust.getBeneficiaries() == null || trust.getBeneficiaries().isEmpty()) {
            throw new BusinessException("No beneficiaries configured for this trust", "NO_BENEFICIARIES");
        }

        validateBeneficiaryAllocations(trust.getBeneficiaries());
        BigDecimal taxRate = determineTaxRate(trust);

        List<Map<String, Object>> allocations = new ArrayList<>();
        BigDecimal distributed = BigDecimal.ZERO;

        for (int i = 0; i < trust.getBeneficiaries().size(); i++) {
            Map<String, Object> beneficiary = trust.getBeneficiaries().get(i);
            String beneficiaryName = String.valueOf(beneficiary.getOrDefault("name", "Beneficiary-" + (i + 1)));
            BigDecimal allocationPct = new BigDecimal(String.valueOf(beneficiary.getOrDefault("allocationPct", "0")));

            BigDecimal grossShare = totalAmount.multiply(allocationPct)
                    .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            BigDecimal taxOnShare = grossShare.multiply(taxRate).setScale(2, RoundingMode.HALF_UP);
            BigDecimal netShare = grossShare.subtract(taxOnShare);

            Map<String, Object> allocation = new LinkedHashMap<>();
            allocation.put("beneficiary", beneficiaryName);
            allocation.put("allocationPct", allocationPct);
            allocation.put("grossAmount", grossShare);
            allocation.put("taxWithheld", taxOnShare);
            allocation.put("netAmount", netShare);
            allocations.add(allocation);
            distributed = distributed.add(grossShare);
        }

        // Record the distribution
        recordDistribution(trustCode, distributed);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("trustCode", trustCode);
        result.put("totalGross", distributed);
        result.put("taxRate", taxRate);
        result.put("allocations", allocations);
        result.put("distributedBy", currentActorProvider.getCurrentActor());
        result.put("distributedAt", LocalDate.now().toString());

        log.info("Distribution to all beneficiaries: trust={}, total={}, beneficiaryCount={}, actor={}",
                trustCode, distributed, allocations.size(), currentActorProvider.getCurrentActor());
        return result;
    }

    // ── Distribution Schedule Management ────────────────────────────────────

    @Transactional
    public TrustAccount updateDistributionRules(String trustCode, Map<String, Object> distributionRules) {
        TrustAccount trust = getByCode(trustCode);
        if ("TERMINATED".equals(trust.getStatus())) {
            throw new BusinessException("Cannot update distribution rules for a terminated trust", "TRUST_TERMINATED");
        }

        // Validate distribution rules
        if (distributionRules == null) {
            throw new BusinessException("Distribution rules cannot be null", "MISSING_DISTRIBUTION_RULES");
        }
        String frequency = (String) distributionRules.get("frequency");
        if (frequency != null) {
            List<String> validFrequencies = List.of("MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL", "ON_DEMAND");
            if (!validFrequencies.contains(frequency)) {
                throw new BusinessException("Invalid distribution frequency: " + frequency, "INVALID_FREQUENCY");
            }
        }

        trust.setDistributionRules(distributionRules);
        TrustAccount saved = trustRepository.save(trust);
        log.info("Distribution rules updated: trust={}, rules={}, actor={}",
                trustCode, distributionRules, currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Beneficiary Management ──────────────────────────────────────────────

    @Transactional
    public TrustAccount updateBeneficiaries(String trustCode, List<Map<String, Object>> beneficiaries) {
        TrustAccount trust = getByCode(trustCode);
        if ("TERMINATED".equals(trust.getStatus())) {
            throw new BusinessException("Cannot update beneficiaries for a terminated trust", "TRUST_TERMINATED");
        }
        validateBeneficiaryAllocations(beneficiaries);
        trust.setBeneficiaries(beneficiaries);
        TrustAccount saved = trustRepository.save(trust);
        log.info("Beneficiaries updated: trust={}, count={}, actor={}",
                trustCode, beneficiaries.size(), currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Regulatory Reporting ────────────────────────────────────────────────

    public Map<String, Object> generateRegulatoryReport(String trustCode) {
        TrustAccount trust = getByCode(trustCode);
        Map<String, Object> report = new LinkedHashMap<>();
        report.put("trustCode", trust.getTrustCode());
        report.put("trustName", trust.getTrustName());
        report.put("trustType", trust.getTrustType());
        report.put("status", trust.getStatus());
        report.put("grantorCustomerId", trust.getGrantorCustomerId());
        report.put("trusteeName", trust.getTrusteeName());
        report.put("trusteeType", trust.getTrusteeType());
        report.put("currency", trust.getCurrency());
        report.put("corpusValue", trust.getCorpusValue());
        report.put("incomeYtd", trust.getIncomeYtd());
        report.put("distributionsYtd", trust.getDistributionsYtd());
        report.put("taxId", trust.getTaxId());
        report.put("inceptionDate", trust.getInceptionDate());
        report.put("terminationDate", trust.getTerminationDate());
        report.put("beneficiaryCount", trust.getBeneficiaries() != null ? trust.getBeneficiaries().size() : 0);
        report.put("annualFeePct", trust.getAnnualFeePct());
        report.put("reportGeneratedAt", LocalDate.now().toString());
        report.put("generatedBy", currentActorProvider.getCurrentActor());

        // Calculate estimated annual tax obligation
        BigDecimal taxRate = determineTaxRate(trust);
        BigDecimal estimatedTax = trust.getDistributionsYtd().multiply(taxRate).setScale(2, RoundingMode.HALF_UP);
        report.put("estimatedTaxWithheld", estimatedTax);
        report.put("applicableTaxRate", taxRate);

        log.info("Regulatory report generated: trust={}, actor={}", trustCode, currentActorProvider.getCurrentActor());
        return report;
    }

    public List<Map<String, Object>> generatePortfolioReport(Long grantorCustomerId) {
        List<TrustAccount> trusts = trustRepository
                .findByGrantorCustomerIdAndStatusOrderByTrustNameAsc(grantorCustomerId, "ACTIVE");
        List<Map<String, Object>> reports = new ArrayList<>();
        for (TrustAccount trust : trusts) {
            reports.add(generateRegulatoryReport(trust.getTrustCode()));
        }
        return reports;
    }

    // ── Queries ─────────────────────────────────────────────────────────────

    public TrustAccount getByCode(String code) {
        return trustRepository.findByTrustCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("TrustAccount", "trustCode", code));
    }

    public List<TrustAccount> getByGrantor(Long grantorCustomerId) {
        return trustRepository.findByGrantorCustomerIdAndStatusOrderByTrustNameAsc(grantorCustomerId, "ACTIVE");
    }

    public List<TrustAccount> getByType(String trustType) {
        return trustRepository.findByTrustTypeAndStatusOrderByTrustNameAsc(trustType, "ACTIVE");
    }

    public List<TrustAccount> getAllTrusts() {
        return trustRepository.findAll();
    }

    @Transactional
    public TrustAccount updateTrust(String code, TrustAccount updates) {
        TrustAccount trust = getByCode(code);
        if ("TERMINATED".equals(trust.getStatus())) {
            throw new BusinessException("Cannot update a terminated trust", "TRUST_TERMINATED");
        }
        if (updates.getTrustName() != null) trust.setTrustName(updates.getTrustName());
        if (updates.getTrusteeName() != null) trust.setTrusteeName(updates.getTrusteeName());
        if (updates.getTrusteeType() != null) trust.setTrusteeType(updates.getTrusteeType());
        if (updates.getInvestmentPolicy() != null) trust.setInvestmentPolicy(updates.getInvestmentPolicy());
        if (updates.getDistributionRules() != null) trust.setDistributionRules(updates.getDistributionRules());
        if (updates.getBeneficiaries() != null) {
            validateBeneficiaryAllocations(updates.getBeneficiaries());
            trust.setBeneficiaries(updates.getBeneficiaries());
        }
        if (updates.getAnnualFeePct() != null) trust.setAnnualFeePct(updates.getAnnualFeePct());
        if (updates.getTaxId() != null) trust.setTaxId(updates.getTaxId());
        log.info("Trust updated: code={}, actor={}", code, currentActorProvider.getCurrentActor());
        return trustRepository.save(trust);
    }

    // ── Private Helpers ─────────────────────────────────────────────────────

    private void validateBeneficiaryAllocations(List<Map<String, Object>> beneficiaries) {
        if (beneficiaries == null || beneficiaries.isEmpty()) {
            return;
        }
        BigDecimal totalPct = BigDecimal.ZERO;
        for (Map<String, Object> b : beneficiaries) {
            if (!b.containsKey("name") || !StringUtils.hasText(String.valueOf(b.get("name")))) {
                throw new BusinessException("Each beneficiary must have a name", "MISSING_BENEFICIARY_NAME");
            }
            Object pctObj = b.get("allocationPct");
            if (pctObj == null) {
                throw new BusinessException("Each beneficiary must have an allocationPct", "MISSING_ALLOCATION_PCT");
            }
            BigDecimal pct = new BigDecimal(String.valueOf(pctObj));
            if (pct.compareTo(BigDecimal.ZERO) <= 0 || pct.compareTo(new BigDecimal("100")) > 0) {
                throw new BusinessException(
                        "Allocation percentage must be between 0 and 100: " + pct,
                        "INVALID_ALLOCATION_PCT");
            }
            totalPct = totalPct.add(pct);
        }
        if (totalPct.compareTo(new BigDecimal("100")) != 0) {
            throw new BusinessException(
                    String.format("Beneficiary allocation percentages must total 100%%; current total: %s%%", totalPct),
                    "ALLOCATION_NOT_100_PCT");
        }
    }

    private BigDecimal determineTaxRate(TrustAccount trust) {
        // Charitable trusts may be tax-exempt
        if ("CHARITABLE".equalsIgnoreCase(trust.getTrustType())) {
            return BigDecimal.ZERO;
        }
        // Distribution rules may override the default tax rate
        if (trust.getDistributionRules() != null) {
            Object customRate = trust.getDistributionRules().get("taxWithholdingRate");
            if (customRate != null) {
                return new BigDecimal(String.valueOf(customRate));
            }
        }
        return DEFAULT_TAX_RATE;
    }
}
