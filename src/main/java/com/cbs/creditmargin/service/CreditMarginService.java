package com.cbs.creditmargin.service;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.creditmargin.entity.*; import com.cbs.creditmargin.repository.*;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal; import java.math.RoundingMode; import java.util.List; import java.util.UUID;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class CreditMarginService {
    private final MarginCallRepository callRepository;
    private final CollateralPositionRepository collateralRepository;
    @Transactional public MarginCall issueMarginCall(MarginCall call) { call.setCallRef("MC-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase()); call.setStatus("ISSUED"); return callRepository.save(call); }
    @Transactional public MarginCall acknowledgeCall(String callRef) { MarginCall c = getCallByRef(callRef); c.setStatus("ACKNOWLEDGED"); return callRepository.save(c); }
    @Transactional public MarginCall settleCall(String callRef, BigDecimal agreedAmount, String collateralType) {
        MarginCall c = getCallByRef(callRef); c.setAgreedAmount(agreedAmount); c.setCollateralType(collateralType);
        c.setSettledAmount(c.getSettledAmount().add(agreedAmount));
        c.setStatus(c.getSettledAmount().compareTo(c.getCallAmount()) >= 0 ? "SETTLED" : "PARTIALLY_SETTLED");
        return callRepository.save(c);
    }
    @Transactional public CollateralPosition recordCollateral(CollateralPosition pos) {
        pos.setPositionCode("CLP-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        if (pos.getMarketValue() != null && pos.getHaircutPct() != null) pos.setAdjustedValue(pos.getMarketValue().multiply(BigDecimal.ONE.subtract(pos.getHaircutPct().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP))));
        return collateralRepository.save(pos);
    }
    public List<MarginCall> getByCounterparty(String code) { return callRepository.findByCounterpartyCodeOrderByCallDateDesc(code); }
    public List<MarginCall> getOpenCalls() { return callRepository.findByStatusInOrderByCallDateDesc(List.of("ISSUED", "ACKNOWLEDGED", "AGREED", "DISPUTED", "PARTIALLY_SETTLED")); }
    public MarginCall getCallByRef(String ref) { return callRepository.findByCallRef(ref).orElseThrow(() -> new ResourceNotFoundException("MarginCall", "callRef", ref)); }
}
