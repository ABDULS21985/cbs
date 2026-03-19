package com.cbs.maadvisory.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.maadvisory.entity.MaEngagement;
import com.cbs.maadvisory.repository.MaEngagementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class MaAdvisoryService {

    private final MaEngagementRepository repository;

    @Transactional
    public MaEngagement createEngagement(MaEngagement engagement) {
        engagement.setEngagementCode("MA-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        engagement.setTotalFeesEarned(BigDecimal.ZERO);
        engagement.setStatus("PITCHING");
        MaEngagement saved = repository.save(engagement);
        log.info("M&A engagement created: code={}, type={}, client={}", saved.getEngagementCode(), saved.getEngagementType(), saved.getClientName());
        return saved;
    }

    @Transactional
    public MaEngagement updateMilestone(Long engagementId, String milestoneField, LocalDate date) {
        MaEngagement engagement = getById(engagementId);
        switch (milestoneField) {
            case "mandateDate" -> engagement.setMandateDate(date);
            case "informationMemoDate" -> engagement.setInformationMemoDate(date);
            case "dataRoomOpenDate" -> engagement.setDataRoomOpenDate(date);
            case "indicativeBidDeadline" -> engagement.setIndicativeBidDeadline(date);
            case "dueDiligenceStart" -> engagement.setDueDiligenceStart(date);
            case "dueDiligenceEnd" -> engagement.setDueDiligenceEnd(date);
            case "bindingBidDeadline" -> engagement.setBindingBidDeadline(date);
            case "signingDate" -> engagement.setSigningDate(date);
            case "regulatoryApprovalDate" -> engagement.setRegulatoryApprovalDate(date);
            case "closingDate" -> engagement.setClosingDate(date);
            default -> throw new BusinessException("Unknown milestone field: " + milestoneField);
        }
        log.info("M&A milestone updated: code={}, field={}, date={}", engagement.getEngagementCode(), milestoneField, date);
        return repository.save(engagement);
    }

    @Transactional
    public MaEngagement recordFee(Long engagementId, BigDecimal amount) {
        MaEngagement engagement = getById(engagementId);
        engagement.setTotalFeesEarned(engagement.getTotalFeesEarned().add(amount));
        log.info("M&A fee recorded: code={}, amount={}, total={}", engagement.getEngagementCode(), amount, engagement.getTotalFeesEarned());
        return repository.save(engagement);
    }

    @Transactional
    public MaEngagement closeEngagement(Long engagementId, BigDecimal actualDealValue) {
        MaEngagement engagement = getById(engagementId);
        engagement.setStatus("CLOSED");
        engagement.setActualDealValue(actualDealValue);
        engagement.setClosingDate(LocalDate.now());

        if (engagement.getSuccessFeePct() != null && actualDealValue != null) {
            BigDecimal calculatedFee = actualDealValue.multiply(engagement.getSuccessFeePct());
            if (engagement.getSuccessFeeMin() != null) {
                calculatedFee = calculatedFee.max(engagement.getSuccessFeeMin());
            }
            if (engagement.getSuccessFeeCap() != null) {
                calculatedFee = calculatedFee.min(engagement.getSuccessFeeCap());
            }
            engagement.setTotalFeesEarned(engagement.getTotalFeesEarned().add(calculatedFee));
        }

        log.info("M&A engagement closed: code={}, actualValue={}, totalFees={}", engagement.getEngagementCode(), actualDealValue, engagement.getTotalFeesEarned());
        return repository.save(engagement);
    }

    @Transactional
    public MaEngagement terminateEngagement(Long engagementId, String reason) {
        MaEngagement engagement = getById(engagementId);
        engagement.setStatus("TERMINATED");
        log.info("M&A engagement terminated: code={}, reason={}", engagement.getEngagementCode(), reason);
        return repository.save(engagement);
    }

    public List<MaEngagement> getActiveMandates() {
        return repository.findByStatusNotIn(List.of("CLOSED", "TERMINATED"));
    }

    public Map<String, Long> getPipelineByStage() {
        return repository.findAll().stream()
                .collect(Collectors.groupingBy(MaEngagement::getStatus, Collectors.counting()));
    }

    public BigDecimal getFeeRevenue(LocalDate from, LocalDate to) {
        return repository.findAll().stream()
                .filter(e -> "CLOSED".equals(e.getStatus()))
                .filter(e -> e.getClosingDate() != null && !e.getClosingDate().isBefore(from) && !e.getClosingDate().isAfter(to))
                .map(MaEngagement::getTotalFeesEarned)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public Map<String, Long> getTeamWorkload() {
        return repository.findByStatusNotIn(List.of("CLOSED", "TERMINATED")).stream()
                .filter(e -> e.getLeadBanker() != null)
                .collect(Collectors.groupingBy(MaEngagement::getLeadBanker, Collectors.counting()));
    }

    private MaEngagement getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MaEngagement", "id", id));
    }

    public MaEngagement getByCode(String code) {
        return repository.findByEngagementCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("MaEngagement", "engagementCode", code));
    }

    public java.util.List<MaEngagement> getAllEngagements() {
        return engagementRepository.findAll();
    }

}
