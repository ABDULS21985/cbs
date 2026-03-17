package com.cbs.nostro.service;

import com.cbs.account.entity.Account;
import com.cbs.account.repository.AccountRepository;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.DuplicateResourceException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.nostro.dto.*;
import com.cbs.nostro.entity.*;
import com.cbs.nostro.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class NostroVostroService {

    private final CorrespondentBankRepository bankRepository;
    private final NostroVostroPositionRepository positionRepository;
    private final NostroReconciliationItemRepository reconItemRepository;
    private final AccountRepository accountRepository;

    // ========================================================================
    // CORRESPONDENT BANK CRUD
    // ========================================================================

    @Transactional
    public CorrespondentBankDto createBank(CorrespondentBankDto dto) {
        if (bankRepository.existsByBankCode(dto.getBankCode())) {
            throw new DuplicateResourceException("CorrespondentBank", "bankCode", dto.getBankCode());
        }
        CorrespondentBank bank = CorrespondentBank.builder()
                .bankCode(dto.getBankCode()).bankName(dto.getBankName())
                .swiftBic(dto.getSwiftBic()).country(dto.getCountry()).city(dto.getCity())
                .relationshipType(dto.getRelationshipType())
                .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                .contactName(dto.getContactName()).contactEmail(dto.getContactEmail())
                .contactPhone(dto.getContactPhone())
                .metadata(dto.getMetadata() != null ? dto.getMetadata() : new java.util.HashMap<>())
                .build();
        CorrespondentBank saved = bankRepository.save(bank);
        log.info("Correspondent bank created: code={}, name={}", saved.getBankCode(), saved.getBankName());
        return toBankDto(saved);
    }

    public List<CorrespondentBankDto> getAllActiveBanks() {
        return bankRepository.findByIsActiveTrueOrderByBankNameAsc().stream().map(this::toBankDto).toList();
    }

    public CorrespondentBankDto getBank(Long id) {
        return toBankDto(bankRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CorrespondentBank", "id", id)));
    }

    // ========================================================================
    // POSITION MANAGEMENT
    // ========================================================================

    @Transactional
    public NostroPositionDto createPosition(NostroPositionDto dto) {
        Account account = accountRepository.findById(dto.getAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", dto.getAccountId()));
        CorrespondentBank bank = bankRepository.findById(dto.getCorrespondentBankId())
                .orElseThrow(() -> new ResourceNotFoundException("CorrespondentBank", "id", dto.getCorrespondentBankId()));

        positionRepository.findByAccountIdAndCorrespondentBankId(dto.getAccountId(), dto.getCorrespondentBankId())
                .ifPresent(existing -> {
                    throw new DuplicateResourceException("NostroVostroPosition", "account+bank",
                            dto.getAccountId() + "+" + dto.getCorrespondentBankId());
                });

        NostroVostroPosition position = NostroVostroPosition.builder()
                .account(account).correspondentBank(bank)
                .positionType(dto.getPositionType())
                .currencyCode(dto.getCurrencyCode() != null ? dto.getCurrencyCode() : account.getCurrencyCode())
                .bookBalance(dto.getBookBalance() != null ? dto.getBookBalance() : BigDecimal.ZERO)
                .statementBalance(dto.getStatementBalance() != null ? dto.getStatementBalance() : BigDecimal.ZERO)
                .creditLimit(dto.getCreditLimit()).debitLimit(dto.getDebitLimit())
                .reconciliationStatus(ReconciliationStatus.PENDING)
                .isActive(true)
                .build();
        position.recalculateUnreconciled();

        NostroVostroPosition saved = positionRepository.save(position);
        log.info("Nostro/Vostro position created: type={}, account={}, bank={}",
                dto.getPositionType(), account.getAccountNumber(), bank.getBankCode());
        return toPositionDto(saved);
    }

    public List<NostroPositionDto> getPositionsByType(PositionType type) {
        return positionRepository.findActiveByType(type).stream().map(this::toPositionDto).toList();
    }

    public NostroPositionDto getPosition(Long id) {
        NostroVostroPosition position = positionRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("NostroVostroPosition", "id", id));
        return toPositionDto(position);
    }

    public Page<NostroPositionDto> getAllPositions(Pageable pageable) {
        return positionRepository.findByIsActiveTrue(pageable).map(this::toPositionDto);
    }

    @Transactional
    public NostroPositionDto updateStatementBalance(Long positionId, BigDecimal statementBalance, LocalDate statementDate) {
        NostroVostroPosition position = positionRepository.findById(positionId)
                .orElseThrow(() -> new ResourceNotFoundException("NostroVostroPosition", "id", positionId));

        position.setStatementBalance(statementBalance);
        position.setLastStatementDate(statementDate);
        position.recalculateUnreconciled();

        if (position.getUnreconciledAmount().compareTo(BigDecimal.ZERO) == 0) {
            position.setReconciliationStatus(ReconciliationStatus.RECONCILED);
            position.setLastReconciledDate(LocalDate.now());
        } else {
            position.setReconciliationStatus(ReconciliationStatus.DISCREPANCY);
        }

        positionRepository.save(position);
        log.info("Position {} statement updated: balance={}, unreconciled={}",
                positionId, statementBalance, position.getUnreconciledAmount());
        return toPositionDto(position);
    }

    // ========================================================================
    // RECONCILIATION
    // ========================================================================

    @Transactional
    public ReconciliationItemDto addReconciliationItem(Long positionId, ReconciliationItemDto dto) {
        NostroVostroPosition position = positionRepository.findById(positionId)
                .orElseThrow(() -> new ResourceNotFoundException("NostroVostroPosition", "id", positionId));

        NostroReconciliationItem item = NostroReconciliationItem.builder()
                .position(position)
                .itemType(dto.getItemType()).reference(dto.getReference())
                .amount(dto.getAmount())
                .currencyCode(dto.getCurrencyCode() != null ? dto.getCurrencyCode() : position.getCurrencyCode())
                .valueDate(dto.getValueDate()).narration(dto.getNarration())
                .matchStatus(MatchStatus.UNMATCHED)
                .build();

        NostroReconciliationItem saved = reconItemRepository.save(item);

        // Update outstanding count
        position.setOutstandingItemsCount(reconItemRepository.countUnmatchedItems(positionId));
        position.setReconciliationStatus(ReconciliationStatus.IN_PROGRESS);
        positionRepository.save(position);

        return toReconItemDto(saved);
    }

    @Transactional
    public ReconciliationItemDto matchItem(Long itemId, String matchReference, String resolvedBy) {
        NostroReconciliationItem item = reconItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("ReconciliationItem", "id", itemId));

        item.setMatchReference(matchReference);
        item.setMatchStatus(MatchStatus.MATCHED);
        item.setResolvedDate(LocalDate.now());
        item.setResolvedBy(resolvedBy);
        reconItemRepository.save(item);

        // Refresh position counts
        NostroVostroPosition position = item.getPosition();
        int unmatchedCount = reconItemRepository.countUnmatchedItems(position.getId());
        position.setOutstandingItemsCount(unmatchedCount);
        if (unmatchedCount == 0) {
            position.setReconciliationStatus(ReconciliationStatus.RECONCILED);
            position.setLastReconciledDate(LocalDate.now());
        }
        positionRepository.save(position);

        log.info("Reconciliation item {} matched: ref={}", itemId, matchReference);
        return toReconItemDto(item);
    }

    public Page<ReconciliationItemDto> getReconciliationItems(Long positionId, Pageable pageable) {
        positionRepository.findById(positionId)
                .orElseThrow(() -> new ResourceNotFoundException("NostroVostroPosition", "id", positionId));
        return reconItemRepository.findByPositionIdOrderByValueDateDesc(positionId, pageable)
                .map(this::toReconItemDto);
    }

    public List<ReconciliationItemDto> getUnmatchedItems(Long positionId) {
        return reconItemRepository.findByPositionIdAndMatchStatus(positionId, MatchStatus.UNMATCHED)
                .stream().map(this::toReconItemDto).toList();
    }

    // ========================================================================
    // MAPPERS
    // ========================================================================

    private CorrespondentBankDto toBankDto(CorrespondentBank b) {
        return CorrespondentBankDto.builder()
                .id(b.getId()).bankCode(b.getBankCode()).bankName(b.getBankName())
                .swiftBic(b.getSwiftBic()).country(b.getCountry()).city(b.getCity())
                .relationshipType(b.getRelationshipType()).isActive(b.getIsActive())
                .contactName(b.getContactName()).contactEmail(b.getContactEmail())
                .contactPhone(b.getContactPhone()).metadata(b.getMetadata())
                .createdAt(b.getCreatedAt()).build();
    }

    private NostroPositionDto toPositionDto(NostroVostroPosition p) {
        return NostroPositionDto.builder()
                .id(p.getId()).accountId(p.getAccount().getId())
                .accountNumber(p.getAccount().getAccountNumber())
                .correspondentBankId(p.getCorrespondentBank().getId())
                .correspondentBankName(p.getCorrespondentBank().getBankName())
                .correspondentSwiftBic(p.getCorrespondentBank().getSwiftBic())
                .positionType(p.getPositionType()).currencyCode(p.getCurrencyCode())
                .bookBalance(p.getBookBalance()).statementBalance(p.getStatementBalance())
                .unreconciledAmount(p.getUnreconciledAmount())
                .lastStatementDate(p.getLastStatementDate()).lastReconciledDate(p.getLastReconciledDate())
                .reconciliationStatus(p.getReconciliationStatus())
                .outstandingItemsCount(p.getOutstandingItemsCount())
                .creditLimit(p.getCreditLimit()).debitLimit(p.getDebitLimit())
                .isActive(p.getIsActive()).createdAt(p.getCreatedAt()).build();
    }

    private ReconciliationItemDto toReconItemDto(NostroReconciliationItem i) {
        return ReconciliationItemDto.builder()
                .id(i.getId()).itemType(i.getItemType()).reference(i.getReference())
                .amount(i.getAmount()).currencyCode(i.getCurrencyCode()).valueDate(i.getValueDate())
                .narration(i.getNarration()).matchReference(i.getMatchReference())
                .matchStatus(i.getMatchStatus()).resolvedDate(i.getResolvedDate())
                .resolvedBy(i.getResolvedBy()).notes(i.getNotes()).build();
    }
}
