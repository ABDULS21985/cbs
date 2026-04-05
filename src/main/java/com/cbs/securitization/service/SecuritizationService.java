package com.cbs.securitization.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.securitization.entity.SecuritizationVehicle;
import com.cbs.securitization.repository.SecuritizationVehicleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class SecuritizationService {

    private final SecuritizationVehicleRepository vehicleRepository;
    private final CurrentActorProvider actorProvider;

    /**
     * Valid status transitions:
     * STRUCTURING -> APPROVED -> ISSUED -> AMORTIZING -> MATURED
     * Any status -> CANCELLED (terminal)
     */
    private static final Map<String, Set<String>> VALID_TRANSITIONS = Map.of(
            "STRUCTURING", Set.of("APPROVED", "CANCELLED"),
            "APPROVED", Set.of("ISSUED", "CANCELLED"),
            "ISSUED", Set.of("AMORTIZING", "CANCELLED"),
            "AMORTIZING", Set.of("MATURED", "CANCELLED")
    );

    private static final Set<String> VALID_VEHICLE_TYPES = Set.of(
            "MBS", "ABS", "CLO", "CDO", "CMBS", "RMBS"
    );

    @Transactional
    public SecuritizationVehicle create(SecuritizationVehicle vehicle) {
        validateVehicle(vehicle);

        vehicle.setVehicleCode("SEC-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        vehicle.setStatus("STRUCTURING");
        vehicle.setCreatedAt(Instant.now());
        vehicle.setUpdatedAt(Instant.now());

        SecuritizationVehicle saved = vehicleRepository.save(vehicle);
        log.info("Securitization vehicle created by {}: code={}, type={}, pool={}",
                actorProvider.getCurrentActor(), saved.getVehicleCode(), saved.getVehicleType(), saved.getTotalPoolBalance());
        return saved;
    }

    @Transactional
    public SecuritizationVehicle approve(String vehicleCode) {
        SecuritizationVehicle v = getVehicle(vehicleCode);
        guardStatusTransition(v, "APPROVED");

        // Validate tranches are defined before approval
        if (v.getTranches() == null || v.getTranches().isEmpty()) {
            throw new BusinessException("Tranches must be defined before approval");
        }

        // Validate credit enhancement is specified
        if (v.getCreditEnhancementPct() == null || v.getCreditEnhancementPct().signum() <= 0) {
            throw new BusinessException("Credit enhancement percentage must be positive before approval");
        }

        v.setStatus("APPROVED");
        v.setUpdatedAt(Instant.now());
        log.info("Vehicle approved by {}: code={}", actorProvider.getCurrentActor(), vehicleCode);
        return vehicleRepository.save(v);
    }

    @Transactional
    public SecuritizationVehicle issue(String vehicleCode) {
        SecuritizationVehicle v = getVehicle(vehicleCode);
        guardStatusTransition(v, "ISSUED");

        v.setStatus("ISSUED");
        v.setIssueDate(LocalDate.now());
        v.setUpdatedAt(Instant.now());

        // Calculate total issued from tranche amounts
        if (v.getTranches() != null && !v.getTranches().isEmpty()) {
            BigDecimal totalIssued = calculateTotalIssuedFromTranches(v.getTranches());
            v.setTotalIssued(totalIssued);
        }

        log.info("Vehicle issued by {}: code={}, totalIssued={}", actorProvider.getCurrentActor(), vehicleCode, v.getTotalIssued());
        return vehicleRepository.save(v);
    }

    @Transactional
    public SecuritizationVehicle startAmortization(String vehicleCode) {
        SecuritizationVehicle v = getVehicle(vehicleCode);
        guardStatusTransition(v, "AMORTIZING");
        v.setStatus("AMORTIZING");
        v.setUpdatedAt(Instant.now());
        log.info("Vehicle amortization started by {}: code={}", actorProvider.getCurrentActor(), vehicleCode);
        return vehicleRepository.save(v);
    }

    @Transactional
    public SecuritizationVehicle mature(String vehicleCode) {
        SecuritizationVehicle v = getVehicle(vehicleCode);
        guardStatusTransition(v, "MATURED");
        v.setStatus("MATURED");
        v.setMaturityDate(LocalDate.now());
        v.setUpdatedAt(Instant.now());
        log.info("Vehicle matured by {}: code={}", actorProvider.getCurrentActor(), vehicleCode);
        return vehicleRepository.save(v);
    }

    @Transactional
    public SecuritizationVehicle cancel(String vehicleCode) {
        SecuritizationVehicle v = getVehicle(vehicleCode);
        if ("MATURED".equals(v.getStatus()) || "CANCELLED".equals(v.getStatus())) {
            throw new BusinessException("Cannot cancel a vehicle in status: " + v.getStatus());
        }
        v.setStatus("CANCELLED");
        v.setUpdatedAt(Instant.now());
        log.info("Vehicle cancelled by {}: code={}", actorProvider.getCurrentActor(), vehicleCode);
        return vehicleRepository.save(v);
    }

    /**
     * Sets up tranches for a securitization vehicle. Each tranche must have:
     * name, type (SENIOR/MEZZANINE/EQUITY), amount, couponRate, rating.
     * Validates that tranche amounts do not exceed total pool balance.
     */
    @Transactional
    public SecuritizationVehicle defineTranches(String vehicleCode, List<Map<String, Object>> tranches) {
        SecuritizationVehicle v = getVehicle(vehicleCode);
        if (!"STRUCTURING".equals(v.getStatus())) {
            throw new BusinessException("Tranches can only be defined during STRUCTURING phase");
        }
        if (tranches == null || tranches.isEmpty()) {
            throw new BusinessException("At least one tranche is required");
        }

        // Validate each tranche
        BigDecimal totalTrancheAmount = BigDecimal.ZERO;
        Set<String> validTrancheTypes = Set.of("SENIOR", "MEZZANINE", "EQUITY");
        boolean hasEquity = false;

        for (Map<String, Object> tranche : tranches) {
            if (tranche.get("name") == null) throw new BusinessException("Tranche name is required");
            String trancheType = (String) tranche.get("type");
            if (trancheType == null || !validTrancheTypes.contains(trancheType.toUpperCase())) {
                throw new BusinessException("Invalid tranche type: " + trancheType + ". Valid: " + validTrancheTypes);
            }
            if ("EQUITY".equalsIgnoreCase(trancheType)) hasEquity = true;

            Object amountObj = tranche.get("amount");
            if (amountObj == null) throw new BusinessException("Tranche amount is required");
            BigDecimal amount = new BigDecimal(amountObj.toString());
            if (amount.signum() <= 0) throw new BusinessException("Tranche amount must be positive");
            totalTrancheAmount = totalTrancheAmount.add(amount);
        }

        if (!hasEquity) {
            throw new BusinessException("At least one EQUITY tranche (first-loss piece) is required");
        }

        if (totalTrancheAmount.compareTo(v.getTotalPoolBalance()) > 0) {
            throw new BusinessException("Total tranche amount (" + totalTrancheAmount
                    + ") exceeds pool balance (" + v.getTotalPoolBalance() + ")");
        }

        v.setTranches(tranches);

        // Calculate credit enhancement as equity tranche / total pool
        BigDecimal equityAmount = BigDecimal.ZERO;
        for (Map<String, Object> tranche : tranches) {
            if ("EQUITY".equalsIgnoreCase((String) tranche.get("type"))) {
                equityAmount = equityAmount.add(new BigDecimal(tranche.get("amount").toString()));
            }
        }
        BigDecimal creditEnhancement = equityAmount.divide(v.getTotalPoolBalance(), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
        v.setCreditEnhancementPct(creditEnhancement);
        v.setUpdatedAt(Instant.now());

        log.info("Tranches defined by {}: code={}, trancheCount={}, creditEnhancement={}%",
                actorProvider.getCurrentActor(), vehicleCode, tranches.size(), creditEnhancement);
        return vehicleRepository.save(v);
    }

    /**
     * Performs waterfall distribution: allocates available cash flows to tranches
     * in order of seniority (senior first, then mezzanine, then equity).
     * Returns the distribution amounts per tranche.
     */
    public Map<String, Object> calculateWaterfallDistribution(String vehicleCode, BigDecimal availableCashFlow) {
        SecuritizationVehicle v = getVehicle(vehicleCode);
        if (v.getTranches() == null || v.getTranches().isEmpty()) {
            throw new BusinessException("No tranches defined for waterfall distribution");
        }
        if (availableCashFlow == null || availableCashFlow.signum() <= 0) {
            throw new BusinessException("Available cash flow must be positive");
        }

        // Sort tranches by seniority: SENIOR -> MEZZANINE -> EQUITY
        List<Map<String, Object>> sortedTranches = new ArrayList<>(v.getTranches());
        sortedTranches.sort((a, b) -> {
            int priorityA = getTranchePriority((String) a.get("type"));
            int priorityB = getTranchePriority((String) b.get("type"));
            return Integer.compare(priorityA, priorityB);
        });

        BigDecimal remaining = availableCashFlow;
        List<Map<String, Object>> distributions = new ArrayList<>();

        for (Map<String, Object> tranche : sortedTranches) {
            BigDecimal trancheAmount = new BigDecimal(tranche.get("amount").toString());
            Object couponObj = tranche.get("couponRate");
            BigDecimal couponRate = couponObj != null ? new BigDecimal(couponObj.toString()) : BigDecimal.ZERO;

            // Calculate required payment (coupon on outstanding balance)
            BigDecimal requiredPayment = trancheAmount.multiply(couponRate).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            BigDecimal allocated = remaining.min(requiredPayment);
            remaining = remaining.subtract(allocated);

            Map<String, Object> dist = new LinkedHashMap<>();
            dist.put("trancheName", tranche.get("name"));
            dist.put("trancheType", tranche.get("type"));
            dist.put("requiredPayment", requiredPayment);
            dist.put("allocatedAmount", allocated);
            dist.put("shortfall", requiredPayment.subtract(allocated).max(BigDecimal.ZERO));
            distributions.add(dist);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("vehicleCode", vehicleCode);
        result.put("availableCashFlow", availableCashFlow);
        result.put("distributedAmount", availableCashFlow.subtract(remaining));
        result.put("residualAmount", remaining);
        result.put("distributions", distributions);

        log.info("Waterfall distribution calculated by {}: code={}, distributed={}, residual={}",
                actorProvider.getCurrentActor(), vehicleCode, availableCashFlow.subtract(remaining), remaining);
        return result;
    }

    /**
     * Returns credit enhancement metrics for a vehicle.
     */
    public Map<String, Object> getCreditEnhancementMetrics(String vehicleCode) {
        SecuritizationVehicle v = getVehicle(vehicleCode);
        Map<String, Object> metrics = new LinkedHashMap<>();
        metrics.put("vehicleCode", vehicleCode);
        metrics.put("creditEnhancementPct", v.getCreditEnhancementPct());
        metrics.put("delinquency30dPct", v.getDelinquency30dPct());
        metrics.put("delinquency60dPct", v.getDelinquency60dPct());
        metrics.put("delinquency90dPct", v.getDelinquency90dPct());
        metrics.put("cumulativeLossPct", v.getCumulativeLossPct());
        metrics.put("prepaymentRateCpr", v.getPrepaymentRateCpr());

        // Calculate excess spread (WAC minus required tranche coupons)
        if (v.getWeightedAvgCoupon() != null && v.getTranches() != null) {
            BigDecimal totalWeightedCoupon = BigDecimal.ZERO;
            BigDecimal totalAmount = BigDecimal.ZERO;
            for (Map<String, Object> tranche : v.getTranches()) {
                BigDecimal amount = new BigDecimal(tranche.get("amount").toString());
                Object couponObj = tranche.get("couponRate");
                BigDecimal coupon = couponObj != null ? new BigDecimal(couponObj.toString()) : BigDecimal.ZERO;
                totalWeightedCoupon = totalWeightedCoupon.add(amount.multiply(coupon));
                totalAmount = totalAmount.add(amount);
            }
            if (totalAmount.signum() > 0) {
                BigDecimal weightedTrancheCoupon = totalWeightedCoupon.divide(totalAmount, 4, RoundingMode.HALF_UP);
                BigDecimal excessSpread = v.getWeightedAvgCoupon().subtract(weightedTrancheCoupon);
                metrics.put("weightedTrancheCoupon", weightedTrancheCoupon);
                metrics.put("excessSpread", excessSpread);
            }
        }

        return metrics;
    }

    public List<SecuritizationVehicle> getByType(String type) {
        return vehicleRepository.findByVehicleTypeAndStatusOrderByVehicleNameAsc(type, "ISSUED");
    }

    public List<SecuritizationVehicle> getActive() {
        return vehicleRepository.findByStatusOrderByVehicleNameAsc("ISSUED");
    }

    public SecuritizationVehicle getVehicle(String code) {
        return vehicleRepository.findByVehicleCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("SecuritizationVehicle", "vehicleCode", code));
    }

    // ---- private helpers ----

    private void validateVehicle(SecuritizationVehicle vehicle) {
        if (vehicle.getVehicleName() == null || vehicle.getVehicleName().isBlank()) {
            throw new BusinessException("Vehicle name is required");
        }
        if (vehicle.getVehicleType() == null || vehicle.getVehicleType().isBlank()) {
            throw new BusinessException("Vehicle type is required");
        }
        if (!VALID_VEHICLE_TYPES.contains(vehicle.getVehicleType().toUpperCase())) {
            throw new BusinessException("Invalid vehicle type: " + vehicle.getVehicleType()
                    + ". Valid: " + VALID_VEHICLE_TYPES);
        }
        if (vehicle.getUnderlyingAssetType() == null || vehicle.getUnderlyingAssetType().isBlank()) {
            throw new BusinessException("Underlying asset type is required");
        }
        if (vehicle.getTotalPoolBalance() == null || vehicle.getTotalPoolBalance().signum() <= 0) {
            throw new BusinessException("Total pool balance must be positive");
        }
        if (vehicle.getNumberOfAssets() == null || vehicle.getNumberOfAssets() <= 0) {
            throw new BusinessException("Number of assets must be positive");
        }
        if (vehicle.getCurrency() == null || vehicle.getCurrency().length() != 3) {
            throw new BusinessException("Currency must be a 3-letter ISO code");
        }
    }

    private void guardStatusTransition(SecuritizationVehicle vehicle, String targetStatus) {
        String currentStatus = vehicle.getStatus();
        Set<String> allowed = VALID_TRANSITIONS.getOrDefault(currentStatus, Set.of());
        if (!allowed.contains(targetStatus)) {
            throw new BusinessException("Invalid status transition from " + currentStatus + " to " + targetStatus
                    + ". Allowed transitions: " + allowed);
        }
    }

    private int getTranchePriority(String type) {
        if (type == null) return 99;
        return switch (type.toUpperCase()) {
            case "SENIOR" -> 1;
            case "MEZZANINE" -> 2;
            case "EQUITY" -> 3;
            default -> 99;
        };
    }

    private BigDecimal calculateTotalIssuedFromTranches(List<Map<String, Object>> tranches) {
        BigDecimal total = BigDecimal.ZERO;
        for (Map<String, Object> tranche : tranches) {
            Object amountObj = tranche.get("amount");
            if (amountObj != null) {
                total = total.add(new BigDecimal(amountObj.toString()));
            }
        }
        return total;
    }
}
