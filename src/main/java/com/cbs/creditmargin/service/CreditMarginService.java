package com.cbs.creditmargin.service;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.creditmargin.entity.*; import com.cbs.creditmargin.repository.*;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal; import java.math.RoundingMode; import java.time.LocalDate; import java.util.List; import java.util.Set; import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class CreditMarginService {
    private final MarginCallRepository callRepository;
    private final CollateralPositionRepository collateralRepository;
    private final CurrentActorProvider currentActorProvider;

    private static final Set<String> VALID_COLLATERAL_TYPES = Set.of("CASH", "GOVERNMENT_BOND", "CORPORATE_BOND", "EQUITY", "LETTER_OF_CREDIT", "GUARANTEE");

    @Transactional
    public MarginCall issueMarginCall(MarginCall call) {
        if (call.getCounterpartyCode() == null || call.getCounterpartyCode().isBlank()) {
            throw new BusinessException("Counterparty code is required", "MISSING_COUNTERPARTY");
        }
        if (call.getCallAmount() == null || call.getCallAmount().signum() <= 0) {
            throw new BusinessException("Call amount must be positive", "INVALID_CALL_AMOUNT");
        }
        // Duplicate call check: same counterparty + same date + same call amount
        List<MarginCall> existingCalls = callRepository.findByCounterpartyCodeOrderByCallDateDesc(call.getCounterpartyCode());
        boolean duplicate = existingCalls.stream().anyMatch(c ->
                "ISSUED".equals(c.getStatus())
                && call.getCallAmount().compareTo(c.getCallAmount()) == 0
                && c.getCallDate() != null && c.getCallDate().equals(call.getCallDate()));
        if (duplicate) {
            throw new BusinessException("Duplicate margin call: same counterparty, date, and amount already exists", "DUPLICATE_MARGIN_CALL");
        }
        call.setCallRef("MC-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        call.setStatus("ISSUED");
        if (call.getSettledAmount() == null) call.setSettledAmount(BigDecimal.ZERO);
        MarginCall saved = callRepository.save(call);
        log.info("AUDIT: Margin call issued: ref={}, counterparty={}, amount={}, actor={}",
                saved.getCallRef(), saved.getCounterpartyCode(), saved.getCallAmount(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public MarginCall acknowledgeCall(String callRef) {
        MarginCall c = getCallByRef(callRef);
        if (!"ISSUED".equals(c.getStatus())) {
            throw new BusinessException("Margin call " + callRef + " must be ISSUED to acknowledge; current: " + c.getStatus(), "INVALID_STATUS");
        }
        c.setStatus("ACKNOWLEDGED");
        MarginCall saved = callRepository.save(c);
        log.info("AUDIT: Margin call acknowledged: ref={}, actor={}", callRef, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public MarginCall settleCall(String callRef, BigDecimal agreedAmount, String collateralType) {
        MarginCall c = getCallByRef(callRef);
        // Collateral type validation
        if (collateralType != null && !VALID_COLLATERAL_TYPES.contains(collateralType)) {
            throw new BusinessException("Invalid collateral type: " + collateralType + ". Valid: " + VALID_COLLATERAL_TYPES, "INVALID_COLLATERAL_TYPE");
        }
        if (agreedAmount == null || agreedAmount.signum() <= 0) {
            throw new BusinessException("Agreed amount must be positive", "INVALID_AGREED_AMOUNT");
        }
        c.setAgreedAmount(agreedAmount);
        c.setCollateralType(collateralType);
        // Null safety on settledAmount
        BigDecimal currentSettled = c.getSettledAmount() != null ? c.getSettledAmount() : BigDecimal.ZERO;
        c.setSettledAmount(currentSettled.add(agreedAmount));
        c.setStatus(c.getSettledAmount().compareTo(c.getCallAmount()) >= 0 ? "SETTLED" : "PARTIALLY_SETTLED");

        // Deadline enforcement: check if past response deadline
        if (c.getResponseDeadline() != null && LocalDate.now().isAfter(c.getResponseDeadline())) {
            log.warn("AUDIT: Margin call {} settled past deadline ({}), escalation recommended", callRef, c.getResponseDeadline());
        }

        MarginCall saved = callRepository.save(c);
        log.info("AUDIT: Margin call settled: ref={}, agreed={}, totalSettled={}, status={}, actor={}",
                callRef, agreedAmount, c.getSettledAmount(), c.getStatus(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public CollateralPosition recordCollateral(CollateralPosition pos) {
        if (pos.getCollateralType() != null && !VALID_COLLATERAL_TYPES.contains(pos.getCollateralType())) {
            throw new BusinessException("Invalid collateral type: " + pos.getCollateralType(), "INVALID_COLLATERAL_TYPE");
        }
        pos.setPositionCode("CLP-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        if (pos.getMarketValue() != null && pos.getHaircutPct() != null) {
            pos.setAdjustedValue(pos.getMarketValue().multiply(
                    BigDecimal.ONE.subtract(pos.getHaircutPct().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP))));
        }
        CollateralPosition saved = collateralRepository.save(pos);
        log.info("AUDIT: Collateral position recorded: code={}, type={}, value={}, actor={}",
                saved.getPositionCode(), saved.getCollateralType(), saved.getMarketValue(), currentActorProvider.getCurrentActor());
        return saved;
    }

    public List<MarginCall> getByCounterparty(String code) { return callRepository.findByCounterpartyCodeOrderByCallDateDesc(code); }
    public List<MarginCall> getOpenCalls() { return callRepository.findByStatusInOrderByCallDateDesc(List.of("ISSUED", "ACKNOWLEDGED", "AGREED", "DISPUTED", "PARTIALLY_SETTLED")); }
    public MarginCall getCallByRef(String ref) { return callRepository.findByCallRef(ref).orElseThrow(() -> new ResourceNotFoundException("MarginCall", "callRef", ref)); }
    public List<CollateralPosition> getAllCollateralPositions() { return collateralRepository.findAll(); }
}
