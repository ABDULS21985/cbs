package com.cbs.treasury.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.AccountStatus;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.branch.entity.Branch;
import com.cbs.branch.repository.BranchRepository;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.dealerdesk.entity.DealingDesk;
import com.cbs.dealerdesk.entity.DeskDealer;
import com.cbs.dealerdesk.entity.DeskPnl;
import com.cbs.dealerdesk.repository.DealingDeskRepository;
import com.cbs.dealerdesk.repository.DeskDealerRepository;
import com.cbs.dealerdesk.repository.DeskPnlRepository;
import com.cbs.dealerdesk.service.DealerDeskService;
import com.cbs.finstrument.entity.FinancialInstrument;
import com.cbs.finstrument.repository.FinancialInstrumentRepository;
import com.cbs.ftp.entity.FtpAllocation;
import com.cbs.ftp.entity.FtpRateCurve;
import com.cbs.ftp.repository.FtpAllocationRepository;
import com.cbs.ftp.repository.FtpRateCurveRepository;
import com.cbs.ftp.service.FtpService;
import com.cbs.islamicaml.dto.EntityScreeningRequest;
import com.cbs.islamicaml.service.CombinedEntityScreeningService;
import com.cbs.marketmaking.entity.MarketMakingActivity;
import com.cbs.marketmaking.entity.MarketMakingMandate;
import com.cbs.marketmaking.repository.MarketMakingActivityRepository;
import com.cbs.marketmaking.repository.MarketMakingMandateRepository;
import com.cbs.marketmaking.service.MarketMakingService;
import com.cbs.marketorder.entity.MarketOrder;
import com.cbs.marketorder.repository.MarketOrderRepository;
import com.cbs.marketorder.service.MarketOrderService;
import com.cbs.nostro.entity.CorrespondentBank;
import com.cbs.nostro.repository.CorrespondentBankRepository;
import com.cbs.orderexecution.entity.OrderExecution;
import com.cbs.orderexecution.repository.OrderExecutionRepository;
import com.cbs.traderposition.entity.TraderPosition;
import com.cbs.traderposition.repository.TraderPositionRepository;
import com.cbs.tradingbook.entity.TradingBookSnapshot;
import com.cbs.tradingbook.repository.TradingBookRepository;
import com.cbs.tradingbook.repository.TradingBookSnapshotRepository;
import com.cbs.tradingbook.service.TradingBookService;
import com.cbs.treasury.entity.DealStatus;
import com.cbs.treasury.entity.DealType;
import com.cbs.treasury.entity.TreasuryDeal;
import com.cbs.treasury.repository.TreasuryDealRepository;
import com.cbs.treasuryanalytics.entity.TreasuryAnalyticsSnapshot;
import com.cbs.treasuryanalytics.repository.TreasuryAnalyticsSnapshotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TreasuryService {

    private static final List<String> OPEN_ORDER_STATUSES = List.of("NEW", "VALIDATED", "ROUTED", "PARTIALLY_FILLED");

    private final TreasuryDealRepository dealRepository;
    private final AccountRepository accountRepository;
    private final CorrespondentBankRepository bankRepository;
    private final AccountPostingService accountPostingService;
    private final CurrentActorProvider currentActorProvider;
    private final CbsProperties cbsProperties;
    private final DealerDeskService dealerDeskService;
    private final DealingDeskRepository dealingDeskRepository;
    private final DeskDealerRepository deskDealerRepository;
    private final DeskPnlRepository deskPnlRepository;
    private final TraderPositionRepository traderPositionRepository;
    private final MarketOrderService marketOrderService;
    private final MarketOrderRepository marketOrderRepository;
    private final OrderExecutionRepository orderExecutionRepository;
    private final TradingBookService tradingBookService;
    private final TradingBookRepository tradingBookRepository;
    private final TradingBookSnapshotRepository tradingBookSnapshotRepository;
    private final FtpService ftpService;
    private final FtpRateCurveRepository ftpRateCurveRepository;
    private final FtpAllocationRepository ftpAllocationRepository;
    private final MarketMakingService marketMakingService;
    private final MarketMakingMandateRepository marketMakingMandateRepository;
    private final MarketMakingActivityRepository marketMakingActivityRepository;
    private final TreasuryAnalyticsSnapshotRepository treasuryAnalyticsSnapshotRepository;
    private final FinancialInstrumentRepository financialInstrumentRepository;
    private final BranchRepository branchRepository;
    private final CombinedEntityScreeningService combinedEntityScreeningService;

    @Transactional
    public TreasuryDeal bookDeal(DealType dealType, Long counterpartyId, String leg1Currency,
                                 BigDecimal leg1Amount, Long leg1AccountId, LocalDate leg1ValueDate,
                                 String leg2Currency, BigDecimal leg2Amount, Long leg2AccountId,
                                 LocalDate leg2ValueDate, BigDecimal dealRate, BigDecimal yieldRate,
                                 Integer tenorDays, String dealer) {
        validateIslamicDealEligibility(dealType, yieldRate);
        Long seq = dealRepository.getNextDealSequence();
        String dealNumber = String.format("TD%013d", seq);

        TreasuryDeal deal = TreasuryDeal.builder()
                .dealNumber(dealNumber).dealType(dealType)
                .leg1Currency(leg1Currency).leg1Amount(leg1Amount).leg1ValueDate(leg1ValueDate)
                .leg2Currency(leg2Currency).leg2Amount(leg2Amount).leg2ValueDate(leg2ValueDate)
                .dealRate(dealRate).yieldRate(yieldRate).tenorDays(tenorDays)
                .dealer(dealer).status(DealStatus.PENDING).build();

        if (counterpartyId != null) {
            CorrespondentBank cp = bankRepository.findById(counterpartyId)
                    .orElseThrow(() -> new ResourceNotFoundException("CorrespondentBank", "id", counterpartyId));
            validateCounterpartyScreening(cp, dealType, dealNumber);
            deal.setCounterparty(cp);
            deal.setCounterpartyName(cp.getBankName());
            deal.getMetadata().put("shariahCounterpartyScreened", Boolean.TRUE);
            deal.getMetadata().put("shariahCounterparty", cp.getBankName());
        }
        if (leg1AccountId != null) {
            deal.setLeg1Account(accountRepository.findById(leg1AccountId).orElse(null));
        }
        if (leg2AccountId != null) {
            deal.setLeg2Account(accountRepository.findById(leg2AccountId).orElse(null));
        }

        if (tenorDays != null) {
            deal.setMaturityDate(leg1ValueDate.plusDays(tenorDays));
        } else if (leg2ValueDate != null) {
            deal.setMaturityDate(leg2ValueDate);
        }

        TreasuryDeal saved = dealRepository.save(deal);
        log.info("AUDIT: Treasury deal booked: number={}, type={}, amount={} {}, rate={}, dealer={}, actor={}",
                dealNumber, dealType, leg1Amount, leg1Currency, dealRate, dealer,
                currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public TreasuryDeal confirmDeal(Long dealId) {
        TreasuryDeal deal = findDealOrThrow(dealId);
        String confirmedBy = currentActorProvider.getCurrentActor();
        if (deal.getStatus() != DealStatus.PENDING) {
            throw new BusinessException("Deal is not pending", "DEAL_NOT_PENDING");
        }
        deal.setStatus(DealStatus.CONFIRMED);
        deal.setConfirmedBy(confirmedBy);
        deal.setConfirmedAt(Instant.now());
        log.info("AUDIT: Deal {} confirmed by {}", deal.getDealNumber(), confirmedBy);
        return dealRepository.save(deal);
    }

    @Transactional
    public TreasuryDeal settleDeal(Long dealId) {
        TreasuryDeal deal = findDealOrThrow(dealId);
        String settledBy = currentActorProvider.getCurrentActor();
        if (deal.getStatus() != DealStatus.CONFIRMED) {
            throw new BusinessException("Deal must be confirmed first", "DEAL_NOT_CONFIRMED");
        }

        boolean outgoingLeg1 = isOutgoingLeg1(deal);
        settleLegs(deal, outgoingLeg1);

        // PnL calculation covering FX, money market, and fixed income deal types
        if (deal.getLeg1Amount() != null && deal.getLeg2Amount() != null) {
            DealType dt = deal.getDealType();
            if ((dt == DealType.FX_SPOT || dt == DealType.FX_FORWARD || dt == DealType.FX_SWAP)
                    && deal.getDealRate() != null) {
                // FX PnL: difference between actual and contracted rate
                deal.setRealizedPnl(deal.getLeg2Amount().subtract(
                        deal.getLeg1Amount().multiply(deal.getDealRate())).setScale(2, RoundingMode.HALF_UP));
            } else if (deal.getYieldRate() != null && deal.getTenorDays() != null && deal.getTenorDays() > 0) {
                // Money market / fixed income PnL: interest earned = principal * yield * tenor / 365
                BigDecimal interestEarned = deal.getLeg1Amount()
                        .multiply(deal.getYieldRate())
                        .multiply(BigDecimal.valueOf(deal.getTenorDays()))
                        .divide(BigDecimal.valueOf(36500), 2, RoundingMode.HALF_UP);
                deal.setRealizedPnl(interestEarned);
            } else {
                // Generic PnL: leg2 - leg1
                deal.setRealizedPnl(deal.getLeg2Amount().subtract(deal.getLeg1Amount()).setScale(2, RoundingMode.HALF_UP));
            }
        }

        deal.setStatus(DealStatus.SETTLED);
        deal.setSettledBy(settledBy);
        deal.setSettledAt(Instant.now());
        log.info("AUDIT: Deal {} settled by {}, pnl={}", deal.getDealNumber(), settledBy, deal.getRealizedPnl());
        return dealRepository.save(deal);
    }

    @Transactional
    public int processMaturedDeals() {
        List<TreasuryDeal> matured = dealRepository.findMaturedDeals(LocalDate.now());
        int count = 0;
        for (TreasuryDeal deal : matured) {
            deal.setStatus(DealStatus.MATURED);
            dealRepository.save(deal);
            count++;
        }
        log.info("Matured {} treasury deals", count);
        return count;
    }

    @Transactional
    public TreasuryDeal amendDeal(Long dealId, BigDecimal newAmount, BigDecimal newRate,
                                  LocalDate newMaturityDate, String reason) {
        TreasuryDeal deal = findDealOrThrow(dealId);
        String amendedBy = currentActorProvider.getCurrentActor();
        if (deal.getStatus() == DealStatus.SETTLED || deal.getStatus() == DealStatus.MATURED) {
            throw new BusinessException("Cannot amend a settled or matured deal", "DEAL_AMENDMENT_DENIED");
        }

        // Proper audit trail: store amendment history as a list, not just last amendment
        int amendCount = deal.getMetadata().containsKey("amendmentCount")
                ? ((Number) deal.getMetadata().get("amendmentCount")).intValue() + 1 : 1;
        deal.getMetadata().put("amendmentCount", amendCount);

        Map<String, Object> amendmentRecord = Map.of(
                "sequence", amendCount,
                "previousAmount", deal.getLeg1Amount() != null ? deal.getLeg1Amount().toString() : "",
                "previousRate", deal.getDealRate() != null ? deal.getDealRate().toString() : "",
                "previousMaturityDate", deal.getMaturityDate() != null ? deal.getMaturityDate().toString() : "",
                "reason", reason != null ? reason : "",
                "amendedBy", amendedBy,
                "amendedAt", Instant.now().toString()
        );
        deal.getMetadata().put("lastAmendment", amendmentRecord);

        // Store audit history list
        @SuppressWarnings("unchecked")
        List<Object> history = (List<Object>) deal.getMetadata().computeIfAbsent("amendmentHistory",
                k -> new ArrayList<>());
        history.add(amendmentRecord);

        if (newAmount != null) {
            deal.setLeg1Amount(newAmount);
        }
        if (newRate != null) {
            deal.setDealRate(newRate);
        }
        if (newMaturityDate != null) {
            deal.setMaturityDate(newMaturityDate);
            if (deal.getLeg1ValueDate() != null) {
                deal.setTenorDays((int) ChronoUnit.DAYS.between(deal.getLeg1ValueDate(), newMaturityDate));
            }
        }

        TreasuryDeal saved = dealRepository.save(deal);
        log.info("AUDIT: Deal {} amended by {}: reason={}, amendmentCount={}", deal.getDealNumber(), amendedBy, reason, amendCount);
        return saved;
    }

    public TreasuryDeal getDeal(Long id) {
        return findDealOrThrow(id);
    }

    public Page<TreasuryDeal> getDealsByStatus(DealStatus status, Pageable pageable) {
        return dealRepository.findByStatus(status, pageable);
    }

    public Page<TreasuryDeal> getAllDeals(Pageable pageable) {
        return dealRepository.findAll(pageable);
    }

    public Page<TreasuryDeal> getDealsByTypeAndStatus(DealType dealType, DealStatus status, Pageable pageable) {
        return dealRepository.findByDealTypeAndStatus(dealType, status, pageable);
    }

    @Transactional
    public TradingMarketOrder submitOrder(String instrumentCode, String instrumentName, String side, BigDecimal quantity,
                                          BigDecimal price, String orderType, Long deskId, String timeInForce,
                                          String currency, String instrumentType) {
        if (!StringUtils.hasText(instrumentCode)) {
            throw new BusinessException("Instrument code is required", "MISSING_INSTRUMENT");
        }
        if (quantity == null || quantity.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Quantity must be positive", "INVALID_ORDER_QUANTITY");
        }
        DealingDesk desk = dealingDeskRepository.findById(deskId)
                .orElseThrow(() -> new ResourceNotFoundException("DealingDesk", "id", deskId));
        if (!"ACTIVE".equalsIgnoreCase(desk.getStatus())) {
            throw new BusinessException("Desk is not active", "DESK_NOT_ACTIVE");
        }

        FinancialInstrument instrument = financialInstrumentRepository.findByInstrumentCode(instrumentCode).orElse(null);
        String normalizedOrderType = normalizeOrderType(orderType);
        if (List.of("LIMIT", "STOP", "STOP_LIMIT").contains(normalizedOrderType) && price == null) {
            throw new BusinessException("Price is required for limit and stop orders", "MISSING_LIMIT_PRICE");
        }

        MarketOrder saved = marketOrderService.submitOrder(MarketOrder.builder()
                .orderSource("DEALER")
                .dealerId(currentActorProvider.getCurrentActor())
                .deskId(deskId)
                .orderType(normalizedOrderType)
                .side(normalizeSide(side))
                .instrumentType(StringUtils.hasText(instrumentType)
                        ? instrumentType
                        : instrument != null ? instrument.getInstrumentType() : "SECURITY")
                .instrumentCode(instrumentCode)
                .instrumentName(StringUtils.hasText(instrumentName)
                        ? instrumentName
                        : instrument != null ? instrument.getInstrumentName() : instrumentCode)
                .exchange(instrument != null ? instrument.getExchange() : null)
                .quantity(quantity)
                .limitPrice(price)
                .currency(StringUtils.hasText(currency)
                        ? currency
                        : instrument != null ? instrument.getCurrency() : "NGN")
                .timeInForce(StringUtils.hasText(timeInForce) ? timeInForce : "DAY")
                .remainingQuantity(quantity)
                .build());

        return toTradingMarketOrder(saved, desk);
    }

    @Transactional
    public TradingMarketOrder cancelOrder(Long orderId, String reason) {
        MarketOrder order = marketOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("MarketOrder", "id", orderId));
        MarketOrder cancelled = marketOrderService.cancelOrder(order.getOrderRef(),
                StringUtils.hasText(reason) ? reason : "Cancelled from treasury workstation");
        return toTradingMarketOrder(cancelled, resolveDesk(cancelled.getDeskId()));
    }

    public List<TradingMarketOrder> listOrders(String status, Long deskId) {
        List<MarketOrder> orders;
        if (deskId != null) {
            orders = marketOrderRepository.findByDeskIdOrderByCreatedAtDesc(deskId);
        } else {
            orders = marketOrderRepository.findAll().stream()
                    .sorted(Comparator.comparing(MarketOrder::getCreatedAt).reversed())
                    .toList();
        }
        return orders.stream()
                .filter(order -> matchesOrderStatus(order, status))
                .map(order -> toTradingMarketOrder(order, resolveDesk(order.getDeskId())))
                .toList();
    }

    public List<OrderExecutionSummary> listExecutions(Long orderId) {
        List<OrderExecution> executions = orderId != null
                ? orderExecutionRepository.findByOrderIdOrderByExecutedAtDesc(orderId)
                : orderExecutionRepository.findAllByOrderByExecutedAtDesc();

        Map<Long, MarketOrder> ordersById = marketOrderRepository.findAllById(
                        executions.stream().map(OrderExecution::getOrderId).collect(Collectors.toSet()))
                .stream()
                .collect(Collectors.toMap(MarketOrder::getId, order -> order));

        return executions.stream()
                .map(execution -> {
                    MarketOrder order = ordersById.get(execution.getOrderId());
                    return new OrderExecutionSummary(
                            execution.getId(),
                            execution.getExecutionRef(),
                            execution.getOrderId(),
                            order != null ? order.getOrderRef() : String.valueOf(execution.getOrderId()),
                            order != null ? order.getInstrumentCode() : null,
                            order != null ? order.getSide() : null,
                            execution.getExecutionQuantity(),
                            execution.getExecutionPrice(),
                            execution.getCounterpartyName(),
                            execution.getExecutionVenue(),
                            execution.getCommissionCharged(),
                            execution.getExecutedAt()
                    );
                })
                .toList();
    }

    public List<TradeConfirmationSummary> listTradeConfirmations() {
        return dealRepository.findAll().stream()
                .sorted(Comparator.comparing(TreasuryDeal::getCreatedAt).reversed())
                .map(this::toTradeConfirmationSummary)
                .toList();
    }

    @Transactional
    public TradeConfirmationSummary confirmTradeConfirmation(Long dealId) {
        TreasuryDeal deal = findDealOrThrow(dealId);
        if (deal.getStatus() == DealStatus.PENDING) {
            deal = confirmDeal(dealId);
        }
        return toTradeConfirmationSummary(deal);
    }

    public List<TraderPositionSummary> getPositionsByDesk(Long deskId) {
        Map<Long, DealingDesk> desks = mapDesks();
        return traderPositionRepository.findLatestByDeskId(deskId).stream()
                .map(position -> toTraderPositionSummary(position, desks.get(position.getDeskId())))
                .toList();
    }

    public List<TraderPositionSummary> getPositionBreaches(LocalDate from, LocalDate to) {
        Map<Long, DealingDesk> desks = mapDesks();
        return traderPositionRepository.findBreachedPositions(from, to).stream()
                .map(position -> toTraderPositionSummary(position, desks.get(position.getDeskId())))
                .toList();
    }

    public List<TradingBookSummary> listTradingBooks() {
        Map<Long, DealingDesk> desks = mapDesks();
        return tradingBookRepository.findAllByOrderByBookType().stream()
                .map(book -> {
                    TradingBookSnapshot latestSnapshot = tradingBookSnapshotRepository
                            .findFirstByBookIdOrderBySnapshotDateDesc(book.getId())
                            .orElse(null);
                    DealingDesk desk = desks.get(book.getDeskId());
                    return new TradingBookSummary(
                            book.getId(),
                            book.getBookCode(),
                            book.getBookName(),
                            book.getBookType(),
                            book.getDeskId(),
                            desk != null ? desk.getDeskName() : null,
                            book.getStatus(),
                            defaultDecimal(book.getCapitalRequirement()),
                            defaultDecimal(book.getVarLimit()),
                            defaultDecimal(book.getVarUtilizationPct()),
                            latestSnapshot != null ? latestSnapshot.getCreatedAt() : null,
                            latestSnapshot != null ? "COMPLETED" : null
                    );
                })
                .toList();
    }

    @Transactional
    public TradingBookSnapshot snapshotTradingBook(Long id) {
        return tradingBookService.takeEodSnapshot(id);
    }

    public List<TradingBookSnapshot> getTradingBookSnapshots(Long id) {
        return tradingBookSnapshotRepository.findByBookIdAndSnapshotDateBetween(
                id,
                LocalDate.now().minusYears(5),
                LocalDate.now().plusDays(1)
        );
    }

    @Transactional
    public DealerDeskSummary createDesk(String code, String name, String assetClass, String headDealerId,
                                        String headDealerName, BigDecimal positionLimit, String location,
                                        String timezone, String pnlCurrency) {
        DealingDesk saved = dealerDeskService.createDesk(DealingDesk.builder()
                .deskCode(code)
                .deskName(name)
                .deskType(assetClass)
                .headDealerEmployeeId(headDealerId)
                .headDealerName(headDealerName)
                .maxOpenPositionLimit(positionLimit)
                .location(location)
                .timezone(timezone)
                .pnlCurrency(StringUtils.hasText(pnlCurrency) ? pnlCurrency : "NGN")
                .build());
        return summarizeDesk(saved);
    }

    @Transactional
    public DealerDeskSummary updateDesk(Long id, String name, String assetClass, String headDealerId,
                                        String headDealerName, BigDecimal positionLimit, String location,
                                        String timezone, String pnlCurrency) {
        DealingDesk saved = dealerDeskService.updateDesk(id, DealingDesk.builder()
                .deskName(name)
                .deskType(assetClass)
                .headDealerEmployeeId(headDealerId)
                .headDealerName(headDealerName)
                .maxOpenPositionLimit(positionLimit)
                .location(location)
                .timezone(timezone)
                .pnlCurrency(pnlCurrency)
                .build());
        return summarizeDesk(saved);
    }

    @Transactional
    public DealerDeskSummary suspendDesk(Long id, String reason) {
        return summarizeDesk(dealerDeskService.suspendDesk(id, reason));
    }

    @Transactional
    public DealerDeskSummary activateDesk(Long id) {
        return summarizeDesk(dealerDeskService.activateDesk(id));
    }

    public List<DealerDeskSummary> listDesks() {
        return dealerDeskService.getAllDesks().stream()
                .map(this::summarizeDesk)
                .toList();
    }

    public Map<String, Object> getDeskDashboard(Long id) {
        return dealerDeskService.getDeskDashboard(id);
    }

    public List<FtpCurvePoint> getFtpCurve(String currencyCode, LocalDate asOfDate) {
        LocalDate effectiveDate = asOfDate != null ? asOfDate : LocalDate.now();
        String currency = StringUtils.hasText(currencyCode) ? currencyCode : "NGN";
        Map<Integer, FtpRateCurve> latestByTenor = new LinkedHashMap<>();
        ftpRateCurveRepository
                .findByCurveNameAndCurrencyCodeAndEffectiveDateLessThanEqualOrderByTenorDaysAscEffectiveDateDesc(
                        "BASE", currency, effectiveDate)
                .forEach(point -> latestByTenor.putIfAbsent(point.getTenorDays(), point));
        return latestByTenor.values().stream()
                .map(point -> new FtpCurvePoint(
                        point.getId(),
                        tenorLabel(point.getTenorDays()),
                        point.getTenorDays(),
                        point.getRate(),
                        point.getEffectiveDate(),
                        point.getCurrencyCode()
                ))
                .toList();
    }

    @Transactional
    public FtpCurvePoint addFtpRatePoint(String tenor, BigDecimal rate, LocalDate effectiveDate, String currencyCode) {
        int tenorDays = tenorToDays(tenor);
        FtpRateCurve saved = ftpService.addRatePoint(
                "BASE",
                StringUtils.hasText(currencyCode) ? currencyCode : "NGN",
                effectiveDate != null ? effectiveDate : LocalDate.now(),
                tenorDays,
                rate
        );
        return new FtpCurvePoint(saved.getId(), tenorLabel(saved.getTenorDays()), saved.getTenorDays(), saved.getRate(),
                saved.getEffectiveDate(), saved.getCurrencyCode());
    }

    public List<FtpAllocation> getFtpAllocations(String entityType, LocalDate allocationDate) {
        LocalDate effectiveDate = resolveAllocationDate(entityType, allocationDate);
        if (effectiveDate == null) {
            return List.of();
        }
        return StringUtils.hasText(entityType)
                ? ftpAllocationRepository.findByAllocationDateAndEntityTypeOrderByNetMarginDesc(effectiveDate, normalizeFtpEntityType(entityType))
                : ftpAllocationRepository.findByAllocationDateOrderByNetMarginDesc(effectiveDate);
    }

    @Transactional
    public List<FtpAllocation> runAllocation(String entityType, YearMonth period) {
        String normalizedEntityType = normalizeFtpEntityType(entityType);
        LocalDate allocationDate = (period != null ? period : YearMonth.now()).atEndOfMonth();
        ftpAllocationRepository.deleteByAllocationDateAndEntityType(allocationDate, normalizedEntityType);

        Map<String, AllocationAccumulator> grouped = new LinkedHashMap<>();
        Map<String, Branch> branches = branchRepository.findAll().stream()
                .collect(Collectors.toMap(Branch::getBranchCode, branch -> branch, (left, right) -> left));

        for (Account account : accountRepository.findAll()) {
            if (account.getStatus() == AccountStatus.CLOSED) {
                continue;
            }
            AllocationKey key = buildAllocationKey(normalizedEntityType, account, branches);
            BigDecimal balance = defaultDecimal(account.getBookBalance()).abs();
            BigDecimal rate = firstNonZero(account.getApplicableInterestRate(),
                    account.getProduct() != null ? account.getProduct().getBaseInterestRate() : null);
            grouped.computeIfAbsent(key.cacheKey(), ignored -> new AllocationAccumulator(key.entityId(), key.entityRef(), key.currencyCode()))
                    .add(balance, rate);
        }

        List<FtpAllocation> allocations = new ArrayList<>();
        for (AllocationAccumulator accumulator : grouped.values()) {
            if (accumulator.averageBalance().compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            allocations.add(ftpService.calculateFtp(
                    normalizedEntityType,
                    accumulator.entityId(),
                    accumulator.entityRef(),
                    accumulator.currencyCode(),
                    accumulator.averageBalance(),
                    accumulator.actualRate(),
                    30,
                    allocationDate
            ));
        }
        return allocations;
    }

    public List<FtpAllocation> getFtpProfitability(String entityType, LocalDate allocationDate) {
        return getFtpAllocations(entityType, allocationDate);
    }

    public List<MarketMakingMandateSummary> listMarketMakingMandates() {
        return marketMakingMandateRepository.findAll().stream()
                .map(this::toMarketMakingMandateSummary)
                .sorted(Comparator.comparing(MarketMakingMandateSummary::code))
                .toList();
    }

    @Transactional
    public MarketMakingMandateSummary createMarketMakingMandate(String instrumentCode, String instrumentName, String obligationType,
                                                                BigDecimal maxBidAskSpreadBps, BigDecimal minQuoteTimePct,
                                                                LocalDate startDate, LocalDate endDate, Long deskId) {
        FinancialInstrument instrument = StringUtils.hasText(instrumentCode)
                ? financialInstrumentRepository.findByInstrumentCode(instrumentCode).orElse(null)
                : null;
        MarketMakingMandate saved = marketMakingService.createMandate(MarketMakingMandate.builder()
                .mandateName(StringUtils.hasText(instrumentName) ? instrumentName : instrument != null ? instrument.getInstrumentName() : instrumentCode)
                .instrumentType(instrument != null ? instrument.getInstrumentType() : "GOVERNMENT_BOND")
                .instrumentCode(instrumentCode)
                .exchange(instrument != null ? instrument.getExchange() : null)
                .mandateType("DESIGNATED")
                .deskId(deskId)
                .quoteObligation(StringUtils.hasText(obligationType) ? obligationType : "CONTINUOUS")
                .maxSpreadBps(maxBidAskSpreadBps)
                .dailyQuoteHours(requiredQuoteHours(minQuoteTimePct))
                .effectiveFrom(startDate != null ? startDate : LocalDate.now())
                .effectiveTo(endDate)
                .status("ACTIVE")
                .build());
        return toMarketMakingMandateSummary(saved);
    }

    public List<ObligationComplianceSummary> getMarketMakingComplianceReport() {
        return marketMakingMandateRepository.findAll().stream()
                .map(this::toComplianceSummary)
                .toList();
    }

    public MandatePerformanceSummary getMandatePerformance(String code) {
        MarketMakingMandate mandate = marketMakingMandateRepository.findByMandateCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("MarketMakingMandate", "mandateCode", code));
        List<MandatePerformancePoint> dataPoints = marketMakingActivityRepository
                .findByMandateIdAndActivityDateBetweenOrderByActivityDateAsc(mandate.getId(), LocalDate.now().minusDays(30), LocalDate.now())
                .stream()
                .map(activity -> new MandatePerformancePoint(
                        activity.getActivityDate().toString(),
                        defaultDecimal(activity.getTotalVolume()),
                        defaultDecimal(activity.getAvgBidAskSpreadBps()),
                        defaultDecimal(activity.getQuotingUptimePct())
                ))
                .toList();
        return new MandatePerformanceSummary(
                mandate.getMandateCode(),
                firstNonBlank(mandate.getInstrumentCode(), mandate.getMandateName()),
                dataPoints
        );
    }

    @Transactional
    public TreasuryAnalyticsRecord recordAnalytics(String currency, BigDecimal nim, BigDecimal yield,
                                                   BigDecimal roa, BigDecimal roe, BigDecimal car,
                                                   LocalDate snapshotDate) {
        if (!StringUtils.hasText(currency)) {
            throw new BusinessException("Treasury analytics require an explicit currency", "TREASURY_CURRENCY_REQUIRED");
        }
        TreasuryAnalyticsSnapshot saved = treasuryAnalyticsSnapshotRepository.save(TreasuryAnalyticsSnapshot.builder()
                .snapshotDate(snapshotDate != null ? snapshotDate : LocalDate.now())
            .currency(currency.trim().toUpperCase())
            .interestSpreadPct(nim)
                .yieldOnAssetsPct(yield)
                .returnOnAssetsPct(roa)
                .returnOnEquityPct(roe)
                .capitalAdequacyRatio(car)
                .build());
        return toAnalyticsRecord(saved);
    }

    public List<TreasuryAnalyticsRecord> getTreasuryAnalytics(String currency, LocalDate from, LocalDate to) {
        LocalDate effectiveFrom = from != null ? from : LocalDate.of(1900, 1, 1);
        LocalDate effectiveTo = to != null ? to : LocalDate.of(9999, 12, 31);
        List<TreasuryAnalyticsSnapshot> snapshots = StringUtils.hasText(currency)
            ? treasuryAnalyticsSnapshotRepository.findByCurrencyIgnoreCaseAndSnapshotDateBetweenOrderBySnapshotDateDesc(
            currency, effectiveFrom, effectiveTo)
            : treasuryAnalyticsSnapshotRepository.findBySnapshotDateBetweenOrderBySnapshotDateDesc(effectiveFrom, effectiveTo);
        return snapshots.stream()
                .map(this::toAnalyticsRecord)
                .toList();
    }

    public List<InstrumentOption> searchInstruments(String query) {
        if (!StringUtils.hasText(query)) {
            return List.of();
        }
        return financialInstrumentRepository.searchActive(query).stream()
                .limit(20)
                .map(instrument -> new InstrumentOption(
                        instrument.getInstrumentCode(),
                        instrument.getInstrumentName(),
                        instrument.getInstrumentType(),
                        instrument.getAssetClass(),
                        instrument.getCurrency()
                ))
                .toList();
    }

    private DealerDeskSummary summarizeDesk(DealingDesk desk) {
        List<DeskDealer> activeDealers = deskDealerRepository.findByDeskIdAndStatus(desk.getId(), "ACTIVE");
        List<TraderPosition> positions = traderPositionRepository.findLatestByDeskId(desk.getId());
        DeskPnl latestPnl = deskPnlRepository.findFirstByDeskIdOrderByPnlDateDesc(desk.getId()).orElse(null);
        BigDecimal utilizationPct = positions.stream()
                .map(TraderPosition::getLimitUtilizationPct)
                .filter(Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElse(BigDecimal.ZERO);
        BigDecimal todayPnl = latestPnl != null
                ? defaultDecimal(latestPnl.getTotalPnl())
                : positions.stream().map(TraderPosition::getUnrealizedPnl).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal mtdPnl = latestPnl != null && latestPnl.getMtdPnl() != null
                ? latestPnl.getMtdPnl()
                : deskPnlRepository.findByDeskIdAndPnlDateBetween(desk.getId(), LocalDate.now().withDayOfMonth(1), LocalDate.now())
                        .stream()
                        .map(DeskPnl::getTotalPnl)
                        .filter(Objects::nonNull)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new DealerDeskSummary(
                desk.getId(),
                desk.getDeskCode(),
                desk.getDeskName(),
                desk.getDeskType(),
                desk.getStatus(),
                desk.getHeadDealerEmployeeId(),
                desk.getHeadDealerName(),
                activeDealers.size(),
                positions.size(),
                defaultDecimal(desk.getMaxOpenPositionLimit()),
                utilizationPct,
                todayPnl,
                mtdPnl
        );
    }

    private TraderPositionSummary toTraderPositionSummary(TraderPosition position, DealingDesk desk) {
        BigDecimal positionLimit = firstNonZero(position.getTraderPositionLimit(),
                desk != null ? desk.getMaxOpenPositionLimit() : null);
        return new TraderPositionSummary(
                position.getId(),
                position.getDealerId(),
                position.getDealerName(),
                String.valueOf(position.getDeskId()),
                desk != null ? desk.getDeskName() : null,
                firstNonBlank(position.getInstrumentName(), position.getInstrumentCode()),
                position.getCurrency(),
                defaultDecimal(position.getLongQuantity()),
                defaultDecimal(position.getShortQuantity()),
                defaultDecimal(position.getNetQuantity()).abs().multiply(defaultDecimal(position.getMarketPrice())),
                positionLimit,
                firstNonZero(position.getLimitUtilizationPct(),
                        calculatePct(defaultDecimal(position.getNetQuantity()).abs().multiply(defaultDecimal(position.getMarketPrice())), positionLimit)),
                defaultDecimal(position.getUnrealizedPnl()),
                Boolean.TRUE.equals(position.getLimitBreached()),
                position.getPositionDate() != null ? position.getPositionDate().toString() : null,
                position.getLastTradeAt() != null ? position.getLastTradeAt().toString() : null
        );
    }

    private TradingMarketOrder toTradingMarketOrder(MarketOrder order, DealingDesk desk) {
        return new TradingMarketOrder(
                String.valueOf(order.getId()),
                order.getOrderRef(),
                order.getInstrumentCode(),
                firstNonBlank(order.getInstrumentName(), order.getInstrumentCode()),
                order.getSide(),
                scale(order.getQuantity()),
                order.getLimitPrice(),
                order.getOrderType(),
                scale(order.getFilledQuantity()),
                order.getAvgFilledPrice(),
                String.valueOf(order.getDeskId()),
                desk != null ? desk.getDeskName() : null,
                order.getStatus(),
                order.getCreatedAt(),
                order.getUpdatedAt(),
                order.getCreatedBy()
        );
    }

    private TradeConfirmationSummary toTradeConfirmationSummary(TreasuryDeal deal) {
        boolean matched = deal.getStatus() == DealStatus.CONFIRMED
                || deal.getStatus() == DealStatus.SETTLED
                || deal.getStatus() == DealStatus.MATURED;
        String matchStatus = matched ? "MATCHED" : "ALLEGED";
        String status = matched ? "CONFIRMED" : "PENDING";
        return new TradeConfirmationSummary(
                deal.getId(),
                "CONF-" + deal.getDealNumber(),
                deal.getDealNumber(),
                firstNonBlank(deal.getCounterpartyName(), "Counterparty"),
                firstNonBlank(deal.getLeg1Currency(), deal.getDealType().name()),
                deal.getLeg2Amount() != null && deal.getLeg2Amount().compareTo(defaultDecimal(deal.getLeg1Amount())) > 0 ? "SELL" : "BUY",
                defaultDecimal(deal.getLeg1Amount()),
                defaultDecimal(deal.getDealRate()),
                deal.getLeg1ValueDate() != null ? deal.getLeg1ValueDate().toString() : null,
                matchStatus,
                Map.of(
                        "rate", String.valueOf(defaultDecimal(deal.getDealRate())),
                        "amount", String.valueOf(defaultDecimal(deal.getLeg1Amount())),
                        "valueDate", deal.getLeg1ValueDate() != null ? deal.getLeg1ValueDate().toString() : ""
                ),
                Map.of(
                        "rate", String.valueOf(defaultDecimal(deal.getDealRate())),
                        "amount", String.valueOf(defaultDecimal(deal.getLeg1Amount())),
                        "valueDate", deal.getLeg1ValueDate() != null ? deal.getLeg1ValueDate().toString() : ""
                ),
                status
        );
    }

    private MarketMakingMandateSummary toMarketMakingMandateSummary(MarketMakingMandate mandate) {
        List<MarketMakingActivity> activities = marketMakingActivityRepository.findByMandateIdOrderByActivityDateDesc(mandate.getId());
        MarketMakingActivity latest = activities.stream().findFirst().orElse(null);
        BigDecimal requiredQuoteTimePct = requiredQuoteTimePct(mandate);
        BigDecimal actualQuoteTimePct = latest != null ? defaultDecimal(latest.getQuotingUptimePct()) : BigDecimal.ZERO;
        BigDecimal currentSpread = latest != null ? defaultDecimal(latest.getAvgBidAskSpreadBps()) : BigDecimal.ZERO;
        BigDecimal todayVolume = activities.stream()
                .filter(activity -> LocalDate.now().equals(activity.getActivityDate()))
                .map(MarketMakingActivity::getTotalVolume)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal mtdVolume = activities.stream()
                .filter(activity -> YearMonth.from(activity.getActivityDate()).equals(YearMonth.now()))
                .map(MarketMakingActivity::getTotalVolume)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new MarketMakingMandateSummary(
                String.valueOf(mandate.getId()),
                mandate.getMandateCode(),
                firstNonBlank(mandate.getInstrumentCode(), mandate.getMandateName()),
                firstNonBlank(mandate.getMandateName(), mandate.getInstrumentCode()),
                mandate.getQuoteObligation(),
                defaultDecimal(mandate.getMaxSpreadBps()),
                defaultDecimal(mandate.getMinQuoteSize()),
                requiredQuoteTimePct,
                currentSpread,
                evaluateComplianceStatus(mandate, requiredQuoteTimePct, actualQuoteTimePct, currentSpread),
                actualQuoteTimePct,
                todayVolume,
                mtdVolume,
                String.valueOf(mandate.getDeskId())
        );
    }

    private ObligationComplianceSummary toComplianceSummary(MarketMakingMandate mandate) {
        List<MarketMakingActivity> activities = marketMakingActivityRepository
                .findByMandateIdAndActivityDateBetweenOrderByActivityDateAsc(
                        mandate.getId(),
                        LocalDate.now().minusDays(30),
                        LocalDate.now()
                );
        BigDecimal requiredQuoteTimePct = requiredQuoteTimePct(mandate);
        BigDecimal actualQuoteTimePct = average(activities.stream().map(MarketMakingActivity::getQuotingUptimePct).toList());
        BigDecimal actualSpread = average(activities.stream().map(MarketMakingActivity::getAvgBidAskSpreadBps).toList());
        int breachCount = (int) activities.stream()
                .filter(activity -> !Boolean.TRUE.equals(activity.getObligationMet())
                        || (activity.getSpreadViolationCount() != null && activity.getSpreadViolationCount() > 0))
                .count();
        String status = evaluateComplianceStatus(mandate, requiredQuoteTimePct, actualQuoteTimePct, actualSpread);
        return new ObligationComplianceSummary(
                mandate.getMandateCode(),
                firstNonBlank(mandate.getInstrumentCode(), mandate.getMandateName()),
                LocalDate.now().minusDays(30).toString(),
                LocalDate.now().toString(),
                requiredQuoteTimePct,
                actualQuoteTimePct,
                defaultDecimal(mandate.getMaxSpreadBps()),
                actualSpread,
                breachCount,
                status
        );
    }

    private TreasuryAnalyticsRecord toAnalyticsRecord(TreasuryAnalyticsSnapshot snapshot) {
        return new TreasuryAnalyticsRecord(
                String.valueOf(snapshot.getId()),
                snapshot.getCurrency(),
            firstNonZero(snapshot.getInterestSpreadPct(), snapshot.getNetInterestMarginPct()),
                snapshot.getYieldOnAssetsPct(),
                snapshot.getCapitalAdequacyRatio(),
                snapshot.getReturnOnAssetsPct(),
                snapshot.getReturnOnEquityPct(),
                snapshot.getCreatedAt()
        );
    }

        private void validateIslamicDealEligibility(DealType dealType, BigDecimal yieldRate) {
        if (yieldRate != null && yieldRate.compareTo(BigDecimal.ZERO) > 0) {
            throw new BusinessException("Yield-based pricing is not permitted in Islamic treasury booking",
                "TREASURY_YIELD_NOT_PERMITTED");
        }
        if (dealType != DealType.FX_SPOT && dealType != DealType.FX_FORWARD && dealType != DealType.FX_SWAP) {
            throw new BusinessException(
                "Deal type " + dealType + " is not approved for Islamic treasury booking without instrument-level Shariah classification",
                "TREASURY_NON_ISLAMIC_DEAL");
        }
        }

        private void validateCounterpartyScreening(CorrespondentBank counterparty, DealType dealType, String dealNumber) {
        var screeningResult = combinedEntityScreeningService.screenEntity(EntityScreeningRequest.builder()
            .entityName(counterparty.getBankName())
            .entityType("FINANCIAL_INSTITUTION")
            .entityCountry(counterparty.getCountry())
            .entityIdentifiers(Map.of(
                "bankCode", counterparty.getBankCode(),
                "swiftBic", counterparty.getSwiftBic() != null ? counterparty.getSwiftBic() : ""))
            .transactionType("TREASURY_" + dealType.name())
            .shariahContractRef(dealNumber)
            .build());
        if (!screeningResult.isShariahClear() || !screeningResult.isSanctionsClear()) {
            throw new BusinessException(
                "Treasury counterparty screening failed for " + counterparty.getBankName()
                    + ": " + screeningResult.getActionRequired(),
                "TREASURY_COUNTERPARTY_SCREENING_FAILED");
        }
        }

    private String evaluateComplianceStatus(MarketMakingMandate mandate, BigDecimal requiredQuoteTimePct,
                                            BigDecimal actualQuoteTimePct, BigDecimal currentSpread) {
        if ("SUSPENDED".equalsIgnoreCase(mandate.getStatus())) {
            return "SUSPENDED";
        }
        BigDecimal maxSpread = defaultDecimal(mandate.getMaxSpreadBps());
        boolean breached = actualQuoteTimePct.compareTo(requiredQuoteTimePct) < 0
                || (maxSpread.compareTo(BigDecimal.ZERO) > 0 && currentSpread.compareTo(maxSpread) > 0);
        if (breached) {
            return "BREACH";
        }
        boolean warning = actualQuoteTimePct.compareTo(requiredQuoteTimePct.multiply(BigDecimal.valueOf(1.10))) <= 0
                || (maxSpread.compareTo(BigDecimal.ZERO) > 0
                && currentSpread.compareTo(maxSpread.multiply(BigDecimal.valueOf(0.90))) >= 0);
        return warning ? "WARNING" : "COMPLIANT";
    }

    private BigDecimal requiredQuoteTimePct(MarketMakingMandate mandate) {
        return BigDecimal.valueOf((double) requiredQuoteHours(nullSafeInt(mandate.getDailyQuoteHours())) * 100 / 8)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private int requiredQuoteHours(BigDecimal minQuoteTimePct) {
        BigDecimal pct = minQuoteTimePct != null ? minQuoteTimePct : BigDecimal.valueOf(80);
        return pct.multiply(BigDecimal.valueOf(8))
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.CEILING)
                .intValue();
    }

    private int requiredQuoteHours(Integer dailyQuoteHours) {
        return dailyQuoteHours != null && dailyQuoteHours > 0 ? dailyQuoteHours : 6;
    }

    private String normalizeSide(String side) {
        String normalized = side != null ? side.trim().toUpperCase() : "";
        if (!List.of("BUY", "SELL").contains(normalized)) {
            throw new BusinessException("Unsupported order side", "INVALID_ORDER_SIDE");
        }
        return normalized;
    }

    private String normalizeOrderType(String orderType) {
        String normalized = orderType != null ? orderType.trim().toUpperCase() : "MARKET";
        if (!List.of("MARKET", "LIMIT", "STOP", "STOP_LIMIT").contains(normalized)) {
            throw new BusinessException("Unsupported order type", "INVALID_ORDER_TYPE");
        }
        return normalized;
    }

    private String normalizeFtpEntityType(String entityType) {
        String normalized = entityType != null ? entityType.trim().toUpperCase() : "BRANCH";
        if (!List.of("ACCOUNT", "PRODUCT", "BRANCH", "CUSTOMER").contains(normalized)) {
            throw new BusinessException("Unsupported FTP entity type", "INVALID_FTP_ENTITY_TYPE");
        }
        return normalized;
    }

    private AllocationKey buildAllocationKey(String entityType, Account account, Map<String, Branch> branches) {
        return switch (entityType) {
            case "ACCOUNT" -> new AllocationKey(
                    account.getId(),
                    account.getAccountNumber(),
                    account.getCurrencyCode(),
                    "ACCOUNT:" + account.getId() + ":" + account.getCurrencyCode()
            );
            case "PRODUCT" -> new AllocationKey(
                    account.getProduct().getId(),
                    account.getProduct().getCode() + " · " + account.getProduct().getName(),
                    account.getCurrencyCode(),
                    "PRODUCT:" + account.getProduct().getId() + ":" + account.getCurrencyCode()
            );
            case "CUSTOMER" -> new AllocationKey(
                    account.getCustomer().getId(),
                    account.getCustomer().getDisplayName(),
                    account.getCurrencyCode(),
                    "CUSTOMER:" + account.getCustomer().getId() + ":" + account.getCurrencyCode()
            );
            default -> {
                Branch branch = branches.get(account.getBranchCode());
                long entityId = branch != null ? branch.getId() : Math.abs((long) firstNonBlank(account.getBranchCode(), "UNASSIGNED").hashCode());
                String entityRef = branch != null ? branch.getBranchName() : firstNonBlank(account.getBranchCode(), "Unassigned Branch");
                yield new AllocationKey(
                        entityId,
                        entityRef,
                        account.getCurrencyCode(),
                        "BRANCH:" + entityId + ":" + account.getCurrencyCode()
                );
            }
        };
    }

    private LocalDate resolveAllocationDate(String entityType, LocalDate requestedDate) {
        if (requestedDate != null) {
            return requestedDate;
        }
        List<FtpAllocation> candidates = StringUtils.hasText(entityType)
                ? ftpAllocationRepository.findByEntityTypeOrderByAllocationDateDesc(normalizeFtpEntityType(entityType))
                : ftpAllocationRepository.findAll();
        return candidates.stream()
                .map(FtpAllocation::getAllocationDate)
                .max(LocalDate::compareTo)
                .orElse(null);
    }

    private int tenorToDays(String tenor) {
        String normalized = tenor != null ? tenor.trim().toUpperCase() : "";
        return switch (normalized) {
            case "O/N" -> 1;
            case "1W" -> 7;
            case "1M" -> 30;
            case "3M" -> 90;
            case "6M" -> 180;
            case "1Y" -> 365;
            case "2Y" -> 730;
            case "5Y" -> 1825;
            default -> throw new BusinessException("Unsupported tenor", "INVALID_FTP_TENOR");
        };
    }

    private String tenorLabel(int tenorDays) {
        return switch (tenorDays) {
            case 1 -> "O/N";
            case 7 -> "1W";
            case 30 -> "1M";
            case 90 -> "3M";
            case 180 -> "6M";
            case 365 -> "1Y";
            case 730 -> "2Y";
            case 1825 -> "5Y";
            default -> tenorDays + "D";
        };
    }

    private boolean matchesOrderStatus(MarketOrder order, String status) {
        if (!StringUtils.hasText(status)) {
            return true;
        }
        String normalized = status.trim().toUpperCase();
        if ("OPEN".equals(normalized)) {
            return OPEN_ORDER_STATUSES.contains(order.getStatus());
        }
        return normalized.equalsIgnoreCase(order.getStatus());
    }

    private BigDecimal average(Collection<BigDecimal> values) {
        List<BigDecimal> populated = values.stream().filter(Objects::nonNull).toList();
        if (populated.isEmpty()) {
            return BigDecimal.ZERO;
        }
        BigDecimal total = populated.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return total.divide(BigDecimal.valueOf(populated.size()), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculatePct(BigDecimal numerator, BigDecimal denominator) {
        if (denominator == null || denominator.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        return numerator.divide(denominator, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal firstNonZero(BigDecimal primary, BigDecimal secondary) {
        if (primary != null && primary.compareTo(BigDecimal.ZERO) > 0) {
            return primary;
        }
        return secondary != null ? secondary : BigDecimal.ZERO;
    }

    private BigDecimal defaultDecimal(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private BigDecimal scale(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private String firstNonBlank(String primary, String fallback) {
        return StringUtils.hasText(primary) ? primary : fallback;
    }

    private int nullSafeInt(Integer value) {
        return value != null ? value : 0;
    }

    private Map<Long, DealingDesk> mapDesks() {
        return dealingDeskRepository.findAll().stream()
                .collect(Collectors.toMap(DealingDesk::getId, desk -> desk, (left, right) -> left));
    }

    private DealingDesk resolveDesk(Long deskId) {
        return deskId != null ? dealingDeskRepository.findById(deskId).orElse(null) : null;
    }

    private TreasuryDeal findDealOrThrow(Long id) {
        return dealRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("TreasuryDeal", "id", id));
    }

    private void settleLegs(TreasuryDeal deal, boolean outgoingLeg1) {
        Account debitAccount = outgoingLeg1 ? deal.getLeg1Account() : deal.getLeg2Account();
        Account creditAccount = outgoingLeg1 ? deal.getLeg2Account() : deal.getLeg1Account();
        BigDecimal debitAmount = outgoingLeg1 ? deal.getLeg1Amount() : deal.getLeg2Amount();
        BigDecimal creditAmount = outgoingLeg1 ? deal.getLeg2Amount() : deal.getLeg1Amount();

        if (debitAccount != null && creditAccount != null && debitAmount != null && creditAmount != null) {
            BigDecimal debitFxRate = resolveDebitFxRate(debitAmount, creditAmount);
            accountPostingService.postTransfer(
                    debitAccount,
                    creditAccount,
                    debitAmount,
                    creditAmount,
                    "Treasury deal settlement " + deal.getDealNumber(),
                    "Treasury deal settlement " + deal.getDealNumber(),
                    TransactionChannel.SYSTEM,
                    deal.getDealNumber(),
                    debitFxRate,
                    BigDecimal.ONE,
                    "TREASURY",
                    deal.getDealNumber()
            );
            return;
        }

        if (debitAccount != null && debitAmount != null) {
            accountPostingService.postDebitAgainstGl(
                    debitAccount,
                    TransactionType.DEBIT,
                    debitAmount,
                    "Treasury deal settlement " + deal.getDealNumber(),
                    TransactionChannel.SYSTEM,
                    deal.getDealNumber() + ":DR",
                    resolveTreasurySettlementGlCode(),
                    "TREASURY",
                    deal.getDealNumber()
            );
        }

        if (creditAccount != null && creditAmount != null) {
            accountPostingService.postCreditAgainstGl(
                    creditAccount,
                    TransactionType.CREDIT,
                    creditAmount,
                    "Treasury deal settlement " + deal.getDealNumber(),
                    TransactionChannel.SYSTEM,
                    deal.getDealNumber() + ":CR",
                    resolveTreasurySettlementGlCode(),
                    "TREASURY",
                    deal.getDealNumber()
            );
        }
    }

    private boolean isOutgoingLeg1(TreasuryDeal deal) {
        String dealType = deal.getDealType().name();
        return dealType.contains("PLACEMENT") || dealType.contains("PURCHASE");
    }

    private BigDecimal resolveDebitFxRate(BigDecimal debitAmount, BigDecimal creditAmount) {
        if (debitAmount == null || creditAmount == null || debitAmount.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ONE;
        }
        if (debitAmount.compareTo(creditAmount) == 0) {
            return BigDecimal.ONE;
        }
        return creditAmount.divide(debitAmount, 8, RoundingMode.HALF_UP);
    }

    private String resolveTreasurySettlementGlCode() {
        String glCode = cbsProperties.getLedger().getExternalClearingGlCode();
        if (!StringUtils.hasText(glCode)) {
            throw new BusinessException("CBS_LEDGER_EXTERNAL_CLEARING_GL is required for treasury settlement",
                    "MISSING_TREASURY_SETTLEMENT_GL");
        }
        return glCode;
    }

    private record AllocationKey(Long entityId, String entityRef, String currencyCode, String cacheKey) {
    }

    private static final class AllocationAccumulator {
        private final Long entityId;
        private final String entityRef;
        private final String currencyCode;
        private BigDecimal totalBalance = BigDecimal.ZERO;
        private BigDecimal weightedRate = BigDecimal.ZERO;

        private AllocationAccumulator(Long entityId, String entityRef, String currencyCode) {
            this.entityId = entityId;
            this.entityRef = entityRef;
            this.currencyCode = currencyCode;
        }

        private void add(BigDecimal balance, BigDecimal rate) {
            totalBalance = totalBalance.add(balance);
            weightedRate = weightedRate.add(balance.multiply(rate));
        }

        private Long entityId() {
            return entityId;
        }

        private String entityRef() {
            return entityRef;
        }

        private String currencyCode() {
            return currencyCode;
        }

        private BigDecimal averageBalance() {
            return totalBalance;
        }

        private BigDecimal actualRate() {
            if (totalBalance.compareTo(BigDecimal.ZERO) <= 0) {
                return BigDecimal.ZERO;
            }
            return weightedRate.divide(totalBalance, 4, RoundingMode.HALF_UP);
        }
    }

    public record DealerDeskSummary(
            Long id,
            String code,
            String name,
            String assetClass,
            String status,
            String headDealerId,
            String headDealerName,
            Integer activeDeelersCount,
            Integer positionCount,
            BigDecimal positionLimit,
            BigDecimal utilizationPct,
            BigDecimal todayPnl,
            BigDecimal mtdPnl
    ) {
    }

    public record TraderPositionSummary(
            Long id,
            String dealerId,
            String dealerName,
            String deskId,
            String deskName,
            String instrument,
            String currency,
            BigDecimal longPosition,
            BigDecimal shortPosition,
            BigDecimal netExposure,
            BigDecimal positionLimit,
            BigDecimal utilizationPct,
            BigDecimal unrealizedPnl,
            Boolean breachFlag,
            String breachSince,
            String lastUpdated
    ) {
    }

    public record TradingBookSummary(
            Long id,
            String bookCode,
            String bookName,
            String bookType,
            Long deskId,
            String deskName,
            String status,
            BigDecimal capitalRequirement,
            BigDecimal capitalAllocated,
            BigDecimal utilizationPct,
            Instant lastSnapshotAt,
            String snapshotStatus
    ) {
    }

    public record TradingMarketOrder(
            String id,
            String orderRef,
            String instrument,
            String instrumentName,
            String side,
            BigDecimal quantity,
            BigDecimal price,
            String orderType,
            BigDecimal filledQuantity,
            BigDecimal avgFillPrice,
            String deskId,
            String deskName,
            String status,
            Instant createdAt,
            Instant updatedAt,
            String createdBy
    ) {
    }

    public record OrderExecutionSummary(
            Long id,
            String executionRef,
            Long orderId,
            String orderRef,
            String instrument,
            String side,
            BigDecimal executedQuantity,
            BigDecimal executedPrice,
            String counterparty,
            String venue,
            BigDecimal fee,
            Instant executedAt
    ) {
    }

    public record FtpCurvePoint(
            Long id,
            String tenor,
            Integer days,
            BigDecimal rate,
            LocalDate effectiveDate,
            String currencyCode
    ) {
    }

    public record MarketMakingMandateSummary(
            String id,
            String code,
            String instrument,
            String instrumentName,
            String obligationType,
            BigDecimal maxBidAskSpreadBps,
            BigDecimal minQuoteSize,
            BigDecimal minQuoteTimePct,
            BigDecimal currentBidAskSpread,
            String complianceStatus,
            BigDecimal quoteTimePct,
            BigDecimal todayVolume,
            BigDecimal mtdVolume,
            String deskId
    ) {
    }

    public record ObligationComplianceSummary(
            String mandateCode,
            String instrument,
            String periodStart,
            String periodEnd,
            BigDecimal requiredQuoteTimePct,
            BigDecimal actualQuoteTimePct,
            BigDecimal maxAllowedSpreadBps,
            BigDecimal avgActualSpreadBps,
            Integer breachCount,
            String status
    ) {
    }

    public record MandatePerformancePoint(
            String date,
            BigDecimal volume,
            BigDecimal spreadBps,
            BigDecimal quoteTimePct
    ) {
    }

    public record MandatePerformanceSummary(
            String mandateCode,
            String instrument,
            List<MandatePerformancePoint> dataPoints
    ) {
    }

    public record TreasuryAnalyticsRecord(
            String id,
            String currency,
            BigDecimal nim,
            BigDecimal yield,
            BigDecimal car,
            BigDecimal roa,
            BigDecimal roe,
            Instant recordedAt
    ) {
    }

    public record InstrumentOption(
            String code,
            String name,
            String instrumentType,
            String assetClass,
            String currency
    ) {
    }

    public record TradeConfirmationSummary(
            Long id,
            String confirmRef,
            String dealRef,
            String counterparty,
            String instrument,
            String direction,
            BigDecimal amount,
            BigDecimal rate,
            String valueDate,
            String matchStatus,
            Map<String, String> ourTerms,
            Map<String, String> theirTerms,
            String status
    ) {
    }
}
