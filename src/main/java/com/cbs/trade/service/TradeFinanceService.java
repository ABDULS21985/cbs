package com.cbs.trade.service;

import com.cbs.account.entity.Account;
import com.cbs.account.repository.AccountRepository;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.trade.entity.*;
import com.cbs.trade.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TradeFinanceService {

    private final LetterOfCreditRepository lcRepository;
    private final BankGuaranteeRepository bgRepository;
    private final DocumentaryCollectionRepository dcRepository;
    private final SupplyChainProgrammeRepository scfRepository;
    private final ScfInvoiceRepository invoiceRepository;
    private final TradeDocumentRepository tradeDocRepository;
    private final CustomerRepository customerRepository;
    private final AccountRepository accountRepository;

    // ========================================================================
    // CAPABILITY 47: LETTERS OF CREDIT
    // ========================================================================

    @Transactional
    public LetterOfCredit issueLC(Long applicantId, LcType lcType, String beneficiaryName,
                                    BigDecimal amount, String currencyCode, LocalDate expiryDate,
                                    String goodsDescription, List<String> requiredDocuments,
                                    String paymentTerms, Integer tenorDays,
                                    Long marginAccountId, BigDecimal marginPercentage,
                                    BigDecimal commissionRate) {
        Customer applicant = customerRepository.findById(applicantId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", applicantId));

        Long seq = lcRepository.getNextLcSequence();
        String lcNumber = String.format("LC%012d", seq);

        BigDecimal marginAmt = amount.multiply(marginPercentage != null ? marginPercentage : new BigDecimal("100"))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal commissionAmt = commissionRate != null ?
                amount.multiply(commissionRate).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

        LetterOfCredit lc = LetterOfCredit.builder()
                .lcNumber(lcNumber).lcType(lcType).lcRole("ISSUING")
                .applicant(applicant).beneficiaryName(beneficiaryName)
                .amount(amount).currencyCode(currencyCode)
                .expiryDate(expiryDate).goodsDescription(goodsDescription)
                .requiredDocuments(requiredDocuments != null ? requiredDocuments : List.of())
                .paymentTerms(paymentTerms).tenorDays(tenorDays)
                .marginPercentage(marginPercentage != null ? marginPercentage : new BigDecimal("100"))
                .marginAmount(marginAmt)
                .commissionRate(commissionRate).commissionAmount(commissionAmt)
                .status(LcStatus.ISSUED).build();

        // Block margin on account
        if (marginAccountId != null) {
            Account marginAccount = accountRepository.findById(marginAccountId)
                    .orElseThrow(() -> new ResourceNotFoundException("Account", "id", marginAccountId));
            if (marginAccount.getAvailableBalance().compareTo(marginAmt.add(commissionAmt)) < 0) {
                throw new BusinessException("Insufficient balance for LC margin + commission", "INSUFFICIENT_BALANCE");
            }
            marginAccount.placeLien(marginAmt);
            marginAccount.debit(commissionAmt);
            accountRepository.save(marginAccount);
            lc.setMarginAccount(marginAccount);
        }

        LetterOfCredit saved = lcRepository.save(lc);
        log.info("LC issued: number={}, type={}, amount={} {}, beneficiary={}",
                lcNumber, lcType, amount, currencyCode, beneficiaryName);
        return saved;
    }

    @Transactional
    public LetterOfCredit settlePresentation(Long lcId, BigDecimal claimedAmount) {
        LetterOfCredit lc = lcRepository.findById(lcId)
                .orElseThrow(() -> new ResourceNotFoundException("LetterOfCredit", "id", lcId));

        if (claimedAmount.compareTo(lc.availableAmount()) > 0) {
            throw new BusinessException("Claimed amount exceeds LC available: " + lc.availableAmount(), "EXCEEDS_LC_AVAILABLE");
        }

        lc.utilize(claimedAmount);

        // Release margin proportionally and settle
        if (lc.getMarginAccount() != null) {
            BigDecimal marginRelease = claimedAmount.multiply(lc.getMarginPercentage())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            lc.getMarginAccount().releaseLien(marginRelease);
            lc.getMarginAccount().debit(claimedAmount);
            accountRepository.save(lc.getMarginAccount());
        }

        lcRepository.save(lc);
        log.info("LC presentation settled: lc={}, amount={}, remaining={}", lc.getLcNumber(), claimedAmount, lc.availableAmount());
        return lc;
    }

    public LetterOfCredit getLC(Long id) {
        return lcRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("LetterOfCredit", "id", id));
    }

    public Page<LetterOfCredit> getCustomerLCs(Long customerId, Pageable pageable) {
        return lcRepository.findByApplicantId(customerId, pageable);
    }

    @Transactional
    public int processExpiredLCs() {
        List<LetterOfCredit> expired = lcRepository.findExpiredLCs(LocalDate.now());
        for (LetterOfCredit lc : expired) {
            lc.setStatus(LcStatus.EXPIRED);
            if (lc.getMarginAccount() != null && lc.getMarginAmount().compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal unusedMargin = lc.availableAmount().multiply(lc.getMarginPercentage())
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                lc.getMarginAccount().releaseLien(unusedMargin);
                accountRepository.save(lc.getMarginAccount());
            }
            lcRepository.save(lc);
        }
        log.info("Expired {} LCs", expired.size());
        return expired.size();
    }

    // ========================================================================
    // CAPABILITY 48: BANK GUARANTEES
    // ========================================================================

    @Transactional
    public BankGuarantee issueGuarantee(Long applicantId, GuaranteeType guaranteeType,
                                          String beneficiaryName, BigDecimal amount, String currencyCode,
                                          LocalDate expiryDate, String purpose, Boolean autoExtend,
                                          Integer extensionPeriodDays, Long marginAccountId,
                                          BigDecimal marginPercentage, BigDecimal commissionRate) {
        Customer applicant = customerRepository.findById(applicantId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", applicantId));

        Long seq = bgRepository.getNextBgSequence();
        String bgNumber = String.format("BG%012d", seq);

        BigDecimal marginAmt = amount.multiply(marginPercentage != null ? marginPercentage : new BigDecimal("100"))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        BankGuarantee bg = BankGuarantee.builder()
                .guaranteeNumber(bgNumber).guaranteeType(guaranteeType)
                .applicant(applicant).beneficiaryName(beneficiaryName)
                .amount(amount).currencyCode(currencyCode)
                .expiryDate(expiryDate).purpose(purpose)
                .autoExtend(autoExtend != null ? autoExtend : false)
                .extensionPeriodDays(extensionPeriodDays)
                .marginPercentage(marginPercentage != null ? marginPercentage : new BigDecimal("100"))
                .marginAmount(marginAmt)
                .commissionRate(commissionRate)
                .commissionAmount(commissionRate != null ? amount.multiply(commissionRate)
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO)
                .status(GuaranteeStatus.ISSUED).build();

        if (marginAccountId != null) {
            Account marginAccount = accountRepository.findById(marginAccountId)
                    .orElseThrow(() -> new ResourceNotFoundException("Account", "id", marginAccountId));
            marginAccount.placeLien(marginAmt);
            if (bg.getCommissionAmount().compareTo(BigDecimal.ZERO) > 0) {
                marginAccount.debit(bg.getCommissionAmount());
            }
            accountRepository.save(marginAccount);
            bg.setMarginAccount(marginAccount);
        }

        BankGuarantee saved = bgRepository.save(bg);
        log.info("Guarantee issued: number={}, type={}, amount={} {}", bgNumber, guaranteeType, amount, currencyCode);
        return saved;
    }

    @Transactional
    public BankGuarantee processGuaranteeClaim(Long bgId, BigDecimal claimAmount) {
        BankGuarantee bg = bgRepository.findById(bgId)
                .orElseThrow(() -> new ResourceNotFoundException("BankGuarantee", "id", bgId));

        if (claimAmount.compareTo(bg.getAmount().subtract(bg.getClaimedAmount())) > 0) {
            throw new BusinessException("Claim exceeds available guarantee amount", "EXCEEDS_GUARANTEE");
        }

        bg.processClaim(claimAmount);

        if (bg.getMarginAccount() != null) {
            bg.getMarginAccount().releaseLien(claimAmount.min(bg.getMarginAmount()));
            bg.getMarginAccount().debit(claimAmount);
            accountRepository.save(bg.getMarginAccount());
        }

        bgRepository.save(bg);
        log.info("Guarantee claim processed: bg={}, amount={}", bg.getGuaranteeNumber(), claimAmount);
        return bg;
    }

    public BankGuarantee getGuarantee(Long id) {
        return bgRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("BankGuarantee", "id", id));
    }

    public Page<BankGuarantee> getCustomerGuarantees(Long customerId, Pageable pageable) {
        return bgRepository.findByApplicantId(customerId, pageable);
    }

    @Transactional
    public int processExpiredGuarantees() {
        List<BankGuarantee> expired = bgRepository.findExpiredGuarantees(LocalDate.now());
        for (BankGuarantee bg : expired) {
            bg.setStatus(GuaranteeStatus.EXPIRED);
            if (bg.getMarginAccount() != null) {
                bg.getMarginAccount().releaseLien(bg.getMarginAmount());
                accountRepository.save(bg.getMarginAccount());
            }
            bgRepository.save(bg);
        }

        List<BankGuarantee> forExtension = bgRepository.findForAutoExtension(LocalDate.now());
        for (BankGuarantee bg : forExtension) {
            int days = bg.getExtensionPeriodDays() != null ? bg.getExtensionPeriodDays() : 365;
            bg.setExpiryDate(bg.getExpiryDate().plusDays(days));
            bgRepository.save(bg);
            log.info("Guarantee auto-extended: bg={}, new expiry={}", bg.getGuaranteeNumber(), bg.getExpiryDate());
        }

        return expired.size() + forExtension.size();
    }

    // ========================================================================
    // CAPABILITY 49: DOCUMENTARY COLLECTIONS
    // ========================================================================

    @Transactional
    public DocumentaryCollection createCollection(Long drawerCustomerId, String collectionType,
                                                     String draweeName, BigDecimal amount, String currencyCode,
                                                     List<String> documents, Integer tenorDays) {
        Customer drawer = customerRepository.findById(drawerCustomerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", drawerCustomerId));

        Long seq = dcRepository.getNextDcSequence();
        String collNumber = String.format("DC%012d", seq);

        DocumentaryCollection dc = DocumentaryCollection.builder()
                .collectionNumber(collNumber).collectionType(collectionType).collectionRole("REMITTING")
                .drawer(drawer).draweeName(draweeName)
                .amount(amount).currencyCode(currencyCode)
                .documentsList(documents != null ? documents : List.of())
                .tenorDays(tenorDays).status("RECEIVED").build();

        if ("DA".equals(collectionType) && tenorDays != null) {
            dc.setMaturityDate(LocalDate.now().plusDays(tenorDays));
        }

        DocumentaryCollection saved = dcRepository.save(dc);
        log.info("Documentary collection created: number={}, type={}, amount={}", collNumber, collectionType, amount);
        return saved;
    }

    @Transactional
    public DocumentaryCollection settleCollection(Long dcId, BigDecimal paidAmount) {
        DocumentaryCollection dc = dcRepository.findById(dcId)
                .orElseThrow(() -> new ResourceNotFoundException("DocumentaryCollection", "id", dcId));
        dc.setPaidAmount(paidAmount);
        dc.setPaidDate(LocalDate.now());
        dc.setStatus(paidAmount.compareTo(dc.getAmount()) >= 0 ? "PAID" : "PRESENTED");
        log.info("Collection settled: number={}, paid={}", dc.getCollectionNumber(), paidAmount);
        return dcRepository.save(dc);
    }

    // ========================================================================
    // CAPABILITY 50: SUPPLY CHAIN FINANCE
    // ========================================================================

    @Transactional
    public SupplyChainProgramme createScfProgramme(Long anchorCustomerId, ScfProgrammeType type,
                                                      String programmeName, BigDecimal limit,
                                                      String currencyCode, LocalDate expiryDate,
                                                      BigDecimal discountRate) {
        Customer anchor = customerRepository.findById(anchorCustomerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", anchorCustomerId));

        Long seq = scfRepository.getNextProgrammeSequence();
        String code = String.format("SCF%08d", seq);

        SupplyChainProgramme programme = SupplyChainProgramme.builder()
                .programmeCode(code).programmeName(programmeName).programmeType(type)
                .anchorCustomer(anchor).programmeLimit(limit).availableAmount(limit)
                .currencyCode(currencyCode).discountRate(discountRate)
                .expiryDate(expiryDate).status("ACTIVE").build();

        SupplyChainProgramme saved = scfRepository.save(programme);
        log.info("SCF programme created: code={}, type={}, limit={}", code, type, limit);
        return saved;
    }

    @Transactional
    public ScfInvoice financeInvoice(Long programmeId, String invoiceNumber, Long sellerId,
                                       Long buyerId, BigDecimal invoiceAmount, String currencyCode,
                                       LocalDate invoiceDate, LocalDate dueDate) {
        SupplyChainProgramme programme = scfRepository.findById(programmeId)
                .orElseThrow(() -> new ResourceNotFoundException("SupplyChainProgramme", "id", programmeId));

        if (invoiceAmount.compareTo(programme.getAvailableAmount()) > 0) {
            throw new BusinessException("Invoice amount exceeds programme available: " + programme.getAvailableAmount(),
                    "EXCEEDS_PROGRAMME_LIMIT");
        }

        // Calculate discount
        long daysToMaturity = java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), dueDate);
        BigDecimal discountAmt = invoiceAmount.multiply(programme.getDiscountRate())
                .multiply(BigDecimal.valueOf(daysToMaturity))
                .divide(BigDecimal.valueOf(36500), 2, RoundingMode.HALF_UP);
        BigDecimal netPayment = invoiceAmount.subtract(discountAmt);

        ScfInvoice invoice = ScfInvoice.builder()
                .programme(programme).invoiceNumber(invoiceNumber)
                .invoiceAmount(invoiceAmount).currencyCode(currencyCode)
                .invoiceDate(invoiceDate).dueDate(dueDate)
                .financedAmount(invoiceAmount).discountAmount(discountAmt).netPayment(netPayment)
                .financingDate(LocalDate.now()).status("FINANCED").build();

        if (sellerId != null) invoice.setSeller(customerRepository.findById(sellerId).orElse(null));
        if (buyerId != null) invoice.setBuyer(customerRepository.findById(buyerId).orElse(null));

        programme.utilize(invoiceAmount);
        scfRepository.save(programme);

        ScfInvoice saved = invoiceRepository.save(invoice);
        log.info("Invoice financed: programme={}, invoice={}, amount={}, discount={}, net={}",
                programme.getProgrammeCode(), invoiceNumber, invoiceAmount, discountAmt, netPayment);
        return saved;
    }

    // ========================================================================
    // CAPABILITY 51: TRADE DOCUMENT DIGITISATION
    // ========================================================================

    @Transactional
    public TradeDocument uploadTradeDocument(TradeDocCategory category, Long lcId, Long collectionId,
                                               Long customerId, String fileName, String fileType,
                                               String storagePath, Long fileSizeBytes) {
        String ref = "TD-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase();

        TradeDocument doc = TradeDocument.builder()
                .documentRef(ref).documentCategory(category)
                .lcId(lcId).collectionId(collectionId).customerId(customerId)
                .fileName(fileName).fileType(fileType).storagePath(storagePath)
                .fileSizeBytes(fileSizeBytes)
                .extractionStatus("PENDING").verificationStatus("PENDING").build();

        TradeDocument saved = tradeDocRepository.save(doc);
        log.info("Trade document uploaded: ref={}, category={}, lc={}", ref, category, lcId);
        return saved;
    }

    @Transactional
    public TradeDocument completeExtraction(Long docId, Map<String, Object> extractedData, BigDecimal confidence) {
        TradeDocument doc = tradeDocRepository.findById(docId)
                .orElseThrow(() -> new ResourceNotFoundException("TradeDocument", "id", docId));
        doc.setExtractedData(extractedData);
        doc.setExtractionConfidence(confidence);
        doc.setExtractionStatus("COMPLETED");
        return tradeDocRepository.save(doc);
    }

    @Transactional
    public TradeDocument verifyTradeDocument(Long docId, String verifiedBy, boolean isCompliant, String notes) {
        TradeDocument doc = tradeDocRepository.findById(docId)
                .orElseThrow(() -> new ResourceNotFoundException("TradeDocument", "id", docId));
        doc.setVerificationStatus(isCompliant ? "VERIFIED" : "DISCREPANT");
        doc.setVerifiedBy(verifiedBy);
        doc.setDiscrepancyNotes(notes);
        return tradeDocRepository.save(doc);
    }

    public List<TradeDocument> getLcDocuments(Long lcId) { return tradeDocRepository.findByLcId(lcId); }
}
